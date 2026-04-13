const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, authorizeRoles, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register (patient or doctor only — NO admin registration)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, fullName, email, phone } = req.body;
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin registration is not allowed' });
    }
    if (!['doctor', 'patient'].includes(role)) {
      return res.status(400).json({ message: 'Role must be doctor or patient' });
    }
    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ message: 'Username already exists' });

    const user = new User({ username, password, role, fullName, email, phone });
    await user.save();
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user._id, username: user.username, role: user.role, fullName: user.fullName } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// Validate token (used by other services)
router.get('/validate', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;
