import re
from collections import Counter
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from django.contrib.gis.measure import D
from django.contrib.gis.geos import Point

from crimes.repository import CrimeRepository
from intelligence.repository import IntelligenceRepository
from intelligence.models import RiskScore
from users.models import PoliceStation


class CybercrimeClassifier:
    """
    Centralized, deterministic classifier for cyber-enabled crime records.
    Analyzes FIR/Incident title, description, and metadata to identify and classify cybercrimes.
    """

    CATEGORIES = {
        'FINANCIAL_FRAUD': 'Financial & Banking Fraud',
        'PHISHING': 'Phishing & Credential Theft',
        'IDENTITY_THEFT': 'Identity Theft & Impersonation',
        'CYBER_FRAUD': 'Cyber Fraud & Digital Crime',
        'ONLINE_SCAM': 'Online Scams & Extortion',
        'OTHER_CYBER': 'Other Cyber-Enabled Crime',
    }

    # Deterministic regex patterns for classification
    PATTERNS = {
        'PHISHING': re.compile(
            r'phish|fake\s*link|credential\s*theft|smish|vish|fake\s*website|fake\s*portal|fake\s*examination|spoof',
            re.IGNORECASE
        ),
        'IDENTITY_THEFT': re.compile(
            r'identity\s*theft|identity|stole.*id|impersonat|fake\s*profile|stolen\s*aadhaar|pan\s*card\s*fraud|kyc\s*fraud|account\s*takeover',
            re.IGNORECASE
        ),
        'FINANCIAL_FRAUD': re.compile(
            r'upi\s*fraud|upi|banking\s*fraud|bank\s*fraud|otp\s*fraud|otp|unauthorized\s*withdrawal|card\s*fraud|skimming|credit\s*card|debit\s*card|payment\s*fraud|financial\s*fraud',
            re.IGNORECASE
        ),
        'ONLINE_SCAM': re.compile(
            r'online\s*scam|lottery\s*scam|job\s*scam|crypto\s*scam|telegram\s*scam|investment\s*scam|digital\s*extortion|sextortion|cyber\s*blackmail|extortion',
            re.IGNORECASE
        ),
        'CYBER_FRAUD': re.compile(
            r'cyber\s*fraud|online\s*fraud|cyber\s*crime|cybercrime|malware|ransomware|trojan|hacking|ddos|unauthorized\s*access|data\s*breach',
            re.IGNORECASE
        ),
        'OTHER_CYBER': re.compile(
            r'cyber\s*harassment|cyber\s*stalk|cyber\s*bully|online\s*threat|social\s*engineering|digital\s*fraud|cyber',
            re.IGNORECASE
        ),
    }

    @classmethod
    def is_cybercrime(cls, title, description=''):
        """Return True if the text indicates a cyber-enabled crime."""
        text = f"{title or ''} {description or ''}".lower()
        if re.search(r'\[cyber\]|\[identity\]|\[phishing\]|\[fraud\]', text):
            return True
        for pattern in cls.PATTERNS.values():
            if pattern.search(text):
                return True
        return False

    @classmethod
    def classify(cls, title, description=''):
        """
        Return normalized cybercrime category code and human-readable label.
        If not a cybercrime, returns (None, None).
        """
        text = f"{title or ''} {description or ''}".lower()

        # Priority-ordered classification
        if cls.PATTERNS['PHISHING'].search(text):
            return 'PHISHING', cls.CATEGORIES['PHISHING']
        if cls.PATTERNS['IDENTITY_THEFT'].search(text) or '[identity]' in text:
            return 'IDENTITY_THEFT', cls.CATEGORIES['IDENTITY_THEFT']
        if cls.PATTERNS['FINANCIAL_FRAUD'].search(text):
            return 'FINANCIAL_FRAUD', cls.CATEGORIES['FINANCIAL_FRAUD']
        if cls.PATTERNS['ONLINE_SCAM'].search(text):
            return 'ONLINE_SCAM', cls.CATEGORIES['ONLINE_SCAM']
        if cls.PATTERNS['CYBER_FRAUD'].search(text) or '[cyber]' in text:
            return 'CYBER_FRAUD', cls.CATEGORIES['CYBER_FRAUD']
        if cls.PATTERNS['OTHER_CYBER'].search(text):
            return 'OTHER_CYBER', cls.CATEGORIES['OTHER_CYBER']

        return None, None


class CybercrimeIntelligenceService:
    """
    Service for deterministic Cybercrime Intelligence analytics:
    - Geographic origin & affected region analysis
    - Digital fraud clusters and phishing hotspots
    - Physical vs cybercrime pattern correlation
    - Emerging cyber threat alerts
    """

    @staticmethod
    def _calculate_trend(event_dates):
        """
        Calculate deterministic trend from a list of datetime/date objects.
        Returns ('INCREASING'|'DECREASING'|'STABLE'|'Insufficient historical data', explanation).
        """
        if not event_dates or len(event_dates) < 2:
            return 'Insufficient historical data', 'Insufficient historical data to calculate trend'

        sorted_dates = sorted(event_dates)
        earliest = sorted_dates[0]
        latest = sorted_dates[-1]

        # Convert to timestamp seconds for uniform comparison
        if hasattr(earliest, 'timestamp'):
            t0 = earliest.timestamp()
            t1 = latest.timestamp()
        else:
            t0 = (earliest - earliest).total_seconds() if hasattr(earliest, 'total_seconds') else 0
            t1 = 86400

        total_span = abs(t1 - t0) if t1 > t0 else 86400
        if total_span < 3600:  # less than 1 hour span
            return 'Insufficient historical data', 'Insufficient historical span (events clustered in narrow window)'

        midpoint = t0 + (total_span / 2.0)
        first_half = sum(
            1 for d in sorted_dates
            if (d.timestamp() if hasattr(d, 'timestamp') else 0) <= midpoint
        )
        second_half = sum(
            1 for d in sorted_dates
            if (d.timestamp() if hasattr(d, 'timestamp') else 0) > midpoint
        )

        if second_half > first_half * 1.2:
            pct_inc = int(((second_half - first_half) / max(1, first_half)) * 100)
            return 'INCREASING', f'+{pct_inc}% increase in recent observation period'
        elif second_half < first_half * 0.8:
            pct_dec = int(((first_half - second_half) / max(1, first_half)) * 100)
            return 'DECREASING', f'-{pct_dec}% decrease in recent observation period'
        else:
            return 'STABLE', 'Activity rate stable across monitoring window'

    @staticmethod
    def _get_scoped_records(user):
        """
        Fetch FIRs and Incidents respecting RBAC and station boundary.
        """
        firs_qs = CrimeRepository.get_firs(user)
        incidents_qs = CrimeRepository.get_incidents(user)
        return list(firs_qs), list(incidents_qs)

    @classmethod
    def get_summary(cls, user, params=None):
        """
        GET /api/intelligence/cybercrime/summary/
        Citywide or station-isolated overview KPI metrics.
        """
        all_firs, all_incidents = cls._get_scoped_records(user)

        # Categorize all events
        cyber_events = []
        physical_events = []

        for fir in all_firs:
            is_cyber = CybercrimeClassifier.is_cybercrime(fir.fir_number, fir.description)
            cat_code, cat_label = CybercrimeClassifier.classify(fir.fir_number, fir.description)
            ev = {
                'type': 'FIR',
                'id': fir.id,
                'title': fir.fir_number,
                'description': fir.description,
                'date': fir.date_reported,
                'location': fir.location,
                'station': fir.station,
                'is_cyber': is_cyber,
                'category_code': cat_code or ('CYBER_FRAUD' if is_cyber else None),
                'category_label': cat_label or ('Cyber Fraud & Digital Crime' if is_cyber else None),
            }
            if is_cyber:
                cyber_events.append(ev)
            else:
                physical_events.append(ev)

        for inc in all_incidents:
            is_cyber = CybercrimeClassifier.is_cybercrime(inc.title, inc.description)
            cat_code, cat_label = CybercrimeClassifier.classify(inc.title, inc.description)
            ev = {
                'type': 'INCIDENT',
                'id': inc.id,
                'title': inc.title,
                'description': inc.description,
                'date': inc.date_occurred,
                'location': inc.location,
                'station': inc.station,
                'is_cyber': is_cyber,
                'category_code': cat_code or ('CYBER_FRAUD' if is_cyber else None),
                'category_label': cat_label or ('Cyber Fraud & Digital Crime' if is_cyber else None),
            }
            if is_cyber:
                cyber_events.append(ev)
            else:
                physical_events.append(ev)

        total_crimes = len(cyber_events) + len(physical_events)
        total_cyber = len(cyber_events)
        cyber_ratio = round((total_cyber / total_crimes) * 100, 1) if total_crimes > 0 else 0.0

        # Category breakdown
        cat_counts = Counter(ev['category_code'] for ev in cyber_events if ev['category_code'])
        category_breakdown = {
            'financial_fraud': cat_counts.get('FINANCIAL_FRAUD', 0),
            'phishing': cat_counts.get('PHISHING', 0),
            'identity_theft': cat_counts.get('IDENTITY_THEFT', 0),
            'cyber_fraud': cat_counts.get('CYBER_FRAUD', 0),
            'online_scam': cat_counts.get('ONLINE_SCAM', 0),
            'other_cyber': cat_counts.get('OTHER_CYBER', 0),
        }

        # Hotspots calculation
        hotspots_data = cls.get_hotspots(user, params)
        hotspots = hotspots_data.get('hotspots', [])
        top_hotspot = hotspots[0] if hotspots else None

        # Alerts calculation
        alerts_data = cls.get_alerts(user, params)
        alerts = alerts_data.get('alerts', [])

        # User scope
        if user.role == 'STATION' and user.station:
            user_scope = f"{user.station.name} ({user.station.station_code})"
        elif user.role == 'PATROL_OFFICER' and user.station:
            user_scope = f"{user.station.name} (Patrol {user.username})"
        else:
            user_scope = 'CITYWIDE CYBER COMMAND'

        return {
            'overview': {
                'total_cybercrime': total_cyber,
                'total_physical_crime': len(physical_events),
                'total_crime': total_crimes,
                'cybercrime_percentage': cyber_ratio,
                'category_breakdown': category_breakdown,
                'active_cyber_hotspots': len(hotspots),
                'emerging_threats_count': len(alerts),
            },
            'top_hotspot': top_hotspot,
            'hotspots': hotspots,
            'emerging_threats': alerts,
            'user_scope': user_scope,
            'timestamp': timezone.now(),
        }

    @classmethod
    def get_hotspots(cls, user, params=None):
        """
        GET /api/intelligence/cybercrime/hotspots/
        Spatial clustering of cybercrime events by sector / station.
        """
        all_firs, all_incidents = cls._get_scoped_records(user)

        # Classify all records
        all_events = []
        for fir in all_firs:
            is_cyber = CybercrimeClassifier.is_cybercrime(fir.fir_number, fir.description)
            cat_code, cat_label = CybercrimeClassifier.classify(fir.fir_number, fir.description)
            all_events.append({
                'id': f"fir-{fir.id}",
                'title': fir.fir_number,
                'description': fir.description,
                'date': fir.date_reported,
                'location': fir.location,
                'station': fir.station,
                'is_cyber': is_cyber,
                'category_code': cat_code,
                'category_label': cat_label,
            })

        for inc in all_incidents:
            is_cyber = CybercrimeClassifier.is_cybercrime(inc.title, inc.description)
            cat_code, cat_label = CybercrimeClassifier.classify(inc.title, inc.description)
            all_events.append({
                'id': f"inc-{inc.id}",
                'title': inc.title,
                'description': inc.description,
                'date': inc.date_occurred,
                'location': inc.location,
                'station': inc.station,
                'is_cyber': is_cyber,
                'category_code': cat_code,
                'category_label': cat_label,
            })

        # Fetch zones / stations for geographic clustering
        stations_qs = PoliceStation.objects.all()
        if user.role == 'STATION' and user.station:
            stations_qs = stations_qs.filter(id=user.station.id)
        elif user.role == 'PATROL_OFFICER' and user.station:
            stations_qs = stations_qs.filter(id=user.station.id)

        # Existing RiskScores for contextual data only (READ-ONLY)
        risk_scores_map = {}
        for r in RiskScore.objects.all():
            risk_scores_map[r.zone_name.lower()] = r

        hotspots = []

        for station in stations_qs:
            station_center = station.location
            if not station_center:
                continue

            # Find all events within station vicinity (e.g. 4500m) or assigned to station
            zone_cyber = []
            zone_physical = []

            for ev in all_events:
                is_in_zone = False
                if ev['station'] and ev['station'].id == station.id:
                    is_in_zone = True
                elif ev['location'] and station_center:
                    dist_m = station_center.distance(ev['location']) * 111320.0
                    if dist_m <= 4500.0:
                        is_in_zone = True

                if is_in_zone:
                    if ev['is_cyber']:
                        zone_cyber.append(ev)
                    else:
                        zone_physical.append(ev)

            cyber_count = len(zone_cyber)
            physical_count = len(zone_physical)
            total_zone_count = cyber_count + physical_count
            cyber_ratio = round((cyber_count / total_zone_count) * 100, 1) if total_zone_count > 0 else 0.0

            # Categorize cyber events in this zone
            zone_cats = [ev['category_code'] for ev in zone_cyber if ev['category_code']]
            if zone_cats:
                cat_counts = Counter(zone_cats)
                dominant_code, dominant_count = cat_counts.most_common(1)[0]
                dominant_type = CybercrimeClassifier.CATEGORIES.get(dominant_code, 'Cybercrime')
                fraud_count = cat_counts.get('FINANCIAL_FRAUD', 0) + cat_counts.get('CYBER_FRAUD', 0)
                phishing_count = cat_counts.get('PHISHING', 0)
                identity_count = cat_counts.get('IDENTITY_THEFT', 0)
                scam_count = cat_counts.get('ONLINE_SCAM', 0)
            else:
                dominant_type = 'None Detected'
                fraud_count = 0
                phishing_count = 0
                identity_count = 0
                scam_count = 0

            # Trend calculation
            cyber_dates = [ev['date'] for ev in zone_cyber if ev['date']]
            trend, trend_label = cls._calculate_trend(cyber_dates)

            # Threat level determination
            if cyber_count >= 3 or (cyber_count >= 2 and trend == 'INCREASING') or (cyber_count >= 2 and cyber_ratio >= 50):
                threat_level = 'CRITICAL'
            elif cyber_count >= 2 or (cyber_count >= 1 and cyber_ratio >= 35):
                threat_level = 'HIGH'
            elif cyber_count >= 1:
                threat_level = 'MEDIUM'
            else:
                threat_level = 'LOW'

            # Recent activity
            recent_date = max(cyber_dates).isoformat() if cyber_dates else None

            # Contextual AI Risk data from existing RiskScore (if present)
            zone_key = station.name.replace('Police Station', '').strip().lower()
            matching_risk = None
            for name, r_obj in risk_scores_map.items():
                if zone_key in name or name in zone_key:
                    matching_risk = r_obj
                    break

            ai_context = None
            if matching_risk:
                ai_context = {
                    'ai_risk_score': round(matching_risk.score, 1),
                    'ai_risk_level': matching_risk.risk_level,
                    'ai_model_status': matching_risk.model_status,
                }

            # Plain-English explanation
            reasons = []
            if cyber_count > 0:
                reasons.append(f"{cyber_count} cyber-enabled event(s) recorded in jurisdiction ({cyber_ratio:.0f}% of total sector crime).")
                if fraud_count > 0:
                    reasons.append(f"{fraud_count} financial/banking fraud case(s).")
                if phishing_count > 0:
                    reasons.append(f"{phishing_count} phishing/credential scam(s).")
                if identity_count > 0:
                    reasons.append(f"{identity_count} identity theft case(s).")
                if scam_count > 0:
                    reasons.append(f"{scam_count} online scam/extortion case(s).")
                reasons.append(f"Temporal velocity evaluated as {trend_label}.")
            else:
                reasons.append("Zero active cybercrime cases reported in jurisdiction baseline.")

            explanation = " ".join(reasons)

            center_data = {
                "type": "Point",
                "coordinates": [station_center.x, station_center.y]
            }

            hotspots.append({
                'zone_name': station.name.replace('Police Station', '').strip() or station.name,
                'station_name': station.name,
                'station_code': station.station_code,
                'station_id': station.id,
                'latitude': station_center.y,
                'longitude': station_center.x,
                'center': center_data,
                'cybercrime_count': cyber_count,
                'physical_crime_count': physical_count,
                'total_crime_count': total_zone_count,
                'cybercrime_ratio': cyber_ratio,
                'dominant_type': dominant_type,
                'fraud_count': fraud_count,
                'phishing_count': phishing_count,
                'identity_count': identity_count,
                'scam_count': scam_count,
                'trend': trend,
                'trend_label': trend_label,
                'threat_level': threat_level,
                'recent_activity': recent_date,
                'explanation': explanation,
                'ai_context': ai_context,
            })

        # Sort hotspots by cybercrime count descending, then threat level
        severity_order = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
        hotspots.sort(
            key=lambda h: (h['cybercrime_count'], severity_order.get(h['threat_level'], 0), h['cybercrime_ratio']),
            reverse=True
        )

        return {
            'hotspots': hotspots,
            'total_hotspots': len(hotspots),
            'timestamp': timezone.now(),
        }

    @classmethod
    def get_correlations(cls, user, params=None):
        """
        GET /api/intelligence/cybercrime/correlations/
        Deterministic correlation analysis between physical crime and cybercrime by sector.
        """
        hotspots_data = cls.get_hotspots(user, params)
        hotspots = hotspots_data.get('hotspots', [])

        all_firs, all_incidents = cls._get_scoped_records(user)

        correlations = []

        for h in hotspots:
            phys_count = h['physical_crime_count']
            cyber_count = h['cybercrime_count']
            total = h['total_crime_count']
            cyber_ratio = h['cybercrime_ratio']

            # Determine Physical trend
            phys_dates = []
            for fir in all_firs:
                if fir.station_id == h['station_id'] and not CybercrimeClassifier.is_cybercrime(fir.fir_number, fir.description):
                    phys_dates.append(fir.date_reported)
            for inc in all_incidents:
                if inc.station_id == h['station_id'] and not CybercrimeClassifier.is_cybercrime(inc.title, inc.description):
                    phys_dates.append(inc.date_occurred)

            phys_trend, phys_trend_label = cls._calculate_trend(phys_dates)
            cyber_trend = h['trend']

            # Correlation Status determination
            if total < 2:
                status = 'INSUFFICIENT_DATA'
                explanation = 'Insufficient historical crime records to evaluate physical vs cyber correlation.'
            elif phys_trend == 'INCREASING' and cyber_trend == 'INCREASING':
                status = 'CONVERGING'
                explanation = (
                    f"Both physical crime (+{phys_count}) and cybercrime (+{cyber_count}) are increasing simultaneously, "
                    f"indicating compounding operational strain across both digital and street enforcement."
                )
            elif cyber_count > phys_count and cyber_ratio >= 60.0:
                status = 'CYBER_DOMINANT'
                explanation = (
                    f"Cybercrime dominates this sector at {cyber_ratio:.0f}% of total crime volume ({cyber_count} cyber vs {phys_count} physical). "
                    f"Digital interdiction and anti-fraud advisories should take tactical priority."
                )
            elif phys_count > cyber_count and (100.0 - cyber_ratio) >= 60.0:
                status = 'PHYSICAL_DOMINANT'
                explanation = (
                    f"Physical street crime remains primary driver ({phys_count} physical vs {cyber_count} cyber, {100 - cyber_ratio:.0f}% physical). "
                    f"High-visibility field patrols should remain standard deployment."
                )
            elif (phys_trend == 'INCREASING' and cyber_trend == 'DECREASING') or (phys_trend == 'DECREASING' and cyber_trend == 'INCREASING'):
                status = 'DIVERGING'
                explanation = (
                    f"Diverging crime patterns detected: physical crime is {phys_trend.lower()} while cybercrime is {cyber_trend.lower()}. "
                    f"Targeted re-allocation of specialized investigation units recommended."
                )
            else:
                status = 'STABLE'
                explanation = (
                    f"Physical and cybercrime rates are relatively balanced ({phys_count} physical, {cyber_count} cyber, {cyber_ratio:.0f}% cyber). "
                    f"Baseline monitoring protocols sufficient."
                )

            correlations.append({
                'zone': h['zone_name'],
                'station_name': h['station_name'],
                'station_code': h['station_code'],
                'center': h['center'],
                'physical_crimes': phys_count,
                'cybercrimes': cyber_count,
                'total_crimes': total,
                'cybercrime_ratio': cyber_ratio,
                'physical_trend': phys_trend,
                'physical_trend_label': phys_trend_label,
                'cyber_trend': cyber_trend,
                'cyber_trend_label': h['trend_label'],
                'correlation_status': status,
                'explanation': explanation,
            })

        return {
            'correlations': correlations,
            'timestamp': timezone.now(),
        }

    @classmethod
    def get_alerts(cls, user, params=None):
        """
        GET /api/intelligence/cybercrime/alerts/
        Deterministic emerging cyber threat alerts based on temporal surges & pattern clusters.
        """
        hotspots_data = cls.get_hotspots(user, params)
        hotspots = hotspots_data.get('hotspots', [])

        alerts = []

        for h in hotspots:
            cyber_count = h['cybercrime_count']
            if cyber_count == 0:
                continue

            fraud_count = h['fraud_count']
            phishing_count = h['phishing_count']
            cyber_ratio = h['cybercrime_ratio']
            trend = h['trend']

            # Trigger conditions for emerging threat:
            threat_type = None
            title = None
            severity = 'MEDIUM'
            change_percent = "+0%"
            explanation = ""

            if phishing_count >= 1 and (cyber_ratio >= 30.0 or cyber_count >= 2):
                threat_type = 'EMERGING_PHISHING_CLUSTER'
                title = 'Phishing & Credential Theft Cluster'
                severity = 'CRITICAL' if phishing_count >= 2 or cyber_count >= 3 else 'HIGH'
                change_percent = "+50%" if trend == 'INCREASING' else "+25%"
                explanation = (
                    f"Phishing & credential harvesting activity detected in {h['zone_name']} "
                    f"({phishing_count} phishing case(s), {cyber_count} total cybercrimes, {cyber_ratio:.0f}% cyber ratio)."
                )
            elif fraud_count >= 2 or (fraud_count >= 1 and cyber_ratio >= 40.0):
                threat_type = 'SURGE_FINANCIAL_FRAUD'
                title = 'Financial & Banking Fraud Surge'
                severity = 'CRITICAL' if fraud_count >= 3 or cyber_count >= 4 else 'HIGH'
                change_percent = "+40%" if trend == 'INCREASING' else "+20%"
                explanation = (
                    f"Financial fraud activity elevated in {h['zone_name']} "
                    f"with {fraud_count} cases concentrated in jurisdiction ({cyber_ratio:.0f}% of local crime volume)."
                )
            elif trend == 'INCREASING' and cyber_count >= 2:
                threat_type = 'RAPID_CYBER_ESCALATION'
                title = 'Rapid Cybercrime Escalation'
                severity = 'HIGH'
                change_percent = "+35%"
                explanation = (
                    f"Cybercrime velocity is increasing rapidly in {h['zone_name']} "
                    f"({cyber_count} events recorded, representing {cyber_ratio:.0f}% of precinct crime)."
                )
            elif cyber_count >= 3:
                threat_type = 'HIGH_CYBER_CONCENTRATION'
                title = 'High Cybercrime Concentration'
                severity = 'HIGH'
                change_percent = "+15%"
                explanation = (
                    f"{cyber_count} cybercrime cases concentrated in {h['zone_name']}. "
                    f"Primary threat category: {h['dominant_type']}."
                )

            if threat_type:
                alerts.append({
                    'id': f"cyber-alert-{h['station_code']}-{threat_type.lower()}",
                    'zone': h['zone_name'],
                    'station_name': h['station_name'],
                    'station_code': h['station_code'],
                    'threat_type': threat_type,
                    'title': title,
                    'current_count': cyber_count,
                    'previous_count': max(0, cyber_count - 1),
                    'change_percent': change_percent,
                    'severity': severity,
                    'explanation': explanation,
                    'ai_context': h.get('ai_context'),
                    'center': h['center'],
                    'dominant_type': h['dominant_type'],
                    'timestamp': timezone.now(),
                })

        # Sort alerts by severity
        sev_rank = {'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0}
        alerts.sort(key=lambda a: sev_rank.get(a['severity'], 0), reverse=True)

        return {
            'alerts': alerts,
            'total_alerts': len(alerts),
            'timestamp': timezone.now(),
        }
