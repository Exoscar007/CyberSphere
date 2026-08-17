import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const activeStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderLeft: '4px solid var(--color-accent)'
  };
  
  const linkStyle = {
    display: 'block',
    padding: '12px 24px',
    color: '#e2e8f0',
    textDecoration: 'none',
    borderLeft: '4px solid transparent',
    transition: 'all 0.2s',
    fontSize: '14px',
    fontWeight: '500'
  };

  const sectionHeader = {
    padding: '16px 24px 8px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600'
  };

  return (
    <aside style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--sidebar-bg)', color: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)' }}>
      <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--color-border-light)' }}>
        <span style={{color: 'var(--color-primary-light)'}}>Cyber</span>Sphere
      </div>
      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        <div style={sectionHeader}>Main</div>
        <NavLink to="/dashboard" end style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Dashboard
        </NavLink>
        
        <div style={sectionHeader}>Crime Ops</div>
        <NavLink to="/dashboard/fir" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          FIR Management
        </NavLink>
        <NavLink to="/dashboard/incidents" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Active Incidents
        </NavLink>
        <NavLink to="/dashboard/complaints" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Public Complaints
        </NavLink>

        <div style={sectionHeader}>Intelligence</div>
        <NavLink to="/dashboard/intelligence" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Analytics & Maps
        </NavLink>

        <div style={sectionHeader}>Admin</div>
        <NavLink to="/dashboard/users" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          User Management
        </NavLink>
        <NavLink to="/dashboard/patrol" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Patrol Assignment
        </NavLink>
        <NavLink to="/dashboard/reports" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Monitoring & Reports
        </NavLink>
      </nav>
    </aside>
  );
}
