from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .serializers import (
    LoginRequestSerializer,
    LoginResponseSerializer,
    UserResponseSerializer,
    UserManagementSerializer,
    StationPatrolSerializer,
    MFAVerifySerializer,
    MFASetupResponseSerializer,
    MFAEnableSerializer,
    MFADisableSerializer,
)
from .services import AuthService, UserService
from .permissions import IsAdminRole

class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=LoginRequestSerializer, responses={200: LoginResponseSerializer})
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = serializer.save()
            response_serializer = LoginResponseSerializer(result)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MFAVerifyAPIView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=MFAVerifySerializer, responses={200: LoginResponseSerializer})
    def post(self, request):
        serializer = MFAVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = serializer.save()
            response_serializer = LoginResponseSerializer(result)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MFASetupAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: MFASetupResponseSerializer})
    def post(self, request):
        try:
            data = AuthService.setup_mfa(request.user)
            serializer = MFASetupResponseSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MFAEnableAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(request_body=MFAEnableSerializer)
    def post(self, request):
        serializer = MFAEnableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = AuthService.enable_mfa(
                request.user,
                serializer.validated_data['secret'],
                serializer.validated_data['otp_code']
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MFADisableAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(request_body=MFADisableSerializer)
    def post(self, request):
        serializer = MFADisableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = AuthService.disable_mfa(
                request.user,
                serializer.validated_data['password'],
                serializer.validated_data.get('otp_code')
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: UserResponseSerializer})
    def get(self, request):
        user = AuthService.get_profile(request.user)
        serializer = UserResponseSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class StationPatrolListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: StationPatrolSerializer(many=True)})
    def get(self, request):
        try:
            patrols = AuthService.get_station_patrols(request.user)
            serializer = StationPatrolSerializer(patrols, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserManagementAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    @swagger_auto_schema(responses={200: UserManagementSerializer(many=True)})
    def get(self, request):
        users = UserService.get_users()
        serializer = UserManagementSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=UserManagementSerializer, responses={201: UserManagementSerializer})
    def post(self, request):
        serializer = UserManagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        try:
            from intelligence.audit_service import AuditLogService
            from intelligence.models import AuditEventType, AuditEventCategory
            AuditLogService.record(
                actor=request.user,
                action=f"Created user account '{result.username}' ({result.role})",
                event_type=AuditEventType.USER_CREATED,
                category=AuditEventCategory.USER,
                resource_type="User",
                resource_id=str(result.id),
                station=result.station,
                description=f"Admin {request.user.username} created user {result.username} with role {result.role}",
                metadata={'user_id': result.id, 'username': result.username, 'role': result.role}
            )
        except Exception:
            pass
        return Response(UserManagementSerializer(result).data, status=status.HTTP_201_CREATED)

class UserDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    @swagger_auto_schema(responses={200: UserManagementSerializer})
    def get(self, request, pk):
        user = UserService.get_user(pk)
        serializer = UserManagementSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=UserManagementSerializer, responses={200: UserManagementSerializer})
    def put(self, request, pk):
        user = UserService.get_user(pk)
        serializer = UserManagementSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        try:
            from intelligence.audit_service import AuditLogService
            from intelligence.models import AuditEventType, AuditEventCategory
            AuditLogService.record(
                actor=request.user,
                action=f"Updated user account '{result.username}'",
                event_type=AuditEventType.USER_UPDATED,
                category=AuditEventCategory.USER,
                resource_type="User",
                resource_id=str(result.id),
                station=result.station,
                description=f"Admin {request.user.username} updated profile for user {result.username}",
                metadata={'user_id': result.id, 'username': result.username, 'role': result.role}
            )
        except Exception:
            pass
        return Response(UserManagementSerializer(result).data, status=status.HTTP_200_OK)

    @swagger_auto_schema(responses={204: 'No Content'})
    def delete(self, request, pk):
        user = UserService.get_user(pk)
        uname = user.username if user else str(pk)
        ustation = user.station if user else None
        UserService.delete_user(pk)
        try:
            from intelligence.audit_service import AuditLogService
            from intelligence.models import AuditEventType, AuditEventCategory
            AuditLogService.record(
                actor=request.user,
                action=f"Deleted user account '{uname}'",
                event_type=AuditEventType.USER_DELETED,
                category=AuditEventCategory.USER,
                resource_type="User",
                resource_id=str(pk),
                station=ustation,
                description=f"Admin {request.user.username} deleted user account {uname} (ID: {pk})",
                metadata={'user_id': pk, 'username': uname}
            )
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)
