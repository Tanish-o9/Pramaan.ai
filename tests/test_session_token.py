import pytest
import time
from src.services.session_token_service import (
    generate_session_code,
    generate_qr_payload,
    validate_session_code,
    clear_used_nonces,
    STEP_SECONDS
)

def setup_function():
    clear_used_nonces()

def test_code_generation_format():
    code = generate_session_code(subject_id=501, teacher_id=999)
    assert isinstance(code, str)
    assert len(code) == 6
    assert code.isupper()
    assert code.isalnum()

def test_qr_payload_structure():
    t_fixed = 1700000000.0
    payload = generate_qr_payload(subject_id=501, teacher_id=999, timestamp=t_fixed)
    assert payload["subject_id"] == 501
    assert payload["teacher_id"] == 999
    assert len(payload["code"]) == 6
    assert payload["expires_at"] > t_fixed
    assert payload["valid_seconds"] > 0

def test_valid_code_accepted():
    t_fixed = 1700000000.0
    code = generate_session_code(subject_id=501, teacher_id=999, timestamp=t_fixed)
    is_valid, msg = validate_session_code(code, subject_id=501, teacher_id=999, current_timestamp=t_fixed)
    assert is_valid is True
    assert "verified" in msg.lower()

def test_expired_code_rejected():
    t_fixed = 1700000000.0
    code = generate_session_code(subject_id=501, teacher_id=999, timestamp=t_fixed)
    # Fast-forward 20 minutes (1200 seconds, beyond the 900-second 15 min window + grace)
    is_valid, msg = validate_session_code(
        code,
        subject_id=501,
        teacher_id=999,
        current_timestamp=t_fixed + 1200.0,
        allow_grace_period_seconds=60
    )
    assert is_valid is False
    assert "expired" in msg.lower()

def test_tampered_code_rejected():
    t_fixed = 1700000000.0
    is_valid, msg = validate_session_code("FAKE99", subject_id=501, teacher_id=999, current_timestamp=t_fixed)
    assert is_valid is False

def test_wrong_subject_or_teacher_rejected():
    t_fixed = 1700000000.0
    code_sub_501 = generate_session_code(subject_id=501, teacher_id=999, timestamp=t_fixed)
    # Attempt to submit code 501 for subject 502
    is_valid, msg = validate_session_code(code_sub_501, subject_id=502, teacher_id=999, current_timestamp=t_fixed)
    assert is_valid is False

def test_replay_protection_prevents_double_marking():
    t_fixed = 1700000000.0
    code = generate_session_code(subject_id=501, teacher_id=999, timestamp=t_fixed)

    # First attempt: success
    valid1, _ = validate_session_code(code, subject_id=501, teacher_id=999, student_id=101, current_timestamp=t_fixed)
    assert valid1 is True

    # Immediate second attempt by same student in same window: rejected as replay
    valid2, msg2 = validate_session_code(code, subject_id=501, teacher_id=999, student_id=101, current_timestamp=t_fixed)
    assert valid2 is False
    assert "already submitted" in msg2.lower()

    # Different student: allowed
    valid3, _ = validate_session_code(code, subject_id=501, teacher_id=999, student_id=102, current_timestamp=t_fixed)
    assert valid3 is True

