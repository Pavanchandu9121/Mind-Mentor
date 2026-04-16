const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { protect } = require('../middleware/auth');
const { ensureTempDir, extractAudio, cleanupFiles, checkFFmpeg } = require('../utils/fileHandler');

const router = express.Router();

// ────────────────────────────────────────────
// Config
// ────────────────────────────────────────────
const EMOTION_URL = process.env.EMOTION_SERVICE_URL || 'http://localhost:5008';
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const ASSESSMENT_URL = process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:5003';
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 100) * 1024 * 1024;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ────────────────────────────────────────────
// Multer config for video uploads
// ────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureTempDir()),
  filename: (req, file, cb) => {
    const uniqueName = `screening_${req.user._id}_${Date.now()}${path.extname(file.originalname) || '.webm'}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/webm', 'video/mp4', 'video/ogg', 'application/octet-stream'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// ────────────────────────────────────────────
// Helper: Retry wrapper
// ────────────────────────────────────────────
async function withRetry(fn, label, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const isLast = attempt > retries;
      console.warn(`[Screening] ${label} — attempt ${attempt} failed: ${err.message}`);
      if (isLast) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
}

// ────────────────────────────────────────────
// Helper: Send file to an endpoint
// ────────────────────────────────────────────
async function sendFileToEndpoint(url, filePath, fieldName = 'file') {
  const form = new FormData();
  form.append(fieldName, fs.createReadStream(filePath));

  const response = await axios.post(url, form, {
    headers: form.getHeaders(),
    timeout: 180000, // 3 min timeout for ML processing
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  return response.data;
}

// ────────────────────────────────────────────
// POST /analyze — Main orchestration endpoint
// ────────────────────────────────────────────
router.post('/analyze', protect, upload.single('video'), async (req, res) => {
  const startTime = Date.now();
  let videoPath = null;
  let audioPath = null;

  try {
    // ── Validate upload ──
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    videoPath = req.file.path;
    const questions = req.body.questions ? JSON.parse(req.body.questions) : [];

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Screening] New analysis started`);
    console.log(`[Screening] User: ${req.user._id}`);
    console.log(`[Screening] Video: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`[Screening] Questions: ${questions.length}`);
    console.log(`${'═'.repeat(60)}`);

    // ── Check FFmpeg ──
    const ffmpegReady = await checkFFmpeg();
    if (!ffmpegReady) {
      return res.status(500).json({
        message: 'FFmpeg is not installed. Please install it: winget install ffmpeg'
      });
    }

    // ── Step 1: Extract audio ──
    console.log('[Screening] Step 1/4: Extracting audio from video...');
    audioPath = await extractAudio(videoPath);
    console.log('[Screening] ✓ Audio extracted');

    // ── Step 2: Parallel analysis calls ──
    console.log('[Screening] Step 2/4: Running parallel analysis...');

    const [faceResult, voiceResult, transcribeResult] = await Promise.allSettled([
      // Face emotion analysis
      withRetry(
        () => sendFileToEndpoint(`${EMOTION_URL}/analyze/face`, videoPath, 'video'),
        'Face Analysis'
      ),
      // Voice emotion analysis
      withRetry(
        () => sendFileToEndpoint(`${EMOTION_URL}/analyze/voice`, audioPath, 'audio'),
        'Voice Analysis'
      ),
      // Speech-to-text
      withRetry(
        () => sendFileToEndpoint(`${EMOTION_URL}/transcribe`, audioPath, 'audio'),
        'Transcription'
      )
    ]);

    // Extract results (use defaults on failure)
    const faceData = faceResult.status === 'fulfilled' ? faceResult.value : {
      emotions: { neutral: 1.0 },
      dominant_emotion: 'neutral',
      confidence: 0.0,
      error: faceResult.reason?.message
    };

    const voiceData = voiceResult.status === 'fulfilled' ? voiceResult.value : {
      emotion: 'neutral',
      confidence: 0.0,
      error: voiceResult.reason?.message
    };

    const transcription = transcribeResult.status === 'fulfilled' ? transcribeResult.value : {
      text: '',
      error: transcribeResult.reason?.message
    };

    console.log(`[Screening]   Face: ${faceResult.status} — ${faceData.dominant_emotion || 'N/A'}`);
    console.log(`[Screening]   Voice: ${voiceResult.status} — ${voiceData.emotion || 'N/A'}`);
    console.log(`[Screening]   STT: ${transcribeResult.status} — ${(transcription.text || '').substring(0, 80)}...`);

    // ── Step 3: Sentiment analysis on transcribed text ──
    console.log('[Screening] Step 3/4: Analyzing sentiment...');
    let sentimentData = { compound: 0, label: 'neutral' };

    if (transcription.text && transcription.text.trim().length > 0) {
      try {
        const sentimentRes = await withRetry(
          () => axios.post(`${EMOTION_URL}/analyze/sentiment`, {
            text: transcription.text
          }, { timeout: 30000 }),
          'Sentiment Analysis'
        );
        sentimentData = sentimentRes.data;
      } catch (err) {
        console.warn(`[Screening]   Sentiment fallback: ${err.message}`);
      }
    }

    console.log(`[Screening]   Sentiment: ${sentimentData.label} (${sentimentData.compound})`);

    // ── Step 4: Fusion — call AI prediction service ──
    console.log('[Screening] Step 4/4: Computing fusion prediction...');

    // Build the multimodal payload
    const fusionPayload = {
      phq9Score: 0,  // Will be enriched if we can fetch latest assessment
      gad7Score: 0,
      faceEmotions: faceData.emotions || { neutral: 1.0 },
      voiceEmotion: {
        emotion: voiceData.emotion || 'neutral',
        confidence: voiceData.confidence || 0
      },
      sentiment: {
        compound: sentimentData.compound || 0,
        pos: sentimentData.pos || 0,
        neg: sentimentData.neg || 0,
        neu: sentimentData.neu || 1,
        label: sentimentData.label || 'neutral'
      },
      transcribedText: transcription.text || ''
    };

    // Try to fetch the user's latest PHQ/GAD scores (non-blocking)
    try {
      const assessmentRes = await axios.get(ASSESSMENT_URL, {
        headers: { Authorization: req.headers.authorization },
        timeout: 5000
      });
      if (assessmentRes.data && assessmentRes.data.length > 0) {
        const latest = assessmentRes.data[0]; // Most recent (sorted desc)
        fusionPayload.phq9Score = latest.phq9Score || 0;
        fusionPayload.gad7Score = latest.gad7Score || 0;
        console.log(`[Screening]   Latest PHQ-9: ${fusionPayload.phq9Score}, GAD-7: ${fusionPayload.gad7Score}`);
      }
    } catch (err) {
      console.warn(`[Screening]   Could not fetch latest assessment: ${err.message}`);
    }

    // Call the fusion endpoint
    let fusionResult;
    try {
      const fusionRes = await withRetry(
        () => axios.post(`${AI_URL}/predict/multimodal`, fusionPayload, { timeout: 30000 }),
        'Fusion Prediction'
      );
      fusionResult = fusionRes.data;
    } catch (err) {
      console.warn(`[Screening]   Fusion service unavailable, using fallback`);
      // Fallback: basic weighted estimate
      fusionResult = buildFallbackPrediction(fusionPayload);
    }

    // ── Build final response ──
    const elapsedMs = Date.now() - startTime;

    const result = {
      screeningId: `scr_${Date.now()}`,
      userId: req.user._id,
      timestamp: new Date().toISOString(),
      processingTimeMs: elapsedMs,

      // Final prediction
      riskLevel: fusionResult.riskLevel || 'Low',
      severity: fusionResult.severity || 'Minimal',
      confidence: fusionResult.confidence || 0.5,

      // Detailed breakdown
      breakdown: fusionResult.breakdown || {},

      // Individual analysis results
      analysis: {
        face: {
          dominantEmotion: faceData.dominant_emotion || 'neutral',
          emotions: faceData.emotions || {},
          confidence: faceData.confidence || 0,
          status: faceResult.status
        },
        voice: {
          emotion: voiceData.emotion || 'neutral',
          confidence: voiceData.confidence || 0,
          features: voiceData.features || {},
          status: voiceResult.status
        },
        transcription: {
          text: transcription.text || '',
          language: transcription.language || 'en',
          status: transcribeResult.status
        },
        sentiment: sentimentData
      },

      // Questions asked
      questions,

      // PHQ/GAD context
      phq9Score: fusionPayload.phq9Score,
      gad7Score: fusionPayload.gad7Score,

      // Recommendations mapped to object format expected by Assessment
      recommendations: (fusionResult.recommendations || getDefaultRecommendations(fusionResult.riskLevel)).map(rec => ({
        title: 'Recommendation',
        description: rec,
        type: 'general',
        icon: '💡'
      }))
    };

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[Screening] ✅ Analysis complete in ${(elapsedMs / 1000).toFixed(1)}s`);
    console.log(`[Screening] Risk: ${result.riskLevel} | Confidence: ${result.confidence}`);
    console.log(`${'─'.repeat(60)}\n`);

    // ── Save to database ──
    try {
      const saveRes = await axios.post(`${ASSESSMENT_URL}/screening-result`, {
        riskLevel: result.riskLevel,
        severity: result.severity,
        confidence: result.confidence,
        phq9Score: result.phq9Score,
        gad7Score: result.gad7Score,
        breakdown: result.breakdown,
        analysis: result.analysis,
        transcribedText: transcription.text || '',
        recommendations: result.recommendations
      }, {
        headers: { Authorization: req.headers.authorization }
      });
      // Override the transient screeningId with the actual database _id so the frontend can route to it
      if (saveRes.data && saveRes.data._id) {
        result.screeningId = saveRes.data._id;
        console.log(`[Screening] ✓ Saved to database as: ${result.screeningId}`);
      }
    } catch (saveErr) {
      console.warn(`[Screening] ❌ Failed to save result to database: ${saveErr.message}`);
    }

    res.json(result);

  } catch (error) {
    console.error('[Screening] ❌ Error:', error.message);
    res.status(500).json({
      message: 'Screening analysis failed',
      error: error.message
    });
  } finally {
    // Always clean up temp files
    cleanupFiles(videoPath, audioPath);
  }
});

// ────────────────────────────────────────────
// Fallback prediction when fusion service is down
// ────────────────────────────────────────────
function buildFallbackPrediction(payload) {
  // Simple heuristic based on available signals
  let riskScore = 0;

  // Face emotions risk scoring
  const negFaceEmotions = ['sad', 'angry', 'fear', 'disgust'];
  const faceEmotions = payload.faceEmotions || {};
  for (const emotion of negFaceEmotions) {
    riskScore += (faceEmotions[emotion] || 0) * 0.25;
  }

  // Voice
  if (['sad', 'angry', 'fearful'].includes(payload.voiceEmotion?.emotion)) {
    riskScore += 0.2;
  }

  // Sentiment
  const compound = payload.sentiment?.compound || 0;
  if (compound < -0.3) riskScore += 0.2;
  else if (compound < 0) riskScore += 0.1;

  // PHQ/GAD contribution
  const totalScore = (payload.phq9Score || 0) + (payload.gad7Score || 0);
  if (totalScore > 25) riskScore += 0.3;
  else if (totalScore > 10) riskScore += 0.15;

  // Classify
  let riskLevel, severity;
  if (riskScore >= 0.5) {
    riskLevel = 'High';
    severity = 'Moderately Severe to Severe';
  } else if (riskScore >= 0.25) {
    riskLevel = 'Moderate';
    severity = 'Moderate';
  } else {
    riskLevel = 'Low';
    severity = 'Minimal to Mild';
  }

  return {
    riskLevel,
    severity,
    confidence: Math.min(0.7, 0.4 + riskScore),
    breakdown: {
      questionnaire: { riskLevel: totalScore > 25 ? 'High' : totalScore > 10 ? 'Moderate' : 'Low', weight: 0.4 },
      facialExpression: { dominantEmotion: Object.keys(faceEmotions)[0] || 'neutral', weight: 0.25 },
      voiceTone: { emotion: payload.voiceEmotion?.emotion || 'neutral', weight: 0.2 },
      textSentiment: { label: payload.sentiment?.label || 'neutral', weight: 0.15 }
    },
    recommendations: getDefaultRecommendations(riskLevel)
  };
}

// ────────────────────────────────────────────
// Default recommendations
// ────────────────────────────────────────────
function getDefaultRecommendations(riskLevel) {
  const map = {
    Low: [
      'Continue maintaining your well-being with regular self-care practices.',
      'Consider mindfulness or meditation exercises.',
      'Stay connected with friends and family.'
    ],
    Moderate: [
      'Consider speaking with a mental health professional.',
      'Practice stress management techniques such as deep breathing.',
      'Maintain a regular sleep schedule and exercise routine.',
      'Reach out to trusted friends or support groups.'
    ],
    High: [
      'We strongly recommend consulting a mental health professional soon.',
      'If you are in crisis, please contact a helpline immediately.',
      'Talk to someone you trust about how you are feeling.',
      'Avoid isolating yourself — connection is important.'
    ]
  };
  return map[riskLevel] || map.Low;
}

module.exports = router;
