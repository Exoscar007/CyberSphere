from .models import PatrolAssignment, PatrolLocation

class PatrolRepository:
    @staticmethod
    def create_assignment(officer, zone_name):
        return PatrolAssignment.objects.create(officer=officer, zone_name=zone_name)

    @staticmethod
    def get_active_assignments():
        return PatrolAssignment.objects.filter(status=PatrolAssignment.Status.ACTIVE)

    @staticmethod
    def get_assignment(assignment_id):
        try:
            return PatrolAssignment.objects.get(id=assignment_id)
        except PatrolAssignment.DoesNotExist:
            return None

    @staticmethod
    def log_location(assignment, point):
        return PatrolLocation.objects.create(assignment=assignment, location=point)
