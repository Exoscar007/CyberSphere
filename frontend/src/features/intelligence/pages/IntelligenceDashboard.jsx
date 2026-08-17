import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import TemporalPanel from '../components/TemporalPanel';
import CyberMap from '../../../components/map/CyberMap';
import {
  ZapIcon,
  RefreshIcon,
  IntelligenceIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  LayersIcon,
  CheckIcon,
  XIcon,
} from '../../../components/common/Icons';

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
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, []);

  const executePrediction = async () => {
    setPredicting(true);
    setPredictionMsg(null);
    try {
      const res = await api.post('/api/ai/predict/');
      const jobId = res.data.id;
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const jobRes = await api.get(`/api/ai/jobs/${jobId}/`);
          if (jobRes.data.status === 'COMPLETED') {
            clearInterval(poll);
            setPredicting(false);
            setPredictionMsg(jobRes.data.details || 'Prediction complete. Risk density updated.');
            fetchData();
          } else if (jobRes.data.status === 'FAILED' || attempts > 15) {
            clearInterval(poll);
            setPredicting(false);
            setPredictionMsg(jobRes.data.details || 'Prediction job failed.');
          }
        } catch {
          clearInterval(poll);
          setPredicting(false);
          setPredictionMsg('Error checking prediction job telemetry.');
        }
      }, 2000);
    } catch {
      setPredicting(false);
      setPredictionMsg('Failed to trigger AI risk prediction model.');
    }
  };

  const handleConfirmPrediction = () => {
    setConfirmModalOpen(false);
    executePrediction();
  };

  const filteredZones = riskScores.filter((z) => {
    if (filterRisk === 'ALL') return true;
    return getRiskLabel(z.score) === filterRisk;
  });

  if (loading) {
    return <div className="loading-spinner">Loading intelligence and spatial risk data...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Crime Intelligence & Spatial Risk Analysis</h1>
          <p className="page-header__subtitle">Geographic risk density, spatial frequency vectors, and temporal prediction</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setConfirmModalOpen(true)}
          disabled={predicting}
          aria-label="Execute AI Prediction Model"
        >
          {predicting ? <RefreshIcon size={14} /> : <ZapIcon size={14} />}
          <span>{predicting ? 'Calculating Risk Model...' : 'Execute AI Prediction'}</span>
        </button>
      </div>

      {/* Confirmation Modal Barrier for High-Consequence Trigger */}
      {confirmModalOpen && (
        <div
          className="command-palette-overlay"
          style={{ zIndex: 1000 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="card" style={{ width: '440px', maxWidth: '92vw', padding: '20px', boxShadow: 'var(--shadow-xl)', backgroundColor: '#FAF7F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--palette-coastal-blue)', display: 'flex' }}>
                <ZapIcon size={20} />
              </div>
              <h3 id="confirm-modal-title" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Execute AI Risk Prediction
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
              Initiate model calculation to recompute spatial risk density and temporal crime forecasting across all municipal sectors?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPrediction}
                className="btn btn-primary"
              >
                <CheckIcon size={14} />
                <span>Confirm & Execute</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      {predictionMsg && (
        <div className="alert alert--info" role="status">
          <IntelligenceIcon size={16} />
          <span>{predictionMsg}</span>
        </div>
      )}

      {/* RISK SCORE KPI METRIC STRIP */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <span className="stat-card__label">
            <LayersIcon size={12} />
            Risk Sectors
          </span>
          <span className="stat-card__value">
            {riskScores.length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label" style={{ color: 'var(--color-critical)' }}>
            Critical Zones (75+)
          </span>
          <span className="stat-card__value" style={{ color: 'var(--color-critical)' }}>
            {riskScores.filter((z) => z.score >= 75).length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label" style={{ color: 'var(--color-high)' }}>
            High-Risk Zones (50-74)
          </span>
          <span className="stat-card__value" style={{ color: 'var(--color-high)' }}>
            {riskScores.filter((z) => z.score >= 50 && z.score < 75).length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label" style={{ color: 'var(--color-verified)' }}>
            <TrendingUpIcon size={12} />
            Trends Tracked
          </span>
          <span className="stat-card__value" style={{ color: 'var(--color-verified)' }}>
            {trends.length}
          </span>
        </div>
      </div>

      {/* MAP & SECTOR SIDEBAR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-md)', alignItems: 'start' }}>
        <div>
          {/* FILTER PILLS */}
          <div className="filter-pills-bar" style={{ marginBottom: 'var(--space-md)' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginRight: '4px' }}>
              Risk Level:
            </span>
            {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((level) => (
              <button
                key={level}
                type="button"
                className={`filter-pill ${filterRisk === level ? 'filter-pill--active' : ''}`}
                onClick={() => setFilterRisk(level)}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Map Container */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: '460px', position: 'relative' }}>
              <CyberMap
                center={AHMEDABAD_CENTER}
                zoom={12}
                riskScores={filteredZones}
                showRiskZones={true}
                autoFit={false}
              />
            </div>
            {/* GIS Legend Bar */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                padding: '6px 14px',
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'var(--palette-chalk)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-verified)' }} />
                <span>LOW (0-24)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--palette-slate-blue)' }} />
                <span>MEDIUM (25-49)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-high)' }} />
                <span>HIGH (50-74)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-critical)' }} />
                <span>CRITICAL (75+)</span>
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR: RISK ZONES & TRENDS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Risk Zones Analysis */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--palette-chalk)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span className="card-title">Risk Sectors Breakdown</span>
            </div>
            {filteredZones.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                No sectors match active risk filter.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '210px', overflowY: 'auto' }}>
                {filteredZones.map((zone, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 12px',
                      borderBottom: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: '600' }}>
                      {zone.zone_name.toUpperCase()}
                    </span>
                    <span
                      style={{
                        color:
                          zone.score >= 75
                            ? 'var(--color-critical)'
                            : zone.score >= 50
                            ? 'var(--color-high)'
                            : zone.score >= 25
                            ? 'var(--palette-slate-blue)'
                            : 'var(--color-verified)',
                        fontWeight: '700',
                      }}
                    >
                      {zone.score?.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Crime Trends Frequency */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--palette-chalk)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span className="card-title">Spatial Crime Frequency</span>
            </div>
            {trends.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                No trend telemetry available.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '190px', overflowY: 'auto' }}>
                {trends.map((trend, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 12px',
                      borderBottom: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-primary)' }}>{trend.crime_type.toUpperCase()}</span>
                    <span style={{ color: 'var(--palette-sage)', fontWeight: '700' }}>[{trend.frequency}x]</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* TEMPORAL PREDICTIVE FORECAST PANEL */}
      <TemporalPanel />
    </div>
  );
}
