from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from users.models import PoliceStation
from crimes.models import Incident, Evidence
from patrol.models import PatrolAssignment, PatrolStatusHistory
from rest_framework.test import APIClient
from patrol.services import PatrolService

User = get_user_model()

class OperationalHistoryTests(TestCase):
    def setUp(self):
        self.station1 = PoliceStation.objects.create(name="Station One", station_code="ST1", location=Point(72.0, 23.0))
        self.station2 = PoliceStation.objects.create(name="Station Two", station_code="ST2", location=Point(73.0, 24.0))

        self.admin = User.objects.create_user(username="admin", password="password", role="ADMIN")
        self.station1_user = User.objects.create_user(username="station1_user", password="password", role="STATION", station=self.station1)
        self.station2_user = User.objects.create_user(username="station2_user", password="password", role="STATION", station=self.station2)
        
        self.patrol_officer = User.objects.create_user(username="officer1", password="password", role="PATROL_OFFICER", station=self.station1)

        self.incident1 = Incident.objects.create(title="Incident 1", description="Test", location=Point(72.1, 23.1), date_occurred="2024-01-01T12:00:00Z", station=self.station1, status=Incident.Status.OPEN)
        self.incident2 = Incident.objects.create(title="Incident 2", description="Test", location=Point(73.1, 24.1), date_occurred="2024-01-01T12:00:00Z", station=self.station2, status=Incident.Status.OPEN)

        self.client = APIClient()

    def test_status_history_creation(self):
        # Create assignment
        assignment = PatrolService.assign_patrol(
            self.station1_user, self.patrol_officer, "Zone 1", Point(72.2, 23.2), "HIGH", "Go there", incident=self.incident1
        )
        
        history = PatrolStatusHistory.objects.filter(assignment=assignment)
        self.assertEqual(history.count(), 1)
        self.assertEqual(history.first().new_status, PatrolAssignment.Status.ASSIGNED)
        
        # Update status
        PatrolService.update_assignment_status(self.station1_user, assignment.id, PatrolAssignment.Status.ACKNOWLEDGED)
        history = PatrolStatusHistory.objects.filter(assignment=assignment).order_by('timestamp')
        self.assertEqual(history.count(), 2)
        self.assertEqual(history.last().new_status, PatrolAssignment.Status.ACKNOWLEDGED)

    def test_operational_history_isolation(self):
        assignment1 = PatrolService.assign_patrol(self.station1_user, self.patrol_officer, "Zone 1", Point(72.2, 23.2), "HIGH", "Instructions", incident=self.incident1)
        assignment2 = PatrolService.assign_patrol(self.station2_user, self.patrol_officer, "Zone 2", Point(73.2, 24.2), "HIGH", "Instructions", incident=self.incident2)
        
        # Station 1 User
        self.client.force_authenticate(user=self.station1_user)
        res = self.client.get('/api/reports/operational-history/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.incident1.id)

        # Station 2 User
        self.client.force_authenticate(user=self.station2_user)
        res = self.client.get('/api/reports/operational-history/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.incident2.id)

        # Admin User
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/operational-history/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

    def test_evidence_str_no_fir(self):
        assignment = PatrolService.assign_patrol(self.station1_user, self.patrol_officer, "Zone 1", Point(72.2, 23.2), "HIGH", "Go there", incident=self.incident1)
        evidence = Evidence.objects.create(incident=self.incident1, assignment=assignment)
        self.assertEqual(str(evidence), f"Evidence for Assignment {assignment.id}")
