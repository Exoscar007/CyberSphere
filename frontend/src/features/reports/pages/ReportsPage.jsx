import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function ReportsPage() {
  const [health, setHealth] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [healthRes, reportRes] = await Promise.allSettled([
          api.get('/api/reports/health/'),
          api.get('/api/reports/crime-summary/'),
        ]);
        if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
        if (reportRes.status === 'fulfilled') setReport(reportRes.value.data);
      } catch {
        setError('Unable to load reports.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-spinner" style={{ padding: '24px' }}>LOADING SYSTEM REPORTS...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)', height: '100%', overflowY: 'auto' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontWeight: 'bold' }}>SYSTEM REPORTS & INFRASTRUCTURE HEALTH CONSOLE</span>
      </div>

      {error && <div className="alert alert--error" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-family-mono)', margin: 0 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'start' }}>
        
        {/* System Health Card */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
            SYSTEM INFRASTRUCTURE HEALTH
          </div>
          {health ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', fontFamily: 'var(--font-family-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0d1320', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text)' }}>API Gateway Status</span>
                <span className={`badge ${health.status === 'UP' ? 'badge--success' : 'badge--danger'}`}>● {health.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0d1320', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text)' }}>PostgreSQL Database</span>
                <span className={`badge ${health.database === 'OK' ? 'badge--success' : 'badge--danger'}`}>● {health.database}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0d1320', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text)' }}>Health Check Timestamp</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                  {health.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state__title">Health data unavailable</div>
              <div className="empty-state__text">The backend may be unreachable.</div>
            </div>
          )}
        </div>

        {/* Crime Summary Report Card */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
            CRIME SUMMARY REPORT
          </div>
          {report ? (
            <div style={{ padding: '12px', fontFamily: 'var(--font-family-mono)' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                TYPE: {report.report_type?.toUpperCase() || 'CRIME SUMMARY'} | GENERATED: {report.generated_at ? new Date(report.generated_at).toLocaleString() : '—'}
              </div>
              {report.data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(report.data).map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#0d1320', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '10px' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{key.replace(/_/g, ' ').toUpperCase()}</span>
                      <span style={{ color: 'var(--color-primary-light)', fontWeight: 'bold' }}>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state__title">Report data unavailable</div>
              <div className="empty-state__text">Crime summary requires a running backend.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

