"""Seed realistic Ahmedabad demonstration data for CyberSphere.

IMPORTANT: This is SYNTHETIC demonstration data for hackathon purposes.
It does NOT represent real police records or actual crime data.
"""
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone

from crimes.models import FIR, Complaint, Incident
from intelligence.models import CrimeTrend
from patrol.models import PatrolAssignment
from users.models import CustomUser


AHMEDABAD_LOCATIONS = [
    # (lng, lat, area_name)
    (72.5714, 23.0225, 'Maninagar'),
    (72.5571, 23.0395, 'Navrangpura'),
    (72.5136, 23.0277, 'Satellite'),
    (72.5297, 23.0407, 'Vastrapur'),
    (72.4714, 23.0340, 'Bopal'),
    (72.5017, 23.0510, 'SG Highway'),
    (72.5660, 23.0340, 'Ellis Bridge'),
    (72.5620, 23.0135, 'Paldi'),
    (72.5960, 23.1060, 'Chandkheda'),
    (72.5110, 23.0880, 'Gota'),
    (72.4970, 23.0510, 'Thaltej'),
    (72.5060, 23.0420, 'Bodakdev'),
    (72.6320, 23.0020, 'Isanpur'),
    (72.5850, 23.0620, 'Shahibaug'),
    (72.6010, 23.0100, 'Odhav'),
]

CRIME_TYPES = [
    'Theft', 'Burglary', 'Robbery', 'Assault', 'Vandalism',
    'Fraud', 'Vehicle Theft', 'Pickpocketing', 'Chain Snatching',
    'Domestic Violence', 'Drug Offense', 'Cybercrime',
]


class Command(BaseCommand):
    help = 'Seed the database with synthetic Ahmedabad demonstration data'

    def handle(self, *args, **options):
        random.seed(42)  # Reproducible
        now = timezone.now()

        self.stdout.write('Clearing existing data...')
        FIR.objects.all().delete()
        Complaint.objects.all().delete()
        Incident.objects.all().delete()
        CrimeTrend.objects.all().delete()
        PatrolAssignment.objects.all().delete()

        self.stdout.write('Creating demo users...')
        admin = self._create_user('admin', 'admin123', 'ADMIN', 'ADM-001')
        officer1 = self._create_user('officer_shah', 'officer123', 'POLICE_OFFICER', 'POF-101')
        officer2 = self._create_user('officer_patel', 'officer123', 'POLICE_OFFICER', 'POF-102')
        patrol1 = self._create_user('patrol_mehta', 'patrol123', 'PATROL_OFFICER', 'PTL-201')
        patrol2 = self._create_user('patrol_joshi', 'patrol123', 'PATROL_OFFICER', 'PTL-202')
        patrol3 = self._create_user('patrol_desai', 'patrol123', 'PATROL_OFFICER', 'PTL-203')

        self.stdout.write('Creating FIRs...')
        firs_created = 0
        for i in range(30):
            loc = random.choice(AHMEDABAD_LOCATIONS)
            jitter_lng = loc[0] + random.uniform(-0.01, 0.01)
            jitter_lat = loc[1] + random.uniform(-0.01, 0.01)
            crime = random.choice(CRIME_TYPES)
            status = random.choice(['OPEN', 'OPEN', 'INVESTIGATING', 'CLOSED'])
            days_ago = random.randint(1, 90)
            FIR.objects.create(
                fir_number=f'FIR-2026-{i+1:04d}',
                description=f'[DEMO DATA] {crime} reported near {loc[2]}, Ahmedabad.',
                reported_by=random.choice([officer1, officer2]),
                location=Point(jitter_lng, jitter_lat, srid=4326),
                status=status,
            )
            firs_created += 1

        self.stdout.write('Creating Complaints...')
        for i in range(20):
            status = random.choice(['PENDING', 'PENDING', 'RESOLVED'])
            crime = random.choice(CRIME_TYPES)
            loc = random.choice(AHMEDABAD_LOCATIONS)
            Complaint.objects.create(
                description=f'[DEMO DATA] Complaint regarding {crime.lower()} in {loc[2]} area.',
                status=status,
            )

        self.stdout.write('Creating Incidents...')
        severities = ['LOW', 'LOW', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'HIGH', 'HIGH', 'CRITICAL']
        for i in range(50):
            loc = random.choice(AHMEDABAD_LOCATIONS)
            jitter_lng = loc[0] + random.uniform(-0.015, 0.015)
            jitter_lat = loc[1] + random.uniform(-0.015, 0.015)
            crime = random.choice(CRIME_TYPES)
            severity = random.choice(severities)
            days_ago = random.randint(1, 120)
            Incident.objects.create(
                title=f'{crime} — {loc[2]}',
                description=f'[DEMO DATA] {crime} incident in {loc[2]}, Ahmedabad.',
                location=Point(jitter_lng, jitter_lat, srid=4326),
                date_occurred=now - timedelta(days=days_ago, hours=random.randint(0, 23)),
                severity=severity,
            )

        self.stdout.write('Creating Crime Trends...')
        for crime_type in CRIME_TYPES[:8]:
            loc = random.choice(AHMEDABAD_LOCATIONS)
            CrimeTrend.objects.create(
                crime_type=crime_type,
                location=Point(loc[0], loc[1], srid=4326),
                date_recorded=now - timedelta(days=random.randint(1, 30)),
                frequency=random.randint(5, 50),
            )

        self.stdout.write('Creating Patrol Assignments...')
        patrol_officers = [patrol1, patrol2, patrol3]
        risk_levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        for i, officer in enumerate(patrol_officers):
            loc = AHMEDABAD_LOCATIONS[i]
            PatrolAssignment.objects.create(
                officer=officer,
                zone_name=loc[2],
                status='ACTIVE',
                start_time=now - timedelta(hours=random.randint(1, 4)),
            )

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed complete: {firs_created} FIRs, 20 Complaints, 50 Incidents, '
            f'8 Crime Trends, 3 Patrol Assignments, 6 Users.\n'
            f'\nDemo credentials:\n'
            f'  Admin: admin / admin123\n'
            f'  Officer: officer_shah / officer123\n'
            f'  Patrol: patrol_mehta / patrol123\n'
        ))

    def _create_user(self, username, password, role, badge):
        user, created = CustomUser.objects.get_or_create(
            username=username,
            defaults={'role': role, 'badge_number': badge},
        )
        if created:
            user.set_password(password)
            user.save()
        return user
