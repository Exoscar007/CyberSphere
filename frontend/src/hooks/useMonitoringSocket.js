import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useMonitoringSocket — Resilient WebSocket hook for real-time operations telemetry.
 * Automatically connects with JWT authorization, handles exponential backoff reconnects,
 * and distributes event payloads for incidents, patrol GPS pings, and critical alerts.
 */
export default function useMonitoringSocket({
  onIncidentCreated,
  onIncidentUpdated,
  onPatrolLocationUpdated,
  onCriticalAlert,
  enabled = true,
} = {}) {
  const [status, setStatus] = useState('OFFLINE'); // 'CONNECTED' | 'RECONNECTING' | 'OFFLINE'
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const callbacksRef = useRef({
    onIncidentCreated,
    onIncidentUpdated,
    onPatrolLocationUpdated,
    onCriticalAlert,
  });

  useEffect(() => {
    callbacksRef.current = {
      onIncidentCreated,
      onIncidentUpdated,
      onPatrolLocationUpdated,
      onCriticalAlert,
    };
  });

  const connect = useCallback(() => {
    if (isUnmountedRef.current || !enabled) return;

    const token = localStorage.getItem('accessToken');
    // If no token or mock token without backend session, mark offline and do not loop
    if (!token) {
      setStatus('OFFLINE');
      return;
    }

    try {
      const isSecure = window.location.protocol === 'https:';
      const wsProtocol = isSecure ? 'wss:' : 'ws:';
      const host = window.location.hostname || '127.0.0.1';
      // Default to backend API port 8000
      const wsUrl = `${wsProtocol}//${host}:8000/ws/monitoring/?token=${encodeURIComponent(token)}`;

      setStatus((prev) => (prev === 'CONNECTED' ? 'CONNECTED' : 'RECONNECTING'));

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        setStatus('CONNECTED');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || !data.type) return;

          switch (data.type) {
            case 'incident_created':
              callbacksRef.current.onIncidentCreated?.(data.incident, data);
              break;
            case 'incident_updated':
              callbacksRef.current.onIncidentUpdated?.(data.incident, data);
              break;
            case 'patrol_location_updated':
              callbacksRef.current.onPatrolLocationUpdated?.(data);
              break;
            case 'critical_alert':
              callbacksRef.current.onCriticalAlert?.(data);
              break;
            case 'pong':
              // Heartbeat acknowledgement
              break;
            default:
              break;
          }
        } catch (err) {
          console.warn('[WebSocket] Malformed payload received:', err);
        }
      };

      ws.onerror = () => {
        // Handled silently by onclose
      };

      ws.onclose = (event) => {
        if (isUnmountedRef.current) return;
        setStatus('OFFLINE');

        // If closed with auth failure (4001, 4003), do not rapidly retry
        if (event.code === 4001 || event.code === 4003) {
          setStatus('OFFLINE');
          return;
        }

        // Exponential backoff reconnect: 1s, 2s, 5s, max 10s
        const backoffDelays = [1000, 2000, 5000, 10000];
        const delay = backoffDelays[Math.min(reconnectAttemptsRef.current, backoffDelays.length - 1)];
        reconnectAttemptsRef.current += 1;

        setStatus('RECONNECTING');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (err) {
      console.warn('[WebSocket] Connection initialization error:', err);
      setStatus('OFFLINE');
    }
  }, [enabled]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch {}
      }
    }, 25000);

    return () => {
      isUnmountedRef.current = true;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    status,
    isConnected: status === 'CONNECTED',
    reconnect: connect,
  };
}
