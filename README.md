# CyberSphere

CyberSphere is a next-generation Command & Control Intelligence platform for law enforcement. It provides real-time geospatial tracking, AI-driven crime prediction, and centralized dispatch capabilities.

## Quick Start

### Prerequisites
For Windows development, you must have the following installed:
- **Git** (Required)
- **Docker Desktop** (Required - for the PostGIS database and Django backend)
- **Node.js** (v18+) and **npm** (Required - for the React frontend)
- **WSL2** (Highly Recommended for Docker performance on Windows)

### Clone Repository
```bash
git clone <repository-url>
cd cybersphere
```

### Start Backend + Database
The backend and database run entirely in Docker.
```bash
docker compose up --build
```
*This will automatically pull the PostGIS image, build the Django backend, run migrations (`python manage.py migrate`), and start the backend server.*

### Start Frontend
The frontend runs via Vite and npm. Open a **new terminal window**:
```bash
cd frontend
npm install
npm run dev
```

### Verify Services
To verify the Docker containers are healthy:
```bash
docker compose ps
```
You should see two containers running:
- `db`: The PostGIS database
- `backend`: The Django API

## Local URLs & Services
- **Frontend / CyberSphere App**: http://localhost:5173
- **Backend API Base**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/
- **Swagger Documentation**: http://localhost:8000/swagger/
- **Database Port**: `5432`

## Database & Demo Data Setup
CyberSphere requires synthetic demonstration data for the dashboards and GIS maps to function properly.

Once the backend is running, open a **new terminal** and run the following command to seed the database with synthetic deterministic Ahmedabad demonstration data (Incidents, FIRs, Patrols, Evidence, etc.):

```bash
docker compose exec backend python manage.py seed_demo_data
```

To generate a much larger temporal dataset (up to 12 months of historical data for analytics and AI forecasting), run the temporal seeder:
```bash
docker compose exec backend python manage.py seed_temporal_data --months 12
```
*Note: You can pass `--clear` to the temporal seeder to wipe existing synthetic data before reseeding: `docker compose exec backend python manage.py seed_temporal_data --months 12 --clear`*

## Demo Credentials (LOCAL/DEMO ONLY)
The `seed_demo_data` command creates several safe, local-only demo accounts to explore different Role-Based Access Control (RBAC) views. **These are synthetic accounts for demo purposes only. Do not use in production.**

**Admin / City Command**
- Username: `admin`
- Password: `admin123`
- Purpose: Full city-wide command overview, analytics, and intelligence forecasting.

**Station Commanders**
- Username: `station_navrangpura`
- Password: `station123`
- Station: Navrangpura Police Station
- Purpose: Station-specific dashboard, managing local FIRs, dispatching local units.

- Username: `station_satellite`
- Password: `station123`
- Station: Satellite Police Station

**Patrol Officers**
- Username: `patrol_mehta`
- Password: `patrol123`
- Purpose: Mobile/Patrol view, viewing assignments, acknowledging dispatch.

- Username: `patrol_joshi`
- Password: `patrol123`

## Application Roles
- **City Command (Admin)**: Can view all stations, city-wide heatmap, response time trends, and run AI prediction models.
- **Station Commander (Station)**: Restricted to their specific jurisdiction. Can dispatch local patrol units, file FIRs, and monitor station-level workload.
- **Patrol Officer (Patrol)**: Receives active assignments and transmits GPS locations. Cannot dispatch other units.

## Main Demo Flow
1. Start Docker (`docker compose up`) and Frontend (`npm run dev`).
2. Run the seed script: `docker compose exec backend python manage.py seed_demo_data`
3. Open `http://localhost:5173` and log in as `admin` (City Command).
4. View the **City Command** dashboard to see the progressive loading map, active incidents, and response time charts.
5. Log out and log back in as `station_navrangpura` to view the restricted **Station Dashboard**.
6. View **Operational History** to test the time, status, and severity filters.
7. Explore **AI Intelligence** and **GIS** capabilities for crime forecasting.

## Current MVP Features
- **City Command Dashboard**: Real-time city-wide monitoring with progressive loading and AbortController request management for high performance.
- **Station Dashboard**: Localized dispatch and workload tracking.
- **Incident & FIR Management**: Centralized reporting with geospatial tagging.
- **Dispatch / Patrol Operations**: Assign officers to incidents with simulated GPS tracking.
- **Operational History**: Advanced combinable time/severity/status filtering for historical analysis.
- **AI Intelligence**: Temporal crime forecasting and risk density mapping.

## Mobile Application
CyberSphere includes a Flutter-based mobile application designed for Patrol Officers in the field. It connects directly to the central Django backend and provides a focused operational workflow for receiving assignments, transmitting GPS telemetry, navigating to incidents, and uploading evidence.

### Mobile Features
- **Patrol Authentication**: Login securely using JWT-based API endpoints.
- **Active Assignment Visibility**: Automatically fetches the current highest-priority active dispatch assignment.
- **Location & GPS Tracking**: Continuous GPS telemetry pinging to the backend, enabling the City Command map to track units in real-time.
- **Operational Status Workflow**: Update assignment status sequentially (`ASSIGNED` → `ACKNOWLEDGED` → `EN ROUTE` → `ARRIVED` → `COMPLETED`).
- **Navigation Integration**: Seamless handoff to Google Maps or native OS navigation for incident routing.
- **Evidence Capture**: Camera and gallery integration for capturing and uploading incident evidence directly to the backend.

### Mobile Project Structure
```text
mobile/
├── android/             # Android native configuration
├── ios/                 # iOS native configuration
├── lib/
│   ├── config.dart      # API connection configuration
│   ├── main.dart        # Flutter entry point
│   └── screens/         # UI screens (home_screen, login_screen)
└── pubspec.yaml         # Flutter dependencies
```

### Mobile Setup
To run the mobile app, you need the Flutter SDK and a device/emulator.

1. Install Flutter (v3.12+ recommended).
2. Open a new terminal and navigate to the `mobile` directory:
```bash
cd mobile
flutter pub get
```
3. Run the app on an active Android emulator or connected device:
```bash
flutter run
```

### Backend Connection
The mobile application uses `lib/config.dart` to determine the backend API URL. 
- **Android Emulator**: Uses `http://10.0.2.2:8000` to reach the host machine's backend.
- **iOS Simulator / Web**: Uses `http://localhost:8000`.
Ensure the backend is running via Docker before starting the mobile app.

### Mobile Demo Flow
1. Start the CyberSphere backend and database (`docker compose up`).
2. Seed the demo data if not already done.
3. Start the mobile app (`flutter run`).
4. Login using the Patrol Officer demo account (Username: `patrol_mehta`, Password: `patrol123`).
5. Ensure location permissions are granted when prompted.
6. Acknowledge your assigned incident and cycle through the status updates (`EN_ROUTE`, `ARRIVED`).
7. Watch the City Command web dashboard automatically update your GPS location and assignment status in real-time.

## Architecture Overview
The CyberSphere ecosystem operates on a unified backend:

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
Both the Web and Mobile applications communicate with the identical REST APIs to ensure complete real-time synchronization between the field and the command center.

## MVP Scope
### Web Application
Designed for **Commanders and Dispatchers**. Provides city-wide overviews, localized station workloads, advanced geospatial filtering, historical analysis, AI predictions, and assignment dispatching.

### Mobile Application
Designed strictly for **Patrol Officers in the field**. Provides a streamlined, singular view of their current assignment, location tracking, and status updating. It does not include dispatching, AI forecasting, or historical analysis capabilities.

## Environment Variables
A `.env.example` file is provided in the `backend/` directory. If you run via Docker, `docker-compose.yml` injects the necessary environment variables automatically.

**backend/.env.example**:
```env
DATABASE_URL=postgis://postgres:postgrespassword@localhost:5432/cybersphere
SECRET_KEY=your-secret-key-here
DEBUG=True
```
*Note: `DATABASE_URL` uses `@db:5432` inside Docker, but `@localhost:5432` if running the backend locally outside of Docker.*

## Troubleshooting (Windows)

### Docker is not running
If the backend fails to start, verify Docker Desktop is running:
```bash
docker info
```

### Port already in use (5432 or 8000)
If you get a "bind: address already in use" error:
- Port 5432: You likely have a local PostgreSQL instance running. Stop it using Windows Services (`services.msc`).
- Port 8000: Another web server or Django project is running.

### Backend is unavailable
If `http://localhost:8000` is down, inspect backend logs:
```bash
docker compose logs -f backend
```

### Frontend is unavailable
If `http://localhost:5173` is down, ensure `npm run dev` is running in your `frontend` terminal. 

### Database problems
To check if the database is healthy:
```bash
docker compose ps
```

### Fresh database / reset
If your database gets corrupted or you want a completely fresh state:
**WARNING: This deletes all local demo data.**
```bash
docker compose down -v
docker compose up --build
```
Then re-run the seed command.

### Mobile: Connection Refused / Network Offline
If the mobile app displays "NETWORK OFFLINE" or fails to connect:
- Ensure your backend is running.
- If using a physical Android device, the emulator loopback `10.0.2.2` will not work. You must change `apiBaseUrl` in `lib/config.dart` to your computer's local IP address (e.g., `192.168.1.X`) and ensure both devices are on the same Wi-Fi network.

## Development Commands

| Task | Command |
| :--- | :--- |
| Start Everything (Backend) | `docker compose up --build` |
| Stop Backend | `docker compose down` |
| Start Frontend | `cd frontend && npm run dev` |
| Build Frontend | `cd frontend && npm run build` |
| View Backend Logs | `docker compose logs -f backend` |
| Django Shell | `docker compose exec backend python manage.py shell` |
| Django Migrations | `docker compose exec backend python manage.py makemigrations` |
| Seed Basic Data | `docker compose exec backend python manage.py seed_demo_data` |
| Seed Temporal Data | `docker compose exec backend python manage.py seed_temporal_data --months 12` |

## Team Workflow
When contributing to CyberSphere:
1. `git pull origin main`
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make changes and test locally.
4. `git add .`
5. `git commit -m "Description of changes"`
6. `git push origin feature/your-feature-name`
