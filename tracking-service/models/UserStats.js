const mongoose = require('mongoose');
require('./User');

const userStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true
  },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastCheckInDate: { type: Date },
  badges: [
    {
      name: { type: String, required: true },
      icon: { type: String, required: true },
      earnedAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('UserStats', userStatsSchema);
