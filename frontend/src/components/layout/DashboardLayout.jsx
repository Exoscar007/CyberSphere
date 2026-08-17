import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  SecurityMark,
  MapIcon,
  IntelligenceIcon,
  FileTextIcon,
  SirenIcon,
  DispatchIcon,
  ReportsIcon,
  UsersIcon,
} from '../common/Icons';

const navSections = [
  {
    title: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: <MapIcon size={16} />, end: true },
    ],
  },
  {
    title: 'Operations',
    links: [
      { to: '/dashboard/fir', label: 'FIR Management', icon: <FileTextIcon size={16} /> },
      { to: '/dashboard/incidents', label: 'Incidents', icon: <SirenIcon size={16} /> },
      { to: '/dashboard/complaints', label: 'Complaints', icon: <FileTextIcon size={16} /> },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { to: '/dashboard/intelligence', label: 'Analytics & Map', icon: <IntelligenceIcon size={16} /> },
    ],
  },
  {
    title: 'Field Operations',
    links: [
      { to: '/dashboard/patrol', label: 'Patrol Management', icon: <DispatchIcon size={16} /> },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/dashboard/reports', label: 'Reports & Health', icon: <ReportsIcon size={16} /> },
      { to: '/dashboard/users', label: 'User Management', icon: <UsersIcon size={16} /> },
    ],
  },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="sidebar__brand">
          <SecurityMark size={20} />
          <h1>CyberSphere</h1>
          <span>Command Center</span>
        </div>

        <nav className="sidebar__nav">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="sidebar__section-title">{section.title}</div>
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                  }
                >
                  <span>{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {(user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar__user-info">
              <div className="sidebar__username">{user.username || 'User'}</div>
              <div className="sidebar__role">{user.role || 'Officer'}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-full btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="layout__main">
        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
