const express = require('express');
const Post = require('../models/Post');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all posts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching posts', error: err.message });
  }
});

// Create post (any authenticated user)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const post = new Post({
      authorId: req.user.userId,
      authorName: req.user.fullName || req.user.username,
      authorRole: req.user.role,
      title, content, tags
    });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Error creating post', error: err.message });
  }
});

// Like a post
router.patch('/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Error liking post', error: err.message });
  }
});

// Delete post (own or admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.authorId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Cannot delete others\' posts' });
    }
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting post', error: err.message });
  }
});

module.exports = router;
