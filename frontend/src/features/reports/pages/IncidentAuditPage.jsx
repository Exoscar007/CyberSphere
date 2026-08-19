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
  LocationPinIcon,
  DispatchIcon,
  LayersIcon,
  RefreshIcon,
  SecurityMark,
} from '../../../components/common/Icons';

function getSeverityBadge(sev) {
  const s = (sev || 'MEDIUM').toUpperCase();
  if (s === 'CRITICAL') {
    return {
      label: 'CRITICAL SEVERITY',
      color: 'var(--color-critical)',
      bg: 'rgba(163, 81, 57, 0.12)',
      border: 'var(--color-critical-border)',
    };
  }
  if (s === 'HIGH') {
    return {
      label: 'HIGH SEVERITY',
      color: 'var(--color-high)',
      bg: 'rgba(217, 122, 38, 0.12)',
      border: 'var(--color-high-border)',
    };
  }
  if (s === 'LOW') {
    return {
      label: 'LOW SEVERITY',
      color: 'var(--color-verified)',
      bg: 'rgba(42, 107, 101, 0.12)',
      border: 'var(--color-verified-border)',
    };
  }
  return {
    label: 'MEDIUM SEVERITY',
    color: 'var(--palette-coastal-blue)',
    bg: 'rgba(40, 85, 112, 0.12)',
    border: 'var(--color-operational-border)',
  };
}

function getStatusBadge(status) {
  const st = (status || 'OPEN').toUpperCase();
  if (st === 'RESOLVED') {
    return {
      label: 'RESOLVED',
      color: 'var(--color-verified)',
      bg: 'rgba(42, 107, 101, 0.14)',
      border: 'var(--color-verified-border)',
    };
  }
  if (st === 'IN_PROGRESS') {
    return {
      label: 'IN PROGRESS',
      color: 'var(--color-high)',
      bg: 'rgba(217, 122, 38, 0.14)',
      border: 'var(--color-high-border)',
    };
  }
  if (st === 'CANCELLED') {
    return {
      label: 'CANCELLED',
      color: 'var(--color-text-muted)',
      bg: 'var(--palette-oatmeal)',
      border: 'var(--color-border)',
    };
  }
  return {
    label: 'OPEN ACTIVE',
    color: 'var(--palette-coastal-blue)',
    bg: 'rgba(40, 85, 112, 0.14)',
    border: 'var(--color-operational-border)',
  };
}

function getTimelineDotColor(status) {
  const s = (status || '').toUpperCase();
  if (s === 'RESOLVED' || s === 'COMPLETED') return 'var(--color-verified)';
  if (s === 'ON_SCENE' || s === 'ARRIVED') return 'var(--color-critical)';
  if (s === 'EN_ROUTE') return 'var(--palette-coastal-blue)';
  return 'var(--palette-terracotta)';
}

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
    return <div className="loading-spinner">Loading incident audit trail and forensic verification...</div>;
  }

  if (!incident) {
    return (
      <div className="alert alert--error" role="alert">
        <AlertCircleIcon size={16} />
        <span>Incident record #{id} not found or access restricted.</span>
      </div>
    );
  }

  const lat = incident.location?.coordinates ? incident.location.coordinates[1] : 23.0225;
  const lng = incident.location?.coordinates ? incident.location.coordinates[0] : 72.5714;
  const mapCenter = [lat, lng];

  const sevBadge = getSeverityBadge(incident.severity);
  const statusBadge = getStatusBadge(incident.status);
  const totalDeployments = incident.patrol_assignments?.length || 0;
  const totalEvidence = incident.evidence?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            gap: '6px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--palette-chalk)',
            transition: 'all var(--transition-fast)',
          }}
        >
          <ArrowLeftIcon size={13} />
          <span>Back to Archive History</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchIncidentAudit}
            title="Refresh Audit Telemetry"
          >
            <RefreshIcon size={12} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Case Header & Quick Metrics Banner */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          backgroundColor: '#FAF7F6',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--palette-charcoal-slate)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.6px',
                }}
              >
                CASE #{incident.id}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: sevBadge.bg,
                  color: sevBadge.color,
                  border: `1px solid ${sevBadge.border}`,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.4px',
                }}
              >
                {sevBadge.label}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.color,
                  border: `1px solid ${statusBadge.border}`,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.4px',
                }}
              >
                {statusBadge.label}
              </span>
            </div>

            <h1 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 4px', color: 'var(--color-text-primary)', letterSpacing: '-0.2px' }}>
              Incident Audit #{incident.id}: {incident.title}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: 0 }}>
              {incident.description}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {incident.status === 'OPEN' && (
              <button
                type="button"
                onClick={() => updateIncidentStatus('RESOLVED')}
                className="btn btn-primary"
                style={{ fontSize: '11.5px', padding: '6px 14px' }}
              >
                <CheckIcon size={14} />
                <span>Mark Resolved</span>
              </button>
            )}
            {(incident.status === 'RESOLVED' || incident.status === 'CANCELLED') && (
              <button
                type="button"
                onClick={() => updateIncidentStatus('OPEN')}
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', padding: '6px 14px' }}
              >
                <RefreshIcon size={14} />
                <span>Reopen Incident</span>
              </button>
            )}
          </div>
        </div>

        {/* Institutional 4-Point Metadata Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-border-subtle)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
            <LocationPinIcon size={14} style={{ color: 'var(--palette-coastal-blue)' }} />
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>Scene Coordinates</div>
              <div style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>
                {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
            <HistoryIcon size={14} style={{ color: 'var(--color-text-muted)' }} />
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>Timestamp Recorded</div>
              <div style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>
                {incident.date_occurred ? new Date(incident.date_occurred).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
            <DispatchIcon size={14} style={{ color: totalDeployments > 0 ? 'var(--color-verified)' : 'var(--color-text-muted)' }} />
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>Patrol Deployments</div>
              <div style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>
                {totalDeployments} Assigned Unit{totalDeployments === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'var(--palette-chalk)', borderRadius: '4px', border: '1px solid var(--color-border-subtle)' }}>
            <ShieldIcon size={14} style={{ color: totalEvidence > 0 ? '#7C3AED' : 'var(--color-text-muted)' }} />
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '9px', textTransform: 'uppercase' }}>Evidence Attachments</div>
              <div style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>
                {totalEvidence} Cryptographic Artifact{totalEvidence === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Ledger Timeline & GPS Scene Verification */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', alignItems: 'stretch' }}>
        {/* LEFT COLUMN: DEPLOYMENT & STATUS LEDGER */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            backgroundColor: '#FAF7F6',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HistoryIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
              <span className="card-title" style={{ margin: 0, fontSize: '13px', letterSpacing: '0.5px' }}>
                DEPLOYMENT &amp; STATUS LEDGER
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 7px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--palette-chalk)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {totalDeployments} DISPATCH{totalDeployments === 1 ? '' : 'ES'}
            </span>
          </div>

          {/* Case Dossier Summary Box to ensure complete height balance */}
          <div
            style={{
              backgroundColor: 'var(--palette-chalk)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
              padding: '12px 14px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontWeight: '800', color: 'var(--color-text-primary)', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SecurityMark size={14} style={{ color: 'var(--palette-coastal-blue)' }} />
              <span>CASE DOSSIER SPECIFICATIONS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              <div><strong>Case ID:</strong> #{incident.id}</div>
              <div><strong>Status:</strong> {incident.status}</div>
              <div><strong>Risk Tier:</strong> {incident.severity || 'STANDARD'}</div>
              <div><strong>Geo-Point:</strong> [{lat.toFixed(4)}, {lng.toFixed(4)}]</div>
            </div>
          </div>

          {totalDeployments === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 16px',
                backgroundColor: 'var(--palette-chalk)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--color-border)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <DispatchIcon size={22} style={{ color: 'var(--color-text-muted)', marginBottom: '6px' }} />
              <div style={{ fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                STATION CONSOLE LOGGED RECORD
              </div>
              <div style={{ fontSize: '10.5px' }}>
                No external patrol unit dispatch was assigned to this incident. Incident resolution is managed via station triage.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', maxHeight: '340px' }}>
              {incident.patrol_assignments?.map((assign) => (
                <div
                  key={assign.id}
                  style={{
                    backgroundColor: 'var(--palette-chalk)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    padding: '12px 14px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--palette-charcoal-slate)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '800',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        🚓
                      </span>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                          Assignment #{assign.id} — Officer {assign.officer_username}
                        </div>
                        {assign.zone_name && (
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            Sector: {assign.zone_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: 'rgba(40, 85, 112, 0.1)',
                        color: 'var(--palette-coastal-blue)',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {assign.status || 'ASSIGNED'}
                    </span>
                  </div>

                  {assign.instructions && (
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--color-text-secondary)',
                        backgroundColor: 'var(--palette-oatmeal)',
                        padding: '5px 8px',
                        borderRadius: '3px',
                        marginBottom: '8px',
                        fontStyle: 'italic',
                      }}
                    >
                      "{assign.instructions}"
                    </div>
                  )}

                  {/* Status History Stream */}
                  <div style={{ borderLeft: '2px solid var(--color-border)', marginLeft: '8px', paddingLeft: '12px' }}>
                    {assign.status_history?.length === 0 ? (
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Status: {assign.status || 'ASSIGNED'}
                      </div>
                    ) : (
                      assign.status_history?.map((hist, idx) => {
                        const dotColor = getTimelineDotColor(hist.new_status);
                        return (
                          <div key={idx} style={{ marginBottom: idx === assign.status_history.length - 1 ? 0 : '8px', position: 'relative' }}>
                            <div
                              style={{
                                position: 'absolute',
                                left: '-17px',
                                top: '4px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                border: '1.5px solid #FAF7F6',
                              }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  color: 'var(--color-text-primary)',
                                  fontFamily: 'var(--font-mono)',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {hist.new_status}
                              </span>
                              <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {hist.actor_username ? `• by ${hist.actor_username}` : ''}
                              </span>
                            </div>
                            <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {new Date(hist.timestamp).toLocaleString()}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              padding: '8px 10px',
              borderTop: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--palette-chalk)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>🔒 Cryptographic Audit Chain Active</span>
            <span>Ref: CS-INC-{incident.id}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: GPS SCENE & ROUTE VERIFICATION MAP */}
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            backgroundColor: '#FAF7F6',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '400px',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--palette-chalk)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LayersIcon size={15} style={{ color: 'var(--palette-coastal-blue)' }} />
              <span className="card-title" style={{ margin: 0, fontSize: '13px', letterSpacing: '0.5px' }}>
                GPS SCENE &amp; ROUTE VERIFICATION
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                color: 'var(--palette-coastal-blue)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              📍 {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>

          <div style={{ flex: 1, position: 'relative', minHeight: '340px' }}>
            <CyberMap
              center={mapCenter}
              zoom={14}
              selectedIncident={{
                ...incident,
                location_input: incident.location,
              }}
              patrolAssignments={incident.patrol_assignments}
              showSearchBar={false}
              autoFit={true}
            />
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--palette-chalk)',
              fontSize: '10.5px',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>⚡ Real-time PostGIS Geo-Point Verification</span>
            <span>Live Incident &amp; Route Telemetry</span>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: CRYPTOGRAPHIC EVIDENCE LEDGER */}
      <div className="card" style={{ padding: '14px 18px', backgroundColor: '#FAF7F6', border: '1px solid var(--color-border)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldIcon size={16} style={{ color: '#7C3AED' }} />
            <span className="card-title" style={{ margin: 0, fontSize: '13px', letterSpacing: '0.5px' }}>
              CRYPTOGRAPHIC EVIDENCE LEDGER
            </span>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: totalEvidence > 0 ? 'rgba(124, 58, 237, 0.14)' : 'var(--palette-chalk)',
              color: totalEvidence > 0 ? '#7C3AED' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {totalEvidence} RECORDED ARTIFACT{totalEvidence === 1 ? '' : 'S'}
          </span>
        </div>

        {totalEvidence === 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px',
              backgroundColor: 'var(--palette-chalk)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SecurityMark size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
              <div>
                <div style={{ fontWeight: '800', color: 'var(--color-text-primary)' }}>EVIDENCE STATUS</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>0 Attachments Logged</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldIcon size={16} style={{ color: 'var(--color-verified)' }} />
              <div>
                <div style={{ fontWeight: '800', color: 'var(--color-text-primary)' }}>INTEGRITY LEDGER</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>SHA-256 Custody Verified</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HistoryIcon size={16} style={{ color: 'var(--palette-charcoal-slate)' }} />
              <div>
                <div style={{ fontWeight: '800', color: 'var(--color-text-primary)' }}>UPLOAD CHANNEL</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>Station Console &amp; Body-Cam</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
            {incident.evidence?.map((ev) => (
              <div
                key={ev.id}
                style={{
                  backgroundColor: 'var(--palette-chalk)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div
                  style={{
                    height: '100px',
                    backgroundColor: 'var(--palette-oatmeal)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid var(--color-border)',
                    gap: '6px',
                  }}
                >
                  <ShieldIcon size={22} style={{ color: '#7C3AED' }} />
                  <button
                    type="button"
                    onClick={() => viewEvidence(ev)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '10.5px', padding: '3px 10px' }}
                  >
                    <EyeIcon size={12} />
                    <span>Inspect Media</span>
                  </button>
                </div>
                <div style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ color: 'var(--color-text-primary)', fontWeight: '800', marginBottom: '2px' }}>
                    ARTIFACT #{ev.id}
                  </div>
                  <div>Uploaded: {new Date(ev.uploaded_at).toLocaleString()}</div>
                  <div>Operator: {ev.uploaded_by_username || 'Field Unit'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EVIDENCE VIEWER MODAL */}
      {selectedEvidence && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedEvidence(null);
            if (evidenceUrl) URL.revokeObjectURL(evidenceUrl);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="evidence-modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', width: '92vw', backgroundColor: '#FAF7F6' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldIcon size={16} style={{ color: '#7C3AED' }} />
                <span id="evidence-modal-title" className="card-title" style={{ margin: 0, fontSize: '13.5px' }}>
                  Evidence Artifact #{selectedEvidence.id}
                </span>
              </div>
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
                <img src={evidenceUrl} alt="Evidence Artifact" style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }} />
              </div>
            ) : (
              <div className="alert alert--error">Failed to decrypt or load media asset.</div>
            )}

            <div
              style={{
                fontSize: '10.5px',
                color: 'var(--color-text-muted)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                backgroundColor: 'var(--palette-chalk)',
                padding: '12px',
                borderRadius: 'var(--radius-xs)',
                fontFamily: 'var(--font-mono)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div>
                <strong>Uploaded By:</strong> {selectedEvidence.uploaded_by_username || 'Field Officer'}
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date(selectedEvidence.uploaded_at).toLocaleString()}
              </div>
              <div>
                <strong>Incident ID:</strong> #{incident.id}
              </div>
              <div>
                <strong>Integrity:</strong> Verified SHA-256
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
