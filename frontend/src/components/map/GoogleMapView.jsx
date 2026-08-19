import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import MapSearchBar from './MapSearchBar';
import {
  LayersIcon,
  CompassIcon,
  RefreshIcon,
  MaximizeIcon,
  PlusIcon,
  MinusIcon,
  LockIcon,
  AlertCircleIcon,
} from '../common/Icons';
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
  cyberHotspots = [],
  showCyberHotspots = false,
  selectedCyberHotspot = null,
  onSelectCyberHotspot = null,
  showSearchBar = true,
  destination = null,
  onLocationSelect = null,
  recommendations = null,
  onSelectRecommendation = null,
  selectedIncident = null,
  patrolAssignments = null,
  optimizedRoute = null,
  autoFit = true,
  onResetKey = null,
  onError = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clustererRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const circlesRef = useRef([]);
  const searchMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);
  const hasInitialFittedRef = useRef(false);

  const [mapType, setMapType] = useState('roadmap');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Catch Google Maps Authentication Failures (Invalid Key, Billing, Referrer Restrictions)
  useEffect(() => {
    window.gm_authFailure = () => {
      const err = 'Google Maps authentication failed. Please check your VITE_GOOGLE_MAPS_API_KEY, billing status, and Google Cloud Console API restrictions for localhost.';
      console.warn(err);
      setLoadError(err);
      if (typeof onError === 'function') {
        onError(err);
      }
    };

    return () => {
      delete window.gm_authFailure;
    };
  }, [onError]);

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

        // Load all required Google Maps libraries in parallel with fast timeout
        const [{ Map, InfoWindow }] = await Promise.race([
          Promise.all([
            importLibrary('maps'),
            importLibrary('places'),
            importLibrary('geometry'),
            importLibrary('marker'),
            importLibrary('visualization').catch(() => null),
          ]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Google Maps network timeout — switching to high-speed GIS')), 1800)
          ),
        ]);

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
          console.warn('Google Maps API failed to load:', err);
          setLoadError(`Google Maps failed to load: ${err.message || err}`);
          if (typeof onError === 'function') {
            onError(err.message || err);
          }
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

  // Center and Zoom synchronization on prop changes (e.g. Inspect button, Search, Hotspot selection)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !window.google) return;
    if (center && Array.isArray(center) && center.length === 2 && center[0] !== 0 && center[1] !== 0) {
      mapInstanceRef.current.panTo({ lat: center[0], lng: center[1] });
      if (zoom) {
        mapInstanceRef.current.setZoom(zoom);
      }
    }
  }, [center, zoom, isLoaded]);

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

    // 0. Render Continuous Hotspot Density Heatmap Layer
    if (showHeatmap && incidents && incidents.length > 0 && window.google?.maps?.visualization?.HeatmapLayer) {
      try {
        const heatmapData = incidents
          .filter((inc) => isValidCoord(inc.location?.coordinates))
          .map((inc) => {
            const coords = inc.location.coordinates;
            const weight =
              inc.severity === 'CRITICAL'
                ? 3.5
                : inc.severity === 'HIGH'
                ? 2.5
                : inc.severity === 'MEDIUM'
                ? 1.5
                : 1.0;
            return {
              location: new google.maps.LatLng(coords[1], coords[0]),
              weight,
            };
          });

        if (heatmapData.length > 0) {
          if (!heatmapLayerRef.current) {
            heatmapLayerRef.current = new google.maps.visualization.HeatmapLayer({
              data: heatmapData,
              map,
              radius: 30,
              opacity: 0.68,
              gradient: [
                'rgba(42, 107, 101, 0)',
                'rgba(42, 107, 101, 0.4)',
                'rgba(40, 85, 112, 0.65)',
                'rgba(217, 122, 38, 0.8)',
                'rgba(163, 81, 57, 0.9)',
                'rgba(140, 45, 30, 0.98)',
              ],
            });
          } else {
            heatmapLayerRef.current.setData(heatmapData);
            heatmapLayerRef.current.setMap(map);
          }
        } else if (heatmapLayerRef.current) {
          heatmapLayerRef.current.setMap(null);
        }
      } catch (heatErr) {
        console.warn('Google Maps visualization.HeatmapLayer not available:', heatErr);
        if (heatmapLayerRef.current) {
          try { heatmapLayerRef.current.setMap(null); } catch (e) { void e; }
          heatmapLayerRef.current = null;
        }
      }
    } else if (heatmapLayerRef.current) {
      try { heatmapLayerRef.current.setMap(null); } catch (e) { void e; }
      heatmapLayerRef.current = null;
    }

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

      // Live / Stale GPS Marker
      if (isValidCoord(gps)) {
        bounds.extend({ lat: gps[1], lng: gps[0] });
        hasBounds = true;

        const pingTime = patrol.latest_location?.timestamp ? new Date(patrol.latest_location.timestamp).getTime() : null;
        const ageMinutes = pingTime ? Math.max(0, Math.round((Date.now() - pingTime) / 60000)) : null;
        const isLive = ageMinutes !== null && ageMinutes <= 5;
        const isStale = ageMinutes !== null && ageMinutes > 5;
        const statusColor = isLive ? '#2A6B65' : isStale ? '#D97A26' : '#64766A';
        const statusLabel = isLive ? 'LIVE' : isStale ? `STALE (${ageMinutes}m ago)` : 'OFFLINE / PENDING';

        const gpsMarker = new google.maps.Marker({
          position: { lat: gps[1], lng: gps[0] },
          map,
          title: `Patrol Unit P-${String(patrol.id).padStart(3, '0')} (${patrol.officer_username}) [${statusLabel}]`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isLive ? 8 : 6,
            fillColor: statusColor,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        gpsMarker.addListener('click', () => {
          const content = `
            <div style="font-family: monospace; font-size: 11px; color: #0f172a; min-width: 200px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
                <strong style="color: ${statusColor}; font-size: 12px;">UNIT P-${String(patrol.id).padStart(3, '0')}</strong>
                <span style="font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 3px; background: ${isLive ? '#EBF5F3' : '#FEF4E8'}; color: ${statusColor};">${statusLabel}</span>
              </div>
              <strong>Officer:</strong> ${patrol.officer_username}<br/>
              <strong>Assignment:</strong> #${patrol.id} (${patrol.status})<br/>
              <strong>Sector:</strong> ${patrol.zone_name || 'Central'}<br/>
              ${patrol.station_name ? `<strong>Station:</strong> ${patrol.station_name}<br/>` : ''}
              <strong>Priority:</strong> ${patrol.priority}<br/>
              <strong>Coordinates:</strong> ${gps[1].toFixed(5)}, ${gps[0].toFixed(5)}<br/>
              <strong>Last Update:</strong> ${patrol.latest_location?.timestamp ? `${new Date(patrol.latest_location.timestamp).toLocaleTimeString()} (${ageMinutes === 0 ? 'just now' : `${ageMinutes}m ago`})` : 'N/A'}<br/>
              <div style="margin-top: 8px;">
                <button id="btn-track-${patrol.id}" style="background: ${isTracking ? '#A35139' : statusColor}; border: none; color: white; padding: 5px 8px; font-size: 10.5px; cursor: pointer; width: 100%; border-radius: 3px; font-weight: bold;">
                  ${isTracking ? 'STOP TRACKING' : 'TRACK LIVE ROUTE'}
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
          strokeColor: '#2A6B65',
          strokeOpacity: 0.9,
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

    // 4.5 Optimized Patrol Route Polyline & Waypoints
    if (optimizedRoute && optimizedRoute.route_geometry && optimizedRoute.route_geometry.length > 1) {
      const pathCoords = optimizedRoute.route_geometry.map((pt) => ({
        lat: pt[0],
        lng: pt[1],
      }));

      pathCoords.forEach((pt) => {
        bounds.extend(pt);
        hasBounds = true;
      });

      const routePolyline = new google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#285570',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });
      polylinesRef.current.push(routePolyline);

      // Start pin
      if (optimizedRoute.officer?.start_location) {
        const startPin = new google.maps.Marker({
          position: {
            lat: optimizedRoute.officer.start_location.lat,
            lng: optimizedRoute.officer.start_location.lng,
          },
          map,
          title: `Start: ${optimizedRoute.officer.start_location.label}`,
          label: {
            text: 'S',
            color: '#ffffff',
            fontWeight: 'bold',
          },
        });
        markersRef.current.push(startPin);
      }

      // Waypoints pins
      if (optimizedRoute.waypoints) {
        optimizedRoute.waypoints.forEach((wp) => {
          const wpMarker = new google.maps.Marker({
            position: { lat: wp.lat, lng: wp.lng },
            map,
            title: `Stop #${wp.sequence}: ${wp.title}`,
            label: {
              text: String(wp.sequence),
              color: '#ffffff',
              fontWeight: 'bold',
            },
          });
          markersRef.current.push(wpMarker);
        });
      }
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

    // 8.5 Cybercrime Hotspots Layer
    if (showCyberHotspots && cyberHotspots && cyberHotspots.length > 0) {
      cyberHotspots.forEach((hotspot) => {
        const lng = hotspot.center?.coordinates ? hotspot.center.coordinates[0] : (typeof hotspot.longitude === 'number' ? hotspot.longitude : null);
        const lat = hotspot.center?.coordinates ? hotspot.center.coordinates[1] : (typeof hotspot.latitude === 'number' ? hotspot.latitude : null);

        // Exclude hotspots without valid coordinates (never invent fake coordinates)
        if (lat === null || lng === null || !isValidCoord([lng, lat])) {
          return;
        }

        bounds.extend({ lat, lng });
        hasBounds = true;

        const threatLvl = (hotspot.threat_level || 'MEDIUM').toUpperCase();
        const color = threatLvl === 'CRITICAL' ? '#7C3AED' : threatLvl === 'HIGH' ? '#C026D3' : threatLvl === 'MEDIUM' ? '#0284C7' : '#0D9488';
        const isSelected = selectedCyberHotspot?.station_id === hotspot.station_id || selectedCyberHotspot?.zone_name === hotspot.zone_name;

        // Selected Outer Highlight Circle
        if (isSelected) {
          const selectRing = new google.maps.Circle({
            map,
            center: { lat, lng },
            radius: Math.max(700, (hotspot.cybercrime_count || 1) * 450 + 200),
            fillColor: '#F59E0B',
            fillOpacity: 0.2,
            strokeColor: '#F59E0B',
            strokeWeight: 2.5,
          });
          circlesRef.current.push(selectRing);
        }

        // Threat Radius Circle
        const circle = new google.maps.Circle({
          map,
          center: { lat, lng },
          radius: Math.max(500, (hotspot.cybercrime_count || 1) * 350),
          fillColor: color,
          fillOpacity: isSelected ? 0.3 : 0.18,
          strokeColor: color,
          strokeWeight: isSelected ? 2.5 : 1.5,
        });

        // Core Pin Marker
        const pinMarker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: `🛡️ CYBER: ${hotspot.zone_name.toUpperCase()} (${hotspot.cybercrime_count} cases)`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 12 : 9,
            fillColor: isSelected ? '#7C3AED' : color,
            fillOpacity: 0.95,
            strokeColor: isSelected ? '#F59E0B' : '#ffffff',
            strokeWeight: isSelected ? 3 : 2,
          },
        });

        const openPopup = () => {
          if (onSelectCyberHotspot) onSelectCyberHotspot(hotspot);

          infoWindowRef.current.setContent(`
            <div style="font-family: monospace; font-size: 11px; color: #0f172a; min-width: 240px; max-width: 320px; line-height: 1.45;">
              <div style="border-bottom: 2px solid ${color}; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: ${color}; font-size: 12px;">🛡️ CYBERCRIME HOTSPOT</strong>
                <span style="font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 3px; background-color: ${color}; color: #ffffff;">${threatLvl}</span>
              </div>
              <div style="font-size: 13px; font-weight: 800; margin-bottom: 2px;">${hotspot.zone_name.toUpperCase()}</div>
              <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">Jurisdiction: ${hotspot.station_name} (${hotspot.station_code})</div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #f8fafc; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                <div><strong>Cybercrimes:</strong> <span style="color: ${color}; font-weight: 800;">${hotspot.cybercrime_count}</span> (${hotspot.cybercrime_ratio}%)</div>
                <div><strong>Physical Crimes:</strong> ${hotspot.physical_crime_count}</div>
                <div><strong>Dominant:</strong> ${hotspot.dominant_type}</div>
                <div><strong>Trend:</strong> ${hotspot.trend}</div>
              </div>

              ${hotspot.fraud_count > 0 ? `<div>• Financial Fraud: ${hotspot.fraud_count}</div>` : ''}
              ${hotspot.phishing_count > 0 ? `<div>• Phishing Scams: ${hotspot.phishing_count}</div>` : ''}
              ${hotspot.identity_count > 0 ? `<div>• Identity Theft: ${hotspot.identity_count}</div>` : ''}

              ${hotspot.ai_context ? `
                <div style="margin-top: 6px; padding: 4px 6px; background: rgba(40, 85, 112, 0.08); border-radius: 3px; font-size: 10px;">
                  <strong>Contextual AI Risk:</strong> ${hotspot.ai_context.ai_risk_score}/100 (${hotspot.ai_context.ai_risk_level}) [${hotspot.ai_context.ai_model_status}]
                </div>
              ` : ''}

              ${hotspot.explanation ? `<div style="margin-top: 6px; font-style: italic; font-size: 10px; color: #475569; background: #f1f5f9; padding: 4px 6px; border-radius: 3px;">"${hotspot.explanation}"</div>` : ''}
            </div>
          `);
          infoWindowRef.current.setPosition({ lat, lng });
          infoWindowRef.current.open(map);
        };

        circle.addListener('click', openPopup);
        pinMarker.addListener('click', openPopup);

        circlesRef.current.push(circle);
        markersRef.current.push(pinMarker);
      });
    }

    // Auto-fit bounds on initial load if enabled and items exist
    if (autoFit && hasBounds && map && !hasInitialFittedRef.current) {
      map.fitBounds(bounds, 50);
      hasInitialFittedRef.current = true;
    }
  }, [
    isLoaded,
    showHeatmap,
    incidents,
    activePatrols,
    selectedTrackId,
    trackLocations,
    onTrackPatrol,
    onViewAudit,
    riskScores,
    showRiskZones,
    cyberHotspots,
    showCyberHotspots,
    selectedCyberHotspot,
    onSelectCyberHotspot,
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
      {showSearchBar && isLoaded && (
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
              <button
                type="button"
                className={`map-layer-option ${mapType === 'roadmap' ? 'active' : ''}`}
                onClick={() => handleSetMapType('roadmap')}
              >
                Roadmap (Default)
              </button>
              <button
                type="button"
                className={`map-layer-option ${mapType === 'satellite' ? 'active' : ''}`}
                onClick={() => handleSetMapType('satellite')}
              >
                Satellite (Imagery)
              </button>
              <button
                type="button"
                className={`map-layer-option ${mapType === 'hybrid' ? 'active' : ''}`}
                onClick={() => handleSetMapType('hybrid')}
              >
                Hybrid (Aerial + Roads)
              </button>
              <button
                type="button"
                className={`map-layer-option ${mapType === 'terrain' ? 'active' : ''}`}
                onClick={() => handleSetMapType('terrain')}
              >
                Terrain
              </button>

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

          <button type="button" className="map-ctrl-btn" title="Zoom In" aria-label="Zoom In" onClick={handleZoomIn}>
            <PlusIcon size={14} />
          </button>
          <button type="button" className="map-ctrl-btn" title="Zoom Out" aria-label="Zoom Out" onClick={handleZoomOut}>
            <MinusIcon size={14} />
          </button>
          <button type="button" className="map-ctrl-btn" title="Locate Me" aria-label="Locate Me" onClick={handleLocateMe}>
            <CompassIcon size={14} />
          </button>
          <button type="button" className="map-ctrl-btn" title="Focus Operational Area" aria-label="Focus Operational Area" onClick={handleResetFocus}>
            <RefreshIcon size={14} />
          </button>
          <button type="button" className="map-ctrl-btn" title="Fullscreen" aria-label="Fullscreen" onClick={handleToggleFullscreen}>
            <MaximizeIcon size={14} />
          </button>
          {onResetKey && (
            <button type="button" className="map-ctrl-btn" title="Change Google Maps API Key" aria-label="Change Google Maps API Key" onClick={onResetKey}>
              <LockIcon size={14} />
            </button>
          )}
        </div>
      )}

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

      {loadError && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            right: '20px',
            padding: '16px',
            background: 'var(--palette-chalk)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-critical-border)',
            borderRadius: 'var(--radius-xs)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            zIndex: 2000,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px', color: 'var(--color-critical)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircleIcon size={16} />
            <span>Google Maps failed to load</span>
          </div>
          <div>{loadError}</div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Ensure <strong>Maps JavaScript API</strong> and <strong>Places API</strong> are enabled in your Google Cloud Console project, and check that your API key is correctly configured in <code>frontend/.env</code> as <code>VITE_GOOGLE_MAPS_API_KEY</code>.
          </div>
          {onResetKey && (
            <button
              type="button"
              onClick={onResetKey}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '10px' }}
            >
              Reset Key
            </button>
          )}
        </div>
      )}
    </div>
  );
}
