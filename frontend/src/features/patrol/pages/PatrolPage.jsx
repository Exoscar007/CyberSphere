import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import CyberMap from '../../../components/map/CyberMap';
import useMonitoringSocket from '../../../hooks/useMonitoringSocket';
import {
  DispatchIcon,
  ZapIcon,
  CheckIcon,
  AlertCircleIcon,
  LocationPinIcon,
  CompassIcon,
  RadioWaveIcon,
} from '../../../components/common/Icons';

const AHMEDABAD_CENTER = [23.0225, 72.5714];

function extractErrorMessage(err, defaultMsg) {
  const data = err.response?.data;
  if (!data) return err.message || defaultMsg;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.message) return data.message;
  const keys = Object.keys(data);
  if (keys.length > 0) {
    const key = keys[0];
    const val = data[key];
    if (Array.isArray(val)) return `${key}: ${val.join(', ')}`;
    if (typeof val === 'string') return `${key}: ${val}`;
  }
  return defaultMsg;
}

/**
 * Calculates real-time GPS telemetry health and relative timestamp
 */
function getGpsHealth(timestamp) {
  if (!timestamp) {
    return {
      status: 'OFFLINE',
      label: 'OFFLINE',
      color: '#A35139',
      bg: 'rgba(163, 81, 57, 0.12)',
      badgeClass: 'badge--critical',
      timeAgo: 'No recent GPS',
    };
  }
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageSec = Math.max(0, Math.floor(ageMs / 1000));
  const ageMin = Math.floor(ageSec / 60);

  if (ageMin < 5) {
    const timeAgo = ageSec < 10 ? 'Just now' : ageSec < 60 ? `${ageSec} sec ago` : `${ageMin} min ago`;
    return {
      status: 'LIVE',
      label: 'LIVE',
      color: '#2A6B65',
      bg: 'rgba(42, 107, 101, 0.12)',
      badgeClass: 'badge--operational',
      timeAgo,
    };
  }

  const timeAgo = ageMin < 60 ? `${ageMin} min ago` : `${Math.floor(ageMin / 60)}h ago`;
  return {
    status: 'STALE',
    label: 'STALE',
    color: '#D97A26',
    bg: 'rgba(217, 122, 38, 0.12)',
    badgeClass: 'badge--high',
    timeAgo,
  };
}

export default function PatrolPage() {
  const location = useLocation();
  const { addToast } = useToast();
  const initialIncident = location.state?.incident || null;

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncident?.id ? String(initialIncident.id) : '');
  const [assignments, setAssignments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  // AI Hotspot Dispatch State
  const [hotspots, setHotspots] = useState([]);
  const [hotspotRecommendLoading, setHotspotRecommendLoading] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState('');


  // Route Optimization State
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [maxWaypoints, setMaxWaypoints] = useState(5);
  const [priorityOnly, setPriorityOnly] = useState(false);

  // Live GPS Tracking & Telemetry State
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [trackLocations, setTrackLocations] = useState([]);
  const [pingLoading, setPingLoading] = useState({});
  const [lastFleetUpdate, setLastFleetUpdate] = useState(() => new Date().toLocaleTimeString());
  const [, setTick] = useState(0);

  // 5-second local UI timer to keep "X sec ago" fresh
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const assRes = await api.get('/api/patrol/assignments/');
      if (Array.isArray(assRes.data)) {
        setAssignments(assRes.data);
        setLastFleetUpdate(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.debug('Failed to fetch patrol assignments:', e);
    }
  }, []);

  // Real-Time WebSocket Telemetry Connection
  const { status: wsStatus } = useMonitoringSocket({
    onPatrolLocationUpdated: (patrolPing) => {
      setLastFleetUpdate(new Date().toLocaleTimeString());

      // 1. Move marker & update assignment latest_location in real-time
      setAssignments((prev) =>
        prev.map((a) =>
          Number(a.id) === Number(patrolPing.assignment_id)
            ? {
                ...a,
                latest_location: {
                  id: patrolPing.id || Date.now(),
                  location: {
                    type: 'Point',
                    coordinates: [patrolPing.longitude, patrolPing.latitude],
                  },
                  timestamp: patrolPing.recorded_at || new Date().toISOString(),
                },
              }
            : a
        )
      );

      // 2. If actively tracking this unit, extend breadcrumb trail immediately
      if (selectedTrackId && Number(selectedTrackId) === Number(patrolPing.assignment_id)) {
        setTrackLocations((prev) => [
          ...prev,
          {
            id: patrolPing.id || Date.now(),
            location: {
              type: 'Point',
              coordinates: [patrolPing.longitude, patrolPing.latitude],
            },
            timestamp: patrolPing.recorded_at || new Date().toISOString(),
          },
        ]);
      }
    },
  });

  // Background REST polling fallback (10s sync)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAssignments();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAssignments]);

  const handleTrackPatrol = async (id) => {
    if (selectedTrackId === id) {
      setSelectedTrackId(null);
      setTrackLocations([]);
      return;
    }

    setSelectedTrackId(id);
    const targetAssignment = assignments.find((a) => a.id === id);
    if (targetAssignment?.latest_location?.location?.coordinates) {
      const coords = targetAssignment.latest_location.location.coordinates;
      setMapCenter([coords[1], coords[0]]);
    }

    try {
      const res = await api.get(`/api/patrol/assignments/${id}/locations/`);
      setTrackLocations(res.data || []);
      if (addToast) {
        addToast(`Live GPS tracking activated for Patrol Unit P-${String(id).padStart(3, '0')}`, 'info');
      }
    } catch (err) {
      console.error('Failed to load GPS trail:', err);
      setTrackLocations([]);
    }
  };

  // Focus map on specific unit
  const handleFocusUnit = (assignment) => {
    const coords = assignment.latest_location?.location?.coordinates || assignment.destination?.coordinates;
    if (coords && coords.length === 2) {
      setMapCenter([coords[1], coords[0]]);
    }
  };

  // Real GPS Ping Transmission
  const handleSimulatePing = async (assignmentId) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // Use current latest GPS position or destination coordinates as anchor
    const curGps = assignment.latest_location?.location?.coordinates;
    const baseCoords = curGps || assignment.destination?.coordinates || [AHMEDABAD_CENTER[1], AHMEDABAD_CENTER[0]];
    const baseLng = baseCoords[0];
    const baseLat = baseCoords[1];

    // Realistic ~300-500m movement offset
    const jitter = () => (Math.random() - 0.5) * 0.007;
    const lat = parseFloat((baseLat + jitter()).toFixed(6));
    const lng = parseFloat((baseLng + jitter()).toFixed(6));

    setPingLoading((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      const res = await api.post(`/api/patrol/assignments/${assignmentId}/ping/`, { lat, lng });

      // Update local tracking trail if currently tracked
      if (selectedTrackId === assignmentId) {
        setTrackLocations((prev) => [...prev, res.data]);
      }

      // Re-fetch assignments to sync state and update last fleet update timestamp
      fetchAssignments();

      if (addToast) {
        addToast(`GPS Ping transmitted for P-${String(assignmentId).padStart(3, '0')} at ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
      }
    } catch (err) {
      if (addToast) {
        addToast(`Failed to transmit GPS ping: ${extractErrorMessage(err, 'Server error')}`, 'error');
      }
    } finally {
      setPingLoading((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  const [formData, setFormData] = useState({
    officer: '',
    zone_name: 'Ahmedabad Central',
    priority: initialIncident?.severity || 'MEDIUM',
    instructions: 'Proceed to target coordinates, assess situation, and secure perimeter.',
  });
  const [destination, setDestination] = useState(null);
  const [mapCenter, setMapCenter] = useState(AHMEDABAD_CENTER);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [incRes, assRes, hotRes] = await Promise.all([
          api.get('/api/crimes/incidents/'),
          api.get('/api/patrol/assignments/'),
          api.get('/api/intelligence/risk-scores/').catch(() => ({ data: [] })),
        ]);
        const incList = incRes.data || [];
        setIncidents(incList);
        setHotspots(hotRes.data || []);
        setAssignments(assRes.data || []);



        let patrolOfficers = [];
        try {
          const offRes = await api.get('/api/auth/station-patrols/');
          if (Array.isArray(offRes.data) && offRes.data.length > 0) {
            patrolOfficers = offRes.data;
          }
        } catch (e) {
          console.warn('Station patrols query error:', e);
        }

        if (patrolOfficers.length === 0) {
          try {
            const allUsersRes = await api.get('/api/auth/users/');
            if (Array.isArray(allUsersRes.data)) {
              patrolOfficers = allUsersRes.data
                .filter((u) => u.role === 'PATROL' || u.role === 'PATROL_OFFICER' || u.role === 'POLICE_OFFICER' || u.role === 'STATION')
                .map((u) => ({
                  id: u.id,
                  username: u.username,
                  badge_number: u.badge_number,
                  is_busy: false,
                }));
            }
          } catch (err2) {
            console.warn('Fallback users query error:', err2);
          }
        }

        setOfficers(patrolOfficers);
        if (patrolOfficers.length > 0) {
          const firstAvailable = patrolOfficers.find((o) => !o.is_busy) || patrolOfficers[0];
          setFormData((prev) => ({ ...prev, officer: String(firstAvailable.id) }));
        }
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load dispatch console data.'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [initialIncident]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'officer' && value) {
      setRecommendations(null);
    }
  };

  const handleIncidentChange = (e) => {
    const id = e.target.value;
    setSelectedIncidentId(id);
    setRecommendations(null);
    const inc = incidents.find((i) => String(i.id) === String(id));
    if (inc) {
      const coords = inc.location?.coordinates || inc.location_input?.coordinates;
      if (coords && coords.length === 2) {
        setMapCenter([coords[1], coords[0]]);
        setDestination({ lat: coords[1], lng: coords[0] });
      }
      if (inc.severity) {
        setFormData((prev) => ({ ...prev, priority: inc.severity }));
      }
    }
  };

  const handleRecommend = async () => {
    if (!selectedIncidentId) return;
    setRecommendLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.get(`/api/gis/recommend-patrol/?incident_id=${selectedIncidentId}`);
      setRecommendations(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to calculate proximity recommendations.'));
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleHotspotSelect = async (zoneId) => {
    setSelectedHotspotId(zoneId);
    if (!zoneId) return;
    setHotspotRecommendLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/patrol/recommend-for-hotspot/?zone_id=${zoneId}`);
      const data = res.data;
      const target = data.target_hotspot;
      if (target && target.lat && target.lng) {
        setDestination({ lat: target.lat, lng: target.lng });
        setMapCenter([target.lat, target.lng]);
        setFormData((prev) => ({
          ...prev,
          zone_name: target.zone_name,
          priority: target.risk_level || 'HIGH',
          instructions: `[AI PREDICTIVE DISPATCH] Patrol high-risk hotspot "${target.zone_name}" (Risk Score: ${target.risk_score}). Proactive visibility patrol.`,
          officer: data.recommended_officer ? String(data.recommended_officer.officer_id) : prev.officer,
        }));
        if (data.recommended_officer && addToast) {
          addToast(`AI Recommended unit ${data.recommended_officer.officer_name.toUpperCase()} for ${target.zone_name} (${data.recommended_officer.distance_km} km away)`, 'info');
        }
      }
    } catch (err) {
      if (addToast) addToast('Failed to fetch hotspot patrol recommendations', 'error');
    } finally {
      setHotspotRecommendLoading(false);
    }
  };


  const handleOptimizeRoute = async () => {
    setRouteLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (formData.officer) params.append('officer_id', formData.officer);
      params.append('max_waypoints', String(maxWaypoints));
      if (priorityOnly) params.append('priority_only', 'true');

      const res = await api.get(`/api/patrol/optimize-route/?${params.toString()}`);
      setOptimizedRoute(res.data);
      if (res.data.waypoints && res.data.waypoints.length > 0) {
        const firstWp = res.data.waypoints[0];
        setMapCenter([firstWp.lat, firstWp.lng]);
        if (addToast) {
          addToast(`Generated optimized route: ${res.data.waypoints_count} waypoints (${res.data.total_distance_km} km)`, 'success');
        }
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to calculate optimized patrol route.'));
    } finally {
      setRouteLoading(false);
    }
  };

  const handleClearRoute = () => {
    setOptimizedRoute(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    if (!selectedIncidentId) {
      setError('Please select a Target Incident.');
      setSubmitLoading(false);
      return;
    }

    if (!formData.officer) {
      setError('Please select a Patrol Officer / Unit.');
      setSubmitLoading(false);
      return;
    }

    if (!destination) {
      setError('Please select or pin a destination on the tactical map.');
      setSubmitLoading(false);
      return;
    }

    const payload = {
      incident: parseInt(selectedIncidentId),
      officer: parseInt(formData.officer),
      zone_name: formData.zone_name || 'Ahmedabad Sector',
      priority: formData.priority || 'MEDIUM',
      instructions: formData.instructions || 'Standard tactical patrol deployment.',
      destination: {
        type: 'Point',
        coordinates: [parseFloat(destination.lng), parseFloat(destination.lat)],
      },
    };

    try {
      await api.post('/api/patrol/assignments/', payload);
      setSuccess('Patrol unit successfully dispatched to target coordinates.');
      if (addToast) {
        addToast('Patrol unit successfully dispatched.', 'success');
      }
      fetchAssignments();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to dispatch patrol unit.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedIncidentAssignments = assignments.filter(
    (a) => String(a.incident_details?.id || a.incident) === String(selectedIncidentId)
  );
  const selectedIncident = incidents.find((i) => String(i.id) === String(selectedIncidentId));

  // Active units & fleet metrics
  const activeAssignments = useMemo(
    () => assignments.filter((a) => ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(a.status)),
    [assignments]
  );

  const liveCount = useMemo(
    () => activeAssignments.filter((a) => getGpsHealth(a.latest_location?.timestamp).status === 'LIVE').length,
    [activeAssignments]
  );

  const staleCount = useMemo(
    () => activeAssignments.filter((a) => getGpsHealth(a.latest_location?.timestamp).status === 'STALE').length,
    [activeAssignments]
  );

  const offlineCount = useMemo(
    () => activeAssignments.filter((a) => getGpsHealth(a.latest_location?.timestamp).status === 'OFFLINE').length,
    [activeAssignments]
  );

  const isWsConnected = wsStatus === 'CONNECTED';
  const trackedAssignment = assignments.find((a) => a.id === selectedTrackId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* =========================================================================
          TIER 1: PAGE HEADER WITH LIVE TELEMETRY STATUS PILL
          ========================================================================= */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-header__title">Patrol Fleet Dispatch Console</h1>
          <p className="page-header__subtitle">
            Real-time GIS dispatch, live telemetry tracking, and multi-stop patrol route optimization
          </p>
        </div>

        {/* Top Header Live Telemetry Pill */}
        <div
          data-testid="monitoring-connection-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: '#FFFFFF',
            border: `1px solid ${isWsConnected ? '#2A6B65' : '#D97A26'}`,
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.4px',
            color: isWsConnected ? '#2A6B65' : '#D97A26',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isWsConnected ? '#2A6B65' : '#D97A26',
              boxShadow: `0 0 8px ${isWsConnected ? '#2A6B65' : '#D97A26'}`,
              display: 'inline-block',
            }}
          />
          <span>LIVE TELEMETRY • {isWsConnected ? 'WS CONNECTED' : 'POLLING FALLBACK'}</span>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert--success" role="status">
          <CheckIcon size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* =========================================================================
          TIER 2: TOP OPERATIONS AREA (TACTICAL MAP + DISPATCH CONFIGURATION)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        {/* Left: Map Destination Selector & Fleet GIS Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '470px', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--palette-chalk)',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.6px',
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CompassIcon size={14} style={{ color: 'var(--palette-coastal-blue)' }} />
              <span>Tactical Map — Target & Live Fleet</span>
            </div>
            {selectedTrackId && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  color: '#2A6B65',
                  backgroundColor: 'rgba(42, 107, 101, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '3px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2A6B65' }} />
                TRACKING P-{String(selectedTrackId).padStart(3, '0')} ({trackLocations.length} PTS)
              </span>
            )}
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <CyberMap
              center={mapCenter}
              zoom={13}
              destination={destination}
              onLocationSelect={(coords) => setDestination(coords)}
              recommendations={recommendations}
              onSelectRecommendation={(patrolId) => {
                setFormData((prev) => ({ ...prev, officer: String(patrolId) }));
                setRecommendations(null);
              }}
              selectedIncident={selectedIncident}
              optimizedRoute={optimizedRoute}
              activePatrols={activeAssignments}
              selectedTrackId={selectedTrackId}
              trackLocations={trackLocations}
              onTrackPatrol={handleTrackPatrol}
              autoFit={true}
            />
          </div>

          <div
            style={{
              padding: '7px 12px',
              backgroundColor: 'var(--palette-chalk)',
              borderTop: '1px solid var(--color-border)',
              fontSize: '10.5px',
              color: 'var(--color-text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>
              Target Destination:{' '}
              {destination ? (
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                </strong>
              ) : (
                <span style={{ color: 'var(--color-high)' }}>Click on map to pin target coordinates</span>
              )}
            </span>
            <span>
              Live Units on Map: <strong style={{ color: '#2A6B65' }}>{activeAssignments.length}</strong>
            </span>
          </div>
        </div>

        {/* Right: Dispatch Configuration Card */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DispatchIcon size={15} style={{ color: 'var(--palette-coastal-blue)' }} />
              Dispatch Configuration
            </h3>
            {selectedIncident && (
              <span className={`badge badge--${selectedIncident.severity === 'CRITICAL' ? 'critical' : selectedIncident.severity === 'HIGH' ? 'high' : 'operational'}`}>
                {selectedIncident.severity}
              </span>
            )}
          </div>

          {/* AI Predictive Hotspot Fast-Dispatch */}
          {hotspots.length > 0 && (
            <div style={{ padding: '8px 10px', backgroundColor: 'rgba(40, 85, 112, 0.08)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-operational-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--palette-coastal-blue)', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-mono)' }}>
                  ⚡ AI PREDICTIVE HOTSPOT DISPATCH
                </span>
                {hotspotRecommendLoading && (
                  <span style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Optimizing...</span>
                )}
              </div>
              <select
                className="form-input"
                style={{ fontSize: '11.5px', padding: '4px 8px', height: '30px' }}
                value={selectedHotspotId}
                onChange={(e) => handleHotspotSelect(e.target.value)}
              >
                <option value="">-- Deploy to Predicted High-Risk Zone --</option>
                {hotspots.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.zone_name} [{h.risk_level || 'RISK'}: {h.score?.toFixed(0)}] — {h.factors?.seven_day_trend_pct || ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Incident Selector with Proximity Recommendation */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" htmlFor="incident_select" style={{ margin: 0 }}>
                Target Incident
              </label>

              <button
                type="button"
                onClick={handleRecommend}
                disabled={recommendLoading || !selectedIncidentId}
                className="btn btn-secondary btn-xs"
                style={{ fontSize: '10.5px', padding: '2px 8px', gap: '4px' }}
                title="Calculate nearest available patrol units"
              >
                <CompassIcon size={11} />
                <span>{recommendLoading ? 'Analyzing Proximity...' : 'Recommend Nearest Unit'}</span>
              </button>
            </div>
            <select
              id="incident_select"
              className="form-input"
              value={selectedIncidentId}
              onChange={handleIncidentChange}
              required
            >
              <option value="">-- Select Target Incident --</option>
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  #{inc.id} — {inc.title} [{inc.severity}] ({inc.status})
                </option>
              ))}
            </select>
          </div>

          {/* Proximity Recommendations Deck */}
          {recommendations && (
            <div style={{ padding: '10px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--palette-coastal-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                GIS Proximity Recommendations:
              </div>
              {recommendations.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>No units within range.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recommendations.map((r) => (
                    <div
                      key={r.patrol_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {r.officer_name.toUpperCase()} {r.badge_number && `[${r.badge_number}]`}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {r.station} • {(r.distance_meters / 1000).toFixed(2)} km away
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, officer: String(r.patrol_id) }));
                          setRecommendations(null);
                        }}
                        className="btn btn-primary btn-xs"
                      >
                        Assign Unit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dispatch Submission Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="officer_select" style={{ marginBottom: '4px' }}>
                Patrol Officer / Unit
              </label>
              {officers.length > 0 ? (
                <select
                  id="officer_select"
                  name="officer"
                  className="form-input"
                  value={formData.officer}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select Patrol Unit --</option>
                  {officers.map((o) => {
                    const label = `${o.badge_number ? `[${o.badge_number}] ` : ''}${o.username.toUpperCase()}`;
                    return (
                      <option key={o.id} value={o.id} disabled={o.is_busy}>
                        {label} {o.is_busy ? '(BUSY)' : '(AVAILABLE)'}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div style={{ color: 'var(--color-critical)', fontSize: '11.5px' }}>
                  No available patrol units found in directory.
                </div>
              )}
            </div>

            <div className="form-row" style={{ margin: 0, gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="zone_name" style={{ marginBottom: '4px' }}>
                  Sector / Zone
                </label>
                <input
                  id="zone_name"
                  name="zone_name"
                  value={formData.zone_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="e.g. Navrangpura"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="patrol_priority" style={{ marginBottom: '4px' }}>
                  Priority Level
                </label>
                <select
                  id="patrol_priority"
                  name="priority"
                  className="form-input"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="instructions" style={{ marginBottom: '4px' }}>
                Tactical Instructions
              </label>
              <textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                className="form-input"
                rows={2}
                required
                placeholder="Provide tactical notes and dispatch instructions..."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={submitLoading || !selectedIncidentId || !destination || !formData.officer}
              style={{ marginTop: '4px', height: '36px', fontWeight: '700' }}
            >
              {submitLoading ? 'Dispatching Unit...' : 'Dispatch Patrol Unit'}
            </button>
          </form>
        </div>
      </div>

      {/* =========================================================================
          TIER 3: LIVE PATROL FLEET MONITOR & MASTER LEDGER (PROMINENT SECTION)
          ========================================================================= */}
      <div
        className="card"
        style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
        data-testid="live-patrol-fleet-monitor-card"
      >
        {/* Fleet Monitor Card Header */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--palette-chalk)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RadioWaveIcon size={17} style={{ color: '#2A6B65' }} />
              <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: 'var(--color-text-primary)', letterSpacing: '0.4px' }}>
                LIVE PATROL FLEET MONITOR
              </h2>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '3px',
                  backgroundColor: isWsConnected ? 'rgba(42, 107, 101, 0.15)' : 'rgba(217, 122, 38, 0.15)',
                  color: isWsConnected ? '#2A6B65' : '#D97A26',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ● {isWsConnected ? 'WEBSOCKET STREAM ACTIVE' : 'POLLING SYNC ACTIVE'}
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
              Real-time GPS telemetry, unit status and patrol movement
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={fetchAssignments}
              className="btn btn-secondary btn-sm"
              style={{ height: '30px', fontSize: '11px', gap: '4px' }}
              title="Force sync active patrol fleet"
            >
              <CompassIcon size={12} />
              <span>Sync Fleet</span>
            </button>
          </div>
        </div>

        {/* Compact Operational Telemetry HUD Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            padding: '12px 18px',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {/* Telemetry Status */}
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '9.5px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Telemetry
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: isWsConnected ? '#2A6B65' : '#D97A26', marginTop: '2px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isWsConnected ? '#2A6B65' : '#D97A26' }} />
              {isWsConnected ? 'CONNECTED' : 'POLLING'}
            </div>
          </div>

          {/* Active Units */}
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '9.5px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Units
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {activeAssignments.length} <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>deployed</span>
            </div>
          </div>

          {/* Live Units */}
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#2A6B65', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live (&lt;5 min)
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#2A6B65', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {liveCount}
            </div>
          </div>

          {/* Stale Units */}
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#D97A26', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Stale (&gt;5 min)
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#D97A26', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {staleCount}
            </div>
          </div>

          {/* Offline / Pending */}
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#A35139', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Offline / No GPS
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#A35139', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {offlineCount}
            </div>
          </div>

          {/* Last Fleet Update */}
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '9.5px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Last Fleet Update
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--palette-charcoal-slate)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {lastFleetUpdate}
            </div>
          </div>
        </div>

        {/* Active Track Highlight Banner (When a unit is tracked) */}
        {selectedTrackId && trackedAssignment && (
          <div
            style={{
              padding: '10px 18px',
              backgroundColor: 'rgba(42, 107, 101, 0.08)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '800',
                  color: '#2A6B65',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2A6B65' }} />
                LIVE ROUTE — P-{String(selectedTrackId).padStart(3, '0')} ({trackedAssignment.officer_username})
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                • {trackLocations.length} GPS Pings Recorded
              </span>
              {trackedAssignment.latest_location?.location?.coordinates && (
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  • Current: {trackedAssignment.latest_location.location.coordinates[1].toFixed(5)},{' '}
                  {trackedAssignment.latest_location.location.coordinates[0].toFixed(5)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSimulatePing(selectedTrackId)}
                disabled={pingLoading[selectedTrackId]}
                className="btn btn-xs btn-sage"
                style={{ fontSize: '11px' }}
                title="Send GPS coordinate ping to move unit and extend trail"
              >
                <RadioWaveIcon size={11} />
                <span>{pingLoading[selectedTrackId] ? 'Transmitting Ping...' : 'Transmit GPS Ping'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTrackPatrol(selectedTrackId)}
                className="btn btn-xs btn-danger"
                style={{ fontSize: '11px' }}
              >
                Stop Tracking
              </button>
            </div>
          </div>
        )}

        {/* Master Patrol Assignments Ledger Table */}
        <div style={{ padding: 0 }}>
          <div
            style={{
              padding: '10px 18px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-text-primary)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Master Patrol Assignments Ledger ({assignments.length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Click any unit row to focus tactical map
            </span>
          </div>

          {loading ? (
            <div className="loading-spinner" style={{ padding: '30px', textAlign: 'center' }}>
              Loading live patrol telemetry...
            </div>
          ) : assignments.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}>
              <div className="empty-state__icon">
                <DispatchIcon size={28} />
              </div>
              <div className="empty-state__title">No active patrol assignments</div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Dispatch a patrol unit using the form above to initialize real-time fleet monitoring.
              </p>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--palette-chalk)' }}>
                  <tr>
                    <th style={{ width: '75px' }}>Unit</th>
                    <th>Officer</th>
                    <th>Assignment</th>
                    <th>Station / Sector</th>
                    <th>Status</th>
                    <th>Live GPS Position</th>
                    <th>Last Ping</th>
                    <th>Health</th>
                    <th>Tracking</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => {
                    const isTracking = selectedTrackId === a.id;
                    const gpsCoords = a.latest_location?.location?.coordinates;
                    const hasGPS = gpsCoords && gpsCoords.length === 2;
                    const lastPingTimestamp = a.latest_location?.timestamp;
                    const health = getGpsHealth(lastPingTimestamp);

                    return (
                      <tr
                        key={a.id}
                        onClick={() => handleFocusUnit(a)}
                        style={{
                          backgroundColor: isTracking ? 'rgba(42, 107, 101, 0.08)' : undefined,
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        title="Click to focus tactical map on this unit"
                      >
                        {/* 1. Unit ID */}
                        <td>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: '800',
                              fontSize: '11.5px',
                              color: isTracking ? '#2A6B65' : 'var(--color-text-primary)',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: isTracking ? 'rgba(42, 107, 101, 0.15)' : 'var(--palette-chalk)',
                              border: '1px solid var(--color-border)',
                              display: 'inline-block',
                            }}
                          >
                            P-{String(a.id).padStart(3, '0')}
                          </span>
                        </td>

                        {/* 2. Officer */}
                        <td style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {a.officer_username || `Officer #${a.officer}`}
                        </td>

                        {/* 3. Assignment / Incident */}
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            #{a.id}: {a.incident_details?.title || (a.incident ? `Incident #${a.incident}` : 'Routine Patrol')}
                          </div>
                          {a.instructions && (
                            <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.instructions}
                            </div>
                          )}
                        </td>

                        {/* 4. Station / Sector */}
                        <td style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                          <div>{a.station_name || 'Navrangpura Base'}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {a.zone_name || 'Central'}
                          </div>
                        </td>

                        {/* 5. Status */}
                        <td>
                          <span className={`badge badge--${a.status === 'ARRIVED' ? 'operational' : a.status === 'EN_ROUTE' ? 'high' : 'operational'}`}>
                            {a.status}
                          </span>
                        </td>

                        {/* 6. Live GPS Position */}
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          {hasGPS ? (
                            <span style={{ color: health.color, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <LocationPinIcon size={12} />
                              {gpsCoords[1].toFixed(5)}, {gpsCoords[0].toFixed(5)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>NO GPS PING</span>
                          )}
                        </td>

                        {/* 7. Last Ping */}
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          {lastPingTimestamp ? (
                            <div>
                              <strong style={{ color: 'var(--color-text-primary)' }}>{health.timeAgo}</strong>
                              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                {new Date(lastPingTimestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* 8. GPS Health Badge */}
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: health.bg,
                              color: health.color,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: health.color,
                                display: 'inline-block',
                              }}
                            />
                            {health.label}
                          </span>
                        </td>

                        {/* 9. Tracking Action */}
                        <td>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackPatrol(a.id);
                            }}
                            className={`btn btn-xs ${isTracking ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ fontSize: '10.5px', fontWeight: '800', padding: '3px 9px', gap: '4px' }}
                            title={isTracking ? 'Stop tracking this unit' : 'Track live GPS movements and breadcrumb trail'}
                          >
                            <CompassIcon size={11} />
                            <span>{isTracking ? 'TRACKING' : 'TRACK'}</span>
                          </button>
                        </td>

                        {/* 10. Actions (Transmit GPS Ping) */}
                        <td>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSimulatePing(a.id);
                            }}
                            disabled={pingLoading[a.id]}
                            className="btn btn-xs btn-sage"
                            style={{ fontSize: '10.5px', padding: '3px 8px', gap: '4px' }}
                            title="Send realistic GPS location ping to update unit coordinates"
                          >
                            <RadioWaveIcon size={11} />
                            <span>{pingLoading[a.id] ? '…' : 'GPS Ping'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          TIER 4: PATROL ROUTE OPTIMIZATION (MULTI-STOP AI ROUTE GENERATOR)
          ========================================================================= */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }} data-testid="patrol-route-optimizer-card">
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--palette-chalk)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CompassIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Patrol Route Optimization
              </h3>
              <span className="badge badge--operational" style={{ fontSize: '10px' }}>
                AI MULTI-STOP ROUTE
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', margin: '3px 0 0 0' }}>
              Generate an ordered multi-stop patrol route connecting active sector incidents and high-risk hotspots.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="route_max_wp" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                Max Stops:
              </label>
              <select
                id="route_max_wp"
                className="form-input"
                style={{ width: '88px', height: '32px', fontSize: '11.5px', padding: '0 8px' }}
                value={maxWaypoints}
                onChange={(e) => setMaxWaypoints(Number(e.target.value))}
              >
                <option value={3}>3 Stops</option>
                <option value={5}>5 Stops</option>
                <option value={8}>8 Stops</option>
                <option value={12}>12 Stops</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '600', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={priorityOnly}
                onChange={(e) => setPriorityOnly(e.target.checked)}
                style={{ accentColor: 'var(--palette-coastal-blue)' }}
              />
              High/Critical Only
            </label>

            {optimizedRoute && (
              <button
                type="button"
                onClick={handleClearRoute}
                className="btn btn-secondary btn-sm"
                style={{ height: '32px', fontSize: '11.5px' }}
              >
                Clear Route
              </button>
            )}

            <button
              type="button"
              onClick={handleOptimizeRoute}
              disabled={routeLoading}
              className="btn btn-primary btn-sm"
              style={{ height: '32px', fontSize: '11.5px', fontWeight: '700', gap: '6px' }}
              data-testid="generate-route-btn"
            >
              <ZapIcon size={12} />
              <span>{routeLoading ? 'Optimizing...' : optimizedRoute ? 'Recalculate Route' : 'Generate Optimized Route'}</span>
            </button>
          </div>
        </div>

        {/* Route Metrics Summary & Itinerary Table */}
        {optimizedRoute ? (
          <div>
            {/* Top Metrics Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
              }}
              data-testid="route-metrics-summary"
            >
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Route Distance
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--palette-coastal-blue)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {optimizedRoute.total_distance_km} <span style={{ fontSize: '12px' }}>km</span>
                </div>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Est. Travel & Assessment Time
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--palette-charcoal-slate)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  ~{optimizedRoute.estimated_time_minutes} <span style={{ fontSize: '12px' }}>min</span>
                </div>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Optimal Waypoint Stops
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#2A6B65', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {optimizedRoute.waypoints_count} <span style={{ fontSize: '12px' }}>stops</span>
                </div>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Target Patrol Unit
                </div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-primary)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {optimizedRoute.officer?.username?.toUpperCase() || 'UNIT READY'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {optimizedRoute.officer?.start_location?.label || 'Sector Base'}
                </div>
              </div>
            </div>

            {/* Waypoint Itinerary Table */}
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Stop-By-Stop Waypoint Sequence
              </div>
              {optimizedRoute.waypoints && optimizedRoute.waypoints.length > 0 ? (
                <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Stop #</th>
                        <th>Incident</th>
                        <th>Severity</th>
                        <th>Coordinates</th>
                        <th>Leg Distance</th>
                        <th>Est. Arrival</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimizedRoute.waypoints.map((wp) => (
                        <tr key={`route-row-${wp.sequence}-${wp.incident_id}`}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--palette-coastal-blue)',
                                color: '#FFFFFF',
                                fontWeight: '800',
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono)',
                                textAlign: 'center',
                                lineHeight: '24px',
                              }}
                            >
                              {wp.sequence}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            #{wp.incident_id} — {wp.title}
                          </td>
                          <td>
                            <span className={`badge badge--${wp.severity === 'CRITICAL' ? 'critical' : wp.severity === 'HIGH' ? 'high' : 'operational'}`}>
                              {wp.severity}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                            {wp.leg_distance_km} km
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--palette-coastal-blue)', fontWeight: '700' }}>
                            +{wp.est_arrival_minutes} min
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIncidentId(String(wp.incident_id));
                                setMapCenter([wp.lat, wp.lng]);
                                setDestination({ lat: wp.lat, lng: wp.lng });
                              }}
                              className="btn btn-secondary btn-xs"
                              style={{ fontSize: '10.5px' }}
                            >
                              Focus Destination
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '14px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                  {optimizedRoute.message || 'No waypoint stops required.'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <span>Click &ldquo;Generate Optimized Route&rdquo; to compute the most efficient multi-stop patrol path for the selected officer.</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          TIER 5: SELECTED INCIDENT CONTEXT (COLLAPSIBLE / CONTEXTUAL)
          ========================================================================= */}
      {selectedIncident && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--palette-chalk)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                {selectedIncident.title}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '1px', fontFamily: 'var(--font-mono)' }}>
                INCIDENT #{selectedIncident.id} | STATUS: {selectedIncident.status}
              </div>
            </div>
            <span className={`badge badge--${selectedIncident.severity === 'CRITICAL' ? 'critical' : selectedIncident.severity === 'HIGH' ? 'high' : 'operational'}`}>
              {selectedIncident.severity}
            </span>
          </div>

          <div style={{ padding: '10px 14px', fontSize: '11.5px', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', lineHeight: 1.45 }}>
            {selectedIncident.description}
          </div>

          <div style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Assigned Patrol Units for this Incident
            </div>
            {selectedIncidentAssignments.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>No units currently assigned to this incident.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assignment ID</th>
                    <th>Officer</th>
                    <th>Destination GPS</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIncidentAssignments.map((a) => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>#{a.id}</td>
                      <td>{a.officer_username}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {a.destination?.coordinates
                          ? `${a.destination.coordinates[1].toFixed(4)}, ${a.destination.coordinates[0].toFixed(4)}`
                          : '—'}
                      </td>
                      <td>
                        <span className="badge badge--high">{a.status}</span>
                      </td>
                      <td style={{ color: 'var(--color-high)', fontWeight: '700' }}>{a.priority}</td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.instructions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
