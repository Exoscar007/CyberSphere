import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CyberMap from '../map/CyberMap';
import CommandPalette from '../common/CommandPalette';
import DetailDrawer from '../dynamic/DetailDrawer';
import AdminResponseReadiness from '../dashboard/widgets/AdminResponseReadiness';
import StationShiftActivityWave from '../dashboard/widgets/StationShiftActivityWave';
import FilterPopover from '../dashboard/FilterPopover';
import {
  SearchIcon,
  SirenIcon,
  DispatchIcon,
  ShieldIcon,
  FileTextIcon,
  XIcon,
  CompassIcon,
  EyeIcon,
  ActivityIcon,
  LayersIcon,
  RefreshIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '../common/Icons';

const AHMEDABAD_CENTER = [23.0225, 72.5714];

export default function CityCommandCanvas({
  stats,
  incidents = [],
  activePatrols = [],
  trends = [],
  workload = [],
  safetyScore = 94,
  selectedTrackId = null,
  trackLocations = [],
  onTrackPatrol,
  // Filter props
  timeFilter,
  setTimeFilter,
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  stationFilter,
  setStationFilter,
}) {
  const navigate = useNavigate();

  // Floating Overlays State
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [detailDrawerIncident, setDetailDrawerIncident] = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Thin Edge Intelligence Rail State
  const [railOpen, setRailOpen] = useState(false);
  const [railTab, setRailTab] = useState('alerts'); // 'alerts' | 'fleet' | 'analytics'

  // Live Sync Monospace Timestamp
  const [syncTime, setSyncTime] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => setSyncTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Set the most critical incident as the initial floating contextual focus if available
  useEffect(() => {
    if (!selectedIncident && incidents.length > 0) {
      const highest = incidents.find((i) => i.severity === 'CRITICAL') || incidents[0];
      setSelectedIncident(highest);
    }
  }, [incidents, selectedIncident]);

  const criticalIncidents = useMemo(() => {
    return incidents.filter((i) => i.severity === 'CRITICAL');
  }, [incidents]);

  const pendingIncidents = useMemo(() => {
    return incidents.filter(
      (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH' || i.status === 'OPEN'
    );
  }, [incidents]);

  const criticalCount = stats?.critical_incidents !== undefined
    ? stats.critical_incidents
    : criticalIncidents.length;

  const totalCount = stats?.total_incidents !== undefined
    ? stats.total_incidents
    : incidents.length;

  const handleSelectMarker = (inc) => {
    setSelectedIncident(inc);
  };

  return (
    <div className="command-canvas-root" role="region" aria-label="Interactive City Command Canvas">
      {/* =========================================================================
          LAYER 1: FULL WORKSPACE GIS COMMAND MAP ENVIRONMENT
          ========================================================================= */}
      <div className="command-canvas-map-container">
        <CyberMap
          center={AHMEDABAD_CENTER}
          zoom={12}
          incidents={incidents}
          activePatrols={activePatrols}
          selectedTrackId={selectedTrackId}
          trackLocations={trackLocations}
          onTrackPatrol={onTrackPatrol}
          onViewAudit={(id) => {
            const found = incidents.find((i) => i.id === parseInt(id));
            if (found) setDetailDrawerIncident(found);
            else navigate(`/city/history/${id}`);
          }}
          autoFit={true}
        />
      </div>

      {/* =========================================================================
          LAYER 2: TOP-CENTER FLOATING COMMAND SEARCH HUD
          ========================================================================= */}
      <div
        className="canvas-hud-search canvas-glass"
        onClick={() => setPaletteOpen(true)}
        role="button"
        tabIndex={0}
        title="Command Search & Navigation (Ctrl + K)"
      >
        <span style={{ color: 'var(--palette-slate-blue)', display: 'flex' }}>
          <SearchIcon size={14} />
        </span>
        <span className="canvas-hud-search__text">
          Search command, incident, or location...
        </span>
        <kbd className="canvas-hud-search__kbd">Ctrl K</kbd>
      </div>

      {/* =========================================================================
          LAYER 3: ASYMMETRIC FLOATING CITY STATUS MODULE (TOP-RIGHT)
          ========================================================================= */}
      <div className="canvas-hud-status canvas-glass" aria-label="Citywide Operational Status">
        <div className="canvas-hud-status__header">
          <span className="canvas-hud-status__live-dot" />
          <span className="canvas-hud-status__title">CITY STATUS</span>
          <span className="canvas-hud-status__station">AHMEDABAD HQ</span>
        </div>

        <div className="canvas-hud-status__grid">
          {/* Total Cases */}
          <div
            className="canvas-status-metric"
            onClick={() => {
              setRailTab('alerts');
              setRailOpen(true);
            }}
            title="Total Registered Cases"
          >
            <div className="canvas-status-metric__num">{String(totalCount).padStart(2, '0')}</div>
            <div className="canvas-status-metric__label">Cases</div>
          </div>

          {/* Critical Alerts */}
          <div
            className={`canvas-status-metric ${criticalCount > 0 ? 'canvas-status-metric--critical' : ''}`}
            onClick={() => {
              setRailTab('alerts');
              setRailOpen(true);
            }}
            title="Critical Priority Incidents"
          >
            <div className="canvas-status-metric__num">{String(criticalCount).padStart(2, '0')}</div>
            <div className="canvas-status-metric__label">Critical</div>
          </div>

          {/* Active Patrol Fleet */}
          <div
            className="canvas-status-metric"
            onClick={() => {
              setRailTab('fleet');
              setRailOpen(true);
            }}
            title="Active Patrol Fleet"
          >
            <div className="canvas-status-metric__num">{String(activePatrols.length).padStart(2, '0')}</div>
            <div className="canvas-status-metric__label">Patrols</div>
          </div>

          {/* Response Readiness */}
          <div
            className="canvas-status-metric"
            onClick={() => setShowAnalyticsModal(true)}
            title="Response Readiness Score"
          >
            <div className="canvas-status-metric__num" style={{ color: 'var(--color-verified)' }}>
              {safetyScore}%
            </div>
            <div className="canvas-status-metric__label">Ready</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          LAYER 4: CONTEXTUAL FLOATING INCIDENT CARD (TOP-LEFT / CENTER-LEFT)
          ========================================================================= */}
      {selectedIncident && (
        <div className="canvas-hud-incident canvas-glass" aria-label="Contextual Incident Card">
          <div className="canvas-hud-incident__header">
            <span
              className={`badge badge--${
                selectedIncident.severity === 'CRITICAL'
                  ? 'critical'
                  : selectedIncident.severity === 'HIGH'
                  ? 'high'
                  : 'operational'
              }`}
            >
              {selectedIncident.severity} PRIORITY
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="canvas-hud-incident__time">
                {selectedIncident.date_occurred
                  ? new Date(selectedIncident.date_occurred).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'LIVE'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="canvas-close-btn"
                aria-label="Dismiss incident card"
              >
                <XIcon size={12} />
              </button>
            </div>
          </div>

          <div className="canvas-hud-incident__title">
            #{selectedIncident.id}: {selectedIncident.title}
          </div>

          <div className="canvas-hud-incident__desc">
            {selectedIncident.description}
          </div>

          <div className="canvas-hud-incident__meta">
            <span>SECTOR: <strong>AHMEDABAD CENTRAL</strong></span>
            <span>STATUS: <strong>{selectedIncident.status}</strong></span>
          </div>

          <div className="canvas-hud-incident__actions">
            <button
              type="button"
              onClick={() => navigate('/station/dispatch', { state: { incident: selectedIncident } })}
              className={`btn btn-xs ${selectedIncident.severity === 'CRITICAL' ? 'btn-terracotta' : 'btn-coastal'}`}
              style={{ flex: 1 }}
            >
              <DispatchIcon size={11} />
              <span>Dispatch Unit</span>
            </button>
            <button
              type="button"
              onClick={() => setDetailDrawerIncident(selectedIncident)}
              className="btn btn-secondary btn-xs"
              style={{ flex: 1 }}
            >
              <EyeIcon size={11} />
              <span>View Incident</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYER 5: FLOATING LIVE CITY ACTIVITY WAVEFORM MODULE (BOTTOM-LEFT)
          ========================================================================= */}
      <div
        className="canvas-hud-activity canvas-glass"
        onClick={() => setShowAnalyticsModal(true)}
        role="button"
        tabIndex={0}
        title="Click to view full 24-hour shift telemetry analytics"
      >
        <div className="canvas-hud-activity__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ActivityIcon size={12} style={{ color: 'var(--palette-sage)' }} />
            <span className="canvas-hud-activity__title">LIVE CITY ACTIVITY</span>
          </div>
          <span className="canvas-hud-activity__peak">PEAK 09:00</span>
        </div>

        {/* Dynamic Activity Waveform Bars */}
        <div className="canvas-waveform">
          {[40, 25, 60, 30, 75, 90, 45, 80, 100, 65, 50, 85, 35, 70].map((h, i) => (
            <div
              key={i}
              className="canvas-waveform-bar"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 0.1}s`,
                backgroundColor: h >= 85 ? 'var(--color-critical)' : h >= 65 ? 'var(--palette-sage)' : 'var(--palette-slate-blue)',
              }}
            />
          ))}
        </div>
      </div>

      {/* =========================================================================
          LAYER 6: FLOATING RESPONSE READINESS MODULE (BOTTOM-RIGHT)
          ========================================================================= */}
      <div
        className="canvas-hud-readiness canvas-glass"
        onClick={() => setShowAnalyticsModal(true)}
        role="button"
        tabIndex={0}
        title="Click to expand response readiness analytics"
      >
        <div className="canvas-hud-readiness__label">RESPONSE READINESS</div>
        <div className="canvas-hud-readiness__val">
          <span style={{ color: 'var(--color-verified)' }}>{safetyScore}%</span>
          <span className="canvas-hud-readiness__state">OPTIMAL</span>
        </div>
        {/* Subtle curve stroke indicator */}
        <div className="canvas-readiness-track">
          <div className="canvas-readiness-fill" style={{ width: `${safetyScore}%` }} />
        </div>
      </div>

      {/* =========================================================================
          LAYER 7: FLOATING BOTTOM COMMAND BAR / TELEMETRY HUD
          ========================================================================= */}
      <div className="canvas-hud-bottom canvas-glass" role="status" aria-label="System Status Bar">
        <div className="canvas-hud-bottom__left">
          <div className="canvas-hud-bottom__item">
            <span className="canvas-status-dot-pulse" />
            <span style={{ fontWeight: '800', color: 'var(--color-verified)', fontSize: '9px' }}>
              LIVE TELEMETRY
            </span>
          </div>

          <span className="canvas-divider" />

          <div
            className="canvas-hud-bottom__item canvas-hud-bottom__item--clickable"
            onClick={() => {
              setRailTab('alerts');
              setRailOpen(true);
            }}
          >
            <span>Cases:</span>
            <strong>{totalCount}</strong>
          </div>

          <div
            className="canvas-hud-bottom__item canvas-hud-bottom__item--clickable"
            onClick={() => {
              setRailTab('alerts');
              setRailOpen(true);
            }}
            style={{ color: criticalCount > 0 ? 'var(--color-critical)' : undefined }}
          >
            <span>Critical:</span>
            <strong>{criticalCount}</strong>
          </div>

          <div
            className="canvas-hud-bottom__item canvas-hud-bottom__item--clickable"
            onClick={() => {
              setRailTab('fleet');
              setRailOpen(true);
            }}
          >
            <span>Patrols:</span>
            <strong>{activePatrols.length}</strong>
          </div>
        </div>

        <div className="canvas-hud-bottom__right">
          <FilterPopover
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            stationFilter={stationFilter}
            setStationFilter={setStationFilter}
            stations={workload}
          />

          <span className="canvas-divider" />

          <span className="canvas-hud-bottom__sync">
            LAST SYNC {syncTime}
          </span>
        </div>
      </div>

      {/* =========================================================================
          LAYER 8: THIN EDGE INTELLIGENCE RAIL (RIGHT EDGE SLIDE-OVER)
          ========================================================================= */}
      <div className="canvas-edge-rail" aria-label="Contextual Intelligence Edge Rail">
        {/* Slim Floating Edge Strip */}
        <div className="canvas-edge-strip canvas-glass">
          <button
            type="button"
            onClick={() => {
              setRailTab('alerts');
              setRailOpen((prev) => (railTab === 'alerts' ? !prev : true));
            }}
            className={`canvas-rail-btn ${criticalCount > 0 ? 'canvas-rail-btn--critical' : ''} ${railOpen && railTab === 'alerts' ? 'canvas-rail-btn--active' : ''}`}
            title="Active Alerts & Triage Stream"
          >
            <SirenIcon size={14} />
            {criticalCount > 0 && <span className="canvas-rail-badge">{criticalCount}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setRailTab('fleet');
              setRailOpen((prev) => (railTab === 'fleet' ? !prev : true));
            }}
            className={`canvas-rail-btn ${railOpen && railTab === 'fleet' ? 'canvas-rail-btn--active' : ''}`}
            title="Active Patrol Fleet"
          >
            <DispatchIcon size={14} />
            {activePatrols.length > 0 && <span className="canvas-rail-subtext">{activePatrols.length}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setRailTab('analytics');
              setRailOpen((prev) => (railTab === 'analytics' ? !prev : true));
            }}
            className={`canvas-rail-btn ${railOpen && railTab === 'analytics' ? 'canvas-rail-btn--active' : ''}`}
            title="Shift Telemetry & Readiness"
          >
            <ActivityIcon size={14} />
            <span className="canvas-rail-subtext">{safetyScore}%</span>
          </button>

          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => setRailOpen(!railOpen)}
              className="canvas-rail-btn"
              style={{ width: '28px', height: '28px' }}
              title={railOpen ? 'Collapse Intelligence Rail' : 'Expand Intelligence Rail'}
            >
              {railOpen ? <ChevronRightIcon size={12} /> : <ChevronLeftIcon size={12} />}
            </button>
          </div>
        </div>

        {/* Floating Slide-over Intelligence Drawer */}
        {railOpen && (
          <div className="canvas-rail-drawer canvas-glass">
            <div className="canvas-rail-drawer__header">
              <div className="canvas-rail-drawer__tabs">
                <button
                  type="button"
                  className={`drawer-tab-btn ${railTab === 'alerts' ? 'drawer-tab-btn--active' : ''}`}
                  onClick={() => setRailTab('alerts')}
                >
                  <SirenIcon size={10} />
                  <span>Alerts ({pendingIncidents.length})</span>
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${railTab === 'fleet' ? 'drawer-tab-btn--active' : ''}`}
                  onClick={() => setRailTab('fleet')}
                >
                  <DispatchIcon size={10} />
                  <span>Patrols ({activePatrols.length})</span>
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${railTab === 'analytics' ? 'drawer-tab-btn--active' : ''}`}
                  onClick={() => setRailTab('analytics')}
                >
                  <ActivityIcon size={10} />
                  <span>Analytics</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setRailOpen(false)}
                className="canvas-close-btn"
                aria-label="Close intelligence drawer"
              >
                <XIcon size={13} />
              </button>
            </div>

            <div className="canvas-rail-drawer__body">
              {/* TAB 1: INCIDENT STREAM */}
              {railTab === 'alerts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                      Priority Triage Feed
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/station/queue')}
                      style={{ background: 'none', border: 'none', color: 'var(--palette-sage)', fontSize: '9.5px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      View Queue &rarr;
                    </button>
                  </div>

                  {pendingIncidents.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      <ShieldIcon size={22} className="empty-state__icon" />
                      <div className="empty-state__title">No Active Alerts</div>
                      <div className="empty-state__text">City jurisdiction triage stream is normal.</div>
                    </div>
                  ) : (
                    pendingIncidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="canvas-triage-card"
                        onClick={() => setSelectedIncident(inc)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span className={`badge badge--${inc.severity === 'CRITICAL' ? 'critical' : inc.severity === 'HIGH' ? 'high' : 'operational'}`}>
                            {inc.severity}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            #{inc.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                          {inc.title}
                        </div>
                        <div style={{ fontSize: '9.5px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                          {inc.description}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid var(--color-border-subtle)' }}>
                          <span style={{ fontSize: '8.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {inc.date_occurred ? new Date(inc.date_occurred).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/station/dispatch', { state: { incident: inc } });
                            }}
                            className={`btn btn-xs ${inc.severity === 'CRITICAL' ? 'btn-terracotta' : 'btn-coastal'}`}
                          >
                            <DispatchIcon size={9} />
                            <span>Dispatch</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: PATROL FLEET */}
              {railTab === 'fleet' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                      Active Units ({activePatrols.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/station/dispatch')}
                      style={{ background: 'none', border: 'none', color: 'var(--palette-sage)', fontSize: '9.5px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Dispatch Deck &rarr;
                    </button>
                  </div>

                  {activePatrols.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      <DispatchIcon size={22} className="empty-state__icon" />
                      <div className="empty-state__title">No Patrols Active</div>
                      <div className="empty-state__text">No units currently assigned on duty.</div>
                    </div>
                  ) : (
                    activePatrols.map((patrol) => {
                      const isTracking = selectedTrackId === patrol.id;
                      return (
                        <div
                          key={patrol.id}
                          className="canvas-triage-card"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                              UNIT #{patrol.id}
                            </span>
                            <span className="badge badge--verified">{patrol.status}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                            <strong>Officer:</strong> {patrol.officer_username || `Officer #${patrol.officer}`}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
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

              {/* TAB 3: SHIFT TELEMETRY */}
              {railTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="card" style={{ padding: '10px' }}>
                    <AdminResponseReadiness score={safetyScore} label="Operational Readiness" />
                  </div>
                  <div className="card" style={{ padding: '10px' }}>
                    <StationShiftActivityWave trends={trends} title="24h Shift Wave" />
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/city/intelligence')}
                    className="btn btn-secondary btn-sm btn-full"
                  >
                    <span>Full Predictive Console &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          LAYER 9: EXPANDABLE ANALYTICS MODAL (WHEN KPI / ACTIVITY CLICKED)
          ========================================================================= */}
      {showAnalyticsModal && (
        <div className="modal-overlay" onClick={() => setShowAnalyticsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ActivityIcon size={16} style={{ color: 'var(--palette-sage)' }} />
                <h2 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-primary)' }}>
                  Ahmedabad City Command Telemetry Analytics
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAnalyticsModal(false)}
                className="canvas-close-btn"
                aria-label="Close modal"
              >
                <XIcon size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="card" style={{ padding: '12px' }}>
                <AdminResponseReadiness score={safetyScore} label="Readiness Index" />
              </div>
              <div className="card" style={{ padding: '12px' }}>
                <StationShiftActivityWave trends={trends} title="24-Hour Telemetry" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAnalyticsModal(false);
                  navigate('/city/intelligence');
                }}
                className="btn btn-primary btn-sm"
              >
                <span>Open Crime Intelligence & Risk Center &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYER 10: FORENSIC INCIDENT DETAIL DRAWER
          ========================================================================= */}
      <DetailDrawer
        isOpen={detailDrawerIncident !== null}
        onClose={() => setDetailDrawerIncident(null)}
        incident={detailDrawerIncident}
      />

      {/* =========================================================================
          LAYER 11: UNIVERSAL COMMAND PALETTE (CTRL + K)
          ========================================================================= */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAction={(action) => {
          if (action === 'toggle_rail') setRailOpen((prev) => !prev);
          if (action === 'filter_critical') {
            setRailTab('alerts');
            setRailOpen(true);
          }
        }}
      />
    </div>
  );
}
