import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MapIcon,
  DispatchIcon,
  SirenIcon,
  FileTextIcon,
  HistoryIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../common/Icons';

export default function StationConsoleSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} aria-label="Station Precinct Navigation">
      <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
        {!collapsed && <div className="sidebar__section-title">STATION CONTROL</div>}
        <NavLink
          to="/station/overview"
          title="Console Map"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <MapIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Console Map</span>}
        </NavLink>
        <NavLink
          to="/station/dispatch"
          title="Patrol Dispatch"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <DispatchIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Patrol Dispatch</span>}
        </NavLink>

        {!collapsed && (
          <div className="sidebar__section-title" style={{ marginTop: '10px' }}>
            RECORDS & TRIAGE
          </div>
        )}
        <NavLink
          to="/station/queue"
          title="Incident Queue"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <SirenIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Incident Queue</span>}
        </NavLink>
        <NavLink
          to="/station/firs"
          title="Register FIR"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <FileTextIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Register FIR</span>}
        </NavLink>

        {!collapsed && (
          <div className="sidebar__section-title" style={{ marginTop: '10px' }}>
            AUDIT
          </div>
        )}
        <NavLink
          to="/station/history"
          title="Station History"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <HistoryIcon size={17} />
          </span>
          {!collapsed && <span className="sidebar__label">Station History</span>}
        </NavLink>
      </nav>

      <div className="sidebar__footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {!collapsed && (
          <div style={{ fontSize: '9px', color: '#C2CEC8', fontFamily: 'var(--font-mono)', fontWeight: '700', letterSpacing: '0.5px' }}>
            PRECINCT CONSOLE
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
