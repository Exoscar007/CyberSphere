import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import CyberMap from '../../../components/map/CyberMap';

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
    return <div className="loading-spinner" style={{ padding: '24px' }}>LOADING AUDIT TRAIL...</div>;
  }

  if (!incident) {
    return <div className="empty-state" style={{ padding: '24px' }}>Incident not found or access denied.</div>;
  }

  const mapCenter = incident.location?.coordinates 
    ? [incident.location.coordinates[1], incident.location.coordinates[0]] 
    : [23.0225, 72.5714];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '8px', backgroundColor: 'var(--color-bg)', overflowY: 'auto' }}>
      
      {/* Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <button onClick={() => navigate(-1)} className="btn btn--ghost btn--sm">
          &larr; BACK TO HISTORY
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-primary-light)' }}>INCIDENT AUDIT: #{incident.id}</span>
          <span className={`badge ${incident.status === 'RESOLVED' ? 'badge--success' : 'badge--info'}`}>
            ● {incident.status}
          </span>
          {incident.status === 'OPEN' && (
            <button onClick={() => updateIncidentStatus('RESOLVED')} className="btn btn--primary btn--sm">
              MARK RESOLVED
            </button>
          )}
          {(incident.status === 'RESOLVED' || incident.status === 'CANCELLED') && (
            <button onClick={() => updateIncidentStatus('OPEN')} className="btn btn--secondary btn--sm">
              REOPEN INCIDENT
            </button>
          )}
        </div>
      </div>

      {/* Incident Title Banner */}
      <div style={{ backgroundColor: '#0d1320', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-family-mono)' }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{incident.title.toUpperCase()}</h2>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)' }}>{incident.description}</p>
      </div>

      {/* Grid: Deployment Timeline & Map Playback */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        
        {/* ASSIGNMENTS TIMELINE */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '12px', fontFamily: 'var(--font-family-mono)', letterSpacing: '1px' }}>
            DEPLOYMENT TIMELINE
          </div>
          
          {incident.patrol_assignments?.length === 0 && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>No assignments recorded.</p>}
          
          {incident.patrol_assignments?.map(assign => (
            <div key={assign.id} style={{ marginBottom: '16px', fontFamily: 'var(--font-family-mono)' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary-light)', marginBottom: '8px' }}>
                Assignment #{assign.id} — Officer {assign.officer_username}
              </div>
              <div style={{ borderLeft: '2px solid #1E293B', marginLeft: '6px', paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {assign.status_history?.map((hist, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-19px', top: '3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)' }}></div>
                    <div style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>
                      <span className="badge badge--info" style={{ marginRight: '6px' }}>{hist.new_status}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {new Date(hist.timestamp).toLocaleString()} • by {hist.actor_username || 'System'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* MAP PLAYBACK */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '12px', fontFamily: 'var(--font-family-mono)', letterSpacing: '1px' }}>
            GPS PATH PLAYBACK
          </div>
          <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', border: '1px solid var(--color-border)' }}>
            <CyberMap
              center={mapCenter}
              zoom={13}
              selectedIncident={{
                ...incident,
                location_input: incident.location,
              }}
              patrolAssignments={incident.patrol_assignments}
              autoFit={true}
            />
          </div>
        </div>

      </div>

      {/* EVIDENCE ARCHIVE */}
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px', fontFamily: 'var(--font-family-mono)' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '12px', letterSpacing: '1px' }}>
          EVIDENCE ARCHIVE
        </div>
        
        {incident.evidence?.length === 0 && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>No evidence linked to this incident.</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {incident.evidence?.map(ev => (
            <div key={ev.id} style={{ backgroundColor: '#0d1320', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ height: '100px', backgroundColor: '#161d2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => viewEvidence(ev)} className="btn btn--secondary btn--sm">
                  VIEW ATTACHMENT
                </button>
              </div>
              <div style={{ padding: '8px', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                <div>ID: #{ev.id}</div>
                <div>Uploaded: {new Date(ev.uploaded_at).toLocaleString()}</div>
                <div>By: {ev.uploaded_by_username}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EVIDENCE VIEWER MODAL */}
      {selectedEvidence && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
          setSelectedEvidence(null);
          if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
        }}>
          <div style={{ backgroundColor: '#0D121F', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', maxWidth: '80%', maxHeight: '85%', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-family-mono)' }}>
              <h3 style={{ margin: 0, fontSize: '13px', color: 'white', fontWeight: 'bold' }}>EVIDENCE MEDIA — ID #{selectedEvidence.id}</h3>
              <button onClick={() => {
                setSelectedEvidence(null);
                if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
              }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            
            {evidenceLoading ? (
              <div className="loading-spinner" style={{ padding: '40px' }}>LOADING ENCRYPTED MEDIA...</div>
            ) : evidenceUrl ? (
              <div style={{ flex: 1, overflow: 'auto', textAlign: 'center', padding: '12px', backgroundColor: '#05080f', borderRadius: 'var(--radius-sm)' }}>
                <img src={evidenceUrl} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)', fontFamily: 'var(--font-family-mono)' }}>Failed to load media.</div>
            )}
            
            <div style={{ marginTop: '12px', fontSize: '10px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#0d1320', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div><strong>Uploaded By:</strong> {selectedEvidence.uploaded_by_username}</div>
              <div><strong>Timestamp:</strong> {new Date(selectedEvidence.uploaded_at).toLocaleString()}</div>
              <div><strong>Incident ID:</strong> #{incident.id}</div>
              <div><strong>FIR:</strong> {incident.fir ? `#${incident.fir}` : 'None'}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

