import React, { useState, useEffect } from 'react';
import { FilterIcon, XIcon, CheckIcon } from '../common/Icons';

export default function FilterPopover({
  timeFilter = '7d',
  setTimeFilter,
  severityFilter = '',
  setSeverityFilter,
  statusFilter = '',
  setStatusFilter,
  stationFilter = '',
  setStationFilter,
  stations = [],
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Local draft state for staging filter changes before applying
  const [draftTime, setDraftTime] = useState(timeFilter);
  const [draftSeverity, setDraftSeverity] = useState(severityFilter);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftStation, setDraftStation] = useState(stationFilter);

  // Sync draft state when opening drawer
  useEffect(() => {
    if (isOpen) {
      setDraftTime(timeFilter);
      setDraftSeverity(severityFilter);
      setDraftStatus(statusFilter);
      setDraftStation(stationFilter);
    }
  }, [isOpen, timeFilter, severityFilter, statusFilter, stationFilter]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const timeRanges = [
    { id: '1h', label: '1h' },
    { id: '24h', label: '24h' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
    { id: 'all', label: 'All' },
  ];

  const severities = [
    { id: '', label: 'All Severities' },
    { id: 'CRITICAL', label: 'Critical', color: 'var(--color-critical)' },
    { id: 'HIGH', label: 'High', color: 'var(--color-high)' },
    { id: 'MEDIUM', label: 'Medium', color: 'var(--palette-coastal-blue)' },
    { id: 'LOW', label: 'Low', color: 'var(--color-verified)' },
  ];

  const statuses = [
    { id: '', label: 'All Statuses' },
    { id: 'OPEN', label: 'Open' },
    { id: 'DISPATCHED', label: 'Dispatched' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'RESOLVED', label: 'Resolved' },
  ];

  // Calculate active filter count
  let activeCount = 0;
  if (timeFilter && timeFilter !== '7d' && timeFilter !== 'all') activeCount++;
  if (severityFilter) activeCount++;
  if (statusFilter) activeCount++;
  if (stationFilter) activeCount++;

  const handleApply = () => {
    if (setTimeFilter) setTimeFilter(draftTime);
    if (setSeverityFilter) setSeverityFilter(draftSeverity);
    if (setStatusFilter) setStatusFilter(draftStatus);
    if (setStationFilter) setStationFilter(draftStation);
    setIsOpen(false);
  };

  const handleClear = () => {
    setDraftTime('7d');
    setDraftSeverity('');
    setDraftStatus('');
    setDraftStation('');
    if (setTimeFilter) setTimeFilter('7d');
    if (setSeverityFilter) setSeverityFilter('');
    if (setStatusFilter) setStatusFilter('');
    if (setStationFilter) setStationFilter('');
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`btn btn-sm ${activeCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
        style={{ gap: '6px', height: '32px', padding: '0 12px' }}
        title="Open Operational Jurisdiction Filters"
        aria-expanded={isOpen}
      >
        <FilterIcon size={13} />
        <span>Filters</span>
        {activeCount > 0 && (
          <span
            style={{
              backgroundColor: '#FFFFFF',
              color: 'var(--palette-charcoal-slate)',
              borderRadius: 'var(--radius-full)',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.2,
            }}
          >
            {activeCount} active
          </span>
        )}
      </button>

      {/* FILTER DRAWER / MODAL OVERLAY */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(27, 38, 50, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 1200,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Operational Filters Drawer"
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              height: '100%',
              backgroundColor: '#FFFFFF',
              borderLeft: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              animation: 'slideInRight 200ms ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--palette-chalk)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FilterIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--palette-charcoal-slate)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Operational Filters
                  </h3>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '3px 0 0 0' }}>
                  Filter incidents, GIS layers, and tactical units
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="canvas-close-btn"
                aria-label="Close filter drawer"
                style={{ width: '28px', height: '28px' }}
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Scrollable Filter Controls */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {/* Active Filter Indicator */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--palette-chalk)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                  Filter Status
                </span>
                <span className={`badge badge--${activeCount > 0 ? 'high' : 'neutral'}`}>
                  {activeCount > 0 ? `${activeCount} filters active` : 'Default View (All)'}
                </span>
              </div>

              {/* 1. Time Range */}
              <div>
                <label className="form-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700' }}>
                  Time Range
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {timeRanges.map((tf) => {
                    const isSelected = draftTime === tf.id;
                    return (
                      <button
                        key={tf.id}
                        type="button"
                        onClick={() => setDraftTime(tf.id)}
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        style={{ height: '34px', fontSize: '12px', fontWeight: isSelected ? '700' : '500' }}
                      >
                        {tf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Severity Priority */}
              <div>
                <label className="form-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700' }}>
                  Severity Priority
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {severities.map((sev) => {
                    const isSelected = draftSeverity === sev.id;
                    return (
                      <button
                        key={sev.id || 'all'}
                        type="button"
                        onClick={() => setDraftSeverity(sev.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-xs)',
                          border: isSelected ? '2px solid var(--palette-coastal-blue)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'var(--palette-chalk)' : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: isSelected ? '700' : '500', color: 'var(--color-text-primary)' }}>
                          {sev.color && <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: sev.color }} />}
                          <span>{sev.label}</span>
                        </div>
                        {isSelected && <CheckIcon size={14} style={{ color: 'var(--palette-coastal-blue)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Operational Status */}
              <div>
                <label className="form-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700' }}>
                  Operational Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {statuses.map((st) => {
                    const isSelected = draftStatus === st.id;
                    return (
                      <button
                        key={st.id || 'all'}
                        type="button"
                        onClick={() => setDraftStatus(st.id)}
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        style={{ height: '34px', fontSize: '11.5px', justifyContent: 'center' }}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Police Station Jurisdiction (if available) */}
              {stations.length > 0 && (
                <div>
                  <label className="form-label" htmlFor="filter_station_select" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700' }}>
                    Precinct / Station Jurisdiction
                  </label>
                  <select
                    id="filter_station_select"
                    value={draftStation}
                    onChange={(e) => setDraftStation(e.target.value)}
                    className="form-input"
                    style={{ height: '38px', fontSize: '12.5px' }}
                  >
                    <option value="">All Municipal Stations</option>
                    {stations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'var(--palette-chalk)',
                display: 'flex',
                gap: '10px',
                justifyContent: 'space-between',
              }}
            >
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-secondary"
                style={{ flex: 1, height: '40px', fontSize: '13px', fontWeight: '600' }}
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="btn btn-primary"
                style={{ flex: 1.3, height: '40px', fontSize: '13px', fontWeight: '700' }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
