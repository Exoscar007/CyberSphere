# CyberSphere MVP - Hackathon Demo Script

## 1. Introduction (The Pitch)
"Welcome to CyberSphere, the next-generation Command & Control Intelligence platform for law enforcement. Traditional policing is reactive and fragmented. We built CyberSphere to be proactive, centralized, and driven by spatial intelligence and AI."

## 2. Technical Architecture Note
"Our backend is a robust Django/PostGIS system fully dockerized and ready for production scaling. However, for this live presentation on this host machine, we are running our React frontend in **Simulation Mode**. 
To ensure maximum reliability during field deployments—where network connectivity can drop or infrastructure fails—we engineered the frontend to be highly resilient. If the backend is unreachable, the UI instantly falls back to cached simulation data and intercepts network errors gracefully, allowing command staff to continue operating the interface without crashes."

## 3. The Walkthrough (Click Path)

### A. The Command Overview (Dashboard)
- **Action**: Load the Application (`/dashboard`).
- **Talking Point**: "Upon login, the Commander is presented with high-level metrics. Notice the clean, institutional design and color-coded alerts for Critical Incidents and Risk Zones. This immediate visual triage saves lives by directing attention where it is needed most."

### B. Crime Operations
- **Action**: Click `FIRs` in the Sidebar.
- **Talking Point**: "Officers in the field can file First Information Reports. The data structure natively captures geospatial points, ensuring every crime is geographically tagged."
- **Action**: Briefly show `Incidents` and `Complaints` pages.
- **Talking Point**: "The public and patrol units have streamlined, unified forms for rapid data entry."

### C. Intelligence & AI Prediction
- **Action**: Click `Analytics & Maps`.
- **Talking Point**: "This is the core of CyberSphere. We don't just log crime; we predict it. Using our AI models, we score city zones by risk probability based on historical frequency and spatial density."
- **Action**: Point out the **Geospatial Hotspot Map**.
- **Talking Point**: "Our React Leaflet integration visualizes these risk zones as heatmaps overlaying the city grid. The red zones indicate a high probability of impending incidents."
- **Action**: Click **Run AI Prediction** button.
- **Talking Point**: "Commanders can manually trigger a model retraining based on the latest data. Notice the UI disabling the trigger and polling the backend job until the async task is completed, demonstrating our robust state management."

### D. Patrol Management
- **Action**: Click `Patrol Assignment`.
- **Talking Point**: "Knowing where crime will happen is useless without action. Here, we dispatch units to the AI-identified risk zones."
- **Action**: Assign Officer `45` to `Downtown Commercial`.
- **Talking Point**: "Once dispatched, the system tracks them via live GPS. *(Click Simulate GPS Ping)*. The backend handles streaming PostGIS coordinate updates."

### E. Monitoring & Reports
- **Action**: Click `Monitoring & Reports`.
- **Talking Point**: "Finally, accountability and uptime. We monitor API and Database health in real-time. Notice how it correctly identifies the disconnected database environment."
- **Action**: Click **Generate Crime Summary Report**.
- **Talking Point**: "At the end of a shift, command staff can generate an automated data export summarizing the clearance rates and high-risk zones."

## 4. Conclusion
"CyberSphere takes law enforcement from reactive paper-pushing to proactive intelligence. The MVP proves out the architecture—from the PostGIS data modeling to the highly resilient React frontend UI. Thank you."

## 5. CyberSphere MVP Demo Checklist
1. Start Docker: `docker compose up -d --build`
2. Start application: `cd frontend && npm run dev`
3. Login as City Command: username `admin`, password `admin123`
4. Demonstrate recent incidents: Show the Map and KPIs.
5. Change filters: Select 'Last 24 Hours' and 'CRITICAL' severity.
6. Show GIS/map: Navigate to Analytics & Maps.
7. Show intelligence: Run AI Prediction.
8. Login/use Station view: Log out, log in as `station_navrangpura` (password: `station123`).
9. Show active patrols: Point out the dispatch queue and live patrol tracking.
10. Show operational history: Navigate to Operational History page.
11. Show completed operation/audit trail: Click on an incident to view audit.
12. Show evidence where available: Review evidence attached to the incident.
