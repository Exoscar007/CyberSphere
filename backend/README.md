# CyberSphere Backend API

This is the Django backend for the CyberSphere Hackathon Project. It provides comprehensive APIs for:

- **Authentication & Users**: JWT-based authentication and role management.
- **Crime Operations**: FIR, Complaint, and Incident reporting with geospatial data.
- **Crime Intelligence**: Historical trends and AI-driven risk scores.
- **GIS Mapping**: Spatial queries using PostGIS (`ST_DWithin`, heatmaps).
- **AI Prediction**: Asynchronous AI prediction triggers (Mocked for Hackathon via threading).
- **Dashboard & Analytics**: Aggregated system metrics.
- **Patrol System**: Officer assignments and live GPS ping tracking.
- **Reports & Monitoring**: System health checks and crime summaries.

## Architecture
Strict MVC separation: `APIView -> Serializer -> Validator -> Service -> Repository -> Model -> DB`.

## Running the Application
Due to the geospatial requirements (GeoDjango), this backend requires a PostGIS-enabled database and system libraries like GDAL/GEOS. 

We provide a fully Dockerized setup to bypass local OS library configurations:

```bash
docker-compose up --build -d
```

This will:
1. Spin up a PostGIS database.
2. Build the Django container (installing required OS-level GIS binaries).
3. Automatically apply database migrations.
4. Expose the API on `http://localhost:8000`.

### Documentation
Swagger documentation is available at `http://localhost:8000/swagger/` once the server is running.
