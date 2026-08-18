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
import {
  LayersIcon,
  CompassIcon,
  RefreshIcon,
  MaximizeIcon,
} from '../common/Icons';
import './CyberMap.css';

const DEFAULT_CENTER = [23.0225, 72.5714]; // Ahmedabad center

// Base Layer Tile Definitions (Defaulting to High-Detail Google Maps & Ultra-Rich GIS)
const BASE_LAYERS = {
  google_streets: {
    name: 'Google Maps (Standard & POIs)',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: '0123',
    attribution: '&copy; Google Maps Data',
    maxZoom: 22,
    maxNativeZoom: 20,
  },
  google_hybrid: {
    name: 'Google Maps (Satellite Hybrid)',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: '0123',
    attribution: '&copy; Google Imagery & Map Data',
    maxZoom: 22,
    maxNativeZoom: 20,
  },
  google_terrain: {
    name: 'Google Maps (Terrain & Contours)',
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: '0123',
    attribution: '&copy; Google Terrain Data',
    maxZoom: 20,
    maxNativeZoom: 18,
  },
  osm: {
    name: 'OpenStreetMap (Full POIs & Buildings)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  voyager: {
    name: 'Carto Voyager (Clean High-Contrast)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 20,
    maxNativeZoom: 19,
  },
  dark: {
    name: 'Tactical Dark GIS',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 20,
    maxNativeZoom: 19,
  },
};

function getSeverityColor(sev) {
  if (sev === 'CRITICAL') return '#A35139'; // Truffle Trouble Terracotta
  if (sev === 'HIGH') return '#D97A26';     // Burning Flame Deep
  if (sev === 'MEDIUM') return '#285570';   // Velasca Coastal Blue
  return '#2A6B65';                         // Marine Teal
}

function getRiskColor(score) {
  if (score >= 75) return '#A35139';
  if (score >= 50) return '#D97A26';
  if (score >= 25) return '#285570';
  return '#2A6B65';
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
  html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:#C48753;color:#FFFFFF;border-radius:50%;font-size:10px;font-weight:700;border:2px solid #FFFFFF;box-shadow:0 1px 4px rgba(0,0,0,0.25);">T</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Custom Search Highlight Pin
const searchIcon = L.divIcon({
  className: 'custom-search-pin',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:#94A7AE;color:#FFFFFF;border-radius:50%;font-size:11px;border:2px solid #FFFFFF;box-shadow:0 1px 4px rgba(0,0,0,0.25);">S</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
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
        duration: 1.2,
      });
    }
  }, [selectedSearchLoc, map]);

  // Geolocation trigger
  useEffect(() => {
    if (locateTrigger > 0) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1.2 });
          },
          (err) => console.warn('Geolocation error:', err)
        );
      }
    }
  }, [locateTrigger, map]);

  // Reset focus trigger
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo(center || DEFAULT_CENTER, zoom || 12, { duration: 1.0 });
    }
  }, [resetTrigger, center, zoom, map]);

  // Auto-fit bounds on initial data load if enabled
  useEffect(() => {
    if (autoFit && boundsData && boundsData.length > 0) {
      map.fitBounds(boundsData, { padding: [40, 40], maxZoom: 15 });
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
  const [activeLayerKey, setActiveLayerKey] = useState('google_streets'); // Default to full Google Maps with complete POIs and street details
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [searchLocation, setSearchLocation] = useState(null);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);

  const activeLayer = BASE_LAYERS[activeLayerKey] || BASE_LAYERS.google_streets;

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
      <div className="map-provider-badge map-provider-badge--fallback" title="Running in high-performance GIS fallback engine.">
        <div className="map-provider-badge__dot" />
        <span>GIS Vector Layer</span>
      </div>

      {/* Floating Control Buttons */}
      <div className="map-floating-controls">
        <button
          type="button"
          className="map-ctrl-btn"
          title="Map Layer Switcher"
          aria-label="Map Layer Switcher"
          onClick={() => setShowLayerMenu(!showLayerMenu)}
        >
          <LayersIcon size={14} />
        </button>

        {showLayerMenu && (
          <div className="map-layer-menu">
            {Object.entries(BASE_LAYERS).map(([key, config]) => (
              <button
                key={key}
                type="button"
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
          type="button"
          className="map-ctrl-btn"
          title="Locate Current Position"
          aria-label="Locate Current Position"
          onClick={() => setLocateTrigger((c) => c + 1)}
        >
          <CompassIcon size={14} />
        </button>
        <button
          type="button"
          className="map-ctrl-btn"
          title="Reset Map Center"
          aria-label="Reset Map Center"
          onClick={() => setResetTrigger((c) => c + 1)}
        >
          <RefreshIcon size={14} />
        </button>
        <button
          type="button"
          className="map-ctrl-btn"
          title="Fullscreen Toggle"
          aria-label="Fullscreen Toggle"
          onClick={handleToggleFullscreen}
        >
          <MaximizeIcon size={14} />
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        style={{ height: '100%', width: '100%', backgroundColor: '#EEE9DF' }}
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
          subdomains={activeLayer.subdomains || 'abc'}
          attribution={activeLayer.attribution}
          maxZoom={activeLayer.maxZoom}
          maxNativeZoom={activeLayer.maxNativeZoom || 19}
          keepBuffer={12}
          updateWhenIdle={false}
          updateWhenZooming={false}
        />

        {/* Optional Hybrid Overlay Layer */}
        {activeLayer.overlayUrl && (
          <TileLayer
            url={activeLayer.overlayUrl}
            subdomains={activeLayer.subdomains || 'abc'}
            maxZoom={activeLayer.maxZoom}
            maxNativeZoom={activeLayer.maxNativeZoom || 18}
            keepBuffer={12}
            updateWhenIdle={false}
            updateWhenZooming={false}
          />
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
            color="#64766A"
            weight={3.5}
            opacity={0.85}
            dashArray="4, 6"
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
                color="#94A7AE"
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
              {/* Radar pulse ring for Critical alerts */}
              {isCritical && (
                <CircleMarker
                  center={[lat, lng]}
                  radius={14}
                  pathOptions={{
                    color: '#C85A74',
                    fillColor: '#C85A74',
                    fillOpacity: 0.15,
                    weight: 1,
                    dashArray: '3, 4',
                  }}
                />
              )}

              <CircleMarker
                center={[lat, lng]}
                radius={isCritical ? 7 : 5.5}
                pathOptions={{
                  color: '#FFFFFF',
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
                        type="button"
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
                    color: '#94A7AE',
                    fillColor: '#94A7AE',
                    fillOpacity: 0.4,
                    weight: 1.5,
                    dashArray: '3, 3',
                  }}
                >
                  <Popup>
                    <div className="cyber-map-popup">
                      <div className="cyber-map-popup-header" style={{ color: '#94A7AE' }}>
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
                  <CircleMarker
                    center={[gps[1], gps[0]]}
                    radius={12}
                    pathOptions={{
                      color: '#64766A',
                      fillColor: '#64766A',
                      fillOpacity: 0.15,
                      weight: 1,
                    }}
                  />
                  <CircleMarker
                    center={[gps[1], gps[0]]}
                    radius={6}
                    pathOptions={{
                      color: '#FFFFFF',
                      fillColor: '#64766A',
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="cyber-map-popup">
                        <div className="cyber-map-popup-header" style={{ color: '#64766A' }}>
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
                            type="button"
                            className="cyber-map-popup-btn"
                            style={{
                              background: isTracking ? '#C85A74' : '#64766A',
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
                    radius={5}
                    pathOptions={{
                      color: '#FFFFFF',
                      fillColor: '#C48753',
                      fillOpacity: 1,
                      weight: 1.5,
                    }}
                  >
                    <Popup>
                      <div className="cyber-map-popup">
                        <div className="cyber-map-popup-header" style={{ color: '#C48753' }}>
                          <span>UNIT: P-{String(patrol.id).padStart(3, '0')}</span>
                        </div>
                        <div><strong>Officer:</strong> {patrol.officer_username}</div>
                        <div style={{ color: '#C85A74' }}><strong>Status:</strong> GPS PENDING</div>
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
                <strong>DISPATCH TARGET</strong>
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
            radius={8}
            pathOptions={{
              color: '#FFFFFF',
              fillColor: '#C85A74',
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
                radius={6.5}
                pathOptions={{
                  color: '#FFFFFF',
                  fillColor: '#C0A9BD',
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
                    <div className="cyber-map-popup-header" style={{ color: '#C0A9BD' }}>
                      <span>AVAILABLE PATROL</span>
                    </div>
                    <div><strong>Officer:</strong> {r.officer_name.toUpperCase()} {r.badge_number && `[${r.badge_number}]`}</div>
                    <div><strong>Distance:</strong> {(r.distance_meters / 1000).toFixed(2)} km</div>
                    {onSelectRecommendation && (
                      <button
                        type="button"
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
                radius={Math.max(12, zone.score / 3.5)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.3,
                  weight: 1.5,
                }}
              >
                <Tooltip permanent direction="center" opacity={0.9}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#242E29', fontFamily: 'var(--font-mono)' }}>
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
