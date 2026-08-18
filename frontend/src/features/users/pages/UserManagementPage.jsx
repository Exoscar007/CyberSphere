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

function extractErrorMessage(err, defaultMsg) {
  const data = err.response?.data;
  if (!data) return err.message || defaultMsg;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.message) return data.message;
  const keys = Object.keys(data);
  if (keys.length > 0) {
    const key = keys[0];
    const val = data[key];
    if (Array.isArray(val)) return `${key}: ${val.join(', ')}`;
    if (typeof val === 'string') return `${key}: ${val}`;
  }
  return defaultMsg;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '', role: 'PATROL', badge_number: '' });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/auth/users/');
      setUsers(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load personnel directory. Please ensure the backend is running.'));
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
      setFormData({ username: '', password: '', role: 'PATROL', badge_number: '' });
      setSuccess('Personnel account successfully provisioned.');
      fetchUsers();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to provision personnel account.'));
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
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete account.'));
    }
  };

  const filtered = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase()) ||
      u.badge_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role) => {
    if (role === 'ADMIN') return 'critical';
    if (role === 'STATION') return 'high';
    if (role === 'PATROL' || role === 'PATROL_OFFICER') return 'verified';
    return 'operational';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Personnel & Authorization Management</h1>
          <p className="page-header__subtitle">
            Manage law enforcement credentials, precinct station operators, and role-based access
          </p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
        {/* Left: Provision User Form */}
        <div className="card" style={{ padding: '24px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
              <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--palette-charcoal-slate)', margin: 0 }}>
                Provision Personnel Account
              </h2>
            </div>
            <span className="badge badge--neutral">AUTH</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="user_username" style={{ marginBottom: '5px' }}>
                Service Username / Call-Sign
              </label>
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

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="user_role" style={{ marginBottom: '5px' }}>
                Authorization Role
              </label>
              <select
                id="user_role"
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="form-input"
              >
                <option value="PATROL">Patrol Officer (Mobile Unit)</option>
                <option value="STATION">Station Console Officer</option>
                <option value="ADMIN">City HQ Administrator</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="user_badge" style={{ marginBottom: '5px' }}>
                Badge Number (Optional)
              </label>
              <input
                id="user_badge"
                name="badge_number"
                value={formData.badge_number}
                onChange={(e) => setFormData({ ...formData, badge_number: e.target.value })}
                className="form-input"
                placeholder="e.g. BDG-7089"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="user_password" style={{ marginBottom: '5px' }}>
                Initial Access Key / Password
              </label>
              <input
                id="user_password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input"
                required
                placeholder="••••••••"
                style={{ letterSpacing: '1.5px' }}
              />
            </div>

            <div style={{ paddingTop: '6px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitLoading}
                style={{ height: '42px', fontSize: '13px', fontWeight: '700' }}
              >
                {submitLoading ? 'Provisioning...' : 'Provision Officer Account'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Active Personnel Directory */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--palette-chalk)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UsersIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
              <h3 style={{ fontSize: '13.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--palette-charcoal-slate)', margin: 0 }}>
                Active Personnel Directory ({filtered.length})
              </h3>
            </div>

            <div style={{ position: 'relative', width: '240px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex' }}>
                <SearchIcon size={13} />
              </span>
              <input
                placeholder="Search username or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '30px', height: '32px', fontSize: '11.5px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading personnel directory...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <UsersIcon size={24} className="empty-state__icon" />
              <div className="empty-state__title">No personnel accounts found</div>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Call-Sign / Username</th>
                    <th>Role Clearance</th>
                    <th>Badge ID</th>
                    <th>MFA Protection</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>
                        {u.username}
                      </td>
                      <td>
                        <span className={`badge badge--${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                        {u.badge_number || '—'}
                      </td>
                      <td>
                        {u.mfa_enabled ? (
                          <span className="badge badge--success" style={{ fontSize: '10px', fontWeight: '800' }}>
                            ENROLLED
                          </span>
                        ) : (
                          <span className="badge badge--neutral" style={{ fontSize: '10px' }}>
                            DISABLED
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--color-verified)', fontWeight: '600' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-verified)' }} />
                          <span>Active</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="btn btn-secondary btn-xs"
                          style={{ gap: '4px', color: 'var(--color-critical)' }}
                          title="Revoke and delete account"
                        >
                          <TrashIcon size={11} />
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
