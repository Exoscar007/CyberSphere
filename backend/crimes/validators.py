from rest_framework.exceptions import ValidationError

class CrimeValidator:
    @staticmethod
    def validate_geojson_point(location):
        if not location:
            raise ValidationError("Location is required.")
        if not isinstance(location, dict):
            raise ValidationError("Location must be a GeoJSON dictionary.")
        if location.get('type') != 'Point':
            raise ValidationError("Location type must be 'Point'.")
        coords = location.get('coordinates')
        if not isinstance(coords, list) or len(coords) != 2:
            raise ValidationError("Location coordinates must be a list of two floats [lng, lat].")
        try:
            float(coords[0])
            float(coords[1])
        except (ValueError, TypeError):
            raise ValidationError("Coordinates must be valid numbers.")

    @staticmethod
    def validate_fir(data):
        if not data.get('fir_number'):
            raise ValidationError("fir_number is required.")
        CrimeValidator.validate_geojson_point(data.get('location'))

    @staticmethod
    def validate_incident(data):
        if not data.get('title'):
            raise ValidationError("title is required.")
        CrimeValidator.validate_geojson_point(data.get('location'))
