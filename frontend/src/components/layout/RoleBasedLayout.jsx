import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import CityCommandSidebar from './CityCommandSidebar';
import StationConsoleSidebar from './StationConsoleSidebar';
import OfficerWorkspaceSidebar from './OfficerWorkspaceSidebar';

export default function RoleBasedLayout({ role }) {
  let SidebarComponent;
  
  if (role === 'ADMIN') {
    SidebarComponent = CityCommandSidebar;
  } else if (role === 'STATION') {
    SidebarComponent = StationConsoleSidebar;
  } else {
    SidebarComponent = OfficerWorkspaceSidebar;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <SidebarComponent />
        <main style={{ flex: 1, overflowY: 'hidden', padding: 0, backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

