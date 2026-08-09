from rest_framework import serializers
from .models import FIR, Complaint, Incident, Evidence
from .services import CrimeService

class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ['id', 'fir', 'file', 'uploaded_at', 'uploaded_by']
        read_only_fields = ['uploaded_at', 'uploaded_by']

class GeoJSONPointField(serializers.Field):
    def to_representation(self, value):
        if value:
            return {
                "type": "Point",
                "coordinates": [value.x, value.y]
            }
        return None

class FIRSerializer(serializers.ModelSerializer):
    location = GeoJSONPointField(read_only=True)
    location_input = serializers.DictField(write_only=True, required=True, source='location')

    class Meta:
        model = FIR
        fields = ('id', 'fir_number', 'description', 'reported_by', 'date_reported', 'location', 'location_input', 'status')
        read_only_fields = ('reported_by', 'status')

    def create(self, validated_data):
        user = self.context['request'].user
        return CrimeService.create_fir(user, validated_data)

class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = '__all__'

    def create(self, validated_data):
        return CrimeService.create_complaint(validated_data)

class IncidentSerializer(serializers.ModelSerializer):
    location = GeoJSONPointField(read_only=True)
    location_input = serializers.DictField(write_only=True, required=True, source='location')

    class Meta:
        model = Incident
        fields = ('id', 'title', 'description', 'location', 'location_input', 'date_occurred', 'severity')

    def create(self, validated_data):
        return CrimeService.create_incident(validated_data)
