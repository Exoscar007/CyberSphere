import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import CyberMap from '../../../components/map/CyberMap';

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

  const [workload, setWorkload] = useState(null);
  
  const profile = JSON.parse(localStorage.getItem('user') || '{}');
  const stationName = (profile.station_name || profile.username?.replace('station_', '') || 'LOCAL JURISDICTION').toUpperCase();

  const [timeFilter, setTimeFilter] = useState('1h');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

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
        const params = new URLSearchParams();
        if (timeFilter !== 'all') params.append('time_filter', timeFilter);
        if (severityFilter) params.append('severity', severityFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (timeFilter === 'custom') {
          if (customStart) params.append('start_date', customStart);
          if (customEnd) params.append('end_date', customEnd);
        }

        const qs = params.toString() ? `?${params.toString()}` : '';

        const [incRes, firRes, patRes, workRes] = await Promise.allSettled([
          api.get(`/api/crimes/incidents/${qs}`),
          api.get('/api/crimes/fir/'), // FIR might not be filtered by time in this view, keeping it as is
          api.get(`/api/patrol/assignments/${qs}`),
          api.get(`/api/dashboard/workload/${qs}`)
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
        
        if (workRes.status === 'fulfilled') {
          const wl = workRes.value.data;
          if (wl && wl.length > 0) setWorkload(wl[0]); // station user gets array of 1
        }

      } catch (err) {
        setError('Failed to load station jurisdiction data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeFilter, severityFilter, statusFilter, customStart, customEnd]);

  if (loading) return <div className="loading-spinner">ESTABLISHING SECURE CONNECTION TO STATION JURISDICTION...</div>;

  const pendingIncidents = incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  const pendingFirs = firs.filter(f => f.status === 'OPEN');

  const isValidCoord = (c) => c && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && c[0] !== 0 && c[1] !== 0 && c[1] >= -90 && c[1] <= 90 && c[0] >= -180 && c[0] <= 180;



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)' }}>
      {error && <div className="alert alert--error" style={{ padding: '4px', margin: 0 }}>{error}</div>}

      {/* TOP CONTROL BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>STATION: {stationName}</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>JURISDICTION: LOCAL ZONE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--color-success)' }}>● LIVE STATUS</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>LAST SYNC: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* FILTER BAR & WORKLOAD */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'flex-start' }}>
        
        {/* FILTERS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px 12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', marginRight: '16px' }}>COMMAND FILTERS</span>
            
            <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid var(--color-border)', paddingRight: '16px', flexWrap: 'wrap' }}>
              {[
                { id: '1h', label: 'LAST 1 HOUR' },
                { id: '24h', label: 'LAST 24 HOURS' },
                { id: '7d', label: 'LAST 7 DAYS' },
                { id: '30d', label: 'LAST 30 DAYS' },
                { id: 'month', label: 'CURRENT MONTH' },
                { id: 'custom', label: 'CUSTOM RANGE' }
              ].map(tf => (
                <button
                  key={tf.id}
                  onClick={() => setTimeFilter(tf.id)}
                  style={{
                    background: timeFilter === tf.id ? 'var(--color-primary)' : 'transparent',
                    color: timeFilter === tf.id ? 'white' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-family-mono)',
                    cursor: 'pointer'
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                value={severityFilter} 
                onChange={e => setSeverityFilter(e.target.value)}
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '4px 8px', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}
              >
                <option value="">ALL SEVERITIES</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>

              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '4px 8px', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}
              >
                <option value="">ALL STATUSES</option>
                <option value="OPEN">OPEN (INCIDENT)</option>
                <option value="RESOLVED">RESOLVED (INCIDENT)</option>
                <option value="ASSIGNED">ASSIGNED (PATROL)</option>
                <option value="EN_ROUTE">EN_ROUTE (PATROL)</option>
                <option value="COMPLETED">COMPLETED (PATROL)</option>
              </select>
            </div>
          </div>
          
          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>CUSTOM RANGE:</span>
              <input 
                type="date" 
                value={customStart} 
                onChange={e => setCustomStart(e.target.value)}
                style={{ backgroundColor: 'var(--color-bg-dark)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '2px 4px', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}
              />
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>TO</span>
              <input 
                type="date" 
                value={customEnd} 
                onChange={e => setCustomEnd(e.target.value)}
                style={{ backgroundColor: 'var(--color-bg-dark)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '2px 4px', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}
              />
            </div>
          )}
        </div>

        {/* WORKLOAD SUMMARY */}
        {workload && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
            {[
              { label: 'NEW / RECENT', value: workload.open_incidents, color: 'var(--color-danger)' },
              { label: 'OPEN INCIDENTS', value: workload.open_incidents, color: 'var(--color-warning)' },
              { label: 'UNASSIGNED', value: workload.unassigned_open_incidents, color: 'var(--color-primary-light)' },
              { label: 'ACTIVE PATROLS', value: workload.active_assignments, color: 'var(--color-info)' },
              { label: 'COMPLETED TODAY', value: workload.completed_assignments, color: 'var(--color-success)' }
            ].map((kpi, idx) => (
              <div key={idx} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '100px' }}>
                <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)', whiteSpace: 'nowrap' }}>{kpi.label}</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: kpi.color || 'var(--color-text)', fontFamily: 'var(--font-family-mono)' }}>{kpi.value}</span>
              </div>
            ))}
          </div>
        )}
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
            <CyberMap
              center={AHMEDABAD_CENTER}
              zoom={13}
              incidents={incidents}
              activePatrols={patrols}
              selectedTrackId={selectedTrackId}
              trackLocations={trackLocations}
              onTrackPatrol={handleTrackPatrol}
              onViewAudit={(id) => navigate('/station/history/' + id)}
              autoFit={true}
            />
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
              <div style={{ flex: 1, overflowY: 'auto', padding: '0', display: 'flex', flexDirection: 'column' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
                  <tbody>
                    {patrols.filter(p => ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(p.status)).map((patrol, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--color-text)' }}>P-{String(patrol.id).padStart(3, '0')}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <span style={{ color: patrol.status === 'ACTIVE' || patrol.status === 'ASSIGNED' || patrol.status === 'EN_ROUTE' ? 'var(--color-success)' : 'var(--color-info)' }}>● {patrol.status}</span>
                        </td>
                      </tr>
                    ))}
                    {patrols.filter(p => ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(p.status)).length === 0 && <tr><td colSpan="2" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>NO ACTIVE UNITS</td></tr>}
                  </tbody>
                </table>
                <div style={{ marginTop: 'auto', padding: '8px', borderTop: '1px solid var(--color-border)', textAlign: 'center', backgroundColor: 'var(--color-bg-dark)' }}>
                  <button onClick={() => navigate('/station/history')} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-light)', fontSize: '10px', cursor: 'pointer', fontFamily: 'var(--font-family-mono)', fontWeight: 'bold', width: '100%' }}>
                    VIEW PATROL HISTORY &rarr;
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
