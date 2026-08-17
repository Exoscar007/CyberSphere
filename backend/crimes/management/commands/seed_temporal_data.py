import datetime
import math
from zoneinfo import ZoneInfo
import numpy as np

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.db import transaction

from crimes.models import Incident, FIR, Evidence
from users.models import PoliceStation, CustomUser
from patrol.models import PatrolAssignment, PatrolStatusHistory

STATIONS_CONFIG = [
    {"code": "NAV-01", "name": "Navrangpura Police Station", "lng": 72.5571, "lat": 23.0395, "address": "Navrangpura, Ahmedabad", "share": 0.16, "areas": ["Navrangpura Market", "CG Road", "Gujarat University area"]},
    {"code": "SAT-02", "name": "Satellite Police Station", "lng": 72.5136, "lat": 23.0277, "address": "Satellite, Ahmedabad", "share": 0.13, "areas": ["Satellite Road", "Iskcon Cross Road", "Shivranjani"]},
    {"code": "MAN-03", "name": "Maninagar Police Station", "lng": 72.5820, "lat": 23.0080, "address": "Maninagar, Ahmedabad", "share": 0.17, "areas": ["Kankaria Lake", "Maninagar Railway Station", "Jawahar Chowk"]},
    {"code": "ELL-04", "name": "Ellis Bridge Police Station", "lng": 72.5620, "lat": 23.0290, "address": "Ellis Bridge, Ahmedabad", "share": 0.14, "areas": ["Law Garden", "VS Hospital area", "Paldi"]},
    {"code": "BOD-05", "name": "Bodakdev Police Station", "lng": 72.5000, "lat": 23.0400, "address": "Bodakdev, Ahmedabad", "share": 0.10, "areas": ["Sindhu Bhavan Marg", "Judges Bungalow Road", "Vastrapur Lake"]},
    {"code": "CHA-06", "name": "Chandkheda Police Station", "lng": 72.5850, "lat": 23.1000, "address": "Chandkheda, Ahmedabad", "share": 0.10, "areas": ["Zundal Circle", "Motera Stadium area", "Vishwakarma Govt Engg College"]},
    {"code": "BOP-07", "name": "Bopal Police Station", "lng": 72.4850, "lat": 23.0100, "address": "Bopal, Ahmedabad", "share": 0.09, "areas": ["Bopal Cross Road", "South Bopal", "TRP Mall area"]},
    {"code": "SGH-08", "name": "SG Highway Police Station", "lng": 72.5050, "lat": 23.0550, "address": "SG Highway, Ahmedabad", "share": 0.11, "areas": ["Sola Bhagwat", "Kargil Petrol Pump", "Gota Cross Road"]},
]

CRIME_CATEGORIES = {
    "Theft": {"share": 0.28, "peak_start": 10, "peak_end": 16, "type": "Property", "sev": [0.45, 0.38, 0.14, 0.03]},
    "Assault": {"share": 0.12, "peak_start": 19, "peak_end": 25, "type": "Violent", "sev": [0.08, 0.28, 0.48, 0.16]},
    "Fraud": {"share": 0.11, "peak_start": 9, "peak_end": 18, "type": "Other", "sev": [0.35, 0.42, 0.18, 0.05]},
    "Vehicle Theft": {"share": 0.10, "peak_start": 22, "peak_end": 28, "type": "Property", "sev": [0.30, 0.42, 0.22, 0.06]},
    "Burglary": {"share": 0.09, "peak_start": 10, "peak_end": 15, "type": "Property", "sev": [0.18, 0.40, 0.32, 0.10]},
    "Public Disturbance": {"share": 0.09, "peak_start": 17, "peak_end": 23, "type": "Other", "sev": [0.55, 0.32, 0.10, 0.03]},
    "Traffic Incident": {"share": 0.06, "peak_start": [7, 17], "peak_end": [9, 19], "type": "Other", "sev": [0.20, 0.38, 0.30, 0.12]},
    "Robbery": {"share": 0.05, "peak_start": 20, "peak_end": 24, "type": "Violent", "sev": [0.05, 0.22, 0.48, 0.25]},
    "Vandalism": {"share": 0.05, "peak_start": 21, "peak_end": 27, "type": "Other", "sev": [0.50, 0.35, 0.12, 0.03]},
    "Domestic Dispute": {"share": 0.05, "peak_start": 18, "peak_end": 23, "type": "Domestic Dispute", "sev": [0.12, 0.33, 0.38, 0.17]},
}

MONTHLY_WEIGHTS = {
    1: 0.85, 2: 0.87, 3: 0.95, 4: 1.00, 5: 1.15, 6: 1.12,
    7: 0.88, 8: 0.85, 9: 0.93, 10: 1.10, 11: 1.12, 12: 0.92
}

def generate_hourly_weights(cat_info):
    weights = np.ones(24) * 0.1
    if isinstance(cat_info['peak_start'], list):
        for s, e in zip(cat_info['peak_start'], cat_info['peak_end']):
            for h in range(s, e):
                weights[h % 24] += 1.0
    else:
        for h in range(cat_info['peak_start'], cat_info['peak_end']):
            weights[h % 24] += 1.0
    return weights / weights.sum()

class Command(BaseCommand):
    help = 'Generates realistic historical Incident, FIR, and Operational lifecycle records'

    def add_arguments(self, parser):
        parser.add_argument('--months', type=int, default=12)
        parser.add_argument('--seed', type=int, default=42)
        parser.add_argument('--daily-volume', type=int, default=22)
        parser.add_argument('--clear', action='store_true')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        months = options['months']
        seed = options['seed']
        daily_volume = options['daily_volume']
        clear = options['clear']
        dry_run = options['dry_run']

        rng = np.random.default_rng(seed)
        ist = ZoneInfo("Asia/Kolkata")

        if clear:
            self.stdout.write("Clearing existing synthetic records...")
            if not dry_run:
                PatrolAssignment.objects.filter(instructions__startswith='[SYNTHETIC]').delete()
                inc_count, _ = Incident.objects.filter(description__startswith='[SYNTHETIC]').delete()
                fir_count, _ = FIR.objects.filter(description__startswith='[SYNTHETIC]').delete()
                Evidence.objects.filter(file__startswith='evidence/synthetic').delete()
                self.stdout.write(f"Cleared incidents, FIRs, and linked operational records.")

        end_date = timezone.now().astimezone(ist)
        start_date = end_date - datetime.timedelta(days=30 * months)
        
        self.stdout.write(f"Generating data from {start_date.date()} to {end_date.date()}")
        
        stations = []
        station_users = {}
        patrol_users = {}
        total_patrol_officers = 0

        if not dry_run:
            for s_cfg in STATIONS_CONFIG:
                st, _ = PoliceStation.objects.get_or_create(
                    station_code=s_cfg['code'],
                    defaults={
                        'name': s_cfg['name'],
                        'address': s_cfg['address'],
                        'location': Point(s_cfg['lng'], s_cfg['lat'], srid=4326),
                    }
                )
                stations.append((st, s_cfg))
                
                # Create user for FIR
                user, _ = CustomUser.objects.get_or_create(
                    username=f"station_{s_cfg['code'].lower()}",
                    defaults={
                        'role': 'STATION',
                        'station': st,
                        'badge_number': f"B-{s_cfg['code']}",
                    }
                )
                if not user.password or user.password == '':
                    user.set_password('station123')
                    user.save()
                station_users[st.id] = user

                # Create Patrol Officers (3 per station)
                patrol_users[st.id] = []
                for i in range(1, 4):
                    puser, _ = CustomUser.objects.get_or_create(
                        username=f"officer_{s_cfg['code'].lower()}_{i}",
                        defaults={
                            'role': 'PATROL',
                            'station': st,
                            'badge_number': f"P-{s_cfg['code']}-{i}",
                        }
                    )
                    if not puser.password or puser.password == '':
                        puser.set_password('patrol123')
                        puser.save()
                    patrol_users[st.id].append(puser)
                    total_patrol_officers += 1

        cats = list(CRIME_CATEGORIES.keys())
        cat_shares = [CRIME_CATEGORIES[c]['share'] for c in cats]
        st_shares = [s['share'] for s in STATIONS_CONFIG]
        
        incidents_to_create = []
        fir_info = []

        total_days = (end_date.date() - start_date.date()).days
        current_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        for day in range(total_days):
            d = current_date + datetime.timedelta(days=day)
            month_weight = MONTHLY_WEIGHTS[d.month]
            base = daily_volume * month_weight
            
            noise = rng.normal(1, 0.20)
            multiplier = 1.0
            spike_roll = rng.random()
            if spike_roll < 0.05:
                multiplier = rng.uniform(1.5, 2.5)
            elif spike_roll < 0.10:
                multiplier = rng.uniform(0.3, 0.6)
                
            daily_count = max(1, int(base * noise * multiplier))
            
            for _ in range(daily_count):
                cat = rng.choice(cats, p=cat_shares)
                cat_info = CRIME_CATEGORIES[cat]
                
                h_weights = generate_hourly_weights(cat_info)
                hour = rng.choice(24, p=h_weights)
                minute = rng.integers(0, 60)
                dt = d.replace(hour=hour, minute=minute)
                
                st_cfg = rng.choice(STATIONS_CONFIG, p=st_shares)
                if not dry_run:
                    st_obj = next(s[0] for s in stations if s[1]['code'] == st_cfg['code'])
                
                sigma_roll = rng.random()
                if sigma_roll < 0.70:
                    sigma = 0.010
                elif sigma_roll < 0.95:
                    sigma = 0.025
                else:
                    sigma = 0.050
                    
                lng = rng.normal(st_cfg['lng'], sigma)
                lat = rng.normal(st_cfg['lat'], sigma)
                lng = max(72.45, min(72.65, lng))
                lat = max(22.95, min(23.12, lat))
                
                area = rng.choice(st_cfg['areas'])
                severity = rng.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"], p=cat_info['sev'])
                
                age_days = (end_date - dt).days
                if age_days > 60:
                    status = rng.choice(["RESOLVED", "CANCELLED", "OPEN"], p=[0.85, 0.10, 0.05])
                elif age_days >= 14:
                    status = rng.choice(["RESOLVED", "CANCELLED", "OPEN"], p=[0.50, 0.05, 0.45])
                else:
                    status = rng.choice(["RESOLVED", "OPEN"], p=[0.15, 0.85])
                    
                title = f"{cat} — {area}"
                desc = f"[SYNTHETIC] {cat} incident reported near {area}. {severity} severity."
                
                if not dry_run:
                    inc = Incident(
                        title=title,
                        description=desc,
                        location=Point(lng, lat, srid=4326),
                        date_occurred=dt,
                        severity=severity,
                        status=status,
                        station=st_obj
                    )
                    incidents_to_create.append(inc)
                    
                    if rng.random() < 0.30:
                        fir_delay = rng.uniform(0, 48)
                        fir_dt = dt + datetime.timedelta(hours=fir_delay)
                        
                        if age_days > 60:
                            f_status = rng.choice(["CLOSED", "INVESTIGATING", "OPEN"], p=[0.60, 0.30, 0.10])
                        elif age_days >= 14:
                            f_status = rng.choice(["CLOSED", "INVESTIGATING", "OPEN"], p=[0.20, 0.50, 0.30])
                        else:
                            f_status = rng.choice(["CLOSED", "INVESTIGATING", "OPEN"], p=[0.05, 0.25, 0.70])
                            
                        fir_info.append({
                            'dt': fir_dt,
                            'status': f_status,
                            'location': Point(lng, lat, srid=4326),
                            'station': st_obj,
                            'user': station_users[st_obj.id],
                            'cat': cat,
                            'area': area
                        })

        if dry_run:
            self.stdout.write(f"Dry run complete.")
            return

        self.stdout.write(f"Bulk creating {len(incidents_to_create)} incidents...")
        Incident.objects.bulk_create(incidents_to_create, batch_size=500)
        
        self.stdout.write(f"Creating {len(fir_info)} FIRs...")
        fir_updates = []
        for i, info in enumerate(fir_info):
            fir = FIR.objects.create(
                fir_number=f"SYN-{info['station'].station_code}-{i+1:05d}",
                description=f"[SYNTHETIC] FIR for {info['cat']} incident near {info['area']}",
                reported_by=info['user'],
                location=info['location'],
                status=info['status'],
                station=info['station']
            )
            fir_updates.append((fir.pk, info['dt']))
            
        for pk, dt in fir_updates:
            FIR.objects.filter(pk=pk).update(date_reported=dt)

        self.stdout.write("Fetching created incidents for operational assignment...")
        all_incidents = list(Incident.objects.filter(description__startswith='[SYNTHETIC]').order_by('date_occurred'))

        today_start = end_date - datetime.timedelta(hours=24)
        historical_incidents = [inc for inc in all_incidents if inc.date_occurred < today_start]
        today_incidents = [inc for inc in all_incidents if inc.date_occurred >= today_start]
        
        # 15% of historical incidents get a COMPLETED patrol
        historical_to_patrol = [inc for inc in historical_incidents if rng.random() < 0.15]
        
        # Determine available officers (will be removed as they get active assignments)
        available_officers = set()
        for p_list in patrol_users.values():
            for o in p_list:
                available_officers.add(o.id)

        assignments_to_create = []
        for inc in historical_to_patrol:
            officer = rng.choice(patrol_users[inc.station_id])
            assignments_to_create.append({'inc': inc, 'officer': officer, 'is_active': False})

        # For today's incidents, pick a subset to be active
        today_to_patrol = [inc for inc in today_incidents if rng.random() < 0.40]
        for inc in today_to_patrol:
            station_officers = [o for o in patrol_users[inc.station_id] if o.id in available_officers]
            if station_officers:
                officer = rng.choice(station_officers)
                available_officers.remove(officer.id) # Mark as busy
                assignments_to_create.append({'inc': inc, 'officer': officer, 'is_active': True})
            else:
                # If no available officer at station, skip assignment
                pass

        self.stdout.write(f"Generating lifecycle for {len(assignments_to_create)} operations...")

        created_pas_count = 0
        completed_pas_count = 0
        active_pas_count = {'ASSIGNED': 0, 'ACKNOWLEDGED': 0, 'EN_ROUTE': 0, 'ARRIVED': 0}
        created_histories = 0
        created_evidences = 0
        
        for p_info in assignments_to_create:
            inc = p_info['inc']
            officer = p_info['officer']
            is_active = p_info['is_active']
            
            start_dt = inc.date_occurred + datetime.timedelta(minutes=float(rng.uniform(1, 5)))
            
            if not is_active:
                end_dt = start_dt + datetime.timedelta(minutes=float(rng.uniform(30, 90)))
                status = 'COMPLETED'
                completed_pas_count += 1
            else:
                end_dt = None
                status = rng.choice(['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'])
                active_pas_count[status] += 1
                
            pa = PatrolAssignment.objects.create(
                officer=officer,
                zone_name=f"{inc.title.split('—')[-1].strip()} Zone",
                status=status,
                priority=inc.severity,
                destination=inc.location,
                instructions=f"[SYNTHETIC] Respond to {inc.severity} priority {inc.title}",
                station_id=inc.station_id,
                incident=inc
            )
            created_pas_count += 1
            PatrolAssignment.objects.filter(id=pa.id).update(start_time=start_dt, end_time=end_dt)
            
            # Helper to create and backdate history
            def add_history(old_s, new_s, dt):
                nonlocal created_histories
                h = PatrolStatusHistory.objects.create(assignment=pa, old_status=old_s, new_status=new_s, actor=officer)
                PatrolStatusHistory.objects.filter(id=h.id).update(timestamp=dt)
                created_histories += 1

            add_history(None, 'ASSIGNED', start_dt)
            current_status_dt = start_dt
            
            if not is_active or status in ['ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED']:
                current_status_dt += datetime.timedelta(minutes=float(rng.uniform(1, 3)))
                add_history('ASSIGNED', 'ACKNOWLEDGED', current_status_dt)
                
            if not is_active or status in ['EN_ROUTE', 'ARRIVED', 'COMPLETED']:
                current_status_dt += datetime.timedelta(minutes=float(rng.uniform(1, 3)))
                add_history('ACKNOWLEDGED', 'EN_ROUTE', current_status_dt)
                
            if not is_active or status in ['ARRIVED', 'COMPLETED']:
                current_status_dt += datetime.timedelta(minutes=float(rng.uniform(5, 15)))
                add_history('EN_ROUTE', 'ARRIVED', current_status_dt)
                
            if not is_active:
                add_history('ARRIVED', 'COMPLETED', end_dt)
                if rng.random() < 0.5:
                    ev = Evidence.objects.create(
                        incident=inc,
                        assignment=pa,
                        file='evidence/synthetic_photo.jpg',
                        uploaded_by=officer
                    )
                    Evidence.objects.filter(id=ev.id).update(uploaded_at=end_dt)
                    created_evidences += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n{'='*50}\n"
            f"Temporal & Operational Data Seeding Complete!\n"
            f"  Incidents created:        {len(all_incidents)}\n"
            f"  FIRs created:             {len(fir_info)}\n"
            f"  Stations ensured:         {len(stations)}\n"
            f"  Patrol Officers generated:{total_patrol_officers}\n"
            f"  Available Officers:       {len(available_officers)}\n"
            f"  Completed Operations:     {completed_pas_count}\n"
            f"  Active Operations:        {sum(active_pas_count.values())} {active_pas_count}\n"
            f"  History events generated: {created_histories}\n"
            f"  Evidence items uploaded:  {created_evidences}\n"
            f"  Period:                   {start_date.date()} → {end_date.date()}\n"
            f"{'='*50}"
        ))
