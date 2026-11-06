"""
Voice Command Roll-Call Parsing Service for Pramaan / Presence.ai.
Supports English, Hindi, and Hinglish spoken commands to mark attendance rosters.
"""
import re
from typing import Any, Dict, List, Set

# Hindi number words mapping
HINDI_NUMBER_WORDS = {
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "panch": 5,
    "chhe": 6, "che": 6, "saat": 7, "sat": 7, "aath": 8, "ath": 8,
    "nau": 9, "das": 10, "gyarah": 11, "barah": 12, "terah": 13,
    "chaudah": 14, "pandrah": 15, "solah": 16, "satrah": 17,
    "athaarah": 18, "unnees": 19, "bees": 20, "ikkees": 21,
    "baees": 22, "teees": 23, "chaubees": 24, "pachhees": 25,
    "chhabbees": 26, "sattaees": 27, "atthaees": 28, "untees": 29, "tees": 30
}

class VoiceCommandService:
    def __init__(self):
        pass

    def _extract_numbers_and_rolls(self, text: str) -> List[str]:
        """Extracts integers and alphanumeric roll numbers from text."""
        tokens = re.split(r'[\s,;:.]+', text.lower())
        results = []
        for token in tokens:
            cleaned = token.strip()
            if not cleaned:
                continue
            if cleaned in HINDI_NUMBER_WORDS:
                results.append(str(HINDI_NUMBER_WORDS[cleaned]))
            elif re.search(r'\d+', cleaned):
                # Could be "12" or "21cs001" or "roll12"
                match = re.search(r'([a-z0-9]+)', cleaned)
                if match:
                    val = match.group(1).replace("roll", "")
                    if val:
                        results.append(val)
        return results

    def parse_command(self, transcript: str, enrolled_students: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Parses a spoken attendance command transcript against enrolled students.
        Returns explicit present and absent student IDs.
        """
        if not transcript or not transcript.strip():
            return {
                "success": False,
                "error": "Empty speech transcript received",
                "present_ids": [],
                "absent_ids": [],
                "summary": "No speech detected"
            }

        t = transcript.lower().strip()
        all_student_ids = {s.get("student_id") for s in enrolled_students if s.get("student_id")}

        # Build lookup maps for matching
        # Roll number -> student_id, Suffix number -> student_id
        roll_to_id = {}
        suffix_to_id = {}
        id_to_student = {}

        for s in enrolled_students:
            sid = s.get("student_id")
            roll = str(s.get("roll_number", "")).strip().lower()
            id_to_student[sid] = s
            if roll:
                roll_to_id[roll] = sid
                # Extract trailing digits (e.g. 21CS014 -> "14", "014")
                digits_match = re.search(r'(\d+)$', roll)
                if digits_match:
                    num_str = digits_match.group(1)
                    suffix_to_id[num_str] = sid
                    suffix_to_id[str(int(num_str))] = sid  # Without leading zeros

        present_ids: Set[int] = set()
        absent_ids: Set[int] = set()
        matched_tokens: List[str] = []

        # 1. Pattern: "Mark all present except ..." / "Sabhi present sirf ... absent"
        all_present_except_pattern = (
            "all present except" in t or
            "sab present" in t or
            "sabhi present" in t or
            "all are present except" in t or
            "everyone present except" in t
        )

        all_absent_except_pattern = (
            "all absent except" in t or
            "sab absent" in t or
            "sabhi absent" in t or
            "everyone absent except" in t
        )

        extracted_tokens = self._extract_numbers_and_rolls(t)

        def resolve_token(token: str) -> int:
            clean = token.lower()
            if clean in roll_to_id:
                return roll_to_id[clean]
            if clean in suffix_to_id:
                return suffix_to_id[clean]
            try:
                int_val = str(int(clean))
                if int_val in suffix_to_id:
                    return suffix_to_id[int_val]
            except ValueError:
                pass
            return None

        if all_present_except_pattern:
            # Everyone present by default, mentioned ones are absent
            present_ids = set(all_student_ids)
            for token in extracted_tokens:
                sid = resolve_token(token)
                if sid:
                    absent_ids.add(sid)
                    present_ids.discard(sid)
                    matched_tokens.append(token)
            summary = f"Defaulted all {len(all_student_ids)} students to PRESENT, marked {len(absent_ids)} specified as ABSENT."

        elif all_absent_except_pattern:
            # Everyone absent by default, mentioned ones are present
            absent_ids = set(all_student_ids)
            for token in extracted_tokens:
                sid = resolve_token(token)
                if sid:
                    present_ids.add(sid)
                    absent_ids.discard(sid)
                    matched_tokens.append(token)
            summary = f"Defaulted all {len(all_student_ids)} students to ABSENT, marked {len(present_ids)} specified as PRESENT."

        else:
            # Check if command is targeting absent or present
            is_absent_focus = any(w in t for w in ["absent", "gairhazir", "chhutti", "nahi aaya"])
            is_present_focus = any(w in t for w in ["present", "hazir", "aaya hai"])

            if is_absent_focus and not is_present_focus:
                # Mentioned are absent, rest present
                present_ids = set(all_student_ids)
                for token in extracted_tokens:
                    sid = resolve_token(token)
                    if sid:
                        absent_ids.add(sid)
                        present_ids.discard(sid)
                        matched_tokens.append(token)
                summary = f"Marked {len(absent_ids)} students as ABSENT, {len(present_ids)} as PRESENT."

            elif is_present_focus and not is_absent_focus:
                # Mentioned are present, rest absent
                absent_ids = set(all_student_ids)
                for token in extracted_tokens:
                    sid = resolve_token(token)
                    if sid:
                        present_ids.add(sid)
                        absent_ids.discard(sid)
                        matched_tokens.append(token)
                summary = f"Marked {len(present_ids)} students as PRESENT, {len(absent_ids)} as ABSENT."

            else:
                # Default fallback: If numbers mentioned without explicit keyword, mark them present
                for token in extracted_tokens:
                    sid = resolve_token(token)
                    if sid:
                        present_ids.add(sid)
                absent_ids = all_student_ids - present_ids
                summary = f"Processed {len(matched_tokens)} recognized rolls. Marked {len(present_ids)} PRESENT, {len(absent_ids)} ABSENT."

        # Format details
        present_details = [
            {"student_id": sid, "name": id_to_student[sid].get("name"), "roll_number": id_to_student[sid].get("roll_number")}
            for sid in present_ids if sid in id_to_student
        ]
        absent_details = [
            {"student_id": sid, "name": id_to_student[sid].get("name"), "roll_number": id_to_student[sid].get("roll_number")}
            for sid in absent_ids if sid in id_to_student
        ]

        return {
            "success": True,
            "transcript": transcript,
            "summary": summary,
            "present_count": len(present_details),
            "absent_count": len(absent_details),
            "present_students": present_details,
            "absent_students": absent_details,
            "matched_tokens": matched_tokens
        }

voice_command_service = VoiceCommandService()

