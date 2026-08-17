import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedLayout from './components/layout/RoleBasedLayout';
import { ToastProvider } from './context/ToastContext';

// Shared Pages
import UserManagementPage from './features/users/pages/UserManagementPage';
import FIRPage from './features/crimes/pages/FIRPage';
import IncidentPage from './features/crimes/pages/IncidentPage';
import ComplaintPage from './features/crimes/pages/ComplaintPage';
import IntelligenceDashboard from './features/intelligence/pages/IntelligenceDashboard';
import PatrolPage from './features/patrol/pages/PatrolPage';
import ReportsPage from './features/reports/pages/ReportsPage';
import OverviewPage from './features/dashboard/pages/OverviewPage';
import StationConsolePage from './features/dashboard/pages/StationConsolePage';
import InvestigatorWorkspacePage from './features/dashboard/pages/InvestigatorWorkspacePage';
import EvidenceReviewPage from './features/crimes/pages/EvidenceReviewPage';
import OperationalHistoryPage from './features/reports/pages/OperationalHistoryPage';
import IncidentAuditPage from './features/reports/pages/IncidentAuditPage';

import './App.css';

// Dynamic role-based home redirect
function DynamicHomeRedirect() {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" replace />;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'ADMIN') return <Navigate to="/city/overview" replace />;
  if (user.role === 'STATION' || user.role === 'POLICE_OFFICER' || user.role === 'POLICE') {
    return <Navigate to="/station/overview" replace />;
  }
  return <Navigate to="/officer/workspace" replace />;
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* CITY COMMAND ROUTES */}
          <Route path="/city" element={<ProtectedRoute><RoleBasedLayout role="ADMIN" /></ProtectedRoute>}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="intelligence" element={<IntelligenceDashboard />} />
            <Route path="firs" element={<FIRPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="history" element={<OperationalHistoryPage />} />
            <Route path="history/:id" element={<IncidentAuditPage />} />
          </Route>

          {/* STATION CONSOLE ROUTES */}
          <Route path="/station" element={<ProtectedRoute><RoleBasedLayout role="STATION" /></ProtectedRoute>}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<StationConsolePage />} />
            <Route path="dispatch" element={<PatrolPage />} />
            <Route path="queue" element={<IncidentPage />} />
            <Route path="firs" element={<FIRPage />} />
            <Route path="history" element={<OperationalHistoryPage />} />
            <Route path="history/:id" element={<IncidentAuditPage />} />
          </Route>

          {/* OFFICER / INVESTIGATOR WORKSPACE ROUTES */}
          <Route path="/officer" element={<ProtectedRoute><RoleBasedLayout role="OFFICER" /></ProtectedRoute>}>
            <Route index element={<Navigate to="workspace" replace />} />
            <Route path="workspace" element={<InvestigatorWorkspacePage />} />
            <Route path="create-fir" element={<FIRPage />} />
            <Route path="evidence" element={<EvidenceReviewPage />} />
          </Route>

          {/* Fallback Aliases & Default Redirects */}
          <Route path="/dashboard" element={<DynamicHomeRedirect />} />
          <Route path="/" element={<DynamicHomeRedirect />} />
          <Route path="*" element={<DynamicHomeRedirect />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
