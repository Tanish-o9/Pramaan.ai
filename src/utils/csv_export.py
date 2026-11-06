"""
RFC 4180 Compliant CSV Export Utility for Pramaan LMS Integrations.
Handles unicode names, escaping of quotes, commas, and newlines.
"""
import csv
import io
from typing import Any, Dict, List


def format_attendance_csv(records: List[Dict[str, Any]]) -> str:
    """
    Exports attendance rows to standard CSV string with proper escaping:
    - Escapes fields containing commas, quotes, or newlines
    - Preserves Unicode (Devanagari, accented characters)
    - Formats timestamp to standard YYYY-MM-DD HH:MM:SS
    """
    output = io.StringIO()
    # RFC 4180 compliant writer with UTF-8 support
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL, lineterminator='\r\n')

    # Header
    writer.writerow(["Date", "Time", "Roll Number", "Student Name", "Status", "Trust Score", "Verification Method"])

    for r in records:
        ts = r.get("timestamp", "")
        date_str = ts[:10] if len(ts) >= 10 else ts
        time_str = ts[11:19] if len(ts) >= 19 else ""

        student_info = r.get("students") or {}
        roll = student_info.get("roll_number") or r.get("roll_number") or "-"
        name = student_info.get("name") or r.get("name") or "Unknown"

        status = "Present" if r.get("is_present") else "Absent"
        trust = f"{r.get('trust_score', 100 if r.get('is_present') else 0)}%"
        method = r.get("verification_status") or "automated"

        writer.writerow([date_str, time_str, roll, name, status, trust, method])

    return output.getvalue()

