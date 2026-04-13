const express = require('express');
const PatientProfile = require('../models/PatientProfile');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

const DOCTOR_SERVICE = process.env.DOCTOR_SERVICE_URL || 'http://localhost:5003';
const AMBULANCE_SERVICE = process.env.AMBULANCE_SERVICE_URL || 'http://localhost:5007';
const PHARMACY_SERVICE = process.env.PHARMACY_SERVICE_URL || 'http://localhost:5006';

// Get or create patient profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      profile = new PatientProfile({
        userId: req.user.userId,
        username: req.user.username,
        fullName: req.user.fullName || ''
      });
      await profile.save();
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

// Update patient profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { ...req.body, userId: req.user.userId, username: req.user.username },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
});

// View doctors list (proxy to doctor service)
router.get('/doctors', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DOCTOR_SERVICE}/api/doctors`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ message: 'Error fetching doctors', error: err.message });
  }
});

// View ambulance availability (proxy to ambulance service)
router.get('/ambulances', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${AMBULANCE_SERVICE}/api/ambulances`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ message: 'Error fetching ambulances', error: err.message });
  }
});

// View pharmacy stock (proxy to pharmacy service)
router.get('/pharmacy', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${PHARMACY_SERVICE}/api/pharmacy`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ message: 'Error fetching pharmacy', error: err.message });
  }
});

module.exports = router;
