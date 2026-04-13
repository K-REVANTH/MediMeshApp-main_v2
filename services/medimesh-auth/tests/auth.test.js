/**
 * MediMesh Auth Service — Unit Tests
 * Tests: Health check, Registration, Login, Token validation, RBAC
 */

const jwt = require('jsonwebtoken');

// ─── Mock Mongoose BEFORE requiring any modules ─────────────
const mockUserData = {
  _id: 'user-id-123',
  username: 'testuser',
  password: '$2a$10$hashedpassword',
  role: 'patient',
  fullName: 'Test User',
  email: 'test@medimesh.com',
  phone: '1234567890',
  save: jest.fn().mockResolvedValue(true),
  comparePassword: jest.fn().mockResolvedValue(true),
};

const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
};

// Mock User constructor
function MockUser(data) {
  return { ...data, ...mockUserData, save: mockUserData.save };
}
MockUser.findOne = mockUserModel.findOne;
MockUser.findById = mockUserModel.findById;
MockUser.find = mockUserModel.find;

jest.mock('../models/User', () => MockUser);

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  connection: { readyState: 1 },
  Schema: jest.fn().mockReturnValue({}),
  model: jest.fn().mockReturnValue(MockUser),
}));

// ─── Setup Express App for Testing ──────────────────────────
const express = require('express');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'medimesh-auth' }));

const JWT_SECRET = process.env.JWT_SECRET || 'medimesh-secret-key';

// ═══════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════

describe('MediMesh Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Health Check ──────────────────────────────────────────
  describe('GET /health', () => {
    it('should return status ok', async () => {
      const request = require('supertest');
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'medimesh-auth');
    });
  });

  // ─── Registration ─────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new patient user', async () => {
      const request = require('supertest');
      mockUserModel.findOne.mockResolvedValue(null); // No existing user

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newpatient',
          password: 'securePass123',
          role: 'patient',
          fullName: 'New Patient',
          email: 'patient@medimesh.com',
          phone: '9876543210',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully');
    });

    it('should reject admin registration', async () => {
      const request = require('supertest');
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'sneakyadmin',
          password: 'hackpass',
          role: 'admin',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Admin registration is not allowed');
    });

    it('should reject invalid role', async () => {
      const request = require('supertest');
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'invalid',
          password: 'pass',
          role: 'superuser',
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject duplicate username', async () => {
      const request = require('supertest');
      mockUserModel.findOne.mockResolvedValue(mockUserData); // User exists

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'pass',
          role: 'patient',
        });

      expect(res.statusCode).toBe(409);
    });
  });

  // ─── Login ────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return token', async () => {
      const request = require('supertest');
      mockUserModel.findOne.mockResolvedValue(mockUserData);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'correctpassword' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', 'testuser');
    });

    it('should reject invalid username', async () => {
      const request = require('supertest');
      mockUserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'pass' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject wrong password', async () => {
      const request = require('supertest');
      const wrongPassUser = { ...mockUserData, comparePassword: jest.fn().mockResolvedValue(false) };
      mockUserModel.findOne.mockResolvedValue(wrongPassUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── Token validation ─────────────────────────────────────
  describe('GET /api/auth/validate', () => {
    it('should validate a correct token', async () => {
      const request = require('supertest');
      const token = jwt.sign(
        { userId: 'user-id-123', username: 'testuser', role: 'patient' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('valid', true);
    });

    it('should reject request without token', async () => {
      const request = require('supertest');
      const res = await request(app).get('/api/auth/validate');
      expect(res.statusCode).toBe(401);
    });

    it('should reject an invalid token', async () => {
      const request = require('supertest');
      const res = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── Get current user (GET /me) ───────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const request = require('supertest');
      const selectMock = jest.fn().mockResolvedValue({
        _id: 'user-id-123',
        username: 'testuser',
        role: 'patient',
        fullName: 'Test User',
      });
      mockUserModel.findById.mockReturnValue({ select: selectMock });

      const token = jwt.sign(
        { userId: 'user-id-123', username: 'testuser', role: 'patient' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('username', 'testuser');
    });
  });

  // ─── RBAC: Admin-only users list ──────────────────────────
  describe('GET /api/auth/users (Admin Only)', () => {
    it('should allow admin to list all users', async () => {
      const request = require('supertest');
      const selectMock = jest.fn().mockResolvedValue([mockUserData]);
      mockUserModel.find.mockReturnValue({ select: selectMock });

      const token = jwt.sign(
        { userId: 'admin-id', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });

    it('should deny non-admin access to user list', async () => {
      const request = require('supertest');
      const token = jwt.sign(
        { userId: 'user-id', username: 'patient1', role: 'patient' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });
  });
});

// ─── Middleware Unit Tests ───────────────────────────────────
describe('Auth Middleware', () => {
  const { authenticateToken, authorizeRoles } = require('../middleware/auth');

  it('authenticateToken should call next() with valid token', () => {
    const token = jwt.sign({ userId: '123', role: 'patient' }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authenticateToken(req, res, next);

    // jwt.verify is async via callback, give it a tick
    setTimeout(() => {
      expect(next).toHaveBeenCalled();
    }, 10);
  });

  it('authenticateToken should return 401 without token', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authorizeRoles should allow matching role', () => {
    const middleware = authorizeRoles('admin', 'doctor');
    const req = { user: { role: 'admin' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('authorizeRoles should deny non-matching role', () => {
    const middleware = authorizeRoles('admin');
    const req = { user: { role: 'patient' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
