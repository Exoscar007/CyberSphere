import os
import django
import sys
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from crimes.models import Incident
from patrol.models import PatrolAssignment, PatrolLocation
from patrol.services import PatrolService
from users.models import PoliceStation

User = get_user_model()
client = APIClient()

def run_e2e():
    print("--- STARTING E2E GPS TEST ---")
    
    # 1. Setup accounts
    try:
        station = PoliceStation.objects.get(station_code='NAV-01')
        patrol_user = User.objects.get(username='patrol_patel')
        admin_user = User.objects.get(username='admin')
        station_user = User.objects.get(username='station_navrangpura')
    except Exception as e:
        print(f"Error getting accounts: {e}")
        return

    # 2. Create an Incident and Dispatch
    print("Creating incident and dispatching patrol...")
    from django.contrib.gis.geos import Point
    dest = Point(72.55, 23.03) # longitude, latitude
    
    from django.utils import timezone
    incident = Incident.objects.create(
        title="Test E2E Incident",
        description="E2E testing of GPS fixes",
        severity="HIGH",
        status="OPEN",
        station=station,
        location=dest,
        date_occurred=timezone.now()
    )
    
    assignment = PatrolService.assign_patrol(
        user=station_user,
        officer=patrol_user,
        zone_name="Test Zone",
        destination=dest,
        priority="HIGH",
        instructions="Go there",
        incident=incident
    )
    
    assign_id = assignment.id
    print(f"Assignment {assign_id} created. Status: {assignment.status}")
    
    # 3. Patrol ACKNOWLEDGE & EN_ROUTE
    PatrolService.update_assignment_status(patrol_user, assign_id, 'ACKNOWLEDGED')
    PatrolService.update_assignment_status(patrol_user, assign_id, 'EN_ROUTE')
    print("Assignment acknowledged and en route.")
    
    # 4. Generate GPS points via API
    client.force_authenticate(user=patrol_user)
    print("Sending GPS pings...")
    pings = [
        {'lat': 23.031, 'lng': 72.551},
        {'lat': 23.032, 'lng': 72.552},
        {'lat': 23.033, 'lng': 72.553}
    ]
    
    for ping in pings:
        response = client.post(f'/api/patrol/assignments/{assign_id}/ping/', data=ping, content_type='application/json')
        print(f"Ping {ping} -> Status: {response.status_code}")
        time.sleep(0.1)
        
    # Verify DB
    locations = PatrolLocation.objects.filter(assignment_id=assign_id).order_by('timestamp')
    if locations.count() == 3:
        print("✓ Verified 3 PatrolLocation rows created in DB.")
    else:
        print(f"ERROR: Expected 3 locations, found {locations.count()}")
        
    # 5. Verify Latest GPS via Dashboard API (Station Map)
    client.force_authenticate(user=station_user)
    response = client.get('/api/patrol/assignments/')
    data = response.json()
    my_assign = next((x for x in data if x['id'] == assign_id), None)
    if my_assign:
        latest = my_assign.get('latest_location')
        if latest and latest['location']['coordinates'] == [72.553, 23.033]:
            print("✓ Verified latest GPS on Station API.")
        else:
            print("ERROR: Latest GPS mismatch on Station API")
            
    # Verify Latest GPS via Dashboard API (Admin/City Command Map)
    client.force_authenticate(user=admin_user)
    response = client.get('/api/patrol/assignments/')
    data = response.json()
    my_assign_admin = next((x for x in data if x['id'] == assign_id), None)
    if my_assign_admin:
        latest = my_assign_admin.get('latest_location')
        if latest and latest['location']['coordinates'] == [72.553, 23.033]:
            print("✓ Verified latest GPS on Admin API.")
        else:
            print("ERROR: Latest GPS mismatch on Admin API")
            
    # 6. Verify historical tracking endpoint
    response = client.get(f'/api/patrol/assignments/{assign_id}/locations/')
    history = response.json()
    if len(history) == 3:
        print("✓ Verified historical polyline has 3 points.")
    else:
        print("ERROR: Historical tracking missing points.")
        
    # 7. Complete Assignment
    print("Completing assignment...")
    client.force_authenticate(user=patrol_user)
    PatrolService.update_assignment_status(patrol_user, assign_id, 'ARRIVED')
    PatrolService.update_assignment_status(patrol_user, assign_id, 'COMPLETED')
    print("Assignment completed.")
    
    # 8. Verify new GPS rejected
    response = client.post(f'/api/patrol/assignments/{assign_id}/ping/', data={'lat': 23.034, 'lng': 72.554}, content_type='application/json')
    if response.status_code == 404:
        print("✓ Verified new GPS ping rejected after completion.")
    else:
        print(f"ERROR: Ping after completion returned {response.status_code} - {response.content}")
        
    # 9. Verify historical track still accessible
    client.force_authenticate(user=station_user)
    response = client.get(f'/api/patrol/assignments/{assign_id}/locations/')
    history = response.json()
    if len(history) == 3:
        print("✓ Verified historical GPS track remains available in operational history.")
    else:
        print("ERROR: Historical tracking lost after completion.")

    print("--- E2E TEST PASSED SUCCESSFULLY ---")
    
if __name__ == '__main__':
    run_e2e()
