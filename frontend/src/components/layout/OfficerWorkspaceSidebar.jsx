import React from 'react';
import { NavLink } from 'react-router-dom';

export default function OfficerWorkspaceSidebar() {
  const activeStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderLeft: '4px solid var(--color-success)'
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
    color: 'var(--color-primary-light)',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '700'
  };

  return (
    <aside style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--sidebar-bg)', color: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)' }}>
      <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--color-border-light)' }}>
        <span style={{color: 'var(--color-success)'}}>Officer</span>Workspace
      </div>
      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        <div style={sectionHeader}>Investigator Tasks</div>
        <NavLink to="/officer/workspace" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          My Cases
        </NavLink>
        <NavLink to="/officer/create-fir" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Create FIR
        </NavLink>
        
        <div style={sectionHeader}>Tools</div>
        <NavLink to="/officer/evidence" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Evidence Review
        </NavLink>
      </nav>
    </aside>
  );
}
