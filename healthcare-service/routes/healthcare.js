const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Simple static directory of therapists
const THERAPISTS = [
  {
    id: 't-001',
    name: 'Dr. Sarah Jenkins',
    credentials: 'Ph.D., Clinical Psychology',
    specialties: ['Anxiety', 'Depression', 'CBT'],
    experience: '12 years',
    image: '👩‍⚕️',
    availability: 'Next available: Tomorrow at 2:00 PM'
  },
  {
    id: 't-002',
    name: 'Michael Chen, LCSW',
    credentials: 'Licensed Clinical Social Worker',
    specialties: ['Stress Management', 'Workplace Anxiety'],
    experience: '8 years',
    image: '👨‍⚕️',
    availability: 'Next available: Thursday at 10:00 AM'
  },
  {
    id: 't-003',
    name: 'Dr. Emily Reyes',
    credentials: 'Psy.D.',
    specialties: ['Trauma', 'PTSD', 'EMDR'],
    experience: '15 years',
    image: '👩‍⚕️',
    availability: 'Next available: Wednesday at 4:30 PM'
  },
  {
    id: 't-004',
    name: 'James Wilson',
    credentials: 'Licensed Mental Health Counselor',
    specialties: ['Depression', 'Life Transitions'],
    experience: '5 years',
    image: '👨‍⚕️',
    availability: 'Next available: Monday at 9:00 AM'
  }
];

// GET /therapists
// Fetch directory of clinical therapists
router.get('/therapists', protect, (req, res) => {
  // Can add simple filtering if needed (e.g., req.query.specialty)
  const { specialty } = req.query;
  
  if (specialty) {
    const filtered = THERAPISTS.filter(t => t.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase())));
    return res.json(filtered);
  }
  
  res.json(THERAPISTS);
});

// POST /book
// Request an appointment (Simple mock version)
router.post('/book', protect, (req, res) => {
  const { therapistId, notes } = req.body;
  
  const therapist = THERAPISTS.find(t => t.id === therapistId);
  if (!therapist) {
    return res.status(404).json({ message: 'Therapist not found' });
  }
  
  // In a real system, insert into Calendar DB or email the clinic.
  console.log(`[HEALTHCARE] Booking requested by User ${req.user._id} for Therapist ${therapist.name}. Notes: ${notes || 'None'}`);
  
  res.status(201).json({
    message: 'Booking request sent successfully. The clinic will contact you shortly.',
    therapistName: therapist.name
  });
});

module.exports = router;
