const express = require('express');
const Doctor = require('../models/Doctor');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all doctors (public for authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching doctors', error: err.message });
  }
});

// Get doctor by userId
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.params.userId });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching doctor', error: err.message });
  }
});

// Register / update doctor profile (doctor only)
router.post('/profile', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { specialization, experience, phone, email, consultationFee } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { userId: req.user.userId },
      {
        userId: req.user.userId,
        username: req.user.username,
        fullName: req.user.fullName || req.user.username,
        specialization, experience, phone, email, consultationFee
      },
      { new: true, upsert: true }
    );
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: 'Error updating doctor profile', error: err.message });
  }
});

// Toggle availability
router.patch('/availability', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.userId });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
    doctor.available = !doctor.available;
    await doctor.save();
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: 'Error toggling availability', error: err.message });
  }
});

module.exports = router;
