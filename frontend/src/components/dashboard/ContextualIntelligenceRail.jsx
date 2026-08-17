import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SirenIcon,
  DispatchIcon,
  ActivityIcon,
  XIcon,
  ShieldIcon,
  CompassIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '../common/Icons';
import AdminResponseReadiness from './widgets/AdminResponseReadiness';
import StationShiftActivityWave from './widgets/StationShiftActivityWave';

export default function ContextualIntelligenceRail({
  isOpen,
  onToggle,
  onClose,
  activeTab = 'alerts',
  onTabChange,
  incidents = [],
  patrols = [],
  trends = [],
  safetyScore = 94,
  selectedTrackId = null,
  onTrackPatrol,
  onSelectIncident,
}) {
  const navigate = useNavigate();

  const pendingIncidents = incidents.filter(
    (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH' || i.status === 'OPEN'
  );
  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL').length;
  const activeUnits = (patrols || []).filter((p) =>
    ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(p.status)
  );

  return (
    <div className="intelligence-rail" aria-label="Contextual Operational Intelligence Rail">
      {/* 1. SLIM VERTICAL CHIP STRIP (Always accessible on the right edge) */}
      <div className="intelligence-rail-tab-strip">
        {/* Alerts Chip */}
        <button
          type="button"
          onClick={() => {
            onTabChange('alerts');
            if (!isOpen) onToggle();
          }}
          className={`rail-chip-button ${criticalCount > 0 ? 'rail-chip-button--critical' : ''} ${isOpen && activeTab === 'alerts' ? 'rail-chip-button--active' : ''}`}
          title="Operational Incidents & Triage"
          aria-label="Operational Incidents & Triage"
        >
          <SirenIcon size={14} />
          {criticalCount > 0 && <span className="rail-badge-count">{criticalCount}</span>}
        </button>

        {/* Patrol Fleet Chip */}
        <button
          type="button"
          onClick={() => {
            onTabChange('fleet');
            if (!isOpen) onToggle();
          }}
          className={`rail-chip-button ${isOpen && activeTab === 'fleet' ? 'rail-chip-button--active' : ''}`}
          title="Active Patrol Fleet"
          aria-label="Active Patrol Fleet"
        >
          <DispatchIcon size={14} />
          {activeUnits.length > 0 && (
            <span style={{ fontSize: '8px', fontWeight: '800', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {activeUnits.length}
            </span>
          )}
        </button>

        {/* Telemetry / Analytics Chip */}
        <button
          type="button"
          onClick={() => {
            onTabChange('analytics');
            if (!isOpen) onToggle();
          }}
          className={`rail-chip-button ${isOpen && activeTab === 'analytics' ? 'rail-chip-button--active' : ''}`}
          title="Response Readiness & Shift Wave"
          aria-label="Response Readiness & Shift Wave"
        >
          <ActivityIcon size={14} />
          <span style={{ fontSize: '7.5px', fontWeight: '800', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {safetyScore}%
          </span>
        </button>

        {/* Expand / Collapse Arrow */}
        <div style={{ marginTop: 'auto' }}>
          <button
            type="button"
            onClick={onToggle}
            className="rail-chip-button"
            title={isOpen ? 'Collapse Intelligence Rail' : 'Expand Intelligence Rail'}
            aria-label={isOpen ? 'Collapse Intelligence Rail' : 'Expand Intelligence Rail'}
            style={{ width: '26px', height: '26px' }}
          >
            {isOpen ? <ChevronRightIcon size={12} /> : <ChevronLeftIcon size={12} />}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED SLIDE-OVER INTELLIGENCE DRAWER */}
      {isOpen && (
        <div className="intelligence-rail-content" style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {/* Header */}
          <div className="intelligence-rail-header">
            <div className="intelligence-rail-tabs">
              <button
                type="button"
                className={`drawer-tab-btn ${activeTab === 'alerts' ? 'drawer-tab-btn--active' : ''}`}
                onClick={() => onTabChange('alerts')}
              >
                <SirenIcon size={10} />
                <span>Alerts ({pendingIncidents.length})</span>
              </button>
              <button
                type="button"
                className={`drawer-tab-btn ${activeTab === 'fleet' ? 'drawer-tab-btn--active' : ''}`}
                onClick={() => onTabChange('fleet')}
              >
                <DispatchIcon size={10} />
                <span>Patrols ({activeUnits.length})</span>
              </button>
              <button
                type="button"
                className={`drawer-tab-btn ${activeTab === 'analytics' ? 'drawer-tab-btn--active' : ''}`}
                onClick={() => onTabChange('analytics')}
              >
                <ActivityIcon size={10} />
                <span>Telemetry</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
              aria-label="Close intelligence drawer"
            >
              <XIcon size={14} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="intelligence-rail-body">
            {/* TAB 1: INCIDENT TRIAGE STREAM */}
            {activeTab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                    Active Incident Stream
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/station/queue')}
                    style={{ background: 'none', border: 'none', color: 'var(--palette-sage)', fontSize: '9.5px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    View All Queue &rarr;
                  </button>
                </div>

                {pendingIncidents.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <div className="empty-state__icon">
                      <ShieldIcon size={20} />
                    </div>
                    <div className="empty-state__title">Operational Queue Clear</div>
                    <div className="empty-state__text">No urgent incidents requiring dispatch.</div>
                  </div>
                ) : (
                  pendingIncidents.slice(0, 10).map((inc) => {
                    const isCrit = inc.severity === 'CRITICAL';
                    const isHigh = inc.severity === 'HIGH';

                    return (
                      <div
                        key={inc.id}
                        className="card"
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          transition: 'background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast)',
                          animation: 'slideInRight 0.2s ease-out',
                        }}
                        onClick={() => onSelectIncident && onSelectIncident(inc)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span className={`badge badge--${isCrit ? 'critical' : isHigh ? 'high' : 'operational'}`}>
                            {inc.severity}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            #{inc.id}
                          </span>
                        </div>

                        <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '2px', lineHeight: 1.3 }}>
                          {inc.title}
                        </div>

                        <p style={{ margin: 0, fontSize: '10px', color: 'var(--color-text-secondary)', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inc.description}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid var(--color-border-subtle)' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {inc.date_occurred ? new Date(inc.date_occurred).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/station/dispatch', { state: { incident: inc } });
                            }}
                            className="btn btn-sage btn-xs"
                          >
                            <DispatchIcon size={9} />
                            <span>Dispatch</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: ACTIVE PATROL FLEET & STATE PROGRESSION */}
            {activeTab === 'fleet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                    Active Units ({activeUnits.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/station/dispatch')}
                    style={{ background: 'none', border: 'none', color: 'var(--palette-sage)', fontSize: '9.5px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Dispatch Deck &rarr;
                  </button>
                </div>

                {activeUnits.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <div className="empty-state__icon">
                      <DispatchIcon size={20} />
                    </div>
                    <div className="empty-state__title">No Active Patrols</div>
                    <div className="empty-state__text">No units currently assigned in precinct.</div>
                  </div>
                ) : (
                  activeUnits.map((patrol) => {
                    const isTracking = selectedTrackId === patrol.id;

                    return (
                      <div
                        key={patrol.id}
                        className="card"
                        style={{
                          padding: '8px 10px',
                          animation: 'slideInRight 0.2s ease-out',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                            UNIT #{patrol.id}
                          </span>
                          <span className="badge badge--verified">{patrol.status}</span>
                        </div>

                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          <strong>Officer:</strong> {patrol.officer_username || `Officer #${patrol.officer}`}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          {onTrackPatrol && (
                            <button
                              type="button"
                              onClick={() => onTrackPatrol(patrol.id)}
                              className={`btn btn-xs ${isTracking ? 'btn-danger' : 'btn-secondary'}`}
                            >
                              <CompassIcon size={10} />
                              <span>{isTracking ? 'Stop Live GPS' : 'Live GPS Track'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: READINESS & SHIFT WAVE TELEMETRY */}
            {activeTab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="card" style={{ padding: '10px' }}>
                  <AdminResponseReadiness score={safetyScore} label="Operational Readiness" />
                </div>

                <div className="card" style={{ padding: '10px' }}>
                  <StationShiftActivityWave trends={trends} title="24-Hour Shift Telemetry" />
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/city/intelligence')}
                  className="btn btn-secondary btn-sm btn-full"
                >
                  <span>Predictive Intelligence Console &rarr;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
