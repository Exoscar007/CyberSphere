from django.test import TestCase
from rest_framework.test import APIClient
from users.models import CustomUser, PoliceStation
from crimes.models import Incident, FIR
from ai_prediction.services import AIPredictionService
from django.contrib.gis.geos import Point
from django.utils import timezone
from datetime import timedelta

class AIPredictionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.station = PoliceStation.objects.create(station_code='TST', name='Test Station')
        self.admin_user = CustomUser.objects.create_user(username='admin', password='123', role='ADMIN')
        self.station_user = CustomUser.objects.create_user(username='station', password='123', role='STATION', station=self.station)
        self.patrol_user = CustomUser.objects.create_user(username='patrol', password='123', role='PATROL_OFFICER', station=self.station)
        
        self.old_date = timezone.now() - timedelta(days=40)
        self.recent_date = timezone.now() - timedelta(days=10)

    def test_ai_predict_rbac(self):
        # Unauthenticated
        res = self.client.post('/api/ai/predict/')
        self.assertEqual(res.status_code, 401)
        
        # Patrol Officer
        self.client.force_authenticate(user=self.patrol_user)
        res = self.client.post('/api/ai/predict/')
        self.assertEqual(res.status_code, 403)
        
        # Station Console
        self.client.force_authenticate(user=self.station_user)
        res = self.client.post('/api/ai/predict/')
        self.assertEqual(res.status_code, 403)
        
        # Admin
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post('/api/ai/predict/')
        self.assertEqual(res.status_code, 202)

    def test_gather_crime_data_30_day_window(self):
        # Create old records
        Incident.objects.create(title='Old', description='Old', location=Point(72.5, 23.0), date_occurred=self.old_date, severity='HIGH')
        f1 = FIR.objects.create(fir_number='F1', description='Old', location=Point(72.5, 23.0))
        # use filter/update to bypass auto_now_add for FIR
        FIR.objects.filter(id=f1.id).update(date_reported=self.old_date)

        # Create recent records
        Incident.objects.create(title='New', description='New', location=Point(72.6, 23.1), date_occurred=self.recent_date, severity='CRITICAL')
        f2 = FIR.objects.create(fir_number='F2', description='New', location=Point(72.6, 23.1))
        FIR.objects.filter(id=f2.id).update(date_reported=self.recent_date)

        points = AIPredictionService._gather_crime_data()
        self.assertEqual(len(points), 2)
        # Verify it's the recent ones by severity
        severities = [p[2] for p in points]
        self.assertIn(1.0, severities) # CRITICAL incident
        self.assertIn(0.7, severities) # OPEN FIR (default status)
