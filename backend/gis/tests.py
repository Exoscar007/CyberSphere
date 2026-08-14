from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient
from rest_framework import status
from crimes.models import Incident
from patrol.models import PatrolAssignment, PatrolLocation
from users.models import PoliceStation
from django.utils import timezone

User = get_user_model()

class RecommendPatrolAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Stations
        self.station_a = PoliceStation.objects.create(station_code="SA", name="Station A")
        self.station_b = PoliceStation.objects.create(station_code="SB", name="Station B")
        
        # Create Users
        self.admin = User.objects.create_user(username="admin", password="pw", role='ADMIN')
        self.station_user = User.objects.create_user(username="station", password="pw", role='STATION', station=self.station_a)
        self.patrol_officer = User.objects.create_user(username="patrol1", password="pw", role='PATROL', station=self.station_a)
        self.patrol_officer2 = User.objects.create_user(username="patrol2", password="pw", role='PATROL', station=self.station_b)
        self.patrol_officer3 = User.objects.create_user(username="patrol3", password="pw", role='PATROL', station=self.station_a)
        self.patrol_no_gps = User.objects.create_user(username="patrol4", password="pw", role='PATROL', station=self.station_a)

        # Create Incident
        self.incident = Incident.objects.create(
            title="Robbery",
            location=Point(72.5714, 23.0225, srid=4326), # Ahmedabad
            date_occurred=timezone.now(),
            station=self.station_a
        )
        
        # Create GPS data
        # patrol1 (available) - 1km away
        assign1 = PatrolAssignment.objects.create(officer=self.patrol_officer, status='COMPLETED')
        PatrolLocation.objects.create(assignment=assign1, location=Point(72.5714, 23.0315, srid=4326))
        
        # patrol2 (available, diff station) - 5km away
        assign2 = PatrolAssignment.objects.create(officer=self.patrol_officer2, status='COMPLETED')
        PatrolLocation.objects.create(assignment=assign2, location=Point(72.5714, 23.0725, srid=4326))
        
        # patrol3 (busy) - 0.5km away
        assign3 = PatrolAssignment.objects.create(officer=self.patrol_officer3, status='EN_ROUTE')
        PatrolLocation.objects.create(assignment=assign3, location=Point(72.5714, 23.0270, srid=4326))
        
        # patrol4 has NO GPS records
        
        self.url = reverse('recommend-patrol')

    def test_admin_can_request_recommendations(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(self.url, {'incident_id': self.incident.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Admin sees both available patrols (patrol1, patrol2)
        # patrol3 is busy, patrol4 has no GPS
        self.assertEqual(len(res.data), 2)
        # Check ordering by distance (patrol1 is 1km away, patrol2 is 5km away)
        self.assertEqual(res.data[0]['officer_name'], 'patrol1')
        self.assertEqual(res.data[1]['officer_name'], 'patrol2')

    def test_station_rbac_is_respected(self):
        self.client.force_authenticate(user=self.station_user)
        res = self.client.get(self.url, {'incident_id': self.incident.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Station user only sees patrol1 (same station), not patrol2
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['officer_name'], 'patrol1')

    def test_patrol_officer_receives_403(self):
        self.client.force_authenticate(user=self.patrol_officer)
        res = self.client.get(self.url, {'incident_id': self.incident.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_incident_id(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(self.url, {'incident_id': 9999})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_patrols_without_gps_excluded(self):
        self.client.force_authenticate(user=self.station_user)
        res = self.client.get(self.url, {'incident_id': self.incident.id})
        names = [p['officer_name'] for p in res.data]
        self.assertNotIn('patrol4', names)

    def test_busy_patrols_excluded(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(self.url, {'incident_id': self.incident.id})
        names = [p['officer_name'] for p in res.data]
        self.assertNotIn('patrol3', names)
