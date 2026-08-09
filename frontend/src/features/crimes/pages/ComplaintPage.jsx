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
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Complaint Management</h1>
        <p className="page-header__subtitle">File and track public complaints</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
        <div className="card">
          <div className="card__title" style={{ marginBottom: 'var(--space-lg)' }}>File New Complaint</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" value={formData.description}
                onChange={(e) => setFormData({ description: e.target.value })}
                className="form-input" required rows="6" placeholder="Describe the complaint in detail..." />
            </div>
            <button type="submit" className="btn btn--primary btn--full" disabled={submitLoading}>
              {submitLoading ? 'Submitting...' : 'File Complaint'}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card__title">Complaints ({filtered.length})</div>
            <div className="search-bar">
              <span className="search-bar__icon">🔍</span>
              <input placeholder="Search complaints..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="loading-spinner">Loading complaints...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📝</div>
              <div className="empty-state__title">{search ? 'No matching complaints' : 'No complaints filed'}</div>
              <div className="empty-state__text">Complaints will appear here once filed.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Description</th><th>Status</th><th>Date Filed</th></tr></thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </td>
                      <td><span className={`badge badge--${c.status === 'RESOLVED' ? 'success' : 'warning'}`}>{c.status}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{c.date_filed ? new Date(c.date_filed).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
