import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import CityCommandCanvas from '../../../components/canvas/CityCommandCanvas';
import { useToast } from '../../../context/ToastContext';

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

  // API Data Consumption
  const { data: stats } = useDashboardData('/api/dashboard/summary/', qs);
  const { data: rawIncidents } = useDashboardData('/api/crimes/incidents/', qs ? qs + '&light=true' : '?light=true');
  const { data: patrolsData } = useDashboardData('/api/patrol/assignments/', '');
  const { data: workloadData } = useDashboardData('/api/dashboard/workload/', qs);
  const { data: trendsData } = useDashboardData('/api/dashboard/trends/', qs);

  const incidents = useMemo(() => {
    if (!rawIncidents) return [];
    return [...rawIncidents].sort((a, b) => {
      const sevWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
    });
  }, [rawIncidents]);

  const workload = workloadData || [];
  const trends = trendsData || [];

  const activePatrols = (patrolsData || []).filter((p) =>
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
    />
  );
}
