import React from 'react';
import { useNavigate } from 'react-router-dom';
import useCountUp from '../../../hooks/useCountUp';
import { DispatchIcon, SirenIcon, PlusIcon } from '../../common/Icons';

export default function StationDispatchPriority({
  pendingCount = 0,
  unassignedCount = 0,
  onFilterCritical,
  isCriticalFiltered = false,
}) {
  const navigate = useNavigate();
  const animatedPending = useCountUp(pendingCount, 400);
  const animatedUnassigned = useCountUp(unassignedCount, 400);

  const hasCritical = pendingCount > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        position: 'relative',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-primary)' }}>
            Station Dispatch Priority
          </span>
          <span className={`badge badge--${hasCritical ? 'critical' : 'verified'}`}>
            {hasCritical ? 'Active Queue' : 'Queue Clear'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
            {animatedPending}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
            Cases Pending Triage
          </span>
        </div>

        <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
          {hasCritical ? (
            <span>
              <strong style={{ color: 'var(--color-critical)' }}>{animatedUnassigned} unassigned cases</strong> requiring immediate unit dispatch.
            </span>
          ) : (
            <span style={{ color: 'var(--color-verified)', fontWeight: '600' }}>
              All jurisdictional incidents currently triaged and dispatched.
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => navigate('/station/dispatch')}
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
        >
          <DispatchIcon size={14} />
          <span>Open Dispatch</span>
        </button>

        {onFilterCritical && (
          <button
            type="button"
            onClick={onFilterCritical}
            className={`btn btn-sm ${isCriticalFiltered ? 'btn-sage' : 'btn-secondary'}`}
          >
            <SirenIcon size={14} />
            <span>{isCriticalFiltered ? 'Clear Filter' : 'Filter Critical'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/station/firs')}
          className="btn btn-secondary btn-sm"
        >
          <PlusIcon size={14} />
          <span>File FIR</span>
        </button>
      </div>
    </div>
  );
}
