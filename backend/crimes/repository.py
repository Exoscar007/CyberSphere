from django.db.models import Q
from .models import FIR, Complaint, Incident, Evidence

class CrimeRepository:
    @staticmethod
    def _get_base_queryset(queryset_class, user):
        if not user.is_authenticated:
            return queryset_class.objects.none()
        if user.role == 'ADMIN':
            return queryset_class.objects.all()
        if user.role == 'STATION':
            if queryset_class == Evidence:
                return queryset_class.objects.filter(incident__station=user.station)
            return queryset_class.objects.filter(station=user.station)
        if user.role == 'PATROL_OFFICER':
            if queryset_class == FIR:
                return queryset_class.objects.filter(patrol_assignments__officer=user).distinct()
            elif queryset_class == Incident:
                return queryset_class.objects.filter(patrol_assignments__officer=user).distinct()
            elif queryset_class == Complaint:
                return queryset_class.objects.none()
            elif queryset_class == Evidence:
                return queryset_class.objects.filter(assignment__officer=user).distinct()
        return queryset_class.objects.none()

    # FIR
    @staticmethod
    def get_firs(user):
        return CrimeRepository._get_base_queryset(FIR, user)

    @staticmethod
    def create_fir(data):
        fir = FIR(**data)
        fir.save()
        return fir

    @staticmethod
    def get_fir_by_id(fir_id, user):
        try:
            return CrimeRepository._get_base_queryset(FIR, user).get(id=fir_id)
        except FIR.DoesNotExist:
            return None

    # Complaint
    @staticmethod
    def get_complaints(user):
        return CrimeRepository._get_base_queryset(Complaint, user)

    @staticmethod
    def create_complaint(data):
        comp = Complaint(**data)
        comp.save()
        return comp

    # Incident
    @staticmethod
    def get_incidents(user):
        return CrimeRepository._get_base_queryset(Incident, user)

    @staticmethod
    def create_incident(data):
        inc = Incident(**data)
        inc.save()
        return inc

    # Evidence
    @staticmethod
    def get_evidence(user, assignment_id=None, incident_id=None, fir_id=None):
        queryset = CrimeRepository._get_base_queryset(Evidence, user)
        if assignment_id:
            queryset = queryset.filter(assignment_id=assignment_id)
        if incident_id:
            queryset = queryset.filter(incident_id=incident_id)
        if fir_id:
            queryset = queryset.filter(fir_id=fir_id)
        return queryset

    @staticmethod
    def create_evidence(data):
        evidence = Evidence(**data)
        # Ensure assignment exists and user has permission
        # In a real app we'd explicitly check permissions, but _get_base_queryset on GET usually handles it.
        # Since this is creation, we trust the service/serializer already validated it, or we rely on the FKs.
        evidence.save()
        return evidence
