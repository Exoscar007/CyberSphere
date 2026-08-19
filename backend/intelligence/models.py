from django.contrib.gis.db import models

class CrimeTrend(models.Model):
    crime_type = models.CharField(max_length=100)
    location = models.PointField(srid=4326)
    date_recorded = models.DateField()
    frequency = models.IntegerField(default=1)
    
    def __str__(self):
        return f"{self.crime_type} at {self.location} on {self.date_recorded}"

class RiskScore(models.Model):
    class RiskLevel(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    class ModelStatus(models.TextChoices):
        BASELINE = 'baseline', 'Baseline Statistical'
        TRAINED_ML = 'trained_ml', 'Trained ML Model'

    zone_name = models.CharField(max_length=100)
    center = models.PointField(srid=4326)
    score = models.FloatField()
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.MEDIUM)
    confidence = models.FloatField(null=True, blank=True)
    model_status = models.CharField(max_length=30, choices=ModelStatus.choices, default=ModelStatus.BASELINE)
    prediction_period = models.CharField(max_length=100, default='Next 24 Hours')
    factors = models.JSONField(default=dict, blank=True)
    feature_importance = models.JSONField(null=True, blank=True)
    radius_meters = models.FloatField(default=800.0)
    calculated_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.risk_level:
            if self.score >= 75:
                self.risk_level = self.RiskLevel.CRITICAL
            elif self.score >= 50:
                self.risk_level = self.RiskLevel.HIGH
            elif self.score >= 25:
                self.risk_level = self.RiskLevel.MEDIUM
            else:
                self.risk_level = self.RiskLevel.LOW
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Risk {self.score} ({self.risk_level}) in {self.zone_name}"


from django.conf import settings

class AuditEventCategory(models.TextChoices):
    AUTH = 'AUTH', 'Authentication & Security'
    FIR = 'FIR', 'First Information Report'
    INCIDENT = 'INCIDENT', 'Incident Management'
    COMPLAINT = 'COMPLAINT', 'Public Complaint'
    PATROL = 'PATROL', 'Patrol & Deployment'
    USER = 'USER', 'User Administration'
    INTELLIGENCE = 'INTELLIGENCE', 'Intelligence & Analytics'
    SYSTEM = 'SYSTEM', 'System Operations'

class AuditEventType(models.TextChoices):
    # AUTH
    LOGIN_SUCCESS = 'LOGIN_SUCCESS', 'Login Success'
    LOGIN_FAILURE = 'LOGIN_FAILURE', 'Login Failure'
    MFA_CHALLENGE = 'MFA_CHALLENGE', 'MFA Challenge Issued'
    MFA_VERIFY_SUCCESS = 'MFA_VERIFY_SUCCESS', 'MFA Verification Succeeded'
    MFA_VERIFY_FAILURE = 'MFA_VERIFY_FAILURE', 'MFA Verification Failed'
    MFA_ENABLED = 'MFA_ENABLED', 'MFA Enabled'
    MFA_DISABLED = 'MFA_DISABLED', 'MFA Disabled'
    
    # FIR
    FIR_CREATED = 'FIR_CREATED', 'FIR Created'
    FIR_STATUS_CHANGED = 'FIR_STATUS_CHANGED', 'FIR Status Changed'
    
    # INCIDENT
    INCIDENT_CREATED = 'INCIDENT_CREATED', 'Incident Created'
    INCIDENT_STATUS_CHANGED = 'INCIDENT_STATUS_CHANGED', 'Incident Status Changed'
    
    # COMPLAINT
    COMPLAINT_CREATED = 'COMPLAINT_CREATED', 'Complaint Created'
    COMPLAINT_RESOLVED = 'COMPLAINT_RESOLVED', 'Complaint Resolved'
    
    # PATROL
    PATROL_DISPATCHED = 'PATROL_DISPATCHED', 'Patrol Dispatched'
    PATROL_STATUS_CHANGED = 'PATROL_STATUS_CHANGED', 'Patrol Status Changed'
    PATROL_ACKNOWLEDGED = 'PATROL_ACKNOWLEDGED', 'Patrol Acknowledged'
    PATROL_ARRIVED = 'PATROL_ARRIVED', 'Patrol Arrived at Scene'
    PATROL_COMPLETED = 'PATROL_COMPLETED', 'Patrol Completed'
    PATROL_CANCELLED = 'PATROL_CANCELLED', 'Patrol Cancelled'
    
    # EVIDENCE
    EVIDENCE_UPLOADED = 'EVIDENCE_UPLOADED', 'Evidence Uploaded'
    
    # USER
    USER_CREATED = 'USER_CREATED', 'User Account Created'
    USER_UPDATED = 'USER_UPDATED', 'User Account Updated'
    USER_DELETED = 'USER_DELETED', 'User Account Deleted'
    
    # INTELLIGENCE
    AI_PREDICTION_GENERATED = 'AI_PREDICTION_GENERATED', 'AI Prediction Generated'
    INTELLIGENCE_ACTION_RECORDED = 'INTELLIGENCE_ACTION_RECORDED', 'Intelligence Action Recorded'
    RISK_ASSESSMENT_RECORDED = 'RISK_ASSESSMENT_RECORDED', 'Risk Assessment Recorded'
    
    # SYSTEM
    SYSTEM_HEALTH_CHECK = 'SYSTEM_HEALTH_CHECK', 'System Health Check'
    REPORT_GENERATED = 'REPORT_GENERATED', 'Report Generated'

class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        db_index=True,
    )
    action = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=AuditEventCategory.choices, default=AuditEventCategory.SYSTEM, db_index=True)
    event_type = models.CharField(max_length=50, choices=AuditEventType.choices, db_index=True)
    description = models.TextField()
    resource_type = models.CharField(max_length=100, db_index=True)
    resource_id = models.CharField(max_length=100, db_index=True, null=True, blank=True)
    station = models.ForeignKey(
        'users.PoliceStation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        db_index=True,
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=50, default='SUCCESS', db_index=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['actor', '-timestamp']),
            models.Index(fields=['event_type', '-timestamp']),
            models.Index(fields=['category', '-timestamp']),
            models.Index(fields=['station', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def save(self, *args, **kwargs):
        if not self.category or self.category == AuditEventCategory.SYSTEM:
            if self.event_type.startswith(('LOGIN_', 'MFA_')):
                self.category = AuditEventCategory.AUTH
            elif self.event_type.startswith('FIR_'):
                self.category = AuditEventCategory.FIR
            elif self.event_type.startswith('INCIDENT_'):
                self.category = AuditEventCategory.INCIDENT
            elif self.event_type.startswith('COMPLAINT_'):
                self.category = AuditEventCategory.COMPLAINT
            elif self.event_type.startswith('PATROL_'):
                self.category = AuditEventCategory.PATROL
            elif self.event_type.startswith('USER_'):
                self.category = AuditEventCategory.USER
            elif self.event_type.startswith(('AI_', 'INTELLIGENCE_', 'RISK_')):
                self.category = AuditEventCategory.INTELLIGENCE
            elif self.event_type.startswith('EVIDENCE_'):
                self.category = AuditEventCategory.INCIDENT
        super().save(*args, **kwargs)

    def __str__(self):
        actor_name = self.actor.username if self.actor else 'System'
        return f"[{self.timestamp}] {self.event_type} by {actor_name} on {self.resource_type}#{self.resource_id}"

