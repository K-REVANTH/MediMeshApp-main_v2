const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  patientName: { type: String, default: '' },
  doctorId: { type: String, required: true },
  doctorName: { type: String, default: '' },
  bloodPressure: { type: String, default: '' },
  heartRate: { type: Number, default: 0 },
  temperature: { type: Number, default: 0 },
  oxygenLevel: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Vital', vitalSchema);
