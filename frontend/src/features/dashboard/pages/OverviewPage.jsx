import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import api from '../../../services/api';

const AHMEDABAD_CENTER = [23.0225, 72.5714];

function getRiskColor(score) {
  if (score >= 75) return 'var(--color-danger)';
  if (score >= 50) return 'var(--color-warning)';
  if (score >= 25) return 'var(--color-info)';
  return 'var(--color-success)';
}

function getRiskLabel(score) {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function getSeverityColor(severity) {
  if (severity === 'CRITICAL') return 'var(--color-danger)';
  if (severity === 'HIGH') return 'var(--color-warning)';
  if (severity === 'MEDIUM') return 'var(--color-info)';
  return 'var(--color-success)';
}

export default function OverviewPage() {
  const [stats, setStats] = useState(null);
  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, zonesRes, incidentsRes, patrolsRes] = await Promise.allSettled([
          api.get('/api/dashboard/summary/'),
          api.get('/api/gis/heatmap/'),
          api.get('/api/crimes/incidents/'),
          api.get('/api/patrol/assignments/')
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (zonesRes.status === 'fulfilled') setZones(zonesRes.value.data);
        
        if (incidentsRes.status === 'fulfilled') {
          // Sort by severity (critical first) then date
          const sorted = incidentsRes.value.data.sort((a, b) => {
            const sevWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
          });
          setIncidents(sorted);
        }
        
        if (patrolsRes.status === 'fulfilled') {
          setPatrols(patrolsRes.value.data);
        }
      } catch (err) {
        setError('Failed to load command data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-spinner">INITIALIZING COMMAND INTERFACE...</div>;
  }

  // Derived stats
  const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL');
  
  const riskCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  zones.forEach(z => {
    riskCounts[getRiskLabel(z.score)]++;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)' }}>
      {error && <div className="alert alert--error" style={{ padding: '4px', margin: 0 }}>{error}</div>}

      {/* TOP CONTROL BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>● LIVE</span>
          <span style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }}>LAST 1 HOUR</span>
          <span style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }}>24 HOURS</span>
          <span style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }}>7 DAYS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <select style={{ background: 'transparent', color: 'var(--color-text)', border: 'none', outline: 'none', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
            <option>ALL ZONES ▼</option>
          </select>
          <select style={{ background: 'transparent', color: 'var(--color-text)', border: 'none', outline: 'none', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
            <option>ALL INCIDENT TYPES ▼</option>
          </select>
          <select style={{ background: 'transparent', color: 'var(--color-text)', border: 'none', outline: 'none', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
            <option>ALL PRIORITIES ▼</option>
          </select>
          <button style={{ background: 'var(--color-border)', color: 'var(--color-text)', border: 'none', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}>REFRESH</button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, gap: '8px', minHeight: 0 }}>
        
        {/* LEFT/CENTER: MAP (65%) */}
        <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-dark)' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>GIS OPERATIONAL MAP — AHMEDABAD</span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>INCIDENT SEVERITY:</span>
              <span style={{ color: 'var(--color-danger)' }}>● CRITICAL</span>
              <span style={{ color: 'var(--color-warning)' }}>● HIGH</span>
              <span style={{ color: 'var(--color-info)' }}>● MEDIUM</span>
              <span style={{ color: 'var(--color-success)' }}>● LOW</span>
            </div>
          </div>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <MapContainer center={AHMEDABAD_CENTER} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#0b101a' }}>
              <TileLayer
                attribution=''
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              {/* Render Risk Zones */}
              {zones.map((zone, idx) => {
                const coords = zone.center?.coordinates || [72.57, 23.02];
                const color = getRiskColor(zone.score);
                return (
                  <CircleMarker
                    key={`zone-${idx}`}
                    center={[coords[1], coords[0]]}
                    radius={Math.max(10, zone.score / 4)}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 1 }}
                  >
                    <Tooltip permanent direction="center" className="risk-tooltip" opacity={0.6}>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'var(--font-family-mono)' }}>{zone.score?.toFixed(0)}</span>
                    </Tooltip>
                  </CircleMarker>
                );
              })}

              {/* Render Incidents */}
              {incidents.map((incident, idx) => {
                const coords = incident.location?.coordinates;
                if (!coords) return null;
                const color = getSeverityColor(incident.severity);
                return (
                  <CircleMarker
                    key={`inc-${idx}`}
                    center={[coords[1], coords[0]]}
                    radius={4}
                    pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 2 }}
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
            </MapContainer>
          </div>
        </div>

        {/* RIGHT: OPERATIONAL PANELS (35%) */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
          
          {/* CRITICAL INCIDENTS */}
          <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', minHeight: 0 }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>CRITICAL INCIDENTS</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--color-text-secondary)' }}>{String(criticalIncidents.length).padStart(2, '0')}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {criticalIncidents.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>NO CRITICAL INCIDENTS</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {criticalIncidents.map((incident, idx) => {
                    const timeStr = incident.date_occurred ? new Date(incident.date_occurred).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'UNKNOWN';
                    return (
                      <div key={idx} style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)', fontWeight: 'bold', marginBottom: '4px' }}>
                          <span>{incident.title.toUpperCase()}</span>
                          <span>{timeStr}</span>
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>
                          {incident.description.substring(0, 60)}...
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE PATROLS */}
          <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', minHeight: 0 }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>ACTIVE PATROL UNITS</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--color-text-secondary)' }}>{String(patrols.length).padStart(2, '0')}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {patrols.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>NO ACTIVE UNITS</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}>
                  <tbody>
                    {patrols.map((patrol, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '6px 12px', color: 'var(--color-primary-light)' }}>P-{String(patrol.id).padStart(3, '0')}</td>
                        <td style={{ padding: '6px 12px', color: 'var(--color-text)' }}>{patrol.zone_name.toUpperCase()}</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                          <span style={{ color: 'var(--color-success)' }}>● ACTIVE</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* RISK STATUS */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>RISK ZONES STATUS</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 16px', gap: '8px', fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>CRITICAL</span>
                <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{String(riskCounts.CRITICAL).padStart(2, '0')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>HIGH</span>
                <span style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>{String(riskCounts.HIGH).padStart(2, '0')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>MEDIUM</span>
                <span style={{ color: 'var(--color-info)', fontWeight: 'bold' }}>{String(riskCounts.MEDIUM).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM INTELLIGENCE STRIP */}
      <div style={{ display: 'flex', gap: '8px', height: '120px' }}>
        
        {/* INCIDENT TREND */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>INCIDENT TREND (24H)</div>
          <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '4px', borderBottom: '1px solid var(--color-border)' }}>
             {/* Mock visual bars for density since we don't have a charting lib handy */}
             {[4, 7, 3, 5, 8, 12, 9, 6, 4, 3, 7, 5, 2, 4, 8, 11, 7, 4, 3, 2, 5, 8, 9, 4].map((h, i) => (
                <div key={i} style={{ flex: 1, backgroundColor: 'var(--color-border-light)', height: `${h * 6}px` }}></div>
             ))}
          </div>
        </div>

        {/* INCIDENT DISTRIBUTION */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>INCIDENT DISTRIBUTION</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
              <div style={{ width: '60px', color: 'var(--color-text-secondary)' }}>THEFT</div>
              <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-bg)' }}><div style={{ width: '70%', height: '100%', backgroundColor: 'var(--color-info)' }}></div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
              <div style={{ width: '60px', color: 'var(--color-text-secondary)' }}>ASSAULT</div>
              <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-bg)' }}><div style={{ width: '40%', height: '100%', backgroundColor: 'var(--color-warning)' }}></div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
              <div style={{ width: '60px', color: 'var(--color-text-secondary)' }}>CYBER</div>
              <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-bg)' }}><div style={{ width: '25%', height: '100%', backgroundColor: 'var(--color-danger)' }}></div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
              <div style={{ width: '60px', color: 'var(--color-text-secondary)' }}>FRAUD</div>
              <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-bg)' }}><div style={{ width: '55%', height: '100%', backgroundColor: 'var(--color-success)' }}></div></div>
            </div>
          </div>
        </div>

        {/* SYSTEM STATUS */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>SYSTEM STATUS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
             <div style={{ color: 'var(--color-text-secondary)' }}>GIS DB</div><div style={{ color: 'var(--color-success)' }}>● ONLINE</div>
             <div style={{ color: 'var(--color-text-secondary)' }}>POSTGIS</div><div style={{ color: 'var(--color-success)' }}>● ONLINE</div>
             <div style={{ color: 'var(--color-text-secondary)' }}>AI ENGINE</div><div style={{ color: 'var(--color-success)' }}>● ONLINE</div>
             <div style={{ color: 'var(--color-text-secondary)' }}>PATROL NET</div><div style={{ color: 'var(--color-success)' }}>● ONLINE</div>
             <div style={{ color: 'var(--color-text-secondary)' }}>API</div><div style={{ color: 'var(--color-success)' }}>● ONLINE</div>
          </div>
        </div>

      </div>

    </div>
  );
}
