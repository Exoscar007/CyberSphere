from crimes.models import Incident
from intelligence.models import RiskScore
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.auth import get_user_model
from patrol.models import PatrolLocation
from django.contrib.gis.db.models.functions import Distance

User = get_user_model()

class GISRepository:
    @staticmethod
    def get_nearby_incidents(lat, lng, radius_km):
        point = Point(lng, lat, srid=4326)
        return Incident.objects.filter(location__distance_lte=(point, D(km=radius_km)))

    @staticmethod
    def get_all_risk_zones():
        # Returns RiskScores to be mapped as heatmaps or polygons
        return RiskScore.objects.all()

    @staticmethod
    def get_incident(incident_id):
        try:
            return Incident.objects.get(id=incident_id)
        except Incident.DoesNotExist:
            return None

    @staticmethod
    def get_recommended_patrols(incident, station_id=None):
        ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED']
        
        # 1. Determine available patrol officers
        available_officers = User.objects.filter(role__in=['PATROL', 'PATROL_OFFICER']).exclude(patrols__status__in=ACTIVE_ASSIGNMENT_STATUSES)
        
        if station_id:
            available_officers = available_officers.filter(station_id=station_id)
            
        # 2. Get the latest location ID for each available officer
        latest_loc_ids = PatrolLocation.objects.filter(
            assignment__officer__in=available_officers
        ).order_by('assignment__officer', '-timestamp').distinct('assignment__officer').values_list('id', flat=True)
        
        # 3. Query these exact locations, annotate distance, order by distance
        locations = PatrolLocation.objects.filter(id__in=latest_loc_ids).annotate(
            distance=Distance('location', incident.location)
        ).select_related('assignment__officer', 'assignment__officer__station').order_by('distance')
        
        return locations
