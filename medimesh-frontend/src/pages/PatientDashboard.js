import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';

export default function PatientDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/dashboard');
      setData(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const bookAppointment = async () => {
    try {
      await api.post('/api/appointments', form);
      setModal(null); setForm({});
      loadData();
    } catch (err) { alert(err.response?.data?.message || 'Error booking appointment'); }
  };

  const fileComplaint = async () => {
    try {
      await api.post('/api/complaints', form);
      setModal(null); setForm({});
      alert('Complaint submitted successfully!');
    } catch (err) { alert(err.response?.data?.message || 'Error filing complaint'); }
  };

  if (loading) return (<><Navbar /><div className="loading"><div className="spinner"></div></div></>);

  return (
    <>
      <Navbar />
      <div className="dashboard">
        <div className="page-header">
          <h1>Patient Dashboard</h1>
          <p>Welcome, {user.fullName || user.username} — Your health portal</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">📅</div>
            <div className="stat-info"><h3>{data.appointments?.length || 0}</h3><p>My Appointments</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">🩺</div>
            <div className="stat-info"><h3>{data.doctors?.length || 0}</h3><p>Available Doctors</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">🚑</div>
            <div className="stat-info"><h3>{data.ambulances?.filter(a => a.status === 'available').length || 0}</h3><p>Ambulances Available</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">💊</div>
            <div className="stat-info"><h3>{data.medicines?.length || 0}</h3><p>Medicines</p></div>
          </div>
        </div>

        <div style={{display:'flex', gap:'12px', marginBottom:'1.5rem', flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={() => { setForm({}); setModal('bookAppointment'); }}>📅 Book Appointment</button>
          <button className="btn btn-ghost" onClick={() => { setForm({ category: 'Other' }); setModal('fileComplaint'); }}>🧾 File Complaint</button>
        </div>

        <div className="tabs">
          {['overview','doctors','pharmacy','ambulances'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="card">
            <div className="card-header"><h2>My Appointments</h2></div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.appointments || []).map(a => (
                    <tr key={a._id}>
                      <td>{a.doctorName || a.doctorId}</td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td>{a.reason}</td>
                      <td><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.appointments || data.appointments.length === 0) && <div className="empty-state"><div className="empty-icon">📅</div><h3>No appointments yet</h3><p>Book your first appointment!</p></div>}
            </div>
          </div>
        )}

        {tab === 'doctors' && (
          <div className="card">
            <div className="card-header"><h2>Doctors</h2></div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Name</th><th>Specialization</th><th>Experience</th><th>Fee</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {(data.doctors || []).map(d => (
                    <tr key={d._id}>
                      <td><strong>{d.fullName}</strong></td>
                      <td>{d.specialization}</td>
                      <td>{d.experience} yrs</td>
                      <td>₹{d.consultationFee}</td>
                      <td><span className={`status-badge ${d.available ? 'status-available' : 'status-busy'}`}>{d.available ? 'Available' : 'Busy'}</span></td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => { setForm({ doctorId: d.username, doctorName: d.fullName }); setModal('bookAppointment'); }}>
                          Book
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'pharmacy' && (
          <div className="card">
            <div className="card-header"><h2>Medicine Stock</h2></div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Medicine</th><th>Category</th><th>Manufacturer</th><th>Price</th><th>Stock</th></tr></thead>
                <tbody>
                  {(data.medicines || []).map(m => (
                    <tr key={m._id}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.category}</td>
                      <td>{m.manufacturer}</td>
                      <td>₹{m.price}</td>
                      <td><span className={`status-badge ${m.stock > 0 ? 'status-available' : 'status-busy'}`}>{m.stock > 0 ? `${m.stock} in stock` : 'Out of stock'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.medicines || data.medicines.length === 0) && <div className="empty-state"><div className="empty-icon">💊</div><h3>No medicines listed</h3></div>}
            </div>
          </div>
        )}

        {tab === 'ambulances' && (
          <div className="card">
            <div className="card-header"><h2>Ambulance Availability</h2></div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Vehicle</th><th>Driver</th><th>Phone</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.ambulances || []).map(a => (
                    <tr key={a._id}>
                      <td><strong>{a.vehicleNumber}</strong></td>
                      <td>{a.driverName}</td>
                      <td>{a.driverPhone}</td>
                      <td>{a.type}</td>
                      <td><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.ambulances || data.ambulances.length === 0) && <div className="empty-state"><div className="empty-icon">🚑</div><h3>No ambulances</h3></div>}
            </div>
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {modal === 'bookAppointment' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Book Appointment</h2><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Doctor ID (username)</label><input value={form.doctorId || ''} onChange={e => setForm({...form, doctorId: e.target.value})} placeholder="e.g. doctor1" /></div>
              <div className="form-group"><label>Doctor Name</label><input value={form.doctorName || ''} onChange={e => setForm({...form, doctorName: e.target.value})} /></div>
              <div className="form-group"><label>Date</label><input type="date" value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} /></div>
              <div className="form-group"><label>Time</label><input type="time" value={form.time || ''} onChange={e => setForm({...form, time: e.target.value})} /></div>
              <div className="form-group"><label>Reason</label><textarea value={form.reason || ''} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Describe your concern" /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={bookAppointment}>Book Appointment</button></div>
          </div>
        </div>
      )}

      {/* File Complaint Modal */}
      {modal === 'fileComplaint' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>File a Complaint</h2><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Subject</label><input value={form.subject || ''} onChange={e => setForm({...form, subject: e.target.value})} /></div>
              <div className="form-group"><label>Category</label>
                <select value={form.category || 'Other'} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="Service">Service</option><option value="Staff">Staff</option><option value="Facility">Facility</option><option value="Billing">Billing</option><option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group"><label>Description</label><textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe your issue in detail" /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={fileComplaint}>Submit</button></div>
          </div>
        </div>
      )}
    </>
  );
}
