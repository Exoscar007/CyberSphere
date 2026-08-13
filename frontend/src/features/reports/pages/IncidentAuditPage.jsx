import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function IncidentAuditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  // Evidence Viewer State
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    fetchIncidentAudit();
  }, [id]);

  const viewEvidence = async (ev) => {
    setSelectedEvidence(ev);
    setEvidenceLoading(true);
    setEvidenceUrl(null);
    try {
      // Fetch with auth to avoid redirect to login and CORS issues
      const res = await api.get(`/api/crimes/evidence/${ev.id}/download/`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setEvidenceUrl(url);
    } catch (e) {
      console.error("Failed to load evidence media:", e);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const fetchIncidentAudit = async () => {
    try {
      const res = await api.get('/api/reports/operational-history/');
      const found = res.data.find(i => i.id === parseInt(id));
      if (found) setIncident(found);
    } catch (error) {
      console.error("Failed to fetch incident audit", error);
    } finally {
      setLoading(false);
    }
  };

  const updateIncidentStatus = async (status) => {
    try {
      await api.patch(`/api/crimes/incidents/${id}/`, { status });
      fetchIncidentAudit();
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update incident status.");
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: 'white' }}>Loading audit trail...</div>;
  }

  if (!incident) {
    return <div style={{ padding: '24px', color: 'white' }}>Incident not found or access denied.</div>;
  }

  const mapCenter = incident.location?.coordinates 
    ? [incident.location.coordinates[1], incident.location.coordinates[0]] 
    : [23.0225, 72.5714];

  return (
    <div style={{ padding: '24px', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textAlign: 'left', marginBottom: '16px', fontWeight: 'bold' }}>
        &larr; Back
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold' }}>Incident Audit: #{incident.id}</h1>
          <p style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-secondary)' }}>{incident.title}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Status</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: incident.status === 'RESOLVED' ? '#10B981' : '#3B82F6', marginBottom: '8px' }}>
            {incident.status}
          </div>
          {incident.status === 'OPEN' && (
            <button onClick={() => updateIncidentStatus('RESOLVED')} style={{ background: 'var(--color-success)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>MARK RESOLVED</button>
          )}
          {(incident.status === 'RESOLVED' || incident.status === 'CANCELLED') && (
            <button onClick={() => updateIncidentStatus('OPEN')} style={{ background: 'var(--color-warning)', border: 'none', color: '#0f172a', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>REOPEN INCIDENT</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* ASSIGNMENTS TIMELINE */}
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>Deployment Timeline</h2>
          {incident.patrol_assignments?.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No assignments recorded.</p>}
          
          {incident.patrol_assignments?.map(assign => (
            <div key={assign.id} style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 8px 0', color: 'var(--color-primary-light)' }}>
                Assignment #{assign.id} — Officer {assign.officer_username}
              </h3>
              <div style={{ borderLeft: '2px solid var(--color-border)', marginLeft: '8px', paddingLeft: '16px' }}>
                {assign.status_history?.map((hist, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></div>
                    <div style={{ fontSize: '12px', color: 'white', fontWeight: 'bold' }}>{hist.new_status}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      {new Date(hist.timestamp).toLocaleString()} • by {hist.actor_username || 'System'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* MAP PLAYBACK */}
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>GPS Path Playback</h2>
          <div style={{ height: '300px', width: '100%', borderRadius: '4px', overflow: 'hidden' }}>
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {incident.location?.coordinates && (
                <Marker position={[incident.location.coordinates[1], incident.location.coordinates[0]]} />
              )}
              {incident.patrol_assignments?.map(assign => {
                const path = assign.locations?.map(loc => [loc.location.coordinates[1], loc.location.coordinates[0]]) || [];
                return <Polyline key={assign.id} positions={path} color="#3B82F6" weight={3} opacity={0.7} />;
              })}
            </MapContainer>
          </div>
        </div>

      </div>

      {/* EVIDENCE ARCHIVE */}
      <div style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>Evidence Archive</h2>
        
        {incident.evidence?.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No evidence linked to this incident.</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {incident.evidence?.map(ev => (
            <div key={ev.id} style={{ backgroundColor: 'var(--color-bg-dark)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ height: '120px', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => viewEvidence(ev)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  VIEW ATTACHMENT
                </button>
              </div>
              <div style={{ padding: '8px', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                <div>ID: {ev.id}</div>
                <div>Uploaded: {new Date(ev.uploaded_at).toLocaleString()}</div>
                <div>By: {ev.uploaded_by_username}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EVIDENCE VIEWER MODAL */}
      {selectedEvidence && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
          setSelectedEvidence(null);
          if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
        }}>
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Evidence ID: {selectedEvidence.id}</h3>
              <button onClick={() => {
                setSelectedEvidence(null);
                if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
              }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            
            {evidenceLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading encrypted media...</div>
            ) : evidenceUrl ? (
              <div style={{ flex: 1, overflow: 'auto', textAlign: 'center' }}>
                <img src={evidenceUrl} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)' }}>Failed to load media.</div>
            )}
            
            <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'var(--color-bg-dark)', padding: '12px', borderRadius: '4px' }}>
              <div><strong>Uploaded By:</strong> {selectedEvidence.uploaded_by_username}</div>
              <div><strong>Timestamp:</strong> {new Date(selectedEvidence.uploaded_at).toLocaleString()}</div>
              <div><strong>Incident ID:</strong> {incident.id}</div>
              <div><strong>FIR:</strong> {incident.fir ? `#${incident.fir}` : 'None'}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
