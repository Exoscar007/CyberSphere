from django.urls import path
from .views import (
    FIRListCreateAPIView,
    ComplaintListCreateAPIView,
    IncidentListCreateAPIView,
    EvidenceUploadAPIView,
)

urlpatterns = [
    path('fir/', FIRListCreateAPIView.as_view(), name='fir-list-create'),
    path('complaints/', ComplaintListCreateAPIView.as_view(), name='complaint-list-create'),
    path('incidents/', IncidentListCreateAPIView.as_view(), name='incident-list-create'),
    path('fir/<int:fir_id>/evidence/', EvidenceUploadAPIView.as_view(), name='evidence-upload'),
]
