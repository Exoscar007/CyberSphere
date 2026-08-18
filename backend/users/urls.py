from django.urls import path
from .views import (
    LoginAPIView,
    ProfileAPIView,
    UserManagementAPIView,
    UserDetailAPIView,
    StationPatrolListAPIView,
    MFAVerifyAPIView,
    MFASetupAPIView,
    MFAEnableAPIView,
    MFADisableAPIView,
)

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='login'),
    path('profile/', ProfileAPIView.as_view(), name='profile'),
    path('users/', UserManagementAPIView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', UserDetailAPIView.as_view(), name='user-detail'),
    path('station-patrols/', StationPatrolListAPIView.as_view(), name='station-patrols'),
    path('mfa/verify/', MFAVerifyAPIView.as_view(), name='mfa-verify'),
    path('mfa/setup/', MFASetupAPIView.as_view(), name='mfa-setup'),
    path('mfa/enable/', MFAEnableAPIView.as_view(), name='mfa-enable'),
    path('mfa/disable/', MFADisableAPIView.as_view(), name='mfa-disable'),
]
