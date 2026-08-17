import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  PlusIcon,
  SearchIcon,
  XIcon,
  DispatchIcon,
  FileTextIcon,
  EyeIcon,
  AlertCircleIcon,
} from '../../../components/common/Icons';

export default function IncidentPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [showNewModal, setShowNewModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    lat: 23.0225,
    lng: 72.5714,
  });
  const [creating, setCreating] = useState(false);

  const profile = JSON.parse(localStorage.getItem('user') || '{}');
  const stationName = (profile.station_name || profile.username?.replace('station_', '') || 'LOCAL JURISDICTION').toUpperCase();

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/crimes/incidents/');
      const sorted = res.data.sort((a, b) => {
        const sevWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
      });
      setIncidents(sorted);
    } catch {
      setError('Unable to load incidents. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filtered = incidents.filter((i) => {
    if (i.status === 'RESOLVED' || i.status === 'CANCELLED') return false;
    return (
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase()) ||
      i.severity?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleCreateIncident = async () => {
    setCreating(true);
    try {
      const payload = {
        title: newIncident.title,
        description: newIncident.description,
        severity: newIncident.severity,
        date_occurred: new Date().toISOString(),
        location_input: {
          type: 'Point',
          coordinates: [parseFloat(newIncident.lng), parseFloat(newIncident.lat)],
        },
      };
      await api.post('/api/crimes/incidents/', payload);
      setShowNewModal(false);
      setNewIncident({ title: '', description: '', severity: 'HIGH', lat: 23.0225, lng: 72.5714 });
      fetchIncidents();
    } catch (err) {
      console.error('Failed to create incident:', err);
      alert('Failed to create incident. Check required fields.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-md)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Station Incident & Complaint Queue</h1>
          <p className="page-header__subtitle">Real-time incoming complaints, severity classification, and unit dispatch triage</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex' }}>
              <SearchIcon size={13} />
            </span>
            <input
              placeholder="Search active queue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '26px', height: '30px', fontSize: '11px' }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="btn btn-primary"
            style={{ height: '30px' }}
          >
            <PlusIcon size={14} />
            <span>Record Incident</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div
        className="card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="loading-spinner">Loading operational incident queue...</div>
          ) : (
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th>Incident ID</th>
                  <th>Priority</th>
                  <th>Classification / Title</th>
                  <th>Precinct</th>
                  <th>Occurred</th>
                  <th>Assignment</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((incident) => {
                  const timeStr = incident.date_occurred
                    ? new Date(incident.date_occurred).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';
                  const displayId = `INC-${String(incident.id).padStart(4, '0')}`;

                  let assignmentStatus = 'UNASSIGNED';
                  let statusBadge = 'high';

                  if (incident.patrol_assignments && incident.patrol_assignments.length > 0) {
                    const statuses = incident.patrol_assignments.map((a) => a.status);
                    if (statuses.includes('ARRIVED')) {
                      assignmentStatus = 'ARRIVED';
                      statusBadge = 'critical';
                    } else if (statuses.includes('EN_ROUTE')) {
                      assignmentStatus = 'EN_ROUTE';
                      statusBadge = 'high';
                    } else if (statuses.includes('ACKNOWLEDGED')) {
                      assignmentStatus = 'ACKNOWLEDGED';
                      statusBadge = 'operational';
                    } else if (statuses.includes('ASSIGNED')) {
                      assignmentStatus = 'ASSIGNED';
                      statusBadge = 'verified';
                    } else if (statuses.every((s) => s === 'COMPLETED')) {
                      assignmentStatus = 'COMPLETED';
                      statusBadge = 'neutral';
                    }
                  }

                  return (
                    <tr key={incident.id}>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>
                        {displayId}
                      </td>
                      <td>
                        <span className={`badge badge--${incident.severity === 'CRITICAL' ? 'critical' : incident.severity === 'HIGH' ? 'high' : 'operational'}`}>
                          {incident.severity}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: '600', maxWidth: '240px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {incident.title}
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{stationName}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{timeStr}</td>
                      <td>
                        <span className={`badge badge--${statusBadge}`}>{assignmentStatus}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => navigate('/station/history/' + incident.id)}
                            className="btn btn-secondary btn-sm"
                            title="View Incident Audit"
                          >
                            <EyeIcon size={11} />
                            <span>Audit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/station/firs')}
                            className="btn btn-secondary btn-sm"
                            title="Register FIR"
                          >
                            <FileTextIcon size={11} />
                            <span>FIR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/station/dispatch', { state: { incident } })}
                            className="btn btn-primary btn-sm"
                            title="Dispatch Patrol Unit"
                          >
                            <DispatchIcon size={11} />
                            <span>Dispatch</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No active incidents in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* NEW INCIDENT MODAL */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">Record Incident Triage Entry</span>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                aria-label="Close Modal"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new_inc_title">Incident Title / Offense</label>
                <input
                  id="new_inc_title"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="e.g. Commercial burglary alarm triggered"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new_inc_desc">Statement / Narrative</label>
                <textarea
                  id="new_inc_desc"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  className="form-input"
                  rows={3}
                  placeholder="Provide preliminary dispatch notes..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new_inc_sev">Severity Level</label>
                <select
                  id="new_inc_sev"
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                  className="form-input"
                >
                  <option value="CRITICAL">Critical Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="new_inc_lat">Latitude</label>
                  <input
                    id="new_inc_lat"
                    type="number"
                    step="0.0001"
                    value={newIncident.lat}
                    onChange={(e) => setNewIncident({ ...newIncident, lat: e.target.value })}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new_inc_lng">Longitude</label>
                  <input
                    id="new_inc_lng"
                    type="number"
                    step="0.0001"
                    value={newIncident.lng}
                    onChange={(e) => setNewIncident({ ...newIncident, lng: e.target.value })}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'var(--space-md)' }}>
              <button type="button" onClick={() => setShowNewModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleCreateIncident} disabled={creating} className="btn btn-primary">
                {creating ? 'Recording...' : 'File Incident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
