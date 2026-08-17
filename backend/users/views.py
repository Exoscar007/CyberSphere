from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .serializers import LoginRequestSerializer, LoginResponseSerializer, UserResponseSerializer, UserManagementSerializer, StationPatrolSerializer
from .services import AuthService, UserService
from .permissions import IsAdminRole

class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=LoginRequestSerializer, responses={200: LoginResponseSerializer})
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        response_serializer = LoginResponseSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

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
        return Response(UserManagementSerializer(result).data, status=status.HTTP_200_OK)

    @swagger_auto_schema(responses={204: 'No Content'})
    def delete(self, request, pk):
        UserService.delete_user(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
