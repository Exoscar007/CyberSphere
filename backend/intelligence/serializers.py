from rest_framework import serializers
from .models import CrimeTrend, RiskScore

class GeoJSONPointField(serializers.Field):
    def to_representation(self, value):
        if value:
            if hasattr(value, 'x') and hasattr(value, 'y'):
                return {
                    "type": "Point",
                    "coordinates": [value.x, value.y]
                }
            elif isinstance(value, dict) and 'coordinates' in value:
                return value
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
        fields = (
            'id',
            'zone_name',
            'center',
            'score',
            'risk_level',
            'confidence',
            'model_status',
            'prediction_period',
            'factors',
            'feature_importance',
            'radius_meters',
            'calculated_at',
        )


class ZoneIntelligenceSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    zone_name = serializers.CharField()
    center = GeoJSONPointField(read_only=True)
    radius_meters = serializers.FloatField(default=800.0)
    score = serializers.FloatField()
    risk_level = serializers.CharField()
    confidence = serializers.FloatField(allow_null=True, required=False)
    model_status = serializers.CharField(required=False)
    prediction_period = serializers.CharField(required=False)
    recent_incidents_count = serializers.IntegerField(default=0)
    recent_firs_count = serializers.IntegerField(default=0)
    recent_complaints_count = serializers.IntegerField(default=0)
    dominant_crime = serializers.CharField(default='General Crime')
    dominant_crime_percentage = serializers.FloatField(default=0.0)
    active_patrols_count = serializers.IntegerField(default=0)
    patrol_officers = serializers.ListField(child=serializers.CharField(), default=list)
    trend = serializers.CharField(default='Insufficient historical data')
    trend_label = serializers.CharField(default='Insufficient historical data')
    contributing_factors = serializers.ListField(child=serializers.CharField(), default=list)
    recommendation = serializers.CharField()
    priority_action = serializers.CharField()
    last_updated = serializers.DateTimeField(required=False, allow_null=True)


class PriorityIntelligenceSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    zone_name = serializers.CharField()
    score = serializers.FloatField()
    risk_level = serializers.CharField()
    trend = serializers.CharField()
    dominant_crime = serializers.CharField()
    active_patrols = serializers.IntegerField()
    recommendation = serializers.CharField()
    priority_action = serializers.CharField()
    center = GeoJSONPointField(read_only=True)


class IntelligenceOverviewSerializer(serializers.Serializer):
    total_monitored_zones = serializers.IntegerField()
    critical_zones = serializers.IntegerField()
    high_risk_zones = serializers.IntegerField()
    medium_risk_zones = serializers.IntegerField()
    low_risk_zones = serializers.IntegerField()
    active_patrol_coverage = serializers.IntegerField()
    total_recent_incidents = serializers.IntegerField()
    total_recent_firs = serializers.IntegerField()
    dominant_city_threat = serializers.CharField()


class IntelligenceSummarySerializer(serializers.Serializer):
    overview = IntelligenceOverviewSerializer()
    priority_queue = PriorityIntelligenceSerializer(many=True)
    zones = ZoneIntelligenceSerializer(many=True)
    timestamp = serializers.DateTimeField()
    user_scope = serializers.CharField()


# =========================================================================
# CYBERCRIME INTELLIGENCE SERIALIZERS
# =========================================================================

class CybercrimeCategoryBreakdownSerializer(serializers.Serializer):
    financial_fraud = serializers.IntegerField(default=0)
    phishing = serializers.IntegerField(default=0)
    identity_theft = serializers.IntegerField(default=0)
    cyber_fraud = serializers.IntegerField(default=0)
    online_scam = serializers.IntegerField(default=0)
    other_cyber = serializers.IntegerField(default=0)


class CybercrimeOverviewSerializer(serializers.Serializer):
    total_cybercrime = serializers.IntegerField()
    total_physical_crime = serializers.IntegerField()
    total_crime = serializers.IntegerField()
    cybercrime_percentage = serializers.FloatField()
    category_breakdown = CybercrimeCategoryBreakdownSerializer()
    active_cyber_hotspots = serializers.IntegerField()
    emerging_threats_count = serializers.IntegerField()


class ContextualAIRiskSerializer(serializers.Serializer):
    ai_risk_score = serializers.FloatField(required=False, allow_null=True)
    ai_risk_level = serializers.CharField(required=False, allow_null=True)
    ai_model_status = serializers.CharField(required=False, allow_null=True)


class CybercrimeHotspotSerializer(serializers.Serializer):
    zone_name = serializers.CharField()
    station_name = serializers.CharField()
    station_code = serializers.CharField()
    station_id = serializers.IntegerField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    center = GeoJSONPointField(read_only=True)
    cybercrime_count = serializers.IntegerField()
    physical_crime_count = serializers.IntegerField()
    total_crime_count = serializers.IntegerField()
    cybercrime_ratio = serializers.FloatField()
    dominant_type = serializers.CharField()
    fraud_count = serializers.IntegerField(default=0)
    phishing_count = serializers.IntegerField(default=0)
    identity_count = serializers.IntegerField(default=0)
    scam_count = serializers.IntegerField(default=0)
    trend = serializers.CharField()
    trend_label = serializers.CharField()
    threat_level = serializers.CharField()
    recent_activity = serializers.CharField(allow_null=True, required=False)
    explanation = serializers.CharField()
    ai_context = ContextualAIRiskSerializer(required=False, allow_null=True)


class CybercrimeCorrelationSerializer(serializers.Serializer):
    zone = serializers.CharField()
    station_name = serializers.CharField()
    station_code = serializers.CharField()
    center = GeoJSONPointField(read_only=True)
    physical_crimes = serializers.IntegerField()
    cybercrimes = serializers.IntegerField()
    total_crimes = serializers.IntegerField()
    cybercrime_ratio = serializers.FloatField()
    physical_trend = serializers.CharField()
    physical_trend_label = serializers.CharField()
    cyber_trend = serializers.CharField()
    cyber_trend_label = serializers.CharField()
    correlation_status = serializers.CharField()
    explanation = serializers.CharField()


class CybercrimeAlertSerializer(serializers.Serializer):
    id = serializers.CharField()
    zone = serializers.CharField()
    station_name = serializers.CharField()
    station_code = serializers.CharField()
    threat_type = serializers.CharField()
    title = serializers.CharField()
    current_count = serializers.IntegerField()
    previous_count = serializers.IntegerField()
    change_percent = serializers.CharField()
    severity = serializers.CharField()
    explanation = serializers.CharField()
    ai_context = ContextualAIRiskSerializer(required=False, allow_null=True)
    center = GeoJSONPointField(read_only=True)
    dominant_type = serializers.CharField()
    timestamp = serializers.DateTimeField()


class CybercrimeSummarySerializer(serializers.Serializer):
    overview = CybercrimeOverviewSerializer()
    top_hotspot = CybercrimeHotspotSerializer(required=False, allow_null=True)
    hotspots = CybercrimeHotspotSerializer(many=True)
    emerging_threats = CybercrimeAlertSerializer(many=True)
    user_scope = serializers.CharField()
    timestamp = serializers.DateTimeField()


# =========================================================================
# OPERATIONAL AUDIT LOG SERIALIZERS
# =========================================================================

from .models import AuditLog

class AuditActorSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    badge_number = serializers.CharField(read_only=True, allow_null=True)
    station_name = serializers.CharField(source='station.name', read_only=True, allow_null=True)


class AuditStationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    station_code = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)


class AuditLogSerializer(serializers.ModelSerializer):
    actor = AuditActorSerializer(read_only=True)
    station = AuditStationSerializer(read_only=True)
    actor_name = serializers.SerializerMethodField()
    station_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            'id',
            'actor',
            'actor_name',
            'action',
            'category',
            'event_type',
            'description',
            'resource_type',
            'resource_id',
            'station',
            'station_name',
            'timestamp',
            'metadata',
            'status',
            'ip_address',
        )

    def get_actor_name(self, obj):
        return obj.actor.username if obj.actor else 'System'

    def get_station_name(self, obj):
        if obj.station:
            return obj.station.name
        if obj.actor and obj.actor.station:
            return obj.actor.station.name
        return 'Citywide'


