import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
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
            <MapContainer center={AHMEDABAD_CENTER} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#0b101a' }}>
              <TileLayer
                attribution=''
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              {/* Fake Station Boundary for visual credibility */}
              <CircleMarker
                 center={AHMEDABAD_CENTER}
                 radius={120}
                 pathOptions={{ color: 'var(--color-border-light)', fillColor: 'transparent', weight: 1, dashArray: '4 4' }}
              />

              {/* Render Incidents */}
              {incidents.map((incident, idx) => {
                const coords = incident.location?.coordinates;
                if (!coords) return null;
                const color = getSeverityColor(incident.severity);
                return (
                  <CircleMarker
                    key={`inc-${idx}`}
                    center={[coords[1], coords[0]]}
                    radius={5}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
                        <strong style={{ color }}>{incident.severity} INCIDENT</strong><br/>
                        {incident.title}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Render Patrols (Simulate slight offset to show them on map) */}
              {patrols.map((patrol, idx) => {
                 const lat = AHMEDABAD_CENTER[0] + (Math.random() * 0.04 - 0.02);
                 const lng = AHMEDABAD_CENTER[1] + (Math.random() * 0.04 - 0.02);
                 return (
                  <CircleMarker
                    key={`patrol-${idx}`}
                    center={[lat, lng]}
                    radius={4}
                    pathOptions={{ color: '#fff', fillColor: 'var(--color-info)', fillOpacity: 1, weight: 1 }}
                  >
                     <Tooltip permanent direction="bottom" className="risk-tooltip" opacity={0.8}>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'var(--font-family-mono)', color: 'var(--color-info)' }}>P-{String(patrol.id).padStart(3, '0')}</span>
                    </Tooltip>
                  </CircleMarker>
                 )
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
