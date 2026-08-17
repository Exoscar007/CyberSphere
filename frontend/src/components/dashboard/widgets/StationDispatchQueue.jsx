import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldIcon, DispatchIcon } from '../../common/Icons';

export default function StationDispatchQueue({ incidents = [], onSelectIncident, onDispatch }) {
  const navigate = useNavigate();

  if (!incidents || incidents.length === 0) {
    return (
      <div className="empty-state" style={{ height: '100%', padding: '24px 16px' }}>
        <div className="empty-state__icon">
          <ShieldIcon size={24} />
        </div>
        <div className="empty-state__title">Operational Queue Clear</div>
        <div className="empty-state__text">No unassigned incidents pending triage in this sector.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Incident</th>
              <th>Occurred</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => {
              const timeStr = incident.date_occurred
                ? new Date(incident.date_occurred).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—';

              const isCritical = incident.severity === 'CRITICAL';
              const isHigh = incident.severity === 'HIGH';

              return (
                <tr
                  key={incident.id}
                  onClick={() => onSelectIncident && onSelectIncident(incident)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span
                      className={`badge badge--${
                        isCritical ? 'critical' : isHigh ? 'high' : 'operational'
                      }`}
                    >
                      {incident.severity}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>
                    {incident.title?.substring(0, 26)}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {timeStr}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDispatch) onDispatch(incident);
                        else navigate('/station/dispatch', { state: { incident } });
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                    >
                      <DispatchIcon size={12} />
                      <span>Dispatch</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
