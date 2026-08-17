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

  // Use loading state gracefully in render instead of early return, to keep UI stable
  // if (loading) {
  //   return <div style={{ padding: '24px', color: 'white' }}>Loading operational history...</div>;
  // }

  return (
    <div style={{ padding: '24px', color: 'white', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 'bold' }}>Operational History</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Complete audit trail of all dispatched and completed incidents, assignments, and evidence.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginRight: '8px' }}>FILTER:</span>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ backgroundColor: 'var(--color-bg-dark)', color: 'white', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', fontFamily: 'var(--font-family-mono)' }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{ backgroundColor: 'var(--color-bg-dark)', color: 'white', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', fontFamily: 'var(--font-family-mono)' }}
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

      {loading ? (
        <div style={{ padding: '24px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', textAlign: 'center' }}>
          Loading operational history...
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding: '24px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', textAlign: 'center' }}>
          No operational history found.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {history.map((incident) => (
            <div key={incident.id} onClick={() => navigateToAudit(incident.id)} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Incident #{incident.id}: {incident.title}</h3>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '10px', 
                    fontWeight: 'bold',
                    backgroundColor: incident.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.2)' : (incident.status === 'OPEN' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                    color: incident.status === 'RESOLVED' ? '#10B981' : (incident.status === 'OPEN' ? '#3B82F6' : '#EF4444')
                  }}>
                    {incident.status}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>{incident.description}</p>
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', gap: '16px' }}>
                  <span>Deployments: {incident.patrol_assignments?.length || 0}</span>
                  <span>Evidence Items: {incident.evidence?.length || 0}</span>
                  <span>Date: {new Date(incident.date_occurred).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ color: 'var(--color-primary)' }}>
                View Audit &rarr;
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
