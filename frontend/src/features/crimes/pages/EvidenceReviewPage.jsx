import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

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
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Evidence Review</h1>
        <p className="page-header__subtitle">Review field evidence submitted by mobile patrols (Incident-centric)</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
        {/* Incident Selection List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-sm) var(--space-md)', backgroundColor: 'var(--color-bg-dark)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="card__title" style={{ margin: 0, fontSize: '11px' }}>Operational Incidents Index</div>
          </div>
          {loading ? (
            <div className="loading-spinner">Loading incidents...</div>
          ) : incidents.length === 0 ? (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>No incidents found.</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '600px', overflowY: 'auto' }}>
              {incidents.map(inc => (
                <li key={inc.id} 
                    onClick={() => handleSelectIncident(inc.id)}
                    style={{ 
                      padding: 'var(--space-sm) var(--space-md)', 
                      borderBottom: '1px solid var(--color-border)', 
                      cursor: 'pointer',
                      backgroundColor: selectedIncident === inc.id ? 'var(--color-surface-hover)' : 'transparent',
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: '11px'
                    }}>
                  <div style={{ fontWeight: 600, color: selectedIncident === inc.id ? 'var(--color-primary-light)' : 'var(--color-text)' }}>
                    INC #{inc.id}: {inc.title.substring(0, 25)}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inc.description}
                  </div>
                  {inc.fir && <div style={{ color: 'var(--color-info)', marginTop: '4px', fontSize: '10px' }}>FIR LINKED</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Evidence Viewer */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-sm) var(--space-md)', backgroundColor: 'var(--color-bg-dark)', borderBottom: '1px solid var(--color-border)' }}>
            <div className="card__title" style={{ margin: 0, fontSize: '11px' }}>Digital Evidence Archive</div>
          </div>
          
          {!selectedIncident ? (
            <div className="empty-state" style={{ padding: 'var(--space-2xl) 0' }}>
              <div className="empty-state__icon">📁</div>
              <div className="empty-state__title" style={{ fontSize: '12px' }}>Awaiting Selection</div>
              <div className="empty-state__text" style={{ fontSize: '11px' }}>Select a reference from the master index.</div>
            </div>
          ) : evidenceLoading ? (
            <div className="loading-spinner">Decrypting payload...</div>
          ) : evidence.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-2xl) 0' }}>
              <div className="empty-state__icon">📷</div>
              <div className="empty-state__title" style={{ fontSize: '12px' }}>No Artifacts Found</div>
            </div>
          ) : (
            <div style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                {evidence.map(item => (
                  <div key={item.id} style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{ height: '140px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {item.file.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img src={`http://localhost:8000${item.file}`} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}>[ DOCUMENT ]</div>
                      )}
                    </div>
                    <div style={{ padding: 'var(--space-sm)', fontFamily: 'var(--font-family-mono)', fontSize: '10px', backgroundColor: 'var(--color-surface)' }}>
                      <div style={{ color: 'var(--color-text-secondary)' }}>EVIDENCE ID: <span style={{ color: 'var(--color-text)' }}>{item.id}</span></div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>ASSIGNMENT: <span style={{ color: 'var(--color-text)' }}>#{item.assignment}</span></div>
                      {item.fir && <div style={{ color: 'var(--color-text-secondary)' }}>FIR: <span style={{ color: 'var(--color-text)' }}>#{item.fir}</span></div>}
                      <div style={{ color: 'var(--color-text-secondary)' }}>TS: <span style={{ color: 'var(--color-text)' }}>{new Date(item.uploaded_at).toISOString().replace('T',' ').substring(0,19)}</span></div>
                      <div style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                        <a href={`http://localhost:8000${item.file}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 'bold' }}>&gt; VIEW ASSET</a>
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
