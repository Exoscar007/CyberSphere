from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrator')
        POLICE_OFFICER = 'POLICE', _('Police Officer')
        STATION = 'STATION', _('Station Console')
        PATROL_OFFICER = 'PATROL', _('Patrol Officer')

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.POLICE_OFFICER,
    )
    badge_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"
