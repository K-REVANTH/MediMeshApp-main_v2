const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'General' },
  manufacturer: { type: String, default: '' },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  expiryDate: { type: String, default: '' },
  description: { type: String, default: '' },
  requiresPrescription: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
