from .models import CrimeTrend, RiskScore

class IntelligenceRepository:
    @staticmethod
    def get_trends():
        return CrimeTrend.objects.all()

    @staticmethod
    def get_risk_scores():
        return RiskScore.objects.all()
