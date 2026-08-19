"""
backend/ai_prediction/pipeline.py

Feature Extraction and Spatial-Temporal Data Pipeline for CyberSphere.
Extracts predictive features directly from PostgreSQL/PostGIS Incident, FIR, and Station records.
"""

import math
from datetime import timedelta
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.db.models import Q

from crimes.models import Incident, FIR
from users.models import PoliceStation


# City Sectors Definition (Ahmedabad Metropolitan & Police Jurisdictions)
SECTOR_DEFINITIONS = [
    {
        'id': 'SEC-NAV-01',
        'name': 'Navrangpura Commercial',
        'lat': 23.0395,
        'lng': 72.5571,
        'radius_m': 1000,
        'station_code': 'NAV-01',
    },
    {
        'id': 'SEC-SAT-02',
        'name': 'Satellite Residential',
        'lat': 23.0280,
        'lng': 72.5140,
        'radius_m': 1100,
        'station_code': 'SAT-02',
    },
    {
        'id': 'SEC-VAS-03',
        'name': 'Vastrapur Lake Corridor',
        'lat': 23.0350,
        'lng': 72.5290,
        'radius_m': 950,
        'station_code': 'SAT-02',
    },
    {
        'id': 'SEC-MAN-04',
        'name': 'Maninagar South Hub',
        'lat': 22.9980,
        'lng': 72.6020,
        'radius_m': 1200,
        'station_code': None,
    },
    {
        'id': 'SEC-BOP-05',
        'name': 'Bopal Ring Road',
        'lat': 23.0340,
        'lng': 72.4640,
        'radius_m': 1300,
        'station_code': None,
    },
    {
        'id': 'SEC-SGH-06',
        'name': 'SG Highway IT Corridor',
        'lat': 23.0520,
        'lng': 72.5080,
        'radius_m': 1400,
        'station_code': None,
    },
    {
        'id': 'SEC-PAL-07',
        'name': 'Paldi Central',
        'lat': 23.0130,
        'lng': 72.5620,
        'radius_m': 900,
        'station_code': 'NAV-01',
    },
    {
        'id': 'SEC-CYB-08',
        'name': 'GIFT-Gandhinagar Cyber Hub',
        'lat': 23.1600,
        'lng': 72.6840,
        'radius_m': 1500,
        'station_code': None,
    },
]

# Cybercrime keyword classification
CYBER_KEYWORDS = [
    'cyber', 'online', 'fraud', 'phishing', 'otp', 'skimming', 'ransomware',
    'extortion', 'identity theft', 'upi', 'crypto', 'hack', 'credential',
    'stalking', 'social media', 'impersonation', 'carding', 'sim swap'
]

VIOLENT_KEYWORDS = [
    'assault', 'attack', 'battery', 'robbery', 'homicide', 'murder',
    'violence', 'kidnap', 'weapon', 'stabbing', 'threat'
]

PROPERTY_KEYWORDS = [
    'theft', 'burglary', 'stolen', 'break-in', 'shoplifting', 'larceny',
    'vehicle theft', 'pickpocket', 'trespass', 'property'
]


def classify_crime_category(title, description=''):
    """Classify incident/FIR text into high-level crime domain."""
    text = f"{title or ''} {description or ''}".lower()
    for kw in CYBER_KEYWORDS:
        if kw in text:
            return 'CYBER'
    for kw in VIOLENT_KEYWORDS:
        if kw in text:
            return 'VIOLENT'
    for kw in PROPERTY_KEYWORDS:
        if kw in text:
            return 'PROPERTY'
    return 'PUBLIC_ORDER'


def haversine_km(lat1, lon1, lat2, lon2):
    """Haversine formula for spherical distance in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class FeatureExtractionPipeline:
    """
    Extracts database-driven spatial and temporal features per geographic zone.
    Operates strictly on live database records.
    """

    @classmethod
    def get_sectors(cls):
        """Returns the list of geographic sectors/zones."""
        stations = list(PoliceStation.objects.filter(is_active=True).exclude(location__isnull=True))
        sectors = list(SECTOR_DEFINITIONS)

        existing_names = {s['name'].lower() for s in sectors}
        for stn in stations:
            stn_name = f"{stn.name} Sector"
            if stn_name.lower() not in existing_names and stn.location:
                sectors.append({
                    'id': f"SEC-STN-{stn.id}",
                    'name': stn.name,
                    'lat': stn.location.y,
                    'lng': stn.location.x,
                    'radius_m': 1000,
                    'station_code': stn.station_code,
                })
                existing_names.add(stn_name.lower())

        return sectors

    @classmethod
    def extract_zone_features(cls, as_of_time=None):
        """
        Extract complete feature dictionary for all geographic zones from live DB.
        """
        if as_of_time is None:
            as_of_time = timezone.now()

        sectors = cls.get_sectors()

        t_24h = as_of_time - timedelta(hours=24)
        t_7d = as_of_time - timedelta(days=7)
        t_14d = as_of_time - timedelta(days=14)
        t_30d = as_of_time - timedelta(days=30)
        t_90d = as_of_time - timedelta(days=90)

        incidents_30d = list(
            Incident.objects.filter(date_occurred__lte=as_of_time, date_occurred__gte=t_90d)
            .exclude(location__isnull=True)
            .values('id', 'title', 'description', 'location', 'date_occurred', 'severity', 'status')
        )
        firs_30d = list(
            FIR.objects.filter(date_reported__lte=as_of_time, date_reported__gte=t_90d)
            .exclude(location__isnull=True)
            .values('id', 'fir_number', 'description', 'location', 'date_reported', 'status')
        )

        stations = list(
            PoliceStation.objects.filter(is_active=True).exclude(location__isnull=True).values('id', 'station_code', 'location')
        )

        events = []
        for inc in incidents_30d:
            pt = inc['location']
            dt = inc['date_occurred']
            sev = inc['severity']
            weight = 1.0 if sev == 'CRITICAL' else 0.75 if sev == 'HIGH' else 0.5 if sev == 'MEDIUM' else 0.25
            cat = classify_crime_category(inc['title'], inc['description'])
            events.append({
                'id': f"INC-{inc['id']}",
                'lat': pt.y,
                'lng': pt.x,
                'time': dt,
                'weight': weight,
                'category': cat,
                'is_night': dt.hour >= 20 or dt.hour < 6,
                'hour': dt.hour,
                'is_weekend': dt.weekday() >= 5,
            })

        for fir in firs_30d:
            pt = fir['location']
            dt = fir['date_reported']
            weight = 0.8 if fir['status'] == 'OPEN' else 0.5
            cat = classify_crime_category(fir['fir_number'], fir['description'])
            events.append({
                'id': f"FIR-{fir['id']}",
                'lat': pt.y,
                'lng': pt.x,
                'time': dt,
                'weight': weight,
                'category': cat,
                'is_night': dt.hour >= 20 or dt.hour < 6,
                'hour': dt.hour,
                'is_weekend': dt.weekday() >= 5,
            })

        zone_features = []
        total_city_events_7d = sum(1 for e in events if e['time'] >= t_7d)

        for sector in sectors:
            s_lat = sector['lat']
            s_lng = sector['lng']
            s_radius_km = sector['radius_m'] / 1000.0

            sector_events_90d = []
            for ev in events:
                dist_km = haversine_km(s_lat, s_lng, ev['lat'], ev['lng'])
                if dist_km <= max(2.5, s_radius_km * 2.0):
                    ev_copy = dict(ev)
                    ev_copy['dist_km'] = dist_km
                    decay = math.exp(-dist_km / max(0.5, s_radius_km))
                    ev_copy['effective_weight'] = ev['weight'] * decay
                    sector_events_90d.append(ev_copy)

            ev_24h = [e for e in sector_events_90d if e['time'] >= t_24h]
            ev_7d = [e for e in sector_events_90d if e['time'] >= t_7d]
            ev_prior_7d = [e for e in sector_events_90d if t_14d <= e['time'] < t_7d]
            ev_30d = [e for e in sector_events_90d if e['time'] >= t_30d]

            count_24h = len(ev_24h)
            count_7d = len(ev_7d)
            prior_count_7d = len(ev_prior_7d)
            count_30d = len(ev_30d)
            count_90d = len(sector_events_90d)

            weighted_7d = sum(e['effective_weight'] for e in ev_7d)
            weighted_30d = sum(e['effective_weight'] for e in ev_30d)

            if prior_count_7d > 0:
                trend_7d = (count_7d - prior_count_7d) / float(prior_count_7d)
            elif count_7d > 0:
                trend_7d = 1.0
            else:
                trend_7d = 0.0

            night_count_7d = sum(1 for e in ev_7d if e['is_night'])
            night_ratio_7d = round(night_count_7d / max(1, count_7d), 2)
            weekend_count_7d = sum(1 for e in ev_7d if e['is_weekend'])
            weekend_ratio_7d = round(weekend_count_7d / max(1, count_7d), 2)

            cats_7d = [e['category'] for e in ev_7d]
            cats_30d = [e['category'] for e in ev_30d]
            cyber_count_7d = sum(1 for c in cats_7d if c == 'CYBER')
            cyber_ratio_7d = round(cyber_count_7d / max(1, count_7d), 2) if count_7d > 0 else 0.0

            cat_counts = {}
            for c in (cats_7d or cats_30d):
                cat_counts[c] = cat_counts.get(c, 0) + 1
            top_category = max(cat_counts, key=cat_counts.get) if cat_counts else 'NONE'

            local_density = round(weighted_7d / (math.pi * (s_radius_km ** 2)), 3)

            min_stn_dist = 999.0
            for stn in stations:
                if stn['location']:
                    d = haversine_km(s_lat, s_lng, stn['location'].y, stn['location'].x)
                    if d < min_stn_dist:
                        min_stn_dist = d
            min_stn_dist = round(min_stn_dist, 2) if min_stn_dist < 900 else 2.5

            zone_features.append({
                'sector_id': sector['id'],
                'zone_name': sector['name'],
                'lat': s_lat,
                'lng': s_lng,
                'radius_m': sector['radius_m'],
                'station_code': sector.get('station_code'),
                'count_24h': count_24h,
                'count_7d': count_7d,
                'prior_count_7d': prior_count_7d,
                'count_30d': count_30d,
                'count_90d': count_90d,
                'weighted_7d': round(weighted_7d, 2),
                'weighted_30d': round(weighted_30d, 2),
                'trend_7d': round(trend_7d, 3),
                'night_incidents_7d': night_count_7d,
                'night_ratio': night_ratio_7d,
                'weekend_ratio': weekend_ratio_7d,
                'cyber_incidents_7d': cyber_count_7d,
                'cybercrime_ratio': cyber_ratio_7d,
                'top_category': top_category,
                'local_density': local_density,
                'station_distance_km': min_stn_dist,
                'total_city_events_7d': total_city_events_7d,
            })

        return zone_features, len(events)
