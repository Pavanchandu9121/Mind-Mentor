const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

// GET /posts
// Fetch recent posts with optional category filter
router.get('/posts', protect, async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    
    const posts = await Post.find(query)
      .sort({ createdAt: -1 }) // newest first
      .limit(50); // Simple pagination/limit
      
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /posts
// Create a new community thread
router.post('/posts', protect, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    // Automatically defaulting authorName to 'Anonymous' per requirement
    const post = await Post.create({
      userId: req.user._id,
      title,
      content,
      category,
      authorName: 'Anonymous'
    });
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /posts/:id/comments
// Add a comment to a thread
router.post('/posts/:id/comments', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    post.comments.push({
      authorName: 'Anonymous', // Strict anonymity
      content
    });
    
    await post.save();
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /posts/:id/upvote
// Upvote a community thread
router.put('/posts/:id/upvote', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    post.upvotes += 1;
    await post.save();
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
