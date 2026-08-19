from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .serializers import (
    CrimeTrendSerializer,
    RiskScoreSerializer,
    IntelligenceSummarySerializer,
    CybercrimeSummarySerializer,
    CybercrimeHotspotSerializer,
    CybercrimeCorrelationSerializer,
    CybercrimeAlertSerializer,
)
from .services import IntelligenceService
from .cybercrime import CybercrimeIntelligenceService

class CrimeTrendListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: CrimeTrendSerializer(many=True)})
    def get(self, request):
        trends = IntelligenceService.get_trends()
        serializer = CrimeTrendSerializer(trends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RiskScoreListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: RiskScoreSerializer(many=True)})
    def get(self, request):
        scores = IntelligenceService.get_risk_scores(user=request.user)
        serializer = RiskScoreSerializer(scores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class IntelligenceSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get database-backed intelligence summary, prioritized risk zones, tactical recommendations, and contributing factors with station isolation.",
        manual_parameters=[
            openapi.Parameter('station_id', openapi.IN_QUERY, description="Filter intelligence by Police Station ID (Admin only)", type=openapi.TYPE_INTEGER),
            openapi.Parameter('min_score', openapi.IN_QUERY, description="Minimum risk score threshold (0-100)", type=openapi.TYPE_NUMBER),
            openapi.Parameter('risk_level', openapi.IN_QUERY, description="Filter by risk level (CRITICAL, HIGH, MEDIUM, LOW)", type=openapi.TYPE_STRING),
        ],
        responses={200: IntelligenceSummarySerializer}
    )
    def get(self, request):
        params = {
            'station_id': request.query_params.get('station_id'),
            'min_score': request.query_params.get('min_score'),
            'risk_level': request.query_params.get('risk_level'),
        }
        summary_data = IntelligenceService.get_intelligence_summary(request.user, params)
        serializer = IntelligenceSummarySerializer(summary_data)
        return Response(serializer.data, status=status.HTTP_200_OK)

class TemporalStatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: 'Temporal statistics'})
    def get(self, request):
        station_id = request.query_params.get('station_id')
        from .services import TemporalAnalyticsService
        stats = TemporalAnalyticsService.get_temporal_stats(station_id)
        return Response(stats, status=status.HTTP_200_OK)


# =========================================================================
# CYBERCRIME INTELLIGENCE API VIEWS
# =========================================================================

class CybercrimeSummaryAPIView(APIView):
    """
    GET /api/intelligence/cybercrime/summary/
    Returns citywide or station-isolated cybercrime intelligence overview,
    category breakdown, top hotspots, emerging threats, and contextual AI risk data.
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get database-backed cybercrime intelligence summary and KPIs with RBAC and station boundary enforcement.",
        responses={200: CybercrimeSummarySerializer}
    )
    def get(self, request):
        summary_data = CybercrimeIntelligenceService.get_summary(request.user, request.query_params)
        serializer = CybercrimeSummarySerializer(summary_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CybercrimeHotspotsAPIView(APIView):
    """
    GET /api/intelligence/cybercrime/hotspots/
    Returns geographic cybercrime clusters, fraud & phishing hotspots, threat levels,
    and contextual AI risk indicators.
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get geographic cybercrime hotspots and digital fraud clusters from live PostGIS database.",
        responses={200: CybercrimeHotspotSerializer(many=True)}
    )
    def get(self, request):
        hotspots_data = CybercrimeIntelligenceService.get_hotspots(request.user, request.query_params)
        serializer = CybercrimeHotspotSerializer(hotspots_data.get('hotspots', []), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CybercrimeCorrelationsAPIView(APIView):
    """
    GET /api/intelligence/cybercrime/correlations/
    Returns physical crime vs cybercrime correlation analysis by sector.
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get physical vs cybercrime correlation analysis and status classifications by sector.",
        responses={200: CybercrimeCorrelationSerializer(many=True)}
    )
    def get(self, request):
        corr_data = CybercrimeIntelligenceService.get_correlations(request.user, request.query_params)
        serializer = CybercrimeCorrelationSerializer(corr_data.get('correlations', []), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CybercrimeAlertsAPIView(APIView):
    """
    GET /api/intelligence/cybercrime/alerts/
    Returns explainable emerging cyber threat alerts based on temporal surges and pattern clusters.
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get emerging cyber threat alerts detected from database temporal shifts.",
        responses={200: CybercrimeAlertSerializer(many=True)}
    )
    def get(self, request):
        alerts_data = CybercrimeIntelligenceService.get_alerts(request.user, request.query_params)
        serializer = CybercrimeAlertSerializer(alerts_data.get('alerts', []), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# =========================================================================
# OPERATIONAL AUDIT LOG API VIEWS
# =========================================================================

from rest_framework.pagination import PageNumberPagination
from .audit_service import AuditLogService
from .serializers import AuditLogSerializer

class AuditLogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })


class AuditLogListAPIView(APIView):
    """
    GET /api/intelligence/audit-logs/
    Returns chronological operational audit trail with station-isolated RBAC,
    multidimensional category/date/resource filters, search, and pagination.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = AuditLogPagination

    @swagger_auto_schema(
        operation_description="Get chronological operational audit trail with RBAC station isolation.",
        manual_parameters=[
            openapi.Parameter('category', openapi.IN_QUERY, description="Filter by event category (AUTH, FIR, INCIDENT, COMPLAINT, PATROL, USER, INTELLIGENCE, SYSTEM)", type=openapi.TYPE_STRING),
            openapi.Parameter('event_type', openapi.IN_QUERY, description="Filter by specific event type", type=openapi.TYPE_STRING),
            openapi.Parameter('resource_type', openapi.IN_QUERY, description="Filter by affected resource type (e.g. FIR, Incident, PatrolAssignment)", type=openapi.TYPE_STRING),
            openapi.Parameter('resource_id', openapi.IN_QUERY, description="Filter by resource ID", type=openapi.TYPE_STRING),
            openapi.Parameter('station_id', openapi.IN_QUERY, description="Filter by station ID (Admin only)", type=openapi.TYPE_INTEGER),
            openapi.Parameter('actor_id', openapi.IN_QUERY, description="Filter by actor user ID", type=openapi.TYPE_INTEGER),
            openapi.Parameter('start_date', openapi.IN_QUERY, description="Start date/time (ISO or YYYY-MM-DD)", type=openapi.TYPE_STRING),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="End date/time (ISO or YYYY-MM-DD)", type=openapi.TYPE_STRING),
            openapi.Parameter('status', openapi.IN_QUERY, description="Filter by status (SUCCESS, FAILED, WARNING)", type=openapi.TYPE_STRING),
            openapi.Parameter('search', openapi.IN_QUERY, description="Search description, action, resource ID, or actor", type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, description="Page number", type=openapi.TYPE_INTEGER),
            openapi.Parameter('page_size', openapi.IN_QUERY, description="Number of results per page (max 100)", type=openapi.TYPE_INTEGER),
        ],
        responses={200: AuditLogSerializer(many=True)}
    )
    def get(self, request):
        queryset = AuditLogService.get_audit_logs(request.user, request.query_params)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = AuditLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = AuditLogSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AuditSummaryAPIView(APIView):
    """
    GET /api/intelligence/audit-summary/
    Returns live database-backed metrics: total events, events today, last 24h,
    events by category, active operators, most active users, most common actions,
    and recent critical/security events.
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get database-backed audit metrics and KPI breakdowns with RBAC station isolation.",
        manual_parameters=[
            openapi.Parameter('station_id', openapi.IN_QUERY, description="Filter by station ID (Admin only)", type=openapi.TYPE_INTEGER),
            openapi.Parameter('start_date', openapi.IN_QUERY, description="Start date", type=openapi.TYPE_STRING),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="End date", type=openapi.TYPE_STRING),
        ],
        responses={200: 'Summary KPIs and breakdowns'}
    )
    def get(self, request):
        summary_data = AuditLogService.get_audit_summary(request.user, request.query_params)
        return Response(summary_data, status=status.HTTP_200_OK)

