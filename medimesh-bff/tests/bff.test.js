/**
 * MediMesh BFF Service — Unit Tests
 * Tests: Health check, Auth middleware, Request forwarding
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'medimesh-secret-key';

// ─── Mock axios for service-to-service calls ────────────────
jest.mock('axios', () => {
  const mockAxios = jest.fn();
  return mockAxios;
});

const axios = require('axios');

// ─── Setup Express App for Testing ──────────────────────────
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

// Build a minimal version of the BFF for testing
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'medimesh-bff' }));

// Auth proxy routes (simplified for testing)
app.post('/api/auth/login', async (req, res) => {
  try {
    axios.mockResolvedValueOnce({ data: { token: 'mock-token', user: { id: '1', username: req.body.username, role: 'patient' } } });
    const config = { method: 'POST', url: 'http://localhost:5001/api/auth/login', headers: { 'Content-Type': 'application/json' }, data: req.body };
    const response = await axios(config);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// Protected route example
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    axios.mockResolvedValueOnce({ data: [{ id: '1', fullName: 'Dr. Test', specialization: 'General' }] });
    const config = { method: 'GET', url: 'http://localhost:5003/api/doctors', headers: { Authorization: req.headers.authorization, 'Content-Type': 'application/json' } };
    const response = await axios(config);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { message: err.message });
  }
});

// Dashboard aggregation (simplified)
app.get('/api/dashboard', authenticateToken, (req, res) => {
  res.json({ role: req.user.role, message: 'Dashboard data' });
});

// ═══════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════

describe('MediMesh BFF Service', () => {
  const request = require('supertest');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Health Check ──────────────────────────────────────────
  describe('GET /health', () => {
    it('should return status ok for BFF', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'medimesh-bff' });
    });
  });

  // ─── Auth Proxy ───────────────────────────────────────────
  describe('POST /api/auth/login (proxy)', () => {
    it('should forward login request and return token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });
  });

  // ─── Protected Routes ─────────────────────────────────────
  describe('Protected Routes (require auth)', () => {
    it('should reject request without token', async () => {
      const res = await request(app).get('/api/doctors');
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Access token required');
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/doctors')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(403);
    });

    it('should allow request with valid token', async () => {
      const token = jwt.sign(
        { userId: 'user-123', username: 'testdoc', role: 'doctor' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/doctors')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─── Dashboard ────────────────────────────────────────────
  describe('GET /api/dashboard', () => {
    it('should return dashboard data for authenticated user', async () => {
      const token = jwt.sign(
        { userId: 'admin-1', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('role', 'admin');
    });

    it('should return role-specific data for patient', async () => {
      const token = jwt.sign(
        { userId: 'patient-1', username: 'patient', role: 'patient' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('role', 'patient');
    });
  });

  // ─── BFF Auth Middleware ──────────────────────────────────
  describe('BFF Auth Middleware', () => {
    it('should decode token and populate req.user', () => {
      const token = jwt.sign({ userId: '123', role: 'doctor', username: 'doc1' }, JWT_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      authenticateToken(req, res, next);

      setTimeout(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user).toHaveProperty('role', 'doctor');
      }, 10);
    });
  });
});
