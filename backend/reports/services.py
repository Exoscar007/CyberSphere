from django.db import connection
from crimes.models import FIR
from django.utils import timezone
from datetime import timedelta

class ReportService:
    @staticmethod
    def get_system_health():
        health = {
            "status": "UP",
            "database": "OK",
            "timestamp": timezone.now()
        }
        try:
            connection.ensure_connection()
        except Exception:
            health["status"] = "DOWN"
            health["database"] = "ERROR"
        return health

    @staticmethod
    def get_crime_summary():
        # A simple report showing FIRs from the last 30 days vs total
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_firs = FIR.objects.filter(created_at__gte=thirty_days_ago).count()
        total_firs = FIR.objects.count()
        
        return {
            "report_type": "CRIME_SUMMARY",
            "generated_at": timezone.now(),
            "data": {
                "total_firs": total_firs,
                "firs_last_30_days": recent_firs
            }
        }

from patrol.models import PatrolAssignment
from django.db.models import Prefetch

class ResponseTimeService:
    @staticmethod
    def calculate_response_times(station_id=None, time_filter=None, severity=None, status=None, start_date=None, end_date=None):
        qs = PatrolAssignment.objects.prefetch_related('status_history')
        from dashboard.services import DashboardService
        qs = DashboardService._apply_filters(qs, 'assignment', time_filter, severity, status, station_id, start_date, end_date)

        assignments = list(qs)
        
        global_stats = {
            'assign_to_enroute': [],
            'enroute_to_arrive': [],
            'assign_to_arrive': [],
            'arrive_to_complete': [],
            'assign_to_complete': []
        }
        
        station_stats = {}
        
        for assignment in assignments:
            history = sorted(list(assignment.status_history.all()), key=lambda x: x.timestamp)
            
            # Find earliest occurrence of each status
            times = {}
            for h in history:
                if h.new_status not in times:
                    times[h.new_status] = h.timestamp
            
            # Calculate durations if present
            s_id = assignment.station_id
            if s_id not in station_stats:
                station_stats[s_id] = {
                    'station_name': assignment.station.name if assignment.station else 'Unassigned',
                    'count': 0,
                    'assign_to_arrive': [],
                    'assign_to_complete': []
                }
            
            station_stats[s_id]['count'] += 1
            
            def diff_seconds(t1, t2):
                if t1 and t2 and t2 >= t1:
                    return (t2 - t1).total_seconds()
                return None
                
            t_assigned = times.get('ASSIGNED') or assignment.start_time
            t_enroute = times.get('EN_ROUTE')
            t_arrived = times.get('ARRIVED')
            t_completed = times.get('COMPLETED')
            
            val_a_e = diff_seconds(t_assigned, t_enroute)
            val_e_a = diff_seconds(t_enroute, t_arrived)
            val_a_a = diff_seconds(t_assigned, t_arrived)
            val_a_c = diff_seconds(t_arrived, t_completed)
            val_as_c = diff_seconds(t_assigned, t_completed)
            
            if val_a_e is not None: global_stats['assign_to_enroute'].append(val_a_e)
            if val_e_a is not None: global_stats['enroute_to_arrive'].append(val_e_a)
            if val_a_a is not None: 
                global_stats['assign_to_arrive'].append(val_a_a)
                station_stats[s_id]['assign_to_arrive'].append(val_a_a)
            if val_a_c is not None: global_stats['arrive_to_complete'].append(val_a_c)
            if val_as_c is not None: 
                global_stats['assign_to_complete'].append(val_as_c)
                station_stats[s_id]['assign_to_complete'].append(val_as_c)

        def avg(lst):
            return sum(lst) / len(lst) if lst else 0
            
        summary = {
            "average_assignment_to_en_route_seconds": avg(global_stats['assign_to_enroute']),
            "average_en_route_to_arrived_seconds": avg(global_stats['enroute_to_arrive']),
            "average_assignment_to_arrived_seconds": avg(global_stats['assign_to_arrive']),
            "average_arrived_to_completed_seconds": avg(global_stats['arrive_to_complete']),
            "average_assignment_to_completed_seconds": avg(global_stats['assign_to_complete']),
        }
        
        by_station = []
        for s_id, s_data in station_stats.items():
            by_station.append({
                "station_id": s_id,
                "station_name": s_data['station_name'],
                "assignments_analyzed": s_data['count'],
                "average_assignment_to_arrived_seconds": avg(s_data['assign_to_arrive']),
                "average_assignment_to_completed_seconds": avg(s_data['assign_to_complete'])
            })
            
        return {
            "summary": summary,
            "assignments_analyzed": len(assignments),
            "by_station": by_station
        }
