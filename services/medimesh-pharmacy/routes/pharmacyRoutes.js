const express = require('express');
const Medicine = require('../models/Medicine');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all medicines (any authenticated user)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching medicines', error: err.message });
  }
});

// Add medicine (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const medicine = new Medicine(req.body);
    await medicine.save();
    res.status(201).json(medicine);
  } catch (err) {
    res.status(500).json({ message: 'Error adding medicine', error: err.message });
  }
});

// Update medicine (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ message: 'Error updating medicine', error: err.message });
  }
});

// Delete medicine (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ message: 'Medicine deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting medicine', error: err.message });
  }
});

module.exports = router;
