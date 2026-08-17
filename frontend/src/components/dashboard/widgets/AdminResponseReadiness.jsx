import React, { useState } from 'react';
import useCountUp from '../../../hooks/useCountUp';

export default function AdminResponseReadiness({ score = 88, label = 'Admin Response Readiness' }) {
  const [activeTab, setActiveTab] = useState('day');
  const safeScore = Math.min(100, Math.max(0, score));
  const animatedScore = useCountUp(safeScore, 400);

  // 180-degree arc calculations
  const radius = 64;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;
  const angle = (safeScore / 100) * 180 - 90;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>
            {label}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
              {animatedScore}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' }}>/100</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '3px', background: 'var(--palette-chalk)', padding: '2px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
          {['day', 'week'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              style={{
                background: activeTab === t ? 'var(--palette-coastal-blue)' : 'transparent',
                color: activeTab === t ? '#FFFFFF' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-2xs)',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Arc Gauge */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '4px 0 8px', position: 'relative' }}>
        <svg width="150" height="85" viewBox="0 0 160 95">
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="var(--palette-chalk)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="url(#admin-readiness-grad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
          <defs>
            <linearGradient id="admin-readiness-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--palette-coastal-blue)" />
              <stop offset="60%" stopColor="var(--palette-coastal-blue)" />
              <stop offset="100%" stopColor="var(--palette-burning-flame)" />
            </linearGradient>
          </defs>

          {/* Needle Indicator */}
          <g transform={`translate(80, 80) rotate(${angle})`} style={{ transition: 'transform 0.4s ease' }}>
            <line x1="0" y1="0" x2="0" y2="-52" stroke="var(--palette-coastal-blue)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="0" cy="0" r="4" fill="var(--palette-burning-flame)" stroke="var(--palette-coastal-blue)" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-verified)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-verified)', display: 'inline-block' }} />
          Optimum Operational State
        </span>
        <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {activeTab === 'day' ? 'Last 24 Hours' : 'Last 7 Days'}
        </span>
      </div>
    </div>
  );
}
