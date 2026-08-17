from .repository import GISRepository

class GISService:
    @staticmethod
    def get_nearby_incidents(lat, lng, radius_km=5.0):
        # Default radius 5km if not provided
        return GISRepository.get_nearby_incidents(float(lat), float(lng), float(radius_km))

    @staticmethod
    def get_risk_heatmap(time_filter=None, severity=None, status=None, station_id=None, start_date=None, end_date=None):
        return GISRepository.get_all_risk_zones()

    @staticmethod
    def recommend_patrol(incident_id, station_id=None):
        incident = GISRepository.get_incident(incident_id)
        if not incident:
            return None
            
        locations = GISRepository.get_recommended_patrols(incident, station_id)
        
        candidates = []
        for loc in locations:
            officer = loc.assignment.officer
            candidates.append({
                "patrol_id": officer.id,
                "officer_name": officer.username,
                "badge_number": officer.badge_number,
                "distance_meters": loc.distance.m,
                "lat": loc.location.y,
                "lng": loc.location.x,
                "station": officer.station.name if officer.station else 'Unknown',
                "status": "AVAILABLE"
            })
            
        return candidates
