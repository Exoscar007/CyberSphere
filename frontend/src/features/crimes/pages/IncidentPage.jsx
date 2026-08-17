import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

function getSeverityBadgeClass(severity) {
  if (severity === 'CRITICAL') return 'badge--critical';
  if (severity === 'HIGH') return 'badge--high';
  if (severity === 'MEDIUM') return 'badge--medium';
  return 'badge--low';
}

export default function IncidentPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [showNewModal, setShowNewModal] = useState(false);
  const [newIncident, setNewIncident] = useState({ title: '', description: '', severity: 'HIGH', lat: 23.0225, lng: 72.5714 });
  const [creating, setCreating] = useState(false);

  const profile = JSON.parse(localStorage.getItem('user') || '{}');
  const stationName = (profile.station_name || profile.username?.replace('station_', '') || 'LOCAL JURISDICTION').toUpperCase();

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/crimes/incidents/');
      // Sort by severity (critical first) then date
      const sorted = res.data.sort((a, b) => {
        const sevWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
      });
      setIncidents(sorted);
    } catch {
      setError('Unable to load incidents. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  const filtered = incidents.filter((i) => {
    // Only show active operational incidents (OPEN or active)
    if (i.status === 'RESOLVED' || i.status === 'CANCELLED') return false;
    
    return i.title?.toLowerCase().includes(search.toLowerCase()) ||
           i.description?.toLowerCase().includes(search.toLowerCase()) ||
           i.severity?.toLowerCase().includes(search.toLowerCase());
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
          type: "Point",
          coordinates: [parseFloat(newIncident.lng), parseFloat(newIncident.lat)]
        }
      };
      await api.post('/api/crimes/incidents/', payload);
      setShowNewModal(false);
      setNewIncident({ title: '', description: '', severity: 'HIGH', lat: 23.0225, lng: 72.5714 });
      fetchIncidents();
    } catch (err) {
      console.error("Failed to create incident:", err);
      alert("Failed to create incident. Check required fields.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 'bold' }}>STATION INCIDENT & COMPLAINT QUEUE</span>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '10px' }}>[{stationName}]</span>
        </div>
        {error && <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="search-bar" style={{ width: '220px' }}>
            <span className="search-bar__icon">🔍</span>
            <input 
              placeholder="Search Incidents..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <button onClick={() => setShowNewModal(true)} className="btn btn--primary btn--sm">
            + NEW INCIDENT
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {loading ? (
            <div className="loading-spinner">LOADING INCIDENT QUEUE...</div>
          ) : (
            <table className="data-table" style={{ fontFamily: 'var(--font-family-mono)' }}>
              <thead style={{ backgroundColor: '#0d1320', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '8px 12px' }}>INCIDENT ID</th>
                  <th style={{ padding: '8px 12px' }}>PRIORITY</th>
                  <th style={{ padding: '8px 12px' }}>TYPE / TITLE</th>
                  <th style={{ padding: '8px 12px' }}>LOCATION</th>
                  <th style={{ padding: '8px 12px' }}>TIME</th>
                  <th style={{ padding: '8px 12px' }}>STATUS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((incident, idx) => {
                  const timeStr = incident.date_occurred ? new Date(incident.date_occurred).toLocaleString([], {month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit'}) : 'UNKNOWN';
                  // Presentation-only ID label for table display (real incident.id remains untouched below)
                  const displayId = `INC-${String(incident.id).padStart(4, '0')}`;
                  
                  // Calculate Assignment Status
                  let assignmentStatus = 'UNASSIGNED';
                  let badgeClass = 'badge--warning';
                  
                  if (incident.patrol_assignments && incident.patrol_assignments.length > 0) {
                    const statuses = incident.patrol_assignments.map(a => a.status);
                    
                    if (statuses.includes('ARRIVED')) {
                      assignmentStatus = 'ARRIVED';
                      badgeClass = 'badge--danger';
                    } else if (statuses.includes('EN_ROUTE')) {
                      assignmentStatus = 'EN_ROUTE';
                      badgeClass = 'badge--low';
                    } else if (statuses.includes('ACKNOWLEDGED')) {
                      assignmentStatus = 'ACKNOWLEDGED';
                      badgeClass = 'badge--info';
                    } else if (statuses.includes('ASSIGNED')) {
                      assignmentStatus = 'ASSIGNED';
                      badgeClass = 'badge--success';
                    } else if (statuses.every(s => s === 'COMPLETED')) {
                      assignmentStatus = 'COMPLETED';
                      badgeClass = 'badge--medium';
                    } else if (statuses.every(s => s === 'CANCELLED')) {
                      assignmentStatus = 'CANCELLED';
                      badgeClass = 'badge--medium';
                    }
                  }

                  return (
                    <tr key={incident.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--color-primary-light)', fontWeight: '700' }}>{displayId}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`badge ${getSeverityBadgeClass(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>{incident.title.toUpperCase()}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{stationName}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{timeStr}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`badge ${badgeClass}`}>● {assignmentStatus}</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {/* Real incident.id used for VIEW navigation */}
                          <button onClick={() => navigate('/station/history/' + incident.id)} className="btn btn--ghost btn--sm">VIEW</button>
                          <button onClick={() => navigate('/station/firs')} className="btn btn--secondary btn--sm">CREATE FIR</button>
                          {/* Real incident object (with real incident.id) passed in route state */}
                          <button onClick={() => navigate('/station/dispatch', { state: { incident } })} className="btn btn--primary btn--sm">DISPATCH</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>NO INCIDENTS IN QUEUE</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* NEW INCIDENT MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#0D121F', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', width: '420px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: '13px', color: 'white', fontFamily: 'var(--font-family-mono)', letterSpacing: '1px', fontWeight: 'bold' }}>CREATE NEW INCIDENT</h3>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">TITLE / TYPE</label>
                <input 
                  value={newIncident.title} 
                  onChange={e => setNewIncident({...newIncident, title: e.target.value})} 
                  placeholder="Enter incident title..."
                  className="form-input"
                  style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }} 
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">DESCRIPTION</label>
                <textarea 
                  value={newIncident.description} 
                  onChange={e => setNewIncident({...newIncident, description: e.target.value})} 
                  placeholder="Enter detailed description..."
                  className="form-input"
                  rows="3"
                  style={{ fontFamily: 'var(--font-family-mono)' }} 
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SEVERITY</label>
                <select 
                  value={newIncident.severity} 
                  onChange={e => setNewIncident({...newIncident, severity: e.target.value})} 
                  className="form-input"
                  style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }}>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">LATITUDE</label>
                  <input type="number" step="0.0001" value={newIncident.lat} onChange={e => setNewIncident({...newIncident, lat: e.target.value})} className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">LONGITUDE</label>
                  <input type="number" step="0.0001" value={newIncident.lng} onChange={e => setNewIncident({...newIncident, lng: e.target.value})} className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }} />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
              <button onClick={() => setShowNewModal(false)} className="btn btn--secondary btn--sm">CANCEL</button>
              <button onClick={handleCreateIncident} disabled={creating} className="btn btn--primary btn--sm">
                {creating ? 'CREATING...' : 'CREATE INCIDENT'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

