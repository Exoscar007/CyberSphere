import React, { useState } from 'react';

export default function LiveTrendChart({ trends = [], title = 'Operational Frequency Wave' }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [viewMode, setViewMode] = useState('wave');

  const defaultData = [
    { label: 'Mon', count: 12 },
    { label: 'Tue', count: 18 },
    { label: 'Wed', count: 14 },
    { label: 'Thu', count: 24 },
    { label: 'Fri', count: 28 },
    { label: 'Sat', count: 32 },
    { label: 'Sun', count: 20 },
  ];

  const data = trends && trends.length > 0
    ? trends.slice(0, 12).map((t, idx) => ({
        label: t.hour_label || t.day_name || `H${idx}`,
        count: t.count || t.frequency || Math.floor(Math.random() * 20 + 5),
      }))
    : defaultData;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const width = 280;
  const height = 90;
  const padding = 15;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.count / maxVal) * (height - 2 * padding);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

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
            {title}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-cream)', fontFamily: 'var(--font-family-mono)' }}>
              {activePoint ? activePoint.count : data[data.length - 1]?.count}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--palette-lilac)', fontWeight: '700' }}>
              {activePoint ? activePoint.label : 'Current Peak'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-base)', padding: '3px', borderRadius: 'var(--radius-full)' }}>
          <button
            onClick={() => setViewMode('wave')}
            style={{
              background: viewMode === 'wave' ? 'var(--palette-lilac)' : 'transparent',
              color: viewMode === 'wave' ? '#1E2522' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Wave
          </button>
          <button
            onClick={() => setViewMode('bars')}
            style={{
              background: viewMode === 'bars' ? 'var(--palette-lilac)' : 'transparent',
              color: viewMode === 'bars' ? '#1E2522' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Bars
          </button>
        </div>
      </div>

      {/* SVG Wave / Bar */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px`, margin: '4px 0' }}>
        {viewMode === 'wave' ? (
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="serene-wave-area" x1="0%" y1="0%" x2="0%" y2="1">
                <stop offset="0%" stopColor="#C0A9BD" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#94A7AE" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="serene-wave-stroke" x1="0%" y1="0%" x2="1" y2="0">
                <stop offset="0%" stopColor="#64766A" />
                <stop offset="50%" stopColor="#94A7AE" />
                <stop offset="100%" stopColor="#C0A9BD" />
              </linearGradient>
            </defs>

            <path d={areaD} fill="url(#serene-wave-area)" />
            <path d={pathD} fill="none" stroke="url(#serene-wave-stroke)" strokeWidth="3" strokeLinecap="round" />

            {points.map((pt, idx) => (
              <g key={idx} onMouseEnter={() => setHoverIndex(idx)} style={{ cursor: 'pointer' }}>
                <circle cx={pt.x} cy={pt.y} r={hoverIndex === idx ? 6 : 3} fill="var(--color-cream)" stroke="var(--palette-lilac)" strokeWidth="2" style={{ transition: 'r 0.2s' }} />
                <rect x={pt.x - 12} y={0} width={24} height={height} fill="transparent" />
              </g>
            ))}
          </svg>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: '6px', padding: '0 8px' }}>
            {data.map((d, idx) => {
              const barH = (d.count / maxVal) * (height - 20);
              const isHover = hoverIndex === idx;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                  style={{
                    flex: 1,
                    height: `${Math.max(6, barH)}px`,
                    background: isHover ? 'var(--palette-lilac)' : 'var(--palette-slate-blue)',
                    opacity: isHover ? 1 : 0.65,
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    position: 'relative',
                  }}
                >
                  {isHover && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--color-bg-base)',
                        border: '1px solid var(--palette-lilac)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '2px 6px',
                        fontSize: '9px',
                        fontWeight: '700',
                        color: 'var(--color-cream)',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                      }}
                    >
                      {d.count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
        {data.map((d, i) => (
          <span key={i} style={{ color: hoverIndex === i ? 'var(--color-cream)' : 'var(--color-text-muted)', fontWeight: hoverIndex === i ? '700' : '400' }}>
            {d.label.substring(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}
