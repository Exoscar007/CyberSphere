from django.urls import path
from .views import (
    TriggerPredictionAPIView,
    PredictionJobStatusAPIView,
    ForecastAPIView,
    ModelStatusAPIView,
    TrainModelAPIView,
    PredictiveZonesAPIView,
)

urlpatterns = [
    path('predict/', TriggerPredictionAPIView.as_view(), name='trigger-prediction'),
    path('jobs/<int:pk>/', PredictionJobStatusAPIView.as_view(), name='prediction-job-status'),
    path('model-status/', ModelStatusAPIView.as_view(), name='model-status'),
    path('train/', TrainModelAPIView.as_view(), name='train-model'),
    path('predictive-zones/', PredictiveZonesAPIView.as_view(), name='predictive-zones'),
    path('forecast/', ForecastAPIView.as_view(), name='forecast'),
]
