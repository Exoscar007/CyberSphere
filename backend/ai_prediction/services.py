import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from django.contrib.gis.geos import Point
from django.utils import timezone

from .repository import AIPredictionRepository
from intelligence.models import RiskScore, CrimeTrend
from crimes.models import Incident, FIR


class AIPredictionService:
    RANDOM_SEED = 42  # Reproducible results

    @staticmethod
    def trigger_prediction():
        """Trigger a real AI prediction job using K-Means clustering on crime data."""
        job = AIPredictionRepository.create_job()
        try:
            AIPredictionService._run_prediction_pipeline(job)
        except Exception as e:
            job = AIPredictionRepository.update_job_status(job.id, 'FAILED', str(e))
            job.completed_at = timezone.now()
            job.save()
        return job

    @staticmethod
    def _run_prediction_pipeline(job):
        """Execute the ML pipeline: gather data, cluster, score, persist."""
        # Step 1: Gather crime location data
        crime_points = AIPredictionService._gather_crime_data()

        if len(crime_points) < 3:
            job = AIPredictionRepository.update_job_status(
                job.id, 'COMPLETED',
                f'Insufficient data ({len(crime_points)} points). Minimum 3 required.'
            )
            job.completed_at = timezone.now()
            job.save()
            return

        # Step 2: Feature engineering
        df = pd.DataFrame(crime_points, columns=['lng', 'lat', 'severity_score'])

        # Step 3: K-Means clustering for hotspot identification
        n_clusters = min(8, max(3, len(df) // 5))
        features = df[['lng', 'lat']].values
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)

        kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=AIPredictionService.RANDOM_SEED,
            n_init=10,
        )
        df['cluster'] = kmeans.fit_predict(features_scaled)

        # Step 4: Calculate risk scores per cluster
        cluster_stats = df.groupby('cluster').agg(
            count=('lng', 'size'),
            avg_severity=('severity_score', 'mean'),
            center_lng=('lng', 'mean'),
            center_lat=('lat', 'mean'),
        ).reset_index()

        max_count = cluster_stats['count'].max()
        cluster_stats['density_score'] = (cluster_stats['count'] / max_count) * 50
        cluster_stats['risk_score'] = (
            cluster_stats['density_score'] + cluster_stats['avg_severity'] * 50
        ).clip(0, 100).round(2)

        # Step 5: Persist results — clear old scores, write new ones
        RiskScore.objects.all().delete()

        zone_names = [
            'Maninagar', 'Navrangpura', 'Satellite', 'Vastrapur',
            'Bopal', 'SG Highway', 'Ellis Bridge', 'Paldi',
            'Chandkheda', 'Gota', 'Thaltej', 'Bodakdev',
        ]
        for _, row in cluster_stats.iterrows():
            idx = int(row['cluster'])
            zone_name = zone_names[idx] if idx < len(zone_names) else f'Zone {idx + 1}'
            RiskScore.objects.create(
                zone_name=zone_name,
                center=Point(float(row['center_lng']), float(row['center_lat']), srid=4326),
                score=float(row['risk_score']),
            )

        job = AIPredictionRepository.update_job_status(
            job.id, 'COMPLETED',
            f'K-Means clustering identified {n_clusters} risk zones from {len(df)} crime records.'
        )
        job.completed_at = timezone.now()
        job.save()

    @staticmethod
    def _gather_crime_data():
        """Collect geo-located crime data from Incidents and FIRs (last 30 days only)."""
        from datetime import timedelta
        
        severity_map = {'LOW': 0.2, 'MEDIUM': 0.4, 'HIGH': 0.7, 'CRITICAL': 1.0}
        points = []
        
        cutoff_date = timezone.now() - timedelta(days=30)

        for incident in Incident.objects.filter(date_occurred__gte=cutoff_date).exclude(location__isnull=True):
            points.append([
                incident.location.x,
                incident.location.y,
                severity_map.get(incident.severity, 0.4),
            ])

        for fir in FIR.objects.filter(date_reported__gte=cutoff_date).exclude(location__isnull=True):
            status_severity = 0.7 if fir.status == 'OPEN' else 0.4
            points.append([fir.location.x, fir.location.y, status_severity])

        return points

    @staticmethod
    def get_job_status(job_id):
        return AIPredictionRepository.get_job(job_id)
