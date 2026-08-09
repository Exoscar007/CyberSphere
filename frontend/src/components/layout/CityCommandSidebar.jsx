import React from 'react';
import { NavLink } from 'react-router-dom';

export default function CityCommandSidebar() {
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
        <div style={sectionHeader}>CITY COMMAND</div>
        <NavLink to="/city/overview" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Overview Map
        </NavLink>
        <NavLink to="/city/intelligence" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Intelligence & AI
        </NavLink>
        
        <div style={sectionHeader}>OPERATIONS</div>
        <NavLink to="/city/firs" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Global FIRs
        </NavLink>

        <div style={sectionHeader}>SYSTEM</div>
        <NavLink to="/city/users" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          Personnel
        </NavLink>
        <NavLink to="/city/reports" style={({isActive}) => isActive ? {...linkStyle, ...activeStyle} : linkStyle}>
          System Reports
        </NavLink>
      </nav>
    </aside>
  );
}
