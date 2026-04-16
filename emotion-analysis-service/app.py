"""
Emotion Analysis Service - Full ML Backend
==========================================
Provides 4 endpoints for multimodal emotion analysis:

  POST /analyze/face      - Facial emotion detection (FER)
  POST /analyze/voice     - Voice emotion classification (librosa)
  POST /transcribe        - Speech-to-text (faster-whisper)
  POST /analyze/sentiment - Text sentiment analysis (VADER)

All models are loaded lazily on first use to minimize startup RAM.
Optimized for CPU-only, 8 GB RAM systems.
"""

import os
import tempfile
import time
import traceback

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────
app = FastAPI(title="Emotion Analysis Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model holders (lazy loaded)
_fer_detector = None
_whisper_model = None
_vader_analyzer = None

TEMP_DIR = os.path.join(tempfile.gettempdir(), "emotion-analysis")
os.makedirs(TEMP_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# Lazy loaders (only load when first called)
# ─────────────────────────────────────────────
def get_fer():
    """Load FER model on first call (~200 MB)."""
    global _fer_detector
    if _fer_detector is None:
        print("[Models] Loading FER facial emotion detector...")
        from fer.fer import FER
        _fer_detector = FER(mtcnn=False)  # Use Haar cascade (lighter than MTCNN)
        print("[Models] OK FER loaded")
    return _fer_detector


def get_whisper():
    """Load faster-whisper model on first call (~400 MB for 'base')."""
    global _whisper_model
    if _whisper_model is None:
        print("[Models] Loading faster-whisper 'base' model...")
        from faster_whisper import WhisperModel
        _whisper_model = WhisperModel(
            "base",
            device="cpu",
            compute_type="int8"  # Quantized for CPU - uses less RAM
        )
        print("[Models] OK Whisper loaded")
    return _whisper_model


def get_vader():
    """Load VADER sentiment analyzer on first call (~5 MB)."""
    global _vader_analyzer
    if _vader_analyzer is None:
        print("[Models] Loading VADER sentiment analyzer...")
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _vader_analyzer = SentimentIntensityAnalyzer()
        print("[Models] OK VADER loaded")
    return _vader_analyzer


# ─────────────────────────────────────────────
# Helper: save uploaded file to temp
# ─────────────────────────────────────────────
async def save_upload(upload: UploadFile, suffix: str = "") -> str:
    """Save an uploaded file to the temp directory and return the path."""
    ext = os.path.splitext(upload.filename or "file")[1] or suffix
    path = os.path.join(TEMP_DIR, f"upload_{int(time.time() * 1000)}{ext}")
    content = await upload.read()
    with open(path, "wb") as f:
        f.write(content)
    return path


def cleanup(path: str):
    """Remove a temp file safely."""
    try:
        if path and os.path.exists(path):
            os.unlink(path)
    except Exception:
        pass


# ═════════════════════════════════════════════
# ENDPOINT 1: Facial Emotion Analysis
# ═════════════════════════════════════════════
@app.post("/analyze/face")
async def analyze_face(video: UploadFile = File(...)):
    """
    Analyze facial emotions from a video file.
    Samples frames at ~2 FPS and runs FER on each.
    Returns dominant emotion + per-emotion averages.
    """
    video_path = None
    try:
        video_path = await save_upload(video, ".webm")
        print(f"[Face] Analyzing video: {video.filename} ({os.path.getsize(video_path) / 1024:.1f} KB)")

        detector = get_fer()

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_interval = max(int(fps / 2), 1)  # ~2 frames per second

        all_emotions = []
        frame_count = 0
        analyzed_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # Sample at ~2 FPS
            if frame_count % sample_interval != 0:
                continue

            # Resize for speed (max 480px width)
            h, w = frame.shape[:2]
            if w > 480:
                scale = 480 / w
                frame = cv2.resize(frame, (480, int(h * scale)))

            # Run FER
            try:
                results = detector.detect_emotions(frame)
                if results:
                    # Take first detected face
                    emotions = results[0]['emotions']
                    all_emotions.append(emotions)
                    analyzed_count += 1
            except Exception as e:
                print(f"[Face] Frame {frame_count} error: {e}")
                continue

        cap.release()

        if not all_emotions:
            return {
                "dominant_emotion": "neutral",
                "confidence": 0.0,
                "emotions": {"neutral": 1.0},
                "frames_analyzed": 0,
                "total_frames": total_frames,
                "note": "No faces detected in video"
            }

        # Average emotions across all sampled frames
        emotion_keys = all_emotions[0].keys()
        avg_emotions = {}
        for key in emotion_keys:
            avg_emotions[key] = round(
                sum(e[key] for e in all_emotions) / len(all_emotions), 4
            )

        dominant = max(avg_emotions, key=avg_emotions.get)
        confidence = avg_emotions[dominant]

        print(f"[Face] OK Analyzed {analyzed_count} frames - dominant: {dominant} ({confidence:.2f})")

        return {
            "dominant_emotion": dominant,
            "confidence": round(confidence, 4),
            "emotions": avg_emotions,
            "frames_analyzed": analyzed_count,
            "total_frames": total_frames
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Face] Error Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Face analysis failed: {str(e)}")
    finally:
        cleanup(video_path)


# ═════════════════════════════════════════════
# ENDPOINT 2: Voice Emotion Analysis
# ═════════════════════════════════════════════
@app.post("/analyze/voice")
async def analyze_voice_endpoint(audio: UploadFile = File(...)):
    """
    Analyze voice emotion from an audio file.
    Uses librosa feature extraction + rule-based classification.
    """
    audio_path = None
    try:
        audio_path = await save_upload(audio, ".wav")
        print(f"[Voice] Analyzing audio: {audio.filename} ({os.path.getsize(audio_path) / 1024:.1f} KB)")

        from models.voice_emotion import analyze_voice

        result = analyze_voice(audio_path)
        print(f"[Voice] OK Emotion: {result['emotion']} ({result['confidence']:.2f})")

        return result

    except Exception as e:
        print(f"[Voice] Error Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {str(e)}")
    finally:
        cleanup(audio_path)


# ═════════════════════════════════════════════
# ENDPOINT 3: Speech-to-Text (Transcription)
# ═════════════════════════════════════════════
@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Transcribe speech from an audio file using faster-whisper (base model).
    Returns the full text and per-segment timestamps.
    """
    audio_path = None
    try:
        audio_path = await save_upload(audio, ".wav")
        print(f"[STT] Transcribing: {audio.filename} ({os.path.getsize(audio_path) / 1024:.1f} KB)")

        model = get_whisper()

        segments, info = model.transcribe(
            audio_path,
            beam_size=3,           # Lower beam = faster, slightly less accurate
            language=None,         # Auto-detect
            vad_filter=True,       # Filter silence (saves processing time)
            vad_parameters=dict(
                min_silence_duration_ms=500
            )
        )

        # Collect segments
        segment_list = []
        full_text_parts = []

        for seg in segments:
            segment_list.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip()
            })
            full_text_parts.append(seg.text.strip())

        full_text = " ".join(full_text_parts)

        print(f"[STT] OK Transcribed {len(segment_list)} segments, {len(full_text)} chars")
        print(f"[STT]   Language: {info.language} ({info.language_probability:.2f})")

        return {
            "text": full_text,
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "segments": segment_list,
            "duration": round(info.duration, 2) if info.duration else 0
        }

    except Exception as e:
        print(f"[STT] Error Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        cleanup(audio_path)


# ═════════════════════════════════════════════
# ENDPOINT 4: Text Sentiment Analysis (VADER)
# ═════════════════════════════════════════════
class SentimentRequest(BaseModel):
    text: str


@app.post("/analyze/sentiment")
async def analyze_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of text using VADER.
    Returns compound score (-1 to +1), component scores, and a label.
    """
    try:
        text = request.text.strip()
        if not text:
            return {
                "compound": 0.0,
                "pos": 0.0,
                "neg": 0.0,
                "neu": 1.0,
                "label": "neutral"
            }

        analyzer = get_vader()
        scores = analyzer.polarity_scores(text)

        # Determine label
        compound = scores['compound']
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"

        print(f"[Sentiment] OK {label} (compound: {compound:.4f}) - \"{text[:60]}...\"")

        return {
            "compound": round(compound, 4),
            "pos": round(scores['pos'], 4),
            "neg": round(scores['neg'], 4),
            "neu": round(scores['neu'], 4),
            "label": label
        }

    except Exception as e:
        print(f"[Sentiment] Error Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")


# ═════════════════════════════════════════════
# Health check
# ═════════════════════════════════════════════
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "Emotion Analysis",
        "models_loaded": {
            "fer": _fer_detector is not None,
            "whisper": _whisper_model is not None,
            "vader": _vader_analyzer is not None
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5008)
