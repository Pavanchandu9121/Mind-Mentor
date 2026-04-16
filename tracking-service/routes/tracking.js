const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const MoodLog = require('../models/MoodLog');
const UserStats = require('../models/UserStats');

// GET /mood
// Fetch user's mood logs for the past 30 days
router.get('/mood', protect, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await MoodLog.find({ 
      userId: req.user._id,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /mood
// Save a daily mood/journal, update streak and award badges
router.post('/mood', protect, async (req, res) => {
  try {
    const { moodScore, habits, journalEntry } = req.body;

    // 1. Save Mood Log
    const log = await MoodLog.create({
      userId: req.user._id,
      moodScore,
      habits,
      journalEntry
    });

    // 2. Fetch or Create Gamification Stats
    let stats = await UserStats.findOne({ userId: req.user._id });
    if (!stats) {
      stats = new UserStats({ userId: req.user._id });
    }

    const today = new Date();
    const lastCheckIn = stats.lastCheckInDate;

    // Remove time portions for streak calculations
    const todayStr = today.toISOString().split('T')[0];
    const lastStr = lastCheckIn ? lastCheckIn.toISOString().split('T')[0] : null;

    let newBadge = null;

    if (!lastStr) {
      // First check-in ever!
      stats.currentStreak = 1;
      stats.longestStreak = 1;
      // Award "First Step" Badge
      stats.badges.push({ name: 'First Step', icon: '🌱' });
      newBadge = 'First Step 🌱';
    } else if (todayStr !== lastStr) {
      // Calculate day difference
      const msPerDay = 1000 * 60 * 60 * 24;
      const t1 = new Date(todayStr).getTime();
      const t2 = new Date(lastStr).getTime();
      const diffDays = Math.floor((t1 - t2) / msPerDay);

      if (diffDays === 1) {
        // Continuous streak
        stats.currentStreak += 1;
        if (stats.currentStreak > stats.longestStreak) {
          stats.longestStreak = stats.currentStreak;
        }

        // Award Badges for Streaks
        if (stats.currentStreak === 3 && !stats.badges.some(b => b.name === '3-Day Streak')) {
          stats.badges.push({ name: '3-Day Streak', icon: '🔥' });
          newBadge = '3-Day Streak 🔥';
        } else if (stats.currentStreak === 7 && !stats.badges.some(b => b.name === 'Mindfulness Master')) {
          stats.badges.push({ name: 'Mindfulness Master', icon: '👑' });
          newBadge = 'Mindfulness Master 👑';
        }

      } else {
        // Streak broken
        stats.currentStreak = 1;
      }
    }

    stats.lastCheckInDate = today;
    await stats.save();

    res.status(201).json({ 
      log, 
      stats,
      newBadgeAwarded: newBadge
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /stats
// Fetch user's gamification stats (streak, badges)
router.get('/stats', protect, async (req, res) => {
  try {
    let stats = await UserStats.findOne({ userId: req.user._id });
    if (!stats) {
      // Return empty format instead of 404
      return res.json({ currentStreak: 0, longestStreak: 0, badges: [] });
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
