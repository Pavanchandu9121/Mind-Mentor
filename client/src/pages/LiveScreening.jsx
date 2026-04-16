import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useScreening } from '../context/ScreeningContext';
import './LiveScreening.css';

const SCREENING_QUESTIONS = [
  {
    id: 1,
    text: "How have you been feeling overall in the past couple of weeks?",
    category: "general",
    followUp: "Take your time to describe your mood and energy levels."
  },
  {
    id: 2,
    text: "Have you been finding it hard to enjoy things you usually like doing?",
    category: "depression",
    followUp: "Think about hobbies, social activities, or daily routines."
  },
  {
    id: 3,
    text: "How has your sleep been lately? Any trouble falling or staying asleep?",
    category: "sleep",
    followUp: "Consider both the quality and quantity of your sleep."
  },
  {
    id: 4,
    text: "Do you often feel nervous, anxious, or on edge?",
    category: "anxiety",
    followUp: "Describe any physical sensations like racing heart or tension."
  },
  {
    id: 5,
    text: "Have you been feeling tired or low on energy, even after resting?",
    category: "fatigue",
    followUp: "Think about how this affects your daily activities."
  },
  {
    id: 6,
    text: "How would you describe your ability to concentrate recently?",
    category: "concentration",
    followUp: "Consider work, reading, conversations, or decision-making."
  },
  {
    id: 7,
    text: "Have you been feeling down about yourself or overly critical?",
    category: "self-esteem",
    followUp: "Share openly — there are no wrong answers here."
  },
  {
    id: 8,
    text: "Is there anything else about your mental health you'd like to share?",
    category: "open",
    followUp: "This is your space to express anything on your mind."
  }
];

const PHASES = {
  INTRO: 'intro',
  PERMISSIONS: 'permissions',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  ERROR: 'error'
};

export default function LiveScreening() {
  const navigate = useNavigate();

  // Phase & question state
  const [phase, setPhase] = useState(PHASES.INTRO);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [questionTimer, setQuestionTimer] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const { isProcessing, processingStatus: globalProcessingStatus, submitScreening } = useScreening();

  // Media refs
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const requestPermissions = async () => {
    setPhase(PHASES.PERMISSIONS);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      mediaStreamRef.current = stream;
      setPhase(PHASES.RECORDING);
      startRecording();
    } catch (err) {
      console.error('Permission denied:', err);
      setError('Camera and microphone access is required for the live screening. Please allow access and try again.');
      setPhase(PHASES.ERROR);
    }
  };

  const startRecording = useCallback(() => {
    if (!mediaStreamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType,
      videoBitsPerSecond: 500000 // 500kbps — keeps file small
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(1000); // Collect data every second
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setCurrentQuestion(0);
    setQuestionTimer(0);

    // Start timer
    timerRef.current = setInterval(() => {
      setQuestionTimer(prev => prev + 1);
    }, 1000);
  }, []);

  // Ensure video stream attaches to the <video> element after React renders the RECORDING phase
  useEffect(() => {
    if (phase === PHASES.RECORDING && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [phase]);

  // Simulate progress steps while waiting for ML analysis
  useEffect(() => {
    if (phase === PHASES.PROCESSING || isProcessing) {
      if (isProcessing && phase !== PHASES.PROCESSING) setPhase(PHASES.PROCESSING);
      const interval = setInterval(() => {
        setActiveStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 6000); // Advance step every 6 seconds approx
      return () => clearInterval(interval);
    }
  }, [phase, isProcessing]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });
  }, []);

  const handleNextQuestion = () => {
    if (currentQuestion < SCREENING_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionTimer(0);
    } else {
      handleFinish();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setQuestionTimer(0);
    }
  };

  const handleFinish = async () => {
    setPhase(PHASES.PROCESSING);

    const blob = await stopRecording();
    stopMediaStream();

    if (!blob || blob.size === 0) {
      setError('Recording failed. Please try again.');
      setPhase(PHASES.ERROR);
      return;
    }

    try {
      // Hand over the heavy lifting to the global Context so we can safely navigate away!
      submitScreening(blob, SCREENING_QUESTIONS.map(q => q.text));
      // No need to local-navigate here because the Context will spawn a Toast notification which handles routing!
      // But we can redirect them to Dashboard or Home automatically if they prefer
      navigate('/dashboard');
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to process the screening.');
      setPhase(PHASES.ERROR);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = ((currentQuestion + 1) / SCREENING_QUESTIONS.length) * 100;
  const question = SCREENING_QUESTIONS[currentQuestion];

  // ========== INTRO ==========
  if (phase === PHASES.INTRO) {
    return (
      <div className="screening-page page">
        <div className="container">
          <div className="screening-intro animate-fadeInUp">
            <div className="intro-icon-large">🎥</div>
            <h1>Live AI Screening</h1>
            <p className="screening-subtitle">
              A conversational mental health check-in powered by multimodal AI analysis
            </p>

            <div className="screening-features">
              <div className="feature-card card">
                <span className="feature-icon">📹</span>
                <h3>Facial Analysis</h3>
                <p>Your expressions are analyzed to detect emotional cues</p>
              </div>
              <div className="feature-card card">
                <span className="feature-icon">🎙️</span>
                <h3>Voice Analysis</h3>
                <p>Tone and vocal patterns provide emotional insights</p>
              </div>
              <div className="feature-card card">
                <span className="feature-icon">💬</span>
                <h3>Content Analysis</h3>
                <p>Your spoken words are transcribed and analyzed for sentiment</p>
              </div>
            </div>

            <div className="screening-info-box card">
              <h4>📋 How it works</h4>
              <ol>
                <li>You'll be asked <strong>8 conversational questions</strong> about your well-being</li>
                <li>Respond naturally via your <strong>webcam and microphone</strong></li>
                <li>Take as much time as you need for each question</li>
                <li>After finishing, our AI analyzes your <strong>expressions, voice, and words</strong></li>
                <li>Results are combined with your PHQ/GAD scores for a <strong>comprehensive assessment</strong></li>
              </ol>
            </div>

            <div className="screening-privacy">
              <span>🔒</span>
              <p>Your recording is processed locally and is <strong>never stored permanently</strong>. All data is deleted after analysis.</p>
            </div>

            <button
              onClick={requestPermissions}
              className="btn btn-primary btn-lg"
              id="btn-start-screening"
            >
              <span>🎬</span> Begin Screening Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== PERMISSIONS LOADING ==========
  if (phase === PHASES.PERMISSIONS) {
    return (
      <div className="screening-page page">
        <div className="container">
          <div className="screening-permissions animate-fadeIn">
            <div className="spinner" style={{ width: 60, height: 60, borderWidth: 4 }}></div>
            <h2>Requesting Camera & Microphone Access</h2>
            <p>Please allow access when prompted by your browser.</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== ERROR ==========
  if (phase === PHASES.ERROR) {
    return (
      <div className="screening-page page">
        <div className="container">
          <div className="screening-error animate-fadeIn">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <button onClick={() => setPhase(PHASES.INTRO)} className="btn btn-secondary">
                ← Back to Intro
              </button>
              <button onClick={requestPermissions} className="btn btn-primary">
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== PROCESSING ==========
  if (phase === PHASES.PROCESSING) {
    return (
      <div className="screening-page page">
        <div className="container">
          <div className="screening-processing animate-fadeIn">
            <div className="processing-animation">
              <div className="processing-ring"></div>
              <div className="processing-icon">🧠</div>
            </div>
            <h2>Analyzing Your Screening</h2>
            <p className="processing-status">{globalProcessingStatus}</p>
            <p className="processing-note" style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '8px', marginBottom: '16px' }}>
              *(Please wait. AI analysis on video and audio takes roughly 30-90 seconds)*
            </p>
            <div className="processing-steps">
              {[
                'Extracting audio & frames...',
                'Analyzing facial expressions...',
                'Processing voice acoustic patterns...',
                'Transcribing spoken words...',
                'Fusing multimodal assessment...'
              ].map((step, index) => (
                <div key={index} className={`processing-step ${index === activeStep ? 'active' : ''} ${index < activeStep ? 'completed' : ''}`}>
                  <span className="step-dot">{index < activeStep ? '✓' : ''}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== RECORDING (main flow) ==========
  return (
    <div className="screening-page page">
      <div className="container">
        <div className="screening-session animate-fadeIn">

          {/* Header */}
          <div className="session-header">
            <div className="session-phase-label">
              🎥 Live Screening — Question {currentQuestion + 1} of {SCREENING_QUESTIONS.length}
            </div>
            <div className="session-timer">
              <span className={`recording-indicator ${isRecording ? 'active' : ''}`}></span>
              {formatTime(questionTimer)}
            </div>
          </div>

          {/* Progress */}
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>

          {/* Main content: video + question */}
          <div className="session-content">

            {/* Webcam Preview */}
            <div className="webcam-panel">
              <div className="webcam-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="webcam-video"
                  id="screening-webcam"
                />
                <div className="webcam-overlay">
                  <div className="webcam-recording-badge">
                    <span className="rec-dot"></span>
                    REC
                  </div>
                </div>
              </div>
              <p className="webcam-hint">
                💡 Speak naturally and look at the camera. Your expressions and voice are being captured.
              </p>
            </div>

            {/* Question Panel */}
            <div className="question-panel" key={`q-${currentQuestion}`}>
              <div className="screening-question-card card">
                <div className="question-category-badge">
                  {question.category === 'general' && '🌟 General Well-being'}
                  {question.category === 'depression' && '🧠 Mood & Interest'}
                  {question.category === 'sleep' && '🌙 Sleep Patterns'}
                  {question.category === 'anxiety' && '💚 Anxiety'}
                  {question.category === 'fatigue' && '⚡ Energy Levels'}
                  {question.category === 'concentration' && '🎯 Focus & Attention'}
                  {question.category === 'self-esteem' && '💜 Self-perception'}
                  {question.category === 'open' && '📝 Open Reflection'}
                </div>
                <h2 className="screening-question-text">{question.text}</h2>
                <p className="screening-question-hint">{question.followUp}</p>
              </div>

              {/* Question dots */}
              <div className="screening-dots">
                {SCREENING_QUESTIONS.map((_, i) => (
                  <span
                    key={i}
                    className={`dot ${i === currentQuestion ? 'active' : ''} ${i < currentQuestion ? 'completed' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="session-nav">
            <button
              onClick={handlePrevQuestion}
              className="btn btn-secondary"
              disabled={currentQuestion === 0}
              id="btn-prev-screening"
            >
              ← Previous
            </button>

            {currentQuestion < SCREENING_QUESTIONS.length - 1 ? (
              <button
                onClick={handleNextQuestion}
                className="btn btn-primary"
                id="btn-next-screening"
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="btn btn-primary btn-finish"
                id="btn-finish-screening"
              >
                ✅ Finish & Analyze
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
