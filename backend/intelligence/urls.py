from django.urls import path
from .views import CrimeTrendListAPIView, RiskScoreListAPIView

urlpatterns = [
    path('trends/', CrimeTrendListAPIView.as_view(), name='crime-trends-list'),
    path('risk-scores/', RiskScoreListAPIView.as_view(), name='risk-scores-list'),
]
