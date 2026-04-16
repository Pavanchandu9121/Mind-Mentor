const recommendationsData = {
  Low: [
    { title: 'Mindfulness Meditation', description: 'Practice daily mindfulness exercises for 10-15 minutes to maintain your mental well-being.', type: 'self-help', icon: '🧘' },
    { title: 'Regular Exercise', description: 'Engage in physical activity for at least 30 minutes a day to boost your mood naturally.', type: 'self-help', icon: '🏃' },
    { title: 'Sleep Hygiene', description: 'Maintain a consistent sleep schedule of 7-9 hours per night for optimal mental health.', type: 'self-help', icon: '😴' },
    { title: 'Journaling', description: 'Write down your thoughts and feelings daily to process emotions and track patterns.', type: 'self-help', icon: '📝' },
    { title: 'Social Connection', description: 'Stay connected with friends and family. Regular social interaction supports mental wellness.', type: 'self-help', icon: '👥' }
  ],
  Moderate: [
    { title: 'Online Counseling', description: 'Consider speaking with a licensed therapist through platforms like BetterHelp or Talkspace.', type: 'counseling', icon: '💬' },
    { title: 'Support Groups', description: 'Join a mental health support group to connect with others facing similar challenges.', type: 'counseling', icon: '🤝' },
    { title: 'Cognitive Behavioral Techniques', description: 'Practice CBT techniques like thought challenging and behavioral activation exercises.', type: 'self-help', icon: '🧠' },
    { title: 'Stress Management Workshop', description: 'Attend stress management workshops or access online resources for coping strategies.', type: 'counseling', icon: '📚' },
    { title: 'Regular Check-ins', description: 'Schedule regular mental health check-ins with a counselor or trusted advisor.', type: 'counseling', icon: '📋' },
    { title: 'Relaxation Techniques', description: 'Practice progressive muscle relaxation, deep breathing, or guided imagery daily.', type: 'self-help', icon: '🌿' }
  ],
  High: [
    { title: 'Professional Therapy', description: 'Seek immediate help from a licensed mental health professional for personalized treatment.', type: 'professional', icon: '🩺' },
    { title: 'Crisis Helpline', description: 'If you are in crisis, call 988 Suicide & Crisis Lifeline or text HOME to 741741.', type: 'professional', icon: '📞' },
    { title: 'Psychiatric Evaluation', description: 'Schedule an appointment with a psychiatrist for thorough evaluation and possible medication.', type: 'professional', icon: '⚕️' },
    { title: 'Emergency Services', description: 'If you or someone is in immediate danger, call 911 or go to the nearest emergency room.', type: 'professional', icon: '🚨' },
    { title: 'Safety Planning', description: 'Create a personal safety plan with a professional, including emergency contacts and coping strategies.', type: 'professional', icon: '🛡️' },
    { title: 'Trusted Support Network', description: 'Reach out to trusted friends, family, or mentors who can provide emotional support.', type: 'counseling', icon: '❤️' }
  ]
};

function getRecommendations(riskLevel) {
  return recommendationsData[riskLevel] || recommendationsData['Low'];
}

module.exports = { getRecommendations };
