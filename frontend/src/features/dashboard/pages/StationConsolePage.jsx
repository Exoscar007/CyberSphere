import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import CityCommandCanvas from '../../../components/canvas/CityCommandCanvas';
import { useToast } from '../../../context/ToastContext';

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
    />
  );
}
