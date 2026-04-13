const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, default: '' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: [{ type: String }],
  likes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
