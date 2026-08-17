import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:8000/api"

def make_request(method, endpoint, data=None, token=None, files=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    if files:
        boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
        body = []
        for key, val in files.items():
            body.append(f'--{boundary}')
            body.append(f'Content-Disposition: form-data; name="{key}"; filename="test.txt"')
            body.append('Content-Type: text/plain')
            body.append('')
            body.append(val)
        body.append(f'--{boundary}--')
        body.append('')
        encoded_data = '\r\n'.join(body).encode('utf-8')
    else:
        encoded_data = json.dumps(data).encode('utf-8') if data else None

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8')) if response.length else None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body
    except Exception as e:
        return 0, str(e)

def login(username, password):
    status, res = make_request('POST', '/auth/login/', {"username": username, "password": password})
    return res['access'] if status == 200 else None

def test_endpoint(name, method, url, role, payload, token, expected_status, files=None):
    print(f"\n[{name}]")
    print(f"Role: {role}")
    print(f"Request: {method} {url}")
    print(f"Payload: {payload}")
    
    status, res = make_request(method, url, data=payload, token=token, files=files)
    
    success = (status == expected_status)
    print(f"Expected Status: {expected_status}, Actual: {status}")
    print(f"Response: {res}")
    print(f"Result: {'PASS' if success else 'FAIL'}")
    return status, res

def test_workflow():
    print("--- CYBERSPHERE STEP 3/7 END-TO-END VERIFICATION ---")
    
    admin_tok = login("admin", "admin123")
    st1_tok = login("station_navrangpura", "station123")
    st2_tok = login("station_satellite", "station123")
    pt1_tok = login("patrol_mehta", "patrol123")
    pt2_tok = login("patrol_joshi", "patrol123")
    
    # 4. PATROL fetches assignment FIRST to get their own ID
    st, my_assign = test_endpoint("Patrol Fetches Assignments", "GET", "/patrol/assignments/", "PATROL A", None, pt1_tok, 200)
    
    patrol_id = my_assign[0]['officer'] if my_assign else None

    # 1. STATION A creates Incident
    incident_payload = {
        "title": "Robbery Test",
        "description": "Armed robbery near bank",
        "location_input": {"type": "Point", "coordinates": [72.557, 23.039]},
        "severity": "HIGH",
        "date_occurred": "2026-08-13T10:00:00Z"
    }
    st, inc = test_endpoint("Create Incident", "POST", "/crimes/incidents/", "STATION A", incident_payload, st1_tok, 201)
    inc_id = inc.get('id') if st == 201 else None

    import time
    # 2. STATION A creates FIR
    fir_payload = {
        "fir_number": f"FIR-NEW-{int(time.time())}",
        "description": "Robbery reported",
        "location_input": {"type": "Point", "coordinates": [72.557, 23.039]},
        "status": "OPEN",
    }
    st, fir1 = test_endpoint("Create FIR", "POST", "/crimes/fir/", "STATION A", fir_payload, st1_tok, 201)
    fir_id = fir1.get('id') if st == 201 else None

    # 3. STATION A assigns patrol
    if patrol_id:
        patrol_payload = {
            "officer": patrol_id,
            "zone_name": "Bank Area",
            "fir": fir_id
        }
        st, p_assign = test_endpoint("Station A Assigns Patrol", "POST", "/patrol/assignments/", "STATION A", patrol_payload, st1_tok, 201)
        assign_id = p_assign.get('id') if st == 201 else None
    else:
        assign_id = None


    # 5. PATROL pings GPS
    if assign_id:
        gps_payload = {"lat": 23.040, "lng": 72.558}
        test_endpoint("Patrol A Pings GPS", "POST", f"/patrol/assignments/{assign_id}/ping/", "PATROL A", gps_payload, pt1_tok, 201)

    # 6. PATROL updates status
    if assign_id:
        update_payload = {"status": "COMPLETED"}
        test_endpoint("Patrol A Updates Status", "PATCH", f"/patrol/assignments/{assign_id}/", "PATROL A", update_payload, pt1_tok, 200)

    # 7. PATROL captures Evidence
    if fir_id:
        test_endpoint("Patrol A Uploads Evidence", "POST", f"/crimes/fir/{fir_id}/evidence/", "PATROL A", None, pt1_tok, 201, files={"file": "image_data"})
    
    # 8. UNAUTHORIZED BOUNDARY CHECKS
    print("\n--- UNAUTHORIZED BOUNDARY CHECKS ---")
    if inc_id:
        test_endpoint("Station B views Station A Incident", "GET", f"/crimes/incidents/{inc_id}/", "STATION B", None, st2_tok, 404) # Not exist or list empty
    
    test_endpoint("Station B gets Station A FIRs", "GET", "/crimes/fir/", "STATION B", None, st2_tok, 200)
    # verify length isn't same
    
    if assign_id:
        test_endpoint("Patrol B Updates Patrol A Status", "PATCH", f"/patrol/assignments/{assign_id}/", "PATROL B", {"status": "COMPLETED"}, pt2_tok, 404)

    if fir_id:
        test_endpoint("Patrol B Uploads Evidence to Station A FIR", "POST", f"/crimes/fir/{fir_id}/evidence/", "PATROL B", None, pt2_tok, 404, files={"file": "fake"})
        test_endpoint("Station B Uploads Evidence to Station A FIR", "POST", f"/crimes/fir/{fir_id}/evidence/", "STATION B", None, st2_tok, 404, files={"file": "fake"})

if __name__ == "__main__":
    test_workflow()
