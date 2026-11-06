import pytest
from fastapi.testclient import TestClient

from server import app
from src.auth import create_access_token


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def teacher_headers():
    token = create_access_token(
        {"user_id": 999, "role": "teacher", "email": "faculty@pramaan.edu", "name": "Prof. Turing"}
    )
    return {"Authorization": f"Bearer {token}", "Cookie": f"access_token={token}"}

@pytest.fixture
def student_headers():
    token = create_access_token(
        {"user_id": 101, "role": "student", "roll_number": "22CS042", "name": "Rahul Sharma"}
    )
    return {"Authorization": f"Bearer {token}", "Cookie": f"access_token={token}"}

# ================= 1. SYSTEM & HEALTH ENDPOINTS =================

def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["app"] == "Pramaan"
    assert "version" in data

def test_ready_endpoint(client):
    res = client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert "models" in data

def test_metrics_prometheus_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "pramaan_requests_total" in res.text
    assert "pramaan_trust_score_avg" in res.text

from unittest.mock import patch

# ================= 2. AUTHENTICATION & RBAC =================

def test_unauthenticated_request_fails(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]

@patch("server.get_teacher_by_id")
def test_auth_me_with_teacher_token(mock_get_teacher, client, teacher_headers):
    mock_get_teacher.return_value = {"teacher_id": 999, "name": "Prof. Turing", "email": "faculty@pramaan.edu"}
    res = client.get("/api/auth/me", headers=teacher_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "teacher"
    assert data["profile"]["name"] == "Prof. Turing"

@patch("server.get_student_by_id")
def test_auth_me_with_student_token(mock_get_student, client, student_headers):
    mock_get_student.return_value = {"student_id": 101, "name": "Rahul Sharma", "roll_number": "22CS042"}
    res = client.get("/api/auth/me", headers=student_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "student"
    assert data["profile"]["roll_number"] == "22CS042"

def test_role_enforcement_student_forbidden_from_teacher_route(client, student_headers):
    # A student attempting to access faculty-only subject endpoints
    res = client.get("/api/teacher/subjects", headers=student_headers)
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

def test_role_enforcement_teacher_forbidden_from_student_route(client, teacher_headers):
    # A teacher attempting to access student-only voice-enroll route
    res = client.post("/api/student/voice-enroll", headers=teacher_headers)
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

def test_idor_protection_student_cannot_access_other_student_dashboard(client, student_headers):
    # Student ID 101 attempting to inspect Student ID 999's dashboard
    res = client.get("/api/student/dashboard/999", headers=student_headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

# ================= 3. SETTINGS & TRUST SCORE ENDPOINTS =================

def test_get_settings_teacher_access(client, teacher_headers):
    res = client.get("/api/settings", headers=teacher_headers)
    assert res.status_code == 200
    data = res.json()
    assert "settings" in data
    assert "face_match_threshold" in data["settings"]
    assert "trust_score" in data["settings"]

def test_get_and_update_trust_score_settings(client, teacher_headers):
    # Get trust settings
    res = client.get("/api/settings/trust-score", headers=teacher_headers)
    assert res.status_code == 200
    initial = res.json()
    assert "weights" in initial
    assert "thresholds" in initial

    # Update trust settings
    payload = {
        "weights": {"face_match": 40.0, "liveness": 25.0},
        "thresholds": {"high_trust": 82, "medium_trust": 52}
    }
    update_res = client.post("/api/settings/trust-score", json=payload, headers=teacher_headers)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["thresholds"]["high_trust"] == 82

# ================= 4. ATTENDANCE WORKFLOW ENDPOINTS =================

def test_export_csv_nonexistent_subject_returns_404(client, teacher_headers):
    res = client.get("/api/attendance/export/csv/999999", headers=teacher_headers)
    assert res.status_code == 404
    assert "No attendance records found" in res.json()["detail"]

def test_validation_error_on_invalid_subject_creation(client, teacher_headers):
    # Missing required body fields should return 422 Unprocessable Entity
    res = client.post("/api/teacher/subjects", json={}, headers=teacher_headers)
    assert res.status_code == 422

@patch("server.create_attendance")
def test_save_attendance_log_persists_trust_score(mock_create, client, teacher_headers):
    mock_create.return_value = [{"id": 1, "trust_score": 94}]
    payload = {
        "logs": [
            {
                "subject_id": 501,
                "student_id": 101,
                "is_present": True,
                "trust_score": 94,
                "verification_status": "auto_accepted",
                "breakdown": {"face_score": 35.0, "liveness_score": 20.0}
            }
        ]
    }
    res = client.post("/api/attendance/log", json=payload, headers=teacher_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["count"] == 1
    assert mock_create.called
    args, kwargs = mock_create.call_args
    assert args[0][0]["trust_score"] == 94
    assert args[0][0]["verification_status"] == "auto_accepted"
