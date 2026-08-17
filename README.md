# 1 Project Overview

CyberSphere is a next-generation Command & Control Intelligence platform for law enforcement. It solves the fragmentation between dispatch centers and field units by providing real-time geospatial tracking, AI-driven crime prediction, and centralized operational capabilities on a unified platform.

# 2 Features

- **City Command Dashboard:** Real-time city-wide monitoring with progressive loading and AbortController request management for high performance.
- **Station Operations:** Localized dashboard for managing jurisdictional FIRs and dispatching local units.
- **Incident & FIR Management:** Centralized reporting system with accurate geospatial tagging.
- **Patrol Operations & Tracking:** Real-time officer assignments and simulated live GPS tracking on a unified map.
- **AI Intelligence:** Temporal crime forecasting and risk density mapping for predictive policing.
- **Mobile Field App:** Dedicated Flutter application for Patrol Officers to view active assignments, update statuses sequentially (`EN ROUTE` -> `ARRIVED` -> `COMPLETED`), upload evidence, and provide continuous GPS telemetry to the command center.

# 3 Tech Stack

- **Frontend (Web):** React (v19) & Vite - Used for the web dashboards with Leaflet/React-Leaflet for high-performance mapping.
- **Backend (API):** Python & Django (v5.2) with Django REST Framework - Serves as the centralized API for both web and mobile clients.
- **Database:** PostgreSQL with PostGIS Extension - Handles complex geospatial queries (e.g., `ST_DWithin`) and standard relational data.
- **Mobile Application:** Flutter (v3.12+) - Cross-platform mobile app for officers, integrating `geolocator` for live tracking and `image_picker` for evidence upload.
- **AI & Data Analysis:** scikit-learn, pandas, numpy - Powers the AI prediction models and historical trend analytics.
- **Infrastructure:** Docker & Docker Compose - Containerizes the backend and PostGIS database to ensure a consistent, local environment.

# 4 Architecture

```text
City Command Web (Vite/React)
         ↓
Station Dashboard Web (Vite/React)
         ↓
CyberSphere Backend API (Django/DRF)
         ↓
PostgreSQL / PostGIS (Database)
         ↑
Mobile Patrol Application (Flutter)
```

# 5 Project Structure

- `backend/`: Django REST API, AI prediction scripts, PostGIS integrations, and automated seeders.
- `frontend/`: Vite + React web application for Command and Station roles.
- `mobile/`: Flutter native application containing `lib/config.dart` with API configurations and screens for patrol officers.
- `docker/` & `docker-compose.yml`: Containerization configuration ensuring PostGIS and Django run synchronously.

# 6 Installation & Setup

**Prerequisites & Dependencies:**
- Git
- Docker Desktop (Required for PostGIS and Django)
- Node.js (v18+) & npm (Required for React frontend)
- Flutter SDK (v3.12+) (Required for Mobile application)
- WSL2 (Highly Recommended for Windows)

**Environment Variables:**
Refer to the `backend/.env.example` file. Set up `DATABASE_URL`, `SECRET_KEY`, and `DEBUG` appropriately. Do not use production passwords locally.

**Backend & Database:**
```bash
git clone <repository-url>
cd cybersphere
# Starts PostGIS and Django, applies migrations automatically
docker compose up --build
# Open a new terminal to seed the deterministic demo data
docker compose exec backend python manage.py seed_demo_data
```

**Frontend (Web):**
```bash
cd frontend
npm install
npm run dev
```

**Mobile Application:**
```bash
cd mobile
flutter pub get
flutter run
```
*Note: Ensure your emulator or physical device can reach the host API at `http://localhost:8000` (or `10.0.2.2` for Android) via `lib/config.dart`.*

# 7 Usage

1. Start all Docker and frontend services.
2. Open `http://localhost:5173` in your browser.
3. Log in as **Admin** (Username: `admin`, Password: `admin123`) to view the City Command heatmap and overarching analytics.
4. Log out and log in as a **Station Commander** (Username: `station_navrangpura`, Password: `station123`) to see localized operations and dispatch units.
5. Open the Flutter **Mobile Application** and log in as a **Patrol Officer** (Username: `patrol_mehta`, Password: `patrol123`).
6. Acknowledge an assignment on the mobile app, and watch the status and live GPS location update on the web Command dashboard in real time.

# 8 Screenshots / Demo

- **Web App:** http://localhost:5173
- **Backend API Base:** http://localhost:8000/api/
- **Swagger Documentation:** http://localhost:8000/swagger/

*(Add screenshots of the Web Dashboard and Mobile App here)*

# 9 API Documentation

The API documentation is automatically generated via Swagger and can be viewed at `http://localhost:8000/swagger/`. 

**Example Endpoint: Fetch Incidents**
- **Endpoint:** `/api/crimes/incidents/`
- **Method:** `GET`
- **Required Parameters:** None (Optional query params available for pagination)
- **Authentication:** Bearer JWT required.
- **Expected Response:** 200 OK with a paginated JSON object containing incident details and geospatial coordinates.

# 10 Engineering Decisions

- **PostGIS vs. Standard RDBMS:** Selected PostGIS to enable complex spatial querying directly in the database rather than resolving coordinates in memory on the backend.
- **Dockerized Backend:** Chosen to eliminate local OS complexities of installing GDAL/GEOS libraries necessary for GeoDjango, guaranteeing immediate environment reproduction.
- **Unified API:** Built a single Django REST Framework API layer to serve both the React web application and the Flutter mobile app, maintaining a single source of truth for statuses and coordinates.
- **Mobile Polling/Location Sync:** Kept the MVP simple with API polling from the mobile application rather than introducing a message broker like Redis/WebSockets, reducing architectural complexity.

# 11 Testing

The backend features end-to-end integration tests using Python test scripts. Tested components include:
- API access control and station-isolation (ensuring a station cannot view other jurisdictions).
- Incident paginated listing and role-based data visibility.
- Data anomaly detection (e.g., impossible dates, misassigned patrols).

**To run tests:**
```bash
docker compose exec -T backend python manage.py test
# Or run specific testing scripts:
docker compose exec backend python test_apis_script.py
```

# 12 Limitations & Future Improvements

- **Limitations:** Currently relies on deterministic, synthetic demo data rather than live integrations. The mobile application currently polls the API instead of using WebSockets for bidirectional communication.
- **Future Improvements:** Implement real-time WebSockets/Redis for live map updates and dispatching without polling. Add push notification capability to the mobile application. Improve production deployment configurations including reverse proxy and load balancing.
