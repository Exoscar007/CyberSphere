import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  UsersIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  AlertCircleIcon,
  SearchIcon,
} from '../../../components/common/Icons';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '', role: 'POLICE_OFFICER' });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/auth/users/');
      setUsers(res.data);
    } catch {
      setError('Unable to load personnel directory. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/auth/users/', formData);
      setFormData({ username: '', password: '', role: 'POLICE_OFFICER' });
      setSuccess('Officer account successfully provisioned.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to provision officer account.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Revoke access and delete this personnel account?')) return;
    try {
      await api.delete(`/api/auth/users/${userId}/`);
      setSuccess('Personnel account deleted.');
      fetchUsers();
    } catch {
      setError('Failed to delete account.');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role) => {
    if (role === 'ADMIN') return 'critical';
    if (role === 'STATION') return 'high';
    if (role === 'PATROL_OFFICER') return 'verified';
    return 'operational';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Personnel & Authorization Management</h1>
          <p className="page-header__subtitle">Manage law enforcement credentials, precinct station operators, and role-based access</p>
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
        {/* Provision User Form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <PlusIcon size={15} />
              Provision Officer Account
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="user_username">Service Username / Call-Sign</label>
              <input
                id="user_username"
                name="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="form-input"
                required
                placeholder="e.g. officer_patel"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user_role">Authorization Role</label>
              <select
                id="user_role"
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="form-input"
              >
                <option value="POLICE_OFFICER">Police Officer (Station Desk)</option>
                <option value="PATROL_OFFICER">Patrol Officer (Mobile Unit)</option>
                <option value="STATION">Station Commander</option>
                <option value="ADMIN">City HQ Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user_password">Temporary Access Key</label>
              <input
                id="user_password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input"
                required
                placeholder="••••••••"
              />
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitLoading}
              >
                {submitLoading ? 'Provisioning...' : 'Create Personnel Account'}
              </button>
            </div>
          </form>
        </div>

        {/* Personnel Directory Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--palette-chalk)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="card-title">
              <UsersIcon size={16} />
              Active Personnel Directory ({users.length})
            </span>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '200px' }}>
              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex' }}>
                <SearchIcon size={13} />
              </span>
              <input
                type="text"
                placeholder="Search username, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '26px', height: '28px', fontSize: '11px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading personnel directory...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <UsersIcon size={24} />
              </div>
              <div className="empty-state__title">No personnel found</div>
            </div>
          ) : (
            <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>#{u.id}</td>
                      <td style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>
                        {u.username}
                      </td>
                      <td>
                        <span className={`badge badge--${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge--verified">ACTIVE</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--color-critical)' }}
                          title="Revoke Access"
                        >
                          <TrashIcon size={12} />
                          <span>Revoke</span>
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
    </div>
  );
}
