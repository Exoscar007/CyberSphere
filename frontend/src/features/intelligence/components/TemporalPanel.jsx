import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { HistoryIcon, AlertCircleIcon } from '../../../components/common/Icons';

export default function TemporalPanel() {
  const [stats, setStats] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, forecastRes] = await Promise.all([
          api.get('/api/intelligence/temporal-stats/'),
          api.get('/api/ai/forecast/'),
        ]);
        setStats(statsRes.data);
        setForecast(forecastRes.data);
      } catch (err) {
        setError('Failed to load temporal data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-spinner">Loading temporal and predictive telemetry...</div>;
  }
  if (error) {
    return (
      <div className="alert alert--error" role="alert">
        <AlertCircleIcon size={16} />
        <span>{error}</span>
      </div>
    );
  }

  const maxHourly = stats?.by_hour?.length ? Math.max(...stats.by_hour.map((h) => h.count)) : 1;
  const maxDaily = stats?.by_day_of_week?.length ? Math.max(...stats.by_day_of_week.map((d) => d.count)) : 1;

  return (
    <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-md)',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 'var(--space-xs)',
        }}
      >
        <span className="card-title">
          <HistoryIcon size={16} />
          Temporal Analytics & 7-Day Predictive Forecasting
        </span>
        {stats?.period && (
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            DATA ARCHIVE: {new Date(stats.period.start).toLocaleDateString()} — {new Date(stats.period.end).toLocaleDateString()} ({stats.period.total_incidents} INCIDENTS)
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-lg)' }}>
        {/* Left: Historical Distributions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Hourly Histogram */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700' }}>
              Hourly Incident Distribution (24h)
            </div>
            <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', gap: '2px', borderBottom: '1px solid var(--color-border)', paddingBottom: '2px' }}>
              {stats?.by_hour?.map((item) => (
                <div
                  key={item.hour}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                  title={`${item.label}: ${item.count}`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${(item.count / maxHourly) * 100}%`,
                      minHeight: '2px',
                      backgroundColor: 'var(--palette-lilac)',
                      opacity: item.count === maxHourly ? 1 : 0.65,
                      borderRadius: '1px',
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
              <span>00:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </div>

          {/* DOW Histogram */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700' }}>
              Day of Week Distribution
            </div>
            <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '1px solid var(--color-border)', paddingBottom: '2px' }}>
              {stats?.by_day_of_week?.map((item) => (
                <div
                  key={item.day_number}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                  title={`${item.day}: ${item.count}`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${(item.count / maxDaily) * 100}%`,
                      minHeight: '2px',
                      backgroundColor: 'var(--palette-slate-blue)',
                      opacity: item.day_number >= 5 ? 0.95 : 0.6,
                      borderRadius: '1px',
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              {stats?.by_day_of_week?.map((item) => (
                <span key={item.day_number} style={{ width: '14.2%', textAlign: 'center' }}>
                  {item.day.substring(0, 1)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Predictive Forecast */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--color-high)', textTransform: 'uppercase', fontWeight: '700' }}>
              7-Day Operational AI Forecast
            </div>
            {forecast?.validation && (
              <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                MODEL: {forecast.model === 'weighted_seasonal_moving_average' ? 'WSMA' : forecast.model} | MAE: {forecast.validation.model_mae?.toFixed(1)}
              </div>
            )}
          </div>

          {forecast?.status === 'insufficient_data' ? (
            <div className="alert alert--info" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, fontSize: '11px' }}>
              Insufficient history to generate forecast (Needs {forecast.days_required} days, has {forecast.days_available}).
            </div>
          ) : forecast?.forecast ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-xs)', flex: 1 }}>
              {forecast.forecast.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--palette-chalk)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '8px 4px',
                  }}
                >
                  <div style={{ fontSize: '9px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {item.day_of_week.substring(0, 3)}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-high)', margin: '3px 0', fontFamily: 'var(--font-mono)' }}>
                    {Math.round(item.predicted_count)}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(item.date).getDate()} {new Date(item.date).toLocaleString('default', { month: 'short' }).toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '6px', textAlign: 'right', fontStyle: 'italic' }}>
            {forecast?.disclaimer || '* Estimates based on historical patterns. Not for emergency tactical deployment.'}
          </div>
        </div>
      </div>
    </div>
  );
}
