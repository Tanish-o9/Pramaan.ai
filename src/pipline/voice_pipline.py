"""
Backward compatibility re-export.
Canonical implementation is in src.pipeline.voice_pipeline.
"""
from src.pipeline.voice_pipeline import (
    load_voice_encoder,
    load_audio_16k_mono,
    get_voice_embedding,
    identify_speaker,
    process_bulk_audio,
)

__all__ = [
    "load_voice_encoder",
    "load_audio_16k_mono",
    "get_voice_embedding",
    "identify_speaker",
    "process_bulk_audio",
]
