import React, { useState } from 'react';
import useCountUp from '../../../hooks/useCountUp';

export default function StationShiftActivityWave({ trends = [], title = 'Station Shift Activity Wave' }) {
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
  const height = 80;
  const padding = 12;

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
  const animatedCount = useCountUp(activePoint ? activePoint.count : data[data.length - 1]?.count, 350);

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
            {title}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
              {animatedCount}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--palette-coastal-blue)', fontWeight: '700', textTransform: 'uppercase' }}>
              {activePoint ? activePoint.label : 'Active Peak'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '3px', background: 'var(--palette-chalk)', padding: '2px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setViewMode('wave')}
            style={{
              background: viewMode === 'wave' ? 'var(--palette-coastal-blue)' : 'transparent',
              color: viewMode === 'wave' ? '#FFFFFF' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-2xs)',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Wave
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bars')}
            style={{
              background: viewMode === 'bars' ? 'var(--palette-coastal-blue)' : 'transparent',
              color: viewMode === 'bars' ? '#FFFFFF' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-2xs)',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Bars
          </button>
        </div>
      </div>

      {/* SVG Wave / Bar Mode */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px`, margin: '4px 0' }}>
        {viewMode === 'wave' ? (
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="shift-wave-area" x1="0%" y1="0%" x2="0%" y2="1">
                <stop offset="0%" stopColor="#285570" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#285570" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="shift-wave-stroke" x1="0%" y1="0%" x2="1" y2="0">
                <stop offset="0%" stopColor="#285570" />
                <stop offset="60%" stopColor="#285570" />
                <stop offset="100%" stopColor="#FFB162" />
              </linearGradient>
            </defs>

            <path d={areaD} fill="url(#shift-wave-area)" />
            <path d={pathD} fill="none" stroke="url(#shift-wave-stroke)" strokeWidth="2.5" strokeLinecap="round" />

            {/* Interactive hover points & crosshairs */}
            {points.map((pt, idx) => (
              <g key={idx} onMouseEnter={() => setHoverIndex(idx)} style={{ cursor: 'pointer' }}>
                {hoverIndex === idx && (
                  <line
                    x1={pt.x}
                    y1={0}
                    x2={pt.x}
                    y2={height}
                    stroke="var(--palette-coastal-blue)"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIndex === idx ? 5 : 2.5}
                  fill="#FFFFFF"
                  stroke="var(--palette-coastal-blue)"
                  strokeWidth="2"
                  style={{ transition: 'r 0.15s ease' }}
                />
                <rect x={pt.x - 10} y={0} width={20} height={height} fill="transparent" />
              </g>
            ))}
          </svg>
        ) : (
          /* Bar view */
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: '5px', padding: '0 4px' }}>
            {data.map((d, idx) => {
              const barH = (d.count / maxVal) * (height - 16);
              const isHover = hoverIndex === idx;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, barH)}px`,
                    background: isHover ? 'var(--palette-burning-flame)' : 'var(--palette-coastal-blue)',
                    opacity: isHover ? 1 : 0.8,
                    borderRadius: '2px 2px 0 0',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    position: 'relative',
                  }}
                >
                  {isHover && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#FFFFFF',
                        border: '1px solid var(--palette-burning-flame)',
                        borderRadius: 'var(--radius-2xs)',
                        padding: '1px 5px',
                        fontSize: '9.5px',
                        fontWeight: '800',
                        color: 'var(--color-text-primary)',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: 'var(--shadow-sm)',
                        fontFamily: 'var(--font-mono)',
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

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--color-border)', paddingTop: '4px' }}>
        {data.map((d, i) => (
          <span key={i} style={{ color: hoverIndex === i ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: hoverIndex === i ? '800' : '500' }}>
            {d.label.substring(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}
