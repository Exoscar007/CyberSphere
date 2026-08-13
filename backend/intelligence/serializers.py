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

    def to_internal_value(self, data):
        from django.contrib.gis.geos import Point
        if isinstance(data, dict) and data.get('type') == 'Point' and 'coordinates' in data:
            coords = data['coordinates']
            return Point(float(coords[0]), float(coords[1]), srid=4326)
        raise serializers.ValidationError("Invalid GeoJSON Point format")

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
