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

  const getStatusColor = (status) => {
    const map = { OPEN: 'var(--color-warning)', INVESTIGATING: 'var(--color-info)', CLOSED: 'var(--color-success)' };
    return map[status] || 'var(--color-text-secondary)';
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isCityCommand = user.role === 'ADMIN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', height: '100%', backgroundColor: 'var(--color-bg)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)', padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
        <span style={{ fontWeight: 'bold' }}>{isCityCommand ? 'GLOBAL FIR DATABASE' : 'STATION FIR REGISTRATION'}</span>
        {error && <span style={{ color: 'var(--color-danger)' }}>{error}</span>}
        {success && <span style={{ color: 'var(--color-success)' }}>{success}</span>}
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '8px', minHeight: 0 }}>
        
        {/* Left: Registration Form (Hidden for Admin) */}
        {!isCityCommand && (
          <div style={{ flex: '0 0 45%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>CREATE OFFICIAL FIR</span>
            </div>
            
            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* CASE INFORMATION */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '8px' }}>CASE INFORMATION</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>FIR NUMBER</label>
                    <input name="fir_number" required value={formData.fir_number} onChange={handleChange} placeholder="FIR-2026-XXXX" style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>CRIME TYPE</label>
                    <select name="crime_type" value={formData.crime_type} onChange={handleChange} style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
                      <option value="CYBER">CYBERCRIME</option>
                      <option value="THEFT">VEHICLE THEFT</option>
                      <option value="FRAUD">FINANCIAL FRAUD</option>
                      <option value="ASSAULT">ASSAULT</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>PRIORITY</label>
                    <select name="priority" value={formData.priority} onChange={handleChange} style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>STATUS</label>
                    <input value="OPEN / UNASSIGNED" disabled style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }} />
                  </div>
                </div>
              </div>

              {/* INCIDENT DETAILS */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '8px' }}>INCIDENT DETAILS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>DATE</label>
                    <input type="date" name="date" required value={formData.date} onChange={handleChange} style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>TIME</label>
                    <input type="time" name="time" required value={formData.time} onChange={handleChange} style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>NARRATIVE / DESCRIPTION</label>
                  <textarea name="description" required rows="3" value={formData.description} onChange={handleChange} style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px', resize: 'vertical' }}></textarea>
                </div>
              </div>

              {/* JURISDICTION */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-primary-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '8px' }}>JURISDICTION</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>LOCATION AREA</label>
                  <input name="location_text" required value={formData.location_text} onChange={handleChange} placeholder="e.g. Near SG Highway" style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>LATITUDE</label>
                    <input name="latitude" required value={formData.latitude} onChange={handleChange} style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>LONGITUDE</label>
                    <input name="longitude" required value={formData.longitude} onChange={handleChange} style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }} />
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '16px' }}>
                <button type="submit" disabled={submitLoading} style={{ flex: 1, background: 'var(--color-primary)', border: 'none', color: '#fff', padding: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>
                  {submitLoading ? 'SAVING...' : 'SAVE FIR'}
                </button>
                <button type="button" style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-primary-light)', color: 'var(--color-primary-light)', padding: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-family-mono)' }}>
                  ASSIGN PATROL
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Right/Full: Table */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>DATABASE RECORDS ({filteredFirs.length})</span>
            <input 
              placeholder="SEARCH FIRS..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '2px 6px', fontSize: '10px', fontFamily: 'var(--font-family-mono)', width: '200px' }}
            />
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>LOADING RECORDS...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}>
                <thead style={{ backgroundColor: 'var(--color-bg-dark)', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '6px 12px', textAlign: 'left' }}>FIR ID</th>
                    <th style={{ padding: '6px 12px', textAlign: 'left' }}>NARRATIVE</th>
                    <th style={{ padding: '6px 12px', textAlign: 'left' }}>STATUS</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right' }}>TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFirs.map((fir, idx) => (
                    <tr key={fir.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--color-primary-light)', fontWeight: 'bold' }}>{fir.fir_number}</td>
                      <td style={{ padding: '8px 12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fir.description}</td>
                      <td style={{ padding: '8px 12px', color: getStatusColor(fir.status), fontWeight: 'bold' }}>{fir.status}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {fir.date_reported ? new Date(fir.date_reported).toISOString().replace('T', ' ').substring(0, 19) : '—'}
                      </td>
                    </tr>
                  ))}
                  {filteredFirs.length === 0 && <tr><td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>NO RECORDS FOUND</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
