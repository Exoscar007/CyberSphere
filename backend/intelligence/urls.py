from django.urls import path
from .views import (
    CrimeTrendListAPIView,
    RiskScoreListAPIView,
    TemporalStatsAPIView,
    IntelligenceSummaryAPIView,
    CybercrimeSummaryAPIView,
    CybercrimeHotspotsAPIView,
    CybercrimeCorrelationsAPIView,
    CybercrimeAlertsAPIView,
    AuditLogListAPIView,
    AuditSummaryAPIView,
)

urlpatterns = [
    path('summary/', IntelligenceSummaryAPIView.as_view(), name='intelligence-summary'),
    path('trends/', CrimeTrendListAPIView.as_view(), name='crime-trends-list'),
    path('risk-scores/', RiskScoreListAPIView.as_view(), name='risk-scores-list'),
    path('temporal-stats/', TemporalStatsAPIView.as_view(), name='temporal-stats'),
    
    # Operational Audit Log Endpoints
    path('audit-logs/', AuditLogListAPIView.as_view(), name='audit-logs-list'),
    path('audit-summary/', AuditSummaryAPIView.as_view(), name='audit-summary'),

    # Cybercrime Intelligence Layer Endpoints
    path('cybercrime/', CybercrimeSummaryAPIView.as_view(), name='cybercrime-overview'),
    path('cybercrime/summary/', CybercrimeSummaryAPIView.as_view(), name='cybercrime-summary'),
    path('cybercrime/hotspots/', CybercrimeHotspotsAPIView.as_view(), name='cybercrime-hotspots'),
    path('cybercrime/correlations/', CybercrimeCorrelationsAPIView.as_view(), name='cybercrime-correlations'),
    path('cybercrime/alerts/', CybercrimeAlertsAPIView.as_view(), name='cybercrime-alerts'),
]

