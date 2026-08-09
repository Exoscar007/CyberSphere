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
