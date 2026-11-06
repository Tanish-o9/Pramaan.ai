"""
Unit & Integration Tests for Feature 1: pgvector 1:N Vector Search,
HNSW indexing, Subject Enrollment Scoping, and Margin Ambiguity Gating.
"""

import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from src.services.vector_search_service import VectorSearchService, vector_service

@pytest.fixture
def test_vectors():
    rng = np.random.default_rng(101)
    base_face = rng.normal(size=128).astype(np.float32)
    base_face /= np.linalg.norm(base_face)

    # Similar face of student 1 (e.g., slight noise, dist ~0.15)
    noise1 = rng.normal(scale=0.08, size=128).astype(np.float32)
    same_student_face = base_face + noise1
    same_student_face /= np.linalg.norm(same_student_face)

    # Lookalike face of student 2 (dist ~0.20, close to same_student_face)
    noise2 = rng.normal(scale=0.10, size=128).astype(np.float32)
    lookalike_face = base_face + noise2
    lookalike_face /= np.linalg.norm(lookalike_face)

    # Completely different face of student 3 (dist ~1.2)
    diff_face = rng.normal(size=128).astype(np.float32)
    diff_face /= np.linalg.norm(diff_face)

    # Voice vectors (256-d)
    base_voice = rng.normal(size=256).astype(np.float32)
    base_voice /= np.linalg.norm(base_voice)
    similar_voice = base_voice + rng.normal(scale=0.05, size=256).astype(np.float32)
    similar_voice /= np.linalg.norm(similar_voice)

    return {
        "base_face": base_face.tolist(),
        "same_student_face": same_student_face.tolist(),
        "lookalike_face": lookalike_face.tolist(),
        "diff_face": diff_face.tolist(),
        "base_voice": base_voice.tolist(),
        "similar_voice": similar_voice.tolist()
    }

# ================= 1. VALIDATION & SAVE TESTS =================

def test_save_embedding_dimensions(test_vectors):
    svc = VectorSearchService()
    
    # Valid face (128-d)
    with patch("src.services.vector_search_service.supabase") as mock_sb:
        mock_sb.table().insert().execute.return_value.data = [{"id": 1}]
        saved = svc.save_embedding(student_id=1, modality="face", embedding=test_vectors["base_face"])
        assert saved is not None

    # Invalid face length (e.g. 64-d)
    with pytest.raises(ValueError, match="Expected 128-d"):
        svc.save_embedding(student_id=1, modality="face", embedding=[0.1] * 64)

    # Invalid voice length (e.g. 128-d)
    with pytest.raises(ValueError, match="Expected 256-d"):
        svc.save_embedding(student_id=1, modality="voice", embedding=[0.1] * 128)

    # Invalid modality
    with pytest.raises(ValueError, match="Invalid modality"):
        svc.save_embedding(student_id=1, modality="iris", embedding=test_vectors["base_face"])

# ================= 2. MATCHING & DISTANCE TESTS =================

def test_search_face_exact_and_close_match(test_vectors):
    svc = VectorSearchService()
    svc.enabled = False # Test fallback numpy algorithm directly

    mock_students = [
        {"student_id": 101, "name": "Arjun", "face_embedding": test_vectors["base_face"]},
        {"student_id": 102, "name": "Kabir", "face_embedding": test_vectors["diff_face"]}
    ]

    with patch("src.services.vector_search_service.supabase") as mock_sb, \
         patch("src.services.vector_search_service.get_enrolled", return_value=mock_students):
        mock_sb.table().select().execute.return_value.data = []

        res = svc.search_face(query_embedding=test_vectors["base_face"], subject_id=1)
        assert res is not None
        assert res["matched"] is True
        assert res["student_id"] == 101
        assert res["distance"] < 0.001
        assert res["confidence"] >= 99.0
        assert res["is_ambiguous"] is False

def test_search_face_no_match_above_threshold(test_vectors):
    svc = VectorSearchService()
    svc.enabled = False

    mock_students = [
        {"student_id": 102, "name": "Kabir", "face_embedding": test_vectors["diff_face"]}
    ]

    with patch("src.services.vector_search_service.supabase") as mock_sb, \
         patch("src.services.vector_search_service.get_enrolled", return_value=mock_students):
        mock_sb.table().select().execute.return_value.data = []

        res = svc.search_face(query_embedding=test_vectors["base_face"], subject_id=1, threshold=0.60)
        assert res is None # Distance is ~1.4, strictly above threshold 0.60

# ================= 3. MARGIN AMBIGUITY CHECK TESTS =================

def test_margin_check_rejects_ambiguous_lookalikes():
    svc = VectorSearchService()
    
    # Candidate 1: Student A with distance 0.38
    # Candidate 2: Student B with distance 0.40 (margin is 0.02, < min_margin 0.05)
    candidates = [
        {"student_id": 201, "distance": 0.38, "quality": 1.0},
        {"student_id": 202, "distance": 0.40, "quality": 1.0}
    ]

    res = svc._evaluate_candidates(candidates, threshold=0.60, min_margin=0.05, modality="face")
    assert res is not None
    assert res["matched"] is False
    assert res["is_ambiguous"] is True
    assert "Ambiguous match" in res["reason"]
    assert res["margin"] == 0.02

def test_margin_check_allows_multiple_embeddings_of_same_student():
    svc = VectorSearchService()
    
    # Candidate 1: Student A (Photo 1) with distance 0.25
    # Candidate 2: Student A (Photo 2) with distance 0.27
    # Both belong to the SAME student_id (201)! Margin check must NOT reject!
    candidates = [
        {"student_id": 201, "distance": 0.25, "quality": 1.0},
        {"student_id": 201, "distance": 0.27, "quality": 1.0}
    ]

    res = svc._evaluate_candidates(candidates, threshold=0.60, min_margin=0.05, modality="face")
    assert res is not None
    assert res["matched"] is True
    assert res["student_id"] == 201
    assert res["is_ambiguous"] is False

# ================= 4. SUBJECT ENROLLMENT SCOPING TESTS =================

def test_subject_scoping_prevents_cross_class_match(test_vectors):
    svc = VectorSearchService()
    svc.enabled = False

    # Student 101 has the target face, but is ONLY enrolled in Subject 1 (CS101), NOT Subject 2 (EC201).
    with patch("src.services.vector_search_service.supabase") as mock_sb, \
         patch("src.services.vector_search_service.get_enrolled") as mock_get_enrolled:
        mock_sb.table().select().execute.return_value.data = []

        # When searching in Subject 2, enrolled list does NOT contain Student 101
        mock_get_enrolled.return_value = [
            {"student_id": 999, "name": "Other", "face_embedding": test_vectors["diff_face"]}
        ]

        res = svc.search_face(query_embedding=test_vectors["base_face"], subject_id=2)
        assert res is None # Correctly rejected because Student 101 is not in Subject 2!

# ================= 5. VOICE VECTOR (256-D) COSINE DISTANCE TESTS =================

def test_search_voice_cosine(test_vectors):
    svc = VectorSearchService()
    svc.enabled = False

    mock_students = [
        {"student_id": 301, "name": "Priya", "voice_embedding": test_vectors["base_voice"]}
    ]

    with patch("src.services.vector_search_service.supabase") as mock_sb, \
         patch("src.services.vector_search_service.get_enrolled", return_value=mock_students):
        mock_sb.table().select().execute.return_value.data = []

        res = svc.search_voice(query_embedding=test_vectors["similar_voice"], subject_id=1)
        assert res is not None
        assert res["matched"] is True
        assert res["student_id"] == 301
        assert res["distance"] <= 0.30 # Satisfies default voice cosine threshold (0.30)
