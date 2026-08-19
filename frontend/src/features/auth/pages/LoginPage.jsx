import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  LockIcon,
  UserIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
  ShieldIcon,
  KeyIcon,
} from '../../../components/common/Icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const [authStep, setAuthStep] = useState('CREDENTIALS'); // 'CREDENTIALS' | 'MFA'
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [mfaToken, setMfaToken] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/auth/login/', formData);
      
      // Check if MFA is required
      if (response.data?.mfa_required) {
        setMfaToken(response.data.mfa_token);
        setAuthStep('MFA');
        setOtpCode('');
        return;
      }

      // Single-step standard authentication
      completeLogin(response.data);
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.detail || 'Invalid credentials. Please verify your Service ID and Key.');
      } else {
        setError('Unable to connect to the CyberSphere backend. Please ensure the backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length === 0) {
      setError('Enter your verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/auth/mfa/verify/', {
        mfa_token: mfaToken,
        otp_code: otpCode.trim(),
      });
      completeLogin(response.data);
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.detail || 'That verification code is invalid. Please try again.');
      } else {
        setError('Unable to connect to the CyberSphere backend. Please ensure the backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (data) => {
    localStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    const user = data.user;
    localStorage.setItem('user', JSON.stringify(user));

    if (user.role === 'ADMIN') {
      navigate('/city');
    } else if (user.role === 'STATION' || user.role === 'POLICE_OFFICER' || user.role === 'POLICE') {
      navigate('/station');
    } else if (user.role === 'PATROL' || user.role === 'OFFICER' || user.role === 'PATROL_OFFICER') {
      navigate('/officer');
    } else {
      setError('Unsupported role authorization.');
      localStorage.clear();
    }
  };

  const handleBackToSignIn = () => {
    setAuthStep('CREDENTIALS');
    setMfaToken(null);
    setOtpCode('');
    setError(null);
  };

  return (
    <div className="auth-portal-container">
      <div className="auth-portal-card">
        {/* Left Column: Full-Height Showcase Panel (Desktop / Tablet) */}
        <div className="auth-showcase-panel">
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'rgba(40, 85, 112, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '1px',
                color: 'var(--palette-chalk)',
                textTransform: 'uppercase',
                marginBottom: '28px',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ADE80' }} />
              AHMEDABAD POLICE
            </div>

            <h1
              style={{
                fontSize: '36px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: '#FFFFFF',
                lineHeight: 1.2,
                margin: '0 0 10px 0',
              }}
            >
              CyberSphere
            </h1>

            <p
              style={{
                fontSize: '13px',
                color: 'rgba(244, 240, 232, 0.85)',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                fontWeight: '700',
                margin: 0,
              }}
            >
              Command & Control • GIS Intelligence Platform
            </p>
          </div>

          <div
            style={{
              paddingTop: '28px',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ADE80' }} />
              <span>GATEWAY ACTIVE</span>
            </div>
            <span>SECURE CONNECTION</span>
          </div>
        </div>

        {/* Right Column: Full-Height Clean Authentication Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            {authStep === 'CREDENTIALS' ? (
              <div>
                {/* Header for Credentials Step */}
                <div style={{ marginBottom: '28px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: 'var(--palette-coastal-blue)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '6px',
                    }}
                  >
                    AHMEDABAD POLICE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h2
                      style={{
                        fontSize: '24px',
                        fontWeight: '900',
                        color: 'var(--palette-charcoal-slate)',
                        margin: 0,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Personnel Sign In
                    </h2>
                    <span className="badge badge--neutral">RESTRICTED</span>
                  </div>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: 'var(--color-text-secondary)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Enter your Service ID and password to access CyberSphere
                  </p>
                </div>

                {error && (
                  <div className="alert alert--error" role="alert" style={{ marginBottom: '22px', borderRadius: '14px' }}>
                    <AlertCircleIcon size={16} />
                    <span style={{ fontSize: '13px' }}>{error}</span>
                  </div>
                )}

                <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Service ID / Username Pill Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      htmlFor="username"
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--palette-charcoal-slate)',
                        letterSpacing: '0.2px',
                      }}
                    >
                      Service ID / Username
                    </label>
                    <div className="auth-input-pill-wrapper">
                      <div className="auth-input-pill-icon">
                        <UserIcon size={18} />
                      </div>
                      <input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="auth-input-pill-field"
                        required
                        autoFocus
                        autoComplete="username"
                        placeholder="e.g. admin or station_navrangpura"
                      />
                    </div>
                  </div>

                  {/* Password Pill Input with Visibility Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      htmlFor="password"
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--palette-charcoal-slate)',
                        letterSpacing: '0.2px',
                      }}
                    >
                      Password / Authentication Key
                    </label>
                    <div className="auth-input-pill-wrapper">
                      <div className="auth-input-pill-icon">
                        <LockIcon size={18} />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        className="auth-input-pill-field"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        style={{ letterSpacing: showPassword ? 'normal' : '2px' }}
                      />
                      <button
                        type="button"
                        className="auth-input-pill-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Options Row: Remember Me & Clearance Help */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      margin: '2px 0 6px 0',
                      fontSize: '12.5px',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: 'var(--color-text-secondary)',
                        userSelect: 'none',
                        fontWeight: '500',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{
                          accentColor: 'var(--palette-coastal-blue)',
                          width: '15px',
                          height: '15px',
                          cursor: 'pointer',
                        }}
                      />
                      <span>Keep me signed in</span>
                    </label>
                    <span
                      style={{
                        color: 'var(--palette-coastal-blue)',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setError('For clearance password resets, please contact the City Command HQ Administrator.');
                      }}
                    >
                      Need clearance help?
                    </span>
                  </div>

                  {/* Signature Primary Pill Action Button */}
                  <button
                    type="submit"
                    id="login-submit-button"
                    className="auth-submit-pill"
                    disabled={loading}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="auth-submit-pill-icon">
                        <ShieldIcon size={16} />
                      </div>
                      <span>{loading ? 'Verifying credentials...' : 'Sign In'}</span>
                    </div>
                    <ArrowRightIcon size={18} />
                  </button>
                </form>

                {/* Development / Testing Role Quick Selector */}
                <div
                  style={{
                    marginTop: '22px',
                    padding: '12px',
                    backgroundColor: 'var(--palette-chalk)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: 'var(--palette-coastal-blue)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>⚡ AUTHORIZED ROLE PROFILES (DEV / TEST)</span>
                    <span style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>Click to fill</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ username: 'admin', password: 'admin' });
                        setError(null);
                      }}
                      className="btn btn-secondary btn-xs"
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        height: 'auto',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}
                    >
                      <div>
                        <div style={{ color: 'var(--palette-charcoal-slate)' }}>Admin</div>
                        <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontWeight: '500' }}>City Command HQ</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ username: 'station_navrangpura', password: 'station123' });
                        setError(null);
                      }}
                      className="btn btn-secondary btn-xs"
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        height: 'auto',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}
                    >
                      <div>
                        <div style={{ color: 'var(--palette-charcoal-slate)' }}>Station Console</div>
                        <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Navrangpura (NAV-01)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ username: 'station_satellite', password: 'station123' });
                        setError(null);
                      }}
                      className="btn btn-secondary btn-xs"
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        height: 'auto',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}
                    >
                      <div>
                        <div style={{ color: 'var(--palette-charcoal-slate)' }}>Station Console</div>
                        <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Satellite (SAT-02)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ username: 'patrol_rathod', password: 'patrol123' });
                        setError(null);
                      }}
                      className="btn btn-secondary btn-xs"
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        height: 'auto',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}
                    >
                      <div>
                        <div style={{ color: 'var(--palette-charcoal-slate)' }}>Officer / Investigator</div>
                        <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontWeight: '500' }}>Field Case Workspace</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Multi-Factor Authentication (Security Verification) */
              <div>
                <div style={{ marginBottom: '28px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: 'var(--palette-coastal-blue)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '6px',
                    }}
                  >
                    AHMEDABAD POLICE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h2
                      style={{
                        fontSize: '24px',
                        fontWeight: '900',
                        color: 'var(--palette-charcoal-slate)',
                        margin: 0,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Security Verification
                    </h2>
                    <span className="badge badge--neutral">RESTRICTED</span>
                  </div>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: 'var(--color-text-secondary)',
                      margin: '0 0 4px 0',
                      lineHeight: 1.5,
                    }}
                  >
                    Multi-factor authentication is required to access CyberSphere operations.
                  </p>
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-text-muted)',
                      margin: 0,
                    }}
                  >
                    Enter the 6-digit verification code from your authenticator app.
                  </p>
                </div>

                {error && (
                  <div className="alert alert--error" role="alert" style={{ marginBottom: '22px', borderRadius: '14px' }}>
                    <AlertCircleIcon size={16} />
                    <span style={{ fontSize: '13px' }}>{error}</span>
                  </div>
                )}

                <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* 6-Digit Code Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      htmlFor="otp_code"
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--palette-charcoal-slate)',
                        letterSpacing: '0.2px',
                      }}
                    >
                      Verification Code
                    </label>
                    <div className="auth-input-pill-wrapper">
                      <div className="auth-input-pill-icon">
                        <KeyIcon size={18} />
                      </div>
                      <input
                        id="otp_code"
                        name="otp_code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={8}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        className="auth-input-pill-field"
                        required
                        autoFocus
                        autoComplete="one-time-code"
                        placeholder="123456"
                        style={{
                          fontSize: '18px',
                          letterSpacing: '4px',
                          fontWeight: '700',
                          fontFamily: 'var(--font-mono)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Primary Verify Action Button */}
                  <button
                    type="submit"
                    id="mfa-verify-button"
                    className="auth-submit-pill"
                    disabled={loading}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="auth-submit-pill-icon">
                        <ShieldIcon size={16} />
                      </div>
                      <span>{loading ? 'Verifying code...' : 'Verify & Sign In'}</span>
                    </div>
                    <ArrowRightIcon size={18} />
                  </button>

                  {/* Secondary Back Action */}
                  <button
                    type="button"
                    onClick={handleBackToSignIn}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--palette-coastal-blue)',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px',
                    }}
                  >
                    ← Back to sign in
                  </button>
                </form>
              </div>
            )}

            {/* Clean Simple Footer */}
            <div
              style={{
                marginTop: '36px',
                paddingTop: '20px',
                borderTop: '1px solid var(--color-border-subtle)',
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.4px',
                fontWeight: '700',
              }}
            >
              AHMEDABAD POLICE • CYBERSPHERE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
