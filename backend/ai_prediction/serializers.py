from rest_framework import serializers
from .models import PredictionJob

class PredictionJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionJob
        fields = '__all__'
