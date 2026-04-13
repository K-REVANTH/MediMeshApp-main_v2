import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/dashboard');
      setData(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ─── Pharmacy CRUD ────────────────────────────────────
  const addMedicine = async () => {
    try {
      await api.post('/api/pharmacy', form);
      setModal(null); setForm({});
      loadDashboard();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const deleteMedicine = async (id) => {
    if (!window.confirm('Delete this medicine?')) return;
    try {
      await api.delete(`/api/pharmacy/${id}`);
      loadDashboard();
    } catch (err) { alert('Error deleting'); }
  };

  // ─── Ambulance CRUD ───────────────────────────────────
  const addAmbulance = async () => {
    try {
      await api.post('/api/ambulances', form);
      setModal(null); setForm({});
      loadDashboard();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const updateAmbulanceStatus = async (id, status) => {
    try {
      await api.patch(`/api/ambulances/${id}`, { status });
      loadDashboard();
    } catch (err) { alert('Error updating'); }
  };

  // ─── Complaint Management ─────────────────────────────
  const updateComplaint = async (id, status) => {
    try {
      await api.patch(`/api/complaints/${id}`, { status });
      loadDashboard();
    } catch (err) { alert('Error updating'); }
  };

  if (loading) return (<><Navbar /><div className="loading"><div className="spinner"></div></div></>);

  return (
    <>
      <Navbar />
      <div className="dashboard">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user.fullName || user.username} — System overview and management</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">🩺</div>
            <div className="stat-info"><h3>{data.doctors?.length || 0}</h3><p>Doctors</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📅</div>
            <div className="stat-info"><h3>{data.appointments?.length || 0}</h3><p>Appointments</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">💊</div>
            <div className="stat-info"><h3>{data.medicines?.length || 0}</h3><p>Medicines</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">🚑</div>
            <div className="stat-info"><h3>{data.ambulances?.length || 0}</h3><p>Ambulances</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">🧾</div>
            <div className="stat-info"><h3>{data.complaints?.length || 0}</h3><p>Complaints</p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['overview','pharmacy','ambulances','complaints','appointments'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><h2>Recent Appointments</h2></div>
              <div className="card-body table-container">
                <table>
                  <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {(data.appointments || []).slice(0, 5).map(a => (
                      <tr key={a._id}>
                        <td>{a.patientName}</td>
                        <td>{a.doctorName || a.doctorId}</td>
                        <td>{a.date} {a.time}</td>
                        <td><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data.appointments || data.appointments.length === 0) && <div className="empty-state"><div className="empty-icon">📅</div><h3>No appointments yet</h3></div>}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>Doctors List</h2></div>
              <div className="card-body table-container">
                <table>
                  <thead><tr><th>Name</th><th>Specialization</th><th>Status</th></tr></thead>
                  <tbody>
                    {(data.doctors || []).map(d => (
                      <tr key={d._id}>
                        <td>{d.fullName}</td>
                        <td>{d.specialization}</td>
                        <td><span className={`status-badge ${d.available ? 'status-available' : 'status-busy'}`}>{d.available ? 'Available' : 'Busy'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pharmacy Tab */}
        {tab === 'pharmacy' && (
          <div className="card">
            <div className="card-header">
              <h2>Medicine Inventory</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm({}); setModal('addMedicine'); }}>+ Add Medicine</button>
            </div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                <tbody>
                  {(data.medicines || []).map(m => (
                    <tr key={m._id}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.category}</td>
                      <td>₹{m.price}</td>
                      <td>{m.stock}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => deleteMedicine(m._id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.medicines || data.medicines.length === 0) && <div className="empty-state"><div className="empty-icon">💊</div><h3>No medicines added</h3><p>Click "Add Medicine" to add inventory</p></div>}
            </div>
          </div>
        )}

        {/* Ambulances Tab */}
        {tab === 'ambulances' && (
          <div className="card">
            <div className="card-header">
              <h2>Ambulance Fleet</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm({ type: 'Basic', status: 'available' }); setModal('addAmbulance'); }}>+ Add Ambulance</button>
            </div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Vehicle</th><th>Driver</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {(data.ambulances || []).map(a => (
                    <tr key={a._id}>
                      <td><strong>{a.vehicleNumber}</strong></td>
                      <td>{a.driverName}</td>
                      <td>{a.type}</td>
                      <td><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => updateAmbulanceStatus(a._id, a.status === 'available' ? 'busy' : 'available')}>
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.ambulances || data.ambulances.length === 0) && <div className="empty-state"><div className="empty-icon">🚑</div><h3>No ambulances</h3></div>}
            </div>
          </div>
        )}

        {/* Complaints Tab */}
        {tab === 'complaints' && (
          <div className="card">
            <div className="card-header"><h2>Complaints Management</h2></div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>User</th><th>Subject</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {(data.complaints || []).map(c => (
                    <tr key={c._id}>
                      <td>{c.username}</td>
                      <td><strong>{c.subject}</strong><br/><small style={{color:'#6B7280'}}>{c.description?.substring(0, 60)}...</small></td>
                      <td>{c.category}</td>
                      <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                      <td>
                        <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
                          <button className="btn btn-sm btn-warning" onClick={() => updateComplaint(c._id, 'in-progress')}>In Progress</button>
                          <button className="btn btn-sm btn-success" onClick={() => updateComplaint(c._id, 'resolved')}>Resolve</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.complaints || data.complaints.length === 0) && <div className="empty-state"><div className="empty-icon">🧾</div><h3>No complaints</h3></div>}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {tab === 'appointments' && (
          <div className="card">
            <div className="card-header"><h2>All Appointments</h2></div>
            <div className="card-body table-container">
              <table>
                <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.appointments || []).map(a => (
                    <tr key={a._id}>
                      <td>{a.patientName}</td>
                      <td>{a.doctorName || a.doctorId}</td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td>{a.reason}</td>
                      <td><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.appointments || data.appointments.length === 0) && <div className="empty-state"><div className="empty-icon">📅</div><h3>No appointments</h3></div>}
            </div>
          </div>
        )}
      </div>

      {/* Add Medicine Modal */}
      {modal === 'addMedicine' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Medicine</h2><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Name</label><input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label>Category</label><input value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Antibiotic" /></div>
              <div className="form-group"><label>Price (₹)</label><input type="number" value={form.price || ''} onChange={e => setForm({...form, price: e.target.value})} /></div>
              <div className="form-group"><label>Stock</label><input type="number" value={form.stock || ''} onChange={e => setForm({...form, stock: e.target.value})} /></div>
              <div className="form-group"><label>Manufacturer</label><input value={form.manufacturer || ''} onChange={e => setForm({...form, manufacturer: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={addMedicine}>Add Medicine</button></div>
          </div>
        </div>
      )}

      {/* Add Ambulance Modal */}
      {modal === 'addAmbulance' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Ambulance</h2><button className="modal-close" onClick={() => setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Vehicle Number</label><input value={form.vehicleNumber || ''} onChange={e => setForm({...form, vehicleNumber: e.target.value})} /></div>
              <div className="form-group"><label>Driver Name</label><input value={form.driverName || ''} onChange={e => setForm({...form, driverName: e.target.value})} /></div>
              <div className="form-group"><label>Driver Phone</label><input value={form.driverPhone || ''} onChange={e => setForm({...form, driverPhone: e.target.value})} /></div>
              <div className="form-group"><label>Type</label>
                <select value={form.type || 'Basic'} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="Basic">Basic</option><option value="Advanced">Advanced</option><option value="ICU">ICU</option>
                </select>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={addAmbulance}>Add Ambulance</button></div>
          </div>
        </div>
      )}
    </>
  );
}
