import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import api from '../../../services/api';

const AHMEDABAD_CENTER = [23.0225, 72.5714];

function getRiskColor(score) {
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#3b82f6';
  return '#10b981';
}

function getRiskLabel(score) {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}

export default function IntelligenceDashboard() {
  const [trends, setTrends] = useState([]);
  const [riskScores, setRiskScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionMsg, setPredictionMsg] = useState(null);
  const [filterRisk, setFilterRisk] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendsRes, scoresRes] = await Promise.all([
        api.get('/api/intelligence/trends/'),
        api.get('/api/intelligence/risk-scores/'),
      ]);
      setTrends(trendsRes.data);
      setRiskScores(scoresRes.data);
    } catch {
      setError('Unable to load intelligence data. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const runPrediction = async () => {
    setPredicting(true);
    setPredictionMsg(null);
    try {
      const res = await api.post('/api/ai/predict/');
      const jobId = res.data.id;
      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const jobRes = await api.get(`/api/ai/jobs/${jobId}/`);
          if (jobRes.data.status === 'COMPLETED') {
            clearInterval(poll);
            setPredicting(false);
            setPredictionMsg(jobRes.data.details || 'Prediction complete. Risk zones updated.');
            fetchData();
          } else if (jobRes.data.status === 'FAILED' || attempts > 15) {
            clearInterval(poll);
            setPredicting(false);
            setPredictionMsg(jobRes.data.details || 'Prediction failed.');
          }
        } catch {
          clearInterval(poll);
          setPredicting(false);
          setPredictionMsg('Error checking prediction status.');
        }
      }, 2000);
    } catch {
      setPredicting(false);
      setPredictionMsg('Failed to trigger AI prediction.');
    }
  };

  const filteredZones = riskScores.filter((z) => {
    if (filterRisk === 'ALL') return true;
    const label = getRiskLabel(z.score);
    return label === filterRisk;
  });

  if (loading) return <div className="loading-spinner">Loading intelligence data...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-header__title">Crime Intelligence & Analytics</h1>
          <p className="page-header__subtitle">AI-powered risk analysis and geographic intelligence for Ahmedabad</p>
        </div>
        <button className="btn btn--primary" onClick={runPrediction} disabled={predicting}>
          {predicting ? '⏳ Running AI...' : '🤖 Run AI Prediction'}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {predictionMsg && <div className="alert alert--info">{predictionMsg}</div>}

      {/* Risk Score Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
        <div style={{ backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', padding: 'var(--space-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Risk Zones Identified</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{riskScores.length}</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-danger)', borderLeft: '4px solid var(--color-danger)', padding: 'var(--space-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-danger)', marginBottom: '4px' }}>Critical Zones (75+)</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-danger)' }}>{riskScores.filter(z => z.score >= 75).length}</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-warning)', padding: 'var(--space-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>High-Risk Zones</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-warning)' }}>{riskScores.filter(z => z.score >= 50 && z.score < 75).length}</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', padding: 'var(--space-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Crime Trends Tracked</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-success)' }}>{trends.length}</div>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-xl)', alignItems: 'start' }}>
        <div>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Filter:</span>
            {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((level) => (
              <button key={level}
                className={`btn btn--sm ${filterRisk === level ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => setFilterRisk(level)}>
                {level}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="map-container" style={{ height: '500px' }}>
              <MapContainer center={AHMEDABAD_CENTER} zoom={12} style={{ height: '100%', width: '100%', backgroundColor: '#111827' }}>
                <TileLayer
                  attribution='&copy; OSM'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {filteredZones.map((zone, idx) => {
                  const coords = zone.center?.coordinates || [72.57, 23.02];
                  const color = getRiskColor(zone.score);
                  return (
                    <CircleMarker key={idx} center={[coords[1], coords[0]]}
                      radius={Math.max(12, zone.score / 4)}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.4, weight: 1 }}>
                      <Tooltip permanent direction="center" opacity={0.9}>
                        <span style={{ fontSize: '10px', fontWeight: 600 }}>{zone.zone_name.substring(0,3).toUpperCase()}</span>
                      </Tooltip>
                      <Popup>
                        <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
                          <strong>{zone.zone_name.toUpperCase()}</strong><br />
                          SCORE: <strong>{zone.score?.toFixed(1)}</strong><br />
                          LEVEL: <span style={{ color }}>{getRiskLabel(zone.score).toUpperCase()}</span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
            <div className="map-legend" style={{ borderTop: '1px solid var(--color-border)' }}>
              <div className="map-legend__item"><div className="map-legend__dot" style={{ background: '#10b981' }} /> LOW</div>
              <div className="map-legend__item"><div className="map-legend__dot" style={{ background: '#3b82f6' }} /> MED</div>
              <div className="map-legend__item"><div className="map-legend__dot" style={{ background: '#f59e0b' }} /> HIGH</div>
              <div className="map-legend__item"><div className="map-legend__dot" style={{ background: '#ef4444' }} /> CRITICAL</div>
            </div>
          </div>
        </div>

        {/* Sidebar: Zone details + Trends */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="card" style={{ padding: 0 }}>
            <div className="card__header" style={{ padding: 'var(--space-sm) var(--space-md)', backgroundColor: 'var(--color-bg-dark)', borderBottom: '1px solid var(--color-border)', margin: 0 }}>
              <div className="card__title" style={{ fontSize: '11px', margin: 0 }}>Risk Zones Analysis</div>
            </div>
            {filteredZones.length === 0 ? (
              <div style={{ padding: 'var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>No zones match the filter.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '250px', overflowY: 'auto' }}>
                {filteredZones.map((zone, idx) => (
                  <li key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-family-mono)', fontSize: '11px'
                  }}>
                    <span>{zone.zone_name.toUpperCase()}</span>
                    <span style={{ 
                      color: zone.score >= 75 ? 'var(--color-danger)' : zone.score >= 50 ? 'var(--color-warning)' : zone.score >= 25 ? 'var(--color-info)' : 'var(--color-success)',
                      fontWeight: 'bold'
                    }}>
                      {zone.score?.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="card__header" style={{ padding: 'var(--space-sm) var(--space-md)', backgroundColor: 'var(--color-bg-dark)', borderBottom: '1px solid var(--color-border)', margin: 0 }}>
              <div className="card__title" style={{ fontSize: '11px', margin: 0 }}>Crime Trends Vector</div>
            </div>
            {trends.length === 0 ? (
              <div style={{ padding: 'var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>No trend data available.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '200px', overflowY: 'auto' }}>
                {trends.map((trend, idx) => (
                  <li key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-family-mono)', fontSize: '11px'
                  }}>
                    <span style={{ color: 'var(--color-text)' }}>{trend.crime_type.toUpperCase()}</span>
                    <span style={{ color: 'var(--color-info)' }}>[{trend.frequency}x]</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
