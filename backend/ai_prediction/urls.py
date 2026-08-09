from django.urls import path
from .views import TriggerPredictionAPIView, PredictionJobStatusAPIView

urlpatterns = [
    path('predict/', TriggerPredictionAPIView.as_view(), name='trigger-prediction'),
    path('jobs/<int:pk>/', PredictionJobStatusAPIView.as_view(), name='prediction-job-status'),
]
