import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../../services/api';
import CyberMap from '../../../components/map/CyberMap';
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

export default function PatrolPage() {
  const location = useLocation();
  const initialIncident = location.state?.incident || null;

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncident?.id || '');
  const [assignments, setAssignments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const [formData, setFormData] = useState({
    officer: '',
    zone_name: '',
    priority: 'MEDIUM',
    instructions: '',
  });
  const [destination, setDestination] = useState(null);
  const [mapCenter, setMapCenter] = useState(AHMEDABAD_CENTER);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const incRes = await api.get('/api/crimes/incidents/');
        setIncidents(incRes.data);

        if (initialIncident && initialIncident.location_input) {
          const coords = initialIncident.location_input.coordinates;
          if (coords) {
            setMapCenter([coords[1], coords[0]]);
          }
        }

        const assRes = await api.get('/api/patrol/assignments/');
        setAssignments(assRes.data);

        try {
          const offRes = await api.get('/api/auth/station-patrols/');
          setOfficers(offRes.data);
        } catch (e) {
          console.warn('Could not fetch station patrols.', e);
        }
      } catch (err) {
        setError('Failed to load dispatch data. Please ensure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [initialIncident]);

  const fetchAssignments = async () => {
    try {
      const assRes = await api.get('/api/patrol/assignments/');
      setAssignments(assRes.data);
    } catch {}
  };

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
    if (inc && inc.location_input && inc.location_input.coordinates) {
      const coords = inc.location_input.coordinates;
      setMapCenter([coords[1], coords[0]]);
      setDestination(null);
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
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to get recommendations.');
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    if (!selectedIncidentId) {
      setError('Please select an Incident first.');
      setSubmitLoading(false);
      return;
    }

    if (!destination) {
      setError('Please select a destination on the map.');
      setSubmitLoading(false);
      return;
    }

    try {
      await api.post('/api/patrol/assignments/', {
        incident: parseInt(selectedIncidentId),
        officer: parseInt(formData.officer),
        zone_name: formData.zone_name,
        priority: formData.priority,
        instructions: formData.instructions,
        destination: { type: 'Point', coordinates: [destination.lng, destination.lat] },
      });
      setFormData({ officer: '', zone_name: '', priority: 'MEDIUM', instructions: '' });
      setDestination(null);
      setSuccess('Patrol unit successfully dispatched to target coordinates.');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to dispatch patrol.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedIncidentAssignments = assignments.filter(
    (a) => String(a.incident_details?.id) === String(selectedIncidentId)
  );
  const selectedIncident = incidents.find((i) => String(i.id) === String(selectedIncidentId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Patrol Fleet Dispatch Console</h1>
          <p className="page-header__subtitle">Select target incident, review optimal units, and dispatch patrol units with real GIS routing</p>
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

      {/* Main Two-Column Dispatch Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        {/* Left: Map Destination Selector */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '440px', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--palette-chalk)',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.6px',
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <CompassIcon size={13} />
            Tactical Map — Target Destination Selector
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <CyberMap
              key={mapCenter.join(',')}
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
              autoFit={true}
            />
          </div>
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--palette-chalk)',
              borderTop: '1px solid var(--color-border)',
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <LocationPinIcon size={12} />
            {destination
              ? `PINNED TARGET: ${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`
              : 'CLICK MAP TO PIN PATROL DISPATCH DESTINATION'}
          </div>
        </div>

        {/* Right: Dispatch Configuration Form */}
        <div className="card" style={{ height: '440px', overflowY: 'auto', padding: 'var(--space-md) var(--space-lg)' }}>
          <div className="card-header">
            <span className="card-title">
              <DispatchIcon size={15} />
              Dispatch Configuration
            </span>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" htmlFor="target_inc_select" style={{ margin: 0 }}>Target Incident</label>
              {selectedIncidentId && (
                <button
                  type="button"
                  onClick={handleRecommend}
                  disabled={recommendLoading}
                  className="btn btn-secondary btn-sm"
                >
                  <ZapIcon size={11} />
                  <span>{recommendLoading ? 'Analyzing...' : 'Recommend Patrol'}</span>
                </button>
              )}
            </div>
            <select
              id="target_inc_select"
              className="form-input"
              value={selectedIncidentId}
              onChange={handleIncidentChange}
            >
              <option value="">-- Select Incident --</option>
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  #{inc.id} - {inc.title} ({inc.severity})
                </option>
              ))}
            </select>
          </div>

          {/* AI / GIS Proximity Recommendations */}
          {recommendations && (
            <div
              style={{
                marginBottom: 'var(--space-md)',
                padding: '10px 12px',
                backgroundColor: 'var(--palette-chalk)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--palette-sage)', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ZapIcon size={12} />
                Proximity-Ranked Units (GIS)
              </div>
              {recommendations.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>No available nearby patrols found in radius.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {recommendations.map((r) => (
                    <div
                      key={r.patrol_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--color-surface)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-2xs)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {r.officer_name.toUpperCase()} {r.badge_number && `[${r.badge_number}]`}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {r.station} • {(r.distance_meters / 1000).toFixed(2)} km away
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, officer: String(r.patrol_id) }));
                          setRecommendations(null);
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        Assign Unit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="officer_select">Patrol Officer / Unit</label>
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
                <div style={{ color: 'var(--color-critical)', fontSize: '11px' }}>
                  No available patrol officers found in this station.
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="zone_name">Zone Name</label>
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
              <div className="form-group">
                <label className="form-label" htmlFor="patrol_priority">Priority</label>
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

            <div className="form-group">
              <label className="form-label" htmlFor="instructions">Tactical Instructions</label>
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
              disabled={submitLoading || !selectedIncidentId || !destination}
              style={{ marginTop: '4px' }}
            >
              {submitLoading ? 'Dispatching Unit...' : 'Dispatch Patrol Unit'}
            </button>
          </form>
        </div>
      </div>

      {/* Selected Incident Information & Active Deployments */}
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
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '1px', fontFamily: 'var(--font-mono)' }}>
                INCIDENT #{selectedIncident.id} | STATUS: {selectedIncident.status}
              </div>
            </div>
            <span className={`badge badge--${selectedIncident.severity === 'CRITICAL' ? 'critical' : selectedIncident.severity === 'HIGH' ? 'high' : 'operational'}`}>
              {selectedIncident.severity}
            </span>
          </div>

          <div style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', lineHeight: 1.45 }}>
            {selectedIncident.description}
          </div>

          <div style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
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

      {/* All Station Patrol Assignments */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--palette-chalk)' }}>
          <span className="card-title">
            <RadioWaveIcon size={14} />
            Master Patrol Assignments Ledger ({assignments.length})
          </span>
        </div>
        {loading ? (
          <div className="loading-spinner">Loading patrol assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <DispatchIcon size={24} />
            </div>
            <div className="empty-state__title">No active patrol assignments</div>
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th>Assignment ID</th>
                  <th>Officer</th>
                  <th>Incident</th>
                  <th>Sector Zone</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Dispatched</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>#{a.id}</td>
                    <td>{a.officer_username || `Officer #${a.officer}`}</td>
                    <td>
                      {a.incident_details?.title
                        ? `${a.incident_details.title.substring(0, 24)}...`
                        : `Inc #${a.incident}`}
                    </td>
                    <td>{a.zone_name}</td>
                    <td>
                      <span className={`badge badge--${a.priority === 'CRITICAL' ? 'critical' : a.priority === 'HIGH' ? 'high' : 'operational'}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge--high">{a.status}</span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {a.start_time ? new Date(a.start_time).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
