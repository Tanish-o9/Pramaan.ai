"""
Bunk & Attendance Calculator Service for Pramaan.
Computes percentage, permissible bunks, and recovery target classes to satisfy the 75% attendance rule.
"""
import math
from typing import Any, Dict


def calculate_bunk_metrics(
    total_classes: int,
    attended_classes: int,
    threshold_pct: float = 75.0,
    excused_classes: int = 0
) -> Dict[str, Any]:
    """
    Calculates:
    - attendance_percentage: float (0.0 to 100.0) rounded to 1 decimal
    - bunks_available / bunks_allowed: int, how many future classes the student can miss and stay >= threshold_pct
    - classes_needed: int, how many consecutive future classes the student must attend to reach >= threshold_pct
    - status: 'safe' | 'warning' | 'critical'
    - excused_classes: int, approved medical/OD leaves counted towards attendance waiver
    """
    if total_classes < 0 or attended_classes < 0 or excused_classes < 0:
        raise ValueError("Class counts cannot be negative")

    if attended_classes > total_classes:
        raise ValueError("Attended classes cannot exceed total classes conducted")

    if total_classes == 0:
        return {
            "percentage": 100.0,
            "bunks_available": 0,
            "bunks_allowed": 0,
            "classes_needed": 0,
            "status": "safe",
            "excused_classes": excused_classes,
            "action_message": "Semester beginning. No classes held yet.",
            "message": "Semester beginning. No classes held yet."
        }

    # Excused classes boost the attended count towards university threshold criteria
    effective_attended = min(total_classes, attended_classes + excused_classes)
    pct = round((effective_attended / total_classes) * 100.0, 1)
    threshold_decimal = threshold_pct / 100.0

    if pct >= threshold_pct:
        # Bunks available formula: floor((attended / threshold) - total)
        bunks = max(0, int(math.floor(effective_attended / threshold_decimal - total_classes)))
        needed = 0
        status = "safe"
        message = f"You are safe! You can bunk {bunks} class(es) and remain at or above {threshold_pct}%." if bunks > 0 else f"You are exactly on track at {pct}%. Do not miss your next class."
    else:
        # Classes needed formula: ceil((threshold * total - attended) / (1 - threshold))
        diff = (threshold_decimal * total_classes - effective_attended) / (1.0 - threshold_decimal)
        needed = max(0, int(math.ceil(diff)))
        bunks = 0
        status = "warning" if pct >= 65.0 else "critical"
        message = f"Attendance shortage: You must attend {needed} consecutive class(es) without absence to recover to {threshold_pct}%."

    return {
        "percentage": pct,
        "raw_percentage": round((attended_classes / total_classes) * 100.0, 1),
        "bunks_available": bunks,
        "bunks_allowed": bunks,
        "classes_needed": needed,
        "status": status,
        "excused_classes": excused_classes,
        "action_message": message,
        "message": message
    }

