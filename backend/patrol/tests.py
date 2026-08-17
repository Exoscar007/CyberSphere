from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from users.models import PoliceStation
from .models import PatrolAssignment, PatrolLocation
from .repository import PatrolRepository

User = get_user_model()

class PatrolTests(TestCase):
    def setUp(self):
        self.station1 = PoliceStation.objects.create(station_code='ST1', name='Station 1', address='Addr 1', location=Point(0,0))
        
        self.patrol1 = User.objects.create(username='patrol1', role='PATROL_OFFICER', station=self.station1)
        self.patrol2 = User.objects.create(username='patrol2', role='PATROL_OFFICER', station=self.station1)
        
        self.assignment1 = PatrolAssignment.objects.create(officer=self.patrol1, zone_name='Z1', status='ACTIVE')
        self.assignment2 = PatrolAssignment.objects.create(officer=self.patrol2, zone_name='Z2', status='ACTIVE')

    def test_patrol_can_see_own_assignment(self):
        assigns = PatrolRepository.get_active_assignments(self.patrol1)
        self.assertEqual(assigns.count(), 1)
        self.assertEqual(assigns.first().officer, self.patrol1)
        
    def test_patrol_cannot_see_other_assignments(self):
        assigns = PatrolRepository.get_active_assignments(self.patrol1)
        officers = [a.officer for a in assigns]
        self.assertNotIn(self.patrol2, officers)
        
    def test_log_location_verification(self):
        ping = PatrolRepository.log_location(self.assignment1, Point(1,1))
        self.assertIsNotNone(ping)
        self.assertEqual(ping.assignment, self.assignment1)
