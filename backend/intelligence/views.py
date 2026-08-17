from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .serializers import CrimeTrendSerializer, RiskScoreSerializer
from .services import IntelligenceService

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
        scores = IntelligenceService.get_risk_scores()
        serializer = RiskScoreSerializer(scores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class TemporalStatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: 'Temporal statistics'})
    def get(self, request):
        station_id = request.query_params.get('station_id')
        from .services import TemporalAnalyticsService
        stats = TemporalAnalyticsService.get_temporal_stats(station_id)
        return Response(stats, status=status.HTTP_200_OK)
