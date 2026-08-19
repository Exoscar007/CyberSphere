import re
from collections import Counter
from datetime import timedelta
from django.utils import timezone
from django.contrib.gis.measure import D
from django.db.models import Q, Count, Min, Max
from .repository import IntelligenceRepository
from .models import CrimeTrend, RiskScore
from crimes.repository import CrimeRepository
from patrol.repository import PatrolRepository

class IntelligenceService:
    @staticmethod
    def get_trends():
        return IntelligenceRepository.get_trends()

    @staticmethod
    def get_risk_scores(user=None, station_id=None, min_score=None, risk_level=None):
        return IntelligenceRepository.get_risk_scores(
            user=user, station_id=station_id, min_score=min_score, risk_level=risk_level
        )

    @staticmethod
    def _extract_crime_category(title, description=''):
        """Extract a standardized crime category from incident/FIR titles and descriptions."""
        text = f"{title} {description}".lower()
        if re.search(r'chain\s*snatch|snatch|loot|robbery|armed', text):
            return 'Chain Snatching & Robbery'
        if re.search(r'vehicle|car|suv|bike|motorcycle|auto\s*theft', text):
            return 'Vehicle Theft'
        if re.search(r'burglar|house\s*break|break-in|trespass', text):
            return 'Burglary & Housebreaking'
        if re.search(r'phish|upi|scam|cyber|fraud|otp|financial\s*fraud', text):
            return 'Cyber & Financial Fraud'
        if re.search(r'assault|fight|clash|altercation|battery|violence', text):
            return 'Physical Assault & Altercation'
        if re.search(r'traffic|collision|accident|hit\s*and\s*run', text):
            return 'Traffic Incident & Collision'
        if re.search(r'theft|stolen|larceny|pickpocket', text):
            return 'Theft & Larceny'
        if re.search(r'missing|search\s*alert|kidnap', text):
            return 'Missing Person Alert'
        if re.search(r'narcotic|drug|contraband|liquor', text):
            return 'Contraband & Narcotics'
        return 'General Public Order'

    @staticmethod
    def _calculate_trend(incident_dates):
        """
        Calculate trend from a list of datetime objects.
        Returns 'INCREASING', 'STABLE', 'DECREASING', or 'Insufficient historical data'.
        """
        if not incident_dates or len(incident_dates) < 2:
            return 'Insufficient historical data', 'Insufficient historical data to calculate trend'

        sorted_dates = sorted(incident_dates)
        earliest = sorted_dates[0]
        latest = sorted_dates[-1]

        # If all incidents occurred within less than 2 hours of each other, insufficient temporal span
        total_span = (latest - earliest).total_seconds()
        if total_span < 7200:  # 2 hours
            return 'Insufficient historical data', 'Insufficient historical data (concentrated event window)'

        midpoint = earliest + timedelta(seconds=total_span / 2.0)
        first_half_count = sum(1 for d in sorted_dates if d <= midpoint)
        second_half_count = sum(1 for d in sorted_dates if d > midpoint)

        if second_half_count > first_half_count * 1.2:
            pct_increase = int(((second_half_count - first_half_count) / max(1, first_half_count)) * 100)
            return 'INCREASING', f'+{pct_increase}% increase in recent period'
        elif second_half_count < first_half_count * 0.8:
            pct_decrease = int(((first_half_count - second_half_count) / max(1, first_half_count)) * 100)
            return 'DECREASING', f'-{pct_decrease}% decrease in recent period'
        else:
            return 'STABLE', 'Activity rate stable across monitoring baseline'

    @staticmethod
    def get_intelligence_summary(user, params=None):
        params = params or {}
        station_id = params.get('station_id')
        min_score = params.get('min_score')
        risk_level = params.get('risk_level')

        # Determine user scope
        if user.role == 'STATION' and user.station:
            user_scope = f"{user.station.name} ({user.station.station_code})"
            target_station = user.station
        elif user.role == 'PATROL_OFFICER' and user.station:
            user_scope = f"{user.station.name} (Patrol {user.username})"
            target_station = user.station
        else:
            user_scope = 'CITYWIDE COMMAND'
            target_station = None

        # Fetch base scoped querysets
        incidents_qs = CrimeRepository.get_incidents(user)
        firs_qs = CrimeRepository.get_firs(user)
        complaints_qs = CrimeRepository.get_complaints(user)
        active_patrols_qs = IntelligenceRepository.get_active_patrols(user)

        # Fetch risk scores
        risk_scores_qs = IntelligenceRepository.get_risk_scores(
            user=user, station_id=station_id, min_score=min_score, risk_level=risk_level
        )

        all_active_patrols = list(active_patrols_qs)
        all_incidents = list(incidents_qs)
        all_firs = list(firs_qs)

        # Global dominant threat
        all_crime_categories = [
            IntelligenceService._extract_crime_category(inc.title, inc.description) for inc in all_incidents
        ] + [
            IntelligenceService._extract_crime_category(f.description) for f in all_firs
        ]
        dominant_city_threat = (
            Counter(all_crime_categories).most_common(1)[0][0] if all_crime_categories else 'General Public Order'
        )

        zone_intelligence_list = []

        for zone in risk_scores_qs:
            center = zone.center
            query_radius = max(zone.radius_meters or 800.0, 2500.0)

            # Spatial filtering for this zone
            zone_incidents = [
                inc for inc in all_incidents
                if inc.location and zone.center.distance(inc.location) * 111320.0 <= query_radius
            ]
            zone_firs = [
                f for f in all_firs
                if f.location and zone.center.distance(f.location) * 111320.0 <= query_radius
            ]

            # Matching active patrols
            matching_patrols = []
            for p in all_active_patrols:
                is_match = False
                if p.destination and zone.center.distance(p.destination) * 111320.0 <= query_radius:
                    is_match = True
                elif p.zone_name and (
                    p.zone_name.lower() in zone.zone_name.lower() or zone.zone_name.lower() in p.zone_name.lower()
                ):
                    is_match = True
                if is_match:
                    matching_patrols.append(p)

            patrol_officer_names = list({p.officer.username for p in matching_patrols if p.officer})
            active_patrols_count = len(matching_patrols)

            # Dominant crime in this zone
            zone_crimes = [
                IntelligenceService._extract_crime_category(inc.title, inc.description) for inc in zone_incidents
            ] + [
                IntelligenceService._extract_crime_category(f.description) for f in zone_firs
            ]
            if zone_crimes:
                crime_counts = Counter(zone_crimes)
                dominant_crime, dominant_count = crime_counts.most_common(1)[0]
                dominant_pct = round((dominant_count / len(zone_crimes)) * 100, 1)
            else:
                dominant_crime = 'General Public Order'
                dominant_pct = 0.0

            # Trend calculation
            incident_dates = [inc.date_occurred for inc in zone_incidents if inc.date_occurred]
            trend, trend_label = IntelligenceService._calculate_trend(incident_dates)

            # Contributing factors
            critical_inc_count = sum(1 for inc in zone_incidents if inc.severity == 'CRITICAL')
            high_inc_count = sum(1 for inc in zone_incidents if inc.severity == 'HIGH')

            contributing_factors = []
            if zone_incidents:
                sev_breakdown = []
                if critical_inc_count > 0:
                    sev_breakdown.append(f"{critical_inc_count} critical")
                if high_inc_count > 0:
                    sev_breakdown.append(f"{high_inc_count} high")
                sev_text = f" ({', '.join(sev_breakdown)})" if sev_breakdown else ""
                contributing_factors.append(f"{len(zone_incidents)} recent incident(s) recorded in sector{sev_text}")
            else:
                contributing_factors.append("No immediate active incidents reported in 24h sector window")

            if dominant_pct > 0:
                contributing_factors.append(f"{dominant_crime} is primary crime pattern ({dominant_pct:.0f}% of sector volume)")

            if zone_firs:
                contributing_factors.append(f"{len(zone_firs)} registered FIR investigation(s) active in vicinity")

            if active_patrols_count == 0:
                contributing_factors.append("Zero active patrol units currently deployed in this sector")
            else:
                officer_str = f" ({', '.join(patrol_officer_names[:2])})" if patrol_officer_names else ""
                contributing_factors.append(f"{active_patrols_count} active patrol unit(s) covering beat{officer_str}")

            if zone.score:
                contributing_factors.append(f"AI predictive risk score evaluated at {zone.score:.1f} / 100 ({zone.risk_level})")

            # Deterministic recommendation & priority action
            score = zone.score or 0.0
            risk_level_val = zone.risk_level or 'MEDIUM'

            if score >= 75 or risk_level_val == 'CRITICAL':
                if active_patrols_count == 0:
                    recommendation = (
                        f"Urgent: Dispatch available rapid-response units to {zone.zone_name} immediately "
                        f"to address critical {dominant_crime} threat and establish command perimeter."
                    )
                    priority_action = "Dispatch Available Unit"
                else:
                    recommendation = (
                        f"Increase high-visibility patrol density in {zone.zone_name} during peak hours; "
                        f"prioritize active interdiction for {dominant_crime}."
                    )
                    priority_action = "Increase Patrol Coverage"
            elif score >= 50 or risk_level_val == 'HIGH':
                if trend == 'INCREASING':
                    recommendation = (
                        f"Escalate proactive patrols in {zone.zone_name} to curb rising {dominant_crime} activity; "
                        f"cross-reference recent FIR leads with field units."
                    )
                    priority_action = "Monitor Emerging Crime Pattern"
                else:
                    recommendation = (
                        f"Maintain dedicated patrol coverage in {zone.zone_name} and conduct targeted surveillance "
                        f"against {dominant_crime}."
                    )
                    priority_action = "Maintain Patrol Coverage"
            elif score >= 25 or risk_level_val == 'MEDIUM':
                recommendation = (
                    f"Maintain standard patrol frequency in {zone.zone_name}; monitor incoming incident telemetry."
                )
                priority_action = "Monitor Zone Closely"
            else:
                recommendation = (
                    f"Baseline operational security in {zone.zone_name}; continue standard surveillance protocols."
                )
                priority_action = "Maintain Baseline Readiness"

            center_data = {
                "type": "Point",
                "coordinates": [zone.center.x, zone.center.y]
            } if zone.center else None

            zone_intelligence_list.append({
                'id': zone.id,
                'zone_name': zone.zone_name,
                'center': center_data,
                'radius_meters': zone.radius_meters,
                'score': round(score, 1),
                'risk_level': risk_level_val,
                'confidence': zone.confidence,
                'model_status': zone.model_status,
                'prediction_period': zone.prediction_period,
                'recent_incidents_count': len(zone_incidents),
                'recent_firs_count': len(zone_firs),
                'recent_complaints_count': 0,
                'dominant_crime': dominant_crime,
                'dominant_crime_percentage': dominant_pct,
                'active_patrols_count': active_patrols_count,
                'patrol_officers': patrol_officer_names,
                'trend': trend,
                'trend_label': trend_label,
                'contributing_factors': contributing_factors,
                'recommendation': recommendation,
                'priority_action': priority_action,
                'last_updated': zone.calculated_at,
            })

        # Priority queue ranking (ordered by score descending, then incident count)
        sorted_zones = sorted(
            zone_intelligence_list,
            key=lambda z: (z['score'], z['recent_incidents_count']),
            reverse=True
        )

        priority_queue = []
        for idx, z in enumerate(sorted_zones[:6], start=1):
            priority_queue.append({
                'rank': idx,
                'zone_name': z['zone_name'],
                'score': z['score'],
                'risk_level': z['risk_level'],
                'trend': z['trend'],
                'dominant_crime': z['dominant_crime'],
                'active_patrols': z['active_patrols_count'],
                'recommendation': z['recommendation'],
                'priority_action': z['priority_action'],
                'center': z['center'],
            })

        # Overview KPI metrics
        total_zones = len(zone_intelligence_list)
        critical_count = sum(1 for z in zone_intelligence_list if z['score'] >= 75 or z['risk_level'] == 'CRITICAL')
        high_count = sum(1 for z in zone_intelligence_list if 50 <= z['score'] < 75 or (z['risk_level'] == 'HIGH' and z['score'] < 75))
        med_count = sum(1 for z in zone_intelligence_list if 25 <= z['score'] < 50 or (z['risk_level'] == 'MEDIUM' and z['score'] < 50))
        low_count = sum(1 for z in zone_intelligence_list if z['score'] < 25 or z['risk_level'] == 'LOW')

        distinct_patrol_officers = set()
        for p in all_active_patrols:
            if p.officer:
                distinct_patrol_officers.add(p.officer.username)

        overview = {
            'total_monitored_zones': total_zones,
            'critical_zones': critical_count,
            'high_risk_zones': high_count,
            'medium_risk_zones': med_count,
            'low_risk_zones': low_count,
            'active_patrol_coverage': len(distinct_patrol_officers),
            'total_recent_incidents': len(all_incidents),
            'total_recent_firs': len(all_firs),
            'dominant_city_threat': dominant_city_threat,
        }

        return {
            'overview': overview,
            'priority_queue': priority_queue,
            'zones': sorted_zones,
            'timestamp': timezone.now(),
            'user_scope': user_scope,
        }

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
