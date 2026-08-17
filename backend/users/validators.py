from rest_framework.exceptions import ValidationError

class AuthValidator:
    @staticmethod
    def validate_login_payload(data):
        if not data.get('username') or not data.get('password'):
            raise ValidationError("Username and password are required.")
