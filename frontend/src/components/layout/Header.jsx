import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Header() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/api/auth/profile/');
        setProfile(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (err) {
        console.error("Failed to fetch profile: Network error or Backend offline");
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isStation = profile.role === 'STATION';

  return (
    <header style={{ 
      height: '48px', 
      backgroundColor: 'var(--color-bg-dark)', 
      borderBottom: '1px solid var(--color-border)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 16px',
      color: 'var(--color-text)'
    }}>
      {/* Left: Branding */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
        <span style={{ fontWeight: '900', letterSpacing: '1px', fontSize: '14px', color: 'var(--color-text)' }}>
          CYBERSPHERE
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
          {isStation ? 'POLICE STATION OPERATIONS' : 'CITY COMMAND & INTELLIGENCE CENTER'}
        </span>
      </div>

      {/* Right: System & User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
        {isStation ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--color-success)', padding: '2px 8px', borderRadius: '2px', backgroundColor: 'var(--color-success-bg)' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></div>
            <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>RSA VERIFIED</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></div>
            <span style={{ color: 'var(--color-success)' }}>SYSTEM OPERATIONAL</span>
          </div>
        )}
        <div style={{ color: 'var(--color-text-secondary)' }}>
          {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
          <span style={{ fontWeight: 'bold' }}>{isStation ? 'NAVRANGPURA POLICE STATION' : (profile.username?.toUpperCase() || 'OFFICER')}</span>
          <span style={{ color: 'var(--color-primary-light)' }}>[{profile.role || 'PERSONNEL'}]</span>
          <button 
            onClick={handleLogout} 
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', marginLeft: '12px', fontSize: '11px', textDecoration: 'underline' }}
          >
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}
