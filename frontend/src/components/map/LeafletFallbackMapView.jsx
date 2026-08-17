import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  Polyline,
  useMap,
  useMapEvents,
  Marker,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapSearchBar from './MapSearchBar';
import './CyberMap.css';

const DEFAULT_CENTER = [23.0225, 72.5714]; // Ahmedabad center

// Base Layer Tile Definitions
const BASE_LAYERS = {
  voyager: {
    name: '📍 Standard (Roads & POIs)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    maxZoom: 20,
  },
  osm: {
    name: '🗺️ OpenStreetMap Detailed',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    name: '🛰️ Satellite Aerial',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
  hybrid: {
    name: '🌐 Hybrid (Satellite + Roads)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    attribution: 'Tiles &copy; Esri & Carto',
    maxZoom: 19,
  },
  dark: {
    name: '🌙 Tactical Dark GIS',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 20,
  },
};

function getSeverityColor(sev) {
  if (sev === 'CRITICAL') return '#ef4444';
  if (sev === 'HIGH') return '#f59e0b';
  if (sev === 'MEDIUM') return '#3b82f6';
  return '#10b981';
}

function getRiskColor(score) {
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#3b82f6';
  return '#10b981';
}

function getRiskLabel(score) {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

const isValidCoord = (c) =>
  c &&
  c.length === 2 &&
  typeof c[0] === 'number' &&
  typeof c[1] === 'number' &&
  c[0] !== 0 &&
  c[1] !== 0 &&
  c[1] >= -90 &&
  c[1] <= 90 &&
  c[0] >= -180 &&
  c[0] <= 180;

// Custom Leaflet DivIcon for Destination Pin
const destinationIcon = L.divIcon({
  className: 'custom-dest-pin',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:#f59e0b;color:#111827;border-radius:50%;font-size:12px;font-weight:bold;border:2px solid #ffffff;box-shadow:0 0 8px rgba(245,158,11,0.8);">🎯</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom Search Highlight Pin
const searchIcon = L.divIcon({
  className: 'custom-search-pin',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#3b82f6;color:white;border-radius:50%;font-size:14px;border:2px solid #ffffff;box-shadow:0 0 12px #3b82f6;">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Map Controller for Zoom, Pan, Geolocation, and Search flying
function MapController({
  selectedSearchLoc,
  center,
  zoom,
  boundsData,
  autoFit,
  onLocationSelect,
  locateTrigger,
  resetTrigger,
}) {
  const map = useMap();

  // Search flyTo
  useEffect(() => {
    if (selectedSearchLoc) {
      map.flyTo([selectedSearchLoc.lat, selectedSearchLoc.lng], 16, {
        duration: 1.5,
      });
    }
  }, [selectedSearchLoc, map]);

  // Geolocation trigger
  useEffect(() => {
    if (locateTrigger > 0) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1.5 });
          },
          (err) => console.warn('Geolocation error:', err)
        );
      }
    }
  }, [locateTrigger, map]);

  // Reset focus trigger
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo(center || DEFAULT_CENTER, zoom || 12, { duration: 1.2 });
    }
  }, [resetTrigger, center, zoom, map]);

  // Auto-fit bounds on initial data load if enabled
  useEffect(() => {
    if (autoFit && boundsData && boundsData.length > 0) {
      map.fitBounds(boundsData, { padding: [50, 50], maxZoom: 16 });
    }
  }, [boundsData, autoFit, map]);

  // Handle map click for dispatch destination selection
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      }
    },
  });

  return null;
}

export default function LeafletFallbackMapView({
  center = DEFAULT_CENTER,
  zoom = 12,
  incidents = [],
  activePatrols = [],
  selectedTrackId = null,
  trackLocations = [],
  onTrackPatrol,
  onViewAudit,
  riskScores = [],
  showRiskZones = false,
  destination = null,
  onLocationSelect = null,
  recommendations = null,
  onSelectRecommendation = null,
  selectedIncident = null,
  patrolAssignments = null,
  autoFit = true,
}) {
  const [activeLayerKey, setActiveLayerKey] = useState('voyager'); // Default to clear, Google Maps-style Voyager tiles
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [searchLocation, setSearchLocation] = useState(null);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  const activeLayer = BASE_LAYERS[activeLayerKey] || BASE_LAYERS.voyager;

  // Calculate combined bounds for auto-fit
  const boundsData = useMemo(() => {
    const points = [];
    incidents.forEach((i) => {
      if (isValidCoord(i.location?.coordinates)) {
        points.push([i.location.coordinates[1], i.location.coordinates[0]]);
      }
    });
    activePatrols.forEach((p) => {
      if (isValidCoord(p.destination?.coordinates)) {
        points.push([p.destination.coordinates[1], p.destination.coordinates[0]]);
      }
      if (isValidCoord(p.latest_location?.location?.coordinates)) {
        points.push([p.latest_location.location.coordinates[1], p.latest_location.location.coordinates[0]]);
      }
    });
    trackLocations.forEach((loc) => {
      if (isValidCoord(loc.location?.coordinates)) {
        points.push([loc.location.coordinates[1], loc.location.coordinates[0]]);
      }
    });
    if (selectedIncident && isValidCoord(selectedIncident.location_input?.coordinates)) {
      points.push([
        selectedIncident.location_input.coordinates[1],
        selectedIncident.location_input.coordinates[0],
      ]);
    }
    return points;
  }, [incidents, activePatrols, trackLocations, selectedIncident]);

  // Fullscreen toggle
  const wrapperRef = useRef(null);
  const handleToggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  return (
    <div className="cyber-map-wrapper" ref={wrapperRef}>
      {/* Search Bar */}
      <MapSearchBar
        onSelectLocation={(loc) => setSearchLocation(loc)}
        isGoogleLoaded={false}
      />

      {/* Provider Badge */}
      <div className="map-provider-badge map-provider-badge--fallback" title="Running in fallback mode. Add VITE_GOOGLE_MAPS_API_KEY in .env for official Google Maps.">
        <div className="map-provider-badge__dot" />
        <span>Carto / OpenStreetMap (Fallback)</span>
      </div>

      {/* Floating Control Buttons */}
      <div className="map-floating-controls">
        <button
          className="map-ctrl-btn"
          title="Map Layer Switcher"
          onClick={() => setShowLayerMenu(!showLayerMenu)}
        >
          🗺️
        </button>

        {showLayerMenu && (
          <div className="map-layer-menu">
            {Object.entries(BASE_LAYERS).map(([key, config]) => (
              <button
                key={key}
                className={`map-layer-option ${activeLayerKey === key ? 'active' : ''}`}
                onClick={() => {
                  setActiveLayerKey(key);
                  setShowLayerMenu(false);
                }}
              >
                {config.name}
              </button>
            ))}
          </div>
        )}

        <button
          className="map-ctrl-btn"
          title="Locate Me"
          onClick={() => setLocateTrigger((c) => c + 1)}
        >
          🎯
        </button>
        <button
          className="map-ctrl-btn"
          title="Reset View"
          onClick={() => setResetTrigger((c) => c + 1)}
        >
          🔄
        </button>
        <button
          className="map-ctrl-btn"
          title="Fullscreen"
          onClick={handleToggleFullscreen}
        >
          ⛶
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        style={{ height: '100%', width: '100%', backgroundColor: '#0b101a' }}
      >
        <MapController
          selectedSearchLoc={searchLocation}
          center={center}
          zoom={zoom}
          boundsData={boundsData}
          autoFit={autoFit}
          onLocationSelect={onLocationSelect}
          locateTrigger={locateTrigger}
          resetTrigger={resetTrigger}
        />

        {/* Base Layer */}
        <TileLayer
          key={activeLayerKey}
          url={activeLayer.url}
          attribution={activeLayer.attribution}
          maxZoom={activeLayer.maxZoom}
        />

        {/* Optional Hybrid Overlay Layer */}
        {activeLayer.overlayUrl && (
          <TileLayer url={activeLayer.overlayUrl} maxZoom={activeLayer.maxZoom} />
        )}

        {/* 1. Tracked Patrol Route Polyline */}
        {selectedTrackId && trackLocations && trackLocations.length > 0 && (
          <Polyline
            positions={trackLocations
              .filter((loc) => isValidCoord(loc.location?.coordinates))
              .map((loc) => [
                loc.location.coordinates[1],
                loc.location.coordinates[0],
              ])}
            color="#10b981"
            weight={4}
            opacity={0.9}
            dashArray="6, 8"
          />
        )}

        {/* 2. Incident Audit GPS Playback Polyline */}
        {patrolAssignments &&
          patrolAssignments.map((assign) => {
            const path = (assign.locations || [])
              .filter((loc) => isValidCoord(loc.location?.coordinates))
              .map((loc) => [
                loc.location.coordinates[1],
                loc.location.coordinates[0],
              ]);
            return (
              <Polyline
                key={assign.id}
                positions={path}
                color="#3b82f6"
                weight={3}
                opacity={0.8}
              />
            );
          })}

        {/* 3. Incidents Overlay */}
        {incidents.map((incident, idx) => {
          const coords = incident.location?.coordinates;
          if (!isValidCoord(coords)) return null;
          const lat = coords[1];
          const lng = coords[0];
          const color = getSeverityColor(incident.severity);
          const isCritical = incident.severity === 'CRITICAL';

          return (
            <React.Fragment key={`inc-${incident.id || idx}`}>
              {/* Radar pulse for Critical alerts */}
              {isCritical && (
                <CircleMarker
                  center={[lat, lng]}
                  radius={16}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    weight: 1,
                    dashArray: '3, 6',
                  }}
                />
              )}

              <CircleMarker
                center={[lat, lng]}
                radius={isCritical ? 8 : 6}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: color,
                  fillOpacity: 0.95,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="cyber-map-popup">
                    <div
                      className="cyber-map-popup-header"
                      style={{ color }}
                    >
                      <span>{incident.severity} INCIDENT #{incident.id}</span>
                    </div>
                    <div><strong>Title:</strong> {incident.title}</div>
                    <div><strong>Status:</strong> {incident.status}</div>
                    <div>
                      <strong>Assigned Patrols:</strong>{' '}
                      {incident.patrol_assignments_count !== undefined
                        ? incident.patrol_assignments_count
                        : incident.patrol_assignments?.length || 0}
                    </div>
                    {onViewAudit && (
                      <button
                        className="cyber-map-popup-btn"
                        onClick={() => onViewAudit(incident.id)}
                      >
                        VIEW AUDIT TRAIL
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}

        {/* 4. Active Patrols Overlay */}
        {activePatrols.map((patrol) => {
          const dest = patrol.destination?.coordinates;
          const gps = patrol.latest_location?.location?.coordinates;
          const isTracking = selectedTrackId === patrol.id;

          return (
            <React.Fragment key={`patrol-${patrol.id}`}>
              {/* Destination Beacon */}
              {isValidCoord(dest) && (
                <CircleMarker
                  center={[dest[1], dest[0]]}
                  radius={5}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.4,
                    weight: 2,
                    dashArray: '4, 4',
                  }}
                >
                  <Popup>
                    <div className="cyber-map-popup">
                      <div className="cyber-map-popup-header" style={{ color: '#60a5fa' }}>
                        <span>ASSIGNMENT #{patrol.id} DESTINATION</span>
                      </div>
                      <div><strong>Incident:</strong> #{patrol.incident}</div>
                      <div><strong>Officer:</strong> {patrol.officer_username}</div>
                      <div><strong>Status:</strong> {patrol.status}</div>
                      <div><strong>Priority:</strong> {patrol.priority}</div>
                      <div><strong>Instructions:</strong> {patrol.instructions || 'None'}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {/* Live GPS Unit */}
              {isValidCoord(gps) ? (
                <React.Fragment>
                  {/* Glowing pulse ring */}
                  <CircleMarker
                    center={[gps[1], gps[0]]}
                    radius={14}
                    pathOptions={{
                      color: '#10b981',
                      fillColor: '#10b981',
                      fillOpacity: 0.15,
                      weight: 1,
                    }}
                  />
                  <CircleMarker
                    center={[gps[1], gps[0]]}
                    radius={7}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: '#10b981',
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="cyber-map-popup">
                        <div className="cyber-map-popup-header" style={{ color: '#10b981' }}>
                          <span>LIVE GPS: P-{String(patrol.id).padStart(3, '0')}</span>
                        </div>
                        <div><strong>Officer:</strong> {patrol.officer_username}</div>
                        <div><strong>Status:</strong> {patrol.status}</div>
                        <div>
                          <strong>Last Ping:</strong>{' '}
                          {patrol.latest_location?.timestamp
                            ? new Date(patrol.latest_location.timestamp).toLocaleTimeString()
                            : 'N/A'}
                        </div>
                        {onTrackPatrol && (
                          <button
                            className="cyber-map-popup-btn"
                            style={{
                              background: isTracking ? '#ef4444' : '#10b981',
                            }}
                            onClick={() => onTrackPatrol(patrol.id)}
                          >
                            {isTracking ? 'STOP TRACKING' : 'TRACK ROUTE'}
                          </button>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              ) : (
                isValidCoord(dest) && (
                  <CircleMarker
                    center={[dest[1], dest[0]]}
                    radius={6}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: '#f59e0b',
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="cyber-map-popup">
                        <div className="cyber-map-popup-header" style={{ color: '#f59e0b' }}>
                          <span>LIVE GPS: P-{String(patrol.id).padStart(3, '0')}</span>
                        </div>
                        <div><strong>Officer:</strong> {patrol.officer_username}</div>
                        <div style={{ color: '#ef4444' }}><strong>Status:</strong> GPS UNAVAILABLE</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              )}
            </React.Fragment>
          );
        })}

        {/* 5. Destination Pin in Dispatch selection mode */}
        {destination && destination.lat && destination.lng && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
            <Popup>
              <div className="cyber-map-popup">
                <strong>DISPATCH DESTINATION</strong>
                <div>{destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 6. Selected Incident Pin (PatrolPage) */}
        {selectedIncident && isValidCoord(selectedIncident.location_input?.coordinates) && (
          <CircleMarker
            center={[
              selectedIncident.location_input.coordinates[1],
              selectedIncident.location_input.coordinates[0],
            ]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#ef4444',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="cyber-map-popup">
                <strong>TARGET INCIDENT #{selectedIncident.id}</strong>
                <div>{selectedIncident.title}</div>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* 7. Recommended Patrol Markers (PatrolPage) */}
        {recommendations &&
          recommendations.map((r) =>
            r.lat && r.lng ? (
              <CircleMarker
                key={`rec-${r.patrol_id}`}
                center={[r.lat, r.lng]}
                radius={7}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#00c8ff',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => {
                    if (onSelectRecommendation) {
                      onSelectRecommendation(r.patrol_id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="cyber-map-popup">
                    <div className="cyber-map-popup-header" style={{ color: '#00c8ff' }}>
                      <span>AVAILABLE PATROL</span>
                    </div>
                    <div><strong>Officer:</strong> {r.officer_name.toUpperCase()} {r.badge_number && `[${r.badge_number}]`}</div>
                    <div><strong>Distance:</strong> {(r.distance_meters / 1000).toFixed(2)} km</div>
                    {onSelectRecommendation && (
                      <button
                        className="cyber-map-popup-btn"
                        onClick={() => onSelectRecommendation(r.patrol_id)}
                      >
                        SELECT THIS UNIT
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ) : null
          )}

        {/* 8. Risk Zones (Intelligence Dashboard) */}
        {showRiskZones &&
          riskScores.map((zone, idx) => {
            const coords = zone.center?.coordinates || [72.57, 23.02];
            const color = getRiskColor(zone.score);
            return (
              <CircleMarker
                key={`zone-${idx}`}
                center={[coords[1], coords[0]]}
                radius={Math.max(14, zone.score / 3.5)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.35,
                  weight: 1.5,
                }}
              >
                <Tooltip permanent direction="center" opacity={0.9}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff' }}>
                    {zone.zone_name.substring(0, 3).toUpperCase()}
                  </span>
                </Tooltip>
                <Popup>
                  <div className="cyber-map-popup">
                    <div className="cyber-map-popup-header" style={{ color }}>
                      <span>{zone.zone_name.toUpperCase()}</span>
                    </div>
                    <div><strong>Risk Score:</strong> {zone.score?.toFixed(1)} / 100</div>
                    <div><strong>Threat Level:</strong> {getRiskLabel(zone.score)}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 9. Search Result Location Marker */}
        {searchLocation && (
          <Marker position={[searchLocation.lat, searchLocation.lng]} icon={searchIcon}>
            <Popup>
              <div className="cyber-map-popup">
                <strong>{searchLocation.title}</strong>
                {searchLocation.address && <div>{searchLocation.address}</div>}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
