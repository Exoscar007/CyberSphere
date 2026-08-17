import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { FileTextIcon, AlertCircleIcon, LocationPinIcon } from '../../../components/common/Icons';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Investigator Case Workspace</h1>
          <p className="page-header__subtitle">Assigned cases, investigation ledgers, and forensic review</p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

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
          <span className="card-title">
            <FileTextIcon size={16} />
            My Active Cases ({firs.length})
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>FILTER: ALL</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading case ledger...</div>
        ) : firs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <FileTextIcon size={24} />
            </div>
            <div className="empty-state__title">No Active Cases</div>
            <div className="empty-state__text">You currently have no cases assigned to your call-sign.</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>FIR Number</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Location GPS</th>
                  <th>Date Registered</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {firs.map((fir) => (
                  <tr key={fir.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{fir.fir_number}</td>
                    <td>
                      <span className="badge badge--high">HIGH</span>
                    </td>
                    <td>
                      <span className={`badge badge--${fir.status === 'OPEN' ? 'operational' : fir.status === 'CLOSED' ? 'verified' : 'high'}`}>
                        {fir.status || 'OPEN'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {fir.location && fir.location.coordinates ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <LocationPinIcon size={11} />
                          {fir.location.coordinates[1].toFixed(3)}, {fir.location.coordinates[0].toFixed(3)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {fir.created_at ? new Date(fir.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '10px' }}>
                        Inspect Case
                      </button>
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
