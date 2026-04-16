const express = require('express');
const axios = require('axios');
const Assessment = require('../models/Assessment');
const { protect } = require('../middleware/auth');
const { getRecommendations } = require('./recommendations');

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// POST /api/assessments — submit new assessment
router.post('/', protect, async (req, res) => {
  try {
    const { phq9Answers, gad7Answers } = req.body;

    if (!phq9Answers || !gad7Answers) {
      return res.status(400).json({ message: 'Both PHQ-9 and GAD-7 answers are required' });
    }

    if (phq9Answers.length !== 9) {
      return res.status(400).json({ message: 'PHQ-9 must have exactly 9 answers' });
    }

    if (gad7Answers.length !== 7) {
      return res.status(400).json({ message: 'GAD-7 must have exactly 7 answers' });
    }

    // Calculate scores
    const phq9Score = phq9Answers.reduce((sum, val) => sum + val, 0);
    const gad7Score = gad7Answers.reduce((sum, val) => sum + val, 0);

    // Call AI prediction service
    let riskLevel = 'Low';
    let severity = 'Minimal';
    let confidence = 0.5;

    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, {
        phq9Score,
        gad7Score
      });
      riskLevel = aiResponse.data.riskLevel;
      severity = aiResponse.data.severity;
      confidence = aiResponse.data.confidence;
    } catch (aiError) {
      // Fallback: rule-based classification if AI service is down
      console.log('AI service unavailable, using fallback classification');
      const totalScore = phq9Score + gad7Score;
      if (totalScore <= 10) {
        riskLevel = 'Low';
        severity = 'Minimal to Mild';
      } else if (totalScore <= 25) {
        riskLevel = 'Moderate';
        severity = 'Moderate';
      } else {
        riskLevel = 'High';
        severity = 'Moderately Severe to Severe';
      }
      confidence = 0.7;
    }

    // Get recommendations
    const recommendations = getRecommendations(riskLevel);

    const assessment = await Assessment.create({
      user: req.user._id,
      phq9Answers,
      gad7Answers,
      phq9Score,
      gad7Score,
      riskLevel,
      severity,
      confidence,
      recommendations
    });

    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/assessments — get user's history
router.get('/', protect, async (req, res) => {
  try {
    const assessments = await Assessment.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/assessments/:id — single assessment
router.get('/:id', protect, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
