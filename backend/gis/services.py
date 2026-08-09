from .repository import GISRepository

class GISService:
    @staticmethod
    def get_nearby_incidents(lat, lng, radius_km=5.0):
        # Default radius 5km if not provided
        return GISRepository.get_nearby_incidents(float(lat), float(lng), float(radius_km))

    @staticmethod
    def get_risk_heatmap():
        return GISRepository.get_all_risk_zones()
