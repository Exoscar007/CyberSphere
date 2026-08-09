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
        return CrimeRepository.create_fir(data)

    @staticmethod
    def get_firs():
        return CrimeRepository.get_firs()

    @staticmethod
    def create_complaint(data):
        return CrimeRepository.create_complaint(data)

    @staticmethod
    def get_complaints():
        return CrimeRepository.get_complaints()

    @staticmethod
    def create_incident(data):
        CrimeValidator.validate_incident(data)
        data['location'] = CrimeService.parse_location(data['location'])
        return CrimeRepository.create_incident(data)

    @staticmethod
    def get_incidents():
        return CrimeRepository.get_incidents()

    @staticmethod
    def get_evidence(fir_id):
        return CrimeRepository.get_evidence_for_fir(fir_id)

    @staticmethod
    def upload_evidence(fir_id, file, user):
        fir = CrimeRepository.get_fir_by_id(fir_id)
        if not fir:
            return None
        return CrimeRepository.create_evidence(fir, file, user)
