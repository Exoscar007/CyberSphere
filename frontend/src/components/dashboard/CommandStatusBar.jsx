import React from 'react';
import {
  FileTextIcon,
  SirenIcon,
  DispatchIcon,
  ShieldIcon,
} from '../common/Icons';
import FilterPopover from './FilterPopover';

export default function CommandStatusBar({
  totalCount = 0,
  criticalCount = 0,
  patrolCount = 0,
  readinessScore = 98,
  onOpenDrawer,
  drawerOpen = false,
  activeDrawerTab = 'alerts',
  // Filter Props
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
  const hasCritical = criticalCount > 0;

  return (
    <div className="command-status-bar" role="toolbar" aria-label="Operational Telemetry & Filter Bar">
      {/* Left: Compact Operational Metric Modules */}
      <div className="command-status-bar__metrics">
        {/* Total Cases */}
        <div
          className="status-module"
          onClick={() => onOpenDrawer('alerts')}
          title="Click to view total registered cases"
          role="button"
          tabIndex={0}
        >
          <span style={{ color: 'var(--palette-slate-blue)', display: 'flex' }}>
            <FileTextIcon size={12} />
          </span>
          <span className="status-module__label">Total Cases</span>
          <span className="status-module__value">{totalCount}</span>
        </div>

        {/* Critical Alerts */}
        <div
          className={`status-module ${hasCritical ? 'status-module--critical' : ''} ${drawerOpen && activeDrawerTab === 'alerts' ? 'status-module--active' : ''}`}
          onClick={() => onOpenDrawer('alerts')}
          title="Click to open critical alerts triage"
          role="button"
          tabIndex={0}
        >
          <span style={{ color: hasCritical ? 'var(--color-critical)' : 'var(--palette-sage)', display: 'flex' }}>
            <SirenIcon size={12} />
          </span>
          <span className="status-module__label" style={{ color: hasCritical ? 'var(--color-critical)' : undefined }}>
            Critical
          </span>
          <span className="status-module__value" style={{ color: hasCritical ? 'var(--color-critical)' : undefined }}>
            {criticalCount}
          </span>
        </div>

        {/* Active Patrol Fleet */}
        <div
          className={`status-module ${drawerOpen && activeDrawerTab === 'fleet' ? 'status-module--active' : ''}`}
          onClick={() => onOpenDrawer('fleet')}
          title="Click to view active patrol fleet"
          role="button"
          tabIndex={0}
        >
          <span style={{ color: 'var(--color-high)', display: 'flex' }}>
            <DispatchIcon size={12} />
          </span>
          <span className="status-module__label">Patrols</span>
          <span className="status-module__value">{patrolCount}</span>
        </div>

        {/* Response Readiness */}
        <div
          className={`status-module ${drawerOpen && activeDrawerTab === 'analytics' ? 'status-module--active' : ''}`}
          onClick={() => onOpenDrawer('analytics')}
          title="Click to view readiness gauge and shift telemetry"
          role="button"
          tabIndex={0}
        >
          <span style={{ color: 'var(--color-verified)', display: 'flex' }}>
            <ShieldIcon size={12} />
          </span>
          <span className="status-module__label">Readiness</span>
          <span className="status-module__value" style={{ color: 'var(--color-verified)' }}>
            {readinessScore}%
          </span>
        </div>
      </div>

      {/* Right: Compact Filter Popover & Active Operations Drawer Toggle */}
      <div className="command-status-bar__actions">
        {/* Compact Filters Popover */}
        <FilterPopover
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          stationFilter={stationFilter}
          setStationFilter={setStationFilter}
          stations={stations}
        />

        {/* Operations Drawer Toggle Button */}
        <button
          type="button"
          onClick={() => onOpenDrawer(drawerOpen ? null : 'alerts')}
          className={`btn btn-sm ${drawerOpen ? 'btn-sage' : hasCritical ? 'btn-danger' : 'btn-secondary'}`}
          style={{ gap: '5px' }}
        >
          {hasCritical ? <SirenIcon size={12} /> : <DispatchIcon size={12} />}
          <span>{drawerOpen ? 'Close Drawer' : hasCritical ? `${criticalCount} Urgent` : 'Operations'}</span>
        </button>
      </div>
    </div>
  );
}
