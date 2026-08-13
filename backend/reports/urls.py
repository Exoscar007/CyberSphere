from django.urls import path
from .views import SystemHealthAPIView, CrimeSummaryReportAPIView, OperationalHistoryAPIView

urlpatterns = [
    path('health/', SystemHealthAPIView.as_view(), name='system-health'),
    path('crime-summary/', CrimeSummaryReportAPIView.as_view(), name='crime-summary'),
    path('operational-history/', OperationalHistoryAPIView.as_view(), name='operational-history'),
]
