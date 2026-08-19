from datetime import timedelta
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import PoliceStation
from crimes.models import Incident, FIR, Complaint
from patrol.models import PatrolAssignment
from intelligence.models import RiskScore, CrimeTrend

User = get_user_model()

class IntelligenceSummaryAPITests(APITestCase):
    def setUp(self):
        # 1. Create Police Stations
        self.station_a = PoliceStation.objects.create(
            name="Navrangpura Police Station",
            station_code="NAV-01",
            address="CG Road, Ahmedabad",
            location=Point(72.5571, 23.0395, srid=4326),
        )
        self.station_b = PoliceStation.objects.create(
            name="Satellite Police Station",
            station_code="SAT-02",
            address="Satellite Road, Ahmedabad",
            location=Point(72.5136, 23.0277, srid=4326),
        )

        # 2. Create Users
        self.admin_user = User.objects.create_user(
            username="admin_cmd",
            password="password123",
            role="ADMIN",
            badge_number="ADM-001",
        )
        self.station_a_user = User.objects.create_user(
            username="station_nav",
            password="password123",
            role="STATION",
            station=self.station_a,
            badge_number="STA-001",
        )
        self.station_b_user = User.objects.create_user(
            username="station_sat",
            password="password123",
            role="STATION",
            station=self.station_b,
            badge_number="STA-002",
        )
        self.patrol_officer = User.objects.create_user(
            username="patrol_cop",
            password="password123",
            role="PATROL",
            station=self.station_a,
            badge_number="COP-001",
        )

        now = timezone.now()

        # 3. Create Operational Records for Station A
        self.inc_a1 = Incident.objects.create(
            title="Armed Chain Snatching near Municipal Market",
            description="Motorcycle riders snatched gold chain at gunpoint",
            location=Point(72.5580, 23.0400, srid=4326),
            date_occurred=now - timedelta(days=5),
            severity="CRITICAL",
            status="OPEN",
            station=self.station_a,
        )
        self.inc_a2 = Incident.objects.create(
            title="Commercial UPI Fraud Scam",
            description="Phishing attempt targeted university finance desk",
            location=Point(72.5560, 23.0390, srid=4326),
            date_occurred=now - timedelta(days=2),
            severity="HIGH",
            status="OPEN",
            station=self.station_a,
        )
        self.inc_a3 = Incident.objects.create(
            title="Chain Snatching near CG Road",
            description="Second snatching incident in commercial alley",
            location=Point(72.5575, 23.0398, srid=4326),
            date_occurred=now - timedelta(hours=6),
            severity="CRITICAL",
            status="OPEN",
            station=self.station_a,
        )
        self.fir_a = FIR.objects.create(
            fir_number="FIR-NAV-2026-001",
            description="Armed robbery and chain snatching report",
            reported_by=self.admin_user,
            location=Point(72.5571, 23.0395, srid=4326),
            status="OPEN",
            station=self.station_a,
        )

        # 4. Create Operational Records for Station B
        self.inc_b1 = Incident.objects.create(
            title="Luxury SUV Vehicle Theft",
            description="Car stolen from residential driveway",
            location=Point(72.5140, 23.0280, srid=4326),
            date_occurred=now - timedelta(days=1),
            severity="HIGH",
            status="OPEN",
            station=self.station_b,
        )

        # 5. Create Patrol Assignment in Station A
        self.patrol_a = PatrolAssignment.objects.create(
            officer=self.patrol_officer,
            zone_name="Navrangpura Commercial",
            status=PatrolAssignment.Status.EN_ROUTE,
            priority=PatrolAssignment.Priority.HIGH,
            destination=Point(72.5571, 23.0395, srid=4326),
            instructions="Maintain visible presence along CG Road.",
            station=self.station_a,
            incident=self.inc_a1,
        )

        # 6. Create Risk Scores (AI prediction output consumed by intelligence layer)
        self.risk_a = RiskScore.objects.create(
            zone_name="Navrangpura Commercial",
            center=Point(72.5571, 23.0395, srid=4326),
            score=84.5,
            risk_level="CRITICAL",
            confidence=0.92,
            model_status="trained_ml",
            prediction_period="Next 24 Hours",
            radius_meters=1000.0,
        )
        self.risk_b = RiskScore.objects.create(
            zone_name="Satellite Residential",
            center=Point(72.5136, 23.0277, srid=4326),
            score=68.0,
            risk_level="HIGH",
            confidence=0.85,
            model_status="trained_ml",
            prediction_period="Next 24 Hours",
            radius_meters=1000.0,
        )

    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests must be rejected with 401."""
        res = self.client.get('/api/intelligence/summary/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_citywide_intelligence_summary(self):
        """Admin receives citywide intelligence across all sectors and stations."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        self.assertIn('overview', data)
        self.assertIn('priority_queue', data)
        self.assertIn('zones', data)
        self.assertEqual(data['user_scope'], 'CITYWIDE COMMAND')

        # Both zones should be present in admin citywide summary
        zone_names = [z['zone_name'] for z in data['zones']]
        self.assertIn("Navrangpura Commercial", zone_names)
        self.assertIn("Satellite Residential", zone_names)

        # Check Overview Metrics
        overview = data['overview']
        self.assertEqual(overview['total_monitored_zones'], 2)
        self.assertGreaterEqual(overview['critical_zones'], 1)
        self.assertGreaterEqual(overview['total_recent_incidents'], 4)

    def test_station_isolation_enforcement(self):
        """Station user only sees intelligence within their jurisdiction/station."""
        self.client.force_authenticate(user=self.station_a_user)
        res = self.client.get('/api/intelligence/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        self.assertIn('Navrangpura Police Station', data['user_scope'])

        zone_names = [z['zone_name'] for z in data['zones']]
        self.assertIn("Navrangpura Commercial", zone_names)
        # Station A must NOT see Station B's Satellite zone
        self.assertNotIn("Satellite Residential", zone_names)

    def test_deterministic_recommendation_and_priority_action(self):
        """Recommendations must be deterministic rule-based operational guidance."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        nav_zone = next(z for z in res.data['zones'] if z['zone_name'] == 'Navrangpura Commercial')
        self.assertEqual(nav_zone['risk_level'], 'CRITICAL')
        self.assertEqual(nav_zone['score'], 84.5)
        # Since active patrols exist for Navrangpura, priority action is Increase Patrol Coverage
        self.assertEqual(nav_zone['priority_action'], 'Increase Patrol Coverage')
        self.assertIn("Increase high-visibility patrol density", nav_zone['recommendation'])
        self.assertIn("Navrangpura Commercial", nav_zone['recommendation'])

        # Contributing factors must be backed by real counts
        factors = nav_zone['contributing_factors']
        self.assertTrue(any("incident(s) recorded" in f for f in factors))
        self.assertTrue(any("active patrol unit(s)" in f for f in factors))
        self.assertTrue(any("AI predictive risk score" in f for f in factors))

    def test_trend_calculation_with_sparse_data(self):
        """When historical incident data is sparse (< 2 records or narrow span), return 'Insufficient historical data'."""
        self.client.force_authenticate(user=self.station_b_user)
        res = self.client.get('/api/intelligence/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        sat_zone = res.data['zones'][0]
        # Only 1 incident existed in station B, so trend must be 'Insufficient historical data'
        self.assertEqual(sat_zone['trend'], 'Insufficient historical data')
        self.assertIn('Insufficient historical data', sat_zone['trend_label'])

    def test_priority_queue_ranking(self):
        """Priority queue ranks highest risk zone first."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        queue = res.data['priority_queue']
        self.assertGreater(len(queue), 0)
        self.assertEqual(queue[0]['rank'], 1)
        self.assertEqual(queue[0]['zone_name'], 'Navrangpura Commercial')
        self.assertEqual(queue[0]['score'], 84.5)

    def test_no_sensitive_credentials_in_response(self):
        """Ensure no sensitive passwords, MFA secrets, or tokens are returned."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        response_str = str(res.data)
        self.assertNotIn('password', response_str.lower())
        self.assertNotIn('mfa_secret', response_str.lower())
        self.assertNotIn('refresh', response_str.lower())
