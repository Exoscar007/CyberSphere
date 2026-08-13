from django.db.models import Prefetch
from .models import PatrolAssignment, PatrolLocation

class PatrolRepository:
    @staticmethod
    def _get_base_queryset(user):
        latest_location_prefetch = Prefetch(
            'locations',
            queryset=PatrolLocation.objects.order_by('-timestamp'),
            to_attr='prefetched_latest_locations'
        )
        
        base = PatrolAssignment.objects.select_related('officer', 'station', 'incident', 'fir').prefetch_related(latest_location_prefetch)
        
        if not user.is_authenticated:
            return base.none()
        if user.role == 'ADMIN':
            return base.all()
        if user.role == 'STATION':
            return base.filter(station=user.station)
        if user.role == 'PATROL_OFFICER':
            return base.filter(officer=user)
        return base.none()

    @staticmethod
    def create_assignment(officer, zone_name, destination, priority, instructions, station=None, fir=None, incident=None):
        assignment = PatrolAssignment.objects.create(
            officer=officer, zone_name=zone_name, destination=destination, priority=priority, instructions=instructions,
            station=station, fir=fir, incident=incident
        )
        
        from .models import PatrolStatusHistory
        PatrolStatusHistory.objects.create(
            assignment=assignment,
            new_status=PatrolAssignment.Status.ASSIGNED,
            actor=None
        )
        return assignment

    @staticmethod
    def get_all_assignments(user):
        return PatrolRepository._get_base_queryset(user)

    @staticmethod
    def get_active_assignments(user):
        return PatrolRepository._get_base_queryset(user).exclude(
            status__in=[PatrolAssignment.Status.COMPLETED, PatrolAssignment.Status.CANCELLED]
        )

    @staticmethod
    def get_assignment(assignment_id, user):
        try:
            return PatrolRepository._get_base_queryset(user).get(id=assignment_id)
        except PatrolAssignment.DoesNotExist:
            return None

    @staticmethod
    def log_location(assignment, point):
        return PatrolLocation.objects.create(assignment=assignment, location=point)
