from rest_framework import serializers

class DashboardSummarySerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    open_firs = serializers.IntegerField()
    pending_complaints = serializers.IntegerField()
    critical_incidents = serializers.IntegerField()
    risk_zones = serializers.IntegerField()
