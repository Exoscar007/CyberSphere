from django.urls import path
from .views import LoginAPIView, ProfileAPIView, UserManagementAPIView, UserDetailAPIView, StationPatrolListAPIView

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='login'),
    path('profile/', ProfileAPIView.as_view(), name='profile'),
    path('users/', UserManagementAPIView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', UserDetailAPIView.as_view(), name='user-detail'),
    path('station-patrols/', StationPatrolListAPIView.as_view(), name='station-patrols'),
]
