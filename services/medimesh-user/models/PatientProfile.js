const mongoose = require('mongoose');

const patientProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  fullName: { type: String, default: '' },
  age: { type: Number, default: 0 },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  bloodGroup: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  emergencyContact: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('PatientProfile', patientProfileSchema);
