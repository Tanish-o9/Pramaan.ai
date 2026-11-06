"""
Medical Leave & OD (On-Duty) Workflow Service for Pramaan.
Handles student leave submissions (medical certificate, college event OD, sports),
faculty approvals/rejections, and calculates excused attendance credits.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.database.config import supabase

# Local in-memory store for development/testing and fallback if table is not yet created in Supabase
_LOCAL_LEAVE_STORE: List[Dict[str, Any]] = [
    {
        "id": 1,
        "student_id": 4,
        "student_name": "Tanish Rajput (You)",
        "roll_number": "25153162",
        "subject_id": 1,
        "subject_name": "Deep Learning & Neural Networks",
        "leave_type": "medical",
        "start_date": "2026-10-28",
        "end_date": "2026-10-29",
        "reason": "Acute migraine and doctor advised bed rest",
        "document_name": "prescription_hospital.pdf",
        "document_url": "data:application/pdf;base64,JVBERi0xLjQKJ...",
        "status": "approved",
        "faculty_remarks": "Approved. Medical slip verified by Dr. Tanish Rajput.",
        "created_at": "2026-10-28T09:00:00Z"
    },
    {
        "id": 2,
        "student_id": 4,
        "student_name": "Tanish Rajput (You)",
        "roll_number": "25153162",
        "subject_id": 1,
        "subject_name": "Deep Learning & Neural Networks",
        "leave_type": "od",
        "start_date": "2026-11-05",
        "end_date": "2026-11-06",
        "reason": "Smart India Hackathon Finalist Presentation & Travel",
        "document_name": "hackathon_invite.pdf",
        "document_url": "data:application/pdf;base64,JVBERi0xLjQKJ...",
        "status": "pending",
        "faculty_remarks": "",
        "created_at": "2026-11-05T08:30:00Z"
    },
    {
        "id": 3,
        "student_id": 1,
        "student_name": "Rahul Sharma",
        "roll_number": "22CS042",
        "subject_id": 1,
        "subject_name": "Deep Learning & Neural Networks",
        "leave_type": "sports",
        "start_date": "2026-11-06",
        "end_date": "2026-11-07",
        "reason": "State Level Inter-College Cricket Tournament Match",
        "document_name": "sports_certificate.pdf",
        "document_url": "data:application/pdf;base64,JVBERi0xLjQKJ...",
        "status": "pending",
        "faculty_remarks": "",
        "created_at": "2026-11-06T07:15:00Z"
    },
    {
        "id": 4,
        "student_id": 2,
        "student_name": "Priya Singh",
        "roll_number": "22CS043",
        "subject_id": 2,
        "subject_name": "Computer Vision & Biometrics",
        "leave_type": "event",
        "start_date": "2026-11-02",
        "end_date": "2026-11-03",
        "reason": "Annual TechFest Coordinator Duties",
        "document_name": "techfest_duty_slip.pdf",
        "document_url": "data:application/pdf;base64,JVBERi0xLjQKJ...",
        "status": "approved",
        "faculty_remarks": "Approved. Event coordinator list verified.",
        "created_at": "2026-11-02T10:00:00Z"
    }
]
_LEAVE_ID_COUNTER = 5

class LeaveService:
    """
    Manages student leave and on-duty requests.
    """

    def apply_leave(
        self,
        student_id: int,
        student_name: str,
        roll_number: str,
        subject_id: int,
        subject_name: str,
        leave_type: str,
        start_date: str,
        end_date: str,
        reason: str,
        document_name: str = "",
        document_url: str = ""
    ) -> Dict[str, Any]:
        global _LEAVE_ID_COUNTER

        if not reason or len(reason.strip()) < 5:
            raise ValueError("Please provide a valid reason (at least 5 characters)")

        if not start_date or not end_date:
            raise ValueError("Start date and end date are required")

        new_record = {
            "id": _LEAVE_ID_COUNTER,
            "student_id": student_id,
            "student_name": student_name,
            "roll_number": roll_number,
            "subject_id": subject_id,
            "subject_name": subject_name,
            "leave_type": leave_type.lower() if leave_type else "medical",
            "start_date": start_date,
            "end_date": end_date,
            "reason": reason.strip(),
            "document_name": document_name or "supporting_doc.pdf",
            "document_url": document_url,
            "status": "pending",
            "faculty_remarks": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        _LEAVE_ID_COUNTER += 1

        # Attempt Supabase insert, fall back to memory
        try:
            res = supabase.table("leave_requests").insert(new_record).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

        _LOCAL_LEAVE_STORE.append(new_record)
        return new_record

    def get_student_leaves(self, student_id: int) -> List[Dict[str, Any]]:
        try:
            res = supabase.table("leave_requests").select("*").eq("student_id", student_id).order("id", desc=True).execute()
            if res.data:
                return res.data
        except Exception:
            pass
        return [l for l in _LOCAL_LEAVE_STORE if l["student_id"] == student_id]

    def get_teacher_leaves(self, teacher_subject_ids: List[int]) -> List[Dict[str, Any]]:
        if not teacher_subject_ids:
            return []
        try:
            res = supabase.table("leave_requests").select("*").in_("subject_id", teacher_subject_ids).order("id", desc=True).execute()
            if res.data:
                return res.data
        except Exception:
            pass
        return [l for l in _LOCAL_LEAVE_STORE if l["subject_id"] in teacher_subject_ids]

    def review_leave(self, leave_id: int, status: str, remarks: str = "") -> Dict[str, Any]:
        if status not in ("approved", "rejected", "pending"):
            raise ValueError("Status must be 'approved', 'rejected', or 'pending'")

        # Try Supabase update
        try:
            res = (
                supabase.table("leave_requests")
                .update({"status": status, "faculty_remarks": remarks})
                .eq("id", leave_id)
                .execute()
            )
            if res.data:
                return res.data[0]
        except Exception:
            pass

        for l in _LOCAL_LEAVE_STORE:
            if l["id"] == leave_id:
                l["status"] = status
                l["faculty_remarks"] = remarks
                return l

        raise ValueError(f"Leave request #{leave_id} not found")

    def count_excused_classes(self, student_id: int, subject_id: int) -> int:
        """
        Count approved excused classes for a given student in a given subject.
        Each approved leave counts as 1 or multiple excused sessions.
        """
        leaves = [
            l for l in _LOCAL_LEAVE_STORE
            if l["student_id"] == student_id and l["subject_id"] == subject_id and l["status"] == "approved"
        ]
        # Approximation: Each approved leave grant provides 2 excused attendance credits by default
        return len(leaves) * 2

leave_service = LeaveService()

