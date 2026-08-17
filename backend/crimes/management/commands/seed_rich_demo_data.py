import datetime
from zoneinfo import ZoneInfo
import numpy as np

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.gis.geos import Point
from django.db import transaction

from crimes.models import Incident, FIR, Evidence, Complaint
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
    "Theft": {"share": 0.23, "peak_start": 10, "peak_end": 16, "type": "Property", "sev": [0.45, 0.38, 0.14, 0.03]},
    "Assault": {"share": 0.12, "peak_start": 19, "peak_end": 25, "type": "Violent", "sev": [0.08, 0.28, 0.48, 0.16]},
    "Fraud": {"share": 0.11, "peak_start": 9, "peak_end": 18, "type": "Other", "sev": [0.35, 0.42, 0.18, 0.05]},
    "Vehicle Theft": {"share": 0.10, "peak_start": 22, "peak_end": 28, "type": "Property", "sev": [0.30, 0.42, 0.22, 0.06]},
    "Burglary": {"share": 0.09, "peak_start": 10, "peak_end": 15, "type": "Property", "sev": [0.18, 0.40, 0.32, 0.10]},
    "Public Disturbance": {"share": 0.09, "peak_start": 17, "peak_end": 23, "type": "Other", "sev": [0.55, 0.32, 0.10, 0.03]},
    "Traffic Incident": {"share": 0.06, "peak_start": [7, 17], "peak_end": [9, 19], "type": "Other", "sev": [0.20, 0.38, 0.30, 0.12]},
    "Robbery": {"share": 0.05, "peak_start": 20, "peak_end": 24, "type": "Violent", "sev": [0.05, 0.22, 0.48, 0.25]},
    "Vandalism": {"share": 0.05, "peak_start": 21, "peak_end": 27, "type": "Other", "sev": [0.50, 0.35, 0.12, 0.03]},
    "Domestic Dispute": {"share": 0.05, "peak_start": 18, "peak_end": 23, "type": "Domestic Dispute", "sev": [0.12, 0.33, 0.38, 0.17]},
    "Missing Person": {"share": 0.03, "peak_start": 8, "peak_end": 20, "type": "Other", "sev": [0.00, 0.20, 0.50, 0.30]},
    "Cyber Crime": {"share": 0.02, "peak_start": 0, "peak_end": 24, "type": "Other", "sev": [0.40, 0.40, 0.15, 0.05]},
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

def generate_patrol_route(start_lng, start_lat, end_lng, end_lat, start_time, end_time, status, rng):
    pts = []
    
    if status in ['ASSIGNED', 'ACKNOWLEDGED']:
        num_points = rng.integers(2, 5)
        progress_max = 0.05
    elif status == 'EN_ROUTE':
        num_points = rng.integers(5, 15)
        progress_max = rng.uniform(0.3, 0.8)
    else: # ARRIVED or COMPLETED
        num_points = rng.integers(8, 20)
        progress_max = 1.0

    total_duration = (end_time - start_time).total_seconds()
    if total_duration <= 0:
        total_duration = 60
        
    travel_time = total_duration * 0.7 if status == 'COMPLETED' else total_duration
    time_step = travel_time / max(1, num_points - 1)
    
    dx = end_lng - start_lng
    dy = end_lat - start_lat
    px = -dy
    py = dx
    curve_magnitude = rng.uniform(-0.01, 0.01)
    
    for i in range(num_points):
        t = i / max(1, num_points - 1) 
        current_t = t * progress_max
        
        cx = start_lng + dx * current_t
        cy = start_lat + dy * current_t
        
        curve_factor = np.sin(current_t * np.pi) * curve_magnitude
        cx += px * curve_factor
        cy += py * curve_factor
        
        cx += rng.normal(0, 0.0005)
        cy += rng.normal(0, 0.0005)
        
        pt_dt = start_time + datetime.timedelta(seconds=time_step * i)
        pts.append({'lng': cx, 'lat': cy, 'dt': pt_dt})
        
    if status in ['ARRIVED', 'COMPLETED']:
        hover_points = rng.integers(3, 8)
        hover_start_time = start_time + datetime.timedelta(seconds=travel_time)
        hover_duration = total_duration - travel_time
        
        if hover_duration > 0:
            h_step = hover_duration / max(1, hover_points)
            for i in range(1, hover_points + 1):
                hx = end_lng + rng.normal(0, 0.0003)
                hy = end_lat + rng.normal(0, 0.0003)
                pts.append({
                    'lng': hx,
                    'lat': hy,
                    'dt': hover_start_time + datetime.timedelta(seconds=h_step * i)
                })
    return pts

class Command(BaseCommand):
    help = 'Generates a rich, deterministic historical dataset for CyberSphere MVP'

    def handle(self, *args, **options):
        # 1. PRE-CHECK AND SAFE DELETION
        self.stdout.write("--- RICH DEMO GENERATOR STARTED ---")
        self.stdout.write("Checking for existing [RICH_DEMO] records to safely remove...")
        
        inc_del, _ = Incident.objects.filter(description__startswith='[RICH_DEMO]').delete()
        fir_del, _ = FIR.objects.filter(description__startswith='[RICH_DEMO]').delete()
        comp_del, _ = Complaint.objects.filter(description__startswith='[RICH_DEMO]').delete()
        patrol_del, _ = PatrolAssignment.objects.filter(instructions__startswith='[RICH_DEMO]').delete()
        # History and evidence cascade delete from Incident/PatrolAssignment where applicable, 
        # but let's be explicitly thorough for Evidence:
        ev_del, _ = Evidence.objects.filter(file__startswith='evidence/rich_demo').delete()
        
        self.stdout.write(f"Safe cleanup complete. Removed {inc_del} incidents, {fir_del} FIRs, {comp_del} complaints, {patrol_del} patrols.")

        # 2. SETUP CONFIGURATION
        months = 12
        seed = 42
        daily_volume = 24
        
        rng = np.random.default_rng(seed)
        ist = ZoneInfo("Asia/Kolkata")
        
        end_date = timezone.now().astimezone(ist)
        start_date = end_date - datetime.timedelta(days=30 * months)
        
        self.stdout.write(f"Generating deterministic dataset from {start_date.date()} to {end_date.date()}...")

        # 3. ENSURE STATIONS AND USERS EXIST
        stations = []
        station_users = {}
        patrol_users = {}
        
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
            
            user, _ = CustomUser.objects.get_or_create(
                username=f"station_{s_cfg['code'].lower()}",
                defaults={'role': 'STATION', 'station': st, 'badge_number': f"B-{s_cfg['code']}"}
            )
            if not user.has_usable_password():
                user.set_password('station123')
                user.save()
            station_users[st.id] = user

            patrol_users[st.id] = []
            for i in range(1, 5): # 4 officers per station
                puser, _ = CustomUser.objects.get_or_create(
                    username=f"officer_{s_cfg['code'].lower()}_{i}",
                    defaults={'role': 'PATROL', 'station': st, 'badge_number': f"P-{s_cfg['code']}-{i}"}
                )
                if not puser.has_usable_password():
                    puser.set_password('patrol123')
                    puser.save()
                patrol_users[st.id].append(puser)

        # 4. DATA GENERATION PREPARATION
        cats = list(CRIME_CATEGORIES.keys())
        cat_shares = [CRIME_CATEGORIES[c]['share'] for c in cats]
        st_shares = [s['share'] for s in STATIONS_CONFIG]
        
        incidents_to_create = []
        fir_info = []
        complaints_to_create = []

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
                st_obj = next(s[0] for s in stations if s[1]['code'] == st_cfg['code'])
                
                sigma_roll = rng.random()
                if sigma_roll < 0.70:
                    sigma = 0.005  # ~550m
                elif sigma_roll < 0.95:
                    sigma = 0.010  # ~1.1km
                else:
                    sigma = 0.015  # ~1.6km
                    
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
                    status = rng.choice(["RESOLVED", "OPEN"], p=[0.20, 0.80])
                    
                title = f"{cat} — {area}"
                desc = f"[RICH_DEMO] {cat} incident reported near {area}. {severity} severity."
                
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
                
                if rng.random() < 0.35:
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

                if rng.random() < 0.15:
                    c_dt = dt + datetime.timedelta(hours=rng.uniform(1, 24))
                    c_status = 'RESOLVED' if age_days > 30 else rng.choice(['PENDING', 'RESOLVED'], p=[0.6, 0.4])
                    comp = Complaint(
                        description=f"[RICH_DEMO] Public complaint regarding {cat.lower()} issue in {area}.",
                        status=c_status,
                        station=st_obj,
                    )
                    # We will update date_filed after creation
                    complaints_to_create.append((comp, c_dt))

        # 5. BULK CREATE BASE RECORDS
        self.stdout.write(f"Bulk creating {len(incidents_to_create)} Incidents...")
        Incident.objects.bulk_create(incidents_to_create, batch_size=500)
        
        self.stdout.write(f"Creating {len(fir_info)} FIRs...")
        fir_updates = []
        for i, info in enumerate(fir_info):
            fir = FIR.objects.create(
                fir_number=f"SYN-RD-{info['station'].station_code}-{i+1:05d}",
                description=f"[RICH_DEMO] FIR for {info['cat']} incident near {info['area']}",
                reported_by=info['user'],
                location=info['location'],
                status=info['status'],
                station=info['station']
            )
            fir_updates.append((fir.pk, info['dt']))
            
        for pk, dt in fir_updates:
            FIR.objects.filter(pk=pk).update(date_reported=dt)

        self.stdout.write(f"Creating {len(complaints_to_create)} Complaints...")
        comp_updates = []
        comps_only = [c[0] for c in complaints_to_create]
        Complaint.objects.bulk_create(comps_only, batch_size=500)
        # Fetch them back to update dates
        created_comps = list(Complaint.objects.filter(description__startswith='[RICH_DEMO]').order_by('id'))
        for comp, (orig_comp, dt) in zip(created_comps, complaints_to_create):
            comp_updates.append((comp.pk, dt))
        for pk, dt in comp_updates:
            Complaint.objects.filter(pk=pk).update(date_filed=dt)

        # 6. OPERATIONAL LIFECYCLE (PATROLS)
        self.stdout.write("Fetching incidents for operational assignment...")
        all_incidents = list(Incident.objects.filter(description__startswith='[RICH_DEMO]').order_by('date_occurred'))

        today_start = end_date - datetime.timedelta(hours=24)
        historical_incidents = [inc for inc in all_incidents if inc.date_occurred < today_start]
        
        # Select incidents for patrols
        historical_to_patrol = [inc for inc in historical_incidents if rng.random() < 0.15]
        
        available_officers = set()
        for p_list in patrol_users.values():
            for o in p_list:
                available_officers.add(o.id)

        assignments_to_create = []
        for inc in historical_to_patrol:
            officer = rng.choice(patrol_users[inc.station_id])
            assignments_to_create.append({'inc': inc, 'officer': officer, 'is_active': False, 'live_status': None})

        # 7. GUARANTEE LIVE DEMO DATA
        # We need exactly some incidents from today to explicitly have the required statuses
        # 1 CRITICAL/HIGH open incident
        live_station = stations[0][0]
        live_inc_crit = Incident.objects.create(
            title=f"Robbery — {stations[0][1]['areas'][0]}",
            description=f"[RICH_DEMO] Robbery incident reported near {stations[0][1]['areas'][0]}. CRITICAL severity.",
            location=Point(stations[0][1]['lng'], stations[0][1]['lat'], srid=4326),
            date_occurred=end_date - datetime.timedelta(minutes=45),
            severity='CRITICAL',
            status='OPEN',
            station=live_station
        )
        all_incidents.append(live_inc_crit)
        
        # 4 active patrols
        live_reqs = ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED']
        for i, st_req in enumerate(live_reqs):
            live_st = stations[i % len(stations)][0]
            inc = Incident.objects.create(
                title=f"Theft — Active {st_req}",
                description=f"[RICH_DEMO] Theft incident reported. MEDIUM severity.",
                location=Point(stations[i % len(stations)][1]['lng'], stations[i % len(stations)][1]['lat'], srid=4326),
                date_occurred=end_date - datetime.timedelta(minutes=30 + i*5),
                severity='MEDIUM',
                status='OPEN',
                station=live_st
            )
            all_incidents.append(inc)
            officer = patrol_users[live_st.id][0] # just grab first officer
            assignments_to_create.append({'inc': inc, 'officer': officer, 'is_active': True, 'live_status': st_req})

        self.stdout.write(f"Generating lifecycle for {len(assignments_to_create)} operations...")

        created_pas_count = 0
        completed_pas_count = 0
        active_pas_count = {'ASSIGNED': 0, 'ACKNOWLEDGED': 0, 'EN_ROUTE': 0, 'ARRIVED': 0}
        
        from patrol.models import PatrolLocation
        locations_to_create = []
        
        for p_info in assignments_to_create:
            inc = p_info['inc']
            officer = p_info['officer']
            is_active = p_info['is_active']
            live_status = p_info.get('live_status')
            
            start_dt = inc.date_occurred + datetime.timedelta(minutes=float(rng.uniform(1, 5)))
            
            if not is_active:
                end_dt = start_dt + datetime.timedelta(minutes=float(rng.uniform(30, 90)))
                status = 'COMPLETED'
                completed_pas_count += 1
            else:
                end_dt = None
                status = live_status
                active_pas_count[status] += 1
                
            pa = PatrolAssignment.objects.create(
                officer=officer,
                zone_name=f"{inc.title.split('—')[-1].strip()} Zone",
                status=status,
                priority=inc.severity,
                destination=inc.location,
                instructions=f"[RICH_DEMO] Respond to {inc.severity} priority {inc.title}",
                station_id=inc.station_id,
                incident=inc
            )
            created_pas_count += 1
            PatrolAssignment.objects.filter(id=pa.id).update(start_time=start_dt, end_time=end_dt)
            
            def add_history(old_s, new_s, dt):
                h = PatrolStatusHistory.objects.create(assignment=pa, old_status=old_s, new_status=new_s, actor=officer)
                PatrolStatusHistory.objects.filter(id=h.id).update(timestamp=dt)

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
                        file='evidence/rich_demo_photo.jpg',
                        uploaded_by=officer
                    )
                    Evidence.objects.filter(id=ev.id).update(uploaded_at=end_dt)

            # GENERATE GPS TRACKS
            effective_end_dt = end_dt if not is_active else end_date
            st_cfg_matched = next((s for st, s in stations if st.id == inc.station_id), None)
            
            start_lng = st_cfg_matched['lng'] + float(rng.normal(0, 0.002))
            start_lat = st_cfg_matched['lat'] + float(rng.normal(0, 0.002))
            end_lng = inc.location.x
            end_lat = inc.location.y
            
            route_pts = generate_patrol_route(
                start_lng, start_lat, end_lng, end_lat,
                start_dt, effective_end_dt, status, rng
            )
            
            for pt in route_pts:
                locations_to_create.append(PatrolLocation(
                    assignment=pa,
                    location=Point(pt['lng'], pt['lat'], srid=4326),
                    timestamp=pt['dt']
                ))

        self.stdout.write(f"Bulk creating {len(locations_to_create)} PatrolLocation records...")
        orig_timestamps = [loc.timestamp for loc in locations_to_create]
        created_locs = PatrolLocation.objects.bulk_create(locations_to_create, batch_size=2000)
        for obj, orig_ts in zip(created_locs, orig_timestamps):
            obj.timestamp = orig_ts
        PatrolLocation.objects.bulk_update(created_locs, ['timestamp'], batch_size=2000)

        # 8. PRINT EXACT SUMMARY REQUESTED
        incidents_total = Incident.objects.count()
        patrols_total = PatrolAssignment.objects.count()
        firs_total = FIR.objects.count()
        comps_total = Complaint.objects.count()
        evidence_total = Evidence.objects.count()
        users_total = CustomUser.objects.count()
        stations_total = PoliceStation.objects.count()

        inc_critical = Incident.objects.filter(severity='CRITICAL').count()
        inc_high = Incident.objects.filter(severity='HIGH').count()
        inc_medium = Incident.objects.filter(severity='MEDIUM').count()
        inc_low = Incident.objects.filter(severity='LOW').count()

        self.stdout.write(f"\nINCIDENTS: {incidents_total}")
        self.stdout.write(f"PATROL ASSIGNMENTS: {patrols_total}")
        self.stdout.write(f"FIRs: {firs_total}")
        self.stdout.write(f"COMPLAINTS: {comps_total}")
        self.stdout.write(f"EVIDENCE: {evidence_total}")
        self.stdout.write(f"USERS: {users_total}")
        self.stdout.write(f"STATIONS: {stations_total}")

        self.stdout.write(f"\nINCIDENTS BY SEVERITY")
        self.stdout.write(f"CRITICAL: {inc_critical}")
        self.stdout.write(f"HIGH: {inc_high}")
        self.stdout.write(f"MEDIUM: {inc_medium}")
        self.stdout.write(f"LOW: {inc_low}")

        self.stdout.write(f"\nACTIVE PATROLS")
        self.stdout.write(f"ASSIGNED: {PatrolAssignment.objects.filter(status='ASSIGNED').count()}")
        self.stdout.write(f"ACKNOWLEDGED: {PatrolAssignment.objects.filter(status='ACKNOWLEDGED').count()}")
        self.stdout.write(f"EN_ROUTE: {PatrolAssignment.objects.filter(status='EN_ROUTE').count()}")
        self.stdout.write(f"ARRIVED: {PatrolAssignment.objects.filter(status='ARRIVED').count()}")

