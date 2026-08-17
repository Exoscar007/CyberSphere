import React from 'react';
import { NavLink } from 'react-router-dom';

export default function StationConsoleSidebar() {
  const activeStyle = {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    color: '#3898ff',
    borderLeft: '3px solid #007aff',
    fontWeight: '700'
  };
  
  const linkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    color: 'var(--sidebar-text)',
    textDecoration: 'none',
    borderLeft: '3px solid transparent',
    transition: 'all 0.12s ease',
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '1px'
  };

  const sectionHeader = {
    padding: '16px 16px 6px',
    color: 'var(--color-text-muted)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '700'
  };

  return (
    <aside style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--sidebar-bg)', color: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)' }}>
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        <div style={sectionHeader}>STATION CONSOLE</div>
        <NavLink to="/station/overview" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          <span>🗺️</span> Overview Map
        </NavLink>
        <NavLink to="/station/firs" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          <span>📋</span> Station FIRs
        </NavLink>
        
        <div style={sectionHeader}>QUEUE & DISPATCH</div>
        <NavLink to="/station/queue" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          <span>🚨</span> Incidents & Complaints
        </NavLink>
        <NavLink to="/station/dispatch" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          <span>🚓</span> Patrol Operations
        </NavLink>

        <div style={sectionHeader}>AUDIT</div>
        <NavLink to="/station/history" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          <span>📜</span> Operational History
        </NavLink>
      </nav>
    </aside>
  );
}

