from rest_framework import serializers

class DashboardSummarySerializer(serializers.Serializer):
    total_incidents = serializers.IntegerField()
    open_incidents = serializers.IntegerField()
    critical_incidents = serializers.IntegerField()
    active_assignments = serializers.IntegerField()
    available_patrols = serializers.IntegerField()
    busy_patrols = serializers.IntegerField()
    completed_assignments = serializers.IntegerField()
    evidence_collected = serializers.IntegerField()

class StationWorkloadSerializer(serializers.Serializer):
    station_id = serializers.IntegerField()
    station_name = serializers.CharField()
    open_incidents = serializers.IntegerField()
    incidents_with_active_patrol = serializers.IntegerField()
    unassigned_open_incidents = serializers.IntegerField()
    active_assignments = serializers.IntegerField()
    available_patrol_officers = serializers.IntegerField()
    busy_patrol_officers = serializers.IntegerField()
    completed_assignments = serializers.IntegerField()

class IncidentDistributionSerializer(serializers.Serializer):
    severity = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()
