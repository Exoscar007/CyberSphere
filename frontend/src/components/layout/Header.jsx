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
      height: '46px', 
      backgroundColor: '#0d121f', 
      borderBottom: '1px solid var(--color-border)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 16px',
      color: 'var(--color-text)',
      zIndex: 100
    }}>
      {/* Left: Branding & Station Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          backgroundColor: 'rgba(0, 122, 255, 0.15)',
          border: '1px solid rgba(0, 122, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: 'var(--color-primary-light)'
        }}>
          🛡️
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontWeight: '800', letterSpacing: '1px', fontSize: '13px', color: '#ffffff' }}>
            CYBERSPHERE
          </span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', letterSpacing: '0.5px', fontFamily: 'var(--font-family-mono)' }}>
            {isStation ? 'POLICE STATION OPERATIONS' : 'CITY COMMAND & INTELLIGENCE CENTER'}
          </span>
        </div>
      </div>

      {/* Right: Operational Status, Timestamp & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
        {isStation ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(52, 199, 89, 0.3)', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(52, 199, 89, 0.12)' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }}></div>
            <span style={{ color: 'var(--color-success)', fontWeight: '700', fontSize: '10px', letterSpacing: '0.5px' }}>RSA VERIFIED</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(0, 122, 255, 0.3)', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 122, 255, 0.12)' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)' }}></div>
            <span style={{ color: 'var(--color-primary-light)', fontWeight: '700', fontSize: '10px', letterSpacing: '0.5px' }}>SYSTEM OPERATIONAL</span>
          </div>
        )}
        
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '10px' }}>
          {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid var(--color-border)', paddingLeft: '16px' }}>
          <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '11px' }}>
            {isStation ? ((profile.station_name || profile.username?.replace('station_', '') || 'LOCAL JURISDICTION').toUpperCase() + ' POLICE STATION') : (profile.username?.toUpperCase() || 'OFFICER')}
          </span>
          <span style={{ color: 'var(--color-primary-light)', fontSize: '10px', fontWeight: '600' }}>
            [{profile.role || 'PERSONNEL'}]
          </span>
          <button 
            onClick={handleLogout} 
            style={{ 
              background: 'rgba(255, 59, 48, 0.1)', 
              border: '1px solid rgba(255, 59, 48, 0.25)', 
              color: '#ff3b30', 
              cursor: 'pointer', 
              marginLeft: '8px', 
              fontSize: '10px', 
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.12s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 59, 48, 0.25)'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'; e.currentTarget.style.color = '#ff3b30'; }}
          >
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}

