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
  const hasFittedInitialRef = useRef(false);

  // Instantly invalidate size on mount so map tiles and canvas render without blank delay
  useEffect(() => {
    map.invalidateSize();
    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
    });
    return () => cancelAnimationFrame(raf);
  }, [map]);

  // Center pan on center changes
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && center[0] !== 0 && center[1] !== 0) {
      if (!hasFittedInitialRef.current) {
        map.setView(center, zoom || 13, { animate: false });
      } else {
        map.panTo(center, { animate: true, duration: 0.35 });
      }
    }
  }, [center, zoom, map]);

  // Search flyTo
  useEffect(() => {
    if (selectedSearchLoc) {
      map.flyTo([selectedSearchLoc.lat, selectedSearchLoc.lng], 16, {
        duration: 0.8,
      });
    }
  }, [selectedSearchLoc, map]);

  // Geolocation trigger
  useEffect(() => {
    if (locateTrigger > 0) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 0.8 });
          },
          (err) => console.warn('Geolocation error:', err)
        );
      }
    }
  }, [locateTrigger, map]);

  // Reset focus trigger
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo(center || DEFAULT_CENTER, zoom || 12, { duration: 0.5 });
    }
  }, [resetTrigger, center, zoom, map]);

  // Auto-fit bounds ONLY once on initial mount with boundsData
  useEffect(() => {
    if (autoFit && boundsData && boundsData.length > 0 && !hasFittedInitialRef.current) {
      map.fitBounds(boundsData, { padding: [40, 40], maxZoom: 15, animate: false });
      hasFittedInitialRef.current = true;
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

// Native Canvas Heatmap Layer for Leaflet (Kernel Density / Gaussian Blur with CyberSphere Palette)
function LeafletHeatmapOverlay({
  incidents = [],
  enabled = true,
  radius = 30,
  blur = 18,
  maxOpacity = 0.72,
}) {
  const map = useMap();
  const canvasRef = useRef(null);

  // Pre-generate 256-color palette lookup table matching CyberSphere institutional scheme
  const palette = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 256;
    pCanvas.height = 1;
    const pCtx = pCanvas.getContext('2d');
    const grad = pCtx.createLinearGradient(0, 0, 256, 1);
    // Smooth transition: Low density Teal -> Moderate Coastal Blue -> High Amber -> Critical Terracotta
    grad.addColorStop(0.0, 'rgba(42, 107, 101, 0)');
    grad.addColorStop(0.15, 'rgba(42, 107, 101, 0.35)');
    grad.addColorStop(0.38, 'rgba(40, 85, 112, 0.6)');
    grad.addColorStop(0.65, 'rgba(217, 122, 38, 0.78)');
    grad.addColorStop(0.85, 'rgba(163, 81, 57, 0.88)');
    grad.addColorStop(1.0, 'rgba(140, 45, 30, 0.95)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 256, 1);
    return pCtx.getImageData(0, 0, 256, 1).data;
  }, []);

  // Pre-generate soft radial brush stamp
  const circleStamp = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const r = radius;
    const r2 = r + blur;
    const cCanvas = document.createElement('canvas');
    cCanvas.width = r2 * 2;
    cCanvas.height = r2 * 2;
    const cCtx = cCanvas.getContext('2d');
    const radGrad = cCtx.createRadialGradient(r2, r2, r * 0.1, r2, r2, r2);
    radGrad.addColorStop(0, 'rgba(0,0,0,1)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    cCtx.fillStyle = radGrad;
    cCtx.beginPath();
    cCtx.arc(r2, r2, r2, 0, Math.PI * 2, true);
    cCtx.closePath();
    cCtx.fill();
    return { canvas: cCanvas, offset: r2 };
  }, [radius, blur]);

  useEffect(() => {
    if (!enabled || !map) {
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
      return;
    }

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = L.DomUtil.create('canvas', 'cyber-heatmap-canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '200';
      const pane = map.getPanes().overlayPane;
      pane.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const drawHeatmap = () => {
      if (!canvas || !map || !palette || !circleStamp) return;
      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) return;

      const bounds = map.getBounds();
      const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());

      canvas.width = size.x;
      canvas.height = size.y;
      L.DomUtil.setPosition(canvas, topLeft);

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, size.x, size.y);

      const severityWeights = {
        CRITICAL: 1.0,
        HIGH: 0.75,
        MEDIUM: 0.5,
        LOW: 0.3,
      };

      let pointsDrawn = 0;
      incidents.forEach((inc) => {
        const coords = inc.location?.coordinates;
        if (!isValidCoord(coords)) return;
        const lat = coords[1];
        const lng = coords[0];

        // Draw if within visible bounds plus buffer
        if (!bounds.pad(0.15).contains([lat, lng])) return;

        const pt = map.latLngToLayerPoint([lat, lng]);
        const x = pt.x - topLeft.x;
        const y = pt.y - topLeft.y;

        const weight = severityWeights[inc.severity] || 0.4;
        ctx.globalAlpha = Math.min(1.0, weight * 0.7);
        ctx.drawImage(circleStamp.canvas, x - circleStamp.offset, y - circleStamp.offset);
        pointsDrawn++;
      });

      if (pointsDrawn === 0) return;

      const imgData = ctx.getImageData(0, 0, size.x, size.y);
      const data = imgData.data;
      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
          const pIdx = alpha * 4;
          data[i] = palette[pIdx];
          data[i + 1] = palette[pIdx + 1];
          data[i + 2] = palette[pIdx + 2];
          data[i + 3] = Math.round(palette[pIdx + 3] * maxOpacity);
        }
      }

      ctx.putImageData(imgData, 0, 0);
    };

    drawHeatmap();

    map.on('moveend zoomend resize viewreset', drawHeatmap);

    return () => {
      map.off('moveend zoomend resize viewreset', drawHeatmap);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
        canvasRef.current = null;
      }
    };
  }, [map, incidents, enabled, palette, circleStamp, maxOpacity]);

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
  optimizedRoute = null,
  autoFit = true,
}) {
  const [activeLayerKey, setActiveLayerKey] = useState('google_streets'); // Default to full Google Maps with complete POIs and street details
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
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
    if (optimizedRoute?.route_geometry) {
      optimizedRoute.route_geometry.forEach((pt) => {
        if (Array.isArray(pt) && pt.length === 2 && pt[0] !== 0 && pt[1] !== 0) {
          points.push([pt[0], pt[1]]);
        }
      });
    }
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
          className="map-ctrl-btn map-ctrl-btn--layers"
          title="Map Layers & Overlays"
          aria-label="Map Layers & Overlays"
          onClick={() => setShowLayerMenu(!showLayerMenu)}
        >
          <LayersIcon size={14} />
        </button>

        {showLayerMenu && (
          <div className="map-layer-menu">
            <div className="map-layer-menu-header">BASE MAP TILES</div>
            {Object.entries(BASE_LAYERS).map(([key, config]) => (
              <button
                key={key}
                type="button"
                className={`map-layer-option ${activeLayerKey === key ? 'active' : ''}`}
                onClick={() => {
                  setActiveLayerKey(key);
                }}
              >
                {config.name}
              </button>
            ))}

            <div className="map-layer-divider" />

            <div className="map-layer-menu-header">OVERLAYS</div>
            <button
              type="button"
              className={`map-layer-toggle-btn ${showHeatmap ? 'active' : ''}`}
              onClick={() => setShowHeatmap(!showHeatmap)}
              title="Toggle Continuous Hotspot Density Heatmap"
            >
              <span
                className="map-layer-toggle-dot"
                style={{ backgroundColor: showHeatmap ? 'var(--color-verified)' : 'var(--color-text-muted)' }}
              />
              <span>Density Heatmap</span>
              <span className={`map-layer-toggle-badge ${showHeatmap ? 'active' : ''}`}>
                {showHeatmap ? 'ON' : 'OFF'}
              </span>
            </button>
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

      {/* Heatmap Density Legend */}
      {showHeatmap && (
        <div className="map-heatmap-legend" aria-label="Hotspot Density Legend">
          <div className="map-heatmap-legend-title">HOTSPOT DENSITY</div>
          <div className="map-heatmap-gradient-bar" />
          <div className="map-heatmap-legend-labels">
            <span>Low</span>
            <span>Moderate</span>
            <span>Critical</span>
          </div>
        </div>
      )}

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
          subdomains={activeLayer.subdomains || '0123'}
          attribution={activeLayer.attribution}
          maxZoom={activeLayer.maxZoom}
          maxNativeZoom={activeLayer.maxNativeZoom || 19}
          keepBuffer={16}
          updateWhenIdle={false}
          updateWhenZooming={true}
          crossOrigin="anonymous"
        />

        {/* Optional Hybrid Overlay Layer */}
        {activeLayer.overlayUrl && (
          <TileLayer
            url={activeLayer.overlayUrl}
            subdomains={activeLayer.subdomains || '0123'}
            maxZoom={activeLayer.maxZoom}
            maxNativeZoom={activeLayer.maxNativeZoom || 18}
            keepBuffer={16}
            updateWhenIdle={false}
            updateWhenZooming={true}
            crossOrigin="anonymous"
          />
        )}

        {/* Continuous Hotspot Density Heatmap Overlay */}
        <LeafletHeatmapOverlay
          incidents={incidents}
          enabled={showHeatmap}
          radius={30}
          blur={18}
          maxOpacity={0.72}
        />

        {/* 1. Tracked Patrol Route Polyline & Historical Breadcrumbs */}
        {selectedTrackId && trackLocations && trackLocations.length > 0 && (
          <React.Fragment>
            <Polyline
              positions={trackLocations
                .filter((loc) => isValidCoord(loc.location?.coordinates))
                .map((loc) => [
                  loc.location.coordinates[1],
                  loc.location.coordinates[0],
                ])}
              color="#2A6B65"
              weight={3.5}
              opacity={0.85}
              dashArray="4, 6"
            />
            {/* Historical GPS breadcrumb waypoint dots */}
            {trackLocations
              .filter((loc) => isValidCoord(loc.location?.coordinates))
              .map((loc, idx) => (
                <CircleMarker
                  key={`breadcrumb-pt-${idx}-${loc.id || idx}`}
                  center={[loc.location.coordinates[1], loc.location.coordinates[0]]}
                  radius={3.5}
                  pathOptions={{
                    color: '#FFFFFF',
                    fillColor: '#2A6B65',
                    fillOpacity: 0.8,
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <div className="cyber-map-popup" style={{ minWidth: '160px' }}>
                      <div className="cyber-map-popup-header" style={{ color: '#2A6B65' }}>
                        <span>GPS TRAIL POINT #{idx + 1}</span>
                      </div>
                      <div><strong>Ping Time:</strong> {loc.timestamp ? new Date(loc.timestamp).toLocaleTimeString() : 'Recorded'}</div>
                      <div><strong>Coordinates:</strong> {loc.location.coordinates[1].toFixed(5)}, {loc.location.coordinates[0].toFixed(5)}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </React.Fragment>
        )}

        {/* 1.5 Optimized Multi-Stop Patrol Route Polyline & Waypoints */}
        {optimizedRoute && optimizedRoute.route_geometry && optimizedRoute.route_geometry.length > 1 && (
          <React.Fragment>
            <Polyline
              positions={optimizedRoute.route_geometry}
              color="#285570"
              weight={4.5}
              opacity={0.9}
              dashArray="6, 8"
            />

            {/* Starting Officer / Base Marker */}
            {optimizedRoute.officer?.start_location && (
              <Marker
                position={[optimizedRoute.officer.start_location.lat, optimizedRoute.officer.start_location.lng]}
                icon={L.divIcon({
                  className: 'cyber-start-waypoint-icon',
                  html: `<div style="
                    background-color: #285570;
                    color: #FFFFFF;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 800;
                    border: 2px solid #FFFFFF;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
                  ">🚩</div>`,
                  iconSize: [28, 28],
                  iconAnchor: [14, 14],
                  popupAnchor: [0, -15],
                })}
              >
                <Popup>
                  <div className="cyber-map-popup">
                    <div className="cyber-map-popup-header" style={{ color: '#285570' }}>
                      <span>PATROL ROUTE START POINT</span>
                    </div>
                    <div><strong>Unit:</strong> {optimizedRoute.officer.username}</div>
                    <div><strong>Origin:</strong> {optimizedRoute.officer.start_location.label}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Ordered Waypoint Stop Markers */}
            {optimizedRoute.waypoints && optimizedRoute.waypoints.map((wp) => (
              <Marker
                key={`opt-wp-${wp.sequence}-${wp.incident_id}`}
                position={[wp.lat, wp.lng]}
                icon={L.divIcon({
                  className: 'cyber-route-waypoint-icon',
                  html: `<div style="
                    background-color: ${wp.severity === 'CRITICAL' ? '#A35139' : wp.severity === 'HIGH' ? '#D97A26' : '#285570'};
                    color: #FFFFFF;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 800;
                    font-family: var(--font-mono);
                    border: 2px solid #FFFFFF;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                  ">${wp.sequence}</div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                  popupAnchor: [0, -14],
                })}
              >
                <Popup>
                  <div className="cyber-map-popup">
                    <div className="cyber-map-popup-header" style={{ color: wp.severity === 'CRITICAL' ? '#A35139' : '#285570' }}>
                      <span>STOP #{wp.sequence} — INCIDENT #{wp.incident_id}</span>
                    </div>
                    <div><strong>Title:</strong> {wp.title}</div>
                    <div><strong>Severity:</strong> <span className={`badge badge--${wp.severity === 'CRITICAL' ? 'critical' : wp.severity === 'HIGH' ? 'high' : 'operational'}`}>{wp.severity}</span></div>
                    <div><strong>Leg Distance:</strong> {wp.leg_distance_km} km</div>
                    <div><strong>Est. Arrival:</strong> +{wp.est_arrival_minutes} min</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </React.Fragment>
        )}

        {/* 2. Candidate GIS Proximity Patrol Units */}
        {recommendations && recommendations.map((patrol) => {
          const coords = patrol.current_location?.coordinates;
          if (!isValidCoord(coords)) return null;

          return (
            <CircleMarker
              key={`rec-patrol-${patrol.patrol_id}`}
              center={[coords[1], coords[0]]}
              radius={8}
              pathOptions={{
                color: '#285570',
                fillColor: '#285570',
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div className="cyber-map-popup">
                  <div className="cyber-map-popup-header" style={{ color: '#285570' }}>
                    <span>PROXIMITY CANDIDATE</span>
                  </div>
                  <div><strong>Unit:</strong> {patrol.officer_name}</div>
                  <div><strong>Station:</strong> {patrol.station}</div>
                  <div><strong>Distance:</strong> {(patrol.distance_meters / 1000).toFixed(2)} km</div>
                  {onSelectRecommendation && (
                    <button
                      type="button"
                      className="cyber-map-popup-btn"
                      style={{ background: '#285570' }}
                      onClick={() => onSelectRecommendation(patrol.patrol_id)}
                    >
                      ASSIGN THIS UNIT
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* 3. Incidents Overlay */}
        {incidents.map((incident) => {
          const coords = incident.location?.coordinates || incident.location_input?.coordinates;
          if (!isValidCoord(coords)) return null;

          const color = getSeverityColor(incident.severity);

          return (
            <React.Fragment key={`inc-${incident.id}`}>
              {incident.severity === 'CRITICAL' && (
                <CircleMarker
                  center={[coords[1], coords[0]]}
                  radius={18}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.22,
                    weight: 1,
                  }}
                />
              )}

              <CircleMarker
                center={[coords[1], coords[0]]}
                radius={8}
                pathOptions={{
                  color: '#FFFFFF',
                  fillColor: color,
                  fillOpacity: 0.95,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="cyber-map-popup">
                    <div className="cyber-map-popup-header" style={{ color }}>
                      <span>INCIDENT #{incident.id} [{incident.severity}]</span>
                    </div>
                    <div><strong>Title:</strong> {incident.title}</div>
                    <div><strong>Status:</strong> {incident.status}</div>
                    <div><strong>Type:</strong> {incident.crime_type || incident.incident_type || 'INCIDENT'}</div>
                    {incident.station_name && <div><strong>Station:</strong> {incident.station_name}</div>}
                    <div><strong>Description:</strong> {incident.description?.substring(0, 100)}</div>
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

          const pingTime = patrol.latest_location?.timestamp ? new Date(patrol.latest_location.timestamp).getTime() : null;
          const ageMinutes = pingTime ? Math.max(0, Math.round((Date.now() - pingTime) / 60000)) : null;
          const isLive = ageMinutes !== null && ageMinutes <= 5;
          const isStale = ageMinutes !== null && ageMinutes > 5;
          const statusColor = isLive ? '#2A6B65' : isStale ? '#D97A26' : '#64766A';
          const statusLabel = isLive ? 'LIVE' : isStale ? `STALE (${ageMinutes}m ago)` : 'OFFLINE / PENDING';

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
                      <div><strong>Sector:</strong> {patrol.zone_name}</div>
                      {patrol.station_name && <div><strong>Station:</strong> {patrol.station_name}</div>}
                      <div><strong>Instructions:</strong> {patrol.instructions || 'None'}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {/* Live / Stale GPS Unit */}
              {isValidCoord(gps) ? (
                <React.Fragment>
                  <CircleMarker
                    center={[gps[1], gps[0]]}
                    radius={isLive ? 14 : 10}
                    pathOptions={{
                      color: statusColor,
                      fillColor: statusColor,
                      fillOpacity: isLive ? 0.22 : 0.12,
                      weight: 1,
                    }}
                  />
                  <CircleMarker
                    center={[gps[1], gps[0]]}
                    radius={6.5}
                    pathOptions={{
                      color: '#FFFFFF',
                      fillColor: statusColor,
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="cyber-map-popup" style={{ minWidth: '200px' }}>
                        <div className="cyber-map-popup-header" style={{ color: statusColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>PATROL UNIT P-{String(patrol.id).padStart(3, '0')}</span>
                          <span style={{
                            fontSize: '9px',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: isLive ? '#EBF5F3' : '#FEF4E8',
                            color: statusColor,
                            fontWeight: '800',
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div><strong>Officer:</strong> {patrol.officer_username}</div>
                        <div><strong>Assignment:</strong> #{patrol.id} ({patrol.status})</div>
                        <div><strong>Sector:</strong> {patrol.zone_name}</div>
                        {patrol.station_name && <div><strong>Station:</strong> {patrol.station_name}</div>}
                        <div><strong>Priority:</strong> {patrol.priority}</div>
                        <div><strong>Coordinates:</strong> {gps[1].toFixed(5)}, {gps[0].toFixed(5)}</div>
                        <div>
                          <strong>Last Update:</strong>{' '}
                          {patrol.latest_location?.timestamp
                            ? `${new Date(patrol.latest_location.timestamp).toLocaleTimeString()} (${ageMinutes === 0 ? 'just now' : `${ageMinutes}m ago`})`
                            : 'N/A'}
                        </div>
                        {patrol.instructions && (
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            <em>{patrol.instructions}</em>
                          </div>
                        )}
                        {onTrackPatrol && (
                          <button
                            type="button"
                            className="cyber-map-popup-btn"
                            style={{
                              background: isTracking ? '#A35139' : statusColor,
                              marginTop: '8px',
                            }}
                            onClick={() => onTrackPatrol(patrol.id)}
                          >
                            {isTracking ? 'STOP TRACKING' : 'TRACK LIVE ROUTE'}
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
                        <div style={{ color: '#A35139' }}><strong>GPS Status:</strong> PENDING / NO PING</div>
                        <div><strong>Sector:</strong> {patrol.zone_name}</div>
                        {patrol.station_name && <div><strong>Station:</strong> {patrol.station_name}</div>}
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
