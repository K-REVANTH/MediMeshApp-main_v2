const express = require('express');
const Appointment = require('../models/Appointment');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Create appointment (patient)
router.post('/', authenticateToken, authorizeRoles('patient'), async (req, res) => {
  try {
    const { doctorId, doctorName, date, time, reason } = req.body;
    const appointment = new Appointment({
      patientId: req.user.userId,
      patientName: req.user.fullName || req.user.username,
      doctorId, doctorName, date, time, reason
    });
    await appointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Error creating appointment', error: err.message });
  }
});

// Get appointments for current user
router.get('/my', authenticateToken, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'patient') filter.patientId = req.user.userId;
    else if (req.user.role === 'doctor') filter.doctorId = req.user.username;
    else if (req.user.role === 'admin') filter = {};
    const appointments = await Appointment.find(filter).sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching appointments', error: err.message });
  }
});

// Get all appointments (admin)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching appointments', error: err.message });
  }
});

// Update appointment status (doctor)
router.patch('/:id/status', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Error updating appointment', error: err.message });
  }
});

module.exports = router;
