const express = require('express');
const Vital = require('../models/Vital');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Create vitals (doctor only)
router.post('/', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { patientId, patientName, bloodPressure, heartRate, temperature, oxygenLevel, weight, notes } = req.body;
    const vital = new Vital({
      patientId, patientName,
      doctorId: req.user.userId,
      doctorName: req.user.fullName || req.user.username,
      bloodPressure, heartRate, temperature, oxygenLevel, weight, notes
    });
    await vital.save();
    res.status(201).json(vital);
  } catch (err) {
    res.status(500).json({ message: 'Error creating vitals', error: err.message });
  }
});

// Update vitals (doctor only)
router.put('/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const vital = await Vital.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vital) return res.status(404).json({ message: 'Vital record not found' });
    res.json(vital);
  } catch (err) {
    res.status(500).json({ message: 'Error updating vitals', error: err.message });
  }
});

// Get vitals for a patient (patient reads own, doctor reads any)
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'patient' && req.user.userId !== req.params.patientId) {
      return res.status(403).json({ message: 'Can only view your own vitals' });
    }
    const vitals = await Vital.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vitals', error: err.message });
  }
});

// Get all vitals (admin/doctor)
router.get('/', authenticateToken, authorizeRoles('admin', 'doctor'), async (req, res) => {
  try {
    const vitals = await Vital.find().sort({ createdAt: -1 });
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vitals', error: err.message });
  }
});

module.exports = router;
