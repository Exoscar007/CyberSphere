from .repository import CrimeRepository
from .validators import CrimeValidator
from django.contrib.gis.geos import Point

class CrimeService:
    @staticmethod
    def parse_location(location_data):
        # Convert GeoJSON dict to GEOS Point
        lng, lat = location_data['coordinates']
        return Point(float(lng), float(lat), srid=4326)

    @staticmethod
    def create_fir(user, data):
        CrimeValidator.validate_fir(data)
        data['location'] = CrimeService.parse_location(data['location'])
        data['reported_by'] = user
        if user.role == 'STATION' and user.station:
            data['station'] = user.station
        fir = CrimeRepository.create_fir(data)
        
        try:
            from intelligence.audit_service import AuditLogService
            from intelligence.models import AuditEventType, AuditEventCategory
            AuditLogService.record(
                actor=user,
                action=f"Created FIR #{fir.fir_number}",
                event_type=AuditEventType.FIR_CREATED,
                category=AuditEventCategory.FIR,
                resource_type="FIR",
                resource_id=fir.fir_number or str(fir.id),
                station=fir.station or getattr(user, 'station', None),
                description=f"First Information Report registered: {fir.fir_number} - {fir.description[:100]}",
                metadata={'fir_number': fir.fir_number, 'status': fir.status, 'station_id': fir.station_id if fir.station else None}
            )
        except Exception:
            pass
        return fir

    @staticmethod
    def get_firs(user):
        return CrimeRepository.get_firs(user)

    @staticmethod
    def create_complaint(user, data):
        if user.role == 'STATION' and user.station:
            data['station'] = user.station
        complaint = CrimeRepository.create_complaint(data)
        
        try:
            from intelligence.audit_service import AuditLogService
            from intelligence.models import AuditEventType, AuditEventCategory
            AuditLogService.record(
                actor=user,
                action=f"Submitted Complaint #{complaint.id}",
                event_type=AuditEventType.COMPLAINT_CREATED,
                category=AuditEventCategory.COMPLAINT,
                resource_type="Complaint",
                resource_id=str(complaint.id),
                station=complaint.station or getattr(user, 'station', None),
                description=f"Public complaint registered: {complaint.description[:100]}",
                metadata={'complaint_id': complaint.id, 'status': complaint.status}
            )
        except Exception:
            pass
        return complaint

    @staticmethod
    def get_complaints(user):
        return CrimeRepository.get_complaints(user)

    @staticmethod
    def create_incident(user, data):
        CrimeValidator.validate_incident(data)
        data['location'] = CrimeService.parse_location(data['location'])
        if user.role == 'STATION' and user.station:
            data['station'] = user.station
        incident = CrimeRepository.create_incident(data)
        
        try:
            from intelligence.audit_service import AuditLogService
            from intelligence.models import AuditEventType, AuditEventCategory
            AuditLogService.record(
                actor=user,
                action=f"Registered Incident #{incident.id}: {incident.title}",
                event_type=AuditEventType.INCIDENT_CREATED,
                category=AuditEventCategory.INCIDENT,
                resource_type="Incident",
                resource_id=str(incident.id),
                station=incident.station or getattr(user, 'station', None),
                description=f"Incident registered: {incident.title} (Severity: {incident.severity})",
                metadata={'incident_id': incident.id, 'title': incident.title, 'severity': incident.severity, 'status': incident.status}
            )
        except Exception:
            pass
        return incident

    @staticmethod
    def get_incidents(user):
        return CrimeRepository.get_incidents(user)

    @staticmethod
    def update_incident_status(user, incident, status):
        # Admin or Station can update status. Patrol might be able to depending on requirements,
        # but user requirements say "Ensure Station users can: ... update Incident status. Admin retains city-wide access."
        if user.role not in ['ADMIN', 'STATION']:
            raise ValueError("Permission denied to update incident status")
        old_status = incident.status
        incident.status = status
        incident.save()
        
        try:
            from intelligence.audit_service import AuditLogService
            from intelligence.models import AuditEventType, AuditEventCategory
            AuditLogService.record(
                actor=user,
                action=f"Changed Incident #{incident.id} status: {old_status} -> {status}",
                event_type=AuditEventType.INCIDENT_STATUS_CHANGED,
                category=AuditEventCategory.INCIDENT,
                resource_type="Incident",
                resource_id=str(incident.id),
                station=incident.station or getattr(user, 'station', None),
                description=f"Incident #{incident.id} ({incident.title}) status changed from {old_status} to {status}",
                metadata={'incident_id': incident.id, 'old_status': old_status, 'new_status': status}
            )
        except Exception:
            pass
        return incident

    @staticmethod
    def get_evidence(user, assignment_id=None, incident_id=None, fir_id=None):
        return CrimeRepository.get_evidence(user, assignment_id=assignment_id, incident_id=incident_id, fir_id=fir_id)

    @staticmethod
    def upload_evidence(user, data):
        data['uploaded_by'] = user
        assignment = data.get('assignment')
        incident = data.get('incident')
        if not assignment or not incident:
            raise ValueError("Both assignment and incident are required to upload evidence.")
            
        if assignment.incident != incident:
            raise ValueError("Assignment does not belong to the provided incident.")
            
        if user.role == 'PATROL_OFFICER' and assignment.officer != user:
            raise ValueError("Permission denied.")
            
        if user.role == 'STATION' and assignment.station != user.station:
            raise ValueError("Permission denied.")

        evidence = CrimeRepository.create_evidence(data)
        
        try:
            from intelligence.audit_service import AuditLogService
            from intelligence.models import AuditEventType, AuditEventCategory
            AuditLogService.record(
                actor=user,
                action=f"Uploaded evidence file for Incident #{incident.id}",
                event_type=AuditEventType.EVIDENCE_UPLOADED,
                category=AuditEventCategory.INCIDENT,
                resource_type="Evidence",
                resource_id=str(evidence.id),
                station=assignment.station or getattr(user, 'station', None),
                description=f"Evidence file uploaded for Assignment #{assignment.id} / Incident #{incident.id}",
                metadata={'evidence_id': evidence.id, 'incident_id': incident.id, 'assignment_id': assignment.id}
            )
        except Exception:
            pass
        return evidence
