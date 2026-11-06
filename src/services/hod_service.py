"""
Head of Department (HoD) Governance & Analytics Service for Pramaan / Presence.ai.
Generates multi-section academic compliance reports and official Defaulter Notices.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List


class HodService:
    def __init__(self, institution_name: str = "Pramaan Institute of Technology", default_threshold: float = 75.0):
        self.institution_name = institution_name
        self.default_threshold = default_threshold

    def calculate_department_summary(self, subjects_with_attendance: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregates attendance metrics across all department subjects and sections.
        """
        total_students_enrolled = 0
        total_sessions = 0
        total_attendance_records = 0
        present_attendance_records = 0
        subject_breakdown = []
        defaulters = []

        for sub in subjects_with_attendance:
            sub_id = sub.get("subject_id")
            sub_name = sub.get("name", "Unknown")
            sub_code = sub.get("subject_code", "")
            section = sub.get("section", "A")
            students = sub.get("students", [])

            sub_present = 0
            sub_total = 0

            for s in students:
                logs = s.get("logs", [])
                p_count = sum(1 for l in logs if l.get("is_present"))
                t_count = len(logs)
                pct = round((p_count / t_count * 100), 1) if t_count > 0 else 100.0

                sub_present += p_count
                sub_total += t_count

                if pct < self.default_threshold and t_count > 0:
                    defaulters.append({
                        "student_id": s.get("student_id"),
                        "name": s.get("name"),
                        "roll_number": s.get("roll_number"),
                        "subject_name": sub_name,
                        "subject_code": sub_code,
                        "section": section,
                        "attended": p_count,
                        "total": t_count,
                        "percentage": pct,
                        "shortfall_classes": max(0, int((0.75 * t_count) - p_count))
                    })

            sub_avg_pct = round((sub_present / sub_total * 100), 1) if sub_total > 0 else 100.0
            subject_breakdown.append({
                "subject_id": sub_id,
                "name": sub_name,
                "code": sub_code,
                "section": section,
                "student_count": len(students),
                "total_classes": sub_total // max(1, len(students)),
                "average_percentage": sub_avg_pct
            })

            total_students_enrolled += len(students)
            total_attendance_records += sub_total
            present_attendance_records += sub_present

        overall_department_pct = (
            round((present_attendance_records / total_attendance_records * 100), 1)
            if total_attendance_records > 0 else 100.0
        )

        return {
            "institution_name": self.institution_name,
            "department": "Computer Science & Engineering",
            "overall_attendance_pct": overall_department_pct,
            "total_enrolled": total_students_enrolled,
            "subjects_count": len(subjects_with_attendance),
            "defaulters_count": len(defaulters),
            "defaulters": defaulters,
            "subject_breakdown": subject_breakdown
        }

    def generate_defaulter_notice_html(self, defaulters: List[Dict[str, Any]], term: str = "Fall 2026") -> str:
        """
        Generates clean, printable HTML for official campus notice board.
        """
        now_str = datetime.now(timezone.utc).strftime("%d %B %Y")

        rows_html = ""
        for i, d in enumerate(defaulters, 1):
            rows_html += f"""
            <tr style="border-bottom: 1px solid #e4e4e7;">
                <td style="padding: 10px 14px; text-align: center;">{i}</td>
                <td style="padding: 10px 14px; font-weight: 600;">{d.get('roll_number')}</td>
                <td style="padding: 10px 14px;">{d.get('name')}</td>
                <td style="padding: 10px 14px;">{d.get('subject_name')} ({d.get('section')})</td>
                <td style="padding: 10px 14px; text-align: center;">{d.get('attended')} / {d.get('total')}</td>
                <td style="padding: 10px 14px; text-align: center; color: #dc2626; font-weight: bold;">{d.get('percentage')}%</td>
                <td style="padding: 10px 14px; text-align: center; color: #b91c1c;">+{d.get('shortfall_classes')} classes</td>
            </tr>
            """

        if not defaulters:
            rows_html = """<tr><td colspan="7" style="padding: 20px; text-align: center; color: #16a34a; font-weight: 500;">No attendance defaulters found! All students maintain >= 75% attendance.</td></tr>"""

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Official Defaulter Notice - {self.institution_name}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #18181b; margin: 40px; }}
        .header {{ text-align: center; border-bottom: 2px solid #18181b; padding-bottom: 20px; margin-bottom: 25px; }}
        .title {{ font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }}
        .subtitle {{ font-size: 14px; color: #71717a; margin-top: 4px; }}
        .badge {{ display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 13px; margin-top: 10px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }}
        th {{ background: #f4f4f5; text-align: left; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #52525b; }}
        .footer {{ margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; }}
        .signature-block {{ text-align: center; width: 220px; border-top: 1px solid #71717a; padding-top: 8px; }}
        @media print {{ body {{ margin: 20px; }} }}
    </style>
</head>
<body>
    <div class="header">
        <div class="title">{self.institution_name}</div>
        <div class="subtitle">Office of the Head of Department • Department of Computer Science & Engineering</div>
        <div class="badge">OFFICIAL ATTENDANCE DEFAULTER NOTICE • {term}</div>
        <div style="font-size: 12px; color: #a1a1aa; margin-top: 8px;">Generated on: {now_str} • Threshold: {self.default_threshold}% Mandatory</div>
    </div>

    <p style="font-size: 13px; line-height: 1.6;">
        The following students are hereby notified that their cumulative lecture attendance is currently <strong>below the statutory {self.default_threshold}% requirement</strong>.
        Failure to make up the attendance shortfall prior to semester end will lead to debarment from end-semester examinations as per academic regulations.
    </p>

    <table>
        <thead>
            <tr>
                <th style="text-align: center;">#</th>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Subject & Section</th>
                <th style="text-align: center;">Attended / Held</th>
                <th style="text-align: center;">Attendance %</th>
                <th style="text-align: center;">Shortfall</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>

    <div class="footer" style="margin-top: 60px;">
        <div class="signature-block">
            <strong>Academic Coordinator</strong><br>
            Department of CSE
        </div>
        <div class="signature-block">
            <strong>Head of Department (HoD)</strong><br>
            {self.institution_name}
        </div>
    </div>
</body>
</html>
"""
        return html

hod_service = HodService()

