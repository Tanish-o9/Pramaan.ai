"""
Mid-Class Random Pulse Check Service for Pramaan / Presence.ai.
Triggers random liveness and face verification prompts during active lectures
to eliminate class-abandonment proxy loopholes.
"""
import random
import time
import uuid
from typing import Any, Dict, List, Optional


class PulseCheckService:
    def __init__(self, default_duration_sec: int = 120):
        self.default_duration_sec = default_duration_sec
        # In-memory storage for active and recent pulse sessions
        # Key: pulse_id -> PulseSession dict
        self._sessions: Dict[str, Dict[str, Any]] = {}
        # Subject to active pulse_id map
        self._subject_active_pulse: Dict[int, str] = {}

    def trigger_pulse(self, subject_id: int, enrolled_students: List[Dict[str, Any]], sample_size: int = 3) -> Dict[str, Any]:
        """
        Triggers a new random pulse check for a lecture.
        Picks random enrolled students and opens a 2-minute verification window.
        """
        if not enrolled_students:
            return {"success": False, "error": "No students enrolled in subject"}

        # Select random sample
        k = min(len(enrolled_students), max(1, sample_size))
        selected = random.sample(enrolled_students, k)

        pulse_id = f"pulse_{uuid.uuid4().hex[:10]}"
        now = int(time.time())
        expires_at = now + self.default_duration_sec

        session = {
            "pulse_id": pulse_id,
            "subject_id": subject_id,
            "created_at": now,
            "expires_at": expires_at,
            "duration_sec": self.default_duration_sec,
            "status": "ACTIVE",
            "targets": [
                {
                    "student_id": s.get("student_id"),
                    "name": s.get("name"),
                    "roll_number": s.get("roll_number"),
                    "status": "PENDING", # PENDING | VERIFIED | MISSED | FAILED
                    "verified_at": None,
                    "notes": ""
                }
                for s in selected
            ]
        }

        self._sessions[pulse_id] = session
        self._subject_active_pulse[subject_id] = pulse_id

        return {
            "success": True,
            "pulse_id": pulse_id,
            "subject_id": subject_id,
            "selected_count": k,
            "expires_at": expires_at,
            "duration_sec": self.default_duration_sec,
            "targets": session["targets"]
        }

    def get_active_pulse_for_student(self, student_id: int) -> Optional[Dict[str, Any]]:
        """
        Checks if a student has an unexpired, pending pulse check.
        """
        now = int(time.time())
        for pulse_id, session in list(self._sessions.items()):
            if session["status"] == "ACTIVE":
                if now > session["expires_at"]:
                    # Auto-expire
                    session["status"] = "EXPIRED"
                    for t in session["targets"]:
                        if t["status"] == "PENDING":
                            t["status"] = "MISSED"
                    continue

                for t in session["targets"]:
                    if t["student_id"] == student_id and t["status"] == "PENDING":
                        return {
                            "pulse_id": pulse_id,
                            "subject_id": session["subject_id"],
                            "expires_at": session["expires_at"],
                            "seconds_remaining": max(0, session["expires_at"] - now),
                            "duration_sec": session["duration_sec"]
                        }
        return None

    def respond_to_pulse(self, pulse_id: str, student_id: int, is_verified: bool, remarks: str = "") -> Dict[str, Any]:
        """
        Records the student's face check response for the pulse session.
        """
        session = self._sessions.get(pulse_id)
        if not session:
            return {"success": False, "error": "Pulse check session not found"}

        now = int(time.time())
        if now > session["expires_at"]:
            return {"success": False, "error": "Pulse check window has expired"}

        for t in session["targets"]:
            if t["student_id"] == student_id:
                t["status"] = "VERIFIED" if is_verified else "FAILED"
                t["verified_at"] = now
                t["notes"] = remarks or ("Verified live on camera" if is_verified else "Face mismatch or liveness failed")
                return {
                    "success": True,
                    "status": t["status"],
                    "verified_at": now,
                    "notes": t["notes"]
                }

        return {"success": False, "error": "Student was not part of this pulse check"}

    def get_pulse_status(self, pulse_id: str) -> Dict[str, Any]:
        """
        Returns full status of a pulse check session.
        """
        session = self._sessions.get(pulse_id)
        if not session:
            return {"success": False, "error": "Pulse check session not found"}

        now = int(time.time())
        if session["status"] == "ACTIVE" and now > session["expires_at"]:
            session["status"] = "EXPIRED"
            for t in session["targets"]:
                if t["status"] == "PENDING":
                    t["status"] = "MISSED"

        return {
            "success": True,
            "session": session,
            "seconds_remaining": max(0, session["expires_at"] - now) if session["status"] == "ACTIVE" else 0
        }

    def get_subject_pulse_history(self, subject_id: int) -> List[Dict[str, Any]]:
        """Returns recent pulse sessions for a subject."""
        return [
            s for s in self._sessions.values()
            if s.get("subject_id") == subject_id
        ]

pulse_check_service = PulseCheckService()

