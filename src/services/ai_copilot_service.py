"""
AI Assistant Chatbot Service ("Pramaan Copilot").
Provides natural language reasoning over attendance records, bunk calculations,
at-risk student identification, and lecture summaries for both Students and Faculty.
Equipped with strict prompt-injection defenses and role-scoped data boundaries.
"""

import re
from collections import defaultdict
from typing import Any, Dict, List, Optional

from src.services.bunk_calculator import calculate_bunk_metrics
from src.services.risk_prediction_service import risk_predictor


class PramaanCopilot:
    """
    Intelligent conversational assistant for university attendance management.
    """

    def sanitize_input(self, text: str) -> str:
        """Strip dangerous script tags, prompt injection tokens, and control characters."""
        if not text:
            return ""
        # Remove prompt injection delimiters
        cleaned = re.sub(r'(system:|assistant:|user:|<\|im_start\|>|<\|im_end\|>|---\s*instructions)', '', text, flags=re.IGNORECASE)
        # Remove HTML/JS injections
        cleaned = re.sub(r'<[^>]*>', '', cleaned)
        return cleaned.strip()

    def process_chat(
        self,
        user_message: str,
        user_role: str,
        user_profile: Dict[str, Any],
        student_subjects: Optional[List[Dict[str, Any]]] = None,
        attendance_logs: Optional[List[Dict[str, Any]]] = None,
        teacher_subjects: Optional[List[Dict[str, Any]]] = None,
        active_subject_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Process incoming natural language query and return an actionable scoped response.
        """
        clean_msg = self.sanitize_input(user_message).lower()

        if not clean_msg:
            return {
                "reply": "Please ask a question about your attendance, subjects, or eligibility.",
                "intent": "empty",
                "suggestions": ["Can I bunk tomorrow?", "My attendance summary", "How many classes to 75%?"]
            }

        if user_role == "student":
            return self._handle_student_chat(clean_msg, user_profile, student_subjects or [], attendance_logs or [])
        elif user_role == "teacher":
            return self._handle_teacher_chat(clean_msg, user_profile, teacher_subjects or [], attendance_logs or [], active_subject_id)
        else:
            return {
                "reply": "Unrecognized user role. Please sign in as a student or faculty member.",
                "intent": "unknown",
                "suggestions": []
            }

    def _handle_student_chat(
        self,
        msg: str,
        student: Dict[str, Any],
        enrolled_subjects: List[Dict[str, Any]],
        logs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        name = student.get("name", "Student")
        roll = student.get("roll_number", "")

        # 1. Bunk checking ("can i bunk", "bunk mar sakta hu", "how many bunks")
        if any(w in msg for w in ["bunk", "leave", "chhutti", "miss", "skip"]):
            if not enrolled_subjects:
                return {
                    "reply": f"Hi {name}, you are not currently enrolled in any subjects. Join a subject using the join code first.",
                    "intent": "can_i_bunk",
                    "suggestions": ["How to join subject?", "My attendance summary"]
                }

            # If user mentions specific subject name, filter to it
            matched_sub = None
            for s in enrolled_subjects:
                sub_info = s.get("subjects") or s
                sub_name = sub_info.get("name", "").lower()
                sub_code = sub_info.get("subject_code", "").lower()
                if sub_name in msg or sub_code in msg:
                    matched_sub = sub_info
                    break

            if matched_sub:
                sub_id = matched_sub.get("subject_id")
                sub_logs = [l for l in logs if l.get("subject_id") == sub_id]
                total = len(sub_logs)
                attended = sum(1 for l in sub_logs if l.get("is_present", False))
                metrics = calculate_bunk_metrics(total, attended, 75.0)

                if str(metrics.get("status", "")).lower() in ("critical", "warning", "shortage"):
                    reply = (
                        f"⚠️ **Do NOT bunk {matched_sub.get('name')}!**\n"
                        f"Your attendance is currently **{metrics['percentage']}%** ({attended}/{total} classes).\n"
                        f"If you miss 1 more class, your attendance drops to **{round((attended / (total + 1)) * 100, 1)}%**.\n"
                        f"👉 *Action:* {metrics['action_message']}"
                    )
                else:
                    safe = metrics["bunks_allowed"]
                    reply = (
                        f"✅ **You can safely bunk {matched_sub.get('name')}.**\n"
                        f"Your current attendance is **{metrics['percentage']}%** ({attended}/{total} classes).\n"
                        f"You have **{safe} safe bunk(s)** remaining before hitting the 75% threshold."
                    )
                return {
                    "reply": reply,
                    "intent": "can_i_bunk",
                    "data": metrics,
                    "suggestions": ["What about my other subjects?", "My attendance summary", "Recovery plan"]
                }
            else:
                # Summary of bunks across all enrolled subjects
                reports = []
                for s in enrolled_subjects:
                    sub_info = s.get("subjects") or s
                    sub_id = sub_info.get("subject_id")
                    sub_logs = [l for l in logs if l.get("subject_id") == sub_id]
                    total = len(sub_logs)
                    attended = sum(1 for l in sub_logs if l.get("is_present", False))
                    m = calculate_bunk_metrics(total, attended, 75.0)
                    reports.append(f"• **{sub_info.get('name')}**: {m['percentage']}% ({m['bunks_allowed']} safe bunks)")

                return {
                    "reply": "Here is your safe bunk status across all subjects:\n" + "\n".join(reports),
                    "intent": "bunk_summary",
                    "suggestions": ["Can I bunk DBMS?", "What happens if I miss next class?"]
                }

        # 2. Risk & Recovery Plan ("risk", "recovery", "khatra", "fail", "shortage")
        if any(w in msg for w in ["risk", "recover", "shortage", "fail", "danger", "target"]):
            risk_reports = []
            for s in enrolled_subjects:
                sub_info = s.get("subjects") or s
                sub_id = sub_info.get("subject_id")
                sub_logs = [l for l in logs if l.get("subject_id") == sub_id]
                risk_res = risk_predictor.calculate_student_risk(
                    student_id=student.get("student_id", 0),
                    student_name=name,
                    roll_number=roll,
                    logs=sub_logs
                )
                if risk_res["risk_level"] in ("CRITICAL", "WARNING"):
                    risk_reports.append(
                        f"🚨 **{sub_info.get('name')} ({risk_res['risk_level']})**:\n"
                        f"Current: {risk_res['current_pct']}%. Plan: {risk_res['recovery_plan']}"
                    )

            if risk_reports:
                reply = "Here are the subjects needing your attention:\n\n" + "\n\n".join(risk_reports)
            else:
                reply = f"🎉 Great job, {name}! None of your enrolled subjects are currently flagged at-risk. All subjects are above 75%."

            return {
                "reply": reply,
                "intent": "risk_analysis",
                "suggestions": ["Can I bunk tomorrow?", "My full attendance overview"]
            }

        # 3. Overall attendance summary
        if any(w in msg for w in ["summary", "overview", "percentage", "kitna", "attendance", "status"]):
            lines = []
            overall_total = 0
            overall_attended = 0
            for s in enrolled_subjects:
                sub_info = s.get("subjects") or s
                sub_id = sub_info.get("subject_id")
                sub_logs = [l for l in logs if l.get("subject_id") == sub_id]
                t = len(sub_logs)
                a = sum(1 for l in sub_logs if l.get("is_present", False))
                overall_total += t
                overall_attended += a
                pct = round((a / t) * 100, 1) if t > 0 else 0.0
                emoji = "🟢" if pct >= 75 else "🔴"
                lines.append(f"{emoji} **{sub_info.get('name')}**: {pct}% ({a}/{t} attended)")

            overall_pct = round((overall_attended / overall_total) * 100, 1) if overall_total > 0 else 0.0
            reply = f"📊 **Attendance Summary for {name} ({roll}):**\nOverall: **{overall_pct}%**\n\n" + "\n".join(lines)
            return {
                "reply": reply,
                "intent": "summary",
                "suggestions": ["Can I bunk tomorrow?", "Show at-risk subjects", "How to apply for leave?"]
            }

        # 4. Leave / OD assistance
        if any(w in msg for w in ["leave", "medical", "duty", "od", "sick", "doctor", "certificate"]):
            return {
                "reply": (
                    "To request an excused absence, go to the **Leave & OD** tab in your dashboard.\n"
                    "Upload your medical prescription or event certificate with reason and dates. "
                    "Once approved by your faculty, it waives attendance penalties in your 75% bunk calculation."
                ),
                "intent": "leave_help",
                "suggestions": ["Can I bunk tomorrow?", "My attendance summary"]
            }

        # Default fallback
        return {
            "reply": (
                f"Hello {name}! I am your Pramaan AI Assistant. You can ask me:\n"
                f"• *'Can I bunk DBMS class tomorrow?'*\n"
                f"• *'What is my overall attendance percentage?'*\n"
                f"• *'Do I have any subjects at risk?'*\n"
                f"• *'How many classes must I attend to reach 75%?'*"
            ),
            "intent": "greeting",
            "suggestions": ["Can I bunk tomorrow?", "My attendance summary", "Show at-risk subjects"]
        }

    def _handle_teacher_chat(
        self,
        msg: str,
        teacher: Dict[str, Any],
        subjects: List[Dict[str, Any]],
        logs: List[Dict[str, Any]],
        active_subject_id: Optional[int]
    ) -> Dict[str, Any]:
        teacher_name = teacher.get("name") or teacher.get("username", "Professor")

        # 1. Who is below 75% / shortage / at-risk
        if any(w in msg for w in ["below 75", "shortage", "at risk", "risk", "defaulter", "kam hai", "low attendance"]):
            if not logs:
                return {
                    "reply": "No attendance records have been logged yet for the selected subject.",
                    "intent": "shortage_list",
                    "suggestions": ["Class attendance overview", "Show attendance anomalies"]
                }

            # Group logs by student
            student_stats = defaultdict(lambda: {"name": "", "roll": "", "total": 0, "attended": 0})
            for l in logs:
                s_id = l.get("student_id")
                s_info = l.get("students", {}) or {}
                student_stats[s_id]["name"] = s_info.get("name", f"Student {s_id}")
                student_stats[s_id]["roll"] = s_info.get("roll_number", "N/A")
                student_stats[s_id]["total"] += 1
                if l.get("is_present", False):
                    student_stats[s_id]["attended"] += 1

            shortage_list = []
            for s_id, data in student_stats.items():
                if data["total"] > 0:
                    pct = round((data["attended"] / data["total"]) * 100, 1)
                    if pct < 75.0:
                        shortage_list.append(f"• **{data['name']}** ({data['roll']}): **{pct}%** ({data['attended']}/{data['total']})")

            if shortage_list:
                reply = (
                    f"⚠️ Found **{len(shortage_list)} students** below the 75% threshold:\n\n"
                    + "\n".join(shortage_list[:15])
                )
                if len(shortage_list) > 15:
                    reply += f"\n\n*(and {len(shortage_list) - 15} more...)*"
            else:
                reply = "✅ Excellent! All enrolled students in this subject are currently maintaining 75% or higher attendance."

            return {
                "reply": reply,
                "intent": "shortage_list",
                "suggestions": ["Show proxy anomalies", "Class summary", "Export CSV"]
            }

        # 2. Anomalies / Proxy checks
        if any(w in msg for w in ["proxy", "anomaly", "burst", "cheat", "suspicious", "fake"]):
            anomalies = risk_predictor.detect_anomalies(logs)
            if anomalies:
                lines = []
                for a in anomalies[:5]:
                    lines.append(f"• **[{a['severity']}] {a['title']}**: {a['description']}")
                reply = f"🚨 Detected **{len(anomalies)} suspicious patterns**:\n\n" + "\n".join(lines)
            else:
                reply = "✅ No anomalous attendance patterns or proxy bursts detected in current records."
            return {
                "reply": reply,
                "intent": "anomalies",
                "suggestions": ["Who is below 75%?", "Class summary"]
            }

        # 3. Class summary / Overview
        if any(w in msg for w in ["summary", "overview", "stats", "class stats", "total"]):
            total_logs = len(logs)
            present_logs = sum(1 for l in logs if l.get("is_present", False))
            unique_students = len(set(l.get("student_id") for l in logs))
            avg_pct = round((present_logs / total_logs) * 100, 1) if total_logs > 0 else 0.0

            reply = (
                f"📈 **Class Statistics:**\n"
                f"• Total Logged Records: **{total_logs}**\n"
                f"• Total Students Tracked: **{unique_students}**\n"
                f"• Average Class Attendance: **{avg_pct}%**\n"
                f"• Subjects Under Instruction: **{len(subjects)}**"
            )
            return {
                "reply": reply,
                "intent": "class_summary",
                "suggestions": ["Who is below 75%?", "Check proxy anomalies", "Review pending leaves"]
            }

        # Default teacher greeting
        return {
            "reply": (
                f"Greetings Professor {teacher_name}! I can assist you with:\n"
                f"• *'Who is below 75% in this class?'*\n"
                f"• *'Show proxy anomalies and suspicious device bursts'*\n"
                f"• *'What is the overall attendance summary for my subjects?'*\n"
                f"• *'Are there any pending student medical leaves?'*"
            ),
            "intent": "greeting",
            "suggestions": ["Who is below 75%?", "Show proxy anomalies", "Class summary"]
        }


# Global singleton
copilot = PramaanCopilot()
