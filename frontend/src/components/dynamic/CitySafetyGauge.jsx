import React, { useState } from 'react';

export default function CitySafetyGauge({ score = 88, label = 'Jurisdiction Safety Index' }) {
  const [activeTab, setActiveTab] = useState('day');
  const safeScore = Math.min(100, Math.max(0, score));

  const radius = 64;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;
  const angle = (safeScore / 100) * 180 - 90;

  return (
    <div
      className="card dynamic-widget"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <span className="card-subtitle" style={{ color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>
            {label}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-cream)', fontFamily: 'var(--font-family-mono)' }}>
              {safeScore}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: '600' }}>/100</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-base)', padding: '3px', borderRadius: 'var(--radius-full)' }}>
          {['day', 'week'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                background: activeTab === t ? 'var(--palette-lilac)' : 'transparent',
                color: activeTab === t ? '#1E2522' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
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

      {/* SVG Circular Arc Gauge with Serene Skies Gradients */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '4px 0 10px', position: 'relative' }}>
        <svg width="160" height="95" viewBox="0 0 160 95">
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="var(--color-surface-hover)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="url(#serene-gauge-gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
          <defs>
            <linearGradient id="serene-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64766A" />
              <stop offset="50%" stopColor="#94A7AE" />
              <stop offset="100%" stopColor="#C0A9BD" />
            </linearGradient>
          </defs>

          {/* Needle Indicator */}
          <g transform={`translate(80, 80) rotate(${angle})`} style={{ transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <line x1="0" y1="0" x2="0" y2="-52" stroke="var(--color-cream)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="0" cy="0" r="5" fill="var(--palette-lilac)" stroke="var(--color-cream)" strokeWidth="2" />
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
        <span style={{ fontSize: '11px', color: '#9ECDB3', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>●</span> Optimum Readiness State
        </span>
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
          {activeTab === 'day' ? 'Today (24h)' : 'Last 7 Days'}
        </span>
      </div>
    </div>
  );
}
