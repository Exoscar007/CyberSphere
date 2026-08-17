from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from users.models import PoliceStation
from crimes.models import Incident, FIR
from patrol.models import PatrolAssignment
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

class A2ApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        self.station1 = PoliceStation.objects.create(
            station_code='ST1', name='Station 1', location=Point(10, 10, srid=4326)
        )
        self.station2 = PoliceStation.objects.create(
            station_code='ST2', name='Station 2', location=Point(20, 20, srid=4326)
        )
        
        self.admin = User.objects.create_user(username='admin', password='pw', role='ADMIN')
        self.st_user1 = User.objects.create_user(username='st1', password='pw', role='STATION', station=self.station1)
        self.st_user2 = User.objects.create_user(username='st2', password='pw', role='STATION', station=self.station2)
        
        self.patrol1 = User.objects.create_user(username='p1', password='pw', role='PATROL_OFFICER', station=self.station1)
        self.patrol2 = User.objects.create_user(username='p2', password='pw', role='PATROL_OFFICER', station=self.station1)
        self.patrol3 = User.objects.create_user(username='p3', password='pw', role='PATROL_OFFICER', station=self.station2)

    def test_create_incident_without_fir(self):
        self.client.force_authenticate(user=self.st_user1)
        data = {
            'title': 'Test Incident',
            'description': 'Something happened',
            'severity': 'MEDIUM',
            'date_occurred': '2026-01-01T00:00:00Z',
            'location_input': {'type': 'Point', 'coordinates': [72.5, 23.0]}
        }
        res = self.client.post(reverse('incident-list-create'), data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'OPEN')
        
    def test_create_assignment_without_fir_and_requires_destination(self):
        inc = Incident.objects.create(
            title="Inc", description="Desc", location=Point(72.5, 23.0, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        self.client.force_authenticate(user=self.st_user1)
        
        # Missing destination
        data_invalid = {
            'officer': self.patrol1.id,
            'incident': inc.id,
            'zone_name': 'Zone A',
            'instructions': 'Go there'
        }
        res_inv = self.client.post('/api/patrol/assignments/', data_invalid, format='json')
        self.assertEqual(res_inv.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Valid
        data_valid = {
            'officer': self.patrol1.id,
            'incident': inc.id,
            'zone_name': 'Zone A',
            'instructions': 'Go there',
            'destination': {'type': 'Point', 'coordinates': [72.6, 23.1]}
        }
        res_val = self.client.post('/api/patrol/assignments/', data_valid, format='json')
        self.assertEqual(res_val.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_val.data['instructions'], 'Go there')
        self.assertIsNone(res_val.data['fir'])
        
    def test_two_patrols_same_incident(self):
        inc = Incident.objects.create(
            title="Inc", description="Desc", location=Point(72.5, 23.0, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        self.client.force_authenticate(user=self.st_user1)
        
        data1 = {
            'officer': self.patrol1.id, 'incident': inc.id, 'zone_name': 'A', 'destination': {'type': 'Point', 'coordinates': [1,1]}
        }
        data2 = {
            'officer': self.patrol2.id, 'incident': inc.id, 'zone_name': 'B', 'destination': {'type': 'Point', 'coordinates': [2,2]}
        }
        self.client.post('/api/patrol/assignments/', data1, format='json')
        self.client.post('/api/patrol/assignments/', data2, format='json')
        
        self.assertEqual(inc.patrol_assignments.count(), 2)

    def test_patrol_receives_own_assignment(self):
        inc = Incident.objects.create(
            title="Inc", description="Desc", location=Point(72.5, 23.0, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        assign = PatrolAssignment.objects.create(
            officer=self.patrol1, incident=inc, zone_name='Z', destination=Point(1,1,srid=4326), station=self.station1
        )
        
        self.client.force_authenticate(user=self.patrol1)
        res = self.client.get('/api/patrol/assignments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        
        # Check complete operational information
        assignment_data = res.data[0]
        self.assertIn('incident_details', assignment_data)
        self.assertEqual(assignment_data['incident_details']['title'], "Inc")
        
        self.client.force_authenticate(user=self.patrol2)
        res2 = self.client.get('/api/patrol/assignments/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res2.data), 0)

    def test_valid_and_invalid_transitions(self):
        inc = Incident.objects.create(
            title="Inc", description="Desc", location=Point(72.5, 23.0, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        assign = PatrolAssignment.objects.create(
            officer=self.patrol1, incident=inc, zone_name='Z', destination=Point(1,1,srid=4326), station=self.station1, status='ASSIGNED'
        )
        
        self.client.force_authenticate(user=self.patrol1)
        
        # Valid: ASSIGNED -> ACKNOWLEDGED
        res = self.client.patch(f'/api/patrol/assignments/{assign.id}/', {'status': 'ACKNOWLEDGED'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Invalid: ACKNOWLEDGED -> COMPLETED (skip EN_ROUTE and ARRIVED)
        res2 = self.client.patch(f'/api/patrol/assignments/{assign.id}/', {'status': 'COMPLETED'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_404_NOT_FOUND) # service raises ValueError, which view maps to 404
        
        # Valid sequence to end
        self.client.patch(f'/api/patrol/assignments/{assign.id}/', {'status': 'EN_ROUTE'}, format='json')
        self.client.patch(f'/api/patrol/assignments/{assign.id}/', {'status': 'ARRIVED'}, format='json')
        res3 = self.client.patch(f'/api/patrol/assignments/{assign.id}/', {'status': 'COMPLETED'}, format='json')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

    def test_gps_works_without_fir(self):
        inc = Incident.objects.create(
            title="Inc", description="Desc", location=Point(72.5, 23.0, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        assign = PatrolAssignment.objects.create(
            officer=self.patrol1, incident=inc, zone_name='Z', destination=Point(1,1,srid=4326), station=self.station1
        )
        self.client.force_authenticate(user=self.patrol1)
        res = self.client.post(f'/api/patrol/assignments/{assign.id}/ping/', {'lat': 23.1, 'lng': 72.6}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_evidence_works_without_fir_and_auth_checks(self):
        inc = Incident.objects.create(
            title="Inc", description="Desc", location=Point(72.5, 23.0, srid=4326),
            date_occurred="2026-01-01T00:00:00Z", station=self.station1
        )
        assign = PatrolAssignment.objects.create(
            officer=self.patrol1, incident=inc, zone_name='Z', destination=Point(1,1,srid=4326), station=self.station1
        )
        
        # Cross patrol access rejected
        self.client.force_authenticate(user=self.patrol2)
        file = SimpleUploadedFile("test.jpg", b"file_content", content_type="image/jpeg")
        data_inv = {'assignment': assign.id, 'incident': inc.id, 'file': file}
        res_inv = self.client.post('/api/crimes/evidence/', data_inv, format='multipart')
        self.assertEqual(res_inv.status_code, status.HTTP_400_BAD_REQUEST) # ValueError mapped to 400
        
        # Valid patrol
        self.client.force_authenticate(user=self.patrol1)
        file2 = SimpleUploadedFile("test2.jpg", b"file_content", content_type="image/jpeg")
        data_val = {'assignment': assign.id, 'incident': inc.id, 'file': file2}
        res_val = self.client.post('/api/crimes/evidence/', data_val, format='multipart')
        self.assertEqual(res_val.status_code, status.HTTP_201_CREATED)
        
    def test_admin_access(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('incident-list-create'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
