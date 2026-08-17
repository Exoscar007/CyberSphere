from django.contrib.gis.db import models

class CrimeTrend(models.Model):
    crime_type = models.CharField(max_length=100)
    location = models.PointField(srid=4326)
    date_recorded = models.DateField()
    frequency = models.IntegerField(default=1)
    
    def __str__(self):
        return f"{self.crime_type} at {self.location} on {self.date_recorded}"

class RiskScore(models.Model):
    zone_name = models.CharField(max_length=100)
    center = models.PointField(srid=4326)
    score = models.FloatField()
    calculated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Risk {self.score} in {self.zone_name}"
