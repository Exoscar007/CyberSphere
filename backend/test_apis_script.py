from rest_framework.test import APIClient
from users.models import CustomUser, PoliceStation
from crimes.models import Incident, Evidence, FIR
from patrol.models import PatrolAssignment
from django.db import models
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

c = APIClient()

print('\n=== API RESPONSES ===')

admin_user = CustomUser.objects.filter(role='ADMIN').first()
if admin_user:
    c.force_authenticate(user=admin_user)
    print('Logged in as ADMIN')

# 1. Dashboard summary API
r = c.get('/api/dashboard/summary/')
print('Dashboard summary status:', r.status_code)
if r.status_code == 200:
    print('Dashboard summary data keys:', list(r.json().keys()))

# 2. Incidents list API
r = c.get('/api/crimes/incidents/')
print('Incidents list status:', r.status_code)
if r.status_code == 200:
    data = r.json()
    items = data.get("results") if isinstance(data, dict) else data
    print(f'Incidents returned: {len(items)}')

# 3. Patrol assignments API
r = c.get('/api/patrol/assignments/')
print('Patrol assignments status:', r.status_code)
if r.status_code == 200:
    data = r.json()
    items = data.get("results") if isinstance(data, dict) else data
    print(f'Patrols returned: {len(items)}')

# 4. User list API
r = c.get('/api/auth/users/')
print('User list status:', r.status_code)

# 5. GIS recommend patrol API
r = c.get('/api/gis/recommend-patrol/')
print('GIS recommend status:', r.status_code)

# 6. Operational history / reports API
r = c.get('/api/reports/operational-history/')
print('Reports status:', r.status_code)

print('\n=== STATION ISOLATION TEST ===')
# Pick a station user
station_user = CustomUser.objects.filter(role='STATION').first()
if station_user:
    c.force_authenticate(user=station_user)
    print(f'Logged in as STATION user: {station_user.username}, station: {station_user.station.name}')
    
    r = c.get('/api/crimes/incidents/')
    if r.status_code == 200:
        data = r.json()
        incidents = data.get('results') if isinstance(data, dict) else data
        print(f'Station user incident count (page 1): {len(incidents)}')
        # Verify all incidents belong to this station
        different_station = 0
        for i in incidents:
            st = i.get('station')
            if isinstance(st, dict):
                st_id = st.get('id')
            else:
                st_id = st
            if st_id != station_user.station.id:
                different_station += 1
        print(f'Incidents belonging to DIFFERENT station: {different_station}')
        
        # Test if they can access another station's incident by ID
        other_incident = Incident.objects.exclude(station=station_user.station).first()
        if other_incident:
            r2 = c.get(f'/api/crimes/incidents/{other_incident.id}/')
            print(f'Access to other station incident status: {r2.status_code}')

print('\n=== DATA ANOMALIES CHECK ===')

# Incidents with impossible dates
future_date = timezone.now() + timedelta(days=1)
future_incidents = Incident.objects.filter(date_occurred__gt=future_date).count()
print(f'Incidents occurred in the future: {future_incidents}')

# Users without stations (STATION or PATROL role)
users_no_station = CustomUser.objects.filter(role__in=['STATION', 'PATROL'], station__isnull=True).count()
print(f'Station/Patrol Users without station: {users_no_station}')

# Patrols assigned to wrong stations
# Patrol has station. Incident has station. Do they match?
wrong_station_patrols = PatrolAssignment.objects.exclude(station_id=models.F('incident__station_id')).count()
print(f'Patrols with station mismatch from incident: {wrong_station_patrols}')

# Duplicate records check (e.g. FIRs with same fir_number)
dup_firs = FIR.objects.values('fir_number').annotate(c=Count('id')).filter(c__gt=1).count()
print(f'Duplicate FIR numbers: {dup_firs}')
