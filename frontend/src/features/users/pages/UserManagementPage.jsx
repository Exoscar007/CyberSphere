import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

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
      setError('Unable to load users. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/auth/users/', formData);
      setFormData({ username: '', password: '', role: 'POLICE_OFFICER' });
      setSuccess('User created successfully.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/api/auth/users/${userId}/`);
      setSuccess('User deleted.');
      fetchUsers();
    } catch {
      setError('Failed to delete user.');
    }
  };

  const filtered = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role) => {
    const map = { ADMIN: 'danger', STATION: 'warning', POLICE_OFFICER: 'info', PATROL_OFFICER: 'success' };
    return map[role] || 'neutral';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">User Management</h1>
        <p className="page-header__subtitle">Manage system users and role assignments</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
        <div className="card">
          <div className="card__title" style={{ marginBottom: 'var(--space-lg)' }}>Create User</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input name="username" value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="form-input" required placeholder="Enter username" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input" required placeholder="Enter password" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select name="role" value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="form-input">
                <option value="ADMIN">Administrator</option>
                <option value="STATION">Station Console</option>
                <option value="POLICE_OFFICER">Police Officer</option>
                <option value="PATROL_OFFICER">Patrol Officer</option>
              </select>
            </div>
            <button type="submit" className="btn btn--primary btn--full" disabled={submitLoading}>
              {submitLoading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card__title">Users ({filtered.length})</div>
            <div className="search-bar">
              <span className="search-bar__icon">🔍</span>
              <input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="loading-spinner">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">👤</div>
              <div className="empty-state__title">{search ? 'No matching users' : 'No users found'}</div>
              <div className="empty-state__text">Create users to populate the system.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Username</th><th>Role</th><th>Badge</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td><span className={`badge badge--${getRoleBadge(u.role)}`}>{u.role}</span></td>
                      <td>{u.badge_number || '—'}</td>
                      <td>
                        <button className="btn btn--danger btn--sm" onClick={() => handleDelete(u.id)}>Delete</button>
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
