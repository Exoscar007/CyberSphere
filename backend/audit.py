import os
import psycopg2
from urllib.parse import urlparse

def audit_config():
    print("Starting Audit...")
    
    # Check GDAL
    try:
        from django.contrib.gis import gdal
        print("[OK] GDAL library found.")
    except Exception as e:
        print(f"[FAIL] GDAL library missing or error: {e}")

    # Check Database Connection
    db_url = os.environ.get('DATABASE_URL', 'postgis://postgres:postgrespassword@localhost:5432/cybersphere')
    parsed = urlparse(db_url)
    
    print(f"\nAttempting to connect to PostgreSQL at {parsed.hostname}:{parsed.port}...")
    try:
        conn = psycopg2.connect(
            dbname=parsed.path[1:],
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port
        )
        print("[OK] Successfully connected to the database.")
        
        # Check PostGIS extension
        cur = conn.cursor()
        cur.execute("SELECT PostGIS_Version();")
        version = cur.fetchone()
        print(f"[OK] PostGIS is installed: {version[0]}")
        
        conn.close()
    except Exception as e:
        print(f"[FAIL] Database connection or PostGIS error: {e}")

if __name__ == "__main__":
    audit_config()
