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
