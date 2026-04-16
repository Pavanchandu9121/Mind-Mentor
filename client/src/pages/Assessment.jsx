import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Assessment.css';

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless',
  'Thoughts that you would be better off dead, or of hurting yourself in some way'
];

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen'
];

const ANSWER_OPTIONS = [
  { value: 0, label: 'Not at all', emoji: '😊' },
  { value: 1, label: 'Several days', emoji: '😐' },
  { value: 2, label: 'More than half the days', emoji: '😟' },
  { value: 3, label: 'Nearly every day', emoji: '😔' }
];

export default function Assessment() {
  const [phase, setPhase] = useState('intro'); // intro, phq9, gad7, submitting, done
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [phq9Answers, setPhq9Answers] = useState(Array(9).fill(null));
  const [gad7Answers, setGad7Answers] = useState(Array(7).fill(null));
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const questions = phase === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const answers = phase === 'phq9' ? phq9Answers : gad7Answers;
  const totalQuestions = phase === 'phq9' ? 9 : 7;
  const overallProgress = phase === 'phq9'
    ? ((currentQuestion + 1) / 16) * 100
    : ((9 + currentQuestion + 1) / 16) * 100;

  const handleAnswer = (value) => {
    if (phase === 'phq9') {
      const updated = [...phq9Answers];
      updated[currentQuestion] = value;
      setPhq9Answers(updated);
    } else {
      const updated = [...gad7Answers];
      updated[currentQuestion] = value;
      setGad7Answers(updated);
    }

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else if (phase === 'phq9') {
        setPhase('gad7');
        setCurrentQuestion(0);
      } else {
        handleSubmit();
      }
    }, 300);
  };

  const handleSubmit = async () => {
    setPhase('submitting');
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/assessments', {
        phq9Answers,
        gad7Answers
      });
      navigate(`/results/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit assessment');
      setPhase('gad7');
    }
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (phase === 'gad7') {
      setPhase('phq9');
      setCurrentQuestion(8);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="assessment-page page">
        <div className="container">
          <div className="assessment-intro animate-fadeInUp">
            <div className="intro-icon">📋</div>
            <h1>Mental Health Assessment</h1>
            <p className="intro-desc">
              You'll complete two clinically-validated questionnaires:
            </p>
            <div className="intro-cards">
              <div className="intro-card card">
                <h3>🧠 PHQ-9</h3>
                <p>Patient Health Questionnaire — 9 questions about depression symptoms over the past 2 weeks.</p>
              </div>
              <div className="intro-card card">
                <h3>💚 GAD-7</h3>
                <p>Generalized Anxiety Disorder scale — 7 questions about anxiety symptoms over the past 2 weeks.</p>
              </div>
            </div>
            <div className="intro-note">
              <p>⏱ Takes approximately <strong>5-8 minutes</strong></p>
              <p>🔒 Your responses are <strong>private and secure</strong></p>
              <p>📊 You'll receive <strong>AI-powered analysis</strong> after completion</p>
            </div>
            <button
              onClick={() => setPhase('phq9')}
              className="btn btn-primary btn-lg"
              id="btn-start-assessment"
            >
              Begin Assessment →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="assessment-page page">
        <div className="container">
          <div className="assessment-submitting animate-fadeIn">
            <div className="spinner" style={{ width: 60, height: 60, borderWidth: 4 }}></div>
            <h2>Analyzing Your Responses</h2>
            <p>Our AI model is processing your assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-page page">
      <div className="container">
        <div className="assessment-wrapper animate-fadeIn">
          {/* Header */}
          <div className="assessment-header">
            <div className="assessment-phase-label">
              {phase === 'phq9' ? '🧠 PHQ-9 — Depression Screening' : '💚 GAD-7 — Anxiety Assessment'}
            </div>
            <div className="assessment-counter">
              Question {currentQuestion + 1} of {totalQuestions}
            </div>
          </div>

          {/* Progress */}
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }}></div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Question Card */}
          <div className="question-card card" key={`${phase}-${currentQuestion}`}>
            <div className="question-number">Q{phase === 'phq9' ? currentQuestion + 1 : currentQuestion + 10}</div>
            <h2 className="question-text">
              Over the last 2 weeks, how often have you been bothered by:
            </h2>
            <p className="question-symptom">{questions[currentQuestion]}</p>

            <div className="answer-options">
              {ANSWER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`answer-option ${answers[currentQuestion] === option.value ? 'selected' : ''}`}
                  onClick={() => handleAnswer(option.value)}
                  id={`answer-${option.value}`}
                >
                  <span className="answer-emoji">{option.emoji}</span>
                  <span className="answer-label">{option.label}</span>
                  <span className="answer-value">{option.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="assessment-nav">
            <button
              onClick={goBack}
              className="btn btn-secondary"
              disabled={phase === 'phq9' && currentQuestion === 0}
              id="btn-prev-question"
            >
              ← Previous
            </button>
            <div className="assessment-dots">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <span
                  key={i}
                  className={`dot ${i === currentQuestion ? 'active' : ''} ${answers[i] !== null ? 'completed' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
