import React, { useState } from 'react';

export default function ActivityTimeline({ incidents = [], onSelectIncident }) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [expandedId, setExpandedId] = useState(null);

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    return {
      date: d.getDate(),
      dayName: d.toLocaleString('default', { weekday: 'narrow' }),
      isToday: d.getDate() === today.getDate(),
      fullDate: d,
    };
  });

  const timelineItems = (incidents && incidents.length > 0)
    ? incidents.slice(0, 5).map((inc, i) => {
        const time = inc.date_occurred
          ? new Date(inc.date_occurred).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : `0${8 + i * 2}:00`;
        const isCrit = inc.severity === 'CRITICAL';
        const isHigh = inc.severity === 'HIGH';
        return {
          id: inc.id,
          time,
          title: inc.title.toUpperCase(),
          description: inc.description,
          severity: inc.severity,
          dotColor: isCrit ? 'var(--color-critical)' : isHigh ? 'var(--color-high)' : 'var(--palette-slate-blue)',
          bgColor: isCrit ? 'var(--color-critical-bg)' : isHigh ? 'var(--color-high-bg)' : 'var(--color-surface)',
          borderColor: isCrit ? 'var(--color-critical-border)' : isHigh ? 'var(--color-high-border)' : 'var(--color-border)',
        };
      })
    : [
        {
          id: 1,
          time: '08:00',
          title: 'JURISDICTION PATROL ACTIVE',
          description: 'Sector A-4 routine perimeter patrol and CCTV verification.',
          severity: 'LOW',
          dotColor: 'var(--color-verified)',
          bgColor: 'var(--color-verified-bg)',
          borderColor: 'var(--color-verified-border)',
        },
        {
          id: 2,
          time: '10:30',
          title: 'PRIORITY DISPATCH #102',
          description: 'Navrangpura commercial sector vehicle alert and investigation.',
          severity: 'HIGH',
          dotColor: 'var(--color-high)',
          bgColor: 'var(--color-high-bg)',
          borderColor: 'var(--color-high-border)',
        },
        {
          id: 3,
          time: '13:00',
          title: 'STATION SHIFT BRIEFING',
          description: 'Midday tactical handover and patrol status log.',
          severity: 'MEDIUM',
          dotColor: 'var(--palette-slate-blue)',
          bgColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        },
      ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>
            Shift Operations Schedule
          </span>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
            {today.toLocaleString('default', { month: 'short' })}, {today.getDate()} ({today.toLocaleString('default', { weekday: 'short' })})
          </div>
        </div>
      </div>

      {/* 7-Day Interactive Date Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          background: 'var(--palette-chalk)',
          padding: '4px 6px',
          borderRadius: 'var(--radius-xs)',
          marginBottom: '10px',
          border: '1px solid var(--color-border)',
        }}
      >
        {days.map((d, i) => {
          const isSelected = selectedDay === d.date;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDay(d.date)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1px',
                background: isSelected ? 'var(--palette-lilac)' : 'transparent',
                color: isSelected ? 'var(--palette-charcoal)' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-2xs)',
                padding: '3px 5px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                minWidth: '26px',
              }}
            >
              <span style={{ fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>{d.dayName}</span>
              <span style={{ fontSize: '11px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{d.date}</span>
            </button>
          );
        })}
      </div>

      {/* Vertical Connecting Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
        {timelineItems.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id || idx} style={{ display: 'flex', gap: '10px', position: 'relative' }}>
              <div style={{ width: '38px', flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                  {item.time}
                </span>
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: item.dotColor,
                    marginTop: '5px',
                    marginRight: '-13px',
                    zIndex: 2,
                  }}
                />
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: '41px',
                  top: '10px',
                  bottom: '-10px',
                  width: '1px',
                  backgroundColor: 'var(--color-border)',
                  zIndex: 1,
                  display: idx === timelineItems.length - 1 ? 'none' : 'block',
                }}
              />

              <div
                onClick={() => {
                  setExpandedId(isExpanded ? null : item.id);
                  if (onSelectIncident && item.id) onSelectIncident(item.id);
                }}
                style={{
                  flex: 1,
                  background: item.bgColor,
                  border: `1px solid ${item.borderColor}`,
                  borderRadius: 'var(--radius-xs)',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-fast)',
                  zIndex: 2,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {item.title}
                  </span>
                  <span
                    className={`badge badge--${
                      item.severity === 'CRITICAL'
                        ? 'critical'
                        : item.severity === 'HIGH'
                        ? 'high'
                        : item.severity === 'LOW'
                        ? 'verified'
                        : 'operational'
                    }`}
                    style={{ fontSize: '9px', padding: '1px 5px' }}
                  >
                    {item.severity}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '10px', color: 'var(--color-text-secondary)', lineHeight: 1.35 }}>
                  {item.description ? (isExpanded ? item.description : `${item.description.substring(0, 48)}...`) : 'Operational event record.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
