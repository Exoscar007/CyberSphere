import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchIcon,
  SirenIcon,
  DispatchIcon,
  ShieldIcon,
  FileTextIcon,
  XIcon,
  CompassIcon,
  EyeIcon,
  LayersIcon,
} from '../common/Icons';

export default function SpatialMapOverlay({
  // Global search trigger
  onOpenCommandPalette,
  // Telemetry props
  totalIncidents = 0,
  criticalCount = 0,
  patrolCount = 0,
  readinessScore = 98,
  onOpenRail,
  // Contextual Selected Marker (Incident or Patrol)
  selectedMarker = null,
  onCloseMarkerContext,
  // Actions
  onTrackPatrol,
  isTrackingPatrol = false,
  onViewAudit,
}) {
  const navigate = useNavigate();
  const hasCritical = criticalCount > 0;

  return (
    <>
      {/* 1. TOP FLOATING SEARCH & COMMAND HUD */}
      <div
        className="spatial-search-hud spatial-hud-glass"
        onClick={onOpenCommandPalette}
        role="button"
        tabIndex={0}
        title="Open Command & Search Palette (Ctrl + K)"
      >
        <span style={{ color: 'var(--palette-slate-blue)', display: 'flex' }}>
          <SearchIcon size={13} />
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
          Search command, incident, or precinct...
        </span>
        <kbd
          style={{
            background: 'var(--palette-chalk)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-2xs)',
            padding: '1px 5px',
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
            marginLeft: '6px',
          }}
        >
          Ctrl K
        </kbd>
      </div>

      {/* 2. BOTTOM-LEFT ASYMMETRIC FLOATING CITY STATUS STRIP */}
      <div className="floating-status-capsule spatial-hud-glass">
        {/* System Operational Badge */}
        <div className="floating-status-chip" title="Real-time Command Telemetry">
          <div className="header-status-pill__dot" />
          <span style={{ fontSize: '9.5px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-verified)' }}>
            ONLINE
          </span>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--color-border)' }} />

        {/* Total Incidents */}
        <div
          className="floating-status-chip"
          onClick={() => onOpenRail && onOpenRail('alerts')}
          title="Click to view all incidents"
        >
          <span style={{ color: 'var(--palette-slate-blue)', display: 'flex' }}>
            <FileTextIcon size={11} />
          </span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Cases:</span>
          <span style={{ fontSize: '10.5px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
            {totalIncidents}
          </span>
        </div>

        {/* Critical Alerts (Pulsing when > 0) */}
        <div
          className="floating-status-chip"
          onClick={() => onOpenRail && onOpenRail('alerts')}
          title="Click to view critical alerts triage"
          style={{
            backgroundColor: hasCritical ? 'var(--color-critical-bg)' : undefined,
            padding: hasCritical ? '2px 6px' : undefined,
            borderRadius: 'var(--radius-full)',
          }}
        >
          <span style={{ color: hasCritical ? 'var(--color-critical)' : 'var(--palette-sage)', display: 'flex' }}>
            <SirenIcon size={11} />
          </span>
          <span style={{ fontSize: '10px', fontWeight: hasCritical ? '700' : 'normal', color: hasCritical ? 'var(--color-critical)' : 'var(--color-text-secondary)' }}>
            Critical:
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: hasCritical ? 'var(--color-critical)' : 'var(--color-text-primary)' }}>
            {criticalCount}
          </span>
        </div>

        {/* Active Patrol Fleet */}
        <div
          className="floating-status-chip"
          onClick={() => onOpenRail && onOpenRail('fleet')}
          title="Click to view active patrol fleet"
        >
          <span style={{ color: 'var(--color-high)', display: 'flex' }}>
            <DispatchIcon size={11} />
          </span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Patrols:</span>
          <span style={{ fontSize: '10.5px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
            {patrolCount}
          </span>
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--color-border)' }} />

        {/* Response Readiness Waveform */}
        <div
          className="floating-status-chip"
          onClick={() => onOpenRail && onOpenRail('analytics')}
          title="Click to view readiness telemetry"
        >
          <div className="status-wave-bars">
            <div className="status-wave-bar" style={{ height: '50%', animationDelay: '0s' }} />
            <div className="status-wave-bar" style={{ height: '90%', animationDelay: '0.2s' }} />
            <div className="status-wave-bar" style={{ height: '70%', animationDelay: '0.4s' }} />
            <div className="status-wave-bar" style={{ height: '100%', animationDelay: '0.1s' }} />
          </div>
          <span style={{ fontSize: '10.5px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-verified)' }}>
            {readinessScore}%
          </span>
        </div>
      </div>

      {/* 3. CONTEXTUAL SPATIAL MARKER HUD (Floating near selected marker) */}
      {selectedMarker && (
        <div className="marker-context-hud spatial-hud-glass">
          {/* Header */}
          <div className="marker-context-hud__header">
            {selectedMarker.type === 'incident' ? (
              <span className={`badge badge--${selectedMarker.data.severity === 'CRITICAL' ? 'critical' : selectedMarker.data.severity === 'HIGH' ? 'high' : 'operational'}`}>
                {selectedMarker.data.severity} INCIDENT
              </span>
            ) : (
              <span className="badge badge--verified">
                PATROL UNIT
              </span>
            )}
            <button
              type="button"
              onClick={onCloseMarkerContext}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
              aria-label="Dismiss marker HUD"
            >
              <XIcon size={13} />
            </button>
          </div>

          {/* Incident Context Details */}
          {selectedMarker.type === 'incident' && (
            <>
              <div className="marker-context-hud__title">
                #{selectedMarker.data.id}: {selectedMarker.data.title}
              </div>
              <div className="marker-context-hud__desc">
                {selectedMarker.data.description}
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                OCCURRED: {selectedMarker.data.date_occurred ? new Date(selectedMarker.data.date_occurred).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} • STATUS: {selectedMarker.data.status}
              </div>
              <div className="marker-context-hud__actions">
                <button
                  type="button"
                  onClick={() => navigate('/station/dispatch', { state: { incident: selectedMarker.data } })}
                  className="btn btn-sage btn-xs"
                  style={{ flex: 1 }}
                >
                  <DispatchIcon size={10} />
                  <span>Dispatch Unit</span>
                </button>
                {onViewAudit && (
                  <button
                    type="button"
                    onClick={() => onViewAudit(selectedMarker.data.id)}
                    className="btn btn-secondary btn-xs"
                    style={{ flex: 1 }}
                  >
                    <EyeIcon size={10} />
                    <span>Audit Trail</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Patrol Unit Context Details */}
          {selectedMarker.type === 'patrol' && (
            <>
              <div className="marker-context-hud__title">
                UNIT #{selectedMarker.data.id} • {selectedMarker.data.officer_username}
              </div>
              <div className="marker-context-hud__desc">
                Status: <strong>{selectedMarker.data.status}</strong> • Sector: {selectedMarker.data.zone_name || 'Jurisdiction'}
              </div>
              <div className="marker-context-hud__actions">
                {onTrackPatrol && (
                  <button
                    type="button"
                    onClick={() => onTrackPatrol(selectedMarker.data.id)}
                    className={`btn btn-xs ${isTrackingPatrol ? 'btn-danger' : 'btn-sage'}`}
                    style={{ flex: 1 }}
                  >
                    <CompassIcon size={10} />
                    <span>{isTrackingPatrol ? 'Stop GPS Track' : 'Live GPS Track'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/station/dispatch')}
                  className="btn btn-secondary btn-xs"
                  style={{ flex: 1 }}
                >
                  <span>Dispatch Log</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
