import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import CityCommandCanvas from '../../../components/canvas/CityCommandCanvas';
import { useToast } from '../../../context/ToastContext';
import useMonitoringSocket from '../../../hooks/useMonitoringSocket';

function useDashboardData(endpoint, qs) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.get(`${endpoint}${qs}`, { signal: controller.signal })
      .then((res) => {
        setData(res.data);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.message !== 'canceled' && err.code !== 'ERR_CANCELED') {
          setError(err.message || 'Failed to fetch');
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [endpoint, qs]);

  return { data, loading, error };
}

export default function OverviewPage() {
  const { addToast } = useToast();

  // Filters State
  const [timeFilter, setTimeFilter] = useState('7d');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');

  // Live GPS Tracking State
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [trackLocations, setTrackLocations] = useState([]);

  // Live Incident Stream State
  const [liveIncidents, setLiveIncidents] = useState([]);

  const handleTrackPatrol = async (id) => {
    if (selectedTrackId === id) {
      setSelectedTrackId(null);
      setTrackLocations([]);
      return;
    }
    setSelectedTrackId(id);
    try {
      const res = await api.get(`/api/patrol/assignments/${id}/locations/`);
      setTrackLocations(res.data);
      if (addToast) addToast(`Live GPS tracking active for Unit #${id}`, 'info');
    } catch (err) {
      console.error('Failed to load GPS trail:', err);
      setTrackLocations([]);
    }
  };

  // Build query string
  const params = new URLSearchParams();
  if (timeFilter !== 'all') params.append('time_filter', timeFilter);
  if (severityFilter) params.append('severity', severityFilter);
  if (statusFilter) params.append('status', statusFilter);
  if (stationFilter) params.append('station_id', stationFilter);
  const qs = params.toString() ? `?${params.toString()}` : '';

  // API Data Consumption (Source of truth & initial bootstrap)
  const { data: stats } = useDashboardData('/api/dashboard/summary/', qs);
  const { data: rawIncidents } = useDashboardData('/api/crimes/incidents/', qs ? qs + '&light=true' : '?light=true');
  const { data: patrolsData } = useDashboardData('/api/patrol/assignments/', '');
  const { data: workloadData } = useDashboardData('/api/dashboard/workload/', qs);
  const { data: trendsData } = useDashboardData('/api/dashboard/trends/', qs);

  // Live Patrol Stream State
  const [livePatrols, setLivePatrols] = useState([]);

  // Sync REST baseline with live incidents and patrols state
  useEffect(() => {
    if (rawIncidents) {
      setLiveIncidents(rawIncidents);
    }
  }, [rawIncidents]);

  useEffect(() => {
    if (patrolsData) {
      setLivePatrols(patrolsData);
    }
  }, [patrolsData]);

  // Periodic Background Polling for Patrols (10s sync cycle)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/api/patrol/assignments/');
        if (Array.isArray(res.data)) {
          setLivePatrols(res.data);
        }
      } catch (e) {
        console.debug('Background patrol sync error:', e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Real-Time WebSocket Telemetry Connection
  const { status: connectionStatus } = useMonitoringSocket({
    onIncidentCreated: (newIncident) => {
      setLiveIncidents((prev) => {
        const exists = prev.some((i) => i.id === newIncident.id);
        if (exists) return prev;
        return [newIncident, ...prev];
      });
    },
    onIncidentUpdated: (updatedIncident) => {
      setLiveIncidents((prev) =>
        prev.map((i) => (i.id === updatedIncident.id ? { ...i, ...updatedIncident } : i))
      );
    },
    onPatrolLocationUpdated: (patrolPing) => {
      // 1. Move the unit marker in real-time by updating livePatrols
      setLivePatrols((prev) =>
        prev.map((p) =>
          Number(p.id) === Number(patrolPing.assignment_id)
            ? {
                ...p,
                latest_location: {
                  id: patrolPing.id || Date.now(),
                  location: {
                    type: 'Point',
                    coordinates: [patrolPing.longitude, patrolPing.latitude],
                  },
                  timestamp: patrolPing.recorded_at || new Date().toISOString(),
                },
              }
            : p
        )
      );

      // 2. If actively tracking this unit, append to breadcrumb path
      if (selectedTrackId && Number(selectedTrackId) === Number(patrolPing.assignment_id)) {
        setTrackLocations((prev) => [
          ...prev,
          {
            location: {
              type: 'Point',
              coordinates: [patrolPing.longitude, patrolPing.latitude],
            },
            recorded_at: patrolPing.recorded_at,
          },
        ]);
      }
    },
    onCriticalAlert: (alert) => {
      if (addToast) {
        addToast(`${alert.title}: ${alert.message}`, 'critical');
      }
    },
  });

  const incidents = useMemo(() => {
    return [...liveIncidents].sort((a, b) => {
      const sevWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
    });
  }, [liveIncidents]);

  const workload = workloadData || [];
  const trends = trendsData || [];

  const activePatrols = (livePatrols || []).filter((p) =>
    ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(p.status)
  );

  const safetyScore = useMemo(() => {
    if (!stats || stats.total_incidents === 0) return 94;
    const ratio = (stats.critical_incidents || 0) / (stats.total_incidents || 1);
    return Math.max(45, Math.round(98 - ratio * 35));
  }, [stats]);

  return (
    <CityCommandCanvas
      stats={stats}
      incidents={incidents}
      activePatrols={activePatrols}
      trends={trends}
      workload={workload}
      safetyScore={safetyScore}
      selectedTrackId={selectedTrackId}
      trackLocations={trackLocations}
      onTrackPatrol={handleTrackPatrol}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      severityFilter={severityFilter}
      setSeverityFilter={setSeverityFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      stationFilter={stationFilter}
      setStationFilter={setStationFilter}
      connectionStatus={connectionStatus}
    />
  );
}

