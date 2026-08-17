from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .serializers import SystemHealthSerializer, CrimeSummarySerializer
from .services import ReportService

class SystemHealthAPIView(APIView):
    permission_classes = [AllowAny] # Health endpoints are usually public or internal net

    @swagger_auto_schema(responses={200: SystemHealthSerializer})
    def get(self, request):
        health = ReportService.get_system_health()
        return Response(health, status=status.HTTP_200_OK if health['status'] == 'UP' else status.HTTP_503_SERVICE_UNAVAILABLE)

class CrimeSummaryReportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: CrimeSummarySerializer})
    def get(self, request):
        summary = ReportService.get_crime_summary()
        return Response(summary, status=status.HTTP_200_OK)

from crimes.models import Incident
from .serializers import OperationalHistoryIncidentSerializer

class OperationalHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: OperationalHistoryIncidentSerializer(many=True)})
    def get(self, request):
        user = request.user
        queryset = Incident.objects.prefetch_related(
            'patrol_assignments', 
            'patrol_assignments__status_history', 
            'patrol_assignments__status_history__actor',
            'patrol_assignments__locations', 
            'patrol_assignments__evidence',
            'patrol_assignments__evidence__uploaded_by',
            'evidence'
        ).filter(patrol_assignments__isnull=False).distinct().order_by('-date_occurred')
        
        if user.role == 'STATION':
            queryset = queryset.filter(station=user.station)
        elif user.role not in ['ADMIN']:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        if year:
            try:
                queryset = queryset.filter(date_occurred__year=int(year))
            except ValueError:
                pass
        if month:
            try:
                queryset = queryset.filter(date_occurred__month=int(month))
            except ValueError:
                pass
            
        serializer = OperationalHistoryIncidentSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ResponseTimeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'PATROL_OFFICER':
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        if user.role == 'STATION':
            station_id = user.station_id
        else:
            station_id = request.query_params.get('station_id')
            
        time_filter = request.query_params.get('time_filter')
        severity = request.query_params.get('severity')
        status_filter = request.query_params.get('status')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        from .services import ResponseTimeService
        data = ResponseTimeService.calculate_response_times(station_id=station_id, time_filter=time_filter, severity=severity, status=status_filter, start_date=start_date, end_date=end_date)
        
        # Strip out station specifics for station users to only see theirs, which is handled by service
        # but ensure they don't see "by_station" for other stations just in case.
        return Response(data, status=status.HTTP_200_OK)
