import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

function getSeverityColor(severity) {
  if (severity === 'CRITICAL') return 'var(--color-danger)';
  if (severity === 'HIGH') return 'var(--color-warning)';
  if (severity === 'MEDIUM') return 'var(--color-info)';
  return 'var(--color-success)';
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
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
        <span style={{ fontWeight: 'bold' }}>STATION INCIDENT & COMPLAINT QUEUE</span>
        {error && <span style={{ color: 'var(--color-danger)' }}>{error}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            placeholder="SEARCH INCIDENTS..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '2px 6px', fontSize: '10px', fontFamily: 'var(--font-family-mono)', width: '250px' }}
          />
          <button onClick={() => setShowNewModal(true)} style={{ background: 'var(--color-primary)', border: 'none', color: '#fff', padding: '2px 8px', fontSize: '10px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>NEW INCIDENT</button>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>LOADING QUEUE...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
              <thead style={{ backgroundColor: 'var(--color-bg-dark)', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>INCIDENT ID</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>PRIORITY</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>TYPE / TITLE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>LOCATION</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>TIME</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>STATUS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((incident, idx) => {
                  const timeStr = incident.date_occurred ? new Date(incident.date_occurred).toLocaleString([], {month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit'}) : 'UNKNOWN';
                  const color = getSeverityColor(incident.severity);
                  // Generating a pseudo-ID for display density purposes since we don't have one in model
                  const displayId = `INC-${String(incident.id).padStart(4, '0')}`;
                  
                  // Calculate Assignment Status
                  let assignmentStatus = 'UNASSIGNED';
                  let statusColor = 'var(--color-warning)';
                  
                  if (incident.patrol_assignments && incident.patrol_assignments.length > 0) {
                    const statuses = incident.patrol_assignments.map(a => a.status);
                    
                    if (statuses.includes('ARRIVED')) {
                      assignmentStatus = 'ARRIVED';
                      statusColor = 'var(--color-danger)';
                    } else if (statuses.includes('EN_ROUTE')) {
                      assignmentStatus = 'EN_ROUTE';
                      statusColor = 'var(--color-primary-light)';
                    } else if (statuses.includes('ACKNOWLEDGED')) {
                      assignmentStatus = 'ACKNOWLEDGED';
                      statusColor = 'var(--color-info)';
                    } else if (statuses.includes('ASSIGNED')) {
                      assignmentStatus = 'ASSIGNED';
                      statusColor = 'var(--color-success)';
                    } else if (statuses.every(s => s === 'COMPLETED')) {
                      assignmentStatus = 'COMPLETED';
                      statusColor = 'var(--color-text-muted)';
                    } else if (statuses.every(s => s === 'CANCELLED')) {
                      assignmentStatus = 'CANCELLED';
                      statusColor = 'var(--color-text-muted)';
                    }
                  }

                  return (
                    <tr key={incident.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>{displayId}</td>
                      <td style={{ padding: '10px 12px', color: color, fontWeight: 'bold' }}>{incident.severity}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{incident.title.toUpperCase()}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{stationName}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{timeStr}</td>
                      <td style={{ padding: '10px 12px', color: statusColor, fontWeight: 'bold' }}>{assignmentStatus}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => navigate('/station/history/' + incident.id)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '2px 8px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>VIEW</button>
                        <button onClick={() => navigate('/station/firs')} style={{ background: 'transparent', border: '1px solid var(--color-primary-light)', color: 'var(--color-primary-light)', padding: '2px 8px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>CREATE FIR</button>
                        <button onClick={() => navigate('/station/dispatch', { state: { incident } })} style={{ background: 'var(--color-info)', border: 'none', color: '#fff', padding: '2px 8px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>DISPATCH</button>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', width: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'white' }}>CREATE NEW INCIDENT</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>TITLE / TYPE</label>
                <input 
                  value={newIncident.title} 
                  onChange={e => setNewIncident({...newIncident, title: e.target.value})} 
                  style={{ width: '100%', padding: '6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'white' }} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>DESCRIPTION</label>
                <textarea 
                  value={newIncident.description} 
                  onChange={e => setNewIncident({...newIncident, description: e.target.value})} 
                  style={{ width: '100%', padding: '6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'white', minHeight: '60px' }} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>SEVERITY</label>
                <select 
                  value={newIncident.severity} 
                  onChange={e => setNewIncident({...newIncident, severity: e.target.value})} 
                  style={{ width: '100%', padding: '6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'white' }}>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>LATITUDE</label>
                  <input type="number" step="0.0001" value={newIncident.lat} onChange={e => setNewIncident({...newIncident, lat: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>LONGITUDE</label>
                  <input type="number" step="0.0001" value={newIncident.lng} onChange={e => setNewIncident({...newIncident, lng: e.target.value})} style={{ width: '100%', padding: '6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'white' }} />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '6px 16px', cursor: 'pointer' }}>CANCEL</button>
              <button onClick={handleCreateIncident} disabled={creating} style={{ background: 'var(--color-primary)', border: 'none', color: 'white', padding: '6px 16px', cursor: 'pointer', opacity: creating ? 0.5 : 1 }}>
                {creating ? 'CREATING...' : 'CREATE INCIDENT'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
