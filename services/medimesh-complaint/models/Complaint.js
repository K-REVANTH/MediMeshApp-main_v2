const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Service', 'Staff', 'Facility', 'Billing', 'Other'], default: 'Other' },
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  adminNotes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
