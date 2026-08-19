from django.contrib.gis.measure import D
from django.db.models import Q
from .models import CrimeTrend, RiskScore
from crimes.models import Incident, FIR, Complaint
from patrol.models import PatrolAssignment
from users.models import PoliceStation

class IntelligenceRepository:
    @staticmethod
    def get_trends():
        return CrimeTrend.objects.all()

    @staticmethod
    def get_risk_scores(user=None, station_id=None, min_score=None, risk_level=None):
        qs = RiskScore.objects.all().order_by('-score')

        target_station = None
        if user and user.is_authenticated:
            if user.role == 'STATION' and user.station:
                target_station = user.station
            elif user.role == 'PATROL_OFFICER' and user.station:
                target_station = user.station
            elif user.role == 'ADMIN' and station_id:
                try:
                    target_station = PoliceStation.objects.get(id=station_id)
                except PoliceStation.DoesNotExist:
                    pass
        elif station_id:
            try:
                target_station = PoliceStation.objects.get(id=station_id)
            except PoliceStation.DoesNotExist:
                pass

        if target_station:
            # If station has a jurisdiction polygon, match center within polygon, or within station proximity (e.g. 4.5km)
            q_filter = Q(zone_name__icontains=target_station.name.replace('Police Station', '').strip())
            if target_station.location:
                q_filter |= Q(center__distance_lte=(target_station.location, D(km=4.5)))
            if target_station.jurisdiction:
                q_filter |= Q(center__within=target_station.jurisdiction)
            qs = qs.filter(q_filter)

        if min_score is not None:
            qs = qs.filter(score__gte=float(min_score))
        if risk_level:
            qs = qs.filter(risk_level=risk_level.upper())

        return qs

    @staticmethod
    def get_incidents_in_radius(center, radius_meters=3000.0, user=None, station=None):
        from crimes.repository import CrimeRepository
        if user:
            qs = CrimeRepository.get_incidents(user)
        else:
            qs = Incident.objects.all()

        if station:
            qs = qs.filter(station=station)

        return qs.filter(location__distance_lte=(center, D(m=radius_meters)))

    @staticmethod
    def get_firs_in_radius(center, radius_meters=3000.0, user=None, station=None):
        from crimes.repository import CrimeRepository
        if user:
            qs = CrimeRepository.get_firs(user)
        else:
            qs = FIR.objects.all()

        if station:
            qs = qs.filter(station=station)

        return qs.filter(location__distance_lte=(center, D(m=radius_meters)))

    @staticmethod
    def get_active_patrols(user=None, station=None):
        from patrol.repository import PatrolRepository
        if user:
            qs = PatrolRepository.get_active_assignments(user)
        else:
            qs = PatrolAssignment.objects.exclude(
                status__in=[PatrolAssignment.Status.COMPLETED, PatrolAssignment.Status.CANCELLED]
            )

        if station:
            qs = qs.filter(station=station)

        return qs.select_related('officer', 'station')
