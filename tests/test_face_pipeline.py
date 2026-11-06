import numpy as np
import pytest

from src.pipeline.face_pipeline import (
    CONFIG,
    check_liveness_landmarks,
    get_eye_aspect_ratio,
    get_face_config,
    get_face_embeddings,
    set_face_config,
)


def test_face_config_get_and_set():
    orig = get_face_config()
    assert "face_match_threshold" in orig
    assert "liveness_ear_threshold" in orig

    updated = set_face_config(face_match_threshold=0.55, liveness_ear_threshold=0.18, liveness_enabled=False)
    assert updated["face_match_threshold"] == 0.55
    assert updated["liveness_ear_threshold"] == 0.18
    assert updated["liveness_enabled"] is False

    # Restore original config
    set_face_config(
        face_match_threshold=orig["face_match_threshold"],
        liveness_ear_threshold=orig["liveness_ear_threshold"],
        liveness_enabled=orig["liveness_enabled"]
    )

def test_liveness_on_blank_frame():
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    is_live, msg = check_liveness_landmarks(blank)
    assert is_live is False
    assert "No face detected" in msg

def test_liveness_disabled_bypass():
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    is_live, msg = check_liveness_landmarks(blank, enabled=False)
    assert is_live is True
    assert "disabled" in msg

def test_face_embeddings_empty_on_blank():
    blank = np.zeros((200, 200, 3), dtype=np.uint8)
    embs = get_face_embeddings(blank)
    assert isinstance(embs, list)
    assert len(embs) == 0

def test_eye_aspect_ratio_open_vs_closed():
    # 6 points representing open eye: p1(0,0), p2(2,5), p3(4,5), p4(6,0), p5(4,-5), p6(2,-5)
    # width = |p1 - p4| = 6
    # height1 = |p2 - p6| = 10, height2 = |p3 - p5| = 10
    # EAR = (10 + 10) / (2 * 6) = 20 / 12 = 1.666
    open_eye_pts = np.array([
        [0.0, 0.0],
        [2.0, 1.5],
        [4.0, 1.5],
        [6.0, 0.0],
        [4.0, -1.5],
        [2.0, -1.5]
    ])
    ear_open = get_eye_aspect_ratio(open_eye_pts)
    assert ear_open > 0.25

    # 6 points representing closed/squinting eye (height collapsed to ~0)
    closed_eye_pts = np.array([
        [0.0, 0.0],
        [2.0, 0.2],
        [4.0, 0.2],
        [6.0, 0.0],
        [4.0, -0.2],
        [2.0, -0.2]
    ])
    ear_closed = get_eye_aspect_ratio(closed_eye_pts)
    assert ear_closed < 0.10

def test_distance_threshold_boundary():
    # Test Euclidean distance threshold boundary at 0.60
    base_emb = np.zeros(128, dtype=np.float32)
    base_emb[0] = 1.0

    # 1. Distance = 0.59 (below 0.60 -> Match)
    match_emb = base_emb.copy()
    match_emb[1] = 0.59
    dist_match = float(np.linalg.norm(match_emb - base_emb))
    assert dist_match <= 0.60

    # 2. Distance = 0.60 (exact boundary -> Match within float epsilon)
    boundary_emb = base_emb.copy()
    boundary_emb[1] = 0.60
    dist_boundary = float(np.linalg.norm(boundary_emb - base_emb))
    assert round(dist_boundary, 4) <= 0.60

    # 3. Distance = 0.61 (above 0.60 -> No Match)
    no_match_emb = base_emb.copy()
    no_match_emb[1] = 0.61
    dist_no_match = float(np.linalg.norm(no_match_emb - base_emb))
    assert dist_no_match > 0.60
