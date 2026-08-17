import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SirenIcon, DispatchIcon, MaximizeIcon, MinimizeIcon, SearchIcon, CheckIcon } from '../common/Icons';

export default function QuickCommandBar({ onQuickFilterCritical, onToggleMapExpand, isMapExpanded }) {
  const navigate = useNavigate();
  const [commandText, setCommandText] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!commandText.trim()) return;

    const lower = commandText.toLowerCase();
    if (lower.includes('dispatch') || lower.includes('patrol')) {
      navigate('/station/dispatch');
    } else if (lower.includes('fir') || lower.includes('case')) {
      navigate('/city/firs');
    } else if (lower.includes('intel') || lower.includes('risk') || lower.includes('predict')) {
      navigate('/city/intelligence');
    } else if (lower.includes('crit') || lower.includes('alert')) {
      if (onQuickFilterCritical) onQuickFilterCritical();
    }

    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setCommandText('');
    }, 1200);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 12px',
        boxShadow: 'var(--shadow-sm)',
        gap: '10px',
        flexWrap: 'wrap',
      }}
    >
      {/* Quick Action Shortcuts */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onQuickFilterCritical}
          className="btn btn-sm"
          style={{
            background: 'var(--color-critical-bg)',
            color: 'var(--color-critical)',
            borderColor: 'var(--color-critical-border)',
            fontWeight: '700',
          }}
        >
          <SirenIcon size={13} />
          <span>Critical Alerts</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/station/dispatch')}
          className="btn btn-secondary btn-sm"
        >
          <DispatchIcon size={13} />
          <span>Quick Dispatch</span>
        </button>

        {onToggleMapExpand && (
          <button
            type="button"
            onClick={onToggleMapExpand}
            className="btn btn-secondary btn-sm"
          >
            {isMapExpanded ? <MinimizeIcon size={13} /> : <MaximizeIcon size={13} />}
            <span>{isMapExpanded ? 'Standard Map' : 'Expand Map'}</span>
          </button>
        )}
      </div>

      {/* Floating Prompt Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, maxWidth: '340px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--palette-chalk)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xs)',
            padding: '3px 8px',
            width: '100%',
          }}
        >
          <span style={{ color: 'var(--palette-sage)', marginRight: '6px', display: 'flex', alignItems: 'center' }}>
            <SearchIcon size={13} />
          </span>
          <input
            type="text"
            placeholder="Command input (e.g. dispatch, fir, intel)..."
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              fontWeight: '500',
              width: '100%',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--palette-lilac)',
              border: 'none',
              borderRadius: 'var(--radius-2xs)',
              padding: '2px 6px',
              color: 'var(--palette-charcoal)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '10px',
              flexShrink: 0,
            }}
          >
            {isSent ? <CheckIcon size={11} /> : 'Go'}
          </button>
        </div>
      </form>
    </div>
  );
}
