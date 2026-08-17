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

  if (loading) return <div className="loading-spinner">Loading reports...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Reports & System Health</h1>
        <p className="page-header__subtitle">Monitor system status and view crime summaries</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
        {/* Health */}
        <div className="card">
          <div className="card__title" style={{ marginBottom: 'var(--space-lg)' }}>System Health</div>
          {health ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 500 }}>API Status</span>
                <span className={`badge badge--${health.status === 'UP' ? 'success' : 'danger'}`}>{health.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 500 }}>Database</span>
                <span className={`badge badge--${health.database === 'OK' ? 'success' : 'danger'}`}>{health.database}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 500 }}>Timestamp</span>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  {health.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__title">Health data unavailable</div>
              <div className="empty-state__text">The backend may be unreachable.</div>
            </div>
          )}
        </div>

        {/* Crime Summary */}
        <div className="card">
          <div className="card__title" style={{ marginBottom: 'var(--space-lg)' }}>Crime Summary Report</div>
          {report ? (
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
                Report Type: {report.report_type || 'Crime Summary'} | Generated: {report.generated_at ? new Date(report.generated_at).toLocaleString() : '—'}
              </div>
              {report.data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {Object.entries(report.data).map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 600 }}>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__title">Report data unavailable</div>
              <div className="empty-state__text">Crime summary requires a running backend.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
