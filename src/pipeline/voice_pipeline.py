import functools
import io
import os
import tempfile
import librosa
import numpy as np
import soundfile as sf
from resemblyzer import VoiceEncoder, preprocess_wav

@functools.lru_cache(maxsize=1)
def load_voice_encoder():
    return VoiceEncoder()

def load_audio_16k_mono(audio_bytes: bytes):
    """
    Safely loads audio bytes into 16kHz mono numpy float32 array.
    Supports WAV, OGG, FLAC, MP3, and WebM container formats.
    """
    try:
        # First attempt: direct in-memory load via soundfile
        audio, sr = sf.read(io.BytesIO(audio_bytes), dtype='float32')
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)
        if sr != 16000:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        return audio, 16000
    except Exception:
        # Second attempt: librosa via tempfile for container formats like webm
        with tempfile.NamedTemporaryFile(delete=False, suffix=".audio") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            audio, sr = librosa.load(tmp_path, sr=16000, mono=True)
            return audio, sr
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

def get_voice_embedding(audio_bytes: bytes, min_duration: float = 2.0, min_rms: float = 0.005):
    """
    Extracts a 256-dimensional d-vector embedding from raw audio bytes.
    Validates duration and energy, rejecting silence and too-short utterances.
    """
    audio, sr = load_audio_16k_mono(audio_bytes)

    duration = float(len(audio) / sr)
    if duration < min_duration:
        raise ValueError(f"Voice recording too short ({duration:.1f}s). Please speak clearly for at least 3-5 seconds.")

    rms = float(np.sqrt(np.mean(audio ** 2)))
    if rms < min_rms:
        raise ValueError("Voice recording is silent or too quiet. Please speak closer to your microphone.")

    wav = preprocess_wav(audio)
    if len(wav) < 1600:
        raise ValueError("No distinct speech features detected. Please speak clearly.")

    encoder = load_voice_encoder()
    emb = encoder.embed_utterance(wav)
    return emb.tolist()

def identify_speaker(new_embedding, candidate_dict: dict, threshold: float = 0.65):
    if new_embedding is None or not candidate_dict:
        return None, 0.0

    best_sid, best_score = None, -1.0
    for sid, stored in candidate_dict.items():
        if stored is None:
            continue
        sim = float(np.dot(new_embedding, stored))
        if sim > best_score:
            best_score, best_sid = sim, sid

    return (best_sid, best_score) if best_score >= threshold else (None, best_score)

def process_bulk_audio(audio_bytes: bytes, candidates_dict: dict, threshold: float = 0.65):
    try:
        audio, sr = load_audio_16k_mono(audio_bytes)
        encoder = load_voice_encoder()
        segments = librosa.effects.split(audio, top_db=30)
        results = {}

        for start, end in segments:
            if (end - start) < sr * 0.5:
                continue
            wav = preprocess_wav(audio[start:end])
            emb = encoder.embed_utterance(wav)
            sid, score = identify_speaker(emb, candidates_dict, threshold)
            if sid and (sid not in results or score > results[sid]):
                results[sid] = score

        return results
    except Exception as e:
        print(f"Bulk voice process error: {e}")
        return {}

