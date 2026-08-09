from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .serializers import DashboardSummarySerializer
from .services import DashboardService

class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: DashboardSummarySerializer})
    def get(self, request):
        summary = DashboardService.get_summary()
        serializer = DashboardSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_200_OK)
