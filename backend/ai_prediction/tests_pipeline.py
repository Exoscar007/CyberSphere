from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.gis.geos import Point

from crimes.models import Incident, FIR
from users.models import PoliceStation
from ai_prediction.pipeline import (
    FeatureExtractionPipeline,
    classify_crime_category,
    haversine_km,
)


class FeatureExtractionPipelineTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.station = PoliceStation.objects.create(
            station_code='NAV-01',
            name='Navrangpura Police Station',
            location=Point(72.5571, 23.0395, srid=4326),
            is_active=True
        )

    def test_classify_crime_category(self):
        self.assertEqual(classify_crime_category('Online UPI Fraud', 'Victim lost money via phishing link'), 'CYBER')
        self.assertEqual(classify_crime_category('Armed Robbery at Store', 'Assault on cashier'), 'VIOLENT')
        self.assertEqual(classify_crime_category('Vehicle Theft in Parking', 'Motorcycle stolen'), 'PROPERTY')
        self.assertEqual(classify_crime_category('Noise Disturbance', 'Loud gathering late night'), 'PUBLIC_ORDER')

    def test_haversine_km(self):
        # Known approximate distance between Navrangpura (23.0395, 72.5571) and Satellite (23.0280, 72.5140) is ~4.6 km
        d = haversine_km(23.0395, 72.5571, 23.0280, 72.5140)
        self.assertGreater(d, 4.0)
        self.assertLess(d, 5.5)

    def test_extract_zone_features_with_db_data(self):
        # Create incidents with varying timestamps and categories
        Incident.objects.create(
            title='Cyber Extortion Report',
            description='Ransomware scam demands cryptocurrency',
            location=Point(72.5575, 23.0400, srid=4326),
            date_occurred=self.now - timedelta(hours=3),
            severity='HIGH',
            station=self.station
        )
        Incident.objects.create(
            title='Night Burglary',
            description='Theft of laptops',
            location=Point(72.5580, 23.0410, srid=4326),
            date_occurred=self.now - timedelta(days=2),
            severity='CRITICAL',
            station=self.station
        )
        FIR.objects.create(
            fir_number='FIR-TEST-001',
            description='Vehicle Theft reported',
            location=Point(72.5560, 23.0390, srid=4326),
            status='OPEN',
            station=self.station
        )

        zone_features, total_events = FeatureExtractionPipeline.extract_zone_features(as_of_time=timezone.now() + timedelta(minutes=5))
        self.assertEqual(total_events, 3)

        self.assertGreater(len(zone_features), 0)

        # Locate Navrangpura sector
        nav_zone = next((z for z in zone_features if 'Navrangpura' in z['zone_name']), None)
        self.assertIsNotNone(nav_zone)
        self.assertGreaterEqual(nav_zone['count_7d'], 1)
        self.assertGreaterEqual(nav_zone['count_24h'], 1)
        self.assertGreaterEqual(nav_zone['cyber_incidents_7d'], 1)
        self.assertGreater(nav_zone['local_density'], 0.0)
