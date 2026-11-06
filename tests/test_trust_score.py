import pytest
from src.services.trust_score_service import TrustScoreEngine, trust_engine

def test_high_trust_auto_accepted():
    engine = TrustScoreEngine()
    result = engine.calculate(
        face_confidence=0.95,
        liveness_passed=True,
        liveness_score=1.0,
        session_code_valid=True,
        ip_matched=True,
        device_known=True
    )
    assert result["trust_score"] >= 85
    assert result["verification_status"] == "auto_accepted"
    assert "Auto-Accepted" in result["explanation"]
    assert "Face 95%" in result["explanation"]

def test_medium_trust_needs_review():
    engine = TrustScoreEngine()
    # Face match moderate, but unknown device and external IP
    result = engine.calculate(
        face_confidence=0.62,
        liveness_passed=True,
        liveness_score=0.8,
        session_code_valid=True,
        ip_matched=False,
        device_known=False
    )
    assert 50 <= result["trust_score"] < 80
    assert result["verification_status"] == "needs_review"
    assert "Needs Faculty Review" in result["explanation"]
    assert "New Device" in result["explanation"]

def test_low_trust_flagged():
    engine = TrustScoreEngine()
    # Low face confidence, liveness failed, invalid session
    result = engine.calculate(
        face_confidence=0.30,
        liveness_passed=False,
        liveness_score=0.0,
        session_code_valid=False,
        ip_matched=False,
        device_known=False
    )
    assert result["trust_score"] < 50
    assert result["verification_status"] == "flagged"
    assert "Flagged" in result["explanation"]
    assert "Liveness Failed" in result["explanation"]

def test_multi_modal_with_voice():
    engine = TrustScoreEngine()
    result = engine.calculate(
        face_confidence=0.90,
        liveness_passed=True,
        voice_confidence=0.88,
        session_code_valid=True,
        ip_matched=True,
        device_known=True
    )
    assert result["trust_score"] >= 85
    assert result["breakdown"]["voice_score"] is not None
    assert "Voice 88%" in result["explanation"]

def test_custom_thresholds():
    # If high trust is set to 95, a score of 88 will be needs_review
    engine = TrustScoreEngine(thresholds={"high_trust": 95, "medium_trust": 60})
    result = engine.calculate(
        face_confidence=0.80,
        liveness_passed=True,
        session_code_valid=True,
        ip_matched=True,
        device_known=False
    )
    assert result["verification_status"] == "needs_review"

def test_singleton_engine_export():
    res = trust_engine.calculate(face_confidence=0.92)
    assert "trust_score" in res
    assert "breakdown" in res

def test_time_in_window_penalty():
    engine = TrustScoreEngine()
    # On-time early submission
    early = engine.calculate(face_confidence=0.9, session_code_valid=True, time_offset_seconds=60, session_window_seconds=900)
    # Late submission (in the final 5% of window, e.g. at 850s)
    late = engine.calculate(face_confidence=0.9, session_code_valid=True, time_offset_seconds=850, session_window_seconds=900)
    assert early["trust_score"] >= late["trust_score"]

def test_custom_weight_reallocation():
    engine = TrustScoreEngine()
    engine.update_config(weights={"face_match": 50.0, "liveness": 25.0})
    res = engine.calculate(face_confidence=0.95, liveness_passed=True)
    assert res["trust_score"] >= 80

