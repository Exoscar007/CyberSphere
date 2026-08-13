import urllib.request
import urllib.parse
import json
import time

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
    status, res = make_request(method, url, data=payload, token=token, files=files)
    success = (status == expected_status)
    print(f"Status: {status} (Expected {expected_status}) - {'PASS' if success else 'FAIL'}")
    return status, res

def test_workflow():
    print("--- CYBERSPHERE STEP 4/7 MOBILE E2E VERIFICATION ---")
    admin_tok = login("admin", "admin123")
    st1_tok = login("station_navrangpura", "station123")
    pt1_tok = login("patrol_mehta", "patrol123")
    pt2_tok = login("patrol_joshi", "patrol123")
    
    # Pre-setup: Station creates FIR and Assigns Patrol (simulating reality before patrol logs in)
    fir_payload = {
        "fir_number": f"FIR-MOBILE-{int(time.time())}",
        "description": "Mobile Test FIR",
        "location_input": {"type": "Point", "coordinates": [72.557, 23.039]},
        "status": "OPEN",
    }
    st, fir = test_endpoint("Setup: Create FIR", "POST", "/crimes/fir/", "STATION", fir_payload, st1_tok, 201)
    fir_id = fir['id']
    
    st, assign = test_endpoint("Setup: Station Assigns Patrol", "POST", "/patrol/assignments/", "STATION", {"officer": 10, "zone_name": "Test Zone", "fir": fir_id}, st1_tok, 201)
    assign_id = assign['id']
    
    print("\n--- PATROL APP WORKFLOW ---")
    st, my_assign = test_endpoint("Patrol App: Fetch Assignment", "GET", "/patrol/assignments/", "PATROL A", None, pt1_tok, 200)
    
    test_endpoint("Patrol App: GPS Ping", "POST", f"/patrol/assignments/{assign_id}/ping/", "PATROL A", {"lat": 23.04, "lng": 72.55}, pt1_tok, 201)
    
    # 404 test for another patrol
    test_endpoint("Patrol B (Hacker): GPS Ping to Patrol A Assignment", "POST", f"/patrol/assignments/{assign_id}/ping/", "PATROL B", {"lat": 23.04, "lng": 72.55}, pt2_tok, 404)

    test_endpoint("Patrol App: Press ARRIVED", "PATCH", f"/patrol/assignments/{assign_id}/", "PATROL A", {"status": "ARRIVED"}, pt1_tok, 200)
    test_endpoint("Patrol App: Press COMPLETED", "PATCH", f"/patrol/assignments/{assign_id}/", "PATROL A", {"status": "COMPLETED"}, pt1_tok, 200)
    
    test_endpoint("Patrol App: Evidence Upload", "POST", f"/crimes/fir/{fir_id}/evidence/", "PATROL A", None, pt1_tok, 201, files={"file": "test"})
    
    test_endpoint("Patrol B (Hacker): Evidence Upload to Patrol A FIR", "POST", f"/crimes/fir/{fir_id}/evidence/", "PATROL B", None, pt2_tok, 404, files={"file": "test"})
    
if __name__ == "__main__":
    test_workflow()
