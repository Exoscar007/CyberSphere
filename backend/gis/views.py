from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from crimes.serializers import IncidentSerializer
from intelligence.serializers import RiskScoreSerializer
from .services import GISService

class NearbyIncidentsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    lat_param = openapi.Parameter('lat', openapi.IN_QUERY, description="Latitude", type=openapi.TYPE_NUMBER, required=True)
    lng_param = openapi.Parameter('lng', openapi.IN_QUERY, description="Longitude", type=openapi.TYPE_NUMBER, required=True)
    radius_param = openapi.Parameter('radius', openapi.IN_QUERY, description="Radius in km", type=openapi.TYPE_NUMBER)

    @swagger_auto_schema(manual_parameters=[lat_param, lng_param, radius_param], responses={200: IncidentSerializer(many=True)})
    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 5.0)

        if not lat or not lng:
            return Response({"error": "Latitude and Longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        incidents = GISService.get_nearby_incidents(lat, lng, radius)
        serializer = IncidentSerializer(incidents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class HeatmapAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: RiskScoreSerializer(many=True)})
    def get(self, request):
        scores = GISService.get_risk_heatmap()
        serializer = RiskScoreSerializer(scores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
