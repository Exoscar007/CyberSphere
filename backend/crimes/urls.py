from django.urls import path
from .views import (
    FIRListCreateAPIView,
    ComplaintListCreateAPIView,
    IncidentListCreateAPIView,
    IncidentRetrieveUpdateAPIView,
    EvidenceUploadAPIView,
    EvidenceDownloadAPIView
)

urlpatterns = [
    path('fir/', FIRListCreateAPIView.as_view(), name='fir-list-create'),
    path('complaints/', ComplaintListCreateAPIView.as_view(), name='complaint-list-create'),
    path('incidents/', IncidentListCreateAPIView.as_view(), name='incident-list-create'),
    path('incidents/<int:pk>/', IncidentRetrieveUpdateAPIView.as_view(), name='incident-detail'),
    path('evidence/', EvidenceUploadAPIView.as_view(), name='evidence-upload'),
    path('evidence/<int:pk>/download/', EvidenceDownloadAPIView.as_view(), name='evidence-download'),
]
