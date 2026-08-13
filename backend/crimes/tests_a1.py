from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from users.models import PoliceStation
from crimes.models import Incident, FIR, Evidence
from patrol.models import PatrolAssignment
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

class A1RefactorTests(TestCase):
    def setUp(self):
        self.station1 = PoliceStation.objects.create(
            station_code='ST1', name='Station 1', location=Point(10, 10, srid=4326)
        )
        self.station2 = PoliceStation.objects.create(
            station_code='ST2', name='Station 2', location=Point(20, 20, srid=4326)
        )
        
        self.patrol1 = User.objects.create_user(username='patrol1', password='p1', role='PATROL_OFFICER', station=self.station1)
        self.patrol2 = User.objects.create_user(username='patrol2', password='p2', role='PATROL_OFFICER', station=self.station1)
        self.patrol3 = User.objects.create_user(username='patrol3', password='p3', role='PATROL_OFFICER', station=self.station2)
        self.station_user = User.objects.create_user(username='stuser', password='su', role='STATION', station=self.station1)

    def test_incident_without_fir(self):
        inc = Incident.objects.create(
            title="Noise Complaint",
            description="Loud music",
            location=Point(10, 10, srid=4326),
            date_occurred="2026-01-01T00:00:00Z",
            station=self.station1
        )
        self.assertEqual(inc.status, Incident.Status.OPEN)
        self.assertIsNotNone(inc.id)
        
    def test_assignment_without_fir_and_with_destination(self):
        inc = Incident.objects.create(
            title="Theft", description="Stolen bike", location=Point(11, 11, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        assign = PatrolAssignment.objects.create(
            officer=self.patrol1,
            zone_name="Zone A",
            destination=Point(11, 11, srid=4326),
            instructions="Check the alley",
            incident=inc,
            station=self.station1
        )
        self.assertEqual(assign.status, PatrolAssignment.Status.ASSIGNED)
        self.assertIsNone(assign.fir)
        self.assertEqual(assign.destination.x, 11)
        self.assertEqual(assign.instructions, "Check the alley")

    def test_multiple_assignments_one_incident(self):
        inc = Incident.objects.create(
            title="Riot", description="Large crowd", location=Point(12, 12, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        assign1 = PatrolAssignment.objects.create(
            officer=self.patrol1, zone_name="Zone A", destination=Point(12, 12, srid=4326), incident=inc
        )
        assign2 = PatrolAssignment.objects.create(
            officer=self.patrol2, zone_name="Zone B", destination=Point(12.1, 12.1, srid=4326), incident=inc
        )
        self.assertEqual(inc.patrol_assignments.count(), 2)

    def test_evidence_without_fir(self):
        inc = Incident.objects.create(
            title="Assault", description="Fight", location=Point(13, 13, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        assign = PatrolAssignment.objects.create(
            officer=self.patrol1, zone_name="Zone C", destination=Point(13, 13, srid=4326), incident=inc
        )
        
        file = SimpleUploadedFile("test.jpg", b"file_content", content_type="image/jpeg")
        evidence = Evidence.objects.create(
            incident=inc,
            assignment=assign,
            file=file,
            uploaded_by=self.patrol1
        )
        self.assertIsNone(evidence.fir)
        self.assertEqual(evidence.incident, inc)
        self.assertEqual(evidence.assignment, assign)

    def test_evidence_optionally_linked_to_fir(self):
        inc = Incident.objects.create(
            title="Burglary", description="House broken into", location=Point(14, 14, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        fir = FIR.objects.create(
            fir_number="FIR-123", description="Burglary", location=Point(14, 14, srid=4326), station=self.station1
        )
        assign = PatrolAssignment.objects.create(
            officer=self.patrol1, zone_name="Zone D", destination=Point(14, 14, srid=4326), incident=inc, fir=fir
        )
        
        file = SimpleUploadedFile("test2.jpg", b"file_content", content_type="image/jpeg")
        evidence = Evidence.objects.create(
            fir=fir,
            incident=inc,
            assignment=assign,
            file=file,
            uploaded_by=self.patrol1
        )
        self.assertEqual(evidence.fir, fir)

    def test_station_isolation_and_patrol_access(self):
        inc1 = Incident.objects.create(
            title="S1 Event", description="", location=Point(1, 1, srid=4326), date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        inc2 = Incident.objects.create(
            title="S2 Event", description="", location=Point(2, 2, srid=4326), date_occurred="2026-01-01T00:00:00Z", station=self.station2
        )
        assign1 = PatrolAssignment.objects.create(officer=self.patrol1, zone_name="Z1", destination=Point(1,1,srid=4326), incident=inc1, station=self.station1)
        assign3 = PatrolAssignment.objects.create(officer=self.patrol3, zone_name="Z2", destination=Point(2,2,srid=4326), incident=inc2, station=self.station2)
        
        from patrol.repository import PatrolRepository
        
        station_assignments = PatrolRepository.get_active_assignments(self.station_user)
        self.assertEqual(station_assignments.count(), 1)
        self.assertEqual(station_assignments.first(), assign1)
        
        patrol_assignments = PatrolRepository.get_active_assignments(self.patrol1)
        self.assertEqual(patrol_assignments.count(), 1)
        self.assertEqual(patrol_assignments.first(), assign1)
        
        patrol3_assignments = PatrolRepository.get_active_assignments(self.patrol3)
        self.assertEqual(patrol3_assignments.count(), 1)
        self.assertEqual(patrol3_assignments.first(), assign3)
