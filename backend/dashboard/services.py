from django.contrib.auth import get_user_model
from crimes.models import FIR, Complaint, Incident
from intelligence.models import RiskScore

User = get_user_model()

class DashboardService:
    @staticmethod
    def get_summary():
        return {
            "total_users": User.objects.count(),
            "open_firs": FIR.objects.filter(status=FIR.Status.OPEN).count(),
            "pending_complaints": Complaint.objects.filter(status=Complaint.Status.PENDING).count(),
            "critical_incidents": Incident.objects.filter(severity=Incident.Severity.CRITICAL).count(),
            "risk_zones": RiskScore.objects.count()
        }
