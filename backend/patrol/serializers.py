from rest_framework import serializers
from .models import PatrolAssignment, PatrolLocation
from intelligence.serializers import GeoJSONPointField

class PatrolLocationSerializer(serializers.ModelSerializer):
    location = GeoJSONPointField(read_only=True)

    class Meta:
        model = PatrolLocation
        fields = ('id', 'location', 'timestamp')

class PatrolAssignmentSerializer(serializers.ModelSerializer):
    officer_username = serializers.CharField(source='officer.username', read_only=True)

    class Meta:
        model = PatrolAssignment
        fields = ('id', 'officer', 'officer_username', 'zone_name', 'status', 'start_time', 'end_time')

class PatrolLocationInputSerializer(serializers.Serializer):
    lat = serializers.FloatField()
    lng = serializers.FloatField()
