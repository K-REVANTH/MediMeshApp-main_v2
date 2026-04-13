const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true, unique: true },
  driverName: { type: String, required: true },
  driverPhone: { type: String, default: '' },
  status: { type: String, enum: ['available', 'busy'], default: 'available' },
  location: { type: String, default: '' },
  type: { type: String, enum: ['Basic', 'Advanced', 'ICU'], default: 'Basic' }
}, { timestamps: true });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
