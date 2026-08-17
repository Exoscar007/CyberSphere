import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

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
      console.error("Failed to fetch operational history", error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToAudit = (incidentId) => {
    // Navigate relative to current path (e.g. /station/history/123 or /city/history/123)
    navigate(`${incidentId}`);
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'RESOLVED') return 'badge--success';
    if (status === 'OPEN') return 'badge--info';
    return 'badge--danger';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontWeight: 'bold' }}>OPERATIONAL HISTORY & AUDIT LOGS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>PERIOD:</span>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="form-input"
            style={{ backgroundColor: '#0e1422', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-family-mono)', width: 'auto' }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="form-input"
            style={{ backgroundColor: '#0e1422', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-family-mono)', width: 'auto' }}
          >
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

      {/* Main List Container */}
      <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflowY: 'auto', padding: '12px' }}>
        {loading ? (
          <div className="loading-spinner">LOADING OPERATIONAL HISTORY...</div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📜</div>
            <div className="empty-state__title">NO OPERATIONAL HISTORY FOUND</div>
            <div className="empty-state__text">No incident audit logs recorded for the selected period.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((incident) => (
              <div 
                key={incident.id} 
                onClick={() => navigateToAudit(incident.id)} 
                style={{ 
                  backgroundColor: '#0d1320', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '10px 14px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justify: 'space-between', 
                  alignItems: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary-light)' }}>
                      INCIDENT #{incident.id}: {incident.title.toUpperCase()}
                    </span>
                    <span className={`badge ${getStatusBadgeClass(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{incident.description}</p>
                  <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', display: 'flex', gap: '16px' }}>
                    <span>DEPLOYMENTS: {incident.patrol_assignments?.length || 0}</span>
                    <span>EVIDENCE ITEMS: {incident.evidence?.length || 0}</span>
                    <span>DATE: {new Date(incident.date_occurred).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ color: 'var(--color-primary-light)', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-family-mono)' }}>
                  VIEW AUDIT &rarr;
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

