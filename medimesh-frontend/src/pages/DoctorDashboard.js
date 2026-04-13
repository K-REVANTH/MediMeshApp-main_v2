import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';

export default function DoctorDashboard() {
  const [tab, setTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptRes, vitalsRes] = await Promise.allSettled([
        api.get('/api/appointments/my'),
        api.get('/api/vitals')
      ]);
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data);
      if (vitalsRes.status === 'fulfilled') setVitals(vitalsRes.value.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const updateAppointment = async (id, status) => {
    try {
      await api.patch(`/api/appointments/${id}/status`, { status });
      loadData();
    } catch (err) { alert('Error updating appointment'); }
  };

  const addVitals = async () => {
    try {
      await api.post('/api/vitals', form);
      setModal(null); setForm({});
      loadData();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return (<><Navbar /><div className="loading"><div className="spinner"></div></div></>);

  const pending = appointments.filter(a => a.status === 'pending').length;
  const approved = appointments.filter(a => a.status === 'approved').length;

  return (
    <>
      <Navbar />
      <div className="dashboard">
        <div className="page-header">
          <h1>Doctor Dashboard</h1>
          <p>Welcome, {user.fullName || user.username} — Manage your appointments and patient vitals</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">📅</div>
            <div className="stat-info"><h3>{appointments.length}</h3><p>Total Appointments</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">⏳</div>
            <div className="stat-info"><h3>{pending}</h3><p>Pending</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div className="stat-info"><h3>{approved}</h3><p>Approved</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cyan">❤️</div>
            <div className="stat-info"><h3>{vitals.length}</h3><p>Vitals Records</p></div>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'appointments' ? 'active' : ''}`} onClick={() => setTab('appointments')}>Appointments</button>
          <button className={`tab ${tab === 'vitals' ? 'active' : ''}`} onClick={() => setTab('vitals')}>Patient Vitals</button>
        </div>

        {tab === 'appointments' && (
          <div className="card">
            <div className="card-header"><h2>My Appointments</h2></div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a._id}>
                      <td>{a.patientName}</td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td>{a.reason}</td>
                      <td><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                      <td>
                        {a.status === 'pending' && (
                          <div style={{display:'flex', gap:'4px'}}>
                            <button className="btn btn-sm btn-success" onClick={() => updateAppointment(a._id, 'approved')}>Approve</button>
                            <button className="btn btn-sm btn-danger" onClick={() => updateAppointment(a._id, 'rejected')}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {appointments.length === 0 && <div className="empty-state"><div className="empty-icon">📅</div><h3>No appointments</h3></div>}
            </div>
          </div>
        )}

        {tab === 'vitals' && (
          <div className="card">
            <div className="card-header">
              <h2>Patient Vitals</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm({}); setModal('addVitals'); }}>+ Record Vitals</button>
            </div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Patient</th><th>BP</th><th>Heart Rate</th><th>Temp (°F)</th><th>O₂</th><th>Date</th></tr></thead>
                <tbody>
                  {vitals.map(v => (
                    <tr key={v._id}>
                      <td>{v.patientName || v.patientId}</td>
                      <td>{v.bloodPressure}</td>
                      <td>{v.heartRate} bpm</td>
                      <td>{v.temperature}</td>
                      <td>{v.oxygenLevel}%</td>
                      <td>{new Date(v.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vitals.length === 0 && <div className="empty-state"><div className="empty-icon">❤️</div><h3>No vitals recorded</h3></div>}
            </div>
          </div>
        )}
      </div>

      {modal === 'addVitals' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Record Patient Vitals</h2><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Patient ID</label><input value={form.patientId || ''} onChange={e => setForm({...form, patientId: e.target.value})} placeholder="Patient user ID" /></div>
              <div className="form-group"><label>Patient Name</label><input value={form.patientName || ''} onChange={e => setForm({...form, patientName: e.target.value})} /></div>
              <div className="form-group"><label>Blood Pressure</label><input value={form.bloodPressure || ''} onChange={e => setForm({...form, bloodPressure: e.target.value})} placeholder="e.g. 120/80" /></div>
              <div className="form-group"><label>Heart Rate (bpm)</label><input type="number" value={form.heartRate || ''} onChange={e => setForm({...form, heartRate: e.target.value})} /></div>
              <div className="form-group"><label>Temperature (°F)</label><input type="number" step="0.1" value={form.temperature || ''} onChange={e => setForm({...form, temperature: e.target.value})} /></div>
              <div className="form-group"><label>Oxygen Level (%)</label><input type="number" value={form.oxygenLevel || ''} onChange={e => setForm({...form, oxygenLevel: e.target.value})} /></div>
              <div className="form-group"><label>Notes</label><textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={addVitals}>Save Vitals</button></div>
          </div>
        </div>
      )}
    </>
  );
}
