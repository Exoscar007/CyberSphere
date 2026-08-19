import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../services/api';
import TemporalPanel from '../components/TemporalPanel';
import CyberMap from '../../../components/map/CyberMap';
import useMonitoringSocket from '../../../hooks/useMonitoringSocket';
import { useToast } from '../../../context/ToastContext';
import {
  ZapIcon,
  RefreshIcon,
  IntelligenceIcon,
  AlertCircleIcon,
  LayersIcon,
  CheckIcon,
  ShieldIcon,
  RadioWaveIcon,
  DispatchIcon,
  SearchIcon,
  ChevronRightIcon,
  ActivityIcon,
} from '../../../components/common/Icons';

const AHMEDABAD_CENTER = [23.0225, 72.5714];

function getRiskBadgeConfig(levelOrScore) {
  const score = typeof levelOrScore === 'number' ? levelOrScore : null;
  const level = typeof levelOrScore === 'string' ? levelOrScore.toUpperCase() : null;

  if (level === 'CRITICAL' || (score !== null && score >= 75)) {
    return {
      label: 'CRITICAL',
      color: 'var(--color-critical)',
      bg: 'rgba(163, 81, 57, 0.12)',
      border: 'var(--color-critical-border)',
      badgeClass: 'badge--critical',
    };
  }
  if (level === 'HIGH' || (score !== null && score >= 50)) {
    return {
      label: 'HIGH',
      color: 'var(--color-high)',
      bg: 'rgba(217, 122, 38, 0.12)',
      border: 'var(--color-high-border)',
      badgeClass: 'badge--high',
    };
  }
  if (level === 'MEDIUM' || (score !== null && score >= 25)) {
    return {
      label: 'MEDIUM',
      color: 'var(--palette-coastal-blue)',
      bg: 'rgba(40, 85, 112, 0.12)',
      border: 'var(--color-operational-border)',
      badgeClass: 'badge--operational',
    };
  }
  return {
    label: 'LOW',
    color: 'var(--color-verified)',
    bg: 'rgba(42, 107, 101, 0.12)',
    border: 'var(--color-verified-border)',
    badgeClass: 'badge--verified',
  };
}

function getCyberThreatBadgeConfig(threatLevel) {
  const level = (threatLevel || '').toUpperCase();
  if (level === 'CRITICAL') {
    return {
      label: 'CRITICAL THREAT',
      color: '#7C3AED',
      bg: 'rgba(124, 58, 237, 0.14)',
      border: 'rgba(124, 58, 237, 0.4)',
    };
  }
  if (level === 'HIGH') {
    return {
      label: 'HIGH THREAT',
      color: '#C026D3',
      bg: 'rgba(192, 38, 211, 0.14)',
      border: 'rgba(192, 38, 211, 0.4)',
    };
  }
  if (level === 'MEDIUM') {
    return {
      label: 'MEDIUM THREAT',
      color: '#0284C7',
      bg: 'rgba(2, 132, 199, 0.14)',
      border: 'rgba(2, 132, 199, 0.4)',
    };
  }
  return {
    label: 'LOW THREAT',
    color: '#0D9488',
    bg: 'rgba(13, 148, 136, 0.14)',
    border: 'rgba(13, 148, 136, 0.4)',
  };
}

function getTrendBadge(trend) {
  const tr = (trend || '').toUpperCase();
  if (tr === 'INCREASING') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 7px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(163, 81, 57, 0.14)',
          color: 'var(--color-critical)',
          fontSize: '10px',
          fontWeight: '800',
          fontFamily: 'var(--font-mono)',
        }}
      >
        ↗ INCREASING
      </span>
    );
  }
  if (tr === 'DECREASING') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 7px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(42, 107, 101, 0.14)',
          color: 'var(--color-verified)',
          fontSize: '10px',
          fontWeight: '800',
          fontFamily: 'var(--font-mono)',
        }}
      >
        ↘ DECREASING
      </span>
    );
  }
  if (tr === 'STABLE') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 7px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(40, 85, 112, 0.14)',
          color: 'var(--palette-coastal-blue)',
          fontSize: '10px',
          fontWeight: '800',
          fontFamily: 'var(--font-mono)',
        }}
      >
        → STABLE
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 7px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--palette-oatmeal)',
        color: 'var(--color-text-muted)',
        fontSize: '9.5px',
        fontWeight: '700',
        fontFamily: 'var(--font-mono)',
      }}
      title="Insufficient historical records to calculate statistical trend baseline"
    >
      INSUFFICIENT DATA
    </span>
  );
}

function getCorrelationBadge(status) {
  const s = (status || '').toUpperCase();
  const configs = {
    CONVERGING: { color: 'var(--color-critical)', bg: 'rgba(163, 81, 57, 0.14)', label: '⚠️ CONVERGING' },
    CYBER_DOMINANT: { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.14)', label: '🛡️ CYBER DOMINANT' },
    PHYSICAL_DOMINANT: { color: 'var(--color-high)', bg: 'rgba(217, 122, 38, 0.14)', label: '🏢 PHYSICAL DOMINANT' },
    DIVERGING: { color: 'var(--palette-coastal-blue)', bg: 'rgba(40, 85, 112, 0.14)', label: '⇄ DIVERGING' },
    STABLE: { color: 'var(--color-verified)', bg: 'rgba(42, 107, 101, 0.14)', label: '✓ BALANCED STABLE' },
    INSUFFICIENT_DATA: { color: 'var(--color-text-muted)', bg: 'var(--palette-oatmeal)', label: 'INSUFFICIENT DATA' },
  };
  const cfg = configs[s] || configs.INSUFFICIENT_DATA;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontSize: '10px',
        fontWeight: '800',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.4px',
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function IntelligenceDashboard() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('SPATIAL'); // 'SPATIAL' | 'CYBER'

  // Spatial Risk Intelligence State
  const [summaryData, setSummaryData] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  // Cybercrime Intelligence State
  const [cyberSummary, setCyberSummary] = useState(null);
  const [cyberCorrelations, setCyberCorrelations] = useState([]);
  const [selectedCyberHotspot, setSelectedCyberHotspot] = useState(null);
  const [cyberFilterThreat, setCyberFilterThreat] = useState('ALL');
  const [cyberSearchQuery, setCyberSearchQuery] = useState('');
  const [cyberMapError, setCyberMapError] = useState(null);

  // Map Center & Zoom State
  const [mapCenter, setMapCenter] = useState(AHMEDABAD_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI Prediction State
  const [predicting, setPredicting] = useState(false);
  const [predictionMsg, setPredictionMsg] = useState(null);
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setCyberMapError(null);
    try {
      const [summaryRes, modelRes, cyberSummaryRes, cyberCorrRes] = await Promise.all([
        api.get('/api/intelligence/summary/'),
        api.get('/api/ai/model-status/').catch(() => ({ data: null })),
        api.get('/api/intelligence/cybercrime/summary/').catch((err) => {
          console.warn('Failed to load cyber summary:', err);
          return { data: null };
        }),
        api.get('/api/intelligence/cybercrime/correlations/').catch(() => ({ data: { correlations: [] } })),
      ]);

      setSummaryData(summaryRes.data);
      if (modelRes?.data) {
        setModelStatus(modelRes.data);
      }

      if (summaryRes.data?.zones?.length > 0) {
        setSelectedZone((prev) => {
          if (!prev) return summaryRes.data.zones[0];
          const found = summaryRes.data.zones.find((z) => z.id === prev.id || z.zone_name === prev.zone_name);
          return found || summaryRes.data.zones[0];
        });
      }

      if (cyberSummaryRes?.data) {
        setCyberSummary(cyberSummaryRes.data);
        if (cyberSummaryRes.data.hotspots?.length > 0) {
          setSelectedCyberHotspot((prev) => {
            if (!prev) return cyberSummaryRes.data.hotspots[0];
            const found = cyberSummaryRes.data.hotspots.find((h) => h.station_id === prev.station_id || h.zone_name === prev.zone_name);
            return found || cyberSummaryRes.data.hotspots[0];
          });
        }
      } else {
        setCyberMapError('Cybercrime GIS layer unavailable from server');
      }

      if (cyberCorrRes?.data) {
        if (Array.isArray(cyberCorrRes.data)) {
          setCyberCorrelations(cyberCorrRes.data);
        } else if (Array.isArray(cyberCorrRes.data.correlations)) {
          setCyberCorrelations(cyberCorrRes.data.correlations);
        }
      }
    } catch {
      setError('Unable to load database-backed intelligence summary. Please ensure the backend is running.');
      setCyberMapError('Cybercrime GIS layer unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time WebSocket Alert Integration
  useMonitoringSocket({
    onCriticalAlert: (alertData) => {
      if (addToast) {
        addToast(`🚨 ${alertData.title || 'CRITICAL ALERT'}: ${alertData.message || ''}`, 'error');
      }
      fetchData();
    },
  });

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
            setPredictionMsg(jobRes.data.details || 'Prediction complete. Operational risk model updated.');
            fetchData();
            if (addToast) addToast('AI Risk Prediction complete. Spatial risk model updated.', 'success');
          } else if (jobRes.data.status === 'FAILED' || attempts > 15) {
            clearInterval(poll);
            setPredicting(false);
            setPredictionMsg(jobRes.data.details || 'Prediction job failed.');
            if (addToast) addToast('Prediction job encountered an issue.', 'error');
          }
        } catch {
          clearInterval(poll);
          setPredicting(false);
          setPredictionMsg('Error checking prediction job telemetry.');
        }
      }, 1500);
    } catch {
      setPredicting(false);
      setPredictionMsg('Failed to trigger AI risk prediction model.');
    }
  };

  const handleConfirmPrediction = () => {
    setConfirmModalOpen(false);
    executePrediction();
  };

  const handleSelectZone = (zone) => {
    setSelectedZone(zone);
    if (zone.center?.coordinates && zone.center.coordinates.length === 2) {
      setMapCenter([zone.center.coordinates[1], zone.center.coordinates[0]]);
      setMapZoom(14);
    }
  };

  // Synchronized Hotspot Selection (Inspect Button, Map Click, List Click, Search)
  const handleSelectCyberHotspot = useCallback((hotspot) => {
    if (!hotspot) return;
    setSelectedCyberHotspot(hotspot);

    const lng = hotspot.center?.coordinates ? hotspot.center.coordinates[0] : (typeof hotspot.longitude === 'number' ? hotspot.longitude : null);
    const lat = hotspot.center?.coordinates ? hotspot.center.coordinates[1] : (typeof hotspot.latitude === 'number' ? hotspot.latitude : null);

    if (lat !== null && lng !== null && lat !== 0 && lng !== 0) {
      setMapCenter([lat, lng]);
      setMapZoom(14);
    }
  }, []);

  const allZones = useMemo(() => summaryData?.zones || [], [summaryData?.zones]);
  const overview = summaryData?.overview || {
    total_monitored_zones: 0,
    critical_zones: 0,
    high_risk_zones: 0,
    medium_risk_zones: 0,
    low_risk_zones: 0,
    active_patrol_coverage: 0,
    total_recent_incidents: 0,
    total_recent_firs: 0,
    dominant_city_threat: 'N/A',
  };
  const priorityQueue = summaryData?.priority_queue || [];

  const filteredZones = useMemo(() => {
    return allZones.filter((z) => {
      const matchesFilter =
        filterRisk === 'ALL' ||
        z.risk_level?.toUpperCase() === filterRisk.toUpperCase() ||
        (filterRisk === 'Critical' && z.score >= 75) ||
        (filterRisk === 'High' && z.score >= 50 && z.score < 75) ||
        (filterRisk === 'Medium' && z.score >= 25 && z.score < 50) ||
        (filterRisk === 'Low' && z.score < 25);

      const matchesSearch =
        !searchQuery.trim() ||
        z.zone_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        z.dominant_crime?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        z.priority_action?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [allZones, filterRisk, searchQuery]);

  // Cyber Hotspots Data
  const allCyberHotspots = useMemo(() => cyberSummary?.hotspots || [], [cyberSummary?.hotspots]);
  const cyberOverview = cyberSummary?.overview || {
    total_cybercrime: 0,
    total_physical_crime: 0,
    total_crime: 0,
    cybercrime_percentage: 0,
    category_breakdown: {
      financial_fraud: 0,
      phishing: 0,
      identity_theft: 0,
      cyber_fraud: 0,
      online_scam: 0,
      other_cyber: 0,
    },
    active_cyber_hotspots: 0,
    emerging_threats_count: 0,
  };
  const emergingAlerts = cyberSummary?.emerging_threats || [];

  // Filtered Cyber Hotspots
  const filteredCyberHotspots = useMemo(() => {
    return allCyberHotspots.filter((h) => {
      const matchesThreat =
        cyberFilterThreat === 'ALL' ||
        h.threat_level?.toUpperCase() === cyberFilterThreat.toUpperCase();

      const matchesSearch =
        !cyberSearchQuery.trim() ||
        h.zone_name.toLowerCase().includes(cyberSearchQuery.toLowerCase()) ||
        h.station_name?.toLowerCase().includes(cyberSearchQuery.toLowerCase()) ||
        h.dominant_type?.toLowerCase().includes(cyberSearchQuery.toLowerCase());

      return matchesThreat && matchesSearch;
    });
  }, [allCyberHotspots, cyberFilterThreat, cyberSearchQuery]);

  // Sector Search Handler (Focuses matching hotspot)
  const handleCyberSearchChange = (query) => {
    setCyberSearchQuery(query);
    if (!query.trim()) return;

    const match = allCyberHotspots.find(
      (h) =>
        h.zone_name.toLowerCase().includes(query.toLowerCase()) ||
        h.station_name?.toLowerCase().includes(query.toLowerCase()) ||
        h.dominant_type?.toLowerCase().includes(query.toLowerCase())
    );

    if (match) {
      handleSelectCyberHotspot(match);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading real database intelligence, operational records, and spatial risk models...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 className="page-header__title">Crime Intelligence &amp; Spatial Risk Analysis</h1>
            {(activeTab === 'CYBER' ? (cyberSummary?.user_scope || summaryData?.user_scope) : summaryData?.user_scope) && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: activeTab === 'CYBER' ? '#7C3AED' : 'var(--palette-coastal-blue)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {activeTab === 'CYBER' ? (cyberSummary?.user_scope || summaryData?.user_scope) : summaryData?.user_scope}
              </span>
            )}
          </div>
          <p className="page-header__subtitle">
            Synthesizing real-time operational records, spatial risk indices, and deterministic police recommendations
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchData}
            title="Refresh Intelligence Summary from Database"
            aria-label="Refresh Intelligence"
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setConfirmModalOpen(true)}
            disabled={predicting}
            aria-label="Execute AI Prediction Model"
          >
            {predicting ? <RefreshIcon size={14} /> : <ZapIcon size={14} />}
            <span>{predicting ? 'Computing AI Model...' : 'Execute AI Prediction'}</span>
          </button>
        </div>
      </div>

      {/* INTELLIGENCE LAYER SUB-NAVIGATION TAB SWITCHER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px',
          backgroundColor: 'var(--palette-chalk)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('SPATIAL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'SPATIAL' ? 'var(--palette-charcoal-slate)' : 'transparent',
            color: activeTab === 'SPATIAL' ? '#FFFFFF' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            fontWeight: '800',
            letterSpacing: '0.4px',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <LayersIcon size={14} />
          <span>SPATIAL RISK &amp; PATROL INTELLIGENCE</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CYBER')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'CYBER' ? '#7C3AED' : 'transparent',
            color: activeTab === 'CYBER' ? '#FFFFFF' : '#7C3AED',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            fontWeight: '800',
            letterSpacing: '0.4px',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <ShieldIcon size={14} />
          <span>CYBER INTELLIGENCE</span>
          {cyberOverview.total_cybercrime > 0 && (
            <span
              style={{
                backgroundColor: activeTab === 'CYBER' ? '#FFFFFF' : '#7C3AED',
                color: activeTab === 'CYBER' ? '#7C3AED' : '#FFFFFF',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: '900',
              }}
            >
              {cyberOverview.total_cybercrime}
            </span>
          )}
        </button>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div
          className="command-palette-overlay"
          style={{ zIndex: 1000 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="card" style={{ width: '460px', maxWidth: '92vw', padding: '24px', boxShadow: 'var(--shadow-xl)', backgroundColor: '#FAF7F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--palette-coastal-blue)', display: 'flex' }}>
                <ZapIcon size={20} />
              </div>
              <h3 id="confirm-modal-title" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Execute AI Risk Prediction
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 18px' }}>
              Extract fresh features from the PostGIS database, compute spatial-temporal risk scores across all sectors, and update operational decision support?
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
                <span>Confirm &amp; Compute</span>
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

      {/* =========================================================================
          TAB 1: SPATIAL RISK & PATROL INTELLIGENCE (PRESERVED 100%)
          ========================================================================= */}
      {activeTab === 'SPATIAL' && (
        <React.Fragment>
          {/* MODEL TRANSPARENCY & STATUS BANNER */}
          {modelStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                backgroundColor: modelStatus.is_ml_active ? 'rgba(42, 107, 101, 0.08)' : 'rgba(40, 85, 112, 0.08)',
                border: `1px solid ${modelStatus.is_ml_active ? 'var(--color-verified-border)' : 'var(--color-operational-border)'}`,
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: modelStatus.is_ml_active ? 'var(--color-verified)' : 'var(--palette-coastal-blue)',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '10px',
                    letterSpacing: '0.5px',
                  }}
                >
                  {modelStatus.is_ml_active ? 'ACTIVE ML' : 'BASELINE STATISTICAL'}
                </span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: '600' }}>
                  {modelStatus.model_name}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  ({modelStatus.events_available} database events loaded)
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {modelStatus.is_ml_active ? (
                  <span>Random Forest Spatial Inference Active</span>
                ) : (
                  <span>Transparent KDE &amp; Poisson Baseline Engine (100% Real DB Records)</span>
                )}
              </div>
            </div>
          )}

          {/* SECTION A: INTELLIGENCE OVERVIEW KPI STRIP */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="stat-card">
              <span className="stat-card__label">
                <LayersIcon size={12} />
                Monitored Sectors
              </span>
              <span className="stat-card__value">
                {overview.total_monitored_zones}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Active risk perimeters
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: 'var(--color-critical)' }}>
                Critical Risk Sectors
              </span>
              <span className="stat-card__value" style={{ color: 'var(--color-critical)' }}>
                {overview.critical_zones}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Score &ge; 75 ({overview.high_risk_zones} High Risk)
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: 'var(--palette-coastal-blue)' }}>
                <DispatchIcon size={12} />
                Active Patrol Coverage
              </span>
              <span className="stat-card__value" style={{ color: 'var(--palette-coastal-blue)' }}>
                {overview.active_patrol_coverage} Units
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Deployed field units
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: 'var(--color-high)' }}>
                <ShieldIcon size={12} />
                Dominant Threat Category
              </span>
              <span className="stat-card__value" style={{ fontSize: '15px', color: 'var(--color-high)', fontWeight: '800', lineHeight: 1.2 }}>
                {overview.dominant_city_threat}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Primary volume driver
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: 'var(--color-verified)' }}>
                <ActivityIcon size={12} />
                Active Case Records
              </span>
              <span className="stat-card__value" style={{ color: 'var(--color-verified)' }}>
                {overview.total_recent_incidents + overview.total_recent_firs}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {overview.total_recent_incidents} Incidents | {overview.total_recent_firs} FIRs
              </span>
            </div>
          </div>

          {/* SECTION B: PRIORITY INTELLIGENCE DISPATCH QUEUE */}
          {priorityQueue.length > 0 && (
            <div className="card" style={{ padding: '16px 20px', backgroundColor: '#FAF7F6' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RadioWaveIcon size={16} style={{ color: 'var(--color-critical)' }} />
                  <span className="card-title" style={{ margin: 0, fontSize: '13.5px', letterSpacing: '0.5px' }}>
                    PRIORITY INTELLIGENCE DISPATCH QUEUE
                  </span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  RANKED BY PREDICTIVE RISK SCORE &amp; OPERATIONAL SEVERITY
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(priorityQueue.length, 3)}, 1fr)`,
                  gap: 'var(--space-md)',
                }}
              >
                {priorityQueue.slice(0, 3).map((item) => {
                  const cfg = getRiskBadgeConfig(item.score);
                  const isSelected = selectedZone?.zone_name === item.zone_name;

                  return (
                    <div
                      key={item.rank}
                      onClick={() => {
                        const found = allZones.find((z) => z.zone_name === item.zone_name);
                        if (found) handleSelectZone(found);
                      }}
                      style={{
                        backgroundColor: isSelected ? 'rgba(40, 85, 112, 0.08)' : 'var(--palette-chalk)',
                        border: `1px solid ${isSelected ? 'var(--palette-coastal-blue)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: cfg.color,
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              #{item.rank}
                            </span>
                            <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                              {item.zone_name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: '800',
                              color: cfg.color,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {item.score?.toFixed(1)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '3px',
                              backgroundColor: cfg.bg,
                              color: cfg.color,
                              fontSize: '9.5px',
                              fontWeight: '800',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {cfg.label}
                          </span>
                          {getTrendBadge(item.trend)}
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '3px',
                              backgroundColor: item.active_patrols > 0 ? 'rgba(42, 107, 101, 0.12)' : 'rgba(163, 81, 57, 0.12)',
                              color: item.active_patrols > 0 ? 'var(--color-verified)' : 'var(--color-critical)',
                              fontSize: '9.5px',
                              fontWeight: '700',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {item.active_patrols} PATROL{item.active_patrols === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginBottom: '8px' }}>
                          <strong>Primary Threat:</strong> {item.dominant_crime}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid var(--color-border-subtle)',
                          paddingTop: '8px',
                          marginTop: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: 'var(--palette-coastal-blue)',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.priority_action}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          Inspect <ChevronRightIcon size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION C & D: GIS MAP & POLICE DECISION SUPPORT DUAL VIEW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 'var(--space-md)', alignItems: 'stretch' }}>
            {/* Left Column: Map & Filter Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* FILTER PILLS & SEARCH BAR */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      marginRight: '2px',
                    }}
                  >
                    RISK LEVEL:
                  </span>
                  {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((level) => {
                    const cfg = {
                      ALL:      { color: 'var(--palette-charcoal-slate)', bg: 'var(--palette-oatmeal)', border: 'var(--color-border)', activeBg: 'var(--palette-charcoal-slate)', activeColor: '#fff' },
                      Critical: { color: 'var(--color-critical)', bg: 'rgba(163, 81, 57, 0.1)', border: 'var(--color-critical-border)', activeBg: 'var(--color-critical)', activeColor: '#fff' },
                      High:     { color: 'var(--color-high)', bg: 'rgba(217, 122, 38, 0.1)', border: 'var(--color-high-border)', activeBg: 'var(--color-high)', activeColor: '#fff' },
                      Medium:   { color: 'var(--palette-coastal-blue)', bg: 'rgba(40, 85, 112, 0.1)', border: 'var(--color-operational-border)', activeBg: 'var(--palette-coastal-blue)', activeColor: '#fff' },
                      Low:      { color: 'var(--color-verified)', bg: 'rgba(42, 107, 101, 0.1)', border: 'var(--color-verified-border)', activeBg: 'var(--color-verified)', activeColor: '#fff' },
                    }[level];
                    const isActive = filterRisk === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFilterRisk(level)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          border: `1px solid ${isActive ? cfg.activeBg : cfg.border}`,
                          backgroundColor: isActive ? cfg.activeBg : cfg.bg,
                          color: isActive ? cfg.activeColor : cfg.color,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Sector Search */}
                <div style={{ position: 'relative', width: '180px' }}>
                  <input
                    type="text"
                    placeholder="Search sectors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 8px 4px 26px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                  <SearchIcon
                    size={12}
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                    }}
                  />
                </div>
              </div>

              {/* Map Container */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, minHeight: '520px', width: '100%', position: 'relative' }}>
                  <CyberMap
                    center={mapCenter}
                    zoom={mapZoom}
                    riskScores={filteredZones}
                    showRiskZones={true}
                    showSearchBar={false}
                    autoFit={false}
                  />
                </div>
                {/* GIS Legend Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    borderTop: '1px solid var(--color-border)',
                    backgroundColor: 'var(--palette-chalk)',
                    fontSize: '10.5px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-verified)' }} />
                      <span>LOW (0-24)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--palette-coastal-blue)' }} />
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

                  <div style={{ color: 'var(--color-text-muted)' }}>
                    ⚡ Click any map perimeter to focus police decision support
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Police Decision Support & Contributing Factors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {selectedZone ? (
                <div className="card" style={{ padding: '16px 18px', backgroundColor: '#FAF7F6', border: '1px solid var(--color-border)' }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <ShieldIcon size={16} style={{ color: getRiskBadgeConfig(selectedZone.score).color }} />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-mono)' }}>
                          POLICE DECISION SUPPORT
                        </span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-primary)', margin: 0 }}>
                        {selectedZone.zone_name}
                      </h3>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: '800',
                          color: getRiskBadgeConfig(selectedZone.score).color,
                          fontFamily: 'var(--font-mono)',
                          lineHeight: 1,
                        }}
                      >
                        {selectedZone.score?.toFixed(1)}
                      </div>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: '800',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: getRiskBadgeConfig(selectedZone.score).bg,
                          color: getRiskBadgeConfig(selectedZone.score).color,
                          fontFamily: 'var(--font-mono)',
                          display: 'inline-block',
                          marginTop: '3px',
                        }}
                      >
                        {getRiskBadgeConfig(selectedZone.score).label}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONABLE RECOMMENDATION DIRECTIVE BANNER */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: selectedZone.score >= 75 ? 'rgba(163, 81, 57, 0.09)' : 'rgba(40, 85, 112, 0.08)',
                      borderLeft: `4px solid ${getRiskBadgeConfig(selectedZone.score).color}`,
                      borderRadius: 'var(--radius-xs)',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          color: getRiskBadgeConfig(selectedZone.score).color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        TACTICAL RECOMMENDATION
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--palette-charcoal-slate)',
                          color: '#FFFFFF',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {selectedZone.priority_action}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', lineHeight: 1.45, fontWeight: '600' }}>
                      {selectedZone.recommendation}
                    </div>
                  </div>

                  {/* CONTRIBUTING OPERATIONAL FACTORS */}
                  <div style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        fontFamily: 'var(--font-mono)',
                        marginBottom: '8px',
                      }}
                    >
                      CONTRIBUTING OPERATIONAL FACTORS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedZone.contributing_factors?.map((factor, fIdx) => (
                        <div
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            fontSize: '11.5px',
                            color: 'var(--color-text-secondary)',
                            lineHeight: 1.4,
                            padding: '6px 10px',
                            backgroundColor: 'var(--palette-chalk)',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--color-border-subtle)',
                          }}
                        >
                          <span style={{ color: 'var(--palette-coastal-blue)', fontWeight: '800', marginTop: '1px' }}>
                            •
                          </span>
                          <span>{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OPERATIONAL TELEMETRY 4-GRID */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ padding: '8px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '9.5px', textTransform: 'uppercase' }}>Recent Incidents</div>
                      <div style={{ fontWeight: '800', color: 'var(--color-text-primary)', fontSize: '13px', marginTop: '2px' }}>
                        {selectedZone.recent_incidents_count}
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '9.5px', textTransform: 'uppercase' }}>Active FIRs</div>
                      <div style={{ fontWeight: '800', color: 'var(--color-text-primary)', fontSize: '13px', marginTop: '2px' }}>
                        {selectedZone.recent_firs_count}
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '9.5px', textTransform: 'uppercase' }}>Active Patrols</div>
                      <div style={{ fontWeight: '800', color: selectedZone.active_patrols_count > 0 ? 'var(--color-verified)' : 'var(--color-critical)', fontSize: '13px', marginTop: '2px' }}>
                        {selectedZone.active_patrols_count} Unit{selectedZone.active_patrols_count === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '9.5px', textTransform: 'uppercase' }}>Recent Trend</div>
                      <div style={{ marginTop: '2px' }}>
                        {getTrendBadge(selectedZone.trend)}
                      </div>
                    </div>
                  </div>

                  {/* Patrol Officers Deployed info */}
                  {selectedZone.patrol_officers?.length > 0 && (
                    <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      <strong>Units Deployed:</strong> {selectedZone.patrol_officers.join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  Select any sector from the map or priority list to view actionable decision support.
                </div>
              )}

              {/* ALL MONITORED SECTORS BREAKDOWN */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--palette-chalk)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span className="card-title">All Monitored Risk Sectors</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {filteredZones.length} / {allZones.length}
                  </span>
                </div>

                {filteredZones.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    No sectors match active filters.
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '220px', overflowY: 'auto' }}>
                    {filteredZones.map((zone, idx) => {
                      const isSelected = selectedZone?.id === zone.id || selectedZone?.zone_name === zone.zone_name;
                      const cfg = getRiskBadgeConfig(zone.score);

                      return (
                        <li
                          key={idx}
                          onClick={() => handleSelectZone(zone)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 14px',
                            borderBottom: '1px solid var(--color-border)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(40, 85, 112, 0.08)' : 'transparent',
                            transition: 'background-color var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.color }} />
                            <span style={{ color: 'var(--color-text-primary)', fontWeight: isSelected ? '800' : '600' }}>
                              {zone.zone_name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>
                              {zone.dominant_crime?.split(' ')[0]}
                            </span>
                            <span style={{ color: cfg.color, fontWeight: '800' }}>
                              {zone.score?.toFixed(1)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* TEMPORAL PREDICTIVE FORECAST PANEL */}
          <TemporalPanel />
        </React.Fragment>
      )}

      {/* =========================================================================
          TAB 2: CYBERCRIME INTELLIGENCE LAYER (DEDICATED COMMAND CENTER VIEW)
          ========================================================================= */}
      {activeTab === 'CYBER' && (
        <React.Fragment>
          {/* CYBER TRANSPARENCY BANNER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: 'rgba(124, 58, 237, 0.08)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '10px',
                  letterSpacing: '0.5px',
                }}
              >
                LIVE CYBER INTELLIGENCE
              </span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>
                Deterministic PostGIS Analytics Engine
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                ({cyberOverview.total_cybercrime} live cybercrime events across {cyberOverview.active_cyber_hotspots} jurisdictions)
              </span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              100% Real Database FIRs &amp; Incidents • Anti-Fraud &amp; Phishing Detection
            </div>
          </div>

          {/* 10.1 CYBERCRIME OVERVIEW KPI STRIP */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            <div className="stat-card">
              <span className="stat-card__label" style={{ color: '#7C3AED' }}>
                <ShieldIcon size={12} />
                Total Cybercrime
              </span>
              <span className="stat-card__value" style={{ color: '#7C3AED' }}>
                {cyberOverview.total_cybercrime}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Active cyber-enabled cases
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: '#C026D3' }}>
                Cybercrime %
              </span>
              <span className="stat-card__value" style={{ color: '#C026D3' }}>
                {cyberOverview.cybercrime_percentage}%
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Of total recorded crime
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: 'var(--color-critical)' }}>
                Financial Fraud
              </span>
              <span className="stat-card__value" style={{ color: 'var(--color-critical)' }}>
                {cyberOverview.category_breakdown?.financial_fraud + cyberOverview.category_breakdown?.cyber_fraud}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Banking, UPI &amp; Cards
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: '#0284C7' }}>
                Phishing Scams
              </span>
              <span className="stat-card__value" style={{ color: '#0284C7' }}>
                {cyberOverview.category_breakdown?.phishing}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Credential theft &amp; portals
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: 'var(--palette-charcoal-slate)' }}>
                Identity Theft
              </span>
              <span className="stat-card__value">
                {cyberOverview.category_breakdown?.identity_theft + cyberOverview.category_breakdown?.online_scam}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Impersonation &amp; extortion
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-card__label" style={{ color: 'var(--color-high)' }}>
                Emerging Threats
              </span>
              <span className="stat-card__value" style={{ color: 'var(--color-high)' }}>
                {cyberOverview.emerging_threats_count}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Active surge sectors
              </span>
            </div>
          </div>

          {/* 11. EMERGING CYBER THREATS ALERTS PANEL */}
          <div className="card" style={{ padding: '16px 20px', backgroundColor: '#FAF7F6' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>⚠</span>
                <span className="card-title" style={{ margin: 0, fontSize: '13.5px', letterSpacing: '0.5px' }}>
                  EMERGING CYBER THREATS
                </span>
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                DYNAMIC SURGE &amp; PHISHING HARVESTING SIGNALS
              </span>
            </div>

            {emergingAlerts.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--palette-chalk)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11.5px',
                  color: 'var(--color-text-muted)',
                }}
              >
                NO EMERGING CYBER THREATS DETECTED IN CURRENT MONITORING WINDOW
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(emergingAlerts.length, 3)}, 1fr)`,
                  gap: 'var(--space-md)',
                }}
              >
                {emergingAlerts.map((alert, aIdx) => {
                  const cfg = getCyberThreatBadgeConfig(alert.severity);

                  return (
                    <div
                      key={alert.id || aIdx}
                      style={{
                        backgroundColor: 'var(--palette-chalk)',
                        border: `1px solid ${cfg.border}`,
                        borderLeft: `4px solid ${cfg.color}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: cfg.bg,
                              color: cfg.color,
                              fontFamily: 'var(--font-mono)',
                              letterSpacing: '0.4px',
                            }}
                          >
                            {alert.severity} SEVERITY
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              color: 'var(--color-critical)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {alert.change_percent} Surge
                          </span>
                        </div>

                        <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
                          {alert.zone}
                        </h4>

                        <div style={{ fontSize: '11px', fontWeight: '700', color: cfg.color, marginBottom: '6px' }}>
                          {alert.title}
                        </div>

                        <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.45, margin: '0 0 10px' }}>
                          {alert.explanation}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid var(--color-border-subtle)',
                          paddingTop: '8px',
                        }}
                      >
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {alert.current_count} active cybercase{alert.current_count === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const found = allCyberHotspots.find(
                              (h) =>
                                h.zone_name?.toLowerCase() === alert.zone?.toLowerCase() ||
                                h.station_code === alert.station_code
                            );
                            if (found) {
                              handleSelectCyberHotspot(found);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: cfg.color,
                            fontSize: '11px',
                            fontWeight: '800',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: 0,
                          }}
                          title={`Focus ${alert.zone} on Cybercrime GIS Map`}
                          aria-label={`Inspect ${alert.zone}`}
                        >
                          [INSPECT] <ChevronRightIcon size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 10.2 & 10.3 CYBERCRIME GIS LAYER & CATEGORY / HOTSPOT DUAL VIEW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 'var(--space-md)', alignItems: 'stretch' }}>
            {/* Left: GIS Map */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Filter Pills and Sector Search */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      marginRight: '2px',
                    }}
                  >
                    THREAT LEVEL:
                  </span>
                  {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((level) => {
                    const cfg = {
                      ALL:      { color: 'var(--palette-charcoal-slate)', bg: 'var(--palette-oatmeal)', border: 'var(--color-border)', activeBg: 'var(--palette-charcoal-slate)', activeColor: '#fff' },
                      Critical: { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)', border: 'rgba(124, 58, 237, 0.4)', activeBg: '#7C3AED', activeColor: '#fff' },
                      High:     { color: '#C026D3', bg: 'rgba(192, 38, 211, 0.1)', border: 'rgba(192, 38, 211, 0.4)', activeBg: '#C026D3', activeColor: '#fff' },
                      Medium:   { color: '#0284C7', bg: 'rgba(2, 132, 199, 0.1)', border: 'rgba(2, 132, 199, 0.4)', activeBg: '#0284C7', activeColor: '#fff' },
                      Low:      { color: '#0D9488', bg: 'rgba(13, 148, 136, 0.1)', border: 'rgba(13, 148, 136, 0.4)', activeBg: '#0D9488', activeColor: '#fff' },
                    }[level];
                    const isActive = cyberFilterThreat === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCyberFilterThreat(level)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          border: `1px solid ${isActive ? cfg.activeBg : cfg.border}`,
                          backgroundColor: isActive ? cfg.activeBg : cfg.bg,
                          color: isActive ? cfg.activeColor : cfg.color,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>

                {/* Primary Cyber Sector Search */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <input
                    type="text"
                    placeholder="Search cyber sectors..."
                    value={cyberSearchQuery}
                    onChange={(e) => handleCyberSearchChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '5px 8px 5px 28px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                    aria-label="Search cyber sectors"
                  />
                  <SearchIcon
                    size={12}
                    style={{
                      position: 'absolute',
                      left: '9px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                    }}
                  />
                </div>
              </div>

              {/* Map View Container with Cybercrime Hotspots Layer */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, minHeight: '520px', width: '100%', position: 'relative' }}>
                  {cyberMapError ? (
                    <div
                      style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        backgroundColor: '#EEE9DF',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                      }}
                    >
                      <AlertCircleIcon size={24} style={{ color: 'var(--color-critical)' }} />
                      <div>{cyberMapError}</div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={fetchData}
                        style={{ fontSize: '11px', padding: '4px 12px' }}
                      >
                        <RefreshIcon size={12} />
                        <span>Retry GIS Sync</span>
                      </button>
                    </div>
                  ) : (
                    <CyberMap
                      center={mapCenter}
                      zoom={mapZoom}
                      cyberHotspots={filteredCyberHotspots}
                      showCyberHotspots={true}
                      selectedCyberHotspot={selectedCyberHotspot}
                      onSelectCyberHotspot={handleSelectCyberHotspot}
                      showSearchBar={false}
                      autoFit={false}
                    />
                  )}
                </div>

                {/* GIS Cybercrime Legend Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    borderTop: '1px solid var(--color-border)',
                    backgroundColor: 'var(--palette-chalk)',
                    fontSize: '10.5px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0D9488' }} />
                      <span>LOW THREAT</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284C7' }} />
                      <span>MEDIUM THREAT</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#C026D3' }} />
                      <span>HIGH THREAT</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7C3AED' }} />
                      <span>CRITICAL THREAT</span>
                    </div>
                  </div>

                  <div style={{ color: '#7C3AED', fontWeight: '700' }}>
                    🛡️ Click any cyber hotspot marker for deep intelligence triage
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Cyber Hotspot Detail & Ranked Category Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {selectedCyberHotspot ? (
                <div className="card" style={{ padding: '16px 18px', backgroundColor: '#FAF7F6', border: '1px solid var(--color-border)' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <ShieldIcon size={16} style={{ color: getCyberThreatBadgeConfig(selectedCyberHotspot.threat_level).color }} />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-mono)' }}>
                          CYBERCRIME HOTSPOT INTELLIGENCE
                        </span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-primary)', margin: 0 }}>
                        {selectedCyberHotspot.zone_name}
                      </h3>
                      <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Jurisdiction: {selectedCyberHotspot.station_name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '3px',
                          backgroundColor: getCyberThreatBadgeConfig(selectedCyberHotspot.threat_level).bg,
                          color: getCyberThreatBadgeConfig(selectedCyberHotspot.threat_level).color,
                          fontFamily: 'var(--font-mono)',
                          display: 'inline-block',
                        }}
                      >
                        {getCyberThreatBadgeConfig(selectedCyberHotspot.threat_level).label}
                      </span>
                    </div>
                  </div>

                  {/* DOMINANT CYBER THREAT BANNER */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'rgba(124, 58, 237, 0.08)',
                      borderLeft: `4px solid ${getCyberThreatBadgeConfig(selectedCyberHotspot.threat_level).color}`,
                      borderRadius: 'var(--radius-xs)',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        DOMINANT CYBER PATTERN
                      </span>
                      {getTrendBadge(selectedCyberHotspot.trend)}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                      {selectedCyberHotspot.dominant_type}
                    </div>
                  </div>

                  {/* TELEMETRY 4-GRID */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ padding: '8px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '9.5px', textTransform: 'uppercase' }}>Cybercrimes</div>
                      <div style={{ fontWeight: '800', color: '#7C3AED', fontSize: '14px', marginTop: '2px' }}>
                        {selectedCyberHotspot.cybercrime_count} ({selectedCyberHotspot.cybercrime_ratio}%)
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '9.5px', textTransform: 'uppercase' }}>Physical Crimes</div>
                      <div style={{ fontWeight: '800', color: 'var(--color-text-primary)', fontSize: '14px', marginTop: '2px' }}>
                        {selectedCyberHotspot.physical_crime_count}
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '9.5px', textTransform: 'uppercase' }}>Fraud Cases</div>
                      <div style={{ fontWeight: '800', color: 'var(--color-critical)', fontSize: '14px', marginTop: '2px' }}>
                        {selectedCyberHotspot.fraud_count}
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '9.5px', textTransform: 'uppercase' }}>Phishing Scams</div>
                      <div style={{ fontWeight: '800', color: '#0284C7', fontSize: '14px', marginTop: '2px' }}>
                        {selectedCyberHotspot.phishing_count}
                      </div>
                    </div>
                  </div>

                  {/* Contextual AI Risk Score Box */}
                  {selectedCyberHotspot.ai_context && (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(40, 85, 112, 0.08)',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-operational-border)',
                        marginBottom: '12px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', color: 'var(--palette-coastal-blue)' }}>
                          AI PREDICTIVE RISK (CONTEXT)
                        </span>
                        <span style={{ fontWeight: '900', color: 'var(--color-text-primary)' }}>
                          {selectedCyberHotspot.ai_context.ai_risk_score?.toFixed(1)} / 100
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Level: <strong>{selectedCyberHotspot.ai_context.ai_risk_level}</strong> | Model: {selectedCyberHotspot.ai_context.ai_model_status}
                      </div>
                    </div>
                  )}

                  {/* Plain-English Database Explanation */}
                  <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                      OPERATIONAL INTELLIGENCE RATIONALE
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.45, margin: 0 }}>
                      {selectedCyberHotspot.explanation}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  Select any cyber hotspot from the map or rankings list to view operational analytics.
                </div>
              )}

              {/* 10.3 RANKED CYBERCRIME HOTSPOTS / CATEGORY PANEL */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--palette-chalk)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span className="card-title">Ranked Cybercrime Jurisdictions</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {filteredCyberHotspots.length} Sectors
                  </span>
                </div>

                {filteredCyberHotspots.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {cyberSearchQuery.trim() ? `No matching cyber sector found for "${cyberSearchQuery}"` : 'No cybercrime hotspots match active filters.'}
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '220px', overflowY: 'auto' }}>
                    {filteredCyberHotspots.map((hotspot, idx) => {
                      const isSelected = selectedCyberHotspot?.station_id === hotspot.station_id || selectedCyberHotspot?.zone_name === hotspot.zone_name;
                      const cfg = getCyberThreatBadgeConfig(hotspot.threat_level);

                      return (
                        <li
                          key={idx}
                          onClick={() => handleSelectCyberHotspot(hotspot)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--color-border)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                            transition: 'background-color var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.color }} />
                            <div>
                              <div style={{ color: 'var(--color-text-primary)', fontWeight: isSelected ? '800' : '600' }}>
                                #{idx + 1} {hotspot.zone_name}
                              </div>
                              <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)' }}>
                                {hotspot.dominant_type}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: cfg.color, fontWeight: '800', fontSize: '12px' }}>
                                {hotspot.cybercrime_count} Cyber
                              </div>
                              <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)' }}>
                                {hotspot.cybercrime_ratio}% ratio
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCyberHotspot(hotspot);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: cfg.color,
                                fontSize: '10.5px',
                                fontWeight: '800',
                                fontFamily: 'var(--font-mono)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '2px 4px',
                              }}
                              title={`Center and inspect ${hotspot.zone_name} on Cyber GIS Map`}
                              aria-label={`Inspect hotspot ${hotspot.zone_name}`}
                            >
                              [INSPECT] <ChevronRightIcon size={12} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* 10.4 PHYSICAL + CYBERCRIME CORRELATION ANALYSIS */}
          <div className="card" style={{ padding: '16px 20px', backgroundColor: '#FAF7F6' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ActivityIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
                <span className="card-title" style={{ margin: 0, fontSize: '13.5px', letterSpacing: '0.5px' }}>
                  PHYSICAL + CYBERCRIME CORRELATION ANALYSIS
                </span>
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                CROSS-DOMAIN PATTERN CONVERGENCE &amp; COMPARISON
              </span>
            </div>

            {cyberCorrelations.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                INSUFFICIENT HISTORICAL DATA TO CALCULATE CRIME DOMAIN CORRELATIONS
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(cyberCorrelations.length, 3)}, 1fr)`,
                  gap: 'var(--space-md)',
                }}
              >
                {cyberCorrelations.map((corr, cIdx) => {
                  return (
                    <div
                      key={cIdx}
                      style={{
                        backgroundColor: 'var(--palette-chalk)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                            {corr.zone.toUpperCase()}
                          </span>
                          {getCorrelationBadge(corr.correlation_status)}
                        </div>

                        {/* Metric Comparison Table */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '6px',
                            padding: '6px 8px',
                            backgroundColor: 'var(--palette-oatmeal)',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontFamily: 'var(--font-mono)',
                            marginBottom: '10px',
                          }}
                        >
                          <div>
                            <strong>Physical Crime:</strong> {corr.physical_crimes}
                          </div>
                          <div>
                            <strong>Cybercrime:</strong> <span style={{ color: '#7C3AED', fontWeight: '800' }}>{corr.cybercrimes}</span>
                          </div>
                          <div>
                            <strong>Physical Trend:</strong> {corr.physical_trend}
                          </div>
                          <div>
                            <strong>Cyber Trend:</strong> <span style={{ fontWeight: '800' }}>{corr.cyber_trend}</span>
                          </div>
                        </div>

                        <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.45, margin: 0 }}>
                          {corr.explanation}
                        </p>
                      </div>

                      <div
                        style={{
                          borderTop: '1px solid var(--color-border-subtle)',
                          paddingTop: '8px',
                          marginTop: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <span>Cyber Ratio: <strong>{corr.cybercrime_ratio}%</strong></span>
                        <span>{corr.station_name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
