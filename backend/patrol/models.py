from django.contrib.gis.db import models
from django.conf import settings

class PatrolAssignment(models.Model):
    class Status(models.TextChoices):
        ASSIGNED = 'ASSIGNED', 'Assigned'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged'
        EN_ROUTE = 'EN_ROUTE', 'En Route'
        ARRIVED = 'ARRIVED', 'Arrived'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patrols')
    zone_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ASSIGNED)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    destination = models.PointField(srid=4326, null=True, blank=True)
    instructions = models.TextField(blank=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    station = models.ForeignKey('users.PoliceStation', on_delete=models.CASCADE, related_name='patrol_assignments', null=True, blank=True)
    incident = models.ForeignKey('crimes.Incident', on_delete=models.SET_NULL, null=True, blank=True, related_name='patrol_assignments')
    fir = models.ForeignKey('crimes.FIR', on_delete=models.SET_NULL, null=True, blank=True, related_name='patrol_assignments')

    def __str__(self):
        return f"Patrol {self.id} - {self.officer.username} - {self.status}"

class PatrolLocation(models.Model):
    assignment = models.ForeignKey(PatrolAssignment, on_delete=models.CASCADE, related_name='locations')
    location = models.PointField(srid=4326)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Location Ping for Patrol {self.assignment_id} at {self.timestamp}"

class PatrolStatusHistory(models.Model):
    assignment = models.ForeignKey(PatrolAssignment, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, choices=PatrolAssignment.Status.choices, null=True, blank=True)
    new_status = models.CharField(max_length=20, choices=PatrolAssignment.Status.choices)
    timestamp = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Status for Assignment {self.assignment_id} changed to {self.new_status}"
