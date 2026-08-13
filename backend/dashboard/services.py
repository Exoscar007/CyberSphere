import datetime
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncHour
from crimes.models import Incident, Evidence
from patrol.models import PatrolAssignment
from users.models import PoliceStation

User = get_user_model()
ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED']
ACTIVE_INCIDENT_STATUSES = ['OPEN']

class DashboardService:
    @staticmethod
    def _apply_filters(qs, model_type, time_filter=None, severity=None, status=None, station_id=None):
        now = timezone.now()
        
        # Apply Station Filter
        if station_id:
            qs = qs.filter(station_id=station_id)

        # Apply Priority/Severity/Status filters
        if model_type == 'incident':
            if severity:
                qs = qs.filter(severity=severity)
            if status:
                qs = qs.filter(status=status)
                
            if time_filter == '1h':
                threshold = now - datetime.timedelta(hours=1)
                qs = qs.filter(Q(status__in=ACTIVE_INCIDENT_STATUSES) | Q(date_occurred__gte=threshold))
            elif time_filter == '24h':
                threshold = now - datetime.timedelta(hours=24)
                qs = qs.filter(Q(status__in=ACTIVE_INCIDENT_STATUSES) | Q(date_occurred__gte=threshold))
                
        elif model_type == 'assignment':
            if severity: # treating severity filter as priority for assignments
                qs = qs.filter(priority=severity)
            if status:
                qs = qs.filter(status=status)
                
            if time_filter == '1h':
                threshold = now - datetime.timedelta(hours=1)
                qs = qs.filter(Q(status__in=ACTIVE_ASSIGNMENT_STATUSES) | Q(start_time__gte=threshold))
            elif time_filter == '24h':
                threshold = now - datetime.timedelta(hours=24)
                qs = qs.filter(Q(status__in=ACTIVE_ASSIGNMENT_STATUSES) | Q(start_time__gte=threshold))
                
        elif model_type == 'evidence':
            if time_filter == '1h':
                qs = qs.filter(uploaded_at__gte=now - datetime.timedelta(hours=1))
            elif time_filter == '24h':
                qs = qs.filter(uploaded_at__gte=now - datetime.timedelta(hours=24))

        return qs

    @staticmethod
    def get_summary(user, time_filter=None, severity=None, status=None, station_id=None):
        incident_qs = Incident.objects.all()
        assignment_qs = PatrolAssignment.objects.all()
        user_qs = User.objects.filter(role__in=['PATROL', 'PATROL_OFFICER'])
        evidence_qs = Evidence.objects.all()

        if user.role == 'STATION' and user.station:
            station_id = user.station.id
        elif user.role != 'ADMIN':
            return {}

        incident_qs = DashboardService._apply_filters(incident_qs, 'incident', time_filter, severity, status, station_id)
        assignment_qs = DashboardService._apply_filters(assignment_qs, 'assignment', time_filter, severity, status, station_id)
        evidence_qs = DashboardService._apply_filters(evidence_qs, 'evidence', time_filter, None, None, None)
        
        if station_id:
            user_qs = user_qs.filter(station_id=station_id)
            evidence_qs = evidence_qs.filter(Q(incident__station_id=station_id) | Q(assignment__station_id=station_id))

        total_incidents = incident_qs.count()
        open_incidents = incident_qs.filter(status='OPEN').count()
        critical_incidents = incident_qs.filter(severity='CRITICAL').count()

        active_assignments = assignment_qs.filter(status__in=ACTIVE_ASSIGNMENT_STATUSES).count()
        completed_assignments = assignment_qs.filter(status='COMPLETED').count()

        total_patrols = user_qs.count()
        busy_patrols = user_qs.filter(patrols__status__in=ACTIVE_ASSIGNMENT_STATUSES).distinct().count()
        available_patrols = total_patrols - busy_patrols

        evidence_collected = evidence_qs.count()

        return {
            "total_incidents": total_incidents,
            "open_incidents": open_incidents,
            "critical_incidents": critical_incidents,
            "active_assignments": active_assignments,
            "available_patrols": available_patrols,
            "busy_patrols": busy_patrols,
            "completed_assignments": completed_assignments,
            "evidence_collected": evidence_collected
        }

    @staticmethod
    def get_workload(user, time_filter=None):
        station_qs = PoliceStation.objects.all()
        if user.role == 'STATION' and user.station:
            station_qs = station_qs.filter(id=user.station.id)
        elif user.role != 'ADMIN':
            return []

        # Time filter on workload mainly affects completed assignments. Open/Active ignore time filter.
        now = timezone.now()
        completed_filter = Q(patrol_assignments__status='COMPLETED')
        if time_filter == '1h':
            completed_filter &= Q(patrol_assignments__start_time__gte=now - datetime.timedelta(hours=1))
        elif time_filter == '24h':
            completed_filter &= Q(patrol_assignments__start_time__gte=now - datetime.timedelta(hours=24))

        stations = station_qs.annotate(
            open_incidents=Count('incidents', filter=Q(incidents__status='OPEN'), distinct=True),
            incidents_with_active_patrol=Count(
                'incidents', 
                filter=Q(incidents__status='OPEN', incidents__patrol_assignments__status__in=ACTIVE_ASSIGNMENT_STATUSES), 
                distinct=True
            ),
            active_assignments=Count('patrol_assignments', filter=Q(patrol_assignments__status__in=ACTIVE_ASSIGNMENT_STATUSES), distinct=True),
            completed_assignments=Count('patrol_assignments', filter=completed_filter, distinct=True),
            total_patrol_officers=Count('users', filter=Q(users__role__in=['PATROL', 'PATROL_OFFICER']), distinct=True),
            busy_patrol_officers=Count('users', filter=Q(users__role__in=['PATROL', 'PATROL_OFFICER'], users__patrols__status__in=ACTIVE_ASSIGNMENT_STATUSES), distinct=True)
        )

        results = []
        for station in stations:
            unassigned_open_incidents = station.open_incidents - station.incidents_with_active_patrol
            if unassigned_open_incidents < 0:
                unassigned_open_incidents = 0
            
            results.append({
                "station_id": station.id,
                "station_name": station.name,
                "open_incidents": station.open_incidents,
                "incidents_with_active_patrol": station.incidents_with_active_patrol,
                "unassigned_open_incidents": unassigned_open_incidents,
                "active_assignments": station.active_assignments,
                "available_patrol_officers": station.total_patrol_officers - station.busy_patrol_officers,
                "busy_patrol_officers": station.busy_patrol_officers,
                "completed_assignments": station.completed_assignments
            })
        return results

    @staticmethod
    def get_distribution(user, time_filter=None, station_id=None):
        incident_qs = Incident.objects.all()
        if user.role == 'STATION' and user.station:
            station_id = user.station.id
        elif user.role != 'ADMIN':
            return []

        # Distribution usually shouldn't filter by status/severity since it's showing all severity/status
        incident_qs = DashboardService._apply_filters(incident_qs, 'incident', time_filter, None, None, station_id)

        total_incidents = incident_qs.count()
        distribution = incident_qs.values('severity').annotate(count=Count('id')).order_by('-count')
        
        results = []
        for item in distribution:
            severity = item['severity']
            count = item['count']
            percentage = (count / total_incidents * 100) if total_incidents > 0 else 0
            results.append({
                "severity": severity,
                "count": count,
                "percentage": round(percentage, 1)
            })
        
        existing = {x['severity'] for x in results}
        for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            if severity not in existing:
                results.append({"severity": severity, "count": 0, "percentage": 0.0})
                
        weight = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        results.sort(key=lambda x: weight.get(x['severity'], 4))
        
        return results

    @staticmethod
    def get_trends(user, station_id=None):
        incident_qs = Incident.objects.all()
        if user.role == 'STATION' and user.station:
            station_id = user.station.id
        elif user.role != 'ADMIN':
            return []
            
        if station_id:
            incident_qs = incident_qs.filter(station_id=station_id)

        now = timezone.now()
        # Truncate to the current hour (e.g., 14:35 -> 14:00)
        current_hour = now.replace(minute=0, second=0, microsecond=0)
        start_time = current_hour - datetime.timedelta(hours=23) # Gives 24 buckets including current hour
        
        incident_qs = incident_qs.filter(date_occurred__gte=start_time, date_occurred__lt=current_hour + datetime.timedelta(hours=1))
        
        # Group by hour
        hourly_counts = (
            incident_qs
            .annotate(hour=TruncHour('date_occurred'))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('hour')
        )
        
        # Map out results
        counts_by_hour = {item['hour']: item['count'] for item in hourly_counts}
        
        results = []
        for i in range(24):
            bucket_time = start_time + datetime.timedelta(hours=i)
            results.append({
                "timestamp": bucket_time.isoformat(),
                "hour_label": bucket_time.strftime("%H:00"),
                "count": counts_by_hour.get(bucket_time, 0)
            })
            
        return results
