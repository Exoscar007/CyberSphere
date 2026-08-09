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

    def __str__(self):
        return f"FIR: {self.fir_number}"

class Complaint(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        RESOLVED = 'RESOLVED', 'Resolved'

    description = models.TextField()
    date_filed = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    def __str__(self):
        return f"Complaint {self.id}"

class Incident(models.Model):
    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.PointField(srid=4326)
    date_occurred = models.DateTimeField()
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)

    def __str__(self):
        return self.title

class Evidence(models.Model):
    fir = models.ForeignKey(FIR, on_delete=models.CASCADE, related_name='evidence')
    file = models.FileField(upload_to='evidence/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Evidence for FIR {self.fir.fir_number}"
