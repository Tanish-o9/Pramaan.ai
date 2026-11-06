"""
Digital ID Service for Pramaan / Presence.ai.
Provides cryptographically signed, rotating dynamic student ID tokens
with HMAC-SHA256 verification and anti-screenshot rotation.
"""
import base64
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional

from src.core.config import settings


class DigitalIdService:
    def __init__(self, secret_key: Optional[str] = None, token_validity_sec: int = 60):
        self.secret_key = (secret_key or settings.JWT_SECRET_KEY).encode("utf-8")
        self.token_validity_sec = token_validity_sec

    def generate_token(self, student_id: int, roll_number: str, name: str, department: str = "Computer Science") -> Dict[str, Any]:
        """
        Generates a signed, short-lived digital student ID payload.
        Rotates automatically every `token_validity_sec` seconds.
        """
        now = int(time.time())
        expires_at = now + self.token_validity_sec

        payload = {
            "sub": "pramaan_digital_id",
            "sid": student_id,
            "roll": roll_number,
            "name": name,
            "dept": department,
            "iat": now,
            "exp": expires_at,
        }

        payload_bytes = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode("utf-8")
        b64_payload = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")

        signature = hmac.new(self.secret_key, b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        signed_token = f"PRM.{b64_payload}.{signature[:24]}"

        return {
            "token": signed_token,
            "student_id": student_id,
            "roll_number": roll_number,
            "name": name,
            "department": department,
            "issued_at": now,
            "expires_at": expires_at,
            "ttl_seconds": self.token_validity_sec
        }

    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verifies a dynamic digital ID token's HMAC signature and clock freshness.
        """
        try:
            parts = token.strip().split(".")
            if len(parts) != 3 or parts[0] != "PRM":
                return {"valid": False, "error": "Invalid token format"}

            b64_payload, signature = parts[1], parts[2]

            # Recompute signature
            expected_sig = hmac.new(self.secret_key, b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()[:24]
            if not hmac.compare_digest(signature, expected_sig):
                return {"valid": False, "error": "Cryptographic signature mismatch (tampered token)"}

            # Decode payload
            padding = "=" * (4 - (len(b64_payload) % 4))
            raw_json = base64.urlsafe_b64decode(b64_payload + padding).decode("utf-8")
            payload = json.loads(raw_json)

            now = int(time.time())
            exp = payload.get("exp", 0)

            # Allow 15s clock drift
            if now > exp + 15:
                return {
                    "valid": False,
                    "error": f"Token expired {now - exp}s ago. Please refresh the digital ID.",
                    "student_id": payload.get("sid"),
                    "roll_number": payload.get("roll")
                }

            return {
                "valid": True,
                "student_id": payload.get("sid"),
                "roll_number": payload.get("roll"),
                "name": payload.get("name"),
                "department": payload.get("dept"),
                "issued_at": payload.get("iat"),
                "expires_at": exp,
                "seconds_remaining": max(0, exp - now)
            }
        except Exception as e:
            return {"valid": False, "error": f"Verification error: {str(e)}"}

digital_id_service = DigitalIdService()

