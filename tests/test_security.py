import io
import time

import jwt
import pytest
from fastapi.testclient import TestClient

from server import app
from src.auth import JWT_SECRET_KEY, create_access_token


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

# ================= 1. JWT INTEGRITY & ALGORITHM ATTACKS =================

def test_jwt_algorithm_none_rejected(client):
    # Attacker crafts an unsigned token with algorithm 'none'
    header = {"alg": "none", "typ": "JWT"}
    payload = {"user_id": 1, "role": "teacher", "exp": int(time.time()) + 3600, "type": "access"}
    token = jwt.encode(payload, key="", algorithm="none")

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "Invalid token" in res.json()["detail"]

def test_jwt_signature_tampering_rejected(client):
    # Valid token with payload tampered or signed with different key
    token = create_access_token({"user_id": 101, "role": "student"})
    tampered_token = token[:-4] + "ABCD"

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401

def test_jwt_expired_token_rejected(client):
    # Expired token (exp in the past)
    expired_payload = {
        "user_id": 101,
        "role": "student",
        "exp": int(time.time()) - 300,
        "type": "access"
    }
    expired_token = jwt.encode(expired_payload, JWT_SECRET_KEY, algorithm="HS256")
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "Token has expired" in res.json()["detail"]

def test_refresh_token_cannot_be_used_as_access_token(client):
    # A refresh token payload passed to an endpoint expecting an access token
    refresh_payload = {
        "user_id": 101,
        "role": "student",
        "exp": int(time.time()) + 3600,
        "type": "refresh"
    }
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET_KEY, algorithm="HS256")
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {refresh_token}"})
    assert res.status_code == 401
    assert "Invalid token type" in res.json()["detail"]

# ================= 2. COOKIE SECURITY HEADERS =================

def test_auth_cookies_have_httponly_and_samesite(client):
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    cookies = res.headers.get_list("set-cookie")
    assert len(cookies) > 0
    for cookie_header in cookies:
        assert "httponly" in cookie_header.lower()
        assert "samesite=lax" in cookie_header.lower() or "samesite=strict" in cookie_header.lower()

# ================= 3. INPUT VALIDATION & INJECTION DEFENSES =================

def test_sql_injection_in_roll_number_sanitized(client):
    # SQL injection payload in roll_number parameter
    payload = {
        "roll_number": "22CS042' OR '1'='1",
        "pin": "1234"
    }
    res = client.post("/api/auth/student/login-pin", json=payload)
    # Must fail safely without SQL syntax error (returns 400 or 401)
    assert res.status_code in (400, 401)
    assert "syntax error" not in res.text.lower()

def test_xss_in_student_name_sanitized(client):
    # XSS payload inside registration name
    xss_name = "<script>alert('pwned')</script>"
    with open("tests/fixtures/images/clear_face.jpg", "rb") as f:
        img_bytes = f.read()

    files = {"face_image": ("selfie.jpg", img_bytes, "image/jpeg")}
    data = {"name": xss_name, "roll_number": "22CS999", "pin": "1234"}
    res = client.post("/api/auth/student/register", data=data, files=files)
    # The response must not execute raw HTML
    assert "<script>" not in res.headers.get("content-type", "")

# ================= 4. IDOR & ROLE ESCALATION DEFENSES =================

def test_student_cannot_delete_faculty_subject(client):
    student_token = create_access_token({"user_id": 101, "role": "student"})
    res = client.delete("/api/teacher/subjects/501", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403

def test_student_cannot_override_attendance(client):
    student_token = create_access_token({"user_id": 101, "role": "student"})
    res = client.post("/api/attendance/override", json={"log_id": 1, "is_present": True}, headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403

def test_student_cannot_inspect_faculty_settings(client):
    student_token = create_access_token({"user_id": 101, "role": "student"})
    res = client.get("/api/settings", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403
