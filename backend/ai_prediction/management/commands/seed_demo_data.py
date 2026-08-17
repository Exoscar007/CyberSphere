"""Seed realistic Ahmedabad demonstration data for CyberSphere.

IMPORTANT: This is SYNTHETIC demonstration data for hackathon purposes.
It does NOT represent real police records or actual crime data.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point, Polygon
from django.utils import timezone

from crimes.models import FIR, Complaint, Incident
from intelligence.models import CrimeTrend
from patrol.models import PatrolAssignment
from users.models import CustomUser, PoliceStation


class Command(BaseCommand):
    help = 'Seed the database with synthetic deterministic Ahmedabad demonstration data'

    def handle(self, *args, **options):
        now = timezone.now()

        self.stdout.write('Clearing existing data...')
        FIR.objects.all().delete()
        Complaint.objects.all().delete()
        Incident.objects.all().delete()
        CrimeTrend.objects.all().delete()
        PatrolAssignment.objects.all().delete()
        CustomUser.objects.filter(is_superuser=False).delete()
        PoliceStation.objects.all().delete()

        self.stdout.write('Creating Police Stations...')
        station_navrangpura = PoliceStation.objects.create(
            station_code='NAV-01',
            name='Navrangpura Police Station',
            address='Navrangpura, Ahmedabad',
            location=Point(72.5571, 23.0395, srid=4326),
            is_active=True
        )
        station_satellite = PoliceStation.objects.create(
            station_code='SAT-02',
            name='Satellite Police Station',
            address='Satellite, Ahmedabad',
            location=Point(72.5136, 23.0277, srid=4326),
            is_active=True
        )

        self.stdout.write('Creating demo users...')
        admin = self._create_user('admin', 'admin123', 'ADMIN', 'ADM-001', None)
        
        # Station Users
        station_user1 = self._create_user('station_navrangpura', 'station123', 'STATION', 'STN-101', station_navrangpura)
        station_user2 = self._create_user('station_satellite', 'station123', 'STATION', 'STN-102', station_satellite)
        
        # Patrol Officers
        patrol1 = self._create_user('patrol_mehta', 'patrol123', 'PATROL_OFFICER', 'PTL-201', station_navrangpura)
        patrol2 = self._create_user('patrol_joshi', 'patrol123', 'PATROL_OFFICER', 'PTL-202', station_satellite)

        self.stdout.write('Creating FIRs...')
        # Navrangpura FIRs
        FIR.objects.create(
            fir_number='FIR-NAV-001',
            description='[DEMO DATA] Burglary reported near Navrangpura.',
            reported_by=station_user1,
            location=Point(72.5575, 23.0400, srid=4326),
            status='OPEN',
            station=station_navrangpura
        )
        FIR.objects.create(
            fir_number='FIR-NAV-002',
            description='[DEMO DATA] Theft reported near Gujarat University.',
            reported_by=station_user1,
            location=Point(72.5560, 23.0390, srid=4326),
            status='INVESTIGATING',
            station=station_navrangpura
        )
        # Satellite FIRs
        FIR.objects.create(
            fir_number='FIR-SAT-001',
            description='[DEMO DATA] Vehicle Theft in Satellite.',
            reported_by=station_user2,
            location=Point(72.5140, 23.0280, srid=4326),
            status='OPEN',
            station=station_satellite
        )

        self.stdout.write('Creating Complaints...')
        Complaint.objects.create(
            description='[DEMO DATA] Noise complaint in Navrangpura.',
            status='PENDING',
            station=station_navrangpura
        )
        Complaint.objects.create(
            description='[DEMO DATA] Traffic issue in Satellite.',
            status='RESOLVED',
            station=station_satellite
        )

        self.stdout.write('Creating Incidents...')
        Incident.objects.create(
            title='Theft — Navrangpura',
            description='[DEMO DATA] Theft incident.',
            location=Point(72.5580, 23.0410, srid=4326),
            date_occurred=now - timedelta(days=2),
            severity='MEDIUM',
            station=station_navrangpura
        )
        Incident.objects.create(
            title='Assault — Satellite',
            description='[DEMO DATA] Assault incident.',
            location=Point(72.5150, 23.0290, srid=4326),
            date_occurred=now - timedelta(days=1),
            severity='HIGH',
            station=station_satellite
        )

        self.stdout.write('Creating Crime Trends...')
        CrimeTrend.objects.create(
            crime_type='Theft',
            location=Point(72.5571, 23.0395, srid=4326),
            date_recorded=now - timedelta(days=5),
            frequency=12,
        )

        inc1 = Incident.objects.get(title='Theft — Navrangpura')
        inc2 = Incident.objects.get(title='Assault — Satellite')

        self.stdout.write('Creating Patrol Assignments...')
        PatrolAssignment.objects.create(
            officer=patrol1,
            zone_name='Navrangpura Commercial',
            status='ASSIGNED',
            destination=Point(72.5580, 23.0410, srid=4326),
            instructions='[DEMO DATA] Proceed to theft location and investigate.',
            incident=inc1,
            start_time=now - timedelta(hours=1),
            station=station_navrangpura
        )
        PatrolAssignment.objects.create(
            officer=patrol2,
            zone_name='Satellite Residential',
            status='EN_ROUTE',
            destination=Point(72.5150, 23.0290, srid=4326),
            instructions='[DEMO DATA] Proceed to assault location immediately.',
            incident=inc2,
            start_time=now - timedelta(hours=2),
            station=station_satellite
        )

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed complete: Deterministic Data Loaded.\n'
            f'\nDemo credentials:\n'
            f'  Admin: admin / admin123\n'
            f'  Station 1: station_navrangpura / station123\n'
            f'  Station 2: station_satellite / station123\n'
            f'  Patrol 1: patrol_mehta / patrol123\n'
            f'  Patrol 2: patrol_joshi / patrol123\n'
        ))

    def _create_user(self, username, password, role, badge, station):
        user, created = CustomUser.objects.get_or_create(
            username=username,
            defaults={'role': role, 'badge_number': badge, 'station': station},
        )
        if created:
            user.set_password(password)
            user.save()
        return user
