import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchIcon,
  MapIcon,
  IntelligenceIcon,
  FileTextIcon,
  HistoryIcon,
  UsersIcon,
  ReportsIcon,
  DispatchIcon,
  SirenIcon,
  RefreshIcon,
  LogOutIcon,
  XIcon,
  ShieldIcon,
} from './Icons';

export default function CommandPalette({ isOpen, onClose, onAction }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const profile = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = profile.role === 'ADMIN';

  const commands = [
    {
      group: 'Navigation & Operations',
      items: [
        { id: 'nav-overview', title: 'City Command Overview GIS Map', icon: <MapIcon size={14} />, action: () => navigate(isAdmin ? '/city/overview' : '/station/overview') },
        { id: 'nav-intel', title: 'Crime Intelligence & Spatial Prediction', icon: <IntelligenceIcon size={14} />, action: () => navigate('/city/intelligence') },
        { id: 'nav-firs', title: 'Global FIR Management & Ledger', icon: <FileTextIcon size={14} />, action: () => navigate(isAdmin ? '/city/firs' : '/station/firs') },
        { id: 'nav-dispatch', title: 'Patrol Fleet Proximity & Dispatch', icon: <DispatchIcon size={14} />, action: () => navigate('/station/dispatch') },
        { id: 'nav-queue', title: 'Incident Triage & Priority Queue', icon: <SirenIcon size={14} />, action: () => navigate('/station/queue') },
        { id: 'nav-history', title: 'Operational Case History & Cryptographic Audit', icon: <HistoryIcon size={14} />, action: () => navigate(isAdmin ? '/city/history' : '/station/history') },
        ...(isAdmin ? [
          { id: 'nav-users', title: 'Personnel Authorization & Roles', icon: <UsersIcon size={14} />, action: () => navigate('/city/users') },
          { id: 'nav-reports', title: 'System Diagnostics & Telemetry Reports', icon: <ReportsIcon size={14} />, action: () => navigate('/city/reports') },
        ] : []),
      ],
    },
    {
      group: 'Gujarat Cyber Crime Taxonomy & Categories',
      items: [
        { id: 'cat-card', title: 'Online Financial & Card Fraud (ATM/UPI)', icon: <ShieldIcon size={14} />, action: () => navigate(isAdmin ? '/city/firs' : '/station/firs') },
        { id: 'cat-job', title: 'Recruitment & Job Offer Scams', icon: <ShieldIcon size={14} />, action: () => navigate(isAdmin ? '/city/firs' : '/station/firs') },
        { id: 'cat-loan', title: 'Unregulated Instant Loan App Fraud', icon: <ShieldIcon size={14} />, action: () => navigate(isAdmin ? '/city/firs' : '/station/firs') },
        { id: 'cat-social', title: 'Social Media Impersonation & Harassment', icon: <ShieldIcon size={14} />, action: () => navigate(isAdmin ? '/city/firs' : '/station/firs') },
        { id: 'cat-ransomware', title: 'Ransomware & Critical Infrastructure Attacks', icon: <ShieldIcon size={14} />, action: () => navigate(isAdmin ? '/city/firs' : '/station/firs') },
        { id: 'cat-datatheft', title: 'Corporate Data Theft & Unauthorized Access', icon: <ShieldIcon size={14} />, action: () => navigate(isAdmin ? '/city/firs' : '/station/firs') },
      ],
    },
    {
      group: 'Tactical Commands',
      items: [
        { id: 'act-critical', title: 'Triage Critical Priority Incidents', icon: <SirenIcon size={14} />, action: () => onAction && onAction('filter_critical') },
        { id: 'act-drawer', title: 'Toggle Contextual Intelligence Rail', icon: <DispatchIcon size={14} />, action: () => onAction && onAction('toggle_rail') },
        { id: 'act-reset', title: 'Reset Map View to Ahmedabad Command HQ', icon: <RefreshIcon size={14} />, action: () => onAction && onAction('reset_map') },
        { id: 'act-logout', title: 'Terminate Session & Sign Out', icon: <LogOutIcon size={14} />, action: () => { localStorage.clear(); navigate('/login'); } },
      ],
    },
  ];

  const flatItems = commands.flatMap((g) => g.items).filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-modal" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette__search-box">
          <span style={{ color: 'var(--palette-slate-blue)', display: 'flex' }}>
            <SearchIcon size={16} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette__input"
            placeholder="Type a command, incident, or cybercrime type (e.g. card fraud, dispatch, fir)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
            aria-label="Close Command Palette"
          >
            <XIcon size={14} />
          </button>
        </div>

        <div className="command-palette__list">
          {flatItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
              No matching commands or categories found.
            </div>
          ) : (
            flatItems.map((item, idx) => (
              <div
                key={item.id}
                className={`command-palette__item ${selectedIndex === idx ? 'command-palette__item--active' : ''}`}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: selectedIndex === idx ? 'var(--palette-sage)' : 'var(--color-text-secondary)', display: 'flex' }}>
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                </div>
                {selectedIndex === idx && (
                  <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    SELECT ↵
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="command-palette__footer">
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate</span>
          <span>Press <strong>ESC</strong> to dismiss</span>
        </div>
      </div>
    </div>
  );
}
