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
        return CrimeRepository.create_fir(data)

    @staticmethod
    def get_firs(user):
        return CrimeRepository.get_firs(user)

    @staticmethod
    def create_complaint(user, data):
        if user.role == 'STATION' and user.station:
            data['station'] = user.station
        return CrimeRepository.create_complaint(data)

    @staticmethod
    def get_complaints(user):
        return CrimeRepository.get_complaints(user)

    @staticmethod
    def create_incident(user, data):
        CrimeValidator.validate_incident(data)
        data['location'] = CrimeService.parse_location(data['location'])
        if user.role == 'STATION' and user.station:
            data['station'] = user.station
        return CrimeRepository.create_incident(data)

    @staticmethod
    def get_incidents(user):
        return CrimeRepository.get_incidents(user)

    @staticmethod
    def update_incident_status(user, incident, status):
        # Admin or Station can update status. Patrol might be able to depending on requirements,
        # but user requirements say "Ensure Station users can: ... update Incident status. Admin retains city-wide access."
        if user.role not in ['ADMIN', 'STATION']:
            raise ValueError("Permission denied to update incident status")
        incident.status = status
        incident.save()
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

        return CrimeRepository.create_evidence(data)
