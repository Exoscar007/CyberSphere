import React, { useState, useEffect } from 'react';
import GoogleMapView from './GoogleMapView';
import LeafletFallbackMapView from './LeafletFallbackMapView';
import './CyberMap.css';

/**
 * CyberMap
 * Primary Map Dispatcher for CyberSphere Law Enforcement GIS
 *
 * Checks for Google Maps API Key:
 * - Attempts to render Google Maps JavaScript API (GoogleMapView)
 * - If Google Maps fails authentication, throws load error, or lacks valid API key,
 *   INSTANTLY and seamlessly falls back to high-performance Leaflet engine (LeafletFallbackMapView)
 *   so the operational command center never gets interrupted.
 */
export default function CyberMap(props) {
  const [authFailed, setAuthFailed] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    const rawKey =
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      (typeof window !== 'undefined' && localStorage.getItem('google_maps_api_key')) ||
      (typeof window !== 'undefined' && window.__GOOGLE_MAPS_API_KEY__) ||
      '';
    return rawKey.trim();
  });

  // Listen globally for Google Maps authentication failures (invalid key, unbilled, quota)
  useEffect(() => {
    const prevAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      console.warn('[CyberMap] Google Maps authentication failed. Seamlessly switching to Leaflet GIS engine.');
      setAuthFailed(true);
      if (typeof prevAuthFailure === 'function') {
        prevAuthFailure();
      }
    };

    return () => {
      window.gm_authFailure = prevAuthFailure;
    };
  }, []);

  const handleResetKey = () => {
    localStorage.removeItem('google_maps_api_key');
    setApiKey('');
    setAuthFailed(true);
  };

  const handleGoogleMapError = (errorMsg) => {
    console.warn('[CyberMap] Google Maps load error encountered:', errorMsg, 'Switching to Leaflet.');
    setAuthFailed(true);
  };

  // If key is present and has not encountered an authentication/load failure, try GoogleMapView
  if (apiKey && apiKey.length > 0 && !authFailed) {
    return (
      <GoogleMapView
        apiKey={apiKey}
        onResetKey={handleResetKey}
        onError={handleGoogleMapError}
        {...props}
      />
    );
  }

  // Seamless, high-performance Leaflet fallback (100% reliable, zero API key requirement)
  return <LeafletFallbackMapView {...props} />;
}
