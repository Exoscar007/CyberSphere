from django.urls import path
from .views import SystemHealthAPIView, CrimeSummaryReportAPIView, OperationalHistoryAPIView, ResponseTimeAPIView

urlpatterns = [
    path('health/', SystemHealthAPIView.as_view(), name='system-health'),
    path('crime-summary/', CrimeSummaryReportAPIView.as_view(), name='crime-summary'),
    path('operational-history/', OperationalHistoryAPIView.as_view(), name='operational-history'),
    path('response-times/', ResponseTimeAPIView.as_view(), name='response-times'),
]
