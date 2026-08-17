import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SirenIcon,
  DispatchIcon,
  ActivityIcon,
  XIcon,
  EyeIcon,
  CompassIcon,
  ShieldIcon,
} from '../common/Icons';
import AdminResponseReadiness from './widgets/AdminResponseReadiness';
import StationShiftActivityWave from './widgets/StationShiftActivityWave';

export default function OperationsDrawer({
  isOpen,
  onClose,
  initialTab = 'alerts',
  incidents = [],
  patrols = [],
  trends = [],
  safetyScore = 88,
  selectedTrackId = null,
  onTrackPatrol,
  onSelectIncident,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);

  const pendingIncidents = incidents.filter(
    (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH' || i.status === 'OPEN'
  );

  const activeUnits = (patrols || []).filter((p) =>
    ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(p.status)
  );

  return (
    <aside
      className={`operations-drawer ${isOpen ? 'operations-drawer--open' : ''}`}
      aria-label="Active Operations & Intelligence Drawer"
    >
      {/* Drawer Top Header & Navigation Tabs */}
      <div className="operations-drawer__header">
        <div className="operations-drawer__tabs">
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'alerts' ? 'drawer-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <SirenIcon size={11} />
            <span>Alerts ({pendingIncidents.length})</span>
          </button>

          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'fleet' ? 'drawer-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('fleet')}
          >
            <DispatchIcon size={11} />
            <span>Patrols ({activeUnits.length})</span>
          </button>

          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'analytics' ? 'drawer-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <ActivityIcon size={11} />
            <span>Analytics</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '3px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Close Operations Drawer"
        >
          <XIcon size={15} />
        </button>
      </div>

      {/* Drawer Content Body */}
      <div className="operations-drawer__body">
        {/* TAB 1: CRITICAL ALERTS & TRIAGE */}
        {activeTab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                Operational Incident Triage
              </span>
              <button
                type="button"
                onClick={() => navigate('/station/queue')}
                style={{ background: 'none', border: 'none', color: 'var(--palette-sage)', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
              >
                View Full Queue &rarr;
              </button>
            </div>

            {pendingIncidents.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-state__icon">
                  <ShieldIcon size={22} />
                </div>
                <div className="empty-state__title">Operational Queue Clear</div>
                <div className="empty-state__text">No urgent incidents requiring dispatch in active jurisdiction.</div>
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
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
                    }}
                    onClick={() => onSelectIncident && onSelectIncident(inc)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span className={`badge badge--${isCrit ? 'critical' : isHigh ? 'high' : 'operational'}`}>
                        {inc.severity}
                      </span>
                      <span style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        #{inc.id}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '2px', lineHeight: 1.3 }}>
                      {inc.title}
                    </div>

                    <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inc.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--color-border-subtle)' }}>
                      <span style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
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
                        <DispatchIcon size={10} />
                        <span>Dispatch Unit</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE PATROL FLEET & LIVE GPS */}
        {activeTab === 'fleet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                Active Patrol Units ({activeUnits.length})
              </span>
              <button
                type="button"
                onClick={() => navigate('/station/dispatch')}
                style={{ background: 'none', border: 'none', color: 'var(--palette-sage)', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
              >
                Dispatch Console &rarr;
              </button>
            </div>

            {activeUnits.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-state__icon">
                  <DispatchIcon size={22} />
                </div>
                <div className="empty-state__title">No Active Patrols</div>
                <div className="empty-state__text">No units currently deployed in precinct.</div>
              </div>
            ) : (
              activeUnits.map((patrol) => {
                const isTracking = selectedTrackId === patrol.id;
                return (
                  <div
                    key={patrol.id}
                    className="card"
                    style={{
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                        UNIT #{patrol.id}
                      </span>
                      <span className="badge badge--verified">{patrol.status}</span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      <strong>Officer:</strong> {patrol.officer_username || `Officer #${patrol.officer}`}
                    </div>

                    {patrol.zone_name && (
                      <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                        <strong>Sector:</strong> {patrol.zone_name} • <strong>Priority:</strong> {patrol.priority}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                      {onTrackPatrol && (
                        <button
                          type="button"
                          onClick={() => onTrackPatrol(patrol.id)}
                          className={`btn btn-xs ${isTracking ? 'btn-danger' : 'btn-secondary'}`}
                        >
                          <CompassIcon size={11} />
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

        {/* TAB 3: READINESS & SHIFT ANALYTICS */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="card" style={{ padding: '12px' }}>
              <AdminResponseReadiness score={safetyScore} label="Operational Readiness" />
            </div>

            <div className="card" style={{ padding: '12px' }}>
              <StationShiftActivityWave trends={trends} title="24-Hour Shift Telemetry" />
            </div>

            <button
              type="button"
              onClick={() => navigate('/city/intelligence')}
              className="btn btn-secondary btn-sm btn-full"
            >
              <span>Open Full Intelligence & Predictive Analytics &rarr;</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
