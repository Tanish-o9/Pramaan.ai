"""
Attendance Risk Prediction & Anomaly Detection Service for Pramaan.
Uses historical attendance metrics, absence streaks, weekday skews, and ML heuristics
to predict the probability of a student falling below 75% attendance before semester end,
and detects anomalous proxy bursts (e.g. rapid-fire attendance from identical IPs/devices).
"""

import math
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Any, Optional

class AttendanceRiskPredictor:
    """
    Lightweight, calibrated risk prediction model.
    Predicts probability of falling below 75% threshold and provides actionable recovery plans.
    """

    def __init__(self, target_pct: float = 75.0, default_term_classes: int = 40):
        self.target_pct = target_pct
        self.default_term_classes = default_term_classes

    def calculate_student_risk(
        self,
        student_id: int,
        student_name: str,
        roll_number: str,
        logs: List[Dict[str, Any]],
        total_term_classes: Optional[int] = None,
        excused_classes: int = 0
    ) -> Dict[str, Any]:
        """
        Calculate end-of-term attendance risk for a single student in a subject.
        """
        term_classes = total_term_classes or self.default_term_classes
        
        # Sort logs chronologically
        sorted_logs = sorted(logs, key=lambda x: x.get("timestamp", ""))
        total_held = len(sorted_logs)
        
        if total_held == 0:
            return {
                "student_id": student_id,
                "name": student_name,
                "roll_number": roll_number,
                "risk_score": 0.0,
                "risk_level": "UNKNOWN",
                "current_pct": 0.0,
                "projected_final_pct": 100.0,
                "classes_held": 0,
                "classes_attended": 0,
                "consecutive_absent_streak": 0,
                "weekday_skew": {},
                "top_factors": ["No attendance sessions conducted yet."],
                "recovery_plan": "Attend upcoming classes regularly."
            }

        attended_count = sum(1 for log in sorted_logs if log.get("is_present", False))
        effective_attended = attended_count + excused_classes
        current_pct = round((effective_attended / total_held) * 100.0, 1)

        # 1. Consecutive absent streak calculation
        consecutive_streak = 0
        for log in reversed(sorted_logs):
            if not log.get("is_present", False):
                consecutive_streak += 1
            else:
                break

        # 2. Weekday absence skew
        weekday_stats = defaultdict(lambda: {"total": 0, "absent": 0})
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        for log in sorted_logs:
            ts_str = log.get("timestamp")
            if ts_str:
                try:
                    dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    day_name = day_names[dt.weekday()]
                    weekday_stats[day_name]["total"] += 1
                    if not log.get("is_present", False):
                        weekday_stats[day_name]["absent"] += 1
                except Exception:
                    pass

        weekday_skew = {}
        high_skip_days = []
        for day, stats in weekday_stats.items():
            if stats["total"] >= 2:
                rate = round((stats["absent"] / stats["total"]) * 100.0, 1)
                weekday_skew[day] = f"{rate}% absent ({stats['absent']}/{stats['total']})"
                if rate >= 50.0:
                    high_skip_days.append(f"{day} ({rate}% absent)")

        # 3. Recent momentum (last 5 classes)
        recent_logs = sorted_logs[-5:]
        recent_attended = sum(1 for log in recent_logs if log.get("is_present", False))
        recent_pct = round((recent_attended / len(recent_logs)) * 100.0, 1) if recent_logs else current_pct

        # 4. Projected final percentage (Bayesian / Exponential smoothing of recent vs overall rate)
        remaining_classes = max(0, term_classes - total_held)
        weighted_continuation_rate = (0.35 * (current_pct / 100.0)) + (0.65 * (recent_pct / 100.0))
        projected_future_attended = remaining_classes * weighted_continuation_rate
        projected_final_attended = effective_attended + projected_future_attended
        projected_final_pct = round((projected_final_attended / max(term_classes, total_held)) * 100.0, 1)

        # 5. Risk score (0 to 100)
        # Factors:
        # Distance below 75% currently: up to 40 pts
        # Projected final below 75%: up to 30 pts
        # Active absent streak: 5 pts per class (up to 20 pts)
        # Negative momentum: up to 10 pts
        pct_deficit = max(0.0, self.target_pct - current_pct)
        score_current = min(40.0, pct_deficit * 2.0)
        
        proj_deficit = max(0.0, self.target_pct - projected_final_pct)
        score_proj = min(30.0, proj_deficit * 1.5)
        
        score_streak = min(20.0, consecutive_streak * 6.0)
        
        momentum_drop = max(0.0, current_pct - recent_pct)
        score_momentum = min(10.0, momentum_drop * 0.5)

        raw_risk = score_current + score_proj + score_streak + score_momentum
        risk_score = round(min(100.0, max(0.0, raw_risk)), 1)

        # Risk Category
        if risk_score >= 65.0 or current_pct < 60.0:
            risk_level = "CRITICAL"
        elif risk_score >= 35.0 or current_pct < 75.0:
            risk_level = "WARNING"
        else:
            risk_level = "HEALTHY"

        # Factors list
        top_factors = []
        if current_pct < self.target_pct:
            top_factors.append(f"Current attendance is {current_pct}% (below {self.target_pct}% threshold)")
        if consecutive_streak >= 2:
            top_factors.append(f"Active absence streak: missed last {consecutive_streak} classes")
        if high_skip_days:
            top_factors.append(f"High weekday absence skew on: {', '.join(high_skip_days)}")
        if recent_pct < current_pct:
            top_factors.append(f"Downwards trend: only {recent_pct}% in last 5 classes")
        if not top_factors:
            top_factors.append("Attendance is consistent and meeting university targets.")

        # Recovery target
        # How many of the remaining classes must be attended to finish >= 75%
        # (attended + x) / (total_held + remaining) >= 0.75
        required_final_attended = math.ceil(0.75 * (total_held + remaining_classes))
        needed_from_remaining = max(0, required_final_attended - effective_attended)
        
        if current_pct >= self.target_pct:
            safe_bunks = math.floor((effective_attended - 0.75 * total_held) / 0.75) if total_held > 0 else 0
            safe_bunks = max(0, safe_bunks)
            recovery_plan = f"Attendance is secure ({current_pct}%). You can safely miss up to {safe_bunks} classes without dropping below {self.target_pct}%."
        elif remaining_classes > 0 and needed_from_remaining > remaining_classes:
            recovery_plan = f"Mathematically unable to reach 75% even with 100% future attendance. Contact faculty for medical/OD condonation."
        elif remaining_classes > 0 and needed_from_remaining > 0:
            recovery_plan = f"Must attend at least {needed_from_remaining} of remaining {remaining_classes} lectures to recover to 75%."
        else:
            recovery_plan = "Attend all remaining classes to maximize end-of-term eligibility."

        return {
            "student_id": student_id,
            "name": student_name,
            "roll_number": roll_number,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "current_pct": current_pct,
            "projected_final_pct": projected_final_pct,
            "classes_held": total_held,
            "classes_attended": attended_count,
            "excused_classes": excused_classes,
            "consecutive_absent_streak": consecutive_streak,
            "weekday_skew": weekday_skew,
            "top_factors": top_factors,
            "recovery_plan": recovery_plan
        }

    def detect_anomalies(self, logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect proxy clusters, rapid-fire bursts, and device reuse anomalies in attendance records.
        """
        anomalies = []
        if not logs:
            return anomalies

        # 1. Device / IP collision detection
        # Group by timestamp (minute bucket) and device / IP (if available in trust_breakdown)
        ip_clusters = defaultdict(list)
        minute_bursts = defaultdict(list)

        for log in logs:
            ts_str = log.get("timestamp", "")
            student_id = log.get("student_id")
            student_info = log.get("students", {}) or {}
            student_label = f"{student_info.get('name', f'ID {student_id}')} ({student_info.get('roll_number', 'N/A')})"
            
            # Minute key
            if ts_str and len(ts_str) >= 16:
                minute_key = ts_str[:16] # YYYY-MM-DDTHH:MM
                minute_bursts[minute_key].append({
                    "log_id": log.get("id"),
                    "student_label": student_label,
                    "student_id": student_id,
                    "timestamp": ts_str
                })

            breakdown = log.get("trust_breakdown") or {}
            ip = breakdown.get("ip") or breakdown.get("ip_address")
            device_hash = breakdown.get("device_fingerprint") or breakdown.get("device_hash")
            
            if ip and ip not in ("127.0.0.1", "localhost", "unknown"):
                ip_clusters[f"IP:{ip}"].append({
                    "log_id": log.get("id"),
                    "student_label": student_label,
                    "timestamp": ts_str
                })
            if device_hash and device_hash != "unknown":
                ip_clusters[f"Device:{device_hash}"].append({
                    "log_id": log.get("id"),
                    "student_label": student_label,
                    "timestamp": ts_str
                })

        # Flag rapid-fire bursts: > 4 students marked within same 60 seconds
        for minute, records in minute_bursts.items():
            if len(records) >= 5:
                anomalies.append({
                    "type": "RAPID_FIRE_BURST",
                    "severity": "HIGH",
                    "title": "Simultaneous Attendance Spike",
                    "description": f"{len(records)} students were marked within a single minute ({minute}). Potential proxy batch or QR code broadcasting.",
                    "timestamp": minute,
                    "count": len(records),
                    "affected_students": [r["student_label"] for r in records[:6]]
                })

        # Flag device / IP sharing: > 2 different students from identical device or IP
        for key, records in ip_clusters.items():
            unique_students = list({r["student_label"] for r in records})
            if len(unique_students) >= 3:
                anomalies.append({
                    "type": "DEVICE_COLLISION",
                    "severity": "CRITICAL" if "Device" in key else "MEDIUM",
                    "title": f"Multiple Identities from Single Source ({key})",
                    "description": f"{len(unique_students)} students checked in using the same origin ({key}). Strong indicator of phone passing or proxy.",
                    "timestamp": records[0]["timestamp"],
                    "count": len(unique_students),
                    "affected_students": unique_students[:5]
                })

        return anomalies


# Global singleton instance
risk_predictor = AttendanceRiskPredictor()
