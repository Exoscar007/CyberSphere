from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from crimes.models import Incident
from patrol.models import PatrolAssignment
from users.models import PoliceStation
import datetime
import json

User = get_user_model()

class DashboardP2Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.station1 = PoliceStation.objects.create(station_code="ST1", name="Station 1", location="POINT(72.5714 23.0225)")
        self.station2 = PoliceStation.objects.create(station_code="ST2", name="Station 2", location="POINT(72.58 23.03)")
        
        self.admin = User.objects.create_user(username='admin', password='123', role='ADMIN')
        self.station_user = User.objects.create_user(username='st1', password='123', role='STATION', station=self.station1)
        self.patrol1 = User.objects.create_user(username='patrol1', password='123', role='PATROL_OFFICER', station=self.station1)
        
        now = timezone.now()
        
        # Incidents
        # 1 recent critical (1 hour ago)
        self.inc1 = Incident.objects.create(title="I1", description="desc", location="POINT(72.57 23.02)", date_occurred=now - datetime.timedelta(minutes=30), severity="CRITICAL", status="OPEN", station=self.station1)
        # 1 old resolved (2 days ago)
        self.inc2 = Incident.objects.create(title="I2", description="desc", location="POINT(72.57 23.02)", date_occurred=now - datetime.timedelta(days=2), severity="LOW", status="RESOLVED", station=self.station1)
        # 1 old open (2 days ago) - should still show up in list for active/open
        self.inc3 = Incident.objects.create(title="I3", description="desc", location="POINT(72.58 23.03)", date_occurred=now - datetime.timedelta(days=2), severity="HIGH", status="OPEN", station=self.station2)

        # Assignments
        # 1 recent active
        self.ass1 = PatrolAssignment.objects.create(officer=self.patrol1, zone_name="Z", status="EN_ROUTE", priority="HIGH", station=self.station1, incident=self.inc1)
        # 1 old completed (2 days ago)
        self.ass2 = PatrolAssignment.objects.create(officer=self.patrol1, zone_name="Z", status="COMPLETED", priority="LOW", station=self.station1, incident=self.inc2)
        # 1 old active (2 days ago) - should ignore time filter
        self.ass3 = PatrolAssignment.objects.create(officer=self.patrol1, zone_name="Z", status="ASSIGNED", priority="MEDIUM", station=self.station1, incident=self.inc3)
        
        # Override timestamps directly to bypass auto_now_add
        PatrolAssignment.objects.filter(id=self.ass1.id).update(start_time=now - datetime.timedelta(minutes=30))
        PatrolAssignment.objects.filter(id=self.ass2.id).update(start_time=now - datetime.timedelta(days=2))
        PatrolAssignment.objects.filter(id=self.ass3.id).update(start_time=now - datetime.timedelta(days=2))
        
    def test_24h_trend_buckets_and_zeros(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/dashboard/trends/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # Must be exactly 24 buckets
        self.assertEqual(len(data), 24)
        
        # Check zeros are present
        counts = [d['count'] for d in data]
        self.assertTrue(0 in counts)
        self.assertTrue(sum(counts) > 0) # Our inc1 is in last 24h

    def test_time_filter_active_preservation(self):
        self.client.force_authenticate(user=self.admin)
        
        # Filter for 24h assignments.
        # Should return ass1 (recent EN_ROUTE) and ass3 (old ASSIGNED, but active). Should NOT return ass2 (old COMPLETED)
        res = self.client.get('/api/patrol/assignments/?time_filter=24h')
        ids = [a['id'] for a in res.json()]
        self.assertIn(self.ass1.id, ids)
        self.assertIn(self.ass3.id, ids)
        self.assertNotIn(self.ass2.id, ids)

        # Filter for ALL. Should return all 3.
        res_all = self.client.get('/api/patrol/assignments/?time_filter=all')
        ids_all = [a['id'] for a in res_all.json()]
        self.assertIn(self.ass2.id, ids_all)
        
    def test_severity_filter(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/crimes/incidents/?severity=CRITICAL')
        ids = [i['id'] for i in res.json()]
        self.assertIn(self.inc1.id, ids)
        self.assertNotIn(self.inc2.id, ids)
        
    def test_status_filter(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/crimes/incidents/?status=OPEN')
        ids = [i['id'] for i in res.json()]
        self.assertIn(self.inc1.id, ids)
        self.assertIn(self.inc3.id, ids)
        self.assertNotIn(self.inc2.id, ids)
        
    def test_station_filter_and_rbac(self):
        # Station user requesting no filters should only see their own station data
        self.client.force_authenticate(user=self.station_user)
        res = self.client.get('/api/crimes/incidents/')
        ids = [i['id'] for i in res.json()]
        self.assertIn(self.inc1.id, ids)
        self.assertNotIn(self.inc3.id, ids) # Station 2 incident

        # Admin requesting with station filter should only see that station
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get(f'/api/crimes/incidents/?station_id={self.station1.id}')
        ids_admin = [i['id'] for i in res_admin.json()]
        self.assertIn(self.inc1.id, ids_admin)
        self.assertNotIn(self.inc3.id, ids_admin)
