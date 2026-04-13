/**
 * MediMesh Doctor Service — Unit Tests
 * Tests: Health check, CRUD operations, Auth middleware
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'medimesh-secret-key';

// ─── Mock Mongoose ──────────────────────────────────────────
const mockDoctor = {
  _id: 'doc-id-1',
  userId: 'user-id-1',
  username: 'doctor1',
  fullName: 'Dr. Test',
  specialization: 'General Medicine',
  experience: 5,
  available: true,
  consultationFee: 500,
  save: jest.fn().mockResolvedValue(true),
};

const mockDoctorModel = {
  find: jest.fn().mockResolvedValue([mockDoctor]),
  findOne: jest.fn().mockResolvedValue(mockDoctor),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockDoctor),
};

function MockDoctor(data) {
  return { ...data, ...mockDoctor };
}
Object.assign(MockDoctor, mockDoctorModel);

jest.mock('../models/Doctor', () => MockDoctor);
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  connection: { readyState: 1 },
  Schema: jest.fn().mockReturnValue({}),
  model: jest.fn().mockReturnValue(MockDoctor),
}));

// ─── Setup Express App ──────────────────────────────────────
const express = require('express');
const doctorRoutes = require('../routes/doctorRoutes');

const app = express();
app.use(express.json());
app.use('/api/doctors', doctorRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'medimesh-doctor' }));

// ═══════════════════════════════════════════════════════════
describe('MediMesh Doctor Service', () => {
  const request = require('supertest');

  beforeEach(() => jest.clearAllMocks());

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.service).toBe('medimesh-doctor');
    });
  });

  describe('GET /api/doctors', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/doctors');
      expect(res.statusCode).toBe(401);
    });

    it('should return doctors list with valid token', async () => {
      const token = jwt.sign({ userId: '1', username: 'user1', role: 'patient' }, JWT_SECRET);
      const res = await request(app)
        .get('/api/doctors')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/doctors/profile', () => {
    it('should allow doctors to update profile', async () => {
      const token = jwt.sign({ userId: 'doc-1', username: 'doc1', role: 'doctor', fullName: 'Dr. Test' }, JWT_SECRET);
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ specialization: 'Cardiology', experience: 10, consultationFee: 1000 });
      expect(res.statusCode).toBe(200);
    });

    it('should deny patients from updating doctor profile', async () => {
      const token = jwt.sign({ userId: 'p-1', username: 'pat1', role: 'patient' }, JWT_SECRET);
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ specialization: 'Hacking' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/doctors/availability', () => {
    it('should toggle doctor availability', async () => {
      const token = jwt.sign({ userId: 'user-id-1', username: 'doc1', role: 'doctor' }, JWT_SECRET);
      const res = await request(app)
        .patch('/api/doctors/availability')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
