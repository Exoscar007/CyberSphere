from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
import datetime
from zoneinfo import ZoneInfo
from django.contrib.gis.geos import Point

from crimes.models import Incident
from users.models import CustomUser, PoliceStation
from intelligence.services import TemporalAnalyticsService


class TemporalAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.station = PoliceStation.objects.create(
            station_code='TST-01',
            name='Test Station',
            location=Point(72.5, 23.0, srid=4326)
        )
        self.user = CustomUser.objects.create_user(
            username='testadmin',
            password='password123',
            role='ADMIN'
        )
        self.ist = ZoneInfo('Asia/Kolkata')
        
    def test_empty_dataset(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('temporal-stats'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data['by_hour']), 24)
        self.assertTrue(all(h['count'] == 0 for h in data['by_hour']))
        
        self.assertEqual(len(data['by_day_of_week']), 7)
        self.assertTrue(all(d['count'] == 0 for d in data['by_day_of_week']))
        
        self.assertEqual(data['period']['total_incidents'], 0)
        self.assertIsNone(data['period']['start'])
        self.assertIsNone(data['period']['end'])

    def test_timezone_and_aggregation(self):
        # Create incidents at specific times
        # 18:00 UTC is 23:30 IST
        dt1 = datetime.datetime(2026, 8, 1, 18, 0, tzinfo=datetime.timezone.utc)
        Incident.objects.create(
            title="Test 1", description="Test", location=Point(72.5, 23.0, srid=4326),
            date_occurred=dt1, severity="LOW", status="OPEN"
        )
        
        # 2:00 UTC is 07:30 IST
        dt2 = datetime.datetime(2026, 8, 2, 2, 0, tzinfo=datetime.timezone.utc)
        Incident.objects.create(
            title="Test 2", description="Test", location=Point(72.5, 23.0, srid=4326),
            date_occurred=dt2, severity="LOW", status="OPEN"
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('temporal-stats'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        
        # Check hour distribution (should map to IST hours)
        by_hour = {item['hour']: item['count'] for item in data['by_hour']}
        self.assertEqual(by_hour[23], 1)  # 18:00 UTC -> 23:30 IST -> Hour 23
        self.assertEqual(by_hour[7], 1)   # 02:00 UTC -> 07:30 IST -> Hour 7
        
        self.assertEqual(data['period']['total_incidents'], 2)

    def test_station_filter(self):
        dt = timezone.now()
        Incident.objects.create(
            title="Stn 1", description="Test", location=Point(72.5, 23.0, srid=4326),
            date_occurred=dt, station=self.station
        )
        Incident.objects.create(
            title="No Stn", description="Test", location=Point(72.5, 23.0, srid=4326),
            date_occurred=dt
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('temporal-stats'), {'station_id': self.station.id})
        
        data = response.json()
        self.assertEqual(data['period']['total_incidents'], 1)

    def test_rbac_unauthenticated(self):
        response = self.client.get(reverse('temporal-stats'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
