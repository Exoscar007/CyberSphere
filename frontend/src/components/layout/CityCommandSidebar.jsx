import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MapIcon,
  IntelligenceIcon,
  FileTextIcon,
  HistoryIcon,
  UsersIcon,
  ReportsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../common/Icons';

export default function CityCommandSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} aria-label="City Command Navigation">
      <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
        {!collapsed && <div className="sidebar__section-title">COMMAND & GIS</div>}
        <NavLink
          to="/city/overview"
          title="Overview Map"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <MapIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Overview Map</span>}
        </NavLink>
        <NavLink
          to="/city/intelligence"
          title="Intelligence & Risk"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <IntelligenceIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Intelligence & Risk</span>}
        </NavLink>

        {!collapsed && (
          <div className="sidebar__section-title" style={{ marginTop: '10px' }}>
            OPERATIONS
          </div>
        )}
        <NavLink
          to="/city/firs"
          title="Global FIRs"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <FileTextIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Global FIRs</span>}
        </NavLink>
        <NavLink
          to="/city/history"
          title="Operational History"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <HistoryIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Operational History</span>}
        </NavLink>

        {!collapsed && (
          <div className="sidebar__section-title" style={{ marginTop: '10px' }}>
            ADMINISTRATION
          </div>
        )}
        <NavLink
          to="/city/users"
          title="Personnel"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <UsersIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Personnel</span>}
        </NavLink>
        <NavLink
          to="/city/reports"
          title="System Reports"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <ReportsIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">System Reports</span>}
        </NavLink>
      </nav>

      {/* Footer with Collapse Toggle */}
      <div className="sidebar__footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {!collapsed && (
          <div style={{ fontSize: '9px', color: '#C2CEC8', fontFamily: 'var(--font-mono)', fontWeight: '700', letterSpacing: '0.5px' }}>
            AHMEDABAD HQ
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          aria-label={collapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            borderRadius: 'var(--radius-2xs)',
            color: '#FFFFFF',
            cursor: 'pointer',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: collapsed ? '0 auto' : '0',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          {collapsed ? <ChevronRightIcon size={13} /> : <ChevronLeftIcon size={13} />}
        </button>
      </div>
    </aside>
  );
}
