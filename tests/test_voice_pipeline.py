import io

import numpy as np
import pytest
import soundfile as sf

from src.pipeline.voice_pipeline import get_voice_embedding, identify_speaker, load_audio_16k_mono


def test_silence_rejection():
    silence = np.zeros(16000 * 3, dtype=np.float32)
    buf = io.BytesIO()
    sf.write(buf, silence, 16000, format='WAV')
    with pytest.raises(ValueError) as exc:
        get_voice_embedding(buf.getvalue())
    assert "silent or too quiet" in str(exc.value)

def test_short_audio_rejection():
    short = (np.random.randn(8000) * 0.1).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, short, 16000, format='WAV')
    with pytest.raises(ValueError) as exc:
        get_voice_embedding(buf.getvalue())
    assert "too short" in str(exc.value)

def test_sample_rate_resampling_to_16k_mono():
    # Generate 44100Hz stereo audio
    sr_orig = 44100
    duration_s = 2.5
    t = np.linspace(0, duration_s, int(sr_orig * duration_s), endpoint=False, dtype=np.float32)
    left_channel = 0.3 * np.sin(2 * np.pi * 440 * t)
    right_channel = 0.3 * np.sin(2 * np.pi * 880 * t)
    stereo = np.column_stack([left_channel, right_channel])

    buf = io.BytesIO()
    sf.write(buf, stereo, sr_orig, format='WAV')

    # Load and resample
    audio_resampled, sr = load_audio_16k_mono(buf.getvalue())
    assert sr == 16000
    assert audio_resampled.ndim == 1  # Mono
    # Expected length: ~16000 * 2.5 = 40,000 samples
    assert abs(len(audio_resampled) - 40000) < 100

def test_speaker_cosine_identification():
    target = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    candidates = {
        101: np.array([0.99, 0.01, 0.0], dtype=np.float32),
        102: np.array([0.1, 0.9, 0.0], dtype=np.float32),
    }
    sid, score = identify_speaker(target, candidates, threshold=0.7)
    assert sid == 101
    assert score > 0.95

    # Below threshold rejection
    sid_none, score_low = identify_speaker(target, {102: candidates[102]}, threshold=0.7)
    assert sid_none is None
    assert score_low < 0.7

def test_speaker_identification_empty_cases():
    sid, score = identify_speaker(None, {101: np.zeros(256)})
    assert sid is None
    assert score == 0.0

    target = np.ones(256, dtype=np.float32)
    sid, score = identify_speaker(target, {})
    assert sid is None
    assert score == 0.0
