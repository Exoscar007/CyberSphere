import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, Marker, useMap } from 'react-leaflet';
import api from '../../../services/api';

const AHMEDABAD_CENTER = [23.0225, 72.5714];

function LocationSelector({ destination, setDestination }) {
  useMapEvents({
    click(e) {
      setDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return destination ? (
    <Marker position={[destination.lat, destination.lng]}>
      <Popup>Dispatch Destination</Popup>
    </Marker>
  ) : null;
}

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

  const isValidCoord = (c) => c && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number';

  const MapUpdater = ({ recommendations, selectedIncident }) => {
    const map = useMap();
    useEffect(() => {
      let bounds = [];
      
      if (recommendations && recommendations.length > 0) {
        recommendations.forEach(r => {
          if (r.lat && r.lng) bounds.push([r.lat, r.lng]);
        });
        if (selectedIncident && selectedIncident.location_input?.coordinates) {
          bounds.push([selectedIncident.location_input.coordinates[1], selectedIncident.location_input.coordinates[0]]);
        }
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }, [recommendations, selectedIncident, map]);
    return null;
  };

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

  const getRiskBadge = (level) => {
    const map = { LOW: 'success', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger' };
    return map[level] || 'neutral';
  };
  
  const getStatusBadge = (status) => {
    const map = { 
      ASSIGNED: 'info', 
      ACKNOWLEDGED: 'info', 
      EN_ROUTE: 'warning', 
      ARRIVED: 'warning', 
      COMPLETED: 'success',
      CANCELLED: 'danger'
    };
    return map[status] || 'neutral';
  };

  const selectedIncidentAssignments = assignments.filter(a => String(a.incident_details?.id) === String(selectedIncidentId));
  const selectedIncident = incidents.find(i => String(i.id) === String(selectedIncidentId));

  return (
    <div style={{ paddingBottom: '20px' }}>
      <div className="page-header">
        <h1 className="page-header__title">Dispatch Patrol</h1>
        <p className="page-header__subtitle">Select an incident and dispatch patrol units</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        
        {/* Map Selection */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '400px', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: '12px', fontWeight: 'bold' }}>
             OPERATIONAL MAP - SELECT DESTINATION
           </div>
           <div style={{ flex: 1, backgroundColor: '#0b101a' }}>
             <MapContainer key={mapCenter.join(',')} center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', backgroundColor: '#0b101a' }}>
               <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
               <MapUpdater recommendations={recommendations} selectedIncident={selectedIncident} />
               {/* Recommended Patrol Markers */}
               {recommendations && recommendations.map(r => (
                 r.lat && r.lng ? (
                   <CircleMarker
                     key={`rec-${r.patrol_id}`}
                     center={[r.lat, r.lng]}
                     radius={6}
                     pathOptions={{ color: '#00c8ff', fillColor: '#00c8ff', fillOpacity: 0.8, weight: 2 }}
                     eventHandlers={{
                       click: () => {
                         setFormData(prev => ({ ...prev, officer: String(r.patrol_id) }));
                         setRecommendations(null);
                       }
                     }}
                   >
                     <Popup>
                       <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
                         <strong style={{ color: '#00c8ff' }}>AVAILABLE PATROL</strong><br/>
                         <strong>Officer:</strong> {r.officer_name.toUpperCase()} {r.badge_number && `[${r.badge_number}]`}<br/>
                         <strong>Distance:</strong> {(r.distance_meters / 1000).toFixed(2)} km<br/>
                         <button style={{ marginTop: '8px', background: 'var(--color-primary)', border: 'none', color: 'white', padding: '4px 8px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
                           CLICK TO SELECT
                         </button>
                       </div>
                     </Popup>
                   </CircleMarker>
                 ) : null
               ))}
               {selectedIncident && selectedIncident.location_input && (
                 <CircleMarker 
                   center={[selectedIncident.location_input.coordinates[1], selectedIncident.location_input.coordinates[0]]} 
                   radius={8} 
                   color="#ff4444" 
                   fillColor="#ff4444" 
                   fillOpacity={0.6}>
                   <Popup>Incident Location: {selectedIncident.title}</Popup>
                 </CircleMarker>
               )}
               <LocationSelector destination={destination} setDestination={setDestination} />
             </MapContainer>
           </div>
           <div style={{ padding: '8px 16px', backgroundColor: 'var(--color-bg-dark)', borderTop: '1px solid var(--color-border)', fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
             {destination ? `SELECTED DESTINATION: ${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}` : 'CLICK ON MAP TO SELECT PATROL DESTINATION'}
           </div>
        </div>

        {/* Assign Form */}
        <div className="card" style={{ height: '400px', overflowY: 'auto' }}>
          <div className="card__title" style={{ marginBottom: 'var(--space-md)' }}>Dispatch Configuration</div>
          
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Target Incident</label>
              {selectedIncidentId && (
                <button type="button" onClick={handleRecommend} disabled={recommendLoading} style={{ background: 'var(--color-primary)', border: 'none', color: '#fff', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)', borderRadius: '2px' }}>
                  {recommendLoading ? 'ANALYZING...' : 'RECOMMEND PATROL'}
                </button>
              )}
            </div>
            <select className="form-input" value={selectedIncidentId} onChange={handleIncidentChange}>
              <option value="">-- Select Incident --</option>
              {incidents.map(inc => (
                <option key={inc.id} value={inc.id}>
                  {inc.title} ({inc.severity})
                </option>
              ))}
            </select>
          </div>

          {recommendations && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(0, 200, 255, 0.05)', border: '1px solid rgba(0, 200, 255, 0.2)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-info)', marginBottom: '8px', letterSpacing: '1px' }}>RECOMMENDED PATROLS</div>
              {recommendations.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No available patrols found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recommendations.map(r => (
                    <div key={r.patrol_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{r.officer_name.toUpperCase()} {r.badge_number && `[${r.badge_number}]`}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{r.station} | {(r.distance_meters / 1000).toFixed(2)} km away</div>
                      </div>
                      <button type="button" onClick={() => {
                        setFormData(prev => ({ ...prev, officer: String(r.patrol_id) }));
                        setRecommendations(null); // hide after selection
                      }} style={{ background: 'var(--color-success)', border: 'none', color: '#fff', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', borderRadius: '2px', fontWeight: 'bold' }}>
                        SELECT
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Patrol Officer / Unit</label>
              {officers.length > 0 ? (
                <select name="officer" className="form-input" value={formData.officer} onChange={handleChange} required>
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
                <div style={{ color: 'var(--color-danger)', fontSize: '12px' }}>
                  No available patrol officers found for this station.
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Zone Name</label>
                <input name="zone_name" value={formData.zone_name} onChange={handleChange}
                  className="form-input" required placeholder="e.g. Navrangpura" />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select name="priority" className="form-input" value={formData.priority} onChange={handleChange}>
                   <option value="LOW">LOW</option>
                   <option value="MEDIUM">MEDIUM</option>
                   <option value="HIGH">HIGH</option>
                   <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="form-group">
               <label className="form-label">Operational Instructions</label>
               <textarea name="instructions" value={formData.instructions} onChange={handleChange}
                 className="form-input" rows="3" required placeholder="Provide clear instructions for the patrol unit..."></textarea>
            </div>

            <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 'var(--space-md)' }} disabled={submitLoading || !selectedIncidentId || !destination}>
              {submitLoading ? 'DISPATCHING...' : 'DISPATCH PATROL'}
            </button>
          </form>
        </div>
      </div>

      {/* Incident Information & Assignments */}
      {selectedIncident && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-xl)' }}>
           <div style={{ padding: 'var(--space-md) var(--space-lg)', backgroundColor: 'var(--color-bg-dark)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedIncident.title.toUpperCase()}</div>
               <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>INCIDENT #{selectedIncident.id} | STATUS: {selectedIncident.status}</div>
             </div>
             <div>
               <span className={`badge badge--${getRiskBadge(selectedIncident.severity)}`}>{selectedIncident.severity}</span>
               {selectedIncident.fir && <span className="badge badge--neutral" style={{ marginLeft: '8px' }}>FIR LINKED</span>}
             </div>
           </div>
           <div style={{ padding: 'var(--space-md) var(--space-lg)', fontSize: '13px', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
             {selectedIncident.description}
           </div>
           
           <div style={{ padding: 'var(--space-md) var(--space-lg)', backgroundColor: 'var(--color-surface)' }}>
             <h4 style={{ margin: '0 0 var(--space-md) 0', fontSize: '12px', fontFamily: 'var(--font-family-mono)' }}>ASSIGNED PATROLS FOR THIS INCIDENT</h4>
             {selectedIncidentAssignments.length === 0 ? (
               <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No patrols currently assigned.</div>
             ) : (
               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
                 <thead>
                   <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                     <th style={{ padding: '8px 4px' }}>ASSIGNMENT ID</th>
                     <th style={{ padding: '8px 4px' }}>OFFICER</th>
                     <th style={{ padding: '8px 4px' }}>DESTINATION (LAT, LNG)</th>
                     <th style={{ padding: '8px 4px' }}>STATUS</th>
                     <th style={{ padding: '8px 4px' }}>PRIORITY</th>
                     <th style={{ padding: '8px 4px' }}>INSTRUCTIONS</th>
                   </tr>
                 </thead>
                 <tbody>
                   {selectedIncidentAssignments.map(a => (
                     <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                       <td style={{ padding: '10px 4px' }}>#{a.id}</td>
                       <td style={{ padding: '10px 4px' }}>{a.officer_username}</td>
                       <td style={{ padding: '10px 4px' }}>
                          {a.destination?.coordinates ? `${a.destination.coordinates[1].toFixed(4)}, ${a.destination.coordinates[0].toFixed(4)}` : 'UNKNOWN'}
                       </td>
                       <td style={{ padding: '10px 4px' }}>
                         <span className={`badge badge--${getStatusBadge(a.status)}`}>{a.status}</span>
                       </td>
                       <td style={{ padding: '10px 4px', color: `var(--color-${getRiskBadge(a.priority)})`, fontWeight: 'bold' }}>{a.priority}</td>
                       <td style={{ padding: '10px 4px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.instructions}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
        </div>
      )}

      {/* Legacy/All Assignments Table (Optional, for station global view) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="card__title">All Station Assignments ({assignments.length})</div>
        </div>
        {loading ? (
          <div className="loading-spinner">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🚔</div>
            <div className="empty-state__title">No patrol assignments</div>
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--color-surface)' }}>
                <tr><th>ID</th><th>Officer</th><th>Incident</th><th>Zone</th><th>Priority</th><th>Status</th><th>Started</th></tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>#{a.id}</td>
                    <td>{a.officer_username || `Officer #${a.officer}`}</td>
                    <td>{a.incident_details?.title ? `${a.incident_details.title.substring(0, 20)}...` : `Inc #${a.incident}`}</td>
                    <td>{a.zone_name}</td>
                    <td><span className={`badge badge--${getRiskBadge(a.priority)}`}>{a.priority}</span></td>
                    <td><span className={`badge badge--${getStatusBadge(a.status)}`}>{a.status}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.start_time ? new Date(a.start_time).toLocaleString() : '—'}</td>
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
