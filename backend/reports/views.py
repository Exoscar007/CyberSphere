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
            
        serializer = OperationalHistoryIncidentSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ResponseTimeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'PATROL_OFFICER':
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        station_id = user.station_id if user.role == 'STATION' else None
        
        from .services import ResponseTimeService
        data = ResponseTimeService.calculate_response_times(station_id=station_id)
        
        # Strip out station specifics for station users to only see theirs, which is handled by service
        # but ensure they don't see "by_station" for other stations just in case.
        return Response(data, status=status.HTTP_200_OK)
