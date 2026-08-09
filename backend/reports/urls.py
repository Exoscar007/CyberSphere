from django.urls import path
from .views import SystemHealthAPIView, CrimeSummaryReportAPIView

urlpatterns = [
    path('health/', SystemHealthAPIView.as_view(), name='system-health'),
    path('crime-summary/', CrimeSummaryReportAPIView.as_view(), name='crime-summary'),
]
