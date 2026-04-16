const mongoose = require('mongoose');
require('./User');

const userTaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['self-help', 'counseling', 'professional', 'habit', 'assessment'], default: 'self-help' },
  icon: { type: String, default: '🧠' },
  category: { type: String, default: 'General' }, // e.g. 'Sleep', 'Morning', 'Stress'
  duration: { type: String }, // e.g. '10 MIN', '30 MIN'
  isCompleted: { type: Boolean, default: false },
  sourceAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' }, // Context of generation
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } // Optional for daily tasks that expire
});

module.exports = mongoose.model('UserTask', userTaskSchema);
