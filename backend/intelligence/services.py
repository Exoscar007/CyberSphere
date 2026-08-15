from .repository import IntelligenceRepository

class IntelligenceService:
    @staticmethod
    def get_trends():
        return IntelligenceRepository.get_trends()

    @staticmethod
    def get_risk_scores():
        return IntelligenceRepository.get_risk_scores()

class TemporalAnalyticsService:
    @staticmethod
    def get_temporal_stats(station_id=None):
        """Get crime frequency by hour-of-day and day-of-week using database aggregation."""
        from zoneinfo import ZoneInfo
        from django.db.models import Count
        from django.db.models.functions import ExtractHour, ExtractWeekDay
        from crimes.models import Incident

        ist = ZoneInfo('Asia/Kolkata')
        qs = Incident.objects.all()
        if station_id:
            qs = qs.filter(station_id=station_id)

        # Hour distribution (timezone-aware)
        by_hour = list(
            qs.annotate(hour=ExtractHour('date_occurred', tzinfo=ist))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('hour')
        )
        # Fill missing hours
        hour_map = {item['hour']: item['count'] for item in by_hour}
        by_hour_full = [{'hour': h, 'count': hour_map.get(h, 0), 'label': f'{h:02d}:00'} for h in range(24)]

        # Day-of-week distribution (Django ExtractWeekDay: 1=Sunday, 2=Monday, ..., 7=Saturday)
        by_dow = list(
            qs.annotate(dow=ExtractWeekDay('date_occurred', tzinfo=ist))
            .values('dow')
            .annotate(count=Count('id'))
            .order_by('dow')
        )
        day_names = {2: 'Monday', 3: 'Tuesday', 4: 'Wednesday', 5: 'Thursday', 6: 'Friday', 7: 'Saturday', 1: 'Sunday'}
        day_order = [2, 3, 4, 5, 6, 7, 1]  # Mon-Sun
        dow_map = {item['dow']: item['count'] for item in by_dow}
        by_dow_full = [{'day': day_names[d], 'day_number': (d - 2) % 7, 'count': dow_map.get(d, 0)} for d in day_order]

        # Period info
        from django.db.models import Min, Max
        period = qs.aggregate(earliest=Min('date_occurred'), latest=Max('date_occurred'), total=Count('id'))

        return {
            'by_hour': by_hour_full,
            'by_day_of_week': by_dow_full,
            'period': {
                'start': period['earliest'].isoformat() if period['earliest'] else None,
                'end': period['latest'].isoformat() if period['latest'] else None,
                'total_incidents': period['total'],
            }
        }
