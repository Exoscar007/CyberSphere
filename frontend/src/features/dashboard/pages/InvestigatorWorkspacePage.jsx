import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function InvestigatorWorkspacePage() {
  const [firs, setFirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/crimes/fir/');
        setFirs(response.data);
      } catch (err) {
        setError('Failed to load active cases.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Investigator Workspace</h1>
        <p className="page-header__subtitle">My Active Cases & Investigations</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-md) var(--space-lg)', backgroundColor: 'var(--color-bg-dark)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>My Active Cases ({firs.length})</div>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>FILTER: OPEN</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>SORT: PRIORITY</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading cases...</div>
        ) : firs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📂</div>
            <div className="empty-state__title">No Active Cases</div>
            <div className="empty-state__text">You currently have no cases assigned to you.</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Location (Lat/Lng)</th>
                  <th>Assigned Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {firs.map(fir => (
                  <tr key={fir.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-info)' }}>{fir.fir_number}</td>
                    <td>
                      <span className="badge badge--danger">HIGH</span>
                    </td>
                    <td>
                      <span className={`badge badge--${fir.status === 'OPEN' ? 'warning' : fir.status === 'CLOSED' ? 'success' : 'info'}`}>
                        {fir.status}
                      </span>
                    </td>
                    <td>
                      {fir.location && fir.location.coordinates ? 
                        `${fir.location.coordinates[1].toFixed(4)}, ${fir.location.coordinates[0].toFixed(4)}` : 
                        '—'}
                    </td>
                    <td>{fir.date_reported ? new Date(fir.date_reported).toLocaleDateString() : '—'}</td>
                    <td>
                      <button className="btn btn--secondary" style={{ padding: '4px 8px', fontSize: '10px' }}>OPEN CASE</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
