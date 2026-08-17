import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function ComplaintPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ description: '' });

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/crimes/complaints/');
      setComplaints(res.data);
    } catch {
      setError('Unable to load complaints. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/crimes/complaints/', formData);
      setFormData({ description: '' });
      setSuccess('Complaint filed successfully.');
      fetchComplaints();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit complaint.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filtered = complaints.filter((c) =>
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontWeight: 'bold' }}>PUBLIC COMPLAINT MANAGEMENT</span>
        {error && <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</span>}
        {success && <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{success}</span>}
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '8px', minHeight: 0 }}>
        {/* File Complaint Card */}
        <div style={{ flex: '0 0 380px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: '#0d1320' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'var(--font-family-mono)' }}>FILE NEW COMPLAINT</span>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
              <label className="form-label">DESCRIPTION</label>
              <textarea 
                name="description" 
                value={formData.description}
                onChange={(e) => setFormData({ description: e.target.value })}
                className="form-input" 
                required 
                rows="8" 
                placeholder="Describe the complaint in detail..." 
                style={{ fontFamily: 'var(--font-family-mono)', flex: 1, resize: 'none' }}
              />
            </div>
            <button type="submit" className="btn btn--primary btn--full" disabled={submitLoading} style={{ height: '34px' }}>
              {submitLoading ? 'SUBMITTING...' : 'FILE COMPLAINT'}
            </button>
          </form>
        </div>

        {/* Complaints Table Card */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: '#0d1320', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'var(--font-family-mono)' }}>COMPLAINTS ({filtered.length})</span>
            <div className="search-bar" style={{ width: '220px' }}>
              <span className="search-bar__icon">🔍</span>
              <input 
                placeholder="Search complaints..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            {loading ? (
              <div className="loading-spinner">LOADING COMPLAINTS...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📝</div>
                <div className="empty-state__title">{search ? 'NO MATCHING COMPLAINTS' : 'NO COMPLAINTS FILED'}</div>
                <div className="empty-state__text">Complaints will appear here once filed.</div>
              </div>
            ) : (
              <table className="data-table" style={{ fontFamily: 'var(--font-family-mono)' }}>
                <thead style={{ backgroundColor: '#0d1320', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>ID</th>
                    <th style={{ padding: '8px 12px' }}>DESCRIPTION</th>
                    <th style={{ padding: '8px 12px' }}>STATUS</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>DATE FILED</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--color-primary-light)', fontWeight: '700' }}>#{c.id}</td>
                      <td style={{ padding: '8px 12px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`badge badge--${c.status === 'RESOLVED' ? 'success' : 'warning'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {c.date_filed ? new Date(c.date_filed).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

