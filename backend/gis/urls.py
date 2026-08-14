from django.urls import path
from .views import NearbyIncidentsAPIView, HeatmapAPIView, RecommendPatrolAPIView, StationWorkloadAPIView

urlpatterns = [
    path('nearby/', NearbyIncidentsAPIView.as_view(), name='nearby-incidents'),
    path('heatmap/', HeatmapAPIView.as_view(), name='risk-heatmap'),
    path('recommend-patrol/', RecommendPatrolAPIView.as_view(), name='recommend-patrol'),
    path('station-workload/', StationWorkloadAPIView.as_view(), name='station-workload'),
]
