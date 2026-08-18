from rest_framework import serializers
from .validators import AuthValidator
from .services import AuthService
from .models import CustomUser

class UserResponseSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source='station.name', read_only=True)
    mfa_enabled = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'role', 'badge_number', 'phone_number', 'station_name', 'mfa_enabled')

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
    mfa_required = serializers.BooleanField(default=False)
    mfa_token = serializers.CharField(required=False, allow_null=True)
    access = serializers.CharField(required=False, allow_null=True)
    refresh = serializers.CharField(required=False, allow_null=True)
    user = UserResponseSerializer()

class MFAVerifySerializer(serializers.Serializer):
    mfa_token = serializers.CharField()
    otp_code = serializers.CharField(max_length=8)

    def save(self):
        mfa_token = self.validated_data['mfa_token']
        otp_code = self.validated_data['otp_code']
        return AuthService.verify_mfa(mfa_token, otp_code)

class MFASetupResponseSerializer(serializers.Serializer):
    secret = serializers.CharField()
    provisioning_uri = serializers.CharField()

class MFAEnableSerializer(serializers.Serializer):
    secret = serializers.CharField()
    otp_code = serializers.CharField(max_length=8)

class MFADisableSerializer(serializers.Serializer):
    password = serializers.CharField()
    otp_code = serializers.CharField(max_length=8, required=False, allow_blank=True)

class UserManagementSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    mfa_enabled = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'password', 'role', 'badge_number', 'phone_number', 'mfa_enabled')

    def create(self, validated_data):
        return AuthService.create_user(validated_data)

    def update(self, instance, validated_data):
        return AuthService.update_user(instance.id, validated_data)
