import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import CityCommandCanvas from '../../../components/canvas/CityCommandCanvas';
import { useToast } from '../../../context/ToastContext';
import useMonitoringSocket from '../../../hooks/useMonitoringSocket';

export default function StationConsolePage() {
  const { addToast } = useToast();

  const [incidents, setIncidents] = useState([]);
  const [firs, setFirs] = useState([]);
  const [patrols, setPatrols] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timeFilter, setTimeFilter] = useState('7d');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Live GPS Tracking State
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [trackLocations, setTrackLocations] = useState([]);

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

  // Real-Time Station Telemetry Connection (Server-isolated to station precinct)
  const { status: connectionStatus } = useMonitoringSocket({
    onIncidentCreated: (newIncident) => {
      setIncidents((prev) => {
        const exists = prev.some((i) => i.id === newIncident.id);
        if (exists) return prev;
        const updated = [newIncident, ...prev];
        return updated.sort((a, b) => {
          const sevWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
        });
      });
    },
    onIncidentUpdated: (updatedIncident) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === updatedIncident.id ? { ...i, ...updatedIncident } : i))
      );
    },
    onPatrolLocationUpdated: (patrolPing) => {
      // 1. Move the unit marker on station map
      setPatrols((prev) =>
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

      // 2. Update breadcrumbs if tracked
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

  // Background polling for station patrols (10s sync)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/api/patrol/assignments/');
        if (Array.isArray(res.data)) {
          setPatrols(res.data);
        }
      } catch (e) {
        console.debug('Station patrol polling error:', e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (timeFilter !== 'all') params.append('time_filter', timeFilter);
        if (severityFilter) params.append('severity', severityFilter);
        if (statusFilter) params.append('status', statusFilter);

        const qs = params.toString() ? `?${params.toString()}` : '';

        const [incRes, firRes, patRes, workRes] = await Promise.allSettled([
          api.get(`/api/crimes/incidents/${qs}`),
          api.get('/api/crimes/fir/'),
          api.get('/api/patrol/assignments/'),
          api.get(`/api/dashboard/workload/${qs}`),
        ]);

        if (incRes.status === 'fulfilled') {
          const sorted = incRes.value.data.sort((a, b) => {
            const sevWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
          });
          setIncidents(sorted);
        }

        if (firRes.status === 'fulfilled') setFirs(firRes.value.data);
        if (patRes.status === 'fulfilled') setPatrols(patRes.value.data);
        if (workRes.status === 'fulfilled') setWorkload(workRes.value.data || []);
      } catch (err) {
        console.error('Failed to load station jurisdiction data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeFilter, severityFilter, statusFilter]);

  const activeUnits = patrols.filter((p) =>
    ['ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED'].includes(p.status)
  );

  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL').length;
  const readinessScore = Math.max(50, Math.round(96 - criticalCount * 12));

  return (
    <CityCommandCanvas
      stats={{
        total_incidents: incidents.length,
        critical_incidents: criticalCount,
      }}
      incidents={incidents}
      activePatrols={activeUnits}
      trends={[]}
      workload={workload}
      safetyScore={readinessScore}
      selectedTrackId={selectedTrackId}
      trackLocations={trackLocations}
      onTrackPatrol={handleTrackPatrol}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      severityFilter={severityFilter}
      setSeverityFilter={setSeverityFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      stationFilter=""
      setStationFilter={() => {}}
      connectionStatus={connectionStatus}
    />
  );
}

