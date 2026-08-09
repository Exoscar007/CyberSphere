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
