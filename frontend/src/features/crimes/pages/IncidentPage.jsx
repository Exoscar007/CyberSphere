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

  const filtered = incidents.filter((i) =>
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.description?.toLowerCase().includes(search.toLowerCase()) ||
    i.severity?.toLowerCase().includes(search.toLowerCase())
  );

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
          <button style={{ background: 'var(--color-primary)', border: 'none', color: '#fff', padding: '2px 8px', fontSize: '10px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>NEW INCIDENT</button>
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
                  
                  return (
                    <tr key={incident.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>{displayId}</td>
                      <td style={{ padding: '10px 12px', color: color, fontWeight: 'bold' }}>{incident.severity}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{incident.title.toUpperCase()}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>NAVRANGPURA</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{timeStr}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-warning)' }}>UNASSIGNED</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '2px 8px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>VIEW</button>
                        <button onClick={() => navigate('/station/firs')} style={{ background: 'transparent', border: '1px solid var(--color-primary-light)', color: 'var(--color-primary-light)', padding: '2px 8px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>CREATE FIR</button>
                        <button onClick={() => navigate('/station/dispatch')} style={{ background: 'var(--color-info)', border: 'none', color: '#fff', padding: '2px 8px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>DISPATCH</button>
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
      
    </div>
  );
}
