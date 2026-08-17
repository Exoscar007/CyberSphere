import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileTextIcon, EyeIcon } from '../common/Icons';

export default function OfficerWorkspaceSidebar() {
  return (
    <aside className="sidebar" aria-label="Officer Workspace Navigation">
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        <div className="sidebar__section-title">INVESTIGATOR TASKS</div>
        <NavLink
          to="/officer/workspace"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <FileTextIcon size={18} />
          </span>
          <span className="sidebar__label">My Cases</span>
        </NavLink>
        <NavLink
          to="/officer/create-fir"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <FileTextIcon size={18} />
          </span>
          <span className="sidebar__label">Create FIR</span>
        </NavLink>

        <div className="sidebar__section-title" style={{ marginTop: '10px' }}>
          EVIDENCE & TOOLS
        </div>
        <NavLink
          to="/officer/evidence"
          className={({ isActive }) =>
            `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
          }
        >
          <span className="sidebar__icon">
            <EyeIcon size={18} />
          </span>
          <span className="sidebar__label">Evidence Review</span>
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <div style={{ fontSize: '9px', color: '#FFFFFF', opacity: 0.8, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
          OFFICER WORKSPACE
        </div>
      </div>
    </aside>
  );
}
