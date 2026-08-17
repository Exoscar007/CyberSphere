import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckIcon, AlertCircleIcon, IntelligenceIcon, XIcon } from '../components/common/Icons';

const ToastContext = createContext({
  addToast: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              pointerEvents: 'auto',
              background:
                t.type === 'error'
                  ? 'var(--color-critical)'
                  : t.type === 'success'
                  ? 'var(--palette-sage)'
                  : '#FFFFFF',
              color: t.type === 'error' || t.type === 'success' ? '#FFFFFF' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              padding: '8px 12px',
              fontSize: '11px',
              fontWeight: '600',
              fontFamily: 'var(--font-sans)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              maxWidth: '360px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {t.type === 'error' ? (
                <AlertCircleIcon size={14} />
              ) : t.type === 'success' ? (
                <CheckIcon size={14} />
              ) : (
                <IntelligenceIcon size={14} />
              )}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>
              <XIcon size={12} />
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
