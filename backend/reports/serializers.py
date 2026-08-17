from rest_framework import serializers

class SystemHealthSerializer(serializers.Serializer):
    status = serializers.CharField()
    database = serializers.CharField()
    timestamp = serializers.DateTimeField()

class CrimeSummaryDataSerializer(serializers.Serializer):
    total_firs = serializers.IntegerField()
    firs_last_30_days = serializers.IntegerField()

class CrimeSummarySerializer(serializers.Serializer):
    report_type = serializers.CharField()
    generated_at = serializers.DateTimeField()
    data = CrimeSummaryDataSerializer()

from crimes.models import Incident, Evidence
from patrol.models import PatrolAssignment, PatrolLocation, PatrolStatusHistory
from intelligence.serializers import GeoJSONPointField

class EvidenceHistorySerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    
    class Meta:
        model = Evidence
        fields = ('id', 'file', 'uploaded_at', 'uploaded_by_username')

class PatrolLocationHistorySerializer(serializers.ModelSerializer):
    location = GeoJSONPointField(read_only=True)
    
    class Meta:
        model = PatrolLocation
        fields = ('location', 'timestamp')

class PatrolStatusHistorySerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    
    class Meta:
        model = PatrolStatusHistory
        fields = ('old_status', 'new_status', 'timestamp', 'actor_username')

class AssignmentHistorySerializer(serializers.ModelSerializer):
    officer_username = serializers.CharField(source='officer.username', read_only=True)
    destination = GeoJSONPointField(read_only=True)
    status_history = PatrolStatusHistorySerializer(many=True, read_only=True)
    locations = PatrolLocationHistorySerializer(many=True, read_only=True)
    evidence = EvidenceHistorySerializer(many=True, read_only=True)

    class Meta:
        model = PatrolAssignment
        fields = ('id', 'officer_username', 'zone_name', 'status', 'priority', 'destination', 'instructions', 'start_time', 'end_time', 'status_history', 'locations', 'evidence')

class OperationalHistoryIncidentSerializer(serializers.ModelSerializer):
    location = GeoJSONPointField(read_only=True)
    patrol_assignments = AssignmentHistorySerializer(many=True, read_only=True)
    evidence = EvidenceHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Incident
        fields = ('id', 'title', 'description', 'location', 'date_occurred', 'severity', 'status', 'patrol_assignments', 'evidence')
