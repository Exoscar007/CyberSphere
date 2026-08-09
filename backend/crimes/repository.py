from .models import FIR, Complaint, Incident, Evidence

class CrimeRepository:
    # FIR
    @staticmethod
    def get_firs():
        return FIR.objects.all()

    @staticmethod
    def create_fir(data):
        fir = FIR(**data)
        fir.save()
        return fir

    @staticmethod
    def get_fir_by_id(fir_id):
        try:
            return FIR.objects.get(id=fir_id)
        except FIR.DoesNotExist:
            return None

    # Complaint
    @staticmethod
    def get_complaints():
        return Complaint.objects.all()

    @staticmethod
    def create_complaint(data):
        comp = Complaint(**data)
        comp.save()
        return comp

    # Incident
    @staticmethod
    def get_incidents():
        return Incident.objects.all()

    @staticmethod
    def create_incident(data):
        inc = Incident(**data)
        inc.save()
        return inc

    # Evidence
    @staticmethod
    def get_evidence_for_fir(fir_id):
        return Evidence.objects.filter(fir_id=fir_id)

    @staticmethod
    def create_evidence(fir, file, user):
        return Evidence.objects.create(fir=fir, file=file, uploaded_by=user)
