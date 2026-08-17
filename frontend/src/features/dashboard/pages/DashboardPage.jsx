import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header style={{ 
        backgroundColor: 'var(--color-primary)', 
        color: 'white', 
        padding: '16px 24px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: '600', fontSize: '18px' }}>CyberSphere Command Dashboard</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Officer: {user.username || 'Unknown'}</span>
          <button 
            onClick={handleLogout} 
            className="btn" 
            style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '24px' }}>
        <div className="card">
          <h2>Dashboard</h2>
          <p style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>
            Welcome to the CyberSphere platform. Features will be implemented in subsequent milestones.
          </p>
        </div>
      </main>
    </div>
  );
}
