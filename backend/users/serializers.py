from rest_framework import serializers
from .validators import AuthValidator
from .services import AuthService
from .models import CustomUser

class UserResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'role', 'badge_number', 'phone_number')

class StationPatrolSerializer(serializers.ModelSerializer):
    is_busy = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'badge_number', 'is_busy')

class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        AuthValidator.validate_login_payload(data)
        return data

    def save(self):
        username = self.validated_data['username']
        password = self.validated_data['password']
        return AuthService.login(username, password)

class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserResponseSerializer()

class UserManagementSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'password', 'role', 'badge_number', 'phone_number')

    def create(self, validated_data):
        return AuthService.create_user(validated_data)

    def update(self, instance, validated_data):
        return AuthService.update_user(instance.id, validated_data)

