import React from 'react';
import { NavLink } from 'react-router-dom';

export default function StationConsoleSidebar() {
  const activeStyle = {
    backgroundColor: 'var(--color-surface)',
    borderLeft: '2px solid var(--color-primary-light)'
  };
  
  const linkStyle = {
    display: 'block',
    padding: '8px 16px',
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    borderLeft: '2px solid transparent',
    transition: 'all 0.1s',
    fontSize: '12px',
    fontWeight: '500'
  };

  const sectionHeader = {
    padding: '16px 16px 4px',
    color: 'var(--color-text-muted)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '700'
  };

  return (
    <aside style={{ width: '230px', backgroundColor: 'var(--color-bg-dark)', color: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)' }}>
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        <div style={sectionHeader}>STATION CONSOLE</div>
        <NavLink to="/station/overview" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Overview Map
        </NavLink>
        <NavLink to="/station/firs" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Station FIRs
        </NavLink>
        
        <div style={sectionHeader}>QUEUE & DISPATCH</div>
        <NavLink to="/station/queue" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Incidents & Complaints
        </NavLink>
        <NavLink to="/station/dispatch" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Patrol Operations
        </NavLink>

        <div style={sectionHeader}>AUDIT</div>
        <NavLink to="/station/history" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Operational History
        </NavLink>
      </nav>
    </aside>
  );
}
