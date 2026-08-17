import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { SecurityMark, LockIcon, UserIcon, AlertCircleIcon } from '../../../components/common/Icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/auth/login/', formData);
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      const user = response.data.user;
      localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'ADMIN') {
        navigate('/city');
      } else if (user.role === 'STATION' || user.role === 'POLICE_OFFICER' || user.role === 'POLICE') {
        navigate('/station');
      } else {
        setError('Patrol Officers must use the mobile application.');
        localStorage.clear();
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.detail || 'Invalid credentials. Please verify your Service ID and Key.');
      } else {
        setError('Unable to connect to the CyberSphere backend. Please ensure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-base)',
        padding: 'var(--space-lg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Brand & Security Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              margin: '0 auto var(--space-md)',
              border: '1px solid var(--palette-sage)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              color: 'var(--palette-sage)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <SecurityMark size={32} />
          </div>
          <h1
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-text-primary)',
              marginBottom: '2px',
            }}
          >
            CyberSphere
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-2xs)',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '700',
            }}
          >
            Command & Control • GIS Intelligence Platform
          </p>
        </div>

        {/* Access Form Card */}
        <div className="card" style={{ padding: 'var(--space-xl)', backgroundColor: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
          <div
            style={{
              marginBottom: 'var(--space-md)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 'var(--space-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                fontWeight: '700',
              }}
            >
              Authorized Personnel Login
            </h2>
            <span className="badge badge--neutral">RESTRICTED</span>
          </div>

          {error && (
            <div className="alert alert--error" role="alert">
              <AlertCircleIcon size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Service ID / Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. admin or station_navrangpura"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Authentication Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ letterSpacing: '1.5px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <button
                type="submit"
                className="btn btn-sage btn-full"
                disabled={loading}
                style={{ height: '38px', fontSize: 'var(--font-size-xs)', fontWeight: '700' }}
              >
                {loading ? 'Authenticating...' : 'Access Command Center'}
              </button>
            </div>
          </form>
        </div>

        {/* Audit & Compliance Disclaimer */}
        <div
          style={{
            marginTop: 'var(--space-lg)',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
          }}
        >
          RESTRICTED OPERATIONAL SYSTEM<br />
          All actions are cryptographically logged and audited.
        </div>
      </div>
    </div>
  );
}
