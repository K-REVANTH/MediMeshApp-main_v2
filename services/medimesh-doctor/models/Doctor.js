const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  specialization: { type: String, default: 'General Medicine' },
  experience: { type: Number, default: 0 },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  available: { type: Boolean, default: true },
  consultationFee: { type: Number, default: 500 }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
