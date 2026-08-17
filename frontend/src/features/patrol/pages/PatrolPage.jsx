import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../../services/api';
import CyberMap from '../../../components/map/CyberMap';

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
    instructions: ''
  });
  const [destination, setDestination] = useState(null);
  const [mapCenter, setMapCenter] = useState(AHMEDABAD_CENTER);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch incidents
        const incRes = await api.get('/api/crimes/incidents/');
        setIncidents(incRes.data);
        
        if (initialIncident && initialIncident.location_input) {
           const coords = initialIncident.location_input.coordinates; // [lng, lat]
           if (coords) {
             setMapCenter([coords[1], coords[0]]);
           }
        }

        // Fetch assignments
        const assRes = await api.get('/api/patrol/assignments/');
        setAssignments(assRes.data);

        // Fetch station patrol officers
        try {
          const offRes = await api.get('/api/auth/station-patrols/');
          setOfficers(offRes.data);
        } catch (e) {
          console.warn("Could not fetch station patrols.", e);
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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'officer' && value) {
      setRecommendations(null);
    }
  };

  const handleIncidentChange = (e) => {
    const id = e.target.value;
    setSelectedIncidentId(id);
    setRecommendations(null);
    const inc = incidents.find(i => String(i.id) === String(id));
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
        destination: { type: 'Point', coordinates: [destination.lng, destination.lat] }
      });
      setFormData({ officer: '', zone_name: '', priority: 'MEDIUM', instructions: '' });
      setDestination(null);
      setSuccess('Patrol dispatched successfully.');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to dispatch patrol.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getRiskBadgeClass = (level) => {
    if (level === 'CRITICAL') return 'badge--critical';
    if (level === 'HIGH') return 'badge--high';
    if (level === 'MEDIUM') return 'badge--medium';
    return 'badge--low';
  };
  
  const getStatusBadgeClass = (status) => {
    if (status === 'COMPLETED') return 'badge--success';
    if (status === 'EN_ROUTE' || status === 'ARRIVED') return 'badge--warning';
    if (status === 'ASSIGNED' || status === 'ACKNOWLEDGED') return 'badge--info';
    if (status === 'CANCELLED') return 'badge--danger';
    return 'badge--medium';
  };

  const selectedIncidentAssignments = assignments.filter(a => String(a.incident_details?.id) === String(selectedIncidentId));
  const selectedIncident = incidents.find(i => String(i.id) === String(selectedIncidentId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontWeight: 'bold' }}>PATROL DISPATCH & TACTICAL OPERATIONS CONSOLE</span>
        {error && <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</span>}
        {success && <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{success}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        
        {/* Map Selection Card */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', height: '420px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: '#0d1320', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-family-mono)', letterSpacing: '1px' }}>
            OPERATIONAL MAP - SELECT DESTINATION
          </div>
          <div style={{ flex: 1, position: 'relative', backgroundColor: '#0b101a' }}>
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
          <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderTop: '1px solid var(--color-border)', fontSize: '10px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
            {destination ? `SELECTED DESTINATION: ${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}` : 'CLICK ON MAP TO SELECT PATROL DESTINATION'}
          </div>
        </div>

        {/* Assign Form Card */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', height: '420px', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'var(--font-family-mono)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>DISPATCH CONFIGURATION</div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>TARGET INCIDENT</label>
              {selectedIncidentId && (
                <button type="button" onClick={handleRecommend} disabled={recommendLoading} className="btn btn--primary btn--sm" style={{ padding: '2px 8px' }}>
                  {recommendLoading ? 'ANALYZING...' : 'RECOMMEND PATROL'}
                </button>
              )}
            </div>
            <select className="form-input" value={selectedIncidentId} onChange={handleIncidentChange} style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }}>
              <option value="">-- Select Incident --</option>
              {incidents.map(inc => (
                <option key={inc.id} value={inc.id}>
                  {inc.title} ({inc.severity})
                </option>
              ))}
            </select>
          </div>

          {recommendations && (
            <div style={{ padding: '10px', backgroundColor: '#0d1320', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-light)', marginBottom: '6px', letterSpacing: '0.5px', fontFamily: 'var(--font-family-mono)' }}>AI RECOMMENDED UNITS</div>
              {recommendations.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>No available patrols found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recommendations.map(r => (
                    <div key={r.patrol_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text)' }}>{r.officer_name.toUpperCase()} {r.badge_number && `[${r.badge_number}]`}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{r.station} | {(r.distance_meters / 1000).toFixed(2)} km away</div>
                      </div>
                      <button type="button" onClick={() => {
                        setFormData(prev => ({ ...prev, officer: String(r.patrol_id) }));
                        setRecommendations(null);
                      }} className="btn btn--secondary btn--sm">
                        SELECT
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">PATROL OFFICER / UNIT</label>
              {officers.length > 0 ? (
                <select name="officer" className="form-input" value={formData.officer} onChange={handleChange} required style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }}>
                  <option value="">-- Select Patrol Unit --</option>
                  {officers.map(o => {
                    const label = `${o.badge_number ? `[${o.badge_number}] ` : ''}${o.username.toUpperCase()}`;
                    return (
                      <option key={o.id} value={o.id} disabled={o.is_busy}>
                        {label} {o.is_busy ? '(BUSY/ON MISSION)' : '(AVAILABLE)'}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div style={{ color: 'var(--color-danger)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
                  No available patrol officers found for this station.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ZONE NAME</label>
                <input name="zone_name" value={formData.zone_name} onChange={handleChange}
                  className="form-input" required placeholder="e.g. Navrangpura" style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">PRIORITY</label>
                <select name="priority" className="form-input" value={formData.priority} onChange={handleChange} style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }}>
                   <option value="LOW">LOW</option>
                   <option value="MEDIUM">MEDIUM</option>
                   <option value="HIGH">HIGH</option>
                   <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
               <label className="form-label">OPERATIONAL INSTRUCTIONS</label>
               <textarea name="instructions" value={formData.instructions} onChange={handleChange}
                 className="form-input" rows="2" required placeholder="Provide clear instructions for the patrol unit..." style={{ fontFamily: 'var(--font-family-mono)' }}></textarea>
            </div>

            <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 'auto', height: '34px' }} disabled={submitLoading || !selectedIncidentId || !destination}>
              {submitLoading ? 'DISPATCHING...' : 'DISPATCH PATROL'}
            </button>
          </form>
        </div>
      </div>

      {/* Incident Information & Assignments Card */}
      {selectedIncident && (
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
           <div style={{ padding: '8px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-family-mono)' }}>
             <div>
               <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text)' }}>{selectedIncident.title.toUpperCase()}</div>
               {/* Real selectedIncident.id displayed */}
               <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>INCIDENT #{selectedIncident.id} | STATUS: {selectedIncident.status}</div>
             </div>
             <div>
               <span className={`badge ${getRiskBadgeClass(selectedIncident.severity)}`}>{selectedIncident.severity}</span>
               {selectedIncident.fir && <span className="badge badge--low" style={{ marginLeft: '8px' }}>FIR LINKED</span>}
             </div>
           </div>
           <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)' }}>
             {selectedIncident.description}
           </div>
           
           <div style={{ padding: '8px 12px' }}>
             <div style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: 'bold', fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary-light)', letterSpacing: '0.5px' }}>ASSIGNED PATROLS FOR THIS INCIDENT</div>
             {selectedIncidentAssignments.length === 0 ? (
               <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>No patrols currently assigned.</div>
             ) : (
               <table className="data-table" style={{ fontFamily: 'var(--font-family-mono)' }}>
                 <thead style={{ backgroundColor: '#0d1320', color: 'var(--color-text-secondary)' }}>
                   <tr>
                     <th style={{ padding: '6px 8px' }}>ASSIGNMENT ID</th>
                     <th style={{ padding: '6px 8px' }}>OFFICER</th>
                     <th style={{ padding: '6px 8px' }}>DESTINATION (LAT, LNG)</th>
                     <th style={{ padding: '6px 8px' }}>STATUS</th>
                     <th style={{ padding: '6px 8px' }}>PRIORITY</th>
                     <th style={{ padding: '6px 8px' }}>INSTRUCTIONS</th>
                   </tr>
                 </thead>
                 <tbody>
                   {selectedIncidentAssignments.map((a, idx) => (
                     <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                       <td style={{ padding: '6px 8px', color: 'var(--color-primary-light)', fontWeight: '700' }}>#{a.id}</td>
                       <td style={{ padding: '6px 8px' }}>{a.officer_username}</td>
                       <td style={{ padding: '6px 8px' }}>
                          {a.destination?.coordinates ? `${a.destination.coordinates[1].toFixed(4)}, ${a.destination.coordinates[0].toFixed(4)}` : 'UNKNOWN'}
                       </td>
                       <td style={{ padding: '6px 8px' }}>
                         <span className={`badge ${getStatusBadgeClass(a.status)}`}>● {a.status}</span>
                       </td>
                       <td style={{ padding: '6px 8px' }}>
                         <span className={`badge ${getRiskBadgeClass(a.priority)}`}>{a.priority}</span>
                       </td>
                       <td style={{ padding: '6px 8px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.instructions}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
        </div>
      )}

      {/* Global Station Assignments Table Card */}
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-family-mono)', letterSpacing: '1px' }}>ALL STATION ASSIGNMENTS ({assignments.length})</span>
        </div>
        {loading ? (
          <div className="loading-spinner">LOADING ASSIGNMENTS...</div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🚔</div>
            <div className="empty-state__title">NO PATROL ASSIGNMENTS</div>
          </div>
        ) : (
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="data-table" style={{ fontFamily: 'var(--font-family-mono)' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#0d1320' }}>
                <tr>
                  <th style={{ padding: '8px 12px' }}>ID</th>
                  <th style={{ padding: '8px 12px' }}>OFFICER</th>
                  <th style={{ padding: '8px 12px' }}>INCIDENT</th>
                  <th style={{ padding: '8px 12px' }}>ZONE</th>
                  <th style={{ padding: '8px 12px' }}>PRIORITY</th>
                  <th style={{ padding: '8px 12px' }}>STATUS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>STARTED</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--color-primary-light)', fontWeight: '700' }}>#{a.id}</td>
                    <td style={{ padding: '8px 12px' }}>{a.officer_username || `Officer #${a.officer}`}</td>
                    <td style={{ padding: '8px 12px' }}>{a.incident_details?.title ? `${a.incident_details.title.substring(0, 22).toUpperCase()}` : `Inc #${a.incident}`}</td>
                    <td style={{ padding: '8px 12px' }}>{a.zone_name}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`badge ${getRiskBadgeClass(a.priority)}`}>{a.priority}</span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`badge ${getStatusBadgeClass(a.status)}`}>● {a.status}</span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{a.start_time ? new Date(a.start_time).toLocaleString() : '—'}</td>
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

