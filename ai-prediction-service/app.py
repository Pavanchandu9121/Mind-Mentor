from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import joblib
import numpy as np
import os

app = FastAPI(title="AI Prediction Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')
model = None

RISK_LABELS = {0: 'Low', 1: 'Moderate', 2: 'High'}
RISK_TO_INT = {'Low': 0, 'Moderate': 1, 'High': 2}
SEVERITY_MAP = {
    'Low': 'Minimal to Mild',
    'Moderate': 'Moderate',
    'High': 'Moderately Severe to Severe'
}

# Fusion weights (must sum to 1.0)
FUSION_WEIGHTS = {
    'questionnaire': 0.40,
    'face':          0.25,
    'voice':         0.20,
    'sentiment':     0.15,
}

# ─── Emotion -> risk score mapping (0=calm, 1=moderate concern, 2=high concern)
FACE_EMOTION_RISK = {
    'happy':    0.0,
    'neutral':  0.2,
    'surprise': 0.3,
    'calm':     0.1,
    'disgust':  0.6,
    'fear':     0.8,
    'angry':    0.7,
    'sad':      0.75,
}

VOICE_EMOTION_RISK = {
    'happy':   0.0,
    'calm':    0.1,
    'neutral': 0.2,
    'sad':     0.7,
    'fearful': 0.75,
    'angry':   0.65,
}


class PredictionRequest(BaseModel):
    phq9Score: int = 0
    gad7Score: int = 0


class VoiceEmotionInput(BaseModel):
    emotion: str = 'neutral'
    confidence: float = 0.0


class SentimentInput(BaseModel):
    compound: float = 0.0
    pos: float = 0.0
    neg: float = 0.0
    neu: float = 1.0
    label: str = 'neutral'


class MultimodalRequest(BaseModel):
    phq9Score: int = 0
    gad7Score: int = 0
    faceEmotions: Optional[dict] = None         # {"happy": 0.1, "sad": 0.6, ...}
    voiceEmotion: Optional[VoiceEmotionInput] = None
    sentiment: Optional[SentimentInput] = None
    transcribedText: str = ""


@app.on_event("startup")
async def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Model loaded from {MODEL_PATH}")
    else:
        print("WARNING: Model not found. Run train_model.py first.")
        try:
            from train_model import train_model
            model = train_model()
        except Exception as e:
            print(f"Error training model: {e}")


# ═══════════════════════════════════════════
# Root endpoint for browser testing
# ═══════════════════════════════════════════
@app.get('/')
async def root():
    return {
        'message': 'MindMentor AI Prediction Service is running successfully! Use /health to check status or /predict for API calls.'
    }

# ═══════════════════════════════════════════
# Original PHQ/GAD-only endpoint (unchanged)
# ═══════════════════════════════════════════
@app.post('/predict')
async def predict(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        features = np.array([[request.phq9Score, request.gad7Score]])
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]

        risk_level = RISK_LABELS[prediction]
        confidence = float(max(probabilities))

        return {
            'riskLevel': risk_level,
            'severity': SEVERITY_MAP[risk_level],
            'confidence': round(confidence, 4),
            'probabilities': {
                'Low': round(float(probabilities[0]), 4),
                'Moderate': round(float(probabilities[1]), 4),
                'High': round(float(probabilities[2]), 4)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════
# NEW: Multimodal fusion endpoint (Step 3.7)
# ═══════════════════════════════════════════
@app.post('/predict/multimodal')
async def predict_multimodal(request: MultimodalRequest):
    """
    Fuse PHQ/GAD scores with facial emotion, voice tone, and text sentiment
    to produce a combined mental health risk prediction.

    Weights: 40% questionnaire + 25% face + 20% voice + 15% sentiment
    """
    try:
        # ── 1. Questionnaire component (0–1 risk score) ──
        phq9_norm = min(request.phq9Score / 27.0, 1.0)
        gad7_norm = min(request.gad7Score / 21.0, 1.0)
        questionnaire_score = (phq9_norm * 0.6) + (gad7_norm * 0.4)

        # Get ML model probabilities for PHQ/GAD
        questionnaire_risk_level = 'Low'
        if model is not None:
            features = np.array([[request.phq9Score, request.gad7Score]])
            prediction = model.predict(features)[0]
            probabilities = model.predict_proba(features)[0]
            questionnaire_risk_level = RISK_LABELS[prediction]
            questionnaire_score = float(probabilities[1]) * 0.5 + float(probabilities[2])
        else:
            total = request.phq9Score + request.gad7Score
            if total >= 25: questionnaire_risk_level = 'High'
            elif total >= 10: questionnaire_risk_level = 'Moderate'

        # ── 2. Facial emotion component (0–1 risk score) ──
        face_score = 0.2  # default neutral
        dominant_face_emotion = 'neutral'
        face_confidence = 0.0

        if request.faceEmotions:
            # Weighted average of emotion risk values
            total_weight = 0.0
            weighted_risk = 0.0
            for emotion, intensity in request.faceEmotions.items():
                risk = FACE_EMOTION_RISK.get(emotion.lower(), 0.3)
                weighted_risk += risk * intensity
                total_weight += intensity
            if total_weight > 0:
                face_score = weighted_risk / total_weight
            dominant_face_emotion = max(request.faceEmotions, key=request.faceEmotions.get)
            face_confidence = float(request.faceEmotions.get(dominant_face_emotion, 0.0))

        # ── 3. Voice emotion component (0–1 risk score) ──
        voice_score = 0.2  # default neutral
        voice_emotion_name = 'neutral'
        voice_confidence = 0.0

        if request.voiceEmotion:
            voice_emotion_name = request.voiceEmotion.emotion or 'neutral'
            voice_confidence = request.voiceEmotion.confidence or 0.0
            base_risk = VOICE_EMOTION_RISK.get(voice_emotion_name.lower(), 0.3)
            # Scale by confidence: low confidence -> closer to neutral (0.2)
            voice_score = 0.2 + (base_risk - 0.2) * min(voice_confidence, 1.0)

        # ── 4. Sentiment component (0–1 risk score) ──
        sentiment_score = 0.2  # default neutral
        sentiment_label = 'neutral'
        compound = 0.0

        if request.sentiment:
            compound = request.sentiment.compound or 0.0
            sentiment_label = request.sentiment.label or 'neutral'
            # compound is -1 (very negative) to +1 (very positive)
            # map to risk: -1 -> 0.9, 0 -> 0.3, +1 -> 0.0
            sentiment_score = max(0.0, min(1.0, (-compound + 1.0) / 2.0 * 0.9))

        # ── 5. Weighted fusion ──
        fused_score = (
            questionnaire_score  * FUSION_WEIGHTS['questionnaire'] +
            face_score           * FUSION_WEIGHTS['face'] +
            voice_score          * FUSION_WEIGHTS['voice'] +
            sentiment_score      * FUSION_WEIGHTS['sentiment']
        )

        # ── 6. Convert fused score to risk level ──
        if fused_score >= 0.60:
            final_risk = 'High'
        elif fused_score >= 0.35:
            final_risk = 'Moderate'
        else:
            final_risk = 'Low'

        # Confidence: inverse of uncertainty (how clear the signal is)
        # Higher when signals agree, lower when they conflict
        scores = [questionnaire_score, face_score, voice_score, sentiment_score]
        score_std = float(np.std(scores))
        confidence = round(max(0.4, min(0.97, 0.85 - score_std * 0.5)), 4)

        # ── 7. Build breakdown ──
        breakdown = {
            'questionnaire': {
                'riskLevel': questionnaire_risk_level,
                'riskScore': round(questionnaire_score, 4),
                'weight': FUSION_WEIGHTS['questionnaire'],
                'phq9Score': request.phq9Score,
                'gad7Score': request.gad7Score,
            },
            'facialExpression': {
                'dominantEmotion': dominant_face_emotion,
                'confidence': round(face_confidence, 4),
                'riskScore': round(face_score, 4),
                'weight': FUSION_WEIGHTS['face'],
            },
            'voiceTone': {
                'emotion': voice_emotion_name,
                'confidence': round(voice_confidence, 4),
                'riskScore': round(voice_score, 4),
                'weight': FUSION_WEIGHTS['voice'],
            },
            'textSentiment': {
                'label': sentiment_label,
                'compound': round(compound, 4),
                'riskScore': round(sentiment_score, 4),
                'weight': FUSION_WEIGHTS['sentiment'],
            },
        }

        # ── 8. Recommendations ──
        recommendations = _get_recommendations(final_risk, request)

        print(f"[Fusion] Scores - PHQ/GAD: {questionnaire_score:.2f} | Face: {face_score:.2f} | "
              f"Voice: {voice_score:.2f} | Sentiment: {sentiment_score:.2f} -> Fused: {fused_score:.2f} -> {final_risk}")

        return {
            'riskLevel': final_risk,
            'severity': SEVERITY_MAP[final_risk],
            'confidence': confidence,
            'fusedScore': round(fused_score, 4),
            'breakdown': breakdown,
            'recommendations': recommendations,
            'transcribedText': request.transcribedText,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def _get_recommendations(risk_level: str, request: MultimodalRequest) -> list:
    base = {
        'Low': [
            'Continue maintaining your well-being with regular self-care practices.',
            'Practice mindfulness or meditation to sustain your mental resilience.',
            'Stay socially connected with friends and family.',
            'Keep up physical activity - even short daily walks help.',
        ],
        'Moderate': [
            'Consider speaking with a counselor or mental health professional.',
            'Practice stress management: deep breathing, journaling, or yoga.',
            'Maintain a consistent sleep schedule (7–9 hours per night).',
            'Reach out to someone you trust about how you are feeling.',
            'Limit alcohol and caffeine, which can worsen anxiety and mood.',
        ],
        'High': [
            'We strongly recommend consulting a mental health professional soon.',
            'If you are in crisis, please contact a helpline immediately.',
            'Talk to someone you trust - you do not have to go through this alone.',
            'Focus on basic self-care: sleep, food, and gentle movement each day.',
            'Avoid isolating yourself - connection is critical during difficult times.',
        ],
    }
    recs = base.get(risk_level, base['Low'])

    # Add context-specific tip based on dominant signal
    dominant_emotion = None
    if request.faceEmotions:
        dominant_emotion = max(request.faceEmotions, key=request.faceEmotions.get)

    if dominant_emotion == 'sad' or (request.voiceEmotion and request.voiceEmotion.emotion == 'sad'):
        recs = ['💜 Your expressions suggest sadness. Be gentle with yourself today.'] + recs
    elif dominant_emotion == 'fear' or dominant_emotion == 'fearful':
        recs = ['💙 Grounding exercises like the 5-4-3-2-1 technique can help with fear and anxiety.'] + recs
    elif dominant_emotion == 'angry':
        recs = ['🌿 Physical activity like a brisk walk can help release built-up tension.'] + recs

    return recs


@app.get('/health')
async def health():
    return {
        'status': 'ok',
        'model_loaded': model is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)

