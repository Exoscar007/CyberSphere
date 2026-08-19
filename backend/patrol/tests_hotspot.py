from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.gis.geos import Point

from users.models import CustomUser, PoliceStation
from intelligence.models import RiskScore
from patrol.services import PatrolService


class PatrolHotspotRecommendationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.station1 = PoliceStation.objects.create(
            station_code='NAV-01',
            name='Navrangpura Police Station',
            location=Point(72.5571, 23.0395, srid=4326),
            is_active=True
        )
        self.station2 = PoliceStation.objects.create(
            station_code='SAT-02',
            name='Satellite Police Station',
            location=Point(72.5136, 23.0277, srid=4326),
            is_active=True
        )

        self.admin = CustomUser.objects.create_user(username='admin_patrol', password='123', role='ADMIN')
        self.patrol1 = CustomUser.objects.create_user(
            username='officer_nav',
            password='123',
            role='PATROL_OFFICER',
            badge_number='NAV-991',
            station=self.station1
        )
        self.patrol2 = CustomUser.objects.create_user(
            username='officer_sat',
            password='123',
            role='PATROL_OFFICER',
            badge_number='SAT-992',
            station=self.station2
        )

        self.hotspot = RiskScore.objects.create(
            zone_name='Navrangpura Commercial',
            center=Point(72.5575, 23.0400, srid=4326),
            score=82.0,
            risk_level='CRITICAL',
        )

    def test_recommend_patrol_for_hotspot_service(self):
        result = PatrolService.recommend_patrol_for_hotspot(user=self.admin, zone_id=self.hotspot.id)
        self.assertIn('target_hotspot', result)
        self.assertIn('candidates', result)
        self.assertGreater(result['candidates_count'], 0)

        # Navrangpura officer should be closer to Navrangpura hotspot than Satellite officer
        recommended = result['recommended_officer']
        self.assertIsNotNone(recommended)
        self.assertEqual(recommended['officer_name'], 'officer_nav')
        self.assertLess(recommended['distance_km'], 1.0)
        self.assertTrue(recommended['is_available'])

    def test_recommend_patrol_for_hotspot_api(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f'/api/patrol/recommend-for-hotspot/?zone_id={self.hotspot.id}')
        self.assertEqual(res.status_code, 200)
        self.assertIn('target_hotspot', res.data)
        self.assertIn('recommended_officer', res.data)
        self.assertEqual(res.data['target_hotspot']['zone_name'], 'Navrangpura Commercial')
