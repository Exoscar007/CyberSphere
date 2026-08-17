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
    
    # Very simple multipart/form-data for file upload if needed
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
    if status == 200:
        return res['access']
    return None

def test():
    print("Logging in...")
    admin_token = login("admin", "admin123")
    station1_token = login("station_navrangpura", "station123")
    station2_token = login("station_satellite", "station123")
    patrol1_token = login("patrol_mehta", "patrol123")
    patrol2_token = login("patrol_joshi", "patrol123")

    if not all([admin_token, station1_token, station2_token, patrol1_token, patrol2_token]):
        print("Login failed for some users.")
        sys.exit(1)

    print("\n--- ADMIN ACCESS ---")
    st, firs = make_request('GET', '/crimes/fir/', token=admin_token)
    print(f"Admin FIRs: {len(firs)} (Expected 3) - {'PASS' if len(firs)==3 else 'FAIL'}")

    print("\n--- STATION ISOLATION ---")
    st, firs1 = make_request('GET', '/crimes/fir/', token=station1_token)
    print(f"Station1 FIRs: {len(firs1)} (Expected 2) - {'PASS' if len(firs1)==2 else 'FAIL'}")
    
    st, firs2 = make_request('GET', '/crimes/fir/', token=station2_token)
    print(f"Station2 FIRs: {len(firs2)} (Expected 1) - {'PASS' if len(firs2)==1 else 'FAIL'}")

    st, incs1 = make_request('GET', '/crimes/incidents/', token=station1_token)
    st, incs2 = make_request('GET', '/crimes/incidents/', token=station2_token)
    print(f"Station1 Incidents: {len(incs1)}, Station2 Incidents: {len(incs2)}")

    print("\n--- PATROL AUTHORIZATION ---")
    st, p_assign = make_request('GET', '/patrol/assignments/', token=patrol1_token)
    print(f"Patrol1 Assignments: {len(p_assign)} (Expected 1)")
    p1_assign_id = p_assign[0]['id'] if p_assign else None

    if p1_assign_id:
        st, ping = make_request('POST', f'/patrol/assignments/{p1_assign_id}/ping/', data={"lat": 23.0, "lng": 72.0}, token=patrol1_token)
        print(f"Patrol1 Ping Own Assignment: {st} - {'PASS' if st==201 else 'FAIL'}")

        st, ping2 = make_request('POST', f'/patrol/assignments/{p1_assign_id}/ping/', data={"lat": 23.0, "lng": 72.0}, token=patrol2_token)
        print(f"Patrol2 Ping Patrol1 Assignment: {st} (Expected 404) - {'PASS' if st==404 else 'FAIL'}")

    print("\n--- EVIDENCE UPLOAD ---")
    # Upload evidence to Station 1's FIR using Station 1
    s1_fir_id = firs1[0]['id'] if firs1 else None
    s2_fir_id = firs2[0]['id'] if firs2 else None

    if s1_fir_id:
        st, ev = make_request('POST', f'/crimes/fir/{s1_fir_id}/evidence/', files={"file": "test data"}, token=station1_token)
        print(f"Station1 Upload Evidence to Own FIR: {st} - {'PASS' if st==201 else 'FAIL'}")

        st, ev2 = make_request('POST', f'/crimes/fir/{s1_fir_id}/evidence/', files={"file": "test data"}, token=station2_token)
        print(f"Station2 Upload Evidence to Station1 FIR: {st} (Expected 404) - {'PASS' if st==404 else 'FAIL'}")
    
    print("\n--- VERIFICATION DONE ---")

if __name__ == "__main__":
    test()
