import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

export default function OperationalHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/reports/operational-history/');
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

  if (loading) {
    return <div style={{ padding: '24px', color: 'white' }}>Loading operational history...</div>;
  }

  return (
    <div style={{ padding: '24px', color: 'white' }}>
      <h1 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 'bold' }}>Operational History</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Complete audit trail of all dispatched and completed incidents, assignments, and evidence.
      </p>

      {history.length === 0 ? (
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
