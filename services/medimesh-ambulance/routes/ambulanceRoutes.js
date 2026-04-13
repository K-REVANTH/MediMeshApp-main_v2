const express = require('express');
const Ambulance = require('../models/Ambulance');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all ambulances (any authenticated user)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const ambulances = await Ambulance.find().sort({ status: 1, vehicleNumber: 1 });
    res.json(ambulances);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching ambulances', error: err.message });
  }
});

// Add ambulance (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const ambulance = new Ambulance(req.body);
    await ambulance.save();
    res.status(201).json(ambulance);
  } catch (err) {
    res.status(500).json({ message: 'Error adding ambulance', error: err.message });
  }
});

// Update ambulance status (admin only)
router.patch('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ambulance) return res.status(404).json({ message: 'Ambulance not found' });
    res.json(ambulance);
  } catch (err) {
    res.status(500).json({ message: 'Error updating ambulance', error: err.message });
  }
});

// Delete ambulance (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const ambulance = await Ambulance.findByIdAndDelete(req.params.id);
    if (!ambulance) return res.status(404).json({ message: 'Ambulance not found' });
    res.json({ message: 'Ambulance deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting ambulance', error: err.message });
  }
});

module.exports = router;
