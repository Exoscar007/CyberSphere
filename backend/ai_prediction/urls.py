from django.urls import path
from .views import TriggerPredictionAPIView, PredictionJobStatusAPIView, ForecastAPIView

urlpatterns = [
    path('predict/', TriggerPredictionAPIView.as_view(), name='trigger-prediction'),
    path('jobs/<int:pk>/', PredictionJobStatusAPIView.as_view(), name='prediction-job-status'),
    path('forecast/', ForecastAPIView.as_view(), name='forecast'),
]
