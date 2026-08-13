from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _

class PoliceStation(models.Model):
    station_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    address = models.TextField()
    location = models.PointField(srid=4326, null=True, blank=True)
    jurisdiction = models.PolygonField(srid=4326, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.station_code})"

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrator')
        STATION = 'STATION', _('Station Console')
        PATROL_OFFICER = 'PATROL', _('Patrol Officer')

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STATION,
    )
    badge_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    station = models.ForeignKey(PoliceStation, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"
