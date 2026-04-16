"""
Voice Emotion Classifier using librosa audio features + sklearn.

Extracts MFCC, chroma, mel-spectrogram, spectral contrast, and tonnetz features,
then uses a simple rule-based + statistical approach to classify emotion.

This avoids loading any heavy models — purely CPU-friendly feature analysis.
"""

import numpy as np
import librosa


# Emotion labels
EMOTIONS = ['neutral', 'calm', 'happy', 'sad', 'angry', 'fearful']


def extract_audio_features(audio_path: str) -> dict:
    """
    Extract comprehensive audio features from a WAV file.
    Returns a dict of feature names → values.
    """
    try:
        # Load audio (mono, 16kHz for consistency)
        y, sr = librosa.load(audio_path, sr=16000, mono=True)

        if len(y) == 0:
            return _empty_features()

        # --- Core features ---
        # MFCCs (13 coefficients)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_mean = np.mean(mfccs, axis=1).tolist()
        mfcc_std = np.std(mfccs, axis=1).tolist()

        # Chroma (12 pitch classes)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        chroma_mean = float(np.mean(chroma))
        chroma_std = float(np.std(chroma))

        # Mel spectrogram energy
        mel = librosa.feature.melspectrogram(y=y, sr=sr)
        mel_mean = float(np.mean(mel))

        # Spectral contrast
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        contrast_mean = float(np.mean(contrast))

        # --- Prosodic features ---
        # RMS energy
        rms = librosa.feature.rms(y=y)
        energy_mean = float(np.mean(rms))
        energy_std = float(np.std(rms))

        # Zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(y=y)
        zcr_mean = float(np.mean(zcr))

        # Pitch (fundamental frequency via pyin)
        f0, voiced_flag, voiced_prob = librosa.pyin(
            y, fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7'),
            sr=sr
        )
        f0_clean = f0[~np.isnan(f0)] if f0 is not None else np.array([0])
        pitch_mean = float(np.mean(f0_clean)) if len(f0_clean) > 0 else 0.0
        pitch_std = float(np.std(f0_clean)) if len(f0_clean) > 0 else 0.0
        pitch_range = float(np.ptp(f0_clean)) if len(f0_clean) > 0 else 0.0

        # Speech rate proxy (based on onset detection)
        onsets = librosa.onset.onset_detect(y=y, sr=sr)
        duration = librosa.get_duration(y=y, sr=sr)
        speech_rate = len(onsets) / max(duration, 0.1)

        # Spectral centroid (brightness)
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        centroid_mean = float(np.mean(centroid))

        return {
            'mfcc_mean': mfcc_mean,
            'mfcc_std': mfcc_std,
            'chroma_mean': chroma_mean,
            'chroma_std': chroma_std,
            'mel_energy': mel_mean,
            'spectral_contrast': contrast_mean,
            'energy_mean': energy_mean,
            'energy_std': energy_std,
            'zcr_mean': zcr_mean,
            'pitch_mean': pitch_mean,
            'pitch_std': pitch_std,
            'pitch_range': pitch_range,
            'speech_rate': speech_rate,
            'spectral_centroid': centroid_mean,
            'duration': float(duration)
        }

    except Exception as e:
        print(f"[VoiceEmotion] Feature extraction error: {e}")
        return _empty_features()


def classify_emotion(features: dict) -> dict:
    """
    Rule-based voice emotion classification using extracted audio features.
    
    Uses prosodic cues (pitch, energy, speech rate, spectral features)
    to estimate the most likely emotion.
    
    Returns: {emotion: str, confidence: float, scores: dict}
    """
    if not features or features.get('duration', 0) < 0.5:
        return {'emotion': 'neutral', 'confidence': 0.3, 'scores': {e: 0.0 for e in EMOTIONS}}

    # Initialize scores
    scores = {e: 0.0 for e in EMOTIONS}

    energy = features.get('energy_mean', 0)
    pitch_mean = features.get('pitch_mean', 0)
    pitch_std = features.get('pitch_std', 0)
    pitch_range = features.get('pitch_range', 0)
    speech_rate = features.get('speech_rate', 0)
    zcr = features.get('zcr_mean', 0)
    centroid = features.get('spectral_centroid', 0)

    # --- Scoring rules based on prosodic research ---

    # Happy: high pitch, high energy, high speech rate, high pitch variation
    if pitch_mean > 180 and energy > 0.02 and speech_rate > 3:
        scores['happy'] += 0.4
    if pitch_std > 40:
        scores['happy'] += 0.2
    if centroid > 2000:
        scores['happy'] += 0.1

    # Sad: low pitch, low energy, slow speech rate, low pitch variation
    if pitch_mean < 150 and energy < 0.015:
        scores['sad'] += 0.4
    if speech_rate < 2:
        scores['sad'] += 0.2
    if pitch_std < 20:
        scores['sad'] += 0.15

    # Angry: high energy, high pitch, fast speech, high spectral centroid
    if energy > 0.03 and pitch_mean > 200:
        scores['angry'] += 0.35
    if speech_rate > 4 and zcr > 0.1:
        scores['angry'] += 0.25
    if centroid > 2500:
        scores['angry'] += 0.15

    # Fearful: high pitch, high pitch variation, fast speech, trembling energy
    if pitch_mean > 200 and pitch_std > 50:
        scores['fearful'] += 0.35
    if features.get('energy_std', 0) > 0.01:
        scores['fearful'] += 0.2
    if speech_rate > 3.5:
        scores['fearful'] += 0.15

    # Calm: moderate pitch, low energy, steady
    if 120 < pitch_mean < 200 and energy < 0.02 and pitch_std < 30:
        scores['calm'] += 0.4
    if speech_rate < 3:
        scores['calm'] += 0.15

    # Neutral: baseline when nothing else scores high
    scores['neutral'] += 0.2  # Base score

    # Normalize scores
    total = sum(scores.values())
    if total > 0:
        scores = {k: round(v / total, 4) for k, v in scores.items()}

    # Find dominant emotion
    dominant = max(scores, key=scores.get)
    confidence = scores[dominant]

    return {
        'emotion': dominant,
        'confidence': round(confidence, 4),
        'scores': scores
    }


def analyze_voice(audio_path: str) -> dict:
    """
    Full voice emotion analysis pipeline.
    Returns emotion, confidence, feature summary, and all scores.
    """
    features = extract_audio_features(audio_path)
    result = classify_emotion(features)
    result['features'] = {
        'energy_mean': features.get('energy_mean', 0),
        'pitch_mean': features.get('pitch_mean', 0),
        'pitch_std': features.get('pitch_std', 0),
        'speech_rate': features.get('speech_rate', 0),
        'duration': features.get('duration', 0)
    }
    return result


def _empty_features():
    return {
        'mfcc_mean': [0.0] * 13,
        'mfcc_std': [0.0] * 13,
        'chroma_mean': 0.0, 'chroma_std': 0.0,
        'mel_energy': 0.0, 'spectral_contrast': 0.0,
        'energy_mean': 0.0, 'energy_std': 0.0,
        'zcr_mean': 0.0,
        'pitch_mean': 0.0, 'pitch_std': 0.0, 'pitch_range': 0.0,
        'speech_rate': 0.0, 'spectral_centroid': 0.0,
        'duration': 0.0
    }
