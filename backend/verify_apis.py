import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:8000/api"
TOKEN = None

def make_request(method, endpoint, data=None, token_required=True):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    if token_required and TOKEN:
        headers['Authorization'] = f'Bearer {TOKEN}'
    
    encoded_data = json.dumps(data).encode('utf-8') if data else None
    
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8')) if response.length else None
    except urllib.error.HTTPError as e:
        print(f"Error {e.code} on {method} {url}: {e.read().decode('utf-8')}")
        return e.code, None
    except Exception as e:
        print(f"Exception on {method} {url}: {str(e)}")
        return 0, None

def test_auth():
    global TOKEN
    print("Testing Auth...")
    status, res = make_request('POST', '/auth/login/', {"username": "admin", "password": "admin123"}, token_required=False)
    if status == 200 and 'access' in res:
        TOKEN = res['access']
        print("[OK] Login successful")
    else:
        print("[FAIL] Login failed")
        sys.exit(1)

    status, res = make_request('GET', '/auth/profile/')
    if status == 200:
        print(f"[OK] Profile fetched: {res.get('username')}")
    else:
        print("[FAIL] Profile fetch failed")

def test_crimes():
    print("Testing Crime Operations...")
    status, res = make_request('GET', '/crimes/fir/')
    if status == 200:
        print(f"[OK] FIR fetched: {len(res)} records")
    else:
        print("[FAIL] FIR fetch failed")

def test_dashboard():
    print("Testing Dashboard...")
    status, res = make_request('GET', '/dashboard/summary/')
    if status == 200:
        print(f"[OK] Dashboard summary: {res}")
    else:
        print("[FAIL] Dashboard fetch failed")

def test_gis():
    print("Testing GIS...")
    status, res = make_request('GET', '/gis/nearby/?lat=23.0225&lng=72.5714&radius=10')
    if status == 200:
        print(f"[OK] GIS Nearby fetched: {len(res)} records")
    else:
        print("[FAIL] GIS Nearby failed")

def test_patrol():
    print("Testing Patrol...")
    status, res = make_request('GET', '/patrol/assignments/')
    if status == 200:
        print(f"[OK] Patrol assignments fetched: {len(res)} records")
    else:
        print("[FAIL] Patrol fetch failed")

def test_ai():
    print("Testing AI...")
    status, res = make_request('POST', '/ai/predict/')
    if status in [200, 201, 202]:
        print(f"[OK] AI predict triggered: {res}")
    else:
        print(f"[FAIL] AI predict failed with status {status}")

if __name__ == "__main__":
    test_auth()
    test_crimes()
    test_dashboard()
    test_gis()
    test_patrol()
    test_ai()
