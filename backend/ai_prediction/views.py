from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .serializers import PredictionJobSerializer
from .services import AIPredictionService

class TriggerPredictionAPIView(APIView):
    permission_classes = [IsAuthenticated]

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
