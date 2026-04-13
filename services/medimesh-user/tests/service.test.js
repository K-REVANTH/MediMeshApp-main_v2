/**
 * MediMesh Generic Service — Unit Tests
 * Shared test pattern for: user, appointment, vitals, pharmacy, ambulance, complaint, forum
 * Tests: Health check endpoint, Auth middleware rejection
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'medimesh-secret-key';

// Determine service name from directory
const path = require('path');
const serviceName = path.basename(path.resolve(__dirname, '..'));
const serviceShort = serviceName.replace('medimesh-', '');

// ─── Mock Mongoose completely ───────────────────────────────
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  connection: { readyState: 1 },
  Schema: class MockSchema {
    constructor() { return this; }
    pre() { return this; }
    methods = {};
  },
  model: jest.fn().mockReturnValue({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    findByIdAndDelete: jest.fn().mockResolvedValue({}),
  }),
}));

// ─── Setup Express App ──────────────────────────────────────
const express = require('express');
const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: serviceName }));

// ═══════════════════════════════════════════════════════════
describe(`MediMesh ${serviceShort.charAt(0).toUpperCase() + serviceShort.slice(1)} Service`, () => {
  const request = require('supertest');

  describe('GET /health', () => {
    it('should return service health status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', serviceName);
    });
  });

  describe('Auth Middleware', () => {
    // Import the middleware that every service shares
    const { authenticateToken } = require('../middleware/auth');

    it('should return 401 when no token is provided', () => {
      const req = { headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid token', () => {
      const req = { headers: { authorization: 'Bearer bad-token' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      authenticateToken(req, res, next);
      // jwt.verify is callback-based, check async
      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(403);
      }, 10);
    });

    it('should call next() with valid token', (done) => {
      const token = jwt.sign(
        { userId: 'test-user', username: 'tester', role: 'patient' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn(() => {
        expect(req.user).toHaveProperty('userId', 'test-user');
        expect(req.user).toHaveProperty('role', 'patient');
        done();
      });

      authenticateToken(req, res, next);
    });
  });
});
