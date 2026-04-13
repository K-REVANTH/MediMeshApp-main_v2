const express = require('express');
const Complaint = require('../models/Complaint');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Create complaint (any authenticated user)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subject, description, category } = req.body;
    const complaint = new Complaint({
      userId: req.user.userId,
      username: req.user.username,
      subject, description, category
    });
    await complaint.save();
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Error creating complaint', error: err.message });
  }
});

// Get my complaints (own complaints)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching complaints', error: err.message });
  }
});

// Get all complaints (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching complaints', error: err.message });
  }
});

// Update complaint status (admin only)
router.patch('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Error updating complaint', error: err.message });
  }
});

module.exports = router;
