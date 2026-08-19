from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.gis.geos import Point

from users.models import CustomUser, PoliceStation
from intelligence.models import RiskScore
from ai_prediction.services import AIPredictionService


class AIPredictionAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.station = PoliceStation.objects.create(
            station_code='NAV-01',
            name='Navrangpura Police Station',
            location=Point(72.5571, 23.0395, srid=4326),
            is_active=True
        )
        self.admin = CustomUser.objects.create_user(username='admin_api', password='123', role='ADMIN')
        self.station_user = CustomUser.objects.create_user(username='stn_api', password='123', role='STATION', station=self.station)
        self.patrol_user = CustomUser.objects.create_user(username='ptl_api', password='123', role='PATROL_OFFICER', station=self.station)

    def test_model_status_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/ai/model-status/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('engine_status', res.data)
        self.assertIn('events_available', res.data)
        self.assertIn('min_required_for_ml', res.data)

    def test_trigger_prediction_and_predictive_zones(self):
        self.client.force_authenticate(user=self.admin)
        trigger_res = self.client.post('/api/ai/predict/')
        self.assertEqual(trigger_res.status_code, 202)
        job_id = trigger_res.data['id']

        # Check job status
        status_res = self.client.get(f'/api/ai/jobs/{job_id}/')
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.data['status'], 'COMPLETED')

        # Check predictive-zones
        zones_res = self.client.get('/api/ai/predictive-zones/')
        self.assertEqual(zones_res.status_code, 200)
        self.assertGreater(len(zones_res.data), 0)

        first_zone = zones_res.data[0]
        self.assertIn('zone_name', first_zone)
        self.assertIn('score', first_zone)
        self.assertIn('risk_level', first_zone)
        self.assertIn('factors', first_zone)
        self.assertIn('explanation_summary', first_zone['factors'])

    def test_predictive_zones_filtering(self):
        RiskScore.objects.create(
            zone_name='Critical Sector',
            center=Point(72.55, 23.03, srid=4326),
            score=88.5,
            risk_level='CRITICAL',
        )
        RiskScore.objects.create(
            zone_name='Low Sector',
            center=Point(72.50, 23.01, srid=4326),
            score=12.0,
            risk_level='LOW',
        )

        self.client.force_authenticate(user=self.station_user)
        res = self.client.get('/api/ai/predictive-zones/?risk_level=CRITICAL')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(all(z['risk_level'] == 'CRITICAL' for z in res.data))

        res_score = self.client.get('/api/ai/predictive-zones/?min_score=50')
        self.assertEqual(res_score.status_code, 200)
        self.assertTrue(all(z['score'] >= 50 for z in res_score.data))
