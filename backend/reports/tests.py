from django.test import TestCase
from rest_framework.test import APIClient
from users.models import CustomUser, PoliceStation
from patrol.models import PatrolAssignment, PatrolStatusHistory
from django.utils import timezone
from datetime import timedelta

class ResponseTimeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.station1 = PoliceStation.objects.create(station_code='ST1', name='Station 1')
        self.station2 = PoliceStation.objects.create(station_code='ST2', name='Station 2')
        
        self.admin = CustomUser.objects.create_user(username='admin', password='123', role='ADMIN')
        self.station1_user = CustomUser.objects.create_user(username='st1', password='123', role='STATION', station=self.station1)
        self.patrol_user = CustomUser.objects.create_user(username='patrol', password='123', role='PATROL_OFFICER', station=self.station1)

        t0 = timezone.now() - timedelta(hours=1)
        
        # Assignment 1 (Station 1): Full lifecycle (Assigned -> EnRoute(+5m) -> Arrived(+10m) -> Completed(+30m))
        a1 = PatrolAssignment.objects.create(officer=self.patrol_user, station=self.station1, zone_name='Z1')
        a1.start_time = t0
        a1.save()
        PatrolStatusHistory.objects.filter(assignment=a1).delete() # clear auto history
        
        t1_enroute = t0 + timedelta(minutes=5)
        t1_arrived = t1_enroute + timedelta(minutes=10)
        t1_completed = t1_arrived + timedelta(minutes=30)
        
        PatrolStatusHistory.objects.create(assignment=a1, new_status='ASSIGNED').timestamp = t0
        PatrolStatusHistory.objects.filter(assignment=a1, new_status='ASSIGNED').update(timestamp=t0)
        PatrolStatusHistory.objects.create(assignment=a1, new_status='EN_ROUTE').timestamp = t1_enroute
        PatrolStatusHistory.objects.filter(assignment=a1, new_status='EN_ROUTE').update(timestamp=t1_enroute)
        PatrolStatusHistory.objects.create(assignment=a1, new_status='ARRIVED').timestamp = t1_arrived
        PatrolStatusHistory.objects.filter(assignment=a1, new_status='ARRIVED').update(timestamp=t1_arrived)
        PatrolStatusHistory.objects.create(assignment=a1, new_status='COMPLETED').timestamp = t1_completed
        PatrolStatusHistory.objects.filter(assignment=a1, new_status='COMPLETED').update(timestamp=t1_completed)

        # Assignment 2 (Station 2): Missing EnRoute (Assigned -> Arrived(+20m))
        a2 = PatrolAssignment.objects.create(officer=self.admin, station=self.station2, zone_name='Z2')
        a2.start_time = t0
        a2.save()
        PatrolStatusHistory.objects.filter(assignment=a2).delete()
        
        t2_arrived = t0 + timedelta(minutes=20)
        PatrolStatusHistory.objects.create(assignment=a2, new_status='ASSIGNED').timestamp = t0
        PatrolStatusHistory.objects.filter(assignment=a2, new_status='ASSIGNED').update(timestamp=t0)
        PatrolStatusHistory.objects.create(assignment=a2, new_status='ARRIVED').timestamp = t2_arrived
        PatrolStatusHistory.objects.filter(assignment=a2, new_status='ARRIVED').update(timestamp=t2_arrived)

    def test_response_time_rbac_and_logic_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/response-times/')
        self.assertEqual(res.status_code, 200)
        
        data = res.json()
        self.assertEqual(data['assignments_analyzed'], 2)
        
        # Summary checks
        # Assign -> EnRoute (only a1 has it: 5 mins = 300s)
        self.assertEqual(data['summary']['average_assignment_to_en_route_seconds'], 300)
        
        # Assign -> Arrive (a1: 15m, a2: 20m -> avg 17.5m = 1050s)
        self.assertEqual(data['summary']['average_assignment_to_arrived_seconds'], 1050)

        # By station checks
        stations = {s['station_id']: s for s in data['by_station']}
        self.assertIn(self.station1.id, stations)
        self.assertIn(self.station2.id, stations)
        self.assertEqual(stations[self.station1.id]['average_assignment_to_arrived_seconds'], 900) # 15m
        self.assertEqual(stations[self.station2.id]['average_assignment_to_arrived_seconds'], 1200) # 20m

    def test_response_time_rbac_station(self):
        self.client.force_authenticate(user=self.station1_user)
        res = self.client.get('/api/reports/response-times/')
        self.assertEqual(res.status_code, 200)
        
        data = res.json()
        self.assertEqual(data['assignments_analyzed'], 1) # Only station 1
        
        stations = {s['station_id']: s for s in data['by_station']}
        self.assertIn(self.station1.id, stations)
        self.assertNotIn(self.station2.id, stations)
        self.assertEqual(data['summary']['average_assignment_to_arrived_seconds'], 900)

    def test_response_time_rbac_patrol(self):
        self.client.force_authenticate(user=self.patrol_user)
        res = self.client.get('/api/reports/response-times/')
        self.assertEqual(res.status_code, 403)
