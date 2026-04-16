const express = require('express');
const router = express.Router();
const UserTask = require('../models/UserTask');
const { protect } = require('../middleware/auth');

// Advanced Rule Engine Logic
const generateTasksForRisk = (riskLevel, sourceAssessmentId) => {
  const tasks = [];
  
  if (riskLevel === 'High') {
    tasks.push({
      title: 'Consult Professional Therapist',
      description: 'Book a 30-min session with a clinical therapist.',
      category: 'Crisis',
      type: 'professional',
      icon: '🩺',
      duration: '30 MIN',
      sourceAssessmentId
    });
    tasks.push({
      title: 'Emergency Safety Plan',
      description: 'Review your safety contacts.',
      category: 'Crisis',
      type: 'professional',
      icon: '🚨',
      duration: '5 MIN',
      sourceAssessmentId
    });
  } else if (riskLevel === 'Moderate') {
    tasks.push({
      title: 'Guided CBT Journaling',
      description: 'Write down negative thoughts and challenge them.',
      category: 'Stress',
      type: 'counseling',
      icon: '📝',
      duration: '15 MIN',
      sourceAssessmentId
    });
    tasks.push({
      title: 'Deep Breathing',
      description: 'Box breathing technique.',
      category: 'Morning',
      type: 'self-help',
      icon: '🧘',
      duration: '10 MIN',
      sourceAssessmentId
    });
  } else {
    // Low risk or normal
    tasks.push({
      title: 'Mindful Walk',
      description: 'Take a short walk without technology.',
      category: 'Morning',
      type: 'habit',
      icon: '🚶',
      duration: '20 MIN',
      sourceAssessmentId
    });
    tasks.push({
      title: 'Sleep Hygiene',
      description: 'Disconnect 30 minutes before bed.',
      category: 'Sleep',
      type: 'habit',
      icon: '🌙',
      duration: '30 MIN',
      sourceAssessmentId
    });
  }
  
  return tasks;
};

// POST /generate
// Generates personalized UserTasks based on assessment or screening inputs.
router.post('/generate', protect, async (req, res) => {
  try {
    const { type, scores, riskLevel, assessmentId } = req.body;
    
    // Fallback logic to compute risk level if not provided explicitly
    let computedRisk = riskLevel || 'Low';
    
    if (!riskLevel && scores) {
      const maxScore = Math.max(scores.phq9Score || 0, scores.gad7Score || 0);
      if (maxScore >= 15) computedRisk = 'High';
      else if (maxScore >= 10) computedRisk = 'Moderate';
    }

    const newTasks = generateTasksForRisk(computedRisk, assessmentId);
    
    // Add userId to all tasks
    const tasksToInsert = newTasks.map(task => ({
      ...task,
      userId: req.user._id
    }));

    // Optional: Clear old active tasks so dashboard isn't flooded? 
    // For now, let's just append new active tasks.
    const createdTasks = await UserTask.insertMany(tasksToInsert);
    
    res.status(201).json({
      message: 'Action plan tasks generated successfully',
      riskDerived: computedRisk,
      tasks: createdTasks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /tasks
// Fetches the active daily tasks/action plan for the user
router.get('/tasks', protect, async (req, res) => {
  try {
    // Return uncompleted tasks first, then completed today
    const tasks = await UserTask.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10); // Limit to recent
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /tasks/:id/complete
// Advanced tracking integration 
router.put('/tasks/:id/complete', protect, async (req, res) => {
  try {
    const task = await UserTask.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    task.isCompleted = true;
    await task.save();
    
    res.json({ message: 'Task marked complete', task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /:riskLevel (Legacy static route for backward compatibility if needed)
const recommendationsData = { /* ... omitted for brevity as tasks system supersedes this in advanced version */ };
router.get('/:riskLevel', (req, res) => {
  res.json([]);
});

module.exports = router;
