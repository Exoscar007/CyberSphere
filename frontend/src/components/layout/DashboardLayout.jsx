import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const navSections = [
  {
    title: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊', end: true },
    ],
  },
  {
    title: 'Operations',
    links: [
      { to: '/dashboard/fir', label: 'FIR Management', icon: '📋' },
      { to: '/dashboard/incidents', label: 'Incidents', icon: '🚨' },
      { to: '/dashboard/complaints', label: 'Complaints', icon: '📝' },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { to: '/dashboard/intelligence', label: 'Analytics & Map', icon: '🗺️' },
    ],
  },
  {
    title: 'Field Operations',
    links: [
      { to: '/dashboard/patrol', label: 'Patrol Management', icon: '🚔' },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/dashboard/reports', label: 'Reports & Health', icon: '📈' },
      { to: '/dashboard/users', label: 'User Management', icon: '👤' },
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
          <h1>⬡ CyberSphere</h1>
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
          <button className="btn btn--secondary btn--full btn--sm" onClick={handleLogout}>
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
