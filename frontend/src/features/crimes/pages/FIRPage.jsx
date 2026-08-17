import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function FIRPage() {
  const [firs, setFirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState('');
  
  // Structured form data
  const [formData, setFormData] = useState({
    fir_number: '', crime_type: 'CYBER', priority: 'MEDIUM',
    date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().substring(0,5),
    description: '', location_text: '',
    latitude: '23.0395', longitude: '72.5571',
    assigned_patrol: ''
  });

  const fetchFirs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/crimes/fir/');
      setFirs(response.data);
    } catch (err) {
      setError('Unable to load FIR records from the central database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFirs(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);
    
    // Construct standard payload for the existing backend
    const payload = {
      fir_number: formData.fir_number,
      description: `[${formData.crime_type}] [${formData.priority}] - ${formData.location_text} - ${formData.description}`,
      location: {
        type: 'Point',
        coordinates: [parseFloat(formData.longitude) || 72.5714, parseFloat(formData.latitude) || 23.0225],
      },
    };
    try {
      await api.post('/api/crimes/fir/', payload);
      setFormData({
        fir_number: '', crime_type: 'CYBER', priority: 'MEDIUM',
        date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().substring(0,5),
        description: '', location_text: '', latitude: '23.0395', longitude: '72.5571', assigned_patrol: ''
      });
      setSuccess('FIR OFFICIALLY REGISTERED IN DATABASE.');
      fetchFirs();
    } catch (err) {
      setError('Failed to register FIR. Backend validation failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredFirs = firs.filter((f) =>
    f.fir_number?.toLowerCase().includes(search.toLowerCase()) ||
    f.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadgeClass = (status) => {
    if (status === 'CLOSED') return 'badge--danger';
    if (status === 'INVESTIGATING') return 'badge--success';
    if (status === 'OPEN') return 'badge--warning';
    return 'badge--medium';
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isCityCommand = user.role === 'ADMIN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ fontWeight: 'bold' }}>{isCityCommand ? 'GLOBAL FIR DATABASE' : 'STATION FIR REGISTRATION'}</span>
        {error && <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{error}</span>}
        {success && <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{success}</span>}
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '8px', minHeight: 0 }}>
        
        {/* Left: Registration Form (Hidden for Admin) */}
        {!isCityCommand && (
          <div style={{ flex: '0 0 45%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>CREATE OFFICIAL FIR</span>
            </div>
            
            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* CASE INFORMATION */}
              <div style={{ backgroundColor: '#0d1320', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>CASE INFORMATION</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">FIR NUMBER</label>
                    <input name="fir_number" required value={formData.fir_number} onChange={handleChange} placeholder="FIR-2026-XXXX" className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '30px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">CRIME TYPE</label>
                    <select name="crime_type" value={formData.crime_type} onChange={handleChange} className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '30px' }}>
                      <option value="CYBER">CYBERCRIME</option>
                      <option value="THEFT">VEHICLE THEFT</option>
                      <option value="FRAUD">FINANCIAL FRAUD</option>
                      <option value="ASSAULT">ASSAULT</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">PRIORITY</label>
                    <select name="priority" value={formData.priority} onChange={handleChange} className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '30px' }}>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">STATUS</label>
                    <input value="OPEN / UNASSIGNED" disabled className="form-input" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', height: '30px' }} />
                  </div>
                </div>
              </div>

              {/* INCIDENT DETAILS */}
              <div style={{ backgroundColor: '#0d1320', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>INCIDENT DETAILS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">DATE</label>
                    <input type="date" name="date" required value={formData.date} onChange={handleChange} className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '30px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">TIME</label>
                    <input type="time" name="time" required value={formData.time} onChange={handleChange} className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '30px' }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">NARRATIVE / DESCRIPTION</label>
                  <textarea name="description" required rows="3" value={formData.description} onChange={handleChange} className="form-input" placeholder="Enter detailed narrative..." style={{ fontFamily: 'var(--font-family-mono)' }}></textarea>
                </div>
              </div>

              {/* JURISDICTION */}
              <div style={{ backgroundColor: '#0d1320', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '8px', letterSpacing: '0.5px' }}>JURISDICTION</div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label">LOCATION AREA</label>
                  <input name="location_text" required value={formData.location_text} onChange={handleChange} placeholder="e.g. Near SG Highway" className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '30px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">LATITUDE</label>
                    <input name="latitude" required value={formData.latitude} onChange={handleChange} className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '30px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">LONGITUDE</label>
                    <input name="longitude" required value={formData.longitude} onChange={handleChange} className="form-input" style={{ fontFamily: 'var(--font-family-mono)', height: '30px' }} />
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                <button type="submit" disabled={submitLoading} className="btn btn--primary" style={{ flex: 1, height: '34px' }}>
                  {submitLoading ? 'SAVING...' : 'SAVE FIR'}
                </button>
                <button type="button" className="btn btn--secondary" style={{ flex: 1, height: '34px' }}>
                  ASSIGN PATROL
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Right/Full: Table */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>DATABASE RECORDS ({filteredFirs.length})</span>
            <div className="search-bar" style={{ width: '220px' }}>
              <span className="search-bar__icon">🔍</span>
              <input 
                placeholder="Search FIRs..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            {loading ? (
              <div className="loading-spinner">LOADING RECORDS...</div>
            ) : (
              <table className="data-table" style={{ fontFamily: 'var(--font-family-mono)' }}>
                <thead style={{ backgroundColor: '#0d1320', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>FIR ID</th>
                    <th style={{ padding: '8px 12px' }}>NARRATIVE</th>
                    <th style={{ padding: '8px 12px' }}>STATUS</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFirs.map((fir, idx) => (
                    <tr key={fir.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--color-primary-light)', fontWeight: '700' }}>{fir.fir_number}</td>
                      <td style={{ padding: '8px 12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fir.description}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`badge ${getStatusBadgeClass(fir.status)}`}>
                          {fir.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {fir.date_reported ? new Date(fir.date_reported).toISOString().replace('T', ' ').substring(0, 19) : '—'}
                      </td>
                    </tr>
                  ))}
                  {filteredFirs.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>NO RECORDS FOUND</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
