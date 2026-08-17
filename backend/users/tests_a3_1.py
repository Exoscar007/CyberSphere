from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from users.models import PoliceStation
from patrol.models import PatrolAssignment

User = get_user_model()

class StationPatrolsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        self.station1 = PoliceStation.objects.create(station_code='ST1', name='Station 1')
        self.station2 = PoliceStation.objects.create(station_code='ST2', name='Station 2')
        
        self.st_user1 = User.objects.create_user(username='st1', password='pw', role='STATION', station=self.station1)
        self.st_user2 = User.objects.create_user(username='st2', password='pw', role='STATION', station=self.station2)
        
        self.patrol1_st1 = User.objects.create_user(username='p1', password='pw', role='PATROL_OFFICER', badge_number='B1', station=self.station1)
        self.patrol2_st1 = User.objects.create_user(username='p2', password='pw', role='PATROL_OFFICER', badge_number='B2', station=self.station1)
        self.patrol3_st2 = User.objects.create_user(username='p3', password='pw', role='PATROL_OFFICER', badge_number='B3', station=self.station2)

    def test_station_patrols_isolation(self):
        self.client.force_authenticate(user=self.st_user1)
        res = self.client.get(reverse('station-patrols'))
        
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)
        usernames = [u['username'] for u in res.data]
        self.assertIn('p1', usernames)
        self.assertIn('p2', usernames)
        self.assertNotIn('p3', usernames)

    def test_patrol_busy_status(self):
        # Assign p1 to an active assignment
        PatrolAssignment.objects.create(
            officer=self.patrol1_st1,
            zone_name='Zone A',
            status='ASSIGNED',
            destination=Point(1,1,srid=4326),
            station=self.station1
        )
        
        self.client.force_authenticate(user=self.st_user1)
        res = self.client.get(reverse('station-patrols'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        p1_data = next(u for u in res.data if u['username'] == 'p1')
        p2_data = next(u for u in res.data if u['username'] == 'p2')
        
        self.assertTrue(p1_data['is_busy'])
        self.assertFalse(p2_data['is_busy'])
