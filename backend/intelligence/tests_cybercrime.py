from datetime import timedelta
from django.utils import timezone
from django.contrib.gis.geos import Point
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from users.models import PoliceStation
from crimes.models import FIR, Incident
from intelligence.models import RiskScore
from intelligence.cybercrime import CybercrimeClassifier, CybercrimeIntelligenceService

User = get_user_model()


class CybercrimeClassifierTests(APITestCase):
    """Test deterministic classification logic."""

    def test_phishing_classification(self):
        title = "Fake SBI banking portal credential theft"
        desc = "Victim received SMS with phishing link to spoof login"
        is_cyber = CybercrimeClassifier.is_cybercrime(title, desc)
        cat_code, cat_label = CybercrimeClassifier.classify(title, desc)
        self.assertTrue(is_cyber)
        self.assertEqual(cat_code, 'PHISHING')
        self.assertIn('Phishing', cat_label)

    def test_financial_fraud_classification(self):
        title = "Unauthorized UPI withdrawal"
        desc = "Rs 45000 transferred after fake QR scan and OTP fraud"
        is_cyber = CybercrimeClassifier.is_cybercrime(title, desc)
        cat_code, cat_label = CybercrimeClassifier.classify(title, desc)
        self.assertTrue(is_cyber)
        self.assertEqual(cat_code, 'FINANCIAL_FRAUD')
        self.assertIn('Financial', cat_label)

    def test_identity_theft_classification(self):
        title = "Fake police officer profile created"
        desc = "High official identity stolen for extortion"
        is_cyber = CybercrimeClassifier.is_cybercrime(title, desc)
        cat_code, cat_label = CybercrimeClassifier.classify(title, desc)
        self.assertTrue(is_cyber)
        self.assertEqual(cat_code, 'IDENTITY_THEFT')

    def test_physical_crime_not_classified_as_cyber(self):
        title = "Armed robbery at jewelry store"
        desc = "Two suspects on motorcycle broke shop window with iron rod"
        is_cyber = CybercrimeClassifier.is_cybercrime(title, desc)
        cat_code, _ = CybercrimeClassifier.classify(title, desc)
        self.assertFalse(is_cyber)
        self.assertIsNone(cat_code)


class CybercrimeIntelligenceAPITests(APITestCase):
    """Integration and RBAC tests for cybercrime intelligence endpoints."""

    def setUp(self):
        # Create Stations
        self.station_nav = PoliceStation.objects.create(
            station_code='NAV-01',
            name='Navrangpura Police Station',
            address='Navrangpura, Ahmedabad',
            location=Point(72.5571, 23.0395, srid=4326)
        )
        self.station_sat = PoliceStation.objects.create(
            station_code='SAT-02',
            name='Satellite Police Station',
            address='Satellite, Ahmedabad',
            location=Point(72.5136, 23.0277, srid=4326)
        )

        # Create Users
        self.admin_user = User.objects.create_user(
            username='admin_test',
            password='password123',
            role='ADMIN'
        )
        self.station_user = User.objects.create_user(
            username='station_nav_test',
            password='password123',
            role='STATION',
            station=self.station_nav
        )
        self.other_station_user = User.objects.create_user(
            username='station_sat_test',
            password='password123',
            role='STATION',
            station=self.station_sat
        )

        now = timezone.now()

        # Create sample physical & cyber records
        # Navrangpura Cyber & Physical
        self.fir_cyber_1 = FIR.objects.create(
            fir_number='FIR-NAV-CY-001',
            description='[CYBER CRIME] Online banking UPI fraud reported by merchant',
            location=Point(72.5575, 23.0400, srid=4326),
            station=self.station_nav,
        )
        self.fir_cyber_2 = FIR.objects.create(
            fir_number='FIR-NAV-CY-002',
            description='Fake scholarship phishing link sent to college students',
            location=Point(72.5560, 23.0390, srid=4326),
            station=self.station_nav,
        )
        self.fir_phys_1 = FIR.objects.create(
            fir_number='FIR-NAV-PH-001',
            description='Burglary in commercial shop near CG Road',
            location=Point(72.5580, 23.0410, srid=4326),
            station=self.station_nav,
        )

        # Satellite Physical & Cyber
        self.inc_sat_phys = Incident.objects.create(
            title='Vehicle Theft near Star Bazaar',
            description='Motorcycle stolen from open parking',
            location=Point(72.5140, 23.0280, srid=4326),
            date_occurred=now - timedelta(hours=5),
            severity='HIGH',
            station=self.station_sat,
        )
        self.inc_sat_cyber = Incident.objects.create(
            title='Credit card skimming at fuel station',
            description='POS machine payment fraud and card skimming duplicate',
            location=Point(72.5145, 23.0275, srid=4326),
            date_occurred=now - timedelta(hours=2),
            severity='HIGH',
            station=self.station_sat,
        )

        # Existing RiskScore (Contextual reading test)
        self.risk_nav = RiskScore.objects.create(
            zone_name='Navrangpura Commercial',
            center=Point(72.5571, 23.0395, srid=4326),
            score=82.5,
            risk_level='CRITICAL',
            confidence=0.88,
            model_status='baseline',
            prediction_period='Next 24 Hours'
        )

    def test_unauthenticated_requests_rejected(self):
        """Endpoints must require authentication."""
        endpoints = [
            '/api/intelligence/cybercrime/summary/',
            '/api/intelligence/cybercrime/hotspots/',
            '/api/intelligence/cybercrime/correlations/',
            '/api/intelligence/cybercrime/alerts/',
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_receives_citywide_summary(self):
        """Admin user receives citywide cybercrime aggregates."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/cybercrime/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        overview = data['overview']
        self.assertGreaterEqual(overview['total_cybercrime'], 3)
        self.assertGreaterEqual(overview['total_crime'], 5)
        self.assertIn('category_breakdown', overview)
        self.assertGreaterEqual(overview['category_breakdown']['financial_fraud'] + overview['category_breakdown']['cyber_fraud'], 1)
        self.assertGreaterEqual(overview['category_breakdown']['phishing'], 1)
        self.assertEqual(data['user_scope'], 'CITYWIDE CYBER COMMAND')

        # Verify no credentials leaked
        json_str = str(data)
        self.assertNotIn('password', json_str)
        self.assertNotIn('secret', json_str)
        self.assertNotIn('token', json_str)

    def test_station_isolation_enforced(self):
        """Station user only sees records within their jurisdiction."""
        self.client.force_authenticate(user=self.station_user)
        res = self.client.get('/api/intelligence/cybercrime/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        # Navrangpura has 2 cyber FIRs in setup
        self.assertEqual(data['overview']['total_cybercrime'], 2)
        self.assertIn('Navrangpura Police Station', data['user_scope'])

        # Check hotspots only contain Navrangpura
        hotspots = data['hotspots']
        for h in hotspots:
            self.assertEqual(h['station_id'], self.station_nav.id)

    def test_hotspots_endpoint(self):
        """Hotspot detection operates on live database coordinates."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/cybercrime/hotspots/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        hotspots = res.json()
        self.assertIsInstance(hotspots, list)
        self.assertGreaterEqual(len(hotspots), 2)

        nav_hotspot = next((h for h in hotspots if h['station_code'] == 'NAV-01'), None)
        self.assertIsNotNone(nav_hotspot)
        self.assertEqual(nav_hotspot['cybercrime_count'], 2)
        self.assertIn('explanation', nav_hotspot)
        self.assertIsNotNone(nav_hotspot['center'])
        self.assertEqual(nav_hotspot['center']['coordinates'], [72.5571, 23.0395])

        # Verify contextual AI risk score consumed without modification
        self.assertIsNotNone(nav_hotspot['ai_context'])
        self.assertEqual(nav_hotspot['ai_context']['ai_risk_score'], 82.5)
        self.assertEqual(nav_hotspot['ai_context']['ai_risk_level'], 'CRITICAL')

    def test_correlations_endpoint(self):
        """Physical vs Cybercrime correlation returns explainable metrics and statuses."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/cybercrime/correlations/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        correlations = res.json()
        self.assertIsInstance(correlations, list)

        nav_corr = next((c for c in correlations if c['station_code'] == 'NAV-01'), None)
        self.assertIsNotNone(nav_corr)
        self.assertEqual(nav_corr['cybercrimes'], 2)
        self.assertEqual(nav_corr['physical_crimes'], 1)
        self.assertIn(nav_corr['correlation_status'], [
            'CONVERGING', 'CYBER_DOMINANT', 'PHYSICAL_DOMINANT', 'DIVERGING', 'STABLE', 'INSUFFICIENT_DATA'
        ])
        self.assertTrue(len(nav_corr['explanation']) > 10)

    def test_alerts_endpoint(self):
        """Emerging cyber threat alerts identify surges from real records."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/cybercrime/alerts/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        alerts = res.json()
        self.assertIsInstance(alerts, list)

        # Navrangpura has phishing & fraud in setup
        nav_alert = next((a for a in alerts if a['station_code'] == 'NAV-01'), None)
        if nav_alert:
            self.assertIn(nav_alert['severity'], ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
            self.assertIn('explanation', nav_alert)

    def test_dynamic_update_on_new_record_creation(self):
        """Creating a new cybercrime FIR immediately updates intelligence dynamically."""
        self.client.force_authenticate(user=self.admin_user)
        
        # Get baseline summary
        res1 = self.client.get('/api/intelligence/cybercrime/summary/')
        count1 = res1.json()['overview']['total_cybercrime']

        # Create new FIR through ORM (simulating user action)
        FIR.objects.create(
            fir_number='FIR-NEW-CYBER-999',
            description='Phishing credential harvesting scam on Telegram channel',
            location=Point(72.5571, 23.0395, srid=4326),
            station=self.station_nav,
        )

        # Refresh summary
        res2 = self.client.get('/api/intelligence/cybercrime/summary/')
        count2 = res2.json()['overview']['total_cybercrime']
        self.assertEqual(count2, count1 + 1)

    def test_existing_intelligence_summary_intact(self):
        """Ensure existing /api/intelligence/summary/ continues working untouched."""
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/intelligence/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('overview', data)
        self.assertIn('zones', data)
        self.assertIn('priority_queue', data)
