from .repository import PatrolRepository
from django.contrib.gis.geos import Point

class PatrolService:
    @staticmethod
    def assign_patrol(user, officer, zone_name, destination, priority, instructions, fir=None, incident=None):
        station = user.station if hasattr(user, 'station') else None
        return PatrolRepository.create_assignment(
            officer=officer, zone_name=zone_name, destination=destination, priority=priority, instructions=instructions,
            station=station, fir=fir, incident=incident
        )

    @staticmethod
    def get_all_patrols(user):
        return PatrolRepository.get_all_assignments(user)

    @staticmethod
    def get_active_patrols(user):
        return PatrolRepository.get_active_assignments(user)

    @staticmethod
    def get_patrol_assignment(user, assignment_id):
        return PatrolRepository.get_assignment(assignment_id, user)

    @staticmethod
    def update_assignment_status(user, assignment_id, status):
        from .models import PatrolAssignment
        assignment = PatrolRepository.get_assignment(assignment_id, user)
        if not assignment:
            raise ValueError("Assignment not found or permission denied")
            
        VALID_TRANSITIONS = {
            PatrolAssignment.Status.ASSIGNED: [PatrolAssignment.Status.ACKNOWLEDGED, PatrolAssignment.Status.CANCELLED],
            PatrolAssignment.Status.ACKNOWLEDGED: [PatrolAssignment.Status.EN_ROUTE, PatrolAssignment.Status.CANCELLED],
            PatrolAssignment.Status.EN_ROUTE: [PatrolAssignment.Status.ARRIVED, PatrolAssignment.Status.CANCELLED],
            PatrolAssignment.Status.ARRIVED: [PatrolAssignment.Status.COMPLETED, PatrolAssignment.Status.CANCELLED],
            PatrolAssignment.Status.COMPLETED: [],
            PatrolAssignment.Status.CANCELLED: [],
        }

        if status not in VALID_TRANSITIONS.get(assignment.status, []):
            raise ValueError(f"Invalid transition from {assignment.status} to {status}")

        if status == PatrolAssignment.Status.CANCELLED:
            if user.role not in ['ADMIN', 'STATION']:
                raise ValueError("Only Station/Admin can cancel an assignment")
        else:
            if user.role == 'PATROL_OFFICER' and assignment.officer != user:
                raise ValueError("Patrol cannot modify another Patrol's assignment")

        old_status = assignment.status
        assignment.status = status
        assignment.save()

        from .models import PatrolStatusHistory
        PatrolStatusHistory.objects.create(
            assignment=assignment,
            old_status=old_status,
            new_status=status,
            actor=user
        )

        return assignment

    @staticmethod
    def log_ping(user, assignment_id, lat, lng):
        from .models import PatrolAssignment
        assignment = PatrolRepository.get_assignment(assignment_id, user)
        if not assignment:
            raise ValueError("Assignment not found or permission denied")
        
        if assignment.status in [PatrolAssignment.Status.COMPLETED, PatrolAssignment.Status.CANCELLED]:
            raise ValueError("Cannot log GPS ping for completed or cancelled assignments")
        
        point = Point(float(lng), float(lat), srid=4326)
        return PatrolRepository.log_location(assignment, point)
