from .repository import PatrolRepository
from django.contrib.gis.geos import Point

class PatrolService:
    @staticmethod
    def assign_patrol(officer, zone_name):
        return PatrolRepository.create_assignment(officer, zone_name)

    @staticmethod
    def get_active_patrols():
        return PatrolRepository.get_active_assignments()

    @staticmethod
    def log_ping(assignment_id, lat, lng):
        assignment = PatrolRepository.get_assignment(assignment_id)
        if not assignment:
            raise ValueError("Assignment not found")
        
        point = Point(float(lng), float(lat), srid=4326)
        return PatrolRepository.log_location(assignment, point)
