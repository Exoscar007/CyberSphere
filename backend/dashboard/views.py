from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .serializers import DashboardSummarySerializer, StationWorkloadSerializer, IncidentDistributionSerializer
from .services import DashboardService

class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        time_filter = request.query_params.get('time_filter')
        severity = request.query_params.get('severity')
        status_filter = request.query_params.get('status')
        station_id = request.query_params.get('station_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        summary = DashboardService.get_summary(request.user, time_filter, severity, status_filter, station_id, start_date, end_date)
        if not summary:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        return Response(summary, status=status.HTTP_200_OK)

class StationWorkloadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'STATION']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        time_filter = request.query_params.get('time_filter')
        severity = request.query_params.get('severity')
        status_filter = request.query_params.get('status')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        workload = DashboardService.get_workload(request.user, time_filter, start_date, end_date, severity, status_filter)
        return Response(workload, status=status.HTTP_200_OK)

class IncidentDistributionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'STATION']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        time_filter = request.query_params.get('time_filter')
        severity = request.query_params.get('severity')
        status_filter = request.query_params.get('status')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        station_id = request.query_params.get('station_id')
        distribution = DashboardService.get_distribution(request.user, time_filter, station_id, severity, status_filter, start_date, end_date)
        return Response(distribution, status=status.HTTP_200_OK)

class DashboardTrendsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'STATION']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        time_filter = request.query_params.get('time_filter')
        severity = request.query_params.get('severity')
        status_filter = request.query_params.get('status')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        station_id = request.query_params.get('station_id')
        trends = DashboardService.get_trends(request.user, station_id, time_filter, severity, status_filter, start_date, end_date)
        return Response(trends, status=status.HTTP_200_OK)
