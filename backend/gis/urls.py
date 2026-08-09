from django.urls import path
from .views import NearbyIncidentsAPIView, HeatmapAPIView

urlpatterns = [
    path('nearby/', NearbyIncidentsAPIView.as_view(), name='nearby-incidents'),
    path('heatmap/', HeatmapAPIView.as_view(), name='risk-heatmap'),
]
