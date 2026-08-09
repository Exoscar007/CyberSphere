from crimes.models import Incident
from intelligence.models import RiskScore
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

class GISRepository:
    @staticmethod
    def get_nearby_incidents(lat, lng, radius_km):
        point = Point(lng, lat, srid=4326)
        return Incident.objects.filter(location__distance_lte=(point, D(km=radius_km)))

    @staticmethod
    def get_all_risk_zones():
        # Returns RiskScores to be mapped as heatmaps or polygons
        return RiskScore.objects.all()
