import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import CyberMap from '../../../components/map/CyberMap';

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

function useDashboardData(endpoint, qs) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.get(`${endpoint}${qs}`, { signal: controller.signal })
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(err => {
        if (err.name !== 'CanceledError' && err.message !== 'canceled' && err.code !== 'ERR_CANCELED') {
          setError(err.message || 'Failed to fetch');
        }
      })
      .finally(() => {
        setLoading(false);
      });
      
    return () => controller.abort();
  }, [endpoint, qs]);

  return { data, loading, error };
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('7d');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
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

  const params = new URLSearchParams();
  if (timeFilter !== 'all') params.append('time_filter', timeFilter);
  if (severityFilter) params.append('severity', severityFilter);
  if (statusFilter) params.append('status', statusFilter);
  if (stationFilter) params.append('station_id', stationFilter);
  if (timeFilter === 'custom') {
    if (customStart) params.append('start_date', customStart);
    if (customEnd) params.append('end_date', customEnd);
  }
  const qs = params.toString() ? `?${params.toString()}` : '';

  const { data: stats, loading: statsLoading, error: statsError } = useDashboardData('/api/dashboard/summary/', qs);
  const { data: zonesData } = useDashboardData('/api/gis/heatmap/', qs);
  const { data: rawIncidents, loading: incidentsLoading } = useDashboardData('/api/crimes/incidents/', qs ? qs + '&light=true' : '?light=true');
  const { data: patrolsData, loading: patrolsLoading } = useDashboardData('/api/patrol/assignments/', qs);
  const { data: workloadData, loading: workloadLoading } = useDashboardData('/api/dashboard/workload/', qs);
  const { data: distData, loading: distLoading } = useDashboardData('/api/dashboard/distribution/', qs);
  const { data: trendsData, loading: trendsLoading } = useDashboardData('/api/dashboard/trends/', qs);
  const { data: responseTimesData, loading: responseTimesLoading } = useDashboardData('/api/reports/response-times/', qs);

  const incidents = React.useMemo(() => {
    if (!rawIncidents) return [];
    return [...rawIncidents].sort((a, b) => {
      const sevWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
    });
  }, [rawIncidents]);
  
  const workload = workloadData || [];
  const distribution = distData || [];
  const trends = trendsData || [];
  const responseTimes = responseTimesData || null;
  const zones = zonesData || [];
  const error = statsError;

  // Derived stats
  const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL');
  
  const riskCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  zones.forEach(z => {
    riskCounts[getRiskLabel(z.score)]++;
  });

  const activePatrols = (patrolsData || []).filter(p => ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(p.status));
  const isValidCoord = (c) => c && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && c[0] !== 0 && c[1] !== 0 && c[1] >= -90 && c[1] <= 90 && c[0] >= -180 && c[0] <= 180;



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)' }}>
      {error && <div className="alert alert--error" style={{ padding: '4px', margin: 0 }}>{error}</div>}

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px 12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', marginRight: '16px' }}>COMMAND FILTERS</span>
        
        <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid var(--color-border)', paddingRight: '16px', flexWrap: 'wrap' }}>
          {[
            { id: '1h', label: 'LAST 1 HOUR' },
            { id: '24h', label: 'LAST 24 HOURS' },
            { id: '7d', label: 'LAST 7 DAYS' },
            { id: '30d', label: 'LAST 30 DAYS' },
            { id: 'month', label: 'CURRENT MONTH' },
            { id: 'custom', label: 'CUSTOM RANGE' },
            { id: 'all', label: 'ALL TIME' }
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

          <select 
            value={stationFilter} 
            onChange={e => setStationFilter(e.target.value)}
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '4px 8px', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}
          >
            <option value="">ALL STATIONS</option>
            {workload.map(w => <option key={w.station_id} value={w.station_id}>{w.station_name}</option>)}
          </select>
          
          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>CUSTOM:</span>
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
      </div>

      {/* KPI CARDS STRIP */}
      {statsLoading ? (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', height: '45px', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>LOADING COMMAND KPIs...</span>
        </div>
      ) : stats && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          {[
            { label: 'TOTAL INCIDENTS', value: stats.total_incidents },
            { label: 'OPEN INCIDENTS', value: stats.open_incidents, color: 'var(--color-warning)' },
            { label: 'CRITICAL', value: stats.critical_incidents, color: 'var(--color-danger)' },
            { label: 'ACTIVE ASSIGNMENTS', value: stats.active_assignments, color: 'var(--color-primary-light)' },
            { label: 'AVAILABLE PATROLS', value: stats.available_patrols, color: 'var(--color-success)' },
            { label: 'BUSY PATROLS', value: stats.busy_patrols, color: 'var(--color-warning)' },
            { label: 'COMPLETED ASSIGNMENTS', value: stats.completed_assignments },
            { label: 'EVIDENCE COLLECTED', value: stats.evidence_collected }
          ].map((kpi, idx) => (
            <div key={idx} style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)', whiteSpace: 'nowrap' }}>{kpi.label}</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: kpi.color || 'var(--color-text)', fontFamily: 'var(--font-family-mono)' }}>{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

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
            <CyberMap
              center={AHMEDABAD_CENTER}
              zoom={12}
              incidents={incidents}
              activePatrols={activePatrols}
              selectedTrackId={selectedTrackId}
              trackLocations={trackLocations}
              onTrackPatrol={handleTrackPatrol}
              onViewAudit={(id) => navigate('/city/history/' + id)}
              autoFit={true}
            />
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
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>PATROL UNITS</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--color-text-secondary)' }}>{String(activePatrols.length).padStart(2, '0')}</span>
            </div>
            {stats && (
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
                <div style={{ flex: 1, padding: '4px', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                  AVAILABLE: <strong>{stats.available_patrols}</strong>
                </div>
                <div style={{ flex: 1, padding: '4px', textAlign: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
                  BUSY/MISSION: <strong>{stats.busy_patrols}</strong>
                </div>
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {activePatrols.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>NO ACTIVE UNITS FOUND</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}>
                  <tbody>
                    {activePatrols.map((patrol, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '6px 12px', color: 'var(--color-primary-light)' }}>P-{String(patrol.id).padStart(3, '0')}</td>
                        <td style={{ padding: '6px 12px', color: 'var(--color-text)' }}>{patrol.officer_username}</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                          <span style={{ color: 'var(--color-warning)' }}>
                            {patrol.status}
                          </span>
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
      <div style={{ display: 'flex', gap: '8px', height: '160px' }}>
        
        {/* STATION WORKLOAD */}
        <div style={{ flex: 2, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px', overflowY: 'auto' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>STATION WORKLOAD</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '4px' }}>STATION</th>
                <th style={{ padding: '4px' }}>OPEN INCIDENTS</th>
                <th style={{ padding: '4px' }}>ACTIVE / UNASSIGNED</th>
                <th style={{ padding: '4px' }}>ACTIVE ASSIGN</th>
                <th style={{ padding: '4px' }}>PATROLS (BUSY/AVAIL)</th>
              </tr>
            </thead>
            <tbody>
              {workload.map(w => (
                <tr key={w.station_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '4px' }}>{w.station_name}</td>
                  <td style={{ padding: '4px', color: 'var(--color-warning)' }}>{w.open_incidents}</td>
                  <td style={{ padding: '4px' }}>
                    <span style={{ color: 'var(--color-primary-light)' }}>{w.incidents_with_active_patrol}</span> / <span style={{ color: 'var(--color-danger)' }}>{w.unassigned_open_incidents}</span>
                  </td>
                  <td style={{ padding: '4px', color: 'var(--color-primary-light)' }}>{w.active_assignments}</td>
                  <td style={{ padding: '4px' }}>
                    <span style={{ color: 'var(--color-warning)' }}>{w.busy_patrol_officers}</span> / <span style={{ color: 'var(--color-success)' }}>{w.available_patrol_officers}</span>
                  </td>
                </tr>
              ))}
              {workload.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '8px', textAlign: 'center', color: 'var(--color-text-muted)' }}>NO STATION DATA</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* INCIDENT DISTRIBUTION */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px', overflowY: 'auto' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>INCIDENT DISTRIBUTION (BY SEVERITY)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            {distribution.map(d => {
              const color = d.severity === 'CRITICAL' ? 'var(--color-danger)' :
                            d.severity === 'HIGH' ? 'var(--color-warning)' :
                            d.severity === 'MEDIUM' ? 'var(--color-info)' : 'var(--color-success)';
              return (
                <div key={d.severity} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
                  <div style={{ width: '60px', color: 'var(--color-text-secondary)' }}>{d.severity}</div>
                  <div style={{ width: '24px', textAlign: 'right' }}>{d.count}</div>
                  <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-bg)' }}>
                    <div style={{ width: `${d.percentage}%`, height: '100%', backgroundColor: color }}></div>
                  </div>
                  <div style={{ width: '30px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{d.percentage}%</div>
                </div>
              );
            })}
            {distribution.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textAlign: 'center', marginTop: '16px' }}>NO DATA</div>}
          </div>
        </div>

        {/* INCIDENT TREND (24H) */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>INCIDENT TREND (24H)</span>
          </div>
          <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '4px', borderBottom: '1px solid var(--color-border)' }}>
             {trends.map((t, i) => {
                const maxCount = Math.max(1, ...trends.map(x => x.count));
                const h = (t.count / maxCount) * 70; // 70px max height
                return (
                  <div key={i} title={`${t.hour_label} - ${t.count} Incidents`} style={{ flex: 1, backgroundColor: 'var(--color-primary-light)', height: `${Math.max(1, h)}px`, opacity: t.count > 0 ? 1 : 0.2 }}></div>
                );
             })}
             {trends.length === 0 && <div style={{ width: '100%', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '9px' }}>NO DATA</div>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            <span>{trends.length > 0 ? trends[0].hour_label : ''}</span>
            <span>{trends.length > 0 ? trends[trends.length-1].hour_label : ''}</span>
          </div>
        </div>

        {/* RESPONSE TIMES */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '6px', overflowY: 'auto' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>RESPONSE TIMES</div>
          {(!responseTimes || responseTimes.assignments_analyzed === 0) ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textAlign: 'center', marginTop: '16px' }}>NO RESPONSE-TIME DATA AVAILABLE</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontFamily: 'var(--font-family-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>DSP → ENR:</span>
                <span style={{ color: 'var(--color-primary-light)' }}>{Math.round(responseTimes.summary.average_assignment_to_en_route_seconds / 60)} m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>ENR → ARR:</span>
                <span style={{ color: 'var(--color-warning)' }}>{Math.round(responseTimes.summary.average_en_route_to_arrived_seconds / 60)} m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>DSP → ARR:</span>
                <span style={{ color: 'var(--color-danger)' }}>{Math.round(responseTimes.summary.average_assignment_to_arrived_seconds / 60)} m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>ARR → CMP:</span>
                <span style={{ color: 'var(--color-success)' }}>{Math.round(responseTimes.summary.average_arrived_to_completed_seconds / 60)} m</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '4px', paddingTop: '4px', fontSize: '8px', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                {responseTimes.assignments_analyzed} ASSIGNMENTS
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
