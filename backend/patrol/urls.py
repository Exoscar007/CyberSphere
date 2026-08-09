from django.urls import path
from .views import PatrolAssignmentListCreateAPIView, PatrolLocationPingAPIView

urlpatterns = [
    path('assignments/', PatrolAssignmentListCreateAPIView.as_view(), name='patrol-assignments'),
    path('assignments/<int:pk>/ping/', PatrolLocationPingAPIView.as_view(), name='patrol-ping'),
]
