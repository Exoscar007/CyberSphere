from .models import CustomUser


class UserRepository:
    @staticmethod
    def get_all_users():
        return CustomUser.objects.all()

    @staticmethod
    def get_user_by_id(user_id):
        try:
            return CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return None

    @staticmethod
    def create_user(username, password, role='POLICE_OFFICER', badge_number=''):
        return CustomUser.objects.create_user(
            username=username,
            password=password,
            role=role,
            badge_number=badge_number,
        )

    @staticmethod
    def delete_user(user_id):
        user = UserRepository.get_user_by_id(user_id)
        if user:
            user.delete()
            return True
        return False

    @staticmethod
    def get_station_patrols(station):
        if not station:
            return CustomUser.objects.none()
        return CustomUser.objects.filter(station=station, role__in=['PATROL', 'PATROL_OFFICER'])
