from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from .serializers import PatrolAssignmentSerializer, PatrolLocationInputSerializer, PatrolLocationSerializer
from .services import PatrolService

class PatrolAssignmentListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: PatrolAssignmentSerializer(many=True)})
    def get(self, request):
        assignments = PatrolService.get_active_patrols()
        serializer = PatrolAssignmentSerializer(assignments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=PatrolAssignmentSerializer, responses={201: PatrolAssignmentSerializer})
    def post(self, request):
        serializer = PatrolAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            assignment = PatrolService.assign_patrol(
                officer=serializer.validated_data['officer'],
                zone_name=serializer.validated_data['zone_name']
            )
            return Response(PatrolAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PatrolLocationPingAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(request_body=PatrolLocationInputSerializer, responses={201: PatrolLocationSerializer})
    def post(self, request, pk):
        serializer = PatrolLocationInputSerializer(data=request.data)
        if serializer.is_valid():
            try:
                ping = PatrolService.log_ping(
                    assignment_id=pk,
                    lat=serializer.validated_data['lat'],
                    lng=serializer.validated_data['lng']
                )
                return Response(PatrolLocationSerializer(ping).data, status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
