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
    def _apply_filters(qs, model_type, time_filter=None, severity=None, status=None, station_id=None, start_date=None, end_date=None):
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
                qs = qs.filter(date_occurred__gte=threshold)
            elif time_filter == '24h':
                threshold = now - datetime.timedelta(hours=24)
                qs = qs.filter(date_occurred__gte=threshold)
            elif time_filter == '7d':
                threshold = now - datetime.timedelta(days=7)
                qs = qs.filter(date_occurred__gte=threshold)
            elif time_filter == '30d':
                threshold = now - datetime.timedelta(days=30)
                qs = qs.filter(date_occurred__gte=threshold)
            elif time_filter == 'month':
                qs = qs.filter(date_occurred__year=now.year, date_occurred__month=now.month)
            elif time_filter == 'custom':
                if start_date:
                    qs = qs.filter(date_occurred__gte=start_date)
                if end_date:
                    qs = qs.filter(date_occurred__lte=end_date)
                
        elif model_type == 'assignment':
            if severity: # treating severity filter as priority for assignments
                qs = qs.filter(priority=severity)
            if status:
                qs = qs.filter(status=status)
                
            if time_filter == '1h':
                threshold = now - datetime.timedelta(hours=1)
                qs = qs.filter(start_time__gte=threshold)
            elif time_filter == '24h':
                threshold = now - datetime.timedelta(hours=24)
                qs = qs.filter(start_time__gte=threshold)
            elif time_filter == '7d':
                threshold = now - datetime.timedelta(days=7)
                qs = qs.filter(start_time__gte=threshold)
            elif time_filter == '30d':
                threshold = now - datetime.timedelta(days=30)
                qs = qs.filter(start_time__gte=threshold)
            elif time_filter == 'month':
                qs = qs.filter(start_time__year=now.year, start_time__month=now.month)
            elif time_filter == 'custom':
                if start_date:
                    qs = qs.filter(start_time__gte=start_date)
                if end_date:
                    qs = qs.filter(start_time__lte=end_date)
                
        elif model_type == 'evidence':
            if time_filter == '1h':
                qs = qs.filter(uploaded_at__gte=now - datetime.timedelta(hours=1))
            elif time_filter == '24h':
                qs = qs.filter(uploaded_at__gte=now - datetime.timedelta(hours=24))
            elif time_filter == '7d':
                qs = qs.filter(uploaded_at__gte=now - datetime.timedelta(days=7))
            elif time_filter == '30d':
                qs = qs.filter(uploaded_at__gte=now - datetime.timedelta(days=30))
            elif time_filter == 'month':
                qs = qs.filter(uploaded_at__year=now.year, uploaded_at__month=now.month)
            elif time_filter == 'custom':
                if start_date:
                    qs = qs.filter(uploaded_at__gte=start_date)
                if end_date:
                    qs = qs.filter(uploaded_at__lte=end_date)

        return qs

    @staticmethod
    def get_summary(user, time_filter=None, severity=None, status=None, station_id=None, start_date=None, end_date=None):
        incident_qs = Incident.objects.all()
        assignment_qs = PatrolAssignment.objects.all()
        user_qs = User.objects.filter(role__in=['PATROL', 'PATROL_OFFICER'])
        evidence_qs = Evidence.objects.all()

        if user.role == 'STATION' and user.station:
            station_id = user.station.id
        elif user.role != 'ADMIN':
            return {}

        incident_qs = DashboardService._apply_filters(incident_qs, 'incident', time_filter, severity, status, station_id, start_date, end_date)
        assignment_qs = DashboardService._apply_filters(assignment_qs, 'assignment', time_filter, severity, status, station_id, start_date, end_date)
        evidence_qs = DashboardService._apply_filters(evidence_qs, 'evidence', time_filter, None, None, None, start_date, end_date)
        
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
    def get_workload(user, time_filter=None, start_date=None, end_date=None, severity=None, status=None):
        station_qs = PoliceStation.objects.all()
        if user.role == 'STATION' and user.station:
            station_qs = station_qs.filter(id=user.station.id)
        elif user.role != 'ADMIN':
            return []

        station_list = list(station_qs.values('id', 'name'))
        if not station_list:
            return []
            
        station_map = {s['id']: {
            'station_id': s['id'],
            'station_name': s['name'],
            'open_incidents': 0,
            'incidents_with_active_patrol': 0,
            'unassigned_open_incidents': 0,
            'active_assignments': 0,
            'available_patrol_officers': 0,
            'busy_patrol_officers': 0,
            'completed_assignments': 0,
            'total_patrol_officers': 0
        } for s in station_list}
        
        station_ids = list(station_map.keys())

        # 1. Incidents
        incident_filter = Q(status='OPEN', station_id__in=station_ids)
        if status:
            incident_filter &= Q(status=status)
        if severity:
            incident_filter &= Q(severity=severity)

        open_counts = Incident.objects.filter(incident_filter).values('station_id').annotate(count=Count('id'))
        for row in open_counts:
            station_map[row['station_id']]['open_incidents'] = row['count']

        incident_active_patrol_filter = incident_filter & Q(patrol_assignments__status__in=ACTIVE_ASSIGNMENT_STATUSES)
        active_patrol_inc_counts = Incident.objects.filter(incident_active_patrol_filter).values('station_id').annotate(count=Count('id', distinct=True))
        for row in active_patrol_inc_counts:
            station_map[row['station_id']]['incidents_with_active_patrol'] = row['count']

        # 2. Assignments (Active)
        active_assignments_filter = Q(status__in=ACTIVE_ASSIGNMENT_STATUSES, station_id__in=station_ids)
        if status:
            active_assignments_filter &= Q(status=status)
        if severity:
            active_assignments_filter &= Q(priority=severity)
            
        active_assignments_counts = PatrolAssignment.objects.filter(active_assignments_filter).values('station_id').annotate(count=Count('id'))
        for row in active_assignments_counts:
            station_map[row['station_id']]['active_assignments'] = row['count']

        # 3. Assignments (Completed with time filter)
        now = timezone.now()
        completed_filter = Q(status='COMPLETED', station_id__in=station_ids)
        if status:
            completed_filter &= Q(status=status)
        if severity:
            completed_filter &= Q(priority=severity)

        if time_filter == '1h':
            completed_filter &= Q(start_time__gte=now - datetime.timedelta(hours=1))
        elif time_filter == '24h':
            completed_filter &= Q(start_time__gte=now - datetime.timedelta(hours=24))
        elif time_filter == '7d':
            completed_filter &= Q(start_time__gte=now - datetime.timedelta(days=7))
        elif time_filter == '30d':
            completed_filter &= Q(start_time__gte=now - datetime.timedelta(days=30))
        elif time_filter == 'month':
            completed_filter &= Q(start_time__year=now.year, start_time__month=now.month)
        elif time_filter == 'today':
            completed_filter &= Q(start_time__year=now.year, start_time__month=now.month, start_time__day=now.day)
        elif time_filter == 'custom':
            if start_date:
                completed_filter &= Q(start_time__gte=start_date)
            if end_date:
                completed_filter &= Q(start_time__lte=end_date)

        completed_counts = PatrolAssignment.objects.filter(completed_filter).values('station_id').annotate(count=Count('id'))
        for row in completed_counts:
            station_map[row['station_id']]['completed_assignments'] = row['count']

        # 4. Users
        users_qs = User.objects.filter(role__in=['PATROL', 'PATROL_OFFICER'], station_id__in=station_ids)
        total_users = users_qs.values('station_id').annotate(count=Count('id'))
        for row in total_users:
            station_map[row['station_id']]['total_patrol_officers'] = row['count']
            
        busy_users = users_qs.filter(patrols__status__in=ACTIVE_ASSIGNMENT_STATUSES).values('station_id').annotate(count=Count('id', distinct=True))
        for row in busy_users:
            station_map[row['station_id']]['busy_patrol_officers'] = row['count']

        results = []
        for s_id in station_ids:
            stat = station_map[s_id]
            unassigned = stat['open_incidents'] - stat['incidents_with_active_patrol']
            stat['unassigned_open_incidents'] = unassigned if unassigned > 0 else 0
            available = stat['total_patrol_officers'] - stat['busy_patrol_officers']
            stat['available_patrol_officers'] = available if available > 0 else 0
            
            results.append({
                "station_id": stat['station_id'],
                "station_name": stat['station_name'],
                "open_incidents": stat['open_incidents'],
                "incidents_with_active_patrol": stat['incidents_with_active_patrol'],
                "unassigned_open_incidents": stat['unassigned_open_incidents'],
                "active_assignments": stat['active_assignments'],
                "available_patrol_officers": stat['available_patrol_officers'],
                "busy_patrol_officers": stat['busy_patrol_officers'],
                "completed_assignments": stat['completed_assignments']
            })
        return results

    @staticmethod
    def get_distribution(user, time_filter=None, station_id=None, severity=None, status=None, start_date=None, end_date=None):
        incident_qs = Incident.objects.all()
        if user.role == 'STATION' and user.station:
            station_id = user.station.id
        elif user.role != 'ADMIN':
            return []

        incident_qs = DashboardService._apply_filters(incident_qs, 'incident', time_filter, severity, status, station_id, start_date, end_date)

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
    def get_trends(user, station_id=None, time_filter=None, severity=None, status=None, start_date=None, end_date=None):
        incident_qs = Incident.objects.all()
        if user.role == 'STATION' and user.station:
            station_id = user.station.id
        elif user.role != 'ADMIN':
            return []
            
        incident_qs = DashboardService._apply_filters(incident_qs, 'incident', time_filter, severity, status, station_id, start_date, end_date)

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
