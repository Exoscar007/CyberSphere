from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
import datetime
from django.contrib.gis.geos import Point

from crimes.models import Incident
from users.models import CustomUser


class ForecastTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='testuser',
            password='password123',
            role='STATION'
        )

    def test_empty_database_forecast(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('forecast'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(len(data['forecast']), 7)
        self.assertTrue(all(d['predicted_count'] == 0 for d in data['forecast']))

    def test_adaptive_forecast_few_days(self):
        self.client.force_authenticate(user=self.user)

        # 5 days of data
        for i in range(5):
            dt = timezone.now() - datetime.timedelta(days=i)
            Incident.objects.create(
                title="Test", description="Test", location=Point(72.5, 23.0, srid=4326),
                date_occurred=dt
            )

        response = self.client.get(reverse('forecast'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['model'], 'adaptive_daily_poisson_rate')
        self.assertEqual(len(data['forecast']), 7)
        self.assertTrue(all('predicted_count' in d for d in data['forecast']))
        self.assertTrue(all(d['predicted_count'] >= 0 for d in data['forecast']))

    def test_forecast_generation_multi_week(self):
        self.client.force_authenticate(user=self.user)

        # Create 30 days of data (sufficient)
        start = timezone.now() - datetime.timedelta(days=30)
        for i in range(30):
            dt = start + datetime.timedelta(days=i)
            count = 5 if dt.weekday() == 4 else 2

            for _ in range(count):
                Incident.objects.create(
                    title="Test", description="Test", location=Point(72.5, 23.0, srid=4326),
                    date_occurred=dt
                )

        response = self.client.get(reverse('forecast'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['model'], 'weighted_seasonal_moving_average')
        self.assertEqual(len(data['forecast']), 7)
        self.assertTrue(all('predicted_count' in d for d in data['forecast']))
        self.assertTrue(all(d['predicted_count'] >= 0 for d in data['forecast']))
        self.assertIn('validation', data)
        self.assertIn('model_mae', data['validation'])

    def test_rbac_unauthenticated(self):
        response = self.client.get(reverse('forecast'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
