import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  HistoryIcon,
  ChevronRightIcon,
  FilterIcon,
} from '../../../components/common/Icons';

export default function OperationalHistoryPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, [year, month]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/reports/operational-history/?year=${year}&month=${month}`);
      setHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch operational history', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToAudit = (incidentId) => {
    navigate(`${incidentId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Operational Audit & Case History</h1>
          <p className="page-header__subtitle">
            Cryptographic audit trail of dispatched incidents, patrol deployments, and collected evidence
          </p>
        </div>

        <div className="filter-pills-bar">
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', marginRight: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FilterIcon size={12} />
            Period:
          </span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="filter-select">
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="filter-select">
            <option value={1}>JAN</option>
            <option value={2}>FEB</option>
            <option value={3}>MAR</option>
            <option value={4}>APR</option>
            <option value={5}>MAY</option>
            <option value={6}>JUN</option>
            <option value={7}>JUL</option>
            <option value={8}>AUG</option>
            <option value={9}>SEP</option>
            <option value={10}>OCT</option>
            <option value={11}>NOV</option>
            <option value={12}>DEC</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading archive records from cold storage...</div>
      ) : history.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state__icon">
            <HistoryIcon size={24} />
          </div>
          <div className="empty-state__title">No operational records found</div>
          <div className="empty-state__text">No incidents or patrol dispatches recorded for this period.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          {history.map((incident) => (
            <div
              key={incident.id}
              onClick={() => navigateToAudit(incident.id)}
              className="card"
              style={{
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    INCIDENT #{incident.id}: {incident.title}
                  </span>
                  <span className={`badge badge--${incident.status === 'RESOLVED' ? 'verified' : incident.status === 'OPEN' ? 'operational' : 'high'}`}>
                    {incident.status}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {incident.description}
                </p>
                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    gap: '14px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span>Deployments: {incident.patrol_assignments?.length || 0}</span>
                  <span>Evidence Items: {incident.evidence?.length || 0}</span>
                  <span>Occurred: {new Date(incident.date_occurred).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ color: 'var(--palette-sage)', fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span>Inspect Audit</span>
                <ChevronRightIcon size={12} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
