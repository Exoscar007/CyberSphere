import React from 'react';
import { SlidersIcon, MaximizeIcon, MinimizeIcon, CheckIcon, FilterIcon } from '../../common/Icons';

export default function JurisdictionFilterBar({
  timeFilter,
  setTimeFilter,
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  stationFilter,
  setStationFilter,
  stations = [],
  isCustomizing,
  onToggleCustomizing,
  isFocusMode,
  onToggleFocusMode,
}) {
  const timeRanges = [
    { id: '1h', label: '1h' },
    { id: '24h', label: '24h' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div
      className="filter-pills-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xs)',
        boxShadow: 'var(--shadow-sm)',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      {/* Left: Time Range Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary)', letterSpacing: '0.5px', marginRight: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <FilterIcon size={12} />
          Range:
        </span>

        {timeRanges.map((tf) => {
          const isActive = timeFilter === tf.id;
          return (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTimeFilter(tf.id)}
              className={`filter-pill ${isActive ? 'filter-pill--active' : ''}`}
            >
              {tf.label}
            </button>
          );
        })}
      </div>

      {/* Center / Right: Dropdown Selects & Actions */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="filter-select"
          aria-label="Filter by Severity"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
          aria-label="Filter by Status"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open (Incident)</option>
          <option value="RESOLVED">Resolved (Incident)</option>
          <option value="ASSIGNED">Assigned (Patrol)</option>
          <option value="EN_ROUTE">En Route (Patrol)</option>
          <option value="COMPLETED">Completed (Patrol)</option>
        </select>

        {stations.length > 0 && (
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by Station"
          >
            <option value="">All Stations</option>
            {stations.map((s) => (
              <option key={s.station_id || s.id} value={s.station_id || s.id}>
                {s.station_name || s.name}
              </option>
            ))}
          </select>
        )}

        {/* Dashboard Customization Mode Toggle */}
        <button
          type="button"
          onClick={onToggleCustomizing}
          className={`btn btn-sm ${isCustomizing ? 'btn-primary' : 'btn-secondary'}`}
        >
          {isCustomizing ? <CheckIcon size={12} /> : <SlidersIcon size={12} />}
          <span>{isCustomizing ? 'Done Editing' : 'Customize'}</span>
        </button>

        {/* Command Center Focus Mode Toggle */}
        {onToggleFocusMode && (
          <button
            type="button"
            onClick={onToggleFocusMode}
            className={`btn btn-sm ${isFocusMode ? 'btn-sage' : 'btn-secondary'}`}
          >
            {isFocusMode ? <MinimizeIcon size={12} /> : <MaximizeIcon size={12} />}
            <span>{isFocusMode ? 'Exit Focus' : 'Focus GIS'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
