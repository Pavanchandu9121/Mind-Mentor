const mongoose = require('mongoose');
require('./User');

const moodLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  moodScore: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 // 1=Awful, 2=Bad, 3=Okay, 4=Good, 5=Great
  },
  habits: [{ 
    type: String 
  }],
  journalEntry: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('MoodLog', moodLogSchema);
