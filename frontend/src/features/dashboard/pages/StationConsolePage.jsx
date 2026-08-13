import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, Polyline } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const AHMEDABAD_CENTER = [23.0395, 72.5571]; // Shifted slightly towards Navrangpura

function getSeverityColor(severity) {
  if (severity === 'CRITICAL') return 'var(--color-danger)';
  if (severity === 'HIGH') return 'var(--color-warning)';
  if (severity === 'MEDIUM') return 'var(--color-info)';
  return 'var(--color-success)';
}

export default function StationConsolePage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [firs, setFirs] = useState([]);
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [trackLocations, setTrackLocations] = useState([]);
  
  const handleTrackPatrol = async (id) => {
    if (selectedTrackId === id) {
      setSelectedTrackId(null);
      setTrackLocations([]);
      return;
    }
    setSelectedTrackId(id);
    try {
      const res = await api.get(`/api/patrol/assignments/${id}/locations/`);
      setTrackLocations(res.data);
    } catch (err) {
      console.error("Failed to load GPS trail:", err);
      setTrackLocations([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [incRes, firRes, patRes] = await Promise.allSettled([
          api.get('/api/crimes/incidents/'),
          api.get('/api/crimes/fir/'),
          api.get('/api/patrol/assignments/')
        ]);
        
        if (incRes.status === 'fulfilled') {
          // Sort by severity (critical first) then date
          const sorted = incRes.value.data.sort((a, b) => {
            const sevWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
          });
          setIncidents(sorted);
        }
        
        if (firRes.status === 'fulfilled') setFirs(firRes.value.data);
        if (patRes.status === 'fulfilled') setPatrols(patRes.value.data);

      } catch (err) {
        setError('Failed to load station jurisdiction data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-spinner">ESTABLISHING SECURE CONNECTION TO STATION JURISDICTION...</div>;

  const pendingIncidents = incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  const pendingFirs = firs.filter(f => f.status === 'OPEN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)' }}>
      {error && <div className="alert alert--error" style={{ padding: '4px', margin: 0 }}>{error}</div>}

      {/* TOP CONTROL BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>STATION: NAVRANGPURA</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>JURISDICTION: WEST ZONE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--color-success)' }}>● LIVE STATUS</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>LAST SYNC: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, gap: '8px', minHeight: 0 }}>
        
        {/* LEFT/CENTER: MAP (60%) */}
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-dark)' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>JURISDICTION OPERATIONAL MAP</span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>LEGEND:</span>
              <span style={{ color: 'var(--color-danger)' }}>● CRITICAL INCIDENT</span>
              <span style={{ color: 'var(--color-info)' }}>● PATROL UNIT</span>
            </div>
          </div>
          
          <div style={{ flex: 1, position: 'relative' }}>
            {(!incidents.length && !patrols.length) ? (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b101a', color: 'var(--color-text-muted)', zIndex: 10, fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}>
                NO ACTIVE OPERATIONAL COORDINATES
              </div>
            ) : null}
            <MapContainer center={AHMEDABAD_CENTER} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#0b101a' }} ref={(map) => {
              if (map && (incidents.length > 0 || patrols.length > 0)) {
                const bounds = [];
                incidents.forEach(i => {
                  if (i.location?.coordinates) bounds.push([i.location.coordinates[1], i.location.coordinates[0]]);
                });
                patrols.forEach(p => {
                  const isActive = ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(p.status);
                  if (!isActive) return;
                  if (p.destination?.coordinates) bounds.push([p.destination.coordinates[1], p.destination.coordinates[0]]);
                  if (p.latest_location?.location?.coordinates) bounds.push([p.latest_location.location.coordinates[1], p.latest_location.location.coordinates[0]]);
                });
                trackLocations.forEach(loc => {
                  if (loc.location?.coordinates) bounds.push([loc.location.coordinates[1], loc.location.coordinates[0]]);
                });
                if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
              }
            }}>
              <TileLayer
                attribution=''
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {selectedTrackId && trackLocations.length > 0 && (
                <Polyline 
                  positions={trackLocations.map(loc => [loc.location.coordinates[1], loc.location.coordinates[0]])} 
                  color="var(--color-success)" 
                  weight={3} 
                  opacity={0.8} 
                  dashArray="5, 10" 
                />
              )}

              {/* Render Incidents */}
              {incidents.map((incident, idx) => {
                const coords = incident.location?.coordinates;
                if (!coords) return null;
                const color = getSeverityColor(incident.severity);
                return (
                  <CircleMarker
                    key={`inc-${idx}`}
                    center={[coords[1], coords[0]]}
                    radius={6}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
                        <strong style={{ color }}>{incident.severity} INCIDENT #{incident.id}</strong><br/>
                        <strong>Title:</strong> {incident.title}<br/>
                        <strong>Status:</strong> {incident.status}<br/>
                        <strong>Assigned Patrols:</strong> {incident.patrol_assignments?.length || 0}<br/>
                        <button onClick={() => navigate('/station/history/' + incident.id)} style={{ marginTop: '8px', background: 'var(--color-primary)', border: 'none', color: 'white', padding: '4px 8px', cursor: 'pointer', width: '100%' }}>VIEW AUDIT</button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Render Patrol Destinations & GPS */}
              {patrols.map((patrol, idx) => {
                const isActive = ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(patrol.status);
                if (!isActive) return null;

                const dest = patrol.destination?.coordinates;
                const gps = patrol.latest_location?.location?.coordinates;
                const isTracking = selectedTrackId === patrol.id;

                return (
                  <React.Fragment key={`patrol-${patrol.id}`}>
                    {/* Destination Marker */}
                    {dest && (
                      <CircleMarker
                        center={[dest[1], dest[0]]}
                        radius={4}
                        pathOptions={{ color: 'var(--color-info)', fillColor: 'var(--color-info)', fillOpacity: 0.3, weight: 2, dashArray: '4' }}
                      >
                        <Popup>
                          <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
                            <strong style={{ color: 'var(--color-info)' }}>ASSIGNMENT #{patrol.id} DESTINATION</strong><br/>
                            <strong>Incident:</strong> #{patrol.incident}<br/>
                            <strong>Officer:</strong> {patrol.officer_username}<br/>
                            <strong>Status:</strong> {patrol.status}<br/>
                            <strong>Priority:</strong> {patrol.priority}<br/>
                            <strong>Instructions:</strong> {patrol.instructions || 'None'}
                          </div>
                        </Popup>
                      </CircleMarker>
                    )}
                    
                    {/* Live GPS Marker */}
                    {gps ? (
                      <CircleMarker
                        center={[gps[1], gps[0]]}
                        radius={5}
                        pathOptions={{ color: 'var(--color-success)', fillColor: 'var(--color-success)', fillOpacity: 1, weight: 2 }}
                      >
                        <Popup>
                          <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
                            <strong style={{ color: 'var(--color-success)' }}>LIVE GPS: P-{String(patrol.id).padStart(3, '0')}</strong><br/>
                            <strong>Officer:</strong> {patrol.officer_username}<br/>
                            <strong>Status:</strong> {patrol.status}<br/>
                            <strong>Last Ping:</strong> {new Date(patrol.latest_location.timestamp).toLocaleTimeString()}<br/>
                            <button onClick={() => handleTrackPatrol(patrol.id)} style={{ marginTop: '8px', background: isTracking ? 'var(--color-danger)' : 'var(--color-success)', border: 'none', color: 'white', padding: '4px 8px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
                              {isTracking ? 'STOP TRACKING' : 'TRACK ROUTE'}
                            </button>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ) : (
                      dest && (
                        <CircleMarker
                          center={[dest[1], dest[0]]}
                          radius={5}
                          pathOptions={{ color: 'var(--color-warning)', fillColor: 'var(--color-warning)', fillOpacity: 1, weight: 2 }}
                        >
                          <Popup>
                            <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
                              <strong style={{ color: 'var(--color-warning)' }}>LIVE GPS: P-{String(patrol.id).padStart(3, '0')}</strong><br/>
                              <strong>Officer:</strong> {patrol.officer_username}<br/>
                              <strong>Status:</strong> WAITING FOR FIRST PING
                            </div>
                          </Popup>
                        </CircleMarker>
                      )
                    )}
                  </React.Fragment>
                );
              })}

            </MapContainer>
          </div>
        </div>

        {/* RIGHT: OPERATIONAL QUEUE (40%) */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
          
          {/* DISPATCH QUEUE */}
          <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', minHeight: 0 }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>DISPATCH QUEUE (INCOMING)</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--color-text-secondary)' }}>{String(pendingIncidents.length).padStart(2, '0')} PENDING</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {pendingIncidents.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>QUEUE EMPTY</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}>
                  <thead style={{ backgroundColor: 'var(--color-bg-dark)', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                    <tr>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>PRIORITY</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>INCIDENT</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>TIME</th>
                      <th style={{ padding: '4px 8px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingIncidents.map((incident, idx) => {
                      const timeStr = incident.date_occurred ? new Date(incident.date_occurred).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'UNKNOWN';
                      const color = getSeverityColor(incident.severity);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '6px 8px', color: color, fontWeight: 'bold' }}>{incident.severity}</td>
                          <td style={{ padding: '6px 8px', color: 'var(--color-text)' }}>{incident.title.substring(0, 20).toUpperCase()}</td>
                          <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>{timeStr}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                            <button onClick={() => navigate('/station/firs')} style={{ background: 'var(--color-primary)', border: 'none', color: '#fff', padding: '2px 6px', fontSize: '9px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>CREATE FIR</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* LOWER SPLIT: FIRs and PATROLS */}
          <div style={{ flex: '1', display: 'flex', gap: '8px', minHeight: 0 }}>
            
            {/* PENDING FIRs */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', minHeight: 0 }}>
              <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>PENDING FIRs</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
                  <tbody>
                    {pendingFirs.map((fir, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--color-primary-light)' }}>{fir.fir_number}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--color-warning)' }}>UNASSIGNED</td>
                      </tr>
                    ))}
                    {pendingFirs.length === 0 && <tr><td style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>NO PENDING FIRS</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PATROL UNITS */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', minHeight: 0 }}>
              <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>PATROL UNITS</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
                  <tbody>
                    {patrols.map((patrol, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--color-text)' }}>P-{String(patrol.id).padStart(3, '0')}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <span style={{ color: patrol.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-info)' }}>● {patrol.status}</span>
                        </td>
                      </tr>
                    ))}
                    {patrols.length === 0 && <tr><td colSpan="2" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>NO ACTIVE UNITS</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
