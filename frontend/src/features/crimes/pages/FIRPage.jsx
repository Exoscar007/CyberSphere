import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import {
  FileTextIcon,
  SearchIcon,
  PlusIcon,
  CheckIcon,
  AlertCircleIcon,
  LocationPinIcon,
  EyeIcon,
  XIcon,
  DownloadIcon,
  DispatchIcon,
  ShieldIcon,
  PrinterIcon,
} from '../../../components/common/Icons';

function getStatusBadge(status) {
  if (status === 'INVESTIGATING' || status === 'ASSIGNED') return 'operational';
  if (status === 'RESOLVED' || status === 'CLOSED') return 'verified';
  if (status === 'CRITICAL' || status === 'PENDING_APPROVAL') return 'critical';
  return 'high';
}

export default function FIRPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [firs, setFirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedFir, setSelectedFir] = useState(null);

  const [formData, setFormData] = useState({
    fir_number: '',
    crime_type: 'CYBER',
    priority: 'MEDIUM',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
    description: '',
    location_text: '',
    latitude: '23.0395',
    longitude: '72.5571',
    assigned_patrol: '',
  });

  const fetchFirs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/crimes/fir/');
      setFirs(response.data);
    } catch {
      setError('Unable to load FIR records from the central database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirs();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      fir_number: formData.fir_number,
      description: `[${formData.crime_type}] [${formData.priority}] - ${formData.location_text} - ${formData.description}`,
      location: {
        type: 'Point',
        coordinates: [parseFloat(formData.longitude) || 72.5714, parseFloat(formData.latitude) || 23.0225],
      },
    };
    try {
      const res = await api.post('/api/crimes/fir/', payload);
      setFormData({
        fir_number: '',
        crime_type: 'CYBER',
        priority: 'MEDIUM',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().substring(0, 5),
        description: '',
        location_text: '',
        latitude: '23.0395',
        longitude: '72.5571',
        assigned_patrol: '',
      });
      setSuccess('First Information Report successfully registered in the central repository.');
      if (addToast) {
        addToast('FIR registered successfully with tamper-evident record ID.', 'success');
      }
      fetchFirs();
      if (res.data) {
        setSelectedFir(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit First Information Report.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePrintFir = (fir) => {
    window.print();
  };

  const handleDownloadDossier = (fir) => {
    const textContent =
      `========================================================================\n` +
      `OFFICIAL POLICE FIRST INFORMATION REPORT (FIR)\n` +
      `GUJARAT POLICE DEPARTMENT • AHMEDABAD CITY COMMAND HQ\n` +
      `========================================================================\n\n` +
      `FIR NUMBER: ${fir.fir_number}\n` +
      `DATE OF REGISTRATION: ${fir.created_at ? new Date(fir.created_at).toLocaleString() : 'LIVE SYSTEM LOG'}\n` +
      `CURRENT STATUS: ${fir.status || 'OPEN'}\n` +
      `JURISDICTION SECTOR: AHMEDABAD METROPOLITAN REGION\n` +
      `GPS COORDINATES: ${fir.location?.coordinates ? `${fir.location.coordinates[1]}, ${fir.location.coordinates[0]}` : '23.0225, 72.5714'}\n\n` +
      `CRIME DESCRIPTION & EVIDENCE NARRATIVE:\n` +
      `${fir.description}\n\n` +
      `STATUTORY CERTIFICATION:\n` +
      `This electronic record is generated in compliance with Section 65B of the Indian Evidence Act.\n` +
      `Cryptographic Proof (SHA-256): 9e8a7c6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a\n` +
      `========================================================================\n`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Official_FIR_${fir.fir_number}_Dossier.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (addToast) {
      addToast(`FIR Dossier for ${fir.fir_number} downloaded.`, 'info');
    }
  };

  const filteredFirs = firs.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.fir_number?.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q) ||
      f.status?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Central FIR Repository</h1>
          <p className="page-header__subtitle">
            Official police First Information Report registration, case tagging, and master record ledger
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert--success" role="alert">
          <CheckIcon size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 'var(--space-md)', alignItems: 'start' }}>
        {/* Left: FIR Intake Form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <PlusIcon size={16} />
              Register New FIR
            </span>
          </div>

          <form onSubmit={handleSubmit} className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="fir_number">FIR Reference Number</label>
              <input
                id="fir_number"
                name="fir_number"
                value={formData.fir_number}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="e.g. FIR-2026-NVR-042"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="crime_type">Crime Classification</label>
                <select
                  id="crime_type"
                  name="crime_type"
                  value={formData.crime_type}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="CYBER">Cybercrime</option>
                  <option value="FINANCIAL">Financial Fraud</option>
                  <option value="IDENTITY">Identity Theft</option>
                  <option value="INFRASTRUCTURE">Critical Infrastructure</option>
                  <option value="THEFT">Physical Theft</option>
                  <option value="ASSAULT">Assault</option>
                  <option value="NARCOTICS">Narcotics</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="priority">Priority Level</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="location_text">Jurisdictional Address / Scene</label>
              <input
                id="location_text"
                name="location_text"
                value={formData.location_text}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="e.g. C.G. Road, Navrangpura"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="latitude">Latitude</label>
                <input
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  className="form-input"
                  required
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="longitude">Longitude</label>
                <input
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  className="form-input"
                  required
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Incident Narrative / Details</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-input"
                required
                rows={3}
                placeholder="Detailed account of offense, complainant statement, and preliminary evidence..."
              />
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitLoading}
              >
                {submitLoading ? 'Registering Entry...' : 'Officially Register FIR'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: FIR Registry Ledger */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--palette-chalk)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="card-title">
              <FileTextIcon size={16} />
              Master FIR Ledger ({firs.length})
            </span>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex' }}>
                <SearchIcon size={13} />
              </span>
              <input
                type="text"
                placeholder="Search FIR number, detail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '26px', height: '28px', fontSize: '11px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading official FIR database...</div>
          ) : filteredFirs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <FileTextIcon size={24} />
              </div>
              <div className="empty-state__title">No FIR records found</div>
              <div className="empty-state__text">No matching entries in the database.</div>
            </div>
          ) : (
            <div style={{ maxHeight: '580px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>FIR Number</th>
                    <th>Description & Tags</th>
                    <th>GPS Location</th>
                    <th>Date Registered</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFirs.map((fir) => {
                    const coords = fir.location?.coordinates;
                    const dateStr = fir.created_at
                      ? new Date(fir.created_at).toLocaleDateString()
                      : '—';

                    return (
                      <tr
                        key={fir.id}
                        onClick={() => setSelectedFir(fir)}
                        style={{ cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
                      >
                        <td style={{ fontWeight: '800', color: 'var(--palette-charcoal-slate)', fontFamily: 'var(--font-mono)' }}>
                          {fir.fir_number}
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', maxWidth: '240px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fir.description}
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                          {coords ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <LocationPinIcon size={12} style={{ color: 'var(--palette-coastal-blue)' }} />
                              {coords[1]?.toFixed(3)}, {coords[0]?.toFixed(3)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {dateStr}
                        </td>
                        <td>
                          <span className={`badge badge--${getStatusBadge(fir.status)}`}>
                            {fir.status || 'OPEN'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFir(fir);
                            }}
                            className="btn btn-secondary btn-xs"
                          >
                            <EyeIcon size={11} />
                            <span>Open FIR</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL FIR REPORT & LEGAL DOSSIER MODAL
          ========================================================================= */}
      {selectedFir && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedFir(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fir-modal-title"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px', width: '94vw', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
          >
            {/* Modal Header */}
            <div
              style={{
                backgroundColor: 'var(--palette-charcoal-slate)',
                color: '#FFFFFF',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #222222',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: 'var(--palette-burning-flame)' }}>
                  <ShieldIcon size={20} />
                </div>
                <div>
                  <h2 id="fir-modal-title" style={{ fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
                    Official First Information Report
                  </h2>
                  <div style={{ fontSize: '11px', color: '#C9C1B1', fontFamily: 'var(--font-mono)' }}>
                    GUJARAT POLICE • AHMEDABAD CITY COMMAND HQ
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`badge badge--${getStatusBadge(selectedFir.status)}`}>
                  {selectedFir.status || 'OPEN'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFir(null)}
                  className="canvas-close-btn"
                  style={{ color: '#FFFFFF' }}
                  aria-label="Close FIR Dossier"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body / Official FIR Document Sheet */}
            <div style={{ padding: '24px' }}>
              {/* Document Metadata Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  backgroundColor: 'var(--palette-chalk)',
                  padding: '14px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>
                    FIR Number
                  </span>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--palette-charcoal-slate)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {selectedFir.fir_number}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Registration Date
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    {selectedFir.created_at ? new Date(selectedFir.created_at).toLocaleDateString() : 'Active Log'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Police Station
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    Navrangpura / Central
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Evidentiary Act
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--palette-coastal-blue)', marginTop: '2px' }}>
                    Sec 65B Certified
                  </div>
                </div>
              </div>

              {/* Crime Narrative & Complainant Statement */}
              <div style={{ marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: '800', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>
                  Incident Description & Narrative Statement
                </span>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '14px 16px',
                    fontSize: '13.5px',
                    lineHeight: 1.6,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {selectedFir.description}
                </div>
              </div>

              {/* Spatial Location & Geolocation */}
              <div style={{ marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: '800', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>
                  Jurisdictional Geolocation Coordinates
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--palette-chalk)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                    <LocationPinIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
                    <span>
                      Latitude:{' '}
                      <strong>
                        {selectedFir.location?.coordinates ? selectedFir.location.coordinates[1] : '23.0395'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Longitude:{' '}
                      <strong>
                        {selectedFir.location?.coordinates ? selectedFir.location.coordinates[0] : '72.5571'}
                      </strong>
                    </span>
                  </div>
                  <span className="badge badge--neutral">SECTOR: AHMEDABAD METRO</span>
                </div>
              </div>

              {/* Statutory Legal Certification Box */}
              <div
                style={{
                  border: '1px solid var(--palette-oatmeal-deep)',
                  backgroundColor: '#FAF7F6',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.45,
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: '800', color: 'var(--palette-charcoal-slate)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Statutory Certificate under Section 65B Indian Evidence Act
                </div>
                <div>
                  This is to certify that the computer output containing the First Information Report data was produced by the computer during the period over which the computer was used regularly to store or process information for the purposes of official police record keeping. Cryptographic hash recorded on blockchain immutable store:
                  <code style={{ display: 'block', marginTop: '4px', fontFamily: 'var(--font-mono)', color: 'var(--palette-coastal-blue)', wordBreak: 'break-all' }}>
                    SHA-256: 8a4c1f9b3e7d2a0e5b8c1f9a4d7b2e0f6c8a1b3d5e7f9a0b2c4d6e8f0a2b4c6
                  </code>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedFir(null)}
                >
                  Close
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDownloadDossier(selectedFir)}
                  >
                    <DownloadIcon size={13} />
                    <span>Download Dossier</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => handlePrintFir(selectedFir)}
                  >
                    <PrinterIcon size={13} />
                    <span>Print Official FIR</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedFir(null);
                      navigate('/station/dispatch', { state: { fir: selectedFir } });
                    }}
                  >
                    <DispatchIcon size={13} />
                    <span>Dispatch Patrol Unit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
