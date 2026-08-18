from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import pyotp
import jwt
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class MFABackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "SecOps@Admin2026!"
        self.standard_user = User.objects.create_user(
            username="standard_officer",
            password=self.password,
            role="STATION",
            badge_number="ST-888"
        )
        self.mfa_user = User.objects.create_user(
            username="mfa_admin",
            password=self.password,
            role="ADMIN",
            badge_number="AD-999"
        )
        self.mfa_secret = pyotp.random_base32()
        self.mfa_user.mfa_enabled = True
        self.mfa_user.mfa_secret = self.mfa_secret
        self.mfa_user.save()

    def test_login_without_mfa_returns_jwt_tokens(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'standard_officer',
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get('mfa_required'))
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'standard_officer')

    def test_login_with_mfa_returns_challenge_token_without_jwt(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'mfa_admin',
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('mfa_required'))
        self.assertIn('mfa_token', response.data)
        self.assertIsNone(response.data.get('access'))
        self.assertIsNone(response.data.get('refresh'))

    def test_mfa_verify_valid_totp_issues_jwt_tokens(self):
        login_res = self.client.post('/api/auth/login/', {
            'username': 'mfa_admin',
            'password': self.password
        })
        mfa_token = login_res.data['mfa_token']
        totp = pyotp.TOTP(self.mfa_secret)
        current_code = totp.now()

        verify_res = self.client.post('/api/auth/mfa/verify/', {
            'mfa_token': mfa_token,
            'otp_code': current_code
        })
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', verify_res.data)
        self.assertIn('refresh', verify_res.data)
        self.assertEqual(verify_res.data['user']['username'], 'mfa_admin')

    def test_mfa_verify_invalid_totp_fails_and_rate_limits(self):
        login_res = self.client.post('/api/auth/login/', {
            'username': 'mfa_admin',
            'password': self.password
        })
        mfa_token = login_res.data['mfa_token']

        # 4 failed attempts
        for _ in range(4):
            res = self.client.post('/api/auth/mfa/verify/', {
                'mfa_token': mfa_token,
                'otp_code': '000000'
            })
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('That verification code is invalid', res.data['detail'])

        # 5th attempt locks out
        res5 = self.client.post('/api/auth/mfa/verify/', {
            'mfa_token': mfa_token,
            'otp_code': '000000'
        })
        self.assertEqual(res5.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Too many verification attempts', res5.data['detail'])

    def test_mfa_verify_expired_challenge_rejected(self):
        payload = {
            'user_id': self.mfa_user.id,
            'purpose': 'mfa_challenge',
            'exp': int((timezone.now() - timedelta(minutes=10)).timestamp())
        }
        expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        if isinstance(expired_token, bytes):
            expired_token = expired_token.decode('utf-8')

        res = self.client.post('/api/auth/mfa/verify/', {
            'mfa_token': expired_token,
            'otp_code': pyotp.TOTP(self.mfa_secret).now()
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', res.data['detail'].lower())

    def test_mfa_setup_and_enable_lifecycle(self):
        self.client.force_authenticate(user=self.standard_user)

        # 1. Setup
        setup_res = self.client.post('/api/auth/mfa/setup/')
        self.assertEqual(setup_res.status_code, status.HTTP_200_OK)
        self.assertIn('secret', setup_res.data)
        self.assertIn('provisioning_uri', setup_res.data)
        new_secret = setup_res.data['secret']

        # 2. Enable with invalid OTP -> fails
        bad_enable = self.client.post('/api/auth/mfa/enable/', {
            'secret': new_secret,
            'otp_code': '999999'
        })
        self.assertEqual(bad_enable.status_code, status.HTTP_400_BAD_REQUEST)
        self.standard_user.refresh_from_db()
        self.assertFalse(self.standard_user.mfa_enabled)

        # 3. Enable with valid OTP -> succeeds
        valid_otp = pyotp.TOTP(new_secret).now()
        good_enable = self.client.post('/api/auth/mfa/enable/', {
            'secret': new_secret,
            'otp_code': valid_otp
        })
        self.assertEqual(good_enable.status_code, status.HTTP_200_OK)
        self.standard_user.refresh_from_db()
        self.assertTrue(self.standard_user.mfa_enabled)
        self.assertEqual(self.standard_user.mfa_secret, new_secret)

        # 4. Disable
        disable_res = self.client.post('/api/auth/mfa/disable/', {
            'password': self.password,
            'otp_code': pyotp.TOTP(new_secret).now()
        })
        self.assertEqual(disable_res.status_code, status.HTTP_200_OK)
        self.standard_user.refresh_from_db()
        self.assertFalse(self.standard_user.mfa_enabled)
        self.assertIsNone(self.standard_user.mfa_secret)
