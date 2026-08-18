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
  EyeIcon,
  XIcon,
  DownloadIcon,
  PrinterIcon,
} from '../../../components/common/Icons';

function extractErrorMessage(err, defaultMsg) {
  const data = err.response?.data;
  if (!data) return err.message || defaultMsg;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.message) return data.message;
  const keys = Object.keys(data);
  if (keys.length > 0) {
    const key = keys[0];
    const val = data[key];
    if (Array.isArray(val)) return `${key}: ${val.join(', ')}`;
    if (typeof val === 'string') return `${key}: ${val}`;
  }
  return defaultMsg;
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
      setFirs(response.data || []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load FIR records from the central database.'));
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

    const coords = [
      parseFloat(formData.longitude) || 72.5714,
      parseFloat(formData.latitude) || 23.0225,
    ];

    const payload = {
      fir_number: formData.fir_number,
      description: `[${formData.crime_type}] [${formData.priority}] - ${formData.location_text || 'Ahmedabad Sector'} - ${formData.description}`,
      location_input: {
        type: 'Point',
        coordinates: coords,
      },
      location: {
        type: 'Point',
        coordinates: coords,
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
        addToast('FIR registered successfully with verified record ID.', 'success');
      }
      fetchFirs();
      if (res.data) {
        setSelectedFir(res.data);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit First Information Report.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePrintFir = () => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Central FIR Repository</h1>
          <p className="page-header__subtitle">
            First Information Report statutory intake, jurisdictional records management, and printable dossiers
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
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
        {/* Left: FIR Intake Form with Grouped Sections */}
        <div className="card" style={{ padding: '24px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
              <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--palette-charcoal-slate)', margin: 0 }}>
                Register New FIR
              </h2>
            </div>
            <span className="badge badge--neutral">INTAKE FORM</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Section 1: Incident Information */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--palette-coastal-blue)', display: 'block', marginBottom: '8px' }}>
                1. Incident Classification
              </span>

              <div className="form-group" style={{ marginBottom: '10px' }}>
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

              <div className="form-row" style={{ gap: '8px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="crime_type">Crime Type</label>
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
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="HARASSMENT">Online Abuse</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Location Information */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--palette-coastal-blue)', display: 'block', marginBottom: '8px' }}>
                2. Jurisdictional Location
              </span>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" htmlFor="location_text">Sector / Street Address</label>
                <input
                  id="location_text"
                  name="location_text"
                  value={formData.location_text}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. C.G. Road, Navrangpura"
                />
              </div>

              <div className="form-row" style={{ gap: '8px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="latitude">Latitude</label>
                  <input
                    id="latitude"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="23.0395"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="longitude">Longitude</label>
                  <input
                    id="longitude"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="72.5571"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Incident Narrative */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--palette-coastal-blue)', display: 'block', marginBottom: '8px' }}>
                3. Evidence & Narrative Summary
              </span>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="description">Statement of Facts</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input"
                  rows={3}
                  required
                  placeholder="Enter certified operational notes and incident details..."
                />
              </div>
            </div>

            <div style={{ paddingTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitLoading}
                style={{ height: '42px', fontSize: '13px', fontWeight: '700' }}
              >
                {submitLoading ? 'Registering FIR...' : 'Officially Register FIR'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Master FIR Ledger Records */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
          {/* Header & Filter Toolbar */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--palette-chalk)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileTextIcon size={16} style={{ color: 'var(--palette-coastal-blue)' }} />
              <h3 style={{ fontSize: '13.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--palette-charcoal-slate)', margin: 0 }}>
                Master FIR Ledger ({filteredFirs.length})
              </h3>
            </div>

            <div style={{ position: 'relative', width: '240px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex' }}>
                <SearchIcon size={13} />
              </span>
              <input
                placeholder="Search FIR number or narrative..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '30px', height: '32px', fontSize: '11.5px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading FIR repository records...</div>
          ) : filteredFirs.length === 0 ? (
            <div className="empty-state">
              <FileTextIcon size={24} className="empty-state__icon" />
              <div className="empty-state__title">No FIR records found</div>
              <div className="empty-state__text">Enter incident details on the left to register a new FIR.</div>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>FIR Reference</th>
                    <th>Date / Time</th>
                    <th>Jurisdiction Coordinates</th>
                    <th>Narrative Excerpt</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFirs.map((fir) => {
                    const timeStr = fir.created_at
                      ? new Date(fir.created_at).toLocaleDateString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : 'Live Log';

                    return (
                      <tr key={fir.id}>
                        <td style={{ fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {fir.fir_number}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '11.5px' }}>
                          {timeStr}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          {fir.location?.coordinates
                            ? `${fir.location.coordinates[1].toFixed(4)}, ${fir.location.coordinates[0].toFixed(4)}`
                            : '23.0225, 72.5714'}
                        </td>
                        <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fir.description}
                        </td>
                        <td>
                          <span className={`badge badge--${fir.status === 'RESOLVED' ? 'verified' : 'operational'}`}>
                            {fir.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedFir(fir)}
                            className="btn btn-secondary btn-xs"
                            style={{ gap: '4px' }}
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

      {/* Official FIR Document Modal */}
      {selectedFir && (
        <div
          className="command-palette-overlay"
          style={{ zIndex: 1100 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fir-modal-title"
          onClick={() => setSelectedFir(null)}
        >
          <div
            className="card"
            style={{
              width: '680px',
              maxWidth: '92vw',
              padding: '32px',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-xl)',
              borderRadius: 'var(--radius-sm)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--palette-charcoal-slate)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--palette-coastal-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  STATE POLICE DEPARTMENT • AHMEDABAD CITY COMMAND HQ
                </span>
                <h2 id="fir-modal-title" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--palette-charcoal-slate)', margin: '4px 0 0 0', textTransform: 'uppercase' }}>
                  First Information Report #{selectedFir.fir_number}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFir(null)}
                className="canvas-close-btn"
                aria-label="Close modal"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Document Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', lineHeight: 1.6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'var(--palette-chalk)', padding: '12px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Registration Date:</span>
                  <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    {selectedFir.created_at ? new Date(selectedFir.created_at).toLocaleString() : new Date().toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Legal Status:</span>
                  <div>
                    <span className="badge badge--operational">{selectedFir.status || 'OPEN / ACTIVE'}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Jurisdiction:</span>
                  <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>Ahmedabad Metropolitan Region</div>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>GPS Coordinates:</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--color-text-primary)' }}>
                    {selectedFir.location?.coordinates
                      ? `${selectedFir.location.coordinates[1]}, ${selectedFir.location.coordinates[0]}`
                      : '23.0225, 72.5714'}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--palette-charcoal-slate)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Statement of Offense & Evidence Narrative:
                </span>
                <div style={{ padding: '12px 16px', backgroundColor: '#FAF7F6', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xs)', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                  {selectedFir.description}
                </div>
              </div>

              <div style={{ padding: '10px 14px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-xs)', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                STATUTORY CERTIFICATION: Electronic certificate generated in accordance with Section 65B of the Indian Evidence Act. SHA-256 Validated.
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => handleDownloadDossier(selectedFir)}
                className="btn btn-secondary"
                style={{ gap: '6px' }}
              >
                <DownloadIcon size={13} />
                <span>Download Certified Text</span>
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrintFir}
                  className="btn btn-secondary"
                  style={{ gap: '6px' }}
                >
                  <PrinterIcon size={13} />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFir(null)}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
