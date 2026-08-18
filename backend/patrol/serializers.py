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
    station_name = serializers.CharField(source='station.name', read_only=True)
    destination = GeoJSONPointField(required=True)
    incident_details = serializers.SerializerMethodField()
    fir_details = serializers.SerializerMethodField()
    latest_location = serializers.SerializerMethodField()

    class Meta:
        model = PatrolAssignment
        fields = ('id', 'officer', 'officer_username', 'station', 'station_name', 'zone_name', 'status', 'priority', 'destination', 'instructions', 'start_time', 'end_time', 'fir', 'fir_details', 'incident', 'incident_details', 'latest_location')
        extra_kwargs = {
            'incident': {'required': True, 'allow_null': False},
            'officer': {'required': True, 'allow_null': False},
        }

    def get_incident_details(self, obj):
        if obj.incident:
            return {
                'id': obj.incident.id,
                'title': obj.incident.title,
                'description': obj.incident.description,
                'severity': obj.incident.severity,
                'status': obj.incident.status,
            }
        return None

    def get_fir_details(self, obj):
        if obj.fir:
            return {
                'id': obj.fir.id,
                'fir_number': obj.fir.fir_number,
                'description': obj.fir.description,
            }
        return None

    def get_latest_location(self, obj):
        if hasattr(obj, 'prefetched_latest_locations'):
            locations = obj.prefetched_latest_locations
            if locations:
                return PatrolLocationSerializer(locations[0]).data
        else:
            latest = obj.locations.order_by('-timestamp').first()
            if latest:
                return PatrolLocationSerializer(latest).data
        return None

class PatrolAssignmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatrolAssignment
        fields = ('status',)

class PatrolLocationInputSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90.0, max_value=90.0)
    lng = serializers.FloatField(min_value=-180.0, max_value=180.0)

