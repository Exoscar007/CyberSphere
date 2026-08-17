import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import CityCommandSidebar from './CityCommandSidebar';
import StationConsoleSidebar from './StationConsoleSidebar';
import OfficerWorkspaceSidebar from './OfficerWorkspaceSidebar';

export default function RoleBasedLayout({ role }) {
  const location = useLocation();
  const isMapView = location.pathname.endsWith('/overview') || location.pathname === '/city' || location.pathname === '/station';

  let SidebarComponent;
  if (role === 'ADMIN') {
    SidebarComponent = CityCommandSidebar;
  } else if (role === 'STATION') {
    SidebarComponent = StationConsoleSidebar;
  } else {
    SidebarComponent = OfficerWorkspaceSidebar;
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="app-layout__body">
        <SidebarComponent />
        <main className={`app-layout__main ${isMapView ? 'app-layout__main--map-view' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
