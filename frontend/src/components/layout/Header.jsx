import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SettingsIcon,
  LogOutIcon,
  RefreshIcon,
  ShieldIcon,
} from '../common/Icons';
import CommandPalette from '../common/CommandPalette';
import SecuritySettingsModal from '../common/SecuritySettingsModal';

export default function Header() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile/');
      setProfile(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      setIsOnline(true);
    } catch (err) {
      console.warn('Profile fetch warning (using cached user):', err);
      if (!err.response) {
        setIsOnline(false);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleReconnect = async (e) => {
    if (e) e.stopPropagation();
    try {
      const response = await api.get('/api/auth/profile/');
      setProfile(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      setIsOnline(true);
      if (addToast) addToast('Reconnected to live backend telemetry.', 'success');
    } catch (err) {
      if (!err.response) {
        setIsOnline(false);
        if (addToast) addToast('Backend unreachable. Operating in offline simulation mode.', 'warning');
      } else {
        setIsOnline(true);
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (addToast) addToast('Session terminated. Redirecting to login...', 'info');
    navigate('/login');
  };

  const isStation = profile.role === 'STATION';
  const displayName = isStation
    ? (profile.station_name || profile.username?.replace('station_', '') || 'LOCAL JURISDICTION').toUpperCase() + ' STATION'
    : (profile.username?.toUpperCase() || 'COMMAND PERSONNEL');

  return (
    <>
      <header className="top-header">
        {/* Left: Branding & Jurisdiction Title */}
        <div className="top-header__left">
          <div className="top-header__brand">
            <div>
              <div className="top-header__title">CyberSphere</div>
              <div className="top-header__subtitle">
                {isStation ? 'AHMEDABAD POLICE • STATION OPERATIONS' : 'AHMEDABAD POLICE • CITY COMMAND HQ'}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <div
          className="header-command-trigger"
          onClick={() => setPaletteOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open Command & Search Palette (Ctrl + K)"
          title="Open Command & Search Palette (Ctrl + K)"
        >
          <span style={{ display: 'flex', color: 'var(--palette-slate-blue)' }}>
            <SearchIcon size={15} />
          </span>
          <span>Search command or incident...</span>
          <kbd>Ctrl K</kbd>
        </div>

        {/* Right: Operational Telemetry & Profile */}
        <div className="top-header__right">
          {/* System State Telemetry */}
          {isOnline ? (
            <div className="header-status-pill" title="Live connection to backend telemetry">
              <div className="header-status-pill__dot" />
              <span>{isStation ? 'PRECINCT ACTIVE' : 'LIVE TELEMETRY'}</span>
            </div>
          ) : (
            <div className="header-status-pill header-status-pill--offline" title="Backend unreachable — operating in offline simulation mode">
              <div className="header-status-pill__dot header-status-pill__dot--offline" />
              <span>OFFLINE / SIMULATION</span>
              <button
                type="button"
                onClick={handleReconnect}
                className="header-reconnect-btn"
                aria-label="Retry connection to backend"
                title="Retry connection"
              >
                <RefreshIcon size={11} />
              </button>
            </div>
          )}

          {/* Monospace Clock Display */}
          <div className="header-clock-pill">
            {timeStr}
          </div>

          {/* User Profile Trigger */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              type="button"
              className="user-profile-badge"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="user-profile-badge__avatar">
                {profile.username ? profile.username.substring(0, 1).toUpperCase() : 'O'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="user-profile-badge__name">{displayName}</div>
                <div className="user-profile-badge__role">{profile.role || 'PERSONNEL'}</div>
              </div>
              <span style={{ color: 'var(--color-text-muted)', marginLeft: '2px', display: 'flex', alignItems: 'center' }}>
                {dropdownOpen ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
              </span>
            </button>

            {/* Profile Dropdown Menu */}
            {dropdownOpen && (
              <div className="profile-dropdown-menu" role="menu">
                <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--color-border)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{displayName}</div>
                  <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ID: {profile.id || 'AUTH-01'} • Role: {profile.role}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setSecurityModalOpen(true);
                  }}
                  className="dropdown-item"
                  role="menuitem"
                >
                  <ShieldIcon size={13} />
                  <span>Security & MFA Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    if (addToast) addToast('Command interface configured for operational workflow.', 'info');
                  }}
                  className="dropdown-item"
                  role="menuitem"
                >
                  <SettingsIcon size={13} />
                  <span>Interface Settings</span>
                </button>

                <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="dropdown-item dropdown-item--danger"
                  role="menuitem"
                >
                  <LogOutIcon size={13} />
                  <span>Terminate Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      {/* Security & MFA Settings Modal */}
      <SecuritySettingsModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        onUpdateProfile={(updated) => setProfile(updated)}
      />
    </>
  );
}
