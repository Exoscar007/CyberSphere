import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { SearchIcon, FileTextIcon, PlusIcon, CheckIcon, AlertCircleIcon } from '../../../components/common/Icons';

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
      setSuccess('Public complaint officially logged in the system.');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Citizen Complaint Intake & Ledger</h1>
          <p className="page-header__subtitle">Log, categorize, and track citizen reports and general station complaints</p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert--success" role="status">
          <CheckIcon size={16} />
          <span>{success}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 'var(--space-md)', alignItems: 'start' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <PlusIcon size={15} />
              Intake New Complaint
            </span>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="comp_desc">Detailed Complaint Narrative</label>
              <textarea
                id="comp_desc"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ description: e.target.value })}
                className="form-input"
                required
                rows={5}
                placeholder="Enter complainant details, time of incident, and summary of grievance..."
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={submitLoading}>
              {submitLoading ? 'Recording...' : 'File Citizen Complaint'}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--palette-chalk)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="card-title">
              <FileTextIcon size={16} />
              Master Complaints Archive ({filtered.length})
            </span>
            <div style={{ position: 'relative', width: '200px' }}>
              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex' }}>
                <SearchIcon size={13} />
              </span>
              <input
                placeholder="Search complaints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '26px', height: '28px', fontSize: '11px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading intake queue...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <FileTextIcon size={24} />
              </div>
              <div className="empty-state__title">{search ? 'No matching complaints' : 'No complaints filed'}</div>
              <div className="empty-state__text">Complaints will appear here once filed.</div>
            </div>
          ) : (
            <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Statement & Narrative</th>
                    <th>Status</th>
                    <th>Filed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>#{c.id}</td>
                      <td style={{ maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </td>
                      <td>
                        <span className={`badge badge--${c.status === 'RESOLVED' ? 'verified' : 'high'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {c.date_filed ? new Date(c.date_filed).toLocaleDateString() : '—'}
                      </td>
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
