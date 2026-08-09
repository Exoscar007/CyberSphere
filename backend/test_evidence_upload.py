import urllib.request
import urllib.parse
import json
import sys
import uuid
import os

BASE_URL = "http://localhost:8000/api"
TOKEN = None

def make_request(method, endpoint, data=None, token_required=True, content_type='application/json'):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if content_type:
        headers['Content-Type'] = content_type
    if token_required and TOKEN:
        headers['Authorization'] = f'Bearer {TOKEN}'
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8')) if response.length else None
    except urllib.error.HTTPError as e:
        print(f"Error {e.code} on {method} {url}: {e.read().decode('utf-8')}")
        return e.code, None
    except Exception as e:
        print(f"Exception on {method} {url}: {str(e)}")
        return 0, None

def encode_multipart_formdata(fields, files):
    boundary = uuid.uuid4().hex
    body = bytearray()
    
    for key, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(f"Content-Disposition: form-data; name=\"{key}\"\r\n\r\n".encode('utf-8'))
        body.extend(f"{value}\r\n".encode('utf-8'))
        
    for key, (filename, file_content) in files.items():
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(f"Content-Disposition: form-data; name=\"{key}\"; filename=\"{filename}\"\r\n".encode('utf-8'))
        body.extend(b"Content-Type: application/octet-stream\r\n\r\n")
        body.extend(file_content)
        body.extend(b"\r\n")
        
    body.extend(f"--{boundary}--\r\n".encode('utf-8'))
    return body, f"multipart/form-data; boundary={boundary}"

def main():
    global TOKEN
    # 1. Login
    encoded_login = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
    status, res = make_request('POST', '/auth/login/', data=encoded_login, token_required=False)
    if status == 200 and 'access' in res:
        TOKEN = res['access']
        print("[OK] Logged in")
    else:
        print("[FAIL] Login failed")
        sys.exit(1)

    # 2. Get an FIR ID
    status, res = make_request('GET', '/crimes/fir/')
    if status == 200 and len(res) > 0:
        fir_id = res[0]['id']
        print(f"[OK] Found FIR ID: {fir_id}")
    else:
        print("[FAIL] Could not get FIRs")
        sys.exit(1)

    # 3. Upload evidence
    file_content = b"This is a test evidence file content."
    body, content_type = encode_multipart_formdata({}, {'file': ('test_evidence.txt', file_content)})
    
    status, res = make_request('POST', f'/crimes/fir/{fir_id}/evidence/', data=body, content_type=content_type)
    if status == 201:
        print(f"[OK] Evidence uploaded successfully: {res}")
    else:
        print(f"[FAIL] Evidence upload failed with status {status}")
        sys.exit(1)

    # 4. Retrieve evidence
    status, res = make_request('GET', f'/crimes/fir/{fir_id}/evidence/')
    if status == 200 and len(res) > 0:
        print(f"[OK] Evidence retrieved successfully: {len(res)} files found")
        for evidence in res:
            print(f" - ID: {evidence['id']}, File URL: {evidence['file']}")
    else:
        print("[FAIL] Evidence retrieval failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
