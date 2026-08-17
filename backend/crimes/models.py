from django.contrib.gis.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class FIR(models.Model):
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        INVESTIGATING = 'INVESTIGATING', 'Investigating'
        CLOSED = 'CLOSED', 'Closed'

    fir_number = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    date_reported = models.DateTimeField(auto_now_add=True)
    location = models.PointField(srid=4326)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    station = models.ForeignKey('users.PoliceStation', on_delete=models.CASCADE, related_name='firs', null=True, blank=True)

    def __str__(self):
        return f"FIR: {self.fir_number}"

class Complaint(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        RESOLVED = 'RESOLVED', 'Resolved'

    description = models.TextField()
    date_filed = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    station = models.ForeignKey('users.PoliceStation', on_delete=models.CASCADE, related_name='complaints', null=True, blank=True)

    def __str__(self):
        return f"Complaint {self.id}"

class Incident(models.Model):
    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        RESOLVED = 'RESOLVED', 'Resolved'
        CANCELLED = 'CANCELLED', 'Cancelled'

    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.PointField(srid=4326)
    date_occurred = models.DateTimeField()
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    station = models.ForeignKey('users.PoliceStation', on_delete=models.CASCADE, related_name='incidents', null=True, blank=True)

    def __str__(self):
        return self.title

class Evidence(models.Model):
    fir = models.ForeignKey(FIR, on_delete=models.SET_NULL, related_name='evidence', null=True, blank=True)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='evidence', null=True, blank=True)
    assignment = models.ForeignKey('patrol.PatrolAssignment', on_delete=models.CASCADE, related_name='evidence', null=True, blank=True)
    file = models.FileField(upload_to='evidence/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        if self.fir:
            return f"Evidence for FIR {self.fir.fir_number}"
        if self.assignment:
            return f"Evidence for Assignment {self.assignment_id}"
        return f"Evidence {self.id}"
