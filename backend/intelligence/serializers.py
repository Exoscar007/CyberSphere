from rest_framework import serializers
from .models import CrimeTrend, RiskScore

class GeoJSONPointField(serializers.Field):
    def to_representation(self, value):
        if value:
            return {
                "type": "Point",
                "coordinates": [value.x, value.y]
            }
        return None

class CrimeTrendSerializer(serializers.ModelSerializer):
    location = GeoJSONPointField(read_only=True)

    class Meta:
        model = CrimeTrend
        fields = ('id', 'crime_type', 'location', 'date_recorded', 'frequency')

class RiskScoreSerializer(serializers.ModelSerializer):
    center = GeoJSONPointField(read_only=True)

    class Meta:
        model = RiskScore
        fields = ('id', 'zone_name', 'center', 'score', 'calculated_at')
