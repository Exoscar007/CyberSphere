import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import MapSearchBar from './MapSearchBar';
import './CyberMap.css';

const DEFAULT_CENTER = { lat: 23.0225, lng: 72.5714 }; // Ahmedabad Center

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

export default function GoogleMapView({
  apiKey,
  center = [23.0225, 72.5714],
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
  onResetKey = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clustererRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const circlesRef = useRef([]);
  const searchMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const hasInitialFittedRef = useRef(false);

  const [mapType, setMapType] = useState('roadmap');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Catch Google Maps Authentication Failures (Invalid Key, Billing, Referrer Restrictions)
  useEffect(() => {
    window.gm_authFailure = () => {
      const err = 'Google Maps authentication failed. Please check your VITE_GOOGLE_MAPS_API_KEY, billing status, and Google Cloud Console API restrictions for localhost.';
      console.error(err);
      setLoadError(err);
    };

    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  // Initialize Google Maps API using modern functional API
  useEffect(() => {
    if (!apiKey || apiKey.trim() === '') {
      setLoadError('VITE_GOOGLE_MAPS_API_KEY is not configured.');
      return;
    }

    setLoadError(null);
    let isCancelled = false;

    async function initMap() {
      try {
        if (!window.__GM_LOADED_KEY__ || window.__GM_LOADED_KEY__ !== apiKey.trim()) {
          try {
            setOptions({
              key: apiKey.trim(),
              v: 'weekly',
            });
            window.__GM_LOADED_KEY__ = apiKey.trim();
          } catch (optErr) {
            console.debug('setOptions note:', optErr);
          }
        }

        const { Map, InfoWindow } = await importLibrary('maps');
        await importLibrary('places');
        await importLibrary('geometry');
        await importLibrary('marker');

        if (isCancelled || !mapContainerRef.current) return;

        const initialLat = center && center[0] ? center[0] : DEFAULT_CENTER.lat;
        const initialLng = center && center[1] ? center[1] : DEFAULT_CENTER.lng;

        const map = new Map(mapContainerRef.current, {
          center: { lat: initialLat, lng: initialLng },
          zoom: zoom || 12,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: false,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          mapTypeControl: false,
          streetViewControl: true,
          streetViewControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          fullscreenControl: false,
          gestureHandling: 'greedy',
        });

        infoWindowRef.current = new InfoWindow();
        mapInstanceRef.current = map;
        clustererRef.current = new MarkerClusterer({ map });

        // If map selection is enabled (Patrol Dispatch)
        if (onLocationSelect) {
          map.addListener('click', (e) => {
            onLocationSelect({
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            });
          });
        }

        setIsLoaded(true);
      } catch (err) {
        if (!isCancelled) {
          console.error('Google Maps API failed to load:', err);
          setLoadError(`Google Maps failed to load: ${err.message || err}`);
        }
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
    };
  }, [apiKey]);

  // Handle map type changes (Roadmap, Satellite, Hybrid, Terrain)
  const handleSetMapType = (type) => {
    setMapType(type);
    setShowLayerMenu(false);
    if (!mapInstanceRef.current || !window.google) return;
    const gMaps = window.google.maps;
    const typeMap = {
      roadmap: gMaps.MapTypeId.ROADMAP,
      satellite: gMaps.MapTypeId.SATELLITE,
      hybrid: gMaps.MapTypeId.HYBRID,
      terrain: gMaps.MapTypeId.TERRAIN,
    };
    mapInstanceRef.current.setMapTypeId(typeMap[type] || gMaps.MapTypeId.ROADMAP);
  };

  // Zoom In / Out
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() - 1);
    }
  };

  // Geolocation
  const handleLocateMe = () => {
    if (navigator.geolocation && mapInstanceRef.current && window.google) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          mapInstanceRef.current.panTo(latLng);
          mapInstanceRef.current.setZoom(15);

          new window.google.maps.Circle({
            map: mapInstanceRef.current,
            center: latLng,
            radius: pos.coords.accuracy || 100,
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            strokeColor: '#3b82f6',
            strokeWeight: 1.5,
          });
        },
        (err) => console.warn('Geolocation failed:', err)
      );
    }
  };

  // Reset to default focus
  const handleResetFocus = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: center[0] || DEFAULT_CENTER.lat, lng: center[1] || DEFAULT_CENTER.lng });
      mapInstanceRef.current.setZoom(zoom || 12);
    }
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    const el = mapContainerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  // Search Location selection handler (Google Places)
  const handleSearchSelect = ({ lat, lng, title, address }) => {
    if (!mapInstanceRef.current || !window.google) return;
    hasInitialFittedRef.current = true;
    const latLng = { lat, lng };
    mapInstanceRef.current.panTo(latLng);
    mapInstanceRef.current.setZoom(16);

    if (searchMarkerRef.current) {
      searchMarkerRef.current.setMap(null);
    }

    const marker = new window.google.maps.Marker({
      position: latLng,
      map: mapInstanceRef.current,
      title,
      animation: window.google.maps.Animation.DROP,
      icon: {
        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    const info = new window.google.maps.InfoWindow({
      content: `<div style="font-family: monospace; font-size: 11px; color: #111827;"><strong>${title}</strong><br/>${address || ''}</div>`,
    });
    info.open(mapInstanceRef.current, marker);

    searchMarkerRef.current = marker;
  };

  // Render Overlays: Incidents, Patrols, Risk Zones, Polylines
  const renderOverlays = useCallback(() => {
    if (!isLoaded || !mapInstanceRef.current || !window.google) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    // Clean previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    // Clean previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Clean previous circles
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;
    const incidentMarkers = [];

    // 1. Render Incidents
    incidents.forEach((incident) => {
      const coords = incident.location?.coordinates;
      if (!isValidCoord(coords)) return;

      const lat = coords[1];
      const lng = coords[0];
      const color = getSeverityColor(incident.severity);
      bounds.extend({ lat, lng });
      hasBounds = true;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        title: `${incident.severity} Incident #${incident.id}: ${incident.title}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: incident.severity === 'CRITICAL' ? 8 : 6,
          fillColor: color,
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      marker.addListener('click', () => {
        const content = `
          <div style="font-family: monospace; font-size: 11px; color: #0f172a; min-width: 170px;">
            <strong style="color: ${color}; font-size: 12px;">${incident.severity} INCIDENT #${incident.id}</strong><br/>
            <strong>Title:</strong> ${incident.title}<br/>
            <strong>Status:</strong> ${incident.status}<br/>
            <strong>Assigned:</strong> ${incident.patrol_assignments_count !== undefined ? incident.patrol_assignments_count : incident.patrol_assignments?.length || 0}<br/>
            <div style="margin-top: 8px;">
              <button id="btn-view-audit-${incident.id}" style="background: #3b82f6; border: none; color: white; padding: 4px 8px; font-size: 10px; cursor: pointer; width: 100%; border-radius: 2px; font-weight: bold;">
                VIEW AUDIT
              </button>
            </div>
          </div>
        `;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(map, marker);

        setTimeout(() => {
          const btn = document.getElementById(`btn-view-audit-${incident.id}`);
          if (btn && onViewAudit) {
            btn.onclick = () => onViewAudit(incident.id);
          }
        }, 100);
      });

      incidentMarkers.push(marker);
      markersRef.current.push(marker);
    });

    // Add incidents to clusterer
    if (clustererRef.current && incidentMarkers.length > 0) {
      clustererRef.current.addMarkers(incidentMarkers);
    }

    // 2. Render Active Patrol Units & Destinations
    activePatrols.forEach((patrol) => {
      const dest = patrol.destination?.coordinates;
      const gps = patrol.latest_location?.location?.coordinates;
      const isTracking = selectedTrackId === patrol.id;

      // Destination Marker
      if (isValidCoord(dest)) {
        bounds.extend({ lat: dest[1], lng: dest[0] });
        hasBounds = true;

        const destMarker = new google.maps.Marker({
          position: { lat: dest[1], lng: dest[0] },
          map,
          title: `Assignment #${patrol.id} Destination`,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_OPEN_ARROW,
            scale: 5,
            fillColor: '#3b82f6',
            fillOpacity: 0.6,
            strokeColor: '#60a5fa',
            strokeWeight: 1.5,
          },
        });
        markersRef.current.push(destMarker);
      }

      // Live GPS Marker
      if (isValidCoord(gps)) {
        bounds.extend({ lat: gps[1], lng: gps[0] });
        hasBounds = true;

        const gpsMarker = new google.maps.Marker({
          position: { lat: gps[1], lng: gps[0] },
          map,
          title: `Patrol Unit P-${String(patrol.id).padStart(3, '0')} (${patrol.officer_username})`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        gpsMarker.addListener('click', () => {
          const content = `
            <div style="font-family: monospace; font-size: 11px; color: #0f172a; min-width: 180px;">
              <strong style="color: #10b981; font-size: 12px;">LIVE GPS: P-${String(patrol.id).padStart(3, '0')}</strong><br/>
              <strong>Officer:</strong> ${patrol.officer_username}<br/>
              <strong>Status:</strong> ${patrol.status}<br/>
              <strong>Last Ping:</strong> ${patrol.latest_location?.timestamp ? new Date(patrol.latest_location.timestamp).toLocaleTimeString() : 'N/A'}<br/>
              <div style="margin-top: 8px;">
                <button id="btn-track-${patrol.id}" style="background: ${isTracking ? '#ef4444' : '#10b981'}; border: none; color: white; padding: 4px 8px; font-size: 10px; cursor: pointer; width: 100%; border-radius: 2px; font-weight: bold;">
                  ${isTracking ? 'STOP TRACKING' : 'TRACK ROUTE'}
                </button>
              </div>
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, gpsMarker);

          setTimeout(() => {
            const btn = document.getElementById(`btn-track-${patrol.id}`);
            if (btn && onTrackPatrol) {
              btn.onclick = () => onTrackPatrol(patrol.id);
            }
          }, 100);
        });

        markersRef.current.push(gpsMarker);
      }
    });

    // 3. Tracked Patrol Route Polyline
    if (selectedTrackId && trackLocations && trackLocations.length > 0) {
      const pathCoords = trackLocations
        .filter((loc) => isValidCoord(loc.location?.coordinates))
        .map((loc) => ({
          lat: loc.location.coordinates[1],
          lng: loc.location.coordinates[0],
        }));

      if (pathCoords.length > 0) {
        const polyline = new google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: '#10b981',
          strokeOpacity: 0.95,
          strokeWeight: 4,
          map,
        });
        polylinesRef.current.push(polyline);
      }
    }

    // 4. Incident Audit Patrol Playback Paths (for IncidentAuditPage)
    if (patrolAssignments && patrolAssignments.length > 0) {
      patrolAssignments.forEach((assign) => {
        const path = (assign.locations || [])
          .filter((loc) => isValidCoord(loc.location?.coordinates))
          .map((loc) => ({
            lat: loc.location.coordinates[1],
            lng: loc.location.coordinates[0],
          }));

        if (path.length > 0) {
          const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.85,
            strokeWeight: 3,
            map,
          });
          polylinesRef.current.push(polyline);
        }
      });
    }

    // 5. Selected Incident Pin (PatrolPage / IncidentAuditPage)
    if (selectedIncident && selectedIncident.location_input?.coordinates) {
      const coords = selectedIncident.location_input.coordinates;
      if (isValidCoord(coords)) {
        bounds.extend({ lat: coords[1], lng: coords[0] });
        hasBounds = true;

        const incPin = new google.maps.Marker({
          position: { lat: coords[1], lng: coords[0] },
          map,
          title: selectedIncident.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#ef4444',
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        markersRef.current.push(incPin);
      }
    }

    // 6. Destination Marker (Dispatch mode)
    if (destination && destination.lat && destination.lng) {
      const destPin = new google.maps.Marker({
        position: { lat: destination.lat, lng: destination.lng },
        map,
        title: 'Dispatch Destination',
        animation: google.maps.Animation.BOUNCE,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(destPin);
    }

    // 7. Recommended Patrol Markers (PatrolPage)
    if (recommendations && recommendations.length > 0) {
      recommendations.forEach((rec) => {
        if (!rec.lat || !rec.lng) return;
        bounds.extend({ lat: rec.lat, lng: rec.lng });
        hasBounds = true;

        const recPin = new google.maps.Marker({
          position: { lat: rec.lat, lng: rec.lng },
          map,
          title: `Recommended: ${rec.officer_name}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#00c8ff',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        recPin.addListener('click', () => {
          if (onSelectRecommendation) {
            onSelectRecommendation(rec.patrol_id);
          }
        });

        markersRef.current.push(recPin);
      });
    }

    // 8. Risk Zones (Intelligence Dashboard)
    if (showRiskZones && riskScores && riskScores.length > 0) {
      riskScores.forEach((zone) => {
        const coords = zone.center?.coordinates || [72.57, 23.02];
        const lat = coords[1];
        const lng = coords[0];
        const color = getRiskColor(zone.score);

        const circle = new google.maps.Circle({
          map,
          center: { lat, lng },
          radius: Math.max(400, zone.score * 12),
          fillColor: color,
          fillOpacity: 0.35,
          strokeColor: color,
          strokeWeight: 1.5,
        });

        circle.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="font-family: monospace; font-size: 11px; color: #0f172a;">
              <strong>${zone.zone_name.toUpperCase()}</strong><br/>
              Risk Score: <strong>${zone.score?.toFixed(1)} / 100</strong>
            </div>
          `);
          infoWindowRef.current.setPosition({ lat, lng });
          infoWindowRef.current.open(map);
        });

        circlesRef.current.push(circle);
      });
    }

    // Auto-fit bounds on initial load if enabled and items exist
    if (autoFit && hasBounds && map && !hasInitialFittedRef.current) {
      map.fitBounds(bounds, 50);
      hasInitialFittedRef.current = true;
    }
  }, [
    isLoaded,
    incidents,
    activePatrols,
    selectedTrackId,
    trackLocations,
    onTrackPatrol,
    onViewAudit,
    riskScores,
    showRiskZones,
    destination,
    recommendations,
    onSelectRecommendation,
    selectedIncident,
    patrolAssignments,
    autoFit,
  ]);

  useEffect(() => {
    renderOverlays();
  }, [renderOverlays]);

  return (
    <div className="cyber-map-wrapper">
      <div ref={mapContainerRef} className="cyber-map-container" />

      {/* Floating Search Bar */}
      {isLoaded && (
        <MapSearchBar
          onSelectLocation={handleSearchSelect}
          isGoogleLoaded={true}
          googleMapInstance={mapInstanceRef.current}
        />
      )}

      {/* Floating Institutional Controls (Top Right) */}
      {isLoaded && (
        <div className="map-floating-controls">
          <button
            className="map-ctrl-btn"
            title="Map Type / Layers"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
          >
            🗺️
          </button>

          {showLayerMenu && (
            <div className="map-layer-menu">
              <button
                className={`map-layer-option ${mapType === 'roadmap' ? 'active' : ''}`}
                onClick={() => handleSetMapType('roadmap')}
              >
                📍 Roadmap (Default)
              </button>
              <button
                className={`map-layer-option ${mapType === 'satellite' ? 'active' : ''}`}
                onClick={() => handleSetMapType('satellite')}
              >
                🛰️ Satellite (Imagery)
              </button>
              <button
                className={`map-layer-option ${mapType === 'hybrid' ? 'active' : ''}`}
                onClick={() => handleSetMapType('hybrid')}
              >
                🌐 Hybrid (Aerial + Roads)
              </button>
              <button
                className={`map-layer-option ${mapType === 'terrain' ? 'active' : ''}`}
                onClick={() => handleSetMapType('terrain')}
              >
                ⛰️ Terrain
              </button>
            </div>
          )}

          <button className="map-ctrl-btn" title="Zoom In" onClick={handleZoomIn}>
            ➕
          </button>
          <button className="map-ctrl-btn" title="Zoom Out" onClick={handleZoomOut}>
            ➖
          </button>
          <button className="map-ctrl-btn" title="Locate Me" onClick={handleLocateMe}>
            🎯
          </button>
          <button className="map-ctrl-btn" title="Focus Operational Area" onClick={handleResetFocus}>
            🔄
          </button>
          <button className="map-ctrl-btn" title="Fullscreen" onClick={handleToggleFullscreen}>
            ⛶
          </button>
          {onResetKey && (
            <button className="map-ctrl-btn" title="Change Google Maps API Key" onClick={onResetKey}>
              🔑
            </button>
          )}
        </div>
      )}

      {loadError && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            right: '20px',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 2000,
            boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
            ⚠️ Google Maps failed to load
          </div>
          <div>{loadError}</div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#fef2f2' }}>
            Ensure <strong>Maps JavaScript API</strong> and <strong>Places API</strong> are enabled in your Google Cloud Console project, and check that your API key is correctly configured in <code>frontend/.env</code> as <code>VITE_GOOGLE_MAPS_API_KEY</code>.
          </div>
          {onResetKey && (
            <button
              onClick={onResetKey}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                background: 'white',
                color: '#ef4444',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Enter a Different API Key
            </button>
          )}
        </div>
      )}
    </div>
  );
}
