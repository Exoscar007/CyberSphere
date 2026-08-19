from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import PredictionJobSerializer
from .services import AIPredictionService
from intelligence.serializers import RiskScoreSerializer
from intelligence.models import RiskScore
from users.permissions import IsAdminRole


class TriggerPredictionAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    @swagger_auto_schema(responses={202: PredictionJobSerializer})
    def post(self, request):
        job = AIPredictionService.trigger_prediction()
        serializer = PredictionJobSerializer(job)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)



class PredictionJobStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: PredictionJobSerializer})
    def get(self, request, pk):
        job = AIPredictionService.get_job_status(pk)
        if not job:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PredictionJobSerializer(job)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ModelStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: "AI/ML Model Status & Metadata"})
    def get(self, request):
        status_info = AIPredictionService.get_model_status()
        return Response(status_info, status=status.HTTP_200_OK)


class TrainModelAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    @swagger_auto_schema(responses={200: "Model Training Result"})
    def post(self, request):
        result = AIPredictionService.train_model()
        if result.get('success'):
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class PredictiveZonesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('risk_level', openapi.IN_QUERY, description="Filter by risk level (LOW, MEDIUM, HIGH, CRITICAL)", type=openapi.TYPE_STRING),
            openapi.Parameter('min_score', openapi.IN_QUERY, description="Minimum risk score (0-100)", type=openapi.TYPE_NUMBER),
        ],
        responses={200: RiskScoreSerializer(many=True)}
    )
    def get(self, request):
        qs = RiskScore.objects.all().order_by('-score')
        risk_level = request.query_params.get('risk_level')
        min_score = request.query_params.get('min_score')

        if risk_level:
            qs = qs.filter(risk_level=risk_level.upper())
        if min_score:
            try:
                qs = qs.filter(score__gte=float(min_score))
            except ValueError:
                pass

        serializer = RiskScoreSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ForecastAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: 'Forecast data'})
    def get(self, request):
        from .services import TemporalForecastingService
        result = TemporalForecastingService.generate_forecast()
        return Response(result, status=status.HTTP_200_OK)
