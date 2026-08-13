from .repository import UserRepository


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

from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

class AuthService:
    @staticmethod
    def login(username, password):
        user = authenticate(username=username, password=password)
        if not user:
            raise ValueError("Invalid credentials")
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': user
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
            PatrolAssignment.Status.ARRIVED
        ]
        
        active_assignments = PatrolAssignment.objects.filter(
            officer=OuterRef('pk'),
            status__in=active_statuses
        )
        
        return patrols.annotate(is_busy=Exists(active_assignments))

    @staticmethod
    def create_user(validated_data):
        return UserRepository.create_user(
            username=validated_data.get('username'),
            password=validated_data.get('password'),
            role=validated_data.get('role', 'POLICE_OFFICER'),
            badge_number=validated_data.get('badge_number', '')
        )

    @staticmethod
    def update_user(user_id, validated_data):
        # We assume UserRepository has an update_user, but we can just use Django ORM here or add it
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
