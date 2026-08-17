import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { ShieldIcon, EyeIcon, FileTextIcon, AlertCircleIcon } from '../../../components/common/Icons';

export default function EvidenceReviewPage() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/crimes/incidents/');
        setIncidents(response.data);
      } catch (err) {
        setError('Unable to load incident records.');
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  const handleSelectIncident = async (incidentId) => {
    setSelectedIncident(incidentId);
    setEvidenceLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/crimes/evidence/?incident_id=${incidentId}`);
      setEvidence(response.data);
    } catch (err) {
      setError('Unable to load evidence for this incident.');
      setEvidence([]);
    } finally {
      setEvidenceLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Digital Evidence & Artifact Review</h1>
          <p className="page-header__subtitle">Review cryptographic field evidence submitted by deployed mobile units</p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-md)', alignItems: 'start' }}>
        {/* Incident Selection List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--palette-chalk)', borderBottom: '1px solid var(--color-border)' }}>
            <span className="card-title">
              <FileTextIcon size={14} />
              Incidents Index
            </span>
          </div>
          {loading ? (
            <div className="loading-spinner">Loading incident registry...</div>
          ) : incidents.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px' }}>
              No incidents found.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '560px', overflowY: 'auto' }}>
              {incidents.map((inc) => (
                <li
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc.id)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: selectedIncident === inc.id ? 'var(--palette-chalk)' : 'transparent',
                    fontWeight: selectedIncident === inc.id ? 700 : 500,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    transition: 'background-color var(--transition-fast)',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    INC #{inc.id}: {inc.title.substring(0, 24)}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inc.description}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Evidence Viewer */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--palette-chalk)', borderBottom: '1px solid var(--color-border)' }}>
            <span className="card-title">
              <ShieldIcon size={14} />
              Cryptographic Evidence Ledger
            </span>
          </div>

          {!selectedIncident ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state__icon">
                <FileTextIcon size={24} />
              </div>
              <div className="empty-state__title">Awaiting Incident Selection</div>
              <div className="empty-state__text">Select an incident from the index to review evidence.</div>
            </div>
          ) : evidenceLoading ? (
            <div className="loading-spinner">Decrypting artifacts...</div>
          ) : evidence.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state__icon">
                <ShieldIcon size={24} />
              </div>
              <div className="empty-state__title">No Artifacts Registered</div>
              <div className="empty-state__text">No evidence items uploaded for this incident.</div>
            </div>
          ) : (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {evidence.map((item) => (
                  <div key={item.id} style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--palette-chalk)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                    <div style={{ height: '120px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid var(--color-border)' }}>
                      {item.file.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img src={`http://localhost:8000${item.file}`} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>[ DOCUMENT ]</div>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                      <div style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>EVIDENCE ID: #{item.id}</div>
                      <div style={{ color: 'var(--color-text-muted)' }}>ASSIGNMENT: #{item.assignment}</div>
                      <div style={{ marginTop: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                        <a href={`http://localhost:8000${item.file}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--palette-sage)', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <EyeIcon size={11} />
                          <span>View Media Asset</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
