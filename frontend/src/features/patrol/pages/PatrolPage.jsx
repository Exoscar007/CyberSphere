import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function PatrolPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({ officer: '', zone_name: '' });
  const [pingData, setPingData] = useState({ id: '', lat: '', lng: '' });
  const [pingMsg, setPingMsg] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/patrol/assignments/');
      setAssignments(res.data);
    } catch {
      setError('Unable to load patrol assignments. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssignments(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/patrol/assignments/', {
        officer: parseInt(formData.officer),
        zone_name: formData.zone_name,
      });
      setFormData({ officer: '', zone_name: '' });
      setSuccess('Patrol assignment created.');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create assignment.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePing = async (e) => {
    e.preventDefault();
    setPingMsg(null);
    try {
      await api.post(`/api/patrol/assignments/${pingData.id}/ping/`, {
        lat: parseFloat(pingData.lat),
        lng: parseFloat(pingData.lng),
      });
      setPingMsg('GPS ping sent successfully.');
      setPingData({ id: '', lat: '', lng: '' });
    } catch {
      setPingMsg('Failed to send GPS ping.');
    }
  };

  const getRiskBadge = (level) => {
    const map = { LOW: 'success', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger' };
    return map[level] || 'neutral';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Patrol Management</h1>
        <p className="page-header__subtitle">Assign officers and track patrol activity</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        {/* Assign Form */}
        <div className="card">
          <div className="card__title" style={{ marginBottom: 'var(--space-lg)' }}>Create Assignment</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Officer ID</label>
              <input name="officer" type="number" value={formData.officer} onChange={handleChange}
                className="form-input" required placeholder="Enter officer user ID" />
            </div>
            <div className="form-group">
              <label className="form-label">Zone Name</label>
              <input name="zone_name" value={formData.zone_name} onChange={handleChange}
                className="form-input" required placeholder="e.g. Maninagar" />
            </div>
            <button type="submit" className="btn btn--primary btn--full" disabled={submitLoading}>
              {submitLoading ? 'Assigning...' : 'Assign Patrol'}
            </button>
          </form>
        </div>

        {/* GPS Ping Form */}
        <div className="card">
          <div className="card__title" style={{ marginBottom: 'var(--space-lg)' }}>Send GPS Ping</div>
          {pingMsg && <div className="alert alert--info">{pingMsg}</div>}
          <form onSubmit={handlePing}>
            <div className="form-group">
              <label className="form-label">Assignment ID</label>
              <input name="id" type="number" value={pingData.id}
                onChange={(e) => setPingData({ ...pingData, id: e.target.value })}
                className="form-input" required placeholder="Assignment ID" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input name="lat" type="number" step="any" value={pingData.lat}
                  onChange={(e) => setPingData({ ...pingData, lat: e.target.value })}
                  className="form-input" required placeholder="23.0225" />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input name="lng" type="number" step="any" value={pingData.lng}
                  onChange={(e) => setPingData({ ...pingData, lng: e.target.value })}
                  className="form-input" required placeholder="72.5714" />
              </div>
            </div>
            <button type="submit" className="btn btn--secondary btn--full">Send Ping</button>
          </form>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="card__title">Active Assignments ({assignments.length})</div>
        </div>
        {loading ? (
          <div className="loading-spinner">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🚔</div>
            <div className="empty-state__title">No patrol assignments</div>
            <div className="empty-state__text">Create an assignment to deploy officers to risk zones.</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Officer</th><th>Zone</th><th>Risk Level</th><th>Status</th><th>Started</th></tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>#{a.id}</td>
                    <td>Officer #{a.officer}</td>
                    <td>{a.zone_name}</td>
                    <td><span className={`badge badge--${getRiskBadge(a.risk_level)}`}>{a.risk_level}</span></td>
                    <td><span className={`badge badge--${a.status === 'ACTIVE' ? 'success' : 'neutral'}`}>{a.status}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.start_time ? new Date(a.start_time).toLocaleString() : '—'}</td>
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
