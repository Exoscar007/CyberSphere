# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **City Commanders & Admins**: High-level command staff monitoring city-wide situational awareness, emergency triage, cross-jurisdiction visibility, and AI-assisted crime hotspot prediction.
- **Station Commanders & Dispatchers**: Jurisdictional officers managing localized First Information Reports (FIRs), dispatching patrol units, and triaging local complaints and evidence.
- **Crime Analysts**: Specialists evaluating temporal crime patterns, risk density maps, and triggering predictive ML models.

## Product Purpose

CyberSphere is a next-generation Command & Control Intelligence platform for law enforcement. It replaces fragmented, reactive policing systems with a unified, proactive platform combining real-time geospatial tracking, predictive AI crime analysis, and role-based incident operations. Success means zero-latency visual triage, swift unit dispatch, and minimal operational friction during critical incidents.

## Positioning

An institutional-grade spatial intelligence and law enforcement operations hub that couples predictive ML crime risk modeling with real-time PostGIS geospatial tracking and resilient simulation fallback.

## Operating Context

- **Environment**: High-stakes municipal command centers, control rooms, and station dispatch consoles operating on multi-monitor desktop setups.
- **Cognitive Load**: High-tempo situational awareness during critical incidents; requires high scannability, clear visual hierarchy, unambiguous status indicators, and rapid access to geospatial and incident details.
- **Lighting / Environment**: Dark command-center environment with high-contrast semantic alerts (Critical Red, Warning Amber, Operational Green).

## Capabilities and Constraints

- **Capabilities**: Real-time city command heatmap, localized station consoles, FIR/incident logging with spatial tagging, live GPS patrol tracking & simulation, AI temporal crime forecasting, and health/operational reporting.
- **Technical Stack**: React 19, Vite, Leaflet / React-Leaflet, Django REST Framework, PostgreSQL / PostGIS.
- **Non-Negotiable Constraints**: Strict preservation of existing backend API contracts, RBAC permissions, authentication flows, GIS coordinate logic, and core business functionality.

## Brand Commitments

- **Voice & Identity**: Institutional, authoritative, precise, dependable, and modern command-center aesthetic.
- **Visual Discipline**: High-contrast dark theme, crisp typography, clean data density without clutter or generic AI design anti-patterns (no thick colored border side-tabs, no arbitrary purple gradients).

## Evidence on Hand

- Verified React 19 frontend codebase at `frontend/`.
- Django/PostGIS backend at `backend/` with seeded Ahmedabad jurisdictional demo data (`23.0225, 72.5714`).
- Documented demo scripts and API contracts in `README.md`, `DEMO.md`, and `working.md`.

## Product Principles

1. **Clarity Under Pressure**: Direct the commander's eye to high-priority incidents immediately through rigorous visual hierarchy.
2. **Spatial-First Intelligence**: Ground all situational awareness and resource allocation in accurate, interactive geospatial context.
3. **Frictionless Dispatch & Reporting**: Minimize clicks and form complexity for emergency logging, FIRs, and patrol deployments.
4. **Resilient Data Integrity**: Ensure continuous operation with graceful offline/simulation fallbacks and unambiguous system health status.

## Accessibility & Inclusion

- High visual contrast compliance for dark UI themes (WCAG AA).
- Legible typography hierarchy for variable viewing distances in command rooms.
- Multi-channel status encoding (combining color, icons, and text labels for critical statuses).
