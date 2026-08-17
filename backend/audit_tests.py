from django.test import TestCase
from django.contrib.auth import get_user_model
from crimes.models import FIR, Incident, Complaint
from intelligence.models import RiskScore, CrimeTrend
from patrol.models import PatrolAssignment, PatrolLocation
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient

User = get_user_model()

class DatabaseVerificationTests(TestCase):
    def setUp(self):
        # Create test data assuming DB is available
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_models_and_repositories(self):
        # Verify FIR creation with GIS Point
        fir = FIR.objects.create(
            fir_number='FIR-TEST-001',
            description='Test FIR',
            location=Point(77.2, 28.6)
        )
        self.assertEqual(FIR.objects.count(), 1)
        self.assertEqual(fir.location.x, 77.2)

        # Verify RiskScore
        risk = RiskScore.objects.create(
            zone_name="Test Zone",
            score=0.8,
            center=Point(77.2, 28.6)
        )
        self.assertEqual(RiskScore.objects.count(), 1)

    def test_services_and_apis(self):
        # Verify M8 Dashboard API
        response = self.client.get('/api/dashboard/summary/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('total_users', response.data)

        # Verify M6 GIS Heatmap API
        response = self.client.get('/api/gis/heatmap/')
        self.assertEqual(response.status_code, 200)

        # Verify M10/M11 Reports Health API
        response = self.client.get('/api/reports/health/')
        self.assertEqual(response.status_code, 200)

print("Audit tests generated. Run with 'python manage.py test audit_tests' once the database and GDAL are available.")
