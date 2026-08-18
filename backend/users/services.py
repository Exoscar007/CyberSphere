from .repository import UserRepository
from .models import CustomUser
from django.contrib.auth import authenticate
from django.utils import timezone
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta
import jwt
import pyotp

class UserService:
    @staticmethod
    def get_users():
        return UserRepository.get_all_users()

    @staticmethod
    def get_user(user_id):
        return UserRepository.get_user_by_id(user_id)

    @staticmethod
    def create_user(username, password, role='POLICE_OFFICER', badge_number=''):
        return UserRepository.create_user(username, password, role, badge_number)

    @staticmethod
    def delete_user(user_id):
        return UserRepository.delete_user(user_id)

class AuthService:
    @staticmethod
    def login(username, password):
        user = authenticate(username=username, password=password)
        if not user:
            raise ValueError("Invalid credentials")

        if user.mfa_enabled:
            if user.mfa_locked_until and user.mfa_locked_until > timezone.now():
                raise ValueError("Too many verification attempts. Please try again later.")
            
            exp_time = timezone.now() + timedelta(minutes=5)
            payload = {
                'user_id': user.id,
                'purpose': 'mfa_challenge',
                'exp': int(exp_time.timestamp()),
            }
            mfa_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            if isinstance(mfa_token, bytes):
                mfa_token = mfa_token.decode('utf-8')

            return {
                'mfa_required': True,
                'mfa_token': mfa_token,
                'user': user,
            }

        refresh = RefreshToken.for_user(user)
        return {
            'mfa_required': False,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': user,
        }

    @staticmethod
    def verify_mfa(mfa_token, otp_code):
        if not mfa_token or not otp_code:
            raise ValueError("Missing challenge token or verification code.")

        try:
            payload = jwt.decode(mfa_token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise ValueError("This verification request has expired. Please sign in again.")
        except Exception:
            raise ValueError("Invalid verification request. Please sign in again.")

        if payload.get('purpose') != 'mfa_challenge':
            raise ValueError("Invalid verification challenge.")

        user_id = payload.get('user_id')
        user = CustomUser.objects.filter(id=user_id).first()
        if not user or not user.mfa_enabled or not user.mfa_secret:
            raise ValueError("MFA configuration error for this account.")

        if user.mfa_locked_until and user.mfa_locked_until > timezone.now():
            raise ValueError("Too many verification attempts. Please try again later.")

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(str(otp_code).strip(), valid_window=1):
            user.mfa_failed_attempts += 1
            if user.mfa_failed_attempts >= 5:
                user.mfa_locked_until = timezone.now() + timedelta(minutes=15)
            user.save(update_fields=['mfa_failed_attempts', 'mfa_locked_until'])

            if user.mfa_failed_attempts >= 5:
                raise ValueError("Too many verification attempts. Please try again later.")
            raise ValueError("That verification code is invalid. Please try again.")

        user.mfa_failed_attempts = 0
        user.mfa_locked_until = None
        user.save(update_fields=['mfa_failed_attempts', 'mfa_locked_until'])

        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user,
        }

    @staticmethod
    def setup_mfa(user):
        secret = pyotp.random_base32()
        uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.username,
            issuer_name="CyberSphere - Ahmedabad Police"
        )
        return {
            'secret': secret,
            'provisioning_uri': uri,
        }

    @staticmethod
    def enable_mfa(user, secret, otp_code):
        if not secret or not otp_code:
            raise ValueError("Missing secret or verification code.")

        totp = pyotp.TOTP(secret)
        if not totp.verify(str(otp_code).strip(), valid_window=1):
            raise ValueError("That verification code is invalid. MFA not enabled.")

        user.mfa_secret = secret
        user.mfa_enabled = True
        user.mfa_failed_attempts = 0
        user.mfa_locked_until = None
        user.save(update_fields=['mfa_secret', 'mfa_enabled', 'mfa_failed_attempts', 'mfa_locked_until'])

        return {
            'mfa_enabled': True,
            'message': "Multi-factor authentication successfully enabled.",
        }

    @staticmethod
    def disable_mfa(user, password, otp_code=None):
        if not user.check_password(password):
            raise ValueError("Incorrect password.")

        if user.mfa_secret and otp_code:
            totp = pyotp.TOTP(user.mfa_secret)
            if not totp.verify(str(otp_code).strip(), valid_window=1):
                raise ValueError("That verification code is invalid.")

        user.mfa_enabled = False
        user.mfa_secret = None
        user.mfa_failed_attempts = 0
        user.mfa_locked_until = None
        user.save(update_fields=['mfa_secret', 'mfa_enabled', 'mfa_failed_attempts', 'mfa_locked_until'])

        return {
            'mfa_enabled': False,
            'message': "Multi-factor authentication disabled.",
        }

    @staticmethod
    def get_profile(user):
        return user

    @staticmethod
    def get_station_patrols(user):
        from patrol.models import PatrolAssignment
        from django.db.models import Exists, OuterRef

        if not hasattr(user, 'station') or not user.station:
            raise ValueError("User does not belong to a station")

        patrols = UserRepository.get_station_patrols(user.station)

        active_statuses = [
            PatrolAssignment.Status.ASSIGNED,
            PatrolAssignment.Status.ACKNOWLEDGED,
            PatrolAssignment.Status.EN_ROUTE,
            PatrolAssignment.Status.ARRIVED,
        ]

        active_assignments = PatrolAssignment.objects.filter(
            officer=OuterRef('pk'),
            status__in=active_statuses,
        )

        return patrols.annotate(is_busy=Exists(active_assignments))

    @staticmethod
    def create_user(validated_data):
        return UserRepository.create_user(
            username=validated_data.get('username'),
            password=validated_data.get('password'),
            role=validated_data.get('role', 'POLICE_OFFICER'),
            badge_number=validated_data.get('badge_number', ''),
        )

    @staticmethod
    def update_user(user_id, validated_data):
        user = UserRepository.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        for key, value in validated_data.items():
            if key == 'password':
                user.set_password(value)
            else:
                setattr(user, key, value)
        user.save()
        return user
