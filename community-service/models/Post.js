const mongoose = require('mongoose');
require('./User'); // Register User schema for refs

const commentSchema = new mongoose.Schema({
  authorName: { type: String, default: 'Anonymous' }, // Simple reddit anonymity
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  authorName: { type: String, default: 'Anonymous' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, default: 'General Support' }, // e.g. 'Anxiety', 'Depression'
  upvotes: { type: Number, default: 0 },
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
