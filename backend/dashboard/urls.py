from django.urls import path
from .views import DashboardSummaryAPIView, StationWorkloadAPIView, IncidentDistributionAPIView, DashboardTrendsAPIView

urlpatterns = [
    path('summary/', DashboardSummaryAPIView.as_view(), name='dashboard-summary'),
    path('workload/', StationWorkloadAPIView.as_view(), name='dashboard-workload'),
    path('distribution/', IncidentDistributionAPIView.as_view(), name='dashboard-distribution'),
    path('trends/', DashboardTrendsAPIView.as_view(), name='dashboard-trends'),
]
