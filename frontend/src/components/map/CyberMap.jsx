import React, { useState } from 'react';
import GoogleMapView from './GoogleMapView';
import './CyberMap.css';

/**
 * CyberMap
 * Primary Map Component for CyberSphere Law Enforcement GIS
 *
 * Renders the official Google Maps JavaScript API.
 * Reads the API key from:
 * 1. import.meta.env.VITE_GOOGLE_MAPS_API_KEY
 * 2. localStorage.getItem('google_maps_api_key')
 * 3. window.__GOOGLE_MAPS_API_KEY__
 */
export default function CyberMap(props) {
  const [apiKey, setApiKey] = useState(() => {
    return (
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      (typeof window !== 'undefined' && localStorage.getItem('google_maps_api_key')) ||
      (typeof window !== 'undefined' && window.__GOOGLE_MAPS_API_KEY__) ||
      ''
    );
  });

  const [inputKey, setInputKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle saving API key in the browser for instant activation
  const handleActivateKey = (e) => {
    e.preventDefault();
    if (!inputKey || inputKey.trim().length < 5) {
      setErrorMsg('Please enter a valid Google Maps API key.');
      return;
    }

    const trimmedKey = inputKey.trim();
    localStorage.setItem('google_maps_api_key', trimmedKey);
    setApiKey(trimmedKey);
    setErrorMsg('');
  };

  const handleResetKey = () => {
    localStorage.removeItem('google_maps_api_key');
    setApiKey('');
    setInputKey('');
  };

  // If Google Maps API key is configured, render Google Maps JS API as the sole and primary map provider
  if (apiKey && apiKey.trim().length > 0) {
    return <GoogleMapView apiKey={apiKey.trim()} onResetKey={handleResetKey} {...props} />;
  }

  // If VITE_GOOGLE_MAPS_API_KEY is not configured, display a clear, actionable configuration panel
  return (
    <div className="cyber-map-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: '24px' }}>
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          fontFamily: 'var(--font-family, sans-serif)',
          color: '#f8fafc',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗺️</div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: '#f8fafc' }}>
          Google Maps API Key Required
        </h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
          <code>VITE_GOOGLE_MAPS_API_KEY</code> is not configured. Google Maps JavaScript API is the primary map provider for the CyberSphere command center.
        </p>

        <form onSubmit={handleActivateKey} style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1', fontFamily: 'var(--font-family-mono, monospace)' }}>
            ENTER GOOGLE MAPS API KEY (OR DEMO KEY):
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Paste your Google Maps key here (e.g. AIzaSy...)"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#0b101a',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '12px',
                fontFamily: 'var(--font-family-mono, monospace)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Activate
            </button>
          </div>

          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
              {errorMsg}
            </div>
          )}
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #334155', fontSize: '11px', color: '#64748b', textAlign: 'left', lineHeight: 1.6 }}>
          <strong style={{ color: '#94a3b8' }}>Configuration via environment file:</strong><br />
          1. Open <code>frontend/.env</code><br />
          2. Set <code>VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</code><br />
          3. Restart the Vite development server (<code>npm run dev</code>).<br />
          4. Ensure <strong>Maps JavaScript API</strong> and <strong>Places API</strong> are enabled in Google Cloud Console.
        </div>
      </div>
    </div>
  );
}
