import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XIcon, DispatchIcon, FileTextIcon, LocationPinIcon } from '../common/Icons';

export default function DetailDrawer({ isOpen, onClose, incident, onDispatch }) {
  const navigate = useNavigate();

  if (!isOpen || !incident) return null;

  const isCritical = incident.severity === 'CRITICAL';
  const isHigh = incident.severity === 'HIGH';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '380px',
        maxWidth: '92vw',
        background: '#FFFFFF',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
      }}
      role="dialog"
      aria-label={`Incident Detail #${incident.id}`}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--palette-chalk)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '700' }}>
            OPERATIONAL INSPECTOR
          </span>
          <h3 style={{ margin: '1px 0 0', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
            INCIDENT #{incident.id}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Inspector"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <XIcon size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Severity Banner */}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-xs)',
            background: isCritical
              ? 'var(--color-critical-bg)'
              : isHigh
              ? 'var(--color-high-bg)'
              : 'var(--color-operational-bg)',
            border: `1px solid ${
              isCritical
                ? 'var(--color-critical-border)'
                : isHigh
                ? 'var(--color-high-border)'
                : 'var(--color-operational-border)'
            }`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontWeight: '700',
              fontSize: '11px',
              color: isCritical ? 'var(--color-critical)' : isHigh ? 'var(--color-high)' : 'var(--palette-sage)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {incident.severity} Priority
          </span>
          <span className="badge badge--neutral">{incident.status || 'ACTIVE'}</span>
        </div>

        {/* Title & Description */}
        <div>
          <label className="form-label">Classification / Title</label>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            {incident.title}
          </div>
          <label className="form-label">Statement</label>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.45,
              background: 'var(--palette-chalk)',
              padding: '8px 10px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border)',
            }}
          >
            {incident.description}
          </div>
        </div>

        {/* Timestamps & Coordinates */}
        <div className="card" style={{ padding: '10px', background: 'var(--palette-chalk)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>TIME:</span>
              <div style={{ color: 'var(--color-text-primary)', fontWeight: '600' }}>
                {incident.date_occurred ? new Date(incident.date_occurred).toLocaleTimeString() : '—'}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>DATE:</span>
              <div style={{ color: 'var(--color-text-primary)', fontWeight: '600' }}>
                {incident.date_occurred ? new Date(incident.date_occurred).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
          {incident.location_input?.coordinates && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--color-border)', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <LocationPinIcon size={12} />
              <span>
                GPS: {incident.location_input.coordinates[1]?.toFixed(4)}, {incident.location_input.coordinates[0]?.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        {/* Active Patrol Deployments */}
        <div>
          <label className="form-label">Patrol Deployments ({incident.patrol_assignments?.length || 0})</label>
          {(!incident.patrol_assignments || incident.patrol_assignments.length === 0) ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', padding: '6px 0' }}>
              No patrol unit currently assigned to this scene.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {incident.patrol_assignments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: 'var(--palette-chalk)',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--color-border)',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: '600' }}>Unit #{a.id} (Officer {a.officer})</span>
                  <span className="badge badge--high">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--palette-chalk)', display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onDispatch) {
              onDispatch(incident);
            } else {
              navigate('/station/dispatch', { state: { incident } });
            }
          }}
          className="btn btn-primary"
          style={{ flex: 1 }}
        >
          <DispatchIcon size={13} />
          <span>Dispatch Unit</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate(`/city/history/${incident.id}`);
          }}
          className="btn btn-secondary"
        >
          <FileTextIcon size={13} />
          <span>Audit Log</span>
        </button>
      </div>
    </div>
  );
}
