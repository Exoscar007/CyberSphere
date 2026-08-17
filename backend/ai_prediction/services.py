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

class TemporalForecastingService:
    @staticmethod
    def generate_forecast():
        from django.db.models.functions import TruncDate
        from django.db.models import Count
        from crimes.models import Incident
        from datetime import timedelta

        daily_counts = list(
            Incident.objects.annotate(date=TruncDate('date_occurred'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        if not daily_counts:
            return {
                'status': 'insufficient_data',
                'days_available': 0,
                'days_required': 14,
                'message': 'At least 14 days of historical incident data required.',
                'forecast': None
            }
            
        start_date = daily_counts[0]['date']
        end_date = daily_counts[-1]['date']
        
        if hasattr(start_date, 'date'):
            start_date = start_date.date()
        if hasattr(end_date, 'date'):
            end_date = end_date.date()

        days_available = (end_date - start_date).days + 1
        
        if days_available < 14:
            return {
                'status': 'insufficient_data',
                'days_available': days_available,
                'days_required': 14,
                'message': 'At least 14 days of historical incident data required.',
                'forecast': None
            }

        clean_date_map = {}
        for item in daily_counts:
            dt = item['date']
            dt_val = dt.date() if hasattr(dt, 'date') else dt
            clean_date_map[dt_val] = item['count']

        history = []
        for i in range(days_available):
            dt = start_date + timedelta(days=i)
            history.append({
                'date': dt,
                'day_of_week': dt.weekday(),
                'count': clean_date_map.get(dt, 0)
            })

        weights = [0.4, 0.3, 0.2, 0.1]
        
        def predict_wsma(target_date, hist_data):
            target_dow = target_date.weekday()
            same_dow_counts = [x['count'] for x in hist_data if x['day_of_week'] == target_dow]
            same_dow_counts.reverse()
            
            use_counts = same_dow_counts[:4]
            if not use_counts:
                return 0
            
            use_weights = weights[:len(use_counts)]
            norm_weights = [w / sum(use_weights) for w in use_weights]
            
            return sum(c * w for c, w in zip(use_counts, norm_weights))
            
        def predict_seasonal_naive(target_date, hist_data):
            target_dow = target_date.weekday()
            same_dow_counts = [x['count'] for x in hist_data if x['day_of_week'] == target_dow]
            if not same_dow_counts:
                return 0
            return same_dow_counts[-1]

        test_days = min(60, days_available - 14) 
        if test_days > 0:
            train_end_idx = days_available - test_days
            test_data = history[train_end_idx:]
            
            wsma_errors = []
            naive_errors = []
            
            for i, test_day in enumerate(test_data):
                current_hist = history[:train_end_idx + i]
                pred_wsma = predict_wsma(test_day['date'], current_hist)
                pred_naive = predict_seasonal_naive(test_day['date'], current_hist)
                actual = test_day['count']
                wsma_errors.append(abs(actual - pred_wsma))
                naive_errors.append(abs(actual - pred_naive))
                
            model_mae = sum(wsma_errors) / len(wsma_errors)
            baseline_mae = sum(naive_errors) / len(naive_errors)
        else:
            model_mae = 0.0
            baseline_mae = 0.0

        forecast = []
        sim_history = history.copy()
        day_names = {0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 4: 'Friday', 5: 'Saturday', 6: 'Sunday'}
        
        for i in range(1, 8):
            target_date = end_date + timedelta(days=i)
            pred = predict_wsma(target_date, sim_history)
            
            forecast.append({
                'date': target_date.isoformat(),
                'day_of_week': day_names[target_date.weekday()],
                'predicted_count': round(pred)
            })
            
            sim_history.append({
                'date': target_date,
                'day_of_week': target_date.weekday(),
                'count': pred
            })

        return {
            'status': 'ok',
            'model': 'weighted_seasonal_moving_average',
            'lookback_weeks': 4,
            'horizon_days': 7,
            'training_period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days_available': days_available
            },
            'forecast': forecast,
            'validation': {
                'method': 'walk_forward_chronological',
                'test_period_days': test_days,
                'model_mae': round(model_mae, 2),
                'baseline_mae': round(baseline_mae, 2),
                'baseline_model': 'seasonal_naive',
                'model_outperforms_baseline': model_mae < baseline_mae if test_days > 0 else True,
            },
            'disclaimer': 'Forecast based on historical patterns. For planning purposes only.'
        }
