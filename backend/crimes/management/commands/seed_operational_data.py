import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.contrib.auth import get_user_model
from django.db import transaction

from crimes.models import Incident, FIR, Complaint
from users.models import PoliceStation
from patrol.models import PatrolAssignment, PatrolLocation, PatrolStatusHistory
from ai_prediction.services import AIPredictionService

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds realistic operational data for FIRs, Incidents, Officers, Patrols, and GPS Telemetry in Gujarat/Ahmedabad.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Beginning operational data seeding...'))

        with transaction.atomic():
            now = timezone.now()

            # ---------------------------------------------------------
            # 1. Police Stations
            # ---------------------------------------------------------
            stations_data = [
                {
                    'code': 'NAV-01',
                    'name': 'Navrangpura Police Station',
                    'address': 'CG Road, Navrangpura, Ahmedabad, Gujarat 380009',
                    'lat': 23.0395,
                    'lng': 72.5571,
                },
                {
                    'code': 'SAT-02',
                    'name': 'Satellite Police Station',
                    'address': 'Satellite Road, Near Shivranjani Cross Road, Ahmedabad, Gujarat 380015',
                    'lat': 23.0277,
                    'lng': 72.5136,
                },
                {
                    'code': 'VAS-03',
                    'name': 'Vastrapur Police Station',
                    'address': 'Near Vastrapur Lake, Bodakdev, Ahmedabad, Gujarat 380015',
                    'lat': 23.0350,
                    'lng': 72.5280,
                },
                {
                    'code': 'GND-21',
                    'name': 'Sector 21 Gandhinagar Police Station',
                    'address': 'Sector 21, Gandhinagar, Gujarat 382021',
                    'lat': 23.2230,
                    'lng': 72.6492,
                },
            ]

            stations = {}
            for s_info in stations_data:
                station, _ = PoliceStation.objects.update_or_create(
                    station_code=s_info['code'],
                    defaults={
                        'name': s_info['name'],
                        'address': s_info['address'],
                        'location': Point(s_info['lng'], s_info['lat'], srid=4326),
                        'is_active': True,
                    }
                )
                stations[s_info['code']] = station
                self.stdout.write(f'  [Station] {station.name} ({station.station_code}) ready.')

            # Ensure station accounts exist
            station_users_data = [
                ('station_navrangpura', 'station123', 'NAV-01'),
                ('station_satellite', 'station123', 'SAT-02'),
                ('station_vastrapur', 'station123', 'VAS-03'),
                ('station_gandhinagar', 'station123', 'GND-21'),
            ]
            for uname, pwd, scode in station_users_data:
                s_user, created = User.objects.get_or_create(username=uname)
                s_user.set_password(pwd)
                s_user.role = 'STATION'
                s_user.station = stations[scode]
                s_user.save()

            # Ensure admin exists
            admin_user, _ = User.objects.get_or_create(username='admin')
            if admin_user.role != 'ADMIN':
                admin_user.role = 'ADMIN'
                admin_user.set_password('admin123')
                admin_user.save()

            # ---------------------------------------------------------
            # 2. Patrol Officers
            # ---------------------------------------------------------
            officers_data = [
                {
                    'username': 'patrol_rathod',
                    'name': 'Vikram Rathod',
                    'badge': 'GJ-NAV-1041',
                    'phone': '+91 98250 11041',
                    'station_code': 'NAV-01',
                },
                {
                    'username': 'patrol_patel',
                    'name': 'Hardik Patel',
                    'badge': 'GJ-NAV-1042',
                    'phone': '+91 98250 11042',
                    'station_code': 'NAV-01',
                },
                {
                    'username': 'patrol_solanki',
                    'name': 'Rajesh Solanki',
                    'badge': 'GJ-SAT-2051',
                    'phone': '+91 98250 22051',
                    'station_code': 'SAT-02',
                },
                {
                    'username': 'patrol_shah',
                    'name': 'Aniket Shah',
                    'badge': 'GJ-SAT-2052',
                    'phone': '+91 98250 22052',
                    'station_code': 'SAT-02',
                },
                {
                    'username': 'patrol_vaghela',
                    'name': 'Mahendra Vaghela',
                    'badge': 'GJ-VAS-3061',
                    'phone': '+91 98250 33061',
                    'station_code': 'VAS-03',
                },
                {
                    'username': 'patrol_desai',
                    'name': 'Bhavesh Desai',
                    'badge': 'GJ-VAS-3062',
                    'phone': '+91 98250 33062',
                    'station_code': 'VAS-03',
                },
                {
                    'username': 'patrol_chavda',
                    'name': 'Kiran Chavda',
                    'badge': 'GJ-GND-4071',
                    'phone': '+91 98250 44071',
                    'station_code': 'GND-21',
                },
            ]

            officers = {}
            for o_info in officers_data:
                officer, _ = User.objects.get_or_create(username=o_info['username'])
                officer.set_password('patrol123')
                officer.role = 'PATROL'
                officer.badge_number = o_info['badge']
                officer.phone_number = o_info['phone']
                officer.first_name = o_info['name'].split()[0]
                officer.last_name = o_info['name'].split()[1] if len(o_info['name'].split()) > 1 else ''
                officer.station = stations[o_info['station_code']]
                officer.save()
                officers[o_info['username']] = officer
                self.stdout.write(f'  [Officer] {officer.get_full_name()} ({officer.badge_number}) @ {officer.station.station_code} ready.')

            # Ensure existing test patrol users have valid stations
            existing_officers = {
                'patrol_mehta': ('GJ-NAV-1001', 'NAV-01'),
                'patrol_joshi': ('GJ-SAT-2001', 'SAT-02'),
                'patrol_ram': ('GJ-NAV-1002', 'NAV-01'),
            }
            for uname, (bnum, scode) in existing_officers.items():
                p_user = User.objects.filter(username=uname).first()
                if p_user:
                    p_user.station = stations[scode]
                    p_user.badge_number = bnum
                    p_user.role = 'PATROL'
                    p_user.save()

            # ---------------------------------------------------------
            # 3. Incidents (Tactical Operational Queue)
            # ---------------------------------------------------------
            incidents_data = [
                {
                    'title': 'Armed Chain Snatching near Municipal Market CG Road',
                    'description': 'Two masked suspects on a dark motorcycle snatched a gold ornament from a pedestrian near CG Road Municipal Market and sped toward Mithakhali.',
                    'severity': Incident.Severity.CRITICAL,
                    'status': Incident.Status.OPEN,
                    'station_code': 'NAV-01',
                    'lat': 23.0384,
                    'lng': 72.5592,
                    'hours_ago': 0.5,
                },
                {
                    'title': 'Commercial UPI & Phishing Scam Reported at Gujarat University',
                    'description': 'Student victim reported unauthorized withdrawal of Rs 85,000 via fake examination registration portal. Immediate cyber forensics triage requested.',
                    'severity': Incident.Severity.HIGH,
                    'status': Incident.Status.OPEN,
                    'station_code': 'NAV-01',
                    'lat': 23.0410,
                    'lng': 72.5530,
                    'hours_ago': 2.0,
                },
                {
                    'title': 'Luxury SUV Theft from Residential Parking on Satellite Road',
                    'description': 'Silver SUV stolen between 01:00 and 04:00 from basement parking near Star Bazaar. FastTag ping recorded near Sanand Toll Plaza.',
                    'severity': Incident.Severity.HIGH,
                    'status': Incident.Status.OPEN,
                    'station_code': 'SAT-02',
                    'lat': 23.0265,
                    'lng': 72.5148,
                    'hours_ago': 4.5,
                },
                {
                    'title': 'Traffic Congestion and Multi-Vehicle Collision at Iskcon Flyover',
                    'description': 'Three-vehicle collision on SG Highway north-bound carriageway near Iskcon flyover causing severe lane blockage; emergency tow requested.',
                    'severity': Incident.Severity.MEDIUM,
                    'status': Incident.Status.OPEN,
                    'station_code': 'SAT-02',
                    'lat': 23.0280,
                    'lng': 72.5070,
                    'hours_ago': 1.0,
                },
                {
                    'title': 'Late-Night Altercation and Property Damage at Sindhu Bhavan',
                    'description': 'Report of heated brawl outside a lounge on Sindhu Bhavan Marg resulting in broken storefront glass. Response unit requested for crowd control.',
                    'severity': Incident.Severity.HIGH,
                    'status': Incident.Status.OPEN,
                    'station_code': 'VAS-03',
                    'lat': 23.0425,
                    'lng': 72.5015,
                    'hours_ago': 3.0,
                },
                {
                    'title': 'Daytime Apartment Burglary in Vastrapur Lake Precinct',
                    'description': 'Apartment lock broken while occupants were at work. Cash and heirloom valuables reported missing. Forensic team summoned.',
                    'severity': Incident.Severity.MEDIUM,
                    'status': Incident.Status.RESOLVED,
                    'station_code': 'VAS-03',
                    'lat': 23.0362,
                    'lng': 72.5295,
                    'hours_ago': 18.0,
                },
                {
                    'title': 'Missing Senior Citizen Search Alert in Gandhinagar Sector 21',
                    'description': '68-year-old male with mild memory impairment walked away from Sector 21 residential block at 07:00. Mobile unit patrol alert active.',
                    'severity': Incident.Severity.MEDIUM,
                    'status': Incident.Status.OPEN,
                    'station_code': 'GND-21',
                    'lat': 23.2240,
                    'lng': 72.6510,
                    'hours_ago': 5.0,
                },
            ]

            created_incidents = []
            for inc_info in incidents_data:
                inc_dt = now - datetime.timedelta(hours=inc_info['hours_ago'])
                incident, _ = Incident.objects.update_or_create(
                    title=inc_info['title'],
                    defaults={
                        'description': inc_info['description'],
                        'severity': inc_info['severity'],
                        'status': inc_info['status'],
                        'station': stations[inc_info['station_code']],
                        'location': Point(inc_info['lng'], inc_info['lat'], srid=4326),
                        'date_occurred': inc_dt,
                    }
                )
                created_incidents.append(incident)
                self.stdout.write(f'  [Incident] {incident.title} ({incident.severity}) @ {incident.station.station_code} ready.')

            # ---------------------------------------------------------
            # 4. FIRs (First Information Reports)
            # ---------------------------------------------------------
            firs_data = [
                {
                    'fir_number': 'FIR-2026-NAV-0101',
                    'category': 'ROBBERY',
                    'priority': 'HIGH',
                    'location_text': 'CG Road Municipal Market, Navrangpura',
                    'description': 'Armed robbery of gold chain and iPhone 15 near CG Road. Two unidentified suspects on black motorcycle. Complainant Smt. Meena Shah.',
                    'status': FIR.Status.INVESTIGATING,
                    'station_code': 'NAV-01',
                    'lat': 23.0384,
                    'lng': 72.5592,
                    'days_ago': 0.2,
                },
                {
                    'fir_number': 'FIR-2026-SAT-0202',
                    'category': 'VEHICLE THEFT',
                    'priority': 'HIGH',
                    'location_text': 'Prerna Tirth Derasar Road, Satellite',
                    'description': 'Theft of Hyundai Creta (GJ-01-XX-9821) parked overnight in residential complex. CCTV footage secured for forensic examination.',
                    'status': FIR.Status.OPEN,
                    'station_code': 'SAT-02',
                    'lat': 23.0265,
                    'lng': 72.5148,
                    'days_ago': 0.5,
                },
                {
                    'fir_number': 'FIR-2026-VAS-0303',
                    'category': 'BURGLARY',
                    'priority': 'MEDIUM',
                    'location_text': 'Vastrapur Lake Residency, Bodakdev',
                    'description': 'Housebreaking and theft of jewelry worth Rs 2.8 lakhs during afternoon hours. Forensic finger-print lift completed.',
                    'status': FIR.Status.INVESTIGATING,
                    'station_code': 'VAS-03',
                    'lat': 23.0362,
                    'lng': 72.5295,
                    'days_ago': 1.0,
                },
                {
                    'fir_number': 'FIR-2026-NAV-0104',
                    'category': 'CYBER CRIME',
                    'priority': 'HIGH',
                    'location_text': 'Commerce Six Roads, Navrangpura',
                    'description': 'Online banking deception and phishing attack via fraudulent electricity bill payment portal. Total defrauded sum Rs 1,45,000.',
                    'status': FIR.Status.OPEN,
                    'station_code': 'NAV-01',
                    'lat': 23.0410,
                    'lng': 72.5530,
                    'days_ago': 1.5,
                },
                {
                    'fir_number': 'FIR-2026-SAT-0205',
                    'category': 'ASSAULT',
                    'priority': 'MEDIUM',
                    'location_text': 'Shivranjani Crossroads Commercial Complex',
                    'description': 'Dispute over commercial delivery parking turned into physical scuffle. Accused identified and issued notice to appear.',
                    'status': FIR.Status.CLOSED,
                    'station_code': 'SAT-02',
                    'lat': 23.0230,
                    'lng': 72.5210,
                    'days_ago': 3.0,
                },
                {
                    'fir_number': 'FIR-2026-GND-0406',
                    'category': 'MISSING PERSON',
                    'priority': 'MEDIUM',
                    'location_text': 'Sector 21 Community Garden, Gandhinagar',
                    'description': 'Missing person report for Sh. Arvindbhai Patel (Age 68). Height 5ft 6in, last seen wearing gray kurta and specs.',
                    'status': FIR.Status.INVESTIGATING,
                    'station_code': 'GND-21',
                    'lat': 23.2240,
                    'lng': 72.6510,
                    'days_ago': 0.8,
                },
                {
                    'fir_number': 'FIR-2026-VAS-0307',
                    'category': 'TRAFFIC INCIDENT',
                    'priority': 'MEDIUM',
                    'location_text': 'IIM Road Junction, Vastrapur',
                    'description': 'Hit-and-run collision involving two-wheeler and speeding white sedan. Victim sustained collarbone fracture. Registration number traced.',
                    'status': FIR.Status.OPEN,
                    'station_code': 'VAS-03',
                    'lat': 23.0335,
                    'lng': 72.5315,
                    'days_ago': 2.0,
                },
            ]

            created_firs = []
            for fir_info in firs_data:
                f_dt = now - datetime.timedelta(days=fir_info['days_ago'])
                fir, _ = FIR.objects.update_or_create(
                    fir_number=fir_info['fir_number'],
                    defaults={
                        'description': f"[{fir_info['category']}] [{fir_info['priority']}] - {fir_info['location_text']} - {fir_info['description']}",
                        'status': fir_info['status'],
                        'station': stations[fir_info['station_code']],
                        'location': Point(fir_info['lng'], fir_info['lat'], srid=4326),
                        'reported_by': admin_user,
                    }
                )
                FIR.objects.filter(id=fir.id).update(date_reported=f_dt)
                created_firs.append(fir)
                self.stdout.write(f'  [FIR] {fir.fir_number} ({fir.status}) @ {fir.station.station_code} ready.')

            # ---------------------------------------------------------
            # 5. Complaints (Citizen Intake)
            # ---------------------------------------------------------
            complaints_data = [
                ('Unauthorized loud music and public nuisance near Mithakhali railway crossing late night.', 'NAV-01', Complaint.Status.PENDING),
                ('Frequent two-wheeler speeding and reckless stunt riding on CG Road after 22:00.', 'NAV-01', Complaint.Status.RESOLVED),
                ('Suspicious loitering near residential society entrance on Satellite Road.', 'SAT-02', Complaint.Status.PENDING),
                ('Broken streetlight causing dark blind spot at Iskcon underpass footpath.', 'SAT-02', Complaint.Status.PENDING),
                ('Encroachment by illegal vending stalls causing pedestrian blockage outside Vastrapur Lake gate.', 'VAS-03', Complaint.Status.RESOLVED),
                ('Missing street drainage cover on Bodakdev main approach road.', 'VAS-03', Complaint.Status.PENDING),
                ('Frequent unattended stray cattle causing traffic near Sector 21 main bazaar.', 'GND-21', Complaint.Status.PENDING),
            ]
            for desc, scode, cstatus in complaints_data:
                Complaint.objects.get_or_create(
                    description=desc,
                    defaults={
                        'station': stations[scode],
                        'status': cstatus,
                    }
                )

            # ---------------------------------------------------------
            # 6. Patrol Assignments & Real-Time GPS Telemetry Breadcrumbs
            # ---------------------------------------------------------
            PatrolLocation.objects.all().delete()
            PatrolAssignment.objects.all().delete()

            patrol_configs = [
                {
                    'officer': 'patrol_rathod',
                    'zone': 'CG Road Commercial Precinct',
                    'priority': PatrolAssignment.Priority.HIGH,
                    'status': PatrolAssignment.Status.EN_ROUTE,
                    'station_code': 'NAV-01',
                    'incident_idx': 0,
                    'fir_idx': 0,
                    'dest_lat': 23.0384,
                    'dest_lng': 72.5592,
                    'instructions': 'Immediate tactical intercept: Cordon CG Road Municipal Market and review commercial CCTV feeds.',
                    'gps_trail': [
                        (23.0395, 72.5571, 12),
                        (23.0392, 72.5578, 9),
                        (23.0389, 72.5583, 6),
                        (23.0386, 72.5588, 3),
                        (23.0385, 72.5590, 0.4),
                    ]
                },
                {
                    'officer': 'patrol_patel',
                    'zone': 'Gujarat University & Law Garden Sector',
                    'priority': PatrolAssignment.Priority.CRITICAL,
                    'status': PatrolAssignment.Status.ARRIVED,
                    'station_code': 'NAV-01',
                    'incident_idx': 1,
                    'fir_idx': 3,
                    'dest_lat': 23.0410,
                    'dest_lng': 72.5530,
                    'instructions': 'Secure administrative server room, liaise with campus registrar, and collect digital logs.',
                    'gps_trail': [
                        (23.0395, 72.5571, 20),
                        (23.0400, 72.5558, 15),
                        (23.0406, 72.5542, 10),
                        (23.0409, 72.5534, 5),
                        (23.0410, 72.5530, 0.8),
                    ]
                },
                {
                    'officer': 'patrol_solanki',
                    'zone': 'Satellite West & SG Highway Highway Patrol',
                    'priority': PatrolAssignment.Priority.HIGH,
                    'status': PatrolAssignment.Status.EN_ROUTE,
                    'station_code': 'SAT-02',
                    'incident_idx': 2,
                    'fir_idx': 1,
                    'dest_lat': 23.0265,
                    'dest_lng': 72.5148,
                    'instructions': 'Deploy ANPR scanner on SG Highway corridor; flag gray SUV with matching FastTag profile.',
                    'gps_trail': [
                        (23.0277, 72.5136, 18),
                        (23.0272, 72.5140, 12),
                        (23.0268, 72.5144, 7),
                        (23.0266, 72.5147, 1.2),
                    ]
                },
                {
                    'officer': 'patrol_shah',
                    'zone': 'Iskcon Junction & Shivranjani Beat',
                    'priority': PatrolAssignment.Priority.MEDIUM,
                    'status': PatrolAssignment.Status.ASSIGNED,
                    'station_code': 'SAT-02',
                    'incident_idx': 3,
                    'fir_idx': 4,
                    'dest_lat': 23.0280,
                    'dest_lng': 72.5070,
                    'instructions': 'Station at Iskcon underpass for traffic diversion and emergency crane coordination.',
                    'gps_trail': [
                        (23.0277, 72.5136, 6),
                        (23.0276, 72.5134, 2.0),
                    ]
                },
                {
                    'officer': 'patrol_vaghela',
                    'zone': 'Sindhu Bhavan Commercial Strip',
                    'priority': PatrolAssignment.Priority.HIGH,
                    'status': PatrolAssignment.Status.EN_ROUTE,
                    'station_code': 'VAS-03',
                    'incident_idx': 4,
                    'fir_idx': None,
                    'dest_lat': 23.0425,
                    'dest_lng': 72.5015,
                    'instructions': 'Maintain visible blue-light presence along Sindhu Bhavan dining corridor; prevent crowd buildup.',
                    'gps_trail': [
                        (23.0350, 72.5280, 15),
                        (23.0375, 72.5190, 10),
                        (23.0400, 72.5100, 5),
                        (23.0418, 72.5040, 0.5),
                    ]
                },
                {
                    'officer': 'patrol_desai',
                    'zone': 'Vastrapur Lake & Alpha One Sector',
                    'priority': PatrolAssignment.Priority.MEDIUM,
                    'status': PatrolAssignment.Status.COMPLETED,
                    'station_code': 'VAS-03',
                    'incident_idx': 5,
                    'fir_idx': 2,
                    'dest_lat': 23.0362,
                    'dest_lng': 72.5295,
                    'instructions': 'Completed perimeter surveillance and forensic escort for fingerprint team.',
                    'gps_trail': [
                        (23.0350, 72.5280, 75),
                        (23.0358, 72.5288, 65),
                        (23.0362, 72.5295, 50),
                        (23.0350, 72.5280, 42),
                    ]
                },
                {
                    'officer': 'patrol_chavda',
                    'zone': 'Sector 21 & Gandhinagar Capital Beat',
                    'priority': PatrolAssignment.Priority.MEDIUM,
                    'status': PatrolAssignment.Status.ARRIVED,
                    'station_code': 'GND-21',
                    'incident_idx': 6,
                    'fir_idx': 5,
                    'dest_lat': 23.2240,
                    'dest_lng': 72.6510,
                    'instructions': 'Search Sector 21 community parks and liaise with local residential security committee.',
                    'gps_trail': [
                        (23.2230, 72.6492, 22),
                        (23.2234, 72.6498, 14),
                        (23.2238, 72.6505, 7),
                        (23.2240, 72.6510, 0.7),
                    ]
                },
            ]

            for p_cfg in patrol_configs:
                target_inc = created_incidents[p_cfg['incident_idx']] if p_cfg.get('incident_idx') is not None else None
                target_fir = created_firs[p_cfg['fir_idx']] if p_cfg.get('fir_idx') is not None else None
                officer_user = officers[p_cfg['officer']]
                station_obj = stations[p_cfg['station_code']]

                assignment = PatrolAssignment.objects.create(
                    officer=officer_user,
                    zone_name=p_cfg['zone'],
                    priority=p_cfg['priority'],
                    status=p_cfg['status'],
                    station=station_obj,
                    destination=Point(p_cfg['dest_lng'], p_cfg['dest_lat'], srid=4326),
                    instructions=p_cfg['instructions'],
                    incident=target_inc,
                    fir=target_fir,
                )

                PatrolStatusHistory.objects.create(
                    assignment=assignment,
                    new_status=PatrolAssignment.Status.ASSIGNED,
                    actor=admin_user,
                )
                if p_cfg['status'] != PatrolAssignment.Status.ASSIGNED:
                    PatrolStatusHistory.objects.create(
                        assignment=assignment,
                        old_status=PatrolAssignment.Status.ASSIGNED,
                        new_status=p_cfg['status'],
                        actor=officer_user,
                    )

                for lat, lng, min_ago in p_cfg['gps_trail']:
                    ping_dt = now - datetime.timedelta(minutes=min_ago)
                    loc = PatrolLocation.objects.create(
                        assignment=assignment,
                        location=Point(lng, lat, srid=4326),
                    )
                    PatrolLocation.objects.filter(id=loc.id).update(timestamp=ping_dt)

                self.stdout.write(f'  [Patrol] Unit P-{assignment.id:03d} ({officer_user.username}) -> {p_cfg["status"]} with {len(p_cfg["gps_trail"])} GPS pings.')

        self.stdout.write(self.style.NOTICE('Triggering AI K-Means clustering to compute database risk scores...'))
        try:
            job = AIPredictionService.trigger_prediction()
            self.stdout.write(self.style.SUCCESS(f'  [AI Prediction] K-Means clustering complete: {job.details}'))
        except Exception as ex:
            self.stdout.write(self.style.WARNING(f'  [AI Prediction] Warning: {ex}'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded realistic operational data into the CyberSphere database!'))
