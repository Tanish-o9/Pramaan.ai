"""
Unit Tests for New Ecosystem Add-ons:
1. Dynamic Digital ID Service (HMAC rotation & tampering detection)
2. Voice Command Roll-Call Service (English & Hinglish speech parsing)
3. Mid-Class Pulse Check Service (Random sampling & response window)
4. Classroom Seat Map Service (Grid arrangement & spatial assignment)
5. HoD Governance & Defaulter Notice Generation
"""

import time
import pytest
from src.services.digital_id_service import DigitalIdService, digital_id_service
from src.services.voice_command_service import VoiceCommandService, voice_command_service
from src.services.pulse_check_service import PulseCheckService, pulse_check_service
from src.services.seatmap_service import SeatmapService, seatmap_service
from src.services.hod_service import HodService, hod_service

# ================= 1. DIGITAL ID TESTS =================

def test_digital_id_generation_and_verification():
    svc = DigitalIdService(token_validity_sec=60)
    data = svc.generate_token(student_id=42, roll_number="21CS042", name="Rohan Sharma")

    assert data["student_id"] == 42
    assert data["roll_number"] == "21CS042"
    assert data["token"].startswith("PRM.")

    # Verify token
    verification = svc.verify_token(data["token"])
    assert verification["valid"] is True
    assert verification["student_id"] == 42
    assert verification["roll_number"] == "21CS042"
    assert verification["seconds_remaining"] > 0

def test_digital_id_tampered_token_rejected():
    svc = DigitalIdService()
    data = svc.generate_token(student_id=1, roll_number="21CS001", name="Alice")
    
    # Tamper with the payload string
    tampered = data["token"][:-4] + "ABCD"
    verification = svc.verify_token(tampered)
    assert verification["valid"] is False
    assert "tampered" in verification["error"].lower() or "signature" in verification["error"].lower()

def test_digital_id_expired_token():
    # Service with 1 second expiry
    svc = DigitalIdService(token_validity_sec=-20)
    data = svc.generate_token(student_id=2, roll_number="21CS002", name="Bob")

    verification = svc.verify_token(data["token"])
    assert verification["valid"] is False
    assert "expired" in verification["error"].lower()

# ================= 2. VOICE COMMAND TESTS =================

def test_voice_command_all_present_except():
    svc = VoiceCommandService()
    students = [
        {"student_id": 1, "name": "Aarav", "roll_number": "21CS001"},
        {"student_id": 2, "name": "Bhavna", "roll_number": "21CS002"},
        {"student_id": 3, "name": "Chetan", "roll_number": "21CS003"},
        {"student_id": 4, "name": "Divya", "roll_number": "21CS004"}
    ]

    res = svc.parse_command("Mark all present except roll 2 and 4", students)
    assert res["success"] is True
    assert res["present_count"] == 2
    assert res["absent_count"] == 2
    present_ids = {s["student_id"] for s in res["present_students"]}
    assert present_ids == {1, 3}

def test_voice_command_hinglish():
    svc = VoiceCommandService()
    students = [
        {"student_id": 11, "name": "Karan", "roll_number": "21CS011"},
        {"student_id": 12, "name": "Lakshay", "roll_number": "21CS012"},
        {"student_id": 15, "name": "Manish", "roll_number": "21CS015"},
    ]

    res = svc.parse_command("Sabhi present hain sirf barah absent", students)
    assert res["success"] is True
    present_ids = {s["student_id"] for s in res["present_students"]}
    absent_ids = {s["student_id"] for s in res["absent_students"]}
    assert 12 in absent_ids
    assert 11 in present_ids

# ================= 3. PULSE CHECK TESTS =================

def test_pulse_check_trigger_and_response():
    svc = PulseCheckService(default_duration_sec=120)
    students = [
        {"student_id": 101, "name": "Priya", "roll_number": "21CS101"},
        {"student_id": 102, "name": "Qadir", "roll_number": "21CS102"},
        {"student_id": 103, "name": "Rani", "roll_number": "21CS103"},
    ]

    session = svc.trigger_pulse(subject_id=99, enrolled_students=students, sample_size=2)
    assert session["success"] is True
    assert session["selected_count"] == 2
    pulse_id = session["pulse_id"]

    target_id = session["targets"][0]["student_id"]
    active = svc.get_active_pulse_for_student(target_id)
    assert active is not None
    assert active["pulse_id"] == pulse_id

    # Respond to pulse
    resp = svc.respond_to_pulse(pulse_id, target_id, is_verified=True, remarks="Test verified")
    assert resp["success"] is True
    assert resp["status"] == "VERIFIED"

# ================= 4. SEAT MAP TESTS =================

def test_seatmap_creation_and_auto_arrange():
    svc = SeatmapService()
    students = [
        {"student_id": 1, "name": "Zoya", "roll_number": "21CS099", "is_present": True},
        {"student_id": 2, "name": "Amit", "roll_number": "21CS001", "is_present": False},
    ]

    m = svc.get_or_create_seatmap(subject_id=5, rows=2, cols=3, enrolled_students=students)
    assert m["total_seats"] == 6
    assert len(m["seats"]) == 6

    # Auto-arrange by roll number
    arranged = svc.auto_arrange(subject_id=5, enrolled_students=students, order_by="roll")
    first_desk = arranged["seats"][0]["student"]
    assert first_desk["roll_number"] == "21CS001" # Amit comes first by roll

# ================= 5. HOD GOVERNANCE TESTS =================

def test_hod_summary_and_defaulter_notice():
    svc = HodService(default_threshold=75.0)
    subjects = [
        {
            "subject_id": 1,
            "name": "Database Management Systems",
            "subject_code": "CS301",
            "section": "A",
            "students": [
                {
                    "student_id": 1,
                    "name": "Kavita",
                    "roll_number": "21CS001",
                    "logs": [{"is_present": True}, {"is_present": True}, {"is_present": True}]
                },
                {
                    "student_id": 2,
                    "name": "Sameer",
                    "roll_number": "21CS002",
                    "logs": [{"is_present": True}, {"is_present": False}, {"is_present": False}, {"is_present": False}] # 25%
                }
            ]
        }
    ]

    summary = svc.calculate_department_summary(subjects)
    assert summary["defaulters_count"] == 1
    assert summary["defaulters"][0]["roll_number"] == "21CS002"

    html = svc.generate_defaulter_notice_html(summary["defaulters"])
    assert "OFFICIAL ATTENDANCE DEFAULTER NOTICE" in html
    assert "21CS002" in html
    assert "Sameer" in html

