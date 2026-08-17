from rest_framework import serializers
from .models import FIR, Complaint, Incident, Evidence
from .services import CrimeService

class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ['id', 'fir', 'incident', 'assignment', 'file', 'uploaded_at', 'uploaded_by']
        read_only_fields = ['uploaded_at', 'uploaded_by']

class GeoJSONPointField(serializers.Field):
    def to_representation(self, value):
        if value:
            return {
                "type": "Point",
                "coordinates": [value.x, value.y]
            }
        return None

    def to_internal_value(self, data):
        from django.contrib.gis.geos import Point
        if isinstance(data, dict) and data.get('type') == 'Point' and 'coordinates' in data:
            coords = data['coordinates']
            return Point(float(coords[0]), float(coords[1]), srid=4326)
        raise serializers.ValidationError("Invalid GeoJSON Point format")

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

from patrol.serializers import PatrolAssignmentSerializer

class IncidentSerializer(serializers.ModelSerializer):
    location = GeoJSONPointField(read_only=True)
    location_input = serializers.DictField(write_only=True, required=True, source='location')
    patrol_assignments = PatrolAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = ('id', 'title', 'description', 'location', 'location_input', 'date_occurred', 'severity', 'status', 'patrol_assignments')

    def create(self, validated_data):
        return CrimeService.create_incident(validated_data)

class DashboardIncidentSerializer(serializers.ModelSerializer):
    location = GeoJSONPointField(read_only=True)
    patrol_assignments_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Incident
        fields = ('id', 'title', 'description', 'location', 'date_occurred', 'severity', 'status', 'patrol_assignments_count')


class IncidentSerializerUpdate(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = ('status',)

    def update(self, instance, validated_data):
        return CrimeService.update_incident_status(self.context['request'].user, instance, validated_data.get('status'))
