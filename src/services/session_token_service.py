"""
Anti-Proxy Rotating Session Token Service for Pramaan.
Generates and validates time-bound (15-minute window) anti-proxy session codes and QR payloads.
"""
import hashlib
import hmac
import time
from typing import Any, Dict, Set, Tuple

from src.core.config import settings

STEP_SECONDS = 900  # 15 minutes window

# In-memory store for tracking used tokens to prevent replay / double marking
_used_token_nonces: Set[str] = set()

def _get_time_step(timestamp: float = None) -> int:
    t = timestamp if timestamp is not None else time.time()
    return int(t // STEP_SECONDS)

def generate_session_code(subject_id: int, teacher_id: int, timestamp: float = None) -> str:
    """
    Generates a 6-character rotating alphanumeric code for the subject and 15-minute window.
    """
    step = _get_time_step(timestamp)
    secret_key = getattr(settings, 'SECRET_KEY', getattr(settings, 'JWT_SECRET_KEY', 'default_secret'))
    secret = secret_key.encode('utf-8')
    message = f"{subject_id}:{teacher_id}:{step}".encode('utf-8')
    h = hmac.new(secret, message, hashlib.sha256).hexdigest()
    # 6-character uppercase alphanumeric code
    return h[:6].upper()

def generate_qr_payload(subject_id: int, teacher_id: int, timestamp: float = None) -> Dict[str, Any]:
    """
    Generates full signed JSON payload suitable for QR join screens.
    """
    step = _get_time_step(timestamp)
    code = generate_session_code(subject_id, teacher_id, timestamp)
    expires_at = (step + 1) * STEP_SECONDS
    return {
        "subject_id": subject_id,
        "teacher_id": teacher_id,
        "code": code,
        "step": step,
        "expires_at": expires_at,
        "valid_seconds": max(0, int(expires_at - (timestamp or time.time())))
    }

def validate_session_code(
    submitted_code: str,
    subject_id: int,
    teacher_id: int,
    student_id: int = None,
    current_timestamp: float = None,
    allow_grace_period_seconds: int = 60
) -> Tuple[bool, str]:
    """
    Validates the submitted session code against current and immediate previous time step.
    Enforces expiry, tampering prevention, and replay rejection.
    """
    if not submitted_code or len(submitted_code.strip()) != 6:
        return False, "Invalid session code format (must be 6 alphanumeric characters)"

    clean_code = submitted_code.strip().upper()
    now = current_timestamp if current_timestamp is not None else time.time()
    current_step = _get_time_step(now)

    # Check current window
    expected_code = generate_session_code(subject_id, teacher_id, now)
    valid = hmac.compare_digest(clean_code, expected_code)

    # If within grace period at boundary, check previous step
    if not valid and allow_grace_period_seconds > 0:
        elapsed_in_step = now % STEP_SECONDS
        if elapsed_in_step < allow_grace_period_seconds:
            prev_code = generate_session_code(subject_id, teacher_id, now - STEP_SECONDS)
            if hmac.compare_digest(clean_code, prev_code):
                valid = True

    if not valid:
        return False, "Session code is expired, invalid, or belongs to another class"

    # Anti-replay check if student_id is provided
    if student_id is not None:
        nonce = f"{subject_id}:{current_step}:{student_id}"
        if nonce in _used_token_nonces:
            return False, "Attendance already submitted for this 15-minute session window"
        _used_token_nonces.add(nonce)

    return True, "Session code verified"

def clear_used_nonces():
    """Testing helper to clear replay nonces."""
    _used_token_nonces.clear()
