import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

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
      
      // Role-based routing
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
        setError(err.response.data?.detail || 'Invalid credentials. Please try again.');
      } else {
        setError('Unable to connect to the CyberSphere server. Please ensure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      backgroundImage: 'radial-gradient(circle at center, var(--color-surface) 0%, var(--color-bg) 100%)',
    }}>
      <div style={{ width: '100%', maxWidth: '480px', padding: 'var(--space-xl)' }}>
        
        {/* Emblem & Branding */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            margin: '0 auto var(--space-lg)', 
            border: '2px solid var(--color-primary-dark)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-bg-dark)',
            boxShadow: '0 0 15px rgba(37, 99, 235, 0.2)'
          }}>
            <span style={{ fontSize: '28px', color: 'var(--color-primary)' }}>🛡️</span>
          </div>
          <h1 style={{ 
            fontSize: 'var(--font-size-2xl)', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            color: 'var(--color-text)',
            marginBottom: 'var(--space-xs)'
          }}>
            CYBERSPHERE
          </h1>
          <p style={{ 
            fontSize: 'var(--font-size-sm)', 
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: 'var(--font-family-mono)'
          }}>
            Secure Command & Intelligence Platform
          </p>
        </div>

        {/* Login Panel */}
        <div style={{ 
          backgroundColor: 'var(--color-bg-dark)', 
          border: '1px solid var(--color-border)', 
          borderTop: '3px solid var(--color-primary-dark)',
          padding: 'var(--space-2xl)'
        }}>
          <div style={{ marginBottom: 'var(--space-xl)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Authorized Access Only
            </h2>
          </div>

          {error && <div className="alert alert--error" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-xs)', letterSpacing: '0.5px' }}>
                Service ID / Username
              </label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="form-input"
                required
                autoFocus
                autoComplete="username"
                placeholder="Enter credentials"
                style={{ height: '40px' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-xs)', letterSpacing: '0.5px' }}>
                Authentication Key
              </label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{ height: '40px', letterSpacing: '2px' }}
              />
            </div>
            
            <div style={{ marginTop: 'var(--space-2xl)' }}>
              <button type="submit" className="btn btn--primary btn--full" disabled={loading}
                style={{ height: '44px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {loading ? 'Authenticating...' : 'Establish Secure Connection'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Warning */}
        <div style={{ 
          marginTop: 'var(--space-xl)', 
          textAlign: 'center', 
          fontFamily: 'var(--font-family-mono)',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          lineHeight: '1.6'
        }}>
          WARNING: This system contains restricted operational intelligence.<br/>
          Unauthorized access is strictly prohibited under the IT Act.<br/>
          All activity is logged and monitored.
        </div>
      </div>
    </div>
  );
}
