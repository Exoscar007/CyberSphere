import React, { useState, useEffect, useRef } from 'react';
import { FilterIcon, RefreshIcon, XIcon, CheckIcon } from '../common/Icons';

export default function FilterPopover({
  timeFilter,
  setTimeFilter,
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  stationFilter,
  setStationFilter,
  stations = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  const timeRanges = [
    { id: '1h', label: '1h' },
    { id: '24h', label: '24h' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
    { id: 'all', label: 'All' },
  ];

  // Calculate active filter count (excluding defaults)
  let activeCount = 0;
  if (timeFilter && timeFilter !== '7d' && timeFilter !== 'all') activeCount++;
  if (severityFilter) activeCount++;
  if (statusFilter) activeCount++;
  if (stationFilter) activeCount++;

  const handleReset = () => {
    setTimeFilter('7d');
    setSeverityFilter('');
    setStatusFilter('');
    setStationFilter('');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`btn btn-sm ${activeCount > 0 ? 'btn-sage' : 'btn-secondary'}`}
        style={{ gap: '5px' }}
      >
        <FilterIcon size={12} />
        <span>Filters</span>
        {activeCount > 0 && (
          <span
            style={{
              background: '#FFFFFF',
              color: 'var(--palette-charcoal)',
              borderRadius: 'var(--radius-full)',
              padding: '1px 5px',
              fontSize: '8.5px',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1,
            }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="filter-popover-menu" role="dialog" aria-label="Jurisdiction Filters">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-primary)' }}>
              Operational Filters
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <XIcon size={13} />
              </button>
            </div>
          </div>

          {/* Time Range Pills */}
          <div>
            <label className="form-label" style={{ marginBottom: '3px' }}>Time Range</label>
            <div style={{ display: 'flex', gap: '3px' }}>
              {timeRanges.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeFilter(tf.id)}
                  className={`btn btn-xs ${timeFilter === tf.id ? 'btn-sage' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="pop_sev_filter">Severity Priority</label>
            <select
              id="pop_sev_filter"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="form-input"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="pop_stat_filter">Operational Status</label>
            <select
              id="pop_stat_filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open (Incident)</option>
              <option value="RESOLVED">Resolved (Incident)</option>
              <option value="ASSIGNED">Assigned (Patrol)</option>
              <option value="EN_ROUTE">En Route (Patrol)</option>
              <option value="COMPLETED">Completed (Patrol)</option>
            </select>
          </div>

          {/* Station Selection */}
          {stations.length > 0 && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="pop_stn_filter">Jurisdiction Precinct</label>
              <select
                id="pop_stn_filter"
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="form-input"
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                <option value="">All Precincts</option>
                {stations.map((s) => (
                  <option key={s.station_id || s.id} value={s.station_id || s.id}>
                    {s.station_name || s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn btn-sage btn-full btn-sm"
            style={{ marginTop: '4px' }}
          >
            <CheckIcon size={12} />
            <span>Apply Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
