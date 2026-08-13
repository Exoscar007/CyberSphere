from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import FIRSerializer, ComplaintSerializer, IncidentSerializer, EvidenceSerializer, IncidentSerializerUpdate
from .services import CrimeService

class FIRListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: FIRSerializer(many=True)})
    def get(self, request):
        firs = CrimeService.get_firs(request.user)
        serializer = FIRSerializer(firs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=FIRSerializer, responses={201: FIRSerializer})
    def post(self, request):
        serializer = FIRSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        # Create directly via service instead of serializer.save() to pass user if needed, 
        # or we just assume the service is called inside the serializer.
        # Actually the current code uses serializer.save() which handles creation.
        # Wait, if we want to use the service for creation, we shouldn't use serializer.save().
        # Let's fix this to use the service as per architecture.
        result = CrimeService.create_fir(request.user, serializer.validated_data)
        return Response(FIRSerializer(result).data, status=status.HTTP_201_CREATED)


class ComplaintListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: ComplaintSerializer(many=True)})
    def get(self, request):
        complaints = CrimeService.get_complaints(request.user)
        serializer = ComplaintSerializer(complaints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=ComplaintSerializer, responses={201: ComplaintSerializer})
    def post(self, request):
        serializer = ComplaintSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = CrimeService.create_complaint(request.user, serializer.validated_data)
        return Response(ComplaintSerializer(result).data, status=status.HTTP_201_CREATED)


class IncidentListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: IncidentSerializer(many=True)})
    def get(self, request):
        from dashboard.services import DashboardService
        incidents = CrimeService.get_incidents(request.user)
        incidents = DashboardService._apply_filters(
            incidents, 'incident', 
            time_filter=request.query_params.get('time_filter'),
            severity=request.query_params.get('severity'),
            status=request.query_params.get('status'),
            station_id=request.query_params.get('station_id')
        )
        serializer = IncidentSerializer(incidents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=IncidentSerializer, responses={201: IncidentSerializer})
    def post(self, request):
        serializer = IncidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = CrimeService.create_incident(request.user, serializer.validated_data)
        return Response(IncidentSerializer(result).data, status=status.HTTP_201_CREATED)


class IncidentRetrieveUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: IncidentSerializer})
    def get(self, request, pk):
        try:
            incident = CrimeService.get_incidents(request.user).get(pk=pk)
            return Response(IncidentSerializer(incident).data, status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Incident not found'}, status=status.HTTP_404_NOT_FOUND)

    @swagger_auto_schema(request_body=IncidentSerializerUpdate, responses={200: IncidentSerializer})
    def patch(self, request, pk):
        try:
            incident = CrimeService.get_incidents(request.user).get(pk=pk)
        except Exception:
            return Response({'error': 'Incident not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = IncidentSerializerUpdate(incident, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
            return Response(IncidentSerializer(incident).data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)



class EvidenceUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @swagger_auto_schema(responses={200: EvidenceSerializer(many=True)})
    def get(self, request):
        assignment_id = request.query_params.get('assignment_id')
        incident_id = request.query_params.get('incident_id')
        fir_id = request.query_params.get('fir_id')
        evidence = CrimeService.get_evidence(request.user, assignment_id=assignment_id, incident_id=incident_id, fir_id=fir_id)
        serializer = EvidenceSerializer(evidence, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = EvidenceSerializer(data=request.data)
        if serializer.is_valid():
            try:
                evidence = CrimeService.upload_evidence(request.user, serializer.validated_data)
                return Response(EvidenceSerializer(evidence).data, status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from django.http import FileResponse
import mimetypes

class EvidenceDownloadAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        try:
            evidence = CrimeService.get_evidence(request.user).get(pk=pk)
            content_type, _ = mimetypes.guess_type(evidence.file.name)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Using evidence.file.open reads the underlying Django File object
            return FileResponse(evidence.file.open('rb'), content_type=content_type)
        except Exception as e:
            return Response({'error': 'Evidence not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

