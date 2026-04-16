const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phq9Answers: {
    type: [Number],
    required: true,
    validate: {
      validator: (v) => v.length === 9 && v.every(n => n >= 0 && n <= 3),
      message: 'PHQ-9 must have 9 answers each between 0-3'
    }
  },
  gad7Answers: {
    type: [Number],
    required: true,
    validate: {
      validator: (v) => v.length === 7 && v.every(n => n >= 0 && n <= 3),
      message: 'GAD-7 must have 7 answers each between 0-3'
    }
  },
  phq9Score: {
    type: Number,
    required: true
  },
  gad7Score: {
    type: Number,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Moderate', 'High'],
    required: true
  },
  severity: {
    type: String
  },
  confidence: {
    type: Number
  },
  recommendations: [{
    title: String,
    description: String,
    type: { type: String },
    icon: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Assessment', assessmentSchema);
