from django.urls import path
from .views import PatrolAssignmentListCreateAPIView, PatrolAssignmentRetrieveUpdateAPIView, PatrolLocationPingAPIView, PatrolLocationHistoryAPIView

urlpatterns = [
    path('assignments/', PatrolAssignmentListCreateAPIView.as_view(), name='patrol-assignments'),
    path('assignments/<int:pk>/', PatrolAssignmentRetrieveUpdateAPIView.as_view(), name='patrol-assignment-detail'),
    path('assignments/<int:pk>/ping/', PatrolLocationPingAPIView.as_view(), name='patrol-ping'),
    path('assignments/<int:pk>/locations/', PatrolLocationHistoryAPIView.as_view(), name='patrol-locations-history'),
]
