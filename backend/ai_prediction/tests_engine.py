from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.gis.geos import Point

from crimes.models import Incident
from users.models import PoliceStation
from ai_prediction.pipeline import FeatureExtractionPipeline
from ai_prediction.engine import PredictionEngine, MIN_TRAINING_EVENTS


class PredictionEngineTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.station = PoliceStation.objects.create(
            station_code='NAV-01',
            name='Navrangpura Police Station',
            location=Point(72.5571, 23.0395, srid=4326),
            is_active=True
        )

    def test_insufficient_data_fallback_to_baseline(self):
        # Create 3 incidents (below MIN_TRAINING_EVENTS of 25)
        for i in range(3):
            Incident.objects.create(
                title=f'Incident {i}',
                description='Small test incident',
                location=Point(72.5571, 23.0395, srid=4326),
                date_occurred=self.now - timedelta(days=i),
                severity='MEDIUM',
                station=self.station
            )

        zone_features, total_events = FeatureExtractionPipeline.extract_zone_features()
        self.assertLess(total_events, MIN_TRAINING_EVENTS)

        engine_result = PredictionEngine.compute_predictions(zone_features, total_events)
        self.assertEqual(engine_result['status'], 'baseline')
        self.assertIn('Baseline', engine_result['model_name'])

        for pred in engine_result['predictions']:
            # Score must be bounded in [0, 100]
            self.assertGreaterEqual(pred['score'], 0.0)
            self.assertLessEqual(pred['score'], 100.0)
            # Level must be one of LOW, MEDIUM, HIGH, CRITICAL
            self.assertIn(pred['risk_level'], ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
            # Confidence is honest (None in baseline mode)
            self.assertIsNone(pred['confidence'])
            # Factors must contain explainable telemetry
            self.assertIn('explanation_summary', pred['factors'])
            self.assertIn('recent_incidents_24h', pred['factors'])
            self.assertIn('seven_day_trend', pred['factors'])

    def test_train_model_with_sufficient_data(self):
        # Create 30 synthetic incidents distributed over the past 30 days
        for i in range(30):
            Incident.objects.create(
                title=f'Crime Event {i}',
                description='Synthetic training incident for model verification',
                location=Point(72.5571 + (i % 5) * 0.01, 23.0395 + (i % 4) * 0.01, srid=4326),
                date_occurred=self.now - timedelta(days=(i % 25), hours=(i % 12)),
                severity='HIGH' if i % 3 == 0 else 'MEDIUM',
                station=self.station
            )

        zone_features, total_events = FeatureExtractionPipeline.extract_zone_features()
        self.assertGreaterEqual(total_events, MIN_TRAINING_EVENTS)

        # Train model
        train_res = PredictionEngine.train_model()
        self.assertTrue(train_res['success'])
        self.assertEqual(train_res['status'], 'trained_ml')
        self.assertIn('feature_importances', train_res)

        # Predict with trained model
        ml_result = PredictionEngine.compute_predictions(zone_features, total_events)
        self.assertEqual(ml_result['status'], 'trained_ml')
        self.assertIn('Random Forest', ml_result['model_name'])

        for pred in ml_result['predictions']:
            self.assertEqual(pred['model_status'], 'trained_ml')
            self.assertIsNotNone(pred['confidence'])
            self.assertGreaterEqual(pred['confidence'], 0.5)
            self.assertLessEqual(pred['confidence'], 1.0)
