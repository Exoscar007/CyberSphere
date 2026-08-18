import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CyberMap from '../map/CyberMap';
import CommandPalette from '../common/CommandPalette';
import DetailDrawer from '../dynamic/DetailDrawer';
import FilterPopover from '../dashboard/FilterPopover';
import {
  SearchIcon,
  DispatchIcon,
  XIcon,
  EyeIcon,
  ActivityIcon,
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
  stations = [],
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
            if (found) setSelectedIncident(found);
            else navigate(`/city/history/${id}`);
          }}
          autoFit={true}
        />
      </div>

      {/* =========================================================================
          LAYER 2: TOP UNIFIED COMMAND & NAVIGATION BAR
          ========================================================================= */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          pointerEvents: 'none',
        }}
      >
        {/* Left: Command Search Pill */}
        <div
          className="canvas-hud-search"
          onClick={() => setPaletteOpen(true)}
          role="button"
          tabIndex={0}
          title="Command Search & Navigation (Ctrl + K)"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            minWidth: '280px',
          }}
        >
          <span style={{ color: 'var(--palette-coastal-blue)', display: 'flex' }}>
            <SearchIcon size={14} />
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', flex: 1 }}>
            Search command, incident, sector...
          </span>
          <kbd
            style={{
              fontSize: '10px',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--palette-chalk)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-2xs)',
              padding: '2px 5px',
              color: 'var(--color-text-secondary)',
            }}
          >
            Ctrl K
          </kbd>
        </div>

        {/* Center: Clean Metric Chips */}
        <div
          className="canvas-hud-status"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', cursor: 'pointer' }}
            onClick={() => {
              setRailTab('alerts');
              setRailOpen(true);
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>Cases:</span>
            <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
              {totalCount}
            </span>
          </div>

          <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--color-border)' }} />

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', cursor: 'pointer' }}
            onClick={() => {
              setRailTab('alerts');
              setRailOpen(true);
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-critical)', fontWeight: '700' }}>Critical:</span>
            <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-critical)' }}>
              {criticalCount}
            </span>
          </div>

          <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--color-border)' }} />

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', cursor: 'pointer' }}
            onClick={() => {
              setRailTab('fleet');
              setRailOpen(true);
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--palette-coastal-blue)', fontWeight: '600' }}>Patrols:</span>
            <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
              {activePatrols.length}
            </span>
          </div>

          <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--color-border)' }} />

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', cursor: 'pointer' }}
            onClick={() => setShowAnalyticsModal(true)}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-verified)', fontWeight: '600' }}>Ready:</span>
            <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-verified)' }}>
              {safetyScore}%
            </span>
          </div>
        </div>

        {/* Right: Operational Filter Drawer Trigger & Intelligence Rail Button */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

          <button
            type="button"
            onClick={() => setRailOpen(!railOpen)}
            className={`btn btn-sm ${railOpen ? 'btn-primary' : 'btn-secondary'}`}
            style={{ height: '32px', padding: '0 12px', gap: '5px' }}
            title="Toggle Operational Feeds Rail"
          >
            <ActivityIcon size={13} />
            <span>Feeds</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          LAYER 3: CONTEXTUAL INCIDENT DETAIL CARD (POSITIONED NEATLY ON RIGHT)
          ========================================================================= */}
      {selectedIncident && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            right: '12px',
            width: '350px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 450,
            overflow: 'hidden',
            animation: 'fadeIn 150ms ease-out',
          }}
          aria-label="Contextual Incident Card"
        >
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--palette-chalk)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {selectedIncident.date_occurred
                  ? new Date(selectedIncident.date_occurred).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'LIVE'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="canvas-close-btn"
                aria-label="Dismiss incident card"
                style={{ width: '22px', height: '22px' }}
              >
                <XIcon size={12} />
              </button>
            </div>
          </div>

          <div style={{ padding: '14px' }}>
            <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--palette-charcoal-slate)', margin: '0 0 6px 0' }}>
              #{selectedIncident.id}: {selectedIncident.title}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              {selectedIncident.description}
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10.5px',
                color: 'var(--color-text-muted)',
                marginBottom: '14px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>SECTOR: <strong>AHMEDABAD CENTRAL</strong></span>
              <span>STATUS: <strong>{selectedIncident.status}</strong></span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => navigate('/city/dispatch', { state: { incident: selectedIncident } })}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, height: '32px', fontSize: '11.5px', gap: '4px' }}
              >
                <DispatchIcon size={12} />
                <span>Dispatch Unit</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/city/history/${selectedIncident.id}`)}
                className="btn btn-secondary btn-sm"
                style={{ height: '32px', fontSize: '11.5px', gap: '4px' }}
              >
                <EyeIcon size={12} />
                <span>Audit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYER 4: SLIDE-OVER INTELLIGENCE & FEEDS RAIL (RIGHT SIDE)
          ========================================================================= */}
      {railOpen && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            right: '12px',
            bottom: '40px',
            width: '360px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 500,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Rail Header */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--palette-chalk)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setRailTab('alerts')}
                className={`btn btn-xs ${railTab === 'alerts' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Alerts ({pendingIncidents.length})
              </button>
              <button
                type="button"
                onClick={() => setRailTab('fleet')}
                className={`btn btn-xs ${railTab === 'fleet' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Fleet ({activePatrols.length})
              </button>
            </div>
            <button
              type="button"
              onClick={() => setRailOpen(false)}
              className="canvas-close-btn"
              style={{ width: '24px', height: '24px' }}
            >
              <XIcon size={13} />
            </button>
          </div>

          {/* Rail Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {railTab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--palette-chalk)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                        #{inc.id} {inc.title}
                      </span>
                      <span className={`badge badge--${inc.severity === 'CRITICAL' ? 'critical' : inc.severity === 'HIGH' ? 'high' : 'operational'}`}>
                        {inc.severity}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inc.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {railTab === 'fleet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activePatrols.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>
                    No active patrol units deployed.
                  </div>
                ) : (
                  activePatrols.map((patrol) => (
                    <div
                      key={patrol.id}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--palette-chalk)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {patrol.officer_username || `Unit #${patrol.officer}`}
                        </span>
                        <span className="badge badge--high">{patrol.status}</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                        SECTOR: {patrol.zone_name || 'Navrangpura'}
                      </div>
                      {onTrackPatrol && (
                        <button
                          type="button"
                          onClick={() => onTrackPatrol(patrol.id)}
                          className={`btn ${selectedTrackId === patrol.id ? 'btn-primary' : 'btn-secondary'} btn-xs`}
                          style={{ marginTop: '8px', width: '100%', height: '26px' }}
                        >
                          {selectedTrackId === patrol.id ? '● Tracking Active' : 'Track GPS Location'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYER 5: DISCREET BOTTOM STATUS BAR
          ========================================================================= */}
      <div
        className="canvas-hud-bottom"
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '12px',
          right: '12px',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xs)',
          padding: '4px 12px',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-verified)' }} />
          <span>CYBERSPHERE GIS CLUSTER ACTIVE</span>
        </div>
        <div>
          LAST SYNCED: <strong>{syncTime}</strong>
        </div>
      </div>

      {/* Modals & Drawers */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {detailDrawerIncident && (
        <DetailDrawer
          incident={detailDrawerIncident}
          onClose={() => setDetailDrawerIncident(null)}
          onDispatch={(inc) => navigate('/city/dispatch', { state: { incident: inc } })}
        />
      )}
    </div>
  );
}
