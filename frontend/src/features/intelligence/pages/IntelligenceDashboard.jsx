import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import TemporalPanel from '../components/TemporalPanel';
import CyberMap from '../../../components/map/CyberMap';

const AHMEDABAD_CENTER = [23.0225, 72.5714];

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

  if (loading) return <div className="loading-spinner" style={{ padding: '24px' }}>LOADING INTELLIGENCE DATA...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)', height: '100%', overflowY: 'auto' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontWeight: 'bold' }}>CRIME INTELLIGENCE & AI ANALYTICS CONSOLE</span>
        <button className="btn btn--primary btn--sm" onClick={runPrediction} disabled={predicting}>
          {predicting ? '⏳ ANALYZING AI PREDICTIONS...' : '🤖 RUN AI PREDICTION'}
        </button>
      </div>

      {error && <div className="alert alert--error" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-family-mono)', margin: 0 }}>{error}</div>}
      {predictionMsg && <div className="alert alert--info" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-family-mono)', margin: 0 }}>{predictionMsg}</div>}

      {/* Risk Score Stats KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-family-mono)' }}>
          <div style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>RISK ZONES IDENTIFIED</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary-light)', marginTop: '2px' }}>{riskScores.length}</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-family-mono)' }}>
          <div style={{ fontSize: '9px', color: 'var(--color-danger)', fontWeight: 'bold' }}>CRITICAL ZONES (75+)</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-danger)', marginTop: '2px' }}>{riskScores.filter(z => z.score >= 75).length}</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-warning)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-family-mono)' }}>
          <div style={{ fontSize: '9px', color: 'var(--color-warning)', fontWeight: 'bold' }}>HIGH-RISK ZONES</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-warning)', marginTop: '2px' }}>{riskScores.filter(z => z.score >= 50 && z.score < 75).length}</div>
        </div>
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-family-mono)' }}>
          <div style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>CRIME TRENDS TRACKED</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-success)', marginTop: '2px' }}>{trends.length}</div>
        </div>
      </div>

      {/* Map + Sidebar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '8px', alignItems: 'start' }}>
        
        {/* Map Column */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Risk Filter Bar */}
          <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>SEVERITY FILTER:</span>
            {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((level) => (
              <button key={level}
                onClick={() => setFilterRisk(level)}
                style={{
                  background: filterRisk === level ? 'var(--color-primary)' : 'transparent',
                  color: filterRisk === level ? 'white' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '2px 8px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-family-mono)',
                  cursor: 'pointer',
                  borderRadius: '2px'
                }}>
                {level.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ height: '440px', position: 'relative', backgroundColor: '#0b101a' }}>
            <CyberMap
              center={AHMEDABAD_CENTER}
              zoom={12}
              riskScores={filteredZones}
              showRiskZones={true}
              autoFit={false}
            />
          </div>

          <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '16px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }} /> LOW (0-25)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-info)' }} /> MED (25-50)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }} /> HIGH (50-75)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-danger)' }} /> CRITICAL (75+)</div>
          </div>
        </div>

        {/* Sidebar Column: Risk details + Trends */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Risk Zone Analysis Card */}
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              RISK ZONES ANALYSIS
            </div>
            {filteredZones.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>No zones match filter.</div>
            ) : (
              <div style={{ maxHeight: '210px', overflowY: 'auto' }}>
                {filteredZones.map((zone, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 12px',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-family-mono)', fontSize: '10px',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                  }}>
                    <span style={{ color: 'var(--color-text)' }}>{zone.zone_name.toUpperCase()}</span>
                    <span className={`badge ${zone.score >= 75 ? 'badge--critical' : zone.score >= 50 ? 'badge--high' : zone.score >= 25 ? 'badge--medium' : 'badge--low'}`}>
                      {zone.score?.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crime Trends Vector Card */}
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              CRIME TRENDS VECTOR
            </div>
            {trends.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>No trend data available.</div>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {trends.map((trend, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 12px',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-family-mono)', fontSize: '10px',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                  }}>
                    <span style={{ color: 'var(--color-text)' }}>{trend.crime_type.toUpperCase()}</span>
                    <span style={{ color: 'var(--color-primary-light)', fontWeight: 'bold' }}>[{trend.frequency}x]</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <TemporalPanel />
    </div>
  );
}

