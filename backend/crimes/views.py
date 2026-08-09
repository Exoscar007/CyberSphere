from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import FIRSerializer, ComplaintSerializer, IncidentSerializer, EvidenceSerializer
from .services import CrimeService

class FIRListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: FIRSerializer(many=True)})
    def get(self, request):
        firs = CrimeService.get_firs()
        serializer = FIRSerializer(firs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=FIRSerializer, responses={201: FIRSerializer})
    def post(self, request):
        serializer = FIRSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(FIRSerializer(result).data, status=status.HTTP_201_CREATED)


class ComplaintListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: ComplaintSerializer(many=True)})
    def get(self, request):
        complaints = CrimeService.get_complaints()
        serializer = ComplaintSerializer(complaints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=ComplaintSerializer, responses={201: ComplaintSerializer})
    def post(self, request):
        serializer = ComplaintSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(ComplaintSerializer(result).data, status=status.HTTP_201_CREATED)


class IncidentListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(responses={200: IncidentSerializer(many=True)})
    def get(self, request):
        incidents = CrimeService.get_incidents()
        serializer = IncidentSerializer(incidents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=IncidentSerializer, responses={201: IncidentSerializer})
    def post(self, request):
        serializer = IncidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(IncidentSerializer(result).data, status=status.HTTP_201_CREATED)


class EvidenceUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @swagger_auto_schema(responses={200: EvidenceSerializer(many=True)})
    def get(self, request, fir_id):
        evidence = CrimeService.get_evidence(fir_id)
        serializer = EvidenceSerializer(evidence, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, fir_id):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        evidence = CrimeService.upload_evidence(fir_id, file, request.user)
        if not evidence:
            return Response({'error': 'FIR not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(EvidenceSerializer(evidence).data, status=status.HTTP_201_CREATED)
