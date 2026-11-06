"""
Backward compatibility re-export.
Canonical implementation is in src.pipeline.face_pipeline.
"""
from src.pipeline.face_pipeline import (
    CONFIG,
    check_liveness_landmarks,
    get_eye_aspect_ratio,
    get_face_config,
    get_face_embeddings,
    predict_attendance_with_confidence,
    set_face_config,
    train_classifier_from_db,
    train_classifier_from_embeddings,
)

__all__ = [
    "CONFIG",
    "get_face_config",
    "set_face_config",
    "get_face_embeddings",
    "check_liveness_landmarks",
    "predict_attendance_with_confidence",
    "train_classifier_from_db",
    "train_classifier_from_embeddings",
    "get_eye_aspect_ratio",
]
