import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import CyberMap from '../../../components/map/CyberMap';
import {
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  XIcon,
  AlertCircleIcon,
  ShieldIcon,
  HistoryIcon,
} from '../../../components/common/Icons';

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
      const res = await api.get(`/api/crimes/evidence/${ev.id}/download/`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setEvidenceUrl(url);
    } catch (e) {
      console.error('Failed to load evidence media:', e);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const fetchIncidentAudit = async () => {
    try {
      const res = await api.get('/api/reports/operational-history/');
      const found = res.data.find((i) => i.id === parseInt(id));
      if (found) setIncident(found);
    } catch (error) {
      console.error('Failed to fetch incident audit', error);
    } finally {
      setLoading(false);
    }
  };

  const updateIncidentStatus = async (status) => {
    try {
      await api.patch(`/api/crimes/incidents/${id}/`, { status });
      fetchIncidentAudit();
    } catch (e) {
      console.error('Failed to update status', e);
      alert('Failed to update incident status.');
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading incident audit trail...</div>;
  }

  if (!incident) {
    return (
      <div className="alert alert--error" role="alert">
        <AlertCircleIcon size={16} />
        <span>Incident record not found or access restricted.</span>
      </div>
    );
  }

  const mapCenter = incident.location?.coordinates
    ? [incident.location.coordinates[1], incident.location.coordinates[0]]
    : [23.0225, 72.5714];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--palette-coastal-blue)',
          cursor: 'pointer',
          textAlign: 'left',
          fontWeight: '700',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: 0,
        }}
      >
        <ArrowLeftIcon size={13} />
        <span>Back to Archive History</span>
      </button>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Incident Audit #{incident.id}: {incident.title}</h1>
          <p className="page-header__subtitle">{incident.description}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge badge--${incident.status === 'RESOLVED' ? 'verified' : 'operational'}`}>
            {incident.status}
          </span>
          {incident.status === 'OPEN' && (
            <button
              type="button"
              onClick={() => updateIncidentStatus('RESOLVED')}
              className="btn btn-primary btn-sm"
            >
              <CheckIcon size={12} />
              <span>Mark Resolved</span>
            </button>
          )}
          {(incident.status === 'RESOLVED' || incident.status === 'CANCELLED') && (
            <button
              type="button"
              onClick={() => updateIncidentStatus('OPEN')}
              className="btn btn-secondary btn-sm"
            >
              Reopen Incident
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        {/* ASSIGNMENTS TIMELINE */}
        <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          <div className="card-header">
            <span className="card-title">
              <HistoryIcon size={15} />
              Deployment & Status Ledger
            </span>
          </div>

          {incident.patrol_assignments?.length === 0 && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>No patrol deployments recorded for this case.</div>
          )}

          {incident.patrol_assignments?.map((assign) => (
            <div key={assign.id} style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Assignment #{assign.id} — Officer {assign.officer_username}
              </div>
              <div style={{ borderLeft: '2px solid var(--color-border)', marginLeft: '4px', paddingLeft: '12px' }}>
                {assign.status_history?.map((hist, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-17px',
                        top: '4px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--palette-sage)',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                      {hist.new_status}
                    </div>
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
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '380px', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--palette-chalk)',
              fontSize: '10px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'var(--color-text-primary)',
            }}
          >
            GPS Scene & Route Verification
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
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
      <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        <div className="card-header">
          <span className="card-title">
            <ShieldIcon size={15} />
            Cryptographic Evidence Ledger ({incident.evidence?.length || 0})
          </span>
        </div>

        {incident.evidence?.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>No physical or digital evidence attachments registered.</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          {incident.evidence?.map((ev) => (
            <div
              key={ev.id}
              style={{
                backgroundColor: 'var(--palette-chalk)',
                borderRadius: 'var(--radius-xs)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  height: '90px',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => viewEvidence(ev)}
                  className="btn btn-secondary btn-sm"
                >
                  <EyeIcon size={12} />
                  <span>Inspect Media</span>
                </button>
              </div>
              <div style={{ padding: '6px 8px', fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                <div style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>ID: #{ev.id}</div>
                <div>{new Date(ev.uploaded_at).toLocaleString()}</div>
                <div>By: {ev.uploaded_by_username}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EVIDENCE VIEWER MODAL */}
      {selectedEvidence && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedEvidence(null);
            if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">Evidence Artifact #{selectedEvidence.id}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedEvidence(null);
                  if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                aria-label="Close Evidence Modal"
              >
                <XIcon size={16} />
              </button>
            </div>

            {evidenceLoading ? (
              <div className="loading-spinner">Loading encrypted media artifact...</div>
            ) : evidenceUrl ? (
              <div style={{ flex: 1, overflow: 'auto', textAlign: 'center', margin: 'var(--space-md) 0' }}>
                <img src={evidenceUrl} alt="Evidence Artifact" style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain', borderRadius: 'var(--radius-xs)' }} />
              </div>
            ) : (
              <div className="alert alert--error">Failed to decrypt or load media asset.</div>
            )}

            <div
              style={{
                fontSize: '10px',
                color: 'var(--color-text-muted)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                backgroundColor: 'var(--palette-chalk)',
                padding: '10px',
                borderRadius: 'var(--radius-xs)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div>
                <strong>Uploaded By:</strong> {selectedEvidence.uploaded_by_username}
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date(selectedEvidence.uploaded_at).toLocaleString()}
              </div>
              <div>
                <strong>Incident ID:</strong> #{incident.id}
              </div>
              <div>
                <strong>FIR:</strong> {incident.fir ? `#${incident.fir}` : 'None'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
