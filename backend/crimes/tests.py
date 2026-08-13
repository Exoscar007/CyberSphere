from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from users.models import PoliceStation
from .models import FIR, Complaint, Incident, Evidence
from .repository import CrimeRepository

User = get_user_model()

class IsolationTests(TestCase):
    def setUp(self):
        self.station1 = PoliceStation.objects.create(station_code='ST1', name='Station 1', address='Addr 1', location=Point(0,0))
        self.station2 = PoliceStation.objects.create(station_code='ST2', name='Station 2', address='Addr 2', location=Point(0,0))
        
        self.admin = User.objects.create(username='admin', role='ADMIN')
        self.user1 = User.objects.create(username='user1', role='STATION', station=self.station1)
        self.user2 = User.objects.create(username='user2', role='STATION', station=self.station2)
        self.patrol1 = User.objects.create(username='patrol1', role='PATROL_OFFICER', station=self.station1)
        
        self.fir1 = FIR.objects.create(fir_number='F1', description='D', location=Point(0,0), station=self.station1)
        self.fir2 = FIR.objects.create(fir_number='F2', description='D', location=Point(0,0), station=self.station2)

    def test_admin_can_see_all(self):
        firs = CrimeRepository.get_firs(self.admin)
        self.assertEqual(firs.count(), 2)

    def test_station_isolation(self):
        firs1 = CrimeRepository.get_firs(self.user1)
        self.assertEqual(firs1.count(), 1)
        self.assertEqual(firs1.first().station, self.station1)
        
        firs2 = CrimeRepository.get_firs(self.user2)
        self.assertEqual(firs2.count(), 1)
        self.assertEqual(firs2.first().station, self.station2)
        
    def test_patrol_cannot_see_unassigned(self):
        firs = CrimeRepository.get_firs(self.patrol1)
        self.assertEqual(firs.count(), 0)
