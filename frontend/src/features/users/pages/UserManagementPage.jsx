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

  const getRoleBadgeClass = (role) => {
    if (role === 'ADMIN') return 'badge--danger';
    if (role === 'STATION') return 'badge--warning';
    if (role === 'POLICE_OFFICER') return 'badge--info';
    if (role === 'PATROL_OFFICER') return 'badge--success';
    return 'badge--low';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)', height: '100%', overflowY: 'auto' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontWeight: 'bold' }}>USER MANAGEMENT & PERSONNEL ROSTER</span>
      </div>

      {error && <div className="alert alert--error" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-family-mono)', margin: 0 }}>{error}</div>}
      {success && <div className="alert alert--success" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-family-mono)', margin: 0 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '8px', alignItems: 'start' }}>
        
        {/* Create User Form Card */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
            CREATE NEW USER
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">USERNAME</label>
              <input name="username" value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="form-input" required placeholder="Enter username" style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">PASSWORD</label>
              <input name="password" type="password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input" required placeholder="Enter password" style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">SYSTEM ROLE</label>
              <select name="role" value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '32px' }}>
                <option value="ADMIN">Administrator</option>
                <option value="STATION">Station Console</option>
                <option value="POLICE_OFFICER">Police Officer</option>
                <option value="PATROL_OFFICER">Patrol Officer</option>
              </select>
            </div>
            <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: '4px', height: '34px' }} disabled={submitLoading}>
              {submitLoading ? 'CREATING USER...' : 'CREATE USER'}
            </button>
          </form>
        </div>

        {/* User Roster Table Card */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', backgroundColor: '#0d1320', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-family-mono)' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>SYSTEM USERS ({filtered.length})</span>
            <div style={{ position: 'relative', width: '200px' }}>
              <input 
                placeholder="Search users..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={{ width: '100%', backgroundColor: '#05080f', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
          {loading ? (
            <div className="loading-spinner" style={{ padding: '24px' }}>LOADING USERS...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state__icon">👤</div>
              <div className="empty-state__title">{search ? 'NO MATCHING USERS' : 'NO USERS FOUND'}</div>
            </div>
          ) : (
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontFamily: 'var(--font-family-mono)' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#0d1320' }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>USERNAME</th>
                    <th style={{ padding: '8px 12px' }}>ROLE</th>
                    <th style={{ padding: '8px 12px' }}>BADGE NUMBER</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, idx) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text)', fontWeight: 'bold' }}>{u.username}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`badge ${getRoleBadgeClass(u.role)}`}>● {u.role}</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{u.badge_number || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button className="btn btn--danger btn--sm" onClick={() => handleDelete(u.id)} style={{ padding: '2px 8px' }}>
                          DELETE
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

