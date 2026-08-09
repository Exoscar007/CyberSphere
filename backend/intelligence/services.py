from .repository import IntelligenceRepository

class IntelligenceService:
    @staticmethod
    def get_trends():
        return IntelligenceRepository.get_trends()

    @staticmethod
    def get_risk_scores():
        return IntelligenceRepository.get_risk_scores()
