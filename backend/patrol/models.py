from django.contrib.gis.db import models
from django.conf import settings

class PatrolAssignment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patrols')
    zone_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Patrol {self.id} - {self.officer.username} - {self.status}"

class PatrolLocation(models.Model):
    assignment = models.ForeignKey(PatrolAssignment, on_delete=models.CASCADE, related_name='locations')
    location = models.PointField(srid=4326)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Location Ping for Patrol {self.assignment_id} at {self.timestamp}"
