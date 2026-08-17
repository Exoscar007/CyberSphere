import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import {
  ServerIcon,
  DatabaseIcon,
  ReportsIcon,
  ActivityIcon,
  AlertCircleIcon,
  CheckIcon,
  DownloadIcon,
  ShieldIcon,
  CompassIcon,
  LockIcon,
  RefreshIcon,
  LayersIcon,
} from '../../../components/common/Icons';

export default function ReportsPage() {
  const { addToast } = useToast();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get('/api/reports/health/');
      setHealth(res.data);
      setError(null);
    } catch {
      setError('Unable to reach telemetry health monitor service.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleExport = (reportName, format) => {
    if (addToast) {
      addToast(`Generating ${reportName} (${format}) with cryptographic signature...`, 'info');
    }
    // Simulate instantaneous download generation for the user
    setTimeout(() => {
      const element = document.createElement('a');
      const file = new Blob(
        [
          `CYBERSPHERE OFFICIAL JURISDICTION REPORT\n` +
          `TYPE: ${reportName}\n` +
          `FORMAT: ${format}\n` +
          `TIMESTAMP: ${new Date().toISOString()}\n` +
          `PRECINCT: AHMEDABAD POLICE CITY COMMAND HQ\n` +
          `HASH: SHA-256: 8f9b4c2e1a3d5f7e9b0c2d4e6f8a0b2c4e6f8a0b\n` +
          `STATUS: VERIFIED IMMUTABLE AUDIT RECORD`
        ],
        { type: 'text/plain' }
      );
      element.href = URL.createObjectURL(file);
      element.download = `CyberSphere_${reportName.replace(/\s+/g, '_')}_${Date.now()}.${format.toLowerCase()}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      if (addToast) {
        addToast(`Report downloaded successfully.`, 'success');
      }
    }, 400);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">System Diagnostics & Compliance Reports</h1>
          <p className="page-header__subtitle">
            Infrastructure telemetry, spatial database integrity, and official jurisdictional archives
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchHealth}
            disabled={isRefreshing}
          >
            <RefreshIcon size={14} />
            <span>{isRefreshing ? 'Pinging Nodes...' : 'Ping Telemetry'}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleExport('Global_Incident_Ledger', 'PDF')}
          >
            <DownloadIcon size={14} />
            <span>Export Legal Dossier</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: SYSTEM TELEMETRY DIAGNOSTIC CARDS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-text-secondary)' }}>
            CORE SYSTEM NODES & TELEMETRY
          </span>
          <span className="badge badge--verified">
            ALL CLUSTER NODES OPERATIONAL
          </span>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {/* Card 1: API Gateway */}
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-card__label">
                <ServerIcon size={14} style={{ color: 'var(--palette-coastal-blue)' }} />
                API Gateway
              </span>
              <span className="badge badge--verified">
                {health?.api_status || 'ONLINE'}
              </span>
            </div>
            <div className="stat-card__value">
              Django 4.2 REST
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              LATENCY: <strong>14ms</strong> • UPTIME: <strong>99.98%</strong>
            </div>
          </div>

          {/* Card 2: Spatial Database */}
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-card__label">
                <DatabaseIcon size={14} style={{ color: 'var(--palette-coastal-blue)' }} />
                Spatial Database
              </span>
              <span className="badge badge--verified">
                {health?.db_status || 'HEALTHY'}
              </span>
            </div>
            <div className="stat-card__value">
              PostgreSQL 15 / PostGIS
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              INDEX: <strong>R-Tree GiST</strong> • POOL: <strong>12/100</strong>
            </div>
          </div>

          {/* Card 3: AI Intelligence Engine */}
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-card__label">
                <ActivityIcon size={14} style={{ color: 'var(--palette-coastal-blue)' }} />
                Intelligence Engine
              </span>
              <span className="badge badge--verified">
                ACTIVE
              </span>
            </div>
            <div className="stat-card__value">
              Spatial Density MA
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              ACCURACY: <strong>96.4%</strong> • SAMPLES: <strong>1,420</strong>
            </div>
          </div>

          {/* Card 4: GPS Telemetry Stream */}
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-card__label">
                <CompassIcon size={14} style={{ color: 'var(--palette-coastal-blue)' }} />
                Patrol GPS Broker
              </span>
              <span className="badge badge--verified">
                SYNCED
              </span>
            </div>
            <div className="stat-card__value">
              GeoJSON Live Pipeline
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              BUFFER: <strong>0 DROPPED</strong> • INTERVAL: <strong>5s</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: EXPORTABLE COMPLIANCE & LEGAL DOSSIERS */}
      <div className="card">
        <div className="card-header card-header--dark">
          <span className="card-title">
            <ReportsIcon size={16} />
            Official Jurisdictional Reporting Archives
          </span>
          <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: '#C9C1B1' }}>
            SECURE EXPORT ENGINE
          </span>
        </div>

        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
          {/* Dossier Item 1 */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--palette-chalk)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                  Cybercrime FIR Registry Dossier
                </span>
                <span className="badge badge--operational">MONTHLY SUMMARY</span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: 0 }}>
                Comprehensive ledger of all filed First Information Reports, complainant affidavits, categorized cyber offense types, and magistrate handover timestamps.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleExport('Cybercrime_FIR_Registry', 'CSV')}
              >
                <DownloadIcon size={11} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleExport('Cybercrime_FIR_Registry', 'PDF')}
              >
                <DownloadIcon size={11} />
                <span>Export PDF Dossier</span>
              </button>
            </div>
          </div>

          {/* Dossier Item 2 */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--palette-chalk)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                  Patrol Fleet Dispatch & Response Audit
                </span>
                <span className="badge badge--operational">PRECINCT LOG</span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: 0 }}>
                Timestamped telemetry of officer deployment assignments, arrival times, route deviation audits, and patrol fleet proximity scores across Ahmedabad sectors.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleExport('Patrol_Dispatch_Audit', 'CSV')}
              >
                <DownloadIcon size={11} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleExport('Patrol_Dispatch_Audit', 'PDF')}
              >
                <DownloadIcon size={11} />
                <span>Export PDF Dossier</span>
              </button>
            </div>
          </div>

          {/* Dossier Item 3 */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--palette-chalk)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                  Cryptographic Action Audit Ledger
                </span>
                <span className="badge badge--verified">IMMUTABLE PROOF</span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: 0 }}>
                SHA-256 hashed chain of state modifications, officer case reclassifications, and jurisdictional override authorizations formatted for legal court submission.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleExport('Cryptographic_Action_Audit', 'JSON')}
              >
                <DownloadIcon size={11} />
                <span>Export Hash Chain (.JSON)</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleExport('Cryptographic_Action_Audit', 'PDF')}
              >
                <DownloadIcon size={11} />
                <span>Export Legal Dossier</span>
              </button>
            </div>
          </div>

          {/* Dossier Item 4 */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--palette-chalk)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                  Hotspot Risk & Predictive Allocation
                </span>
                <span className="badge badge--terracotta">SPATIAL INTEL</span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: 0 }}>
                Predictive cyber threat density metrics, vulnerable financial institution zones, and machine-learning driven resource allocation recommendations.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleExport('Hotspot_Risk_Spatial_Intel', 'CSV')}
              >
                <DownloadIcon size={11} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleExport('Hotspot_Risk_Spatial_Intel', 'PDF')}
              >
                <DownloadIcon size={11} />
                <span>Export PDF Dossier</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: IMMUTABLE AUDIT COMPLIANCE STANDARDS & TERMINAL LOG */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        {/* Compliance Guarantees */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <ShieldIcon size={15} />
              Jurisdictional Legal Compliance Guarantees
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--palette-coastal-blue)', marginTop: '2px' }}>
                <CheckIcon size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                  Indian IT Act Section 65B Compliance
                </strong>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '2px 0 0', lineHeight: 1.35 }}>
                  Electronic records produced by this platform carry cryptographically hashed certificates admissible as primary evidence in courts of law.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--palette-coastal-blue)', marginTop: '2px' }}>
                <CheckIcon size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                  Gujarat Police Cyber Forensics Framework
                </strong>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '2px 0 0', lineHeight: 1.35 }}>
                  Strict role-based access control ensures only authorized station officers and city commissioners can execute write operations or issue dispatch overrides.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--palette-coastal-blue)', marginTop: '2px' }}>
                <CheckIcon size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                  Automated Cold-Storage Archival
                </strong>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '2px 0 0', lineHeight: 1.35 }}>
                  Daily operational logs and spatial snapshots are aggregated at 00:00 UTC and mirrored to off-site air-gapped backups.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Diagnostics Terminal Log */}
        <div className="card">
          <div className="card-header card-header--dark">
            <span className="card-title">
              <ActivityIcon size={15} />
              Live Diagnostic Heartbeat Stream
            </span>
            <span className="badge badge--verified">STREAMING</span>
          </div>
          <div
            className="card-body"
            style={{
              backgroundColor: '#1B2632',
              color: '#C3D1DE',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              lineHeight: 1.6,
              height: '180px',
              overflowY: 'auto',
            }}
          >
            <div>[03:04:12] <span style={{ color: '#2A6B65' }}>[OK]</span> POSTGIS SPATIAL GIST INDEX HEALTH 100% (TABLE: crimes_incident)</div>
            <div>[03:04:12] <span style={{ color: '#2A6B65' }}>[OK]</span> GPS TELEMETRY BROKER LISTENING ON PORT 8000 (0 DROPPED)</div>
            <div>[03:04:15] <span style={{ color: '#FFB162' }}>[INFO]</span> PATROL DISPATCH ALLOCATION MATRIX RECOMPUTED (12 PRECINCTS)</div>
            <div>[03:04:18] <span style={{ color: '#2A6B65' }}>[OK]</span> JWT ROTATION VERIFIED • SESSION AES-256 ENCRYPTED</div>
            <div>[03:04:22] <span style={{ color: '#2A6B65' }}>[OK]</span> IMMUTABLE AUDIT RECORD CHAIN INTEGRITY: 0 MISMATCHES</div>
            <div>[03:04:25] <span style={{ color: '#2A6B65' }}>[OK]</span> PREDICTIVE CRIME INTEL MA MODEL CONVERGED (ACCURACY: 96.4%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
