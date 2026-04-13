require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5010;

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:5002',
  doctor: process.env.DOCTOR_SERVICE_URL || 'http://localhost:5003',
  appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:5004',
  vitals: process.env.VITALS_SERVICE_URL || 'http://localhost:5005',
  pharmacy: process.env.PHARMACY_SERVICE_URL || 'http://localhost:5006',
  ambulance: process.env.AMBULANCE_SERVICE_URL || 'http://localhost:5007',
  complaint: process.env.COMPLAINT_SERVICE_URL || 'http://localhost:5008',
  forum: process.env.FORUM_SERVICE_URL || 'http://localhost:5009'
};

app.use(cors());
app.use(express.json());

// Helper: forward request with auth header
async function forwardRequest(serviceUrl, path, method, headers, data) {
  const config = {
    method,
    url: `${serviceUrl}${path}`,
    headers: {
      Authorization: headers.authorization || '',
      'Content-Type': 'application/json'
    }
  };
  if (data !== undefined) config.data = data;
  const response = await axios(config);
  return response.data;
}

// ─── AUTH ROUTES ────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.auth, '/api/auth/login', 'POST', {}, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.auth, '/api/auth/register', 'POST', {}, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.auth, '/api/auth/me', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.get('/api/auth/users', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.auth, '/api/auth/users', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// ─── DOCTOR ROUTES ──────────────────────────────────────
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.doctor, '/api/doctors', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.post('/api/doctors/profile', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.doctor, '/api/doctors/profile', 'POST', req.headers, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.patch('/api/doctors/availability', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.doctor, '/api/doctors/availability', 'PATCH', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// ─── APPOINTMENT ROUTES ─────────────────────────────────
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.appointment, '/api/appointments', 'POST', req.headers, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.get('/api/appointments/my', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.appointment, '/api/appointments/my', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.appointment, '/api/appointments', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.patch('/api/appointments/:id/status', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.appointment, `/api/appointments/${req.params.id}/status`, 'PATCH', req.headers, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// ─── VITALS ROUTES ──────────────────────────────────────
app.post('/api/vitals', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.vitals, '/api/vitals', 'POST', req.headers, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.get('/api/vitals', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.vitals, '/api/vitals', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.get('/api/vitals/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.vitals, `/api/vitals/patient/${req.params.patientId}`, 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.put('/api/vitals/:id', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.vitals, `/api/vitals/${req.params.id}`, 'PUT', req.headers, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// ─── PHARMACY ROUTES ────────────────────────────────────
app.get('/api/pharmacy', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.pharmacy, '/api/pharmacy', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.post('/api/pharmacy', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.pharmacy, '/api/pharmacy', 'POST', req.headers, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.put('/api/pharmacy/:id', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.pharmacy, `/api/pharmacy/${req.params.id}`, 'PUT', req.headers, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.delete('/api/pharmacy/:id', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.pharmacy, `/api/pharmacy/${req.params.id}`, 'DELETE', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// ─── AMBULANCE ROUTES ───────────────────────────────────
app.get('/api/ambulances', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.ambulance, '/api/ambulances', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.post('/api/ambulances', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.ambulance, '/api/ambulances', 'POST', req.headers, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.patch('/api/ambulances/:id', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.ambulance, `/api/ambulances/${req.params.id}`, 'PATCH', req.headers, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.delete('/api/ambulances/:id', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.ambulance, `/api/ambulances/${req.params.id}`, 'DELETE', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// ─── COMPLAINT ROUTES ───────────────────────────────────
app.post('/api/complaints', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.complaint, '/api/complaints', 'POST', req.headers, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.get('/api/complaints/my', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.complaint, '/api/complaints/my', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.get('/api/complaints', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.complaint, '/api/complaints', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.patch('/api/complaints/:id', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.complaint, `/api/complaints/${req.params.id}`, 'PATCH', req.headers, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// ─── FORUM ROUTES ───────────────────────────────────────
app.get('/api/forum', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.forum, '/api/forum', 'GET', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.post('/api/forum', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.forum, '/api/forum', 'POST', req.headers, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.patch('/api/forum/:id/like', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.forum, `/api/forum/${req.params.id}/like`, 'PATCH', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

app.delete('/api/forum/:id', authenticateToken, async (req, res) => {
  try {
    const data = await forwardRequest(SERVICES.forum, `/api/forum/${req.params.id}`, 'DELETE', req.headers);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// ─── DASHBOARD AGGREGATION ──────────────────────────────
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const headers = req.headers;
    const role = req.user.role;
    const result = { role };

    if (role === 'admin') {
      const [doctors, appointments, medicines, ambulances, complaints] = await Promise.allSettled([
        forwardRequest(SERVICES.doctor, '/api/doctors', 'GET', headers),
        forwardRequest(SERVICES.appointment, '/api/appointments', 'GET', headers),
        forwardRequest(SERVICES.pharmacy, '/api/pharmacy', 'GET', headers),
        forwardRequest(SERVICES.ambulance, '/api/ambulances', 'GET', headers),
        forwardRequest(SERVICES.complaint, '/api/complaints', 'GET', headers)
      ]);
      result.doctors = doctors.status === 'fulfilled' ? doctors.value : [];
      result.appointments = appointments.status === 'fulfilled' ? appointments.value : [];
      result.medicines = medicines.status === 'fulfilled' ? medicines.value : [];
      result.ambulances = ambulances.status === 'fulfilled' ? ambulances.value : [];
      result.complaints = complaints.status === 'fulfilled' ? complaints.value : [];
    } else if (role === 'doctor') {
      const [appointments, vitals] = await Promise.allSettled([
        forwardRequest(SERVICES.appointment, '/api/appointments/my', 'GET', headers),
        forwardRequest(SERVICES.vitals, '/api/vitals', 'GET', headers)
      ]);
      result.appointments = appointments.status === 'fulfilled' ? appointments.value : [];
      result.vitals = vitals.status === 'fulfilled' ? vitals.value : [];
    } else {
      const [appointments, doctors, ambulances, medicines] = await Promise.allSettled([
        forwardRequest(SERVICES.appointment, '/api/appointments/my', 'GET', headers),
        forwardRequest(SERVICES.doctor, '/api/doctors', 'GET', headers),
        forwardRequest(SERVICES.ambulance, '/api/ambulances', 'GET', headers),
        forwardRequest(SERVICES.pharmacy, '/api/pharmacy', 'GET', headers)
      ]);
      result.appointments = appointments.status === 'fulfilled' ? appointments.value : [];
      result.doctors = doctors.status === 'fulfilled' ? doctors.value : [];
      result.ambulances = ambulances.status === 'fulfilled' ? ambulances.value : [];
      result.medicines = medicines.status === 'fulfilled' ? medicines.value : [];
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Dashboard aggregation failed', error: err.message });
  }
});

// ─── HEALTH CHECK ───────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'medimesh-bff' }));

app.listen(PORT, () => console.log(`📊 medimesh-bff running on port ${PORT}`));
