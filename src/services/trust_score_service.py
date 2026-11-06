"""
Trust Score Engine for Pramaan Attendance Verification.
Computes a multi-factor confidence rating (0-100) per attendance event.
"""
from typing import Any, Dict, Optional

DEFAULT_WEIGHTS = {
    "face_match": 35.0,
    "liveness": 20.0,
    "voice_match": 15.0,
    "session_code": 15.0,
    "geofence_ip": 10.0,
    "device_fingerprint": 5.0,
}

DEFAULT_THRESHOLDS = {
    "high_trust": 80,    # Score >= 80 -> Auto-accepted
    "medium_trust": 50,  # Score 50..79 -> Needs teacher review
                         # Score < 50 -> Flagged / Rejected
}

class TrustScoreEngine:
    def __init__(self, weights: Optional[Dict[str, float]] = None, thresholds: Optional[Dict[str, int]] = None):
        self.weights = weights.copy() if weights else DEFAULT_WEIGHTS.copy()
        self.thresholds = thresholds.copy() if thresholds else DEFAULT_THRESHOLDS.copy()

    def update_config(self, weights: Optional[Dict[str, float]] = None, thresholds: Optional[Dict[str, int]] = None):
        if weights:
            self.weights.update(weights)
        if thresholds:
            self.thresholds.update(thresholds)

    def calculate(
        self,
        face_confidence: float = 0.0,       # 0.0 to 1.0 (or 0 to 100)
        liveness_passed: bool = True,
        liveness_score: float = 1.0,        # 0.0 to 1.0
        voice_confidence: Optional[float] = None, # 0.0 to 1.0 or None if unused
        session_code_valid: bool = True,
        ip_matched: bool = True,
        device_known: bool = True,
        time_offset_seconds: float = 0.0,   # Seconds into session
        session_window_seconds: float = 900.0, # 15 min window
    ) -> Dict[str, Any]:
        """
        Calculates normalized trust score (0-100), factor breakdown, and explanation string.
        """
        # Normalize face confidence to 0..1 scale
        face_norm = face_confidence / 100.0 if face_confidence > 1.0 else max(0.0, min(1.0, face_confidence))

        # Dynamic weight adjustment if voice is not part of this modality
        active_weights = self.weights.copy()
        if voice_confidence is None:
            # Re-distribute voice weight proportionally to face and liveness
            voice_wt = active_weights.pop("voice_match", 15.0)
            active_weights["face_match"] += voice_wt * 0.70
            active_weights["liveness"] += voice_wt * 0.30

        total_weight = sum(active_weights.values())

        # 1. Face Match Subscore (0 to active_weights["face_match"])
        # Non-linear boost for high confidence (> 0.85), steep falloff below 0.50
        if face_norm >= 0.85:
            face_ratio = 1.0
        elif face_norm >= 0.60:
            face_ratio = 0.75 + (face_norm - 0.60) / 0.25 * 0.25
        elif face_norm >= 0.40:
            face_ratio = 0.40 + (face_norm - 0.40) / 0.20 * 0.35
        else:
            face_ratio = max(0.0, face_norm / 0.40 * 0.40)
        score_face = face_ratio * active_weights["face_match"]

        # 2. Liveness Subscore
        score_liveness = 0.0
        if liveness_passed:
            score_liveness = max(0.0, min(1.0, liveness_score)) * active_weights["liveness"]

        # 3. Voice Match Subscore (if used)
        score_voice = 0.0
        if voice_confidence is not None:
            voice_norm = voice_confidence / 100.0 if voice_confidence > 1.0 else max(0.0, min(1.0, voice_confidence))
            score_voice = voice_norm * active_weights.get("voice_match", 15.0)

        # 4. Session Code Subscore
        score_session = active_weights["session_code"] if session_code_valid else 0.0

        # Time-in-window modifier (if within session, on-time bonus vs last-minute penalty)
        if session_code_valid and session_window_seconds > 0:
            if time_offset_seconds > (session_window_seconds * 0.90):
                # Marked in the final 10% of window: mild 10% deduction on session score
                score_session *= 0.90

        # 5. Geofence / IP Subscore
        score_ip = active_weights["geofence_ip"] if ip_matched else (active_weights["geofence_ip"] * 0.3)

        # 6. Device Fingerprint Subscore
        score_device = active_weights["device_fingerprint"] if device_known else 0.0

        # Total Raw Score
        raw_score = score_face + score_liveness + score_voice + score_session + score_ip + score_device
        trust_score = int(round((raw_score / total_weight) * 100))
        trust_score = max(0, min(100, trust_score))

        # Status determination
        if trust_score >= self.thresholds["high_trust"]:
            status = "auto_accepted"
        elif trust_score >= self.thresholds["medium_trust"]:
            status = "needs_review"
        else:
            status = "flagged"

        # Construct human-readable explanation
        explanations = []
        explanations.append(f"Face {round(face_norm * 100)}%")
        explanations.append("Liveness OK" if liveness_passed else "Liveness Failed")
        if voice_confidence is not None:
            v_pct = round(voice_confidence * 100 if voice_confidence <= 1.0 else voice_confidence)
            explanations.append(f"Voice {v_pct}%")
        explanations.append("Valid Session" if session_code_valid else "Expired/Invalid Code")
        explanations.append("Campus IP" if ip_matched else "External IP")
        explanations.append("Known Device" if device_known else "New Device")

        status_labels = {
            "auto_accepted": "Auto-Accepted",
            "needs_review": "Needs Faculty Review",
            "flagged": "Flagged (Suspicious)"
        }
        explanation_str = f"{', '.join(explanations)}: Trust Score {trust_score}/100 ({status_labels[status]})"

        breakdown = {
            "face_score": round(score_face, 1),
            "face_max": round(active_weights["face_match"], 1),
            "liveness_score": round(score_liveness, 1),
            "liveness_max": round(active_weights["liveness"], 1),
            "voice_score": round(score_voice, 1) if voice_confidence is not None else None,
            "session_score": round(score_session, 1),
            "ip_score": round(score_ip, 1),
            "device_score": round(score_device, 1),
            "weights_used": {k: round(v, 1) for k, v in active_weights.items()},
        }

        return {
            "trust_score": trust_score,
            "verification_status": status,
            "breakdown": breakdown,
            "explanation": explanation_str
        }

# Global singleton engine
trust_engine = TrustScoreEngine()
