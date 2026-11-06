"""
Medical Leave & OD (On-Duty) Workflow Service for Pramaan.
Handles authentic student leave submissions (medical certificate, college event OD, sports),
faculty approvals/rejections, and calculates excused attendance credits.
Stores real leave records in persistent local storage (and Supabase when table exists).
Zero fake mock leaves.
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.database.config import supabase

logger = logging.getLogger(__name__)

LEAVE_DB_PATH = Path(__file__).resolve().parent.parent / "database" / "leave_store.json"

def _load_leaves() -> List[Dict[str, Any]]:
    if not LEAVE_DB_PATH.exists():
        return []
    try:
        with open(LEAVE_DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning(f"Failed to read leave_store.json: {e}")
        return []

def _save_leaves(leaves: List[Dict[str, Any]]) -> None:
    try:
        LEAVE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(LEAVE_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(leaves, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to save leave_store.json: {e}")

class LeaveService:
    """
    Manages authentic student leave and on-duty requests with zero fake data.
    """

    def __init__(self):
        self._local_leaves = _load_leaves()

    def _next_id(self) -> int:
        if not self._local_leaves:
            return 1
        return max(l.get("id", 0) for l in self._local_leaves) + 1

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
        if not reason or len(reason.strip()) < 5:
            raise ValueError("Please provide a valid reason (at least 5 characters)")

        if not start_date or not end_date:
            raise ValueError("Start date and end date are required")

        new_record = {
            "id": self._next_id(),
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

        # Attempt Supabase insert if table exists
        try:
            res = supabase.table("leave_requests").insert(new_record).execute()
            if res.data:
                saved = res.data[0]
                self._local_leaves.append(saved)
                _save_leaves(self._local_leaves)
                return saved
        except Exception:
            pass

        self._local_leaves.append(new_record)
        _save_leaves(self._local_leaves)
        return new_record

    def get_student_leaves(self, student_id: int) -> List[Dict[str, Any]]:
        try:
            res = supabase.table("leave_requests").select("*").eq("student_id", student_id).order("id", desc=True).execute()
            if res.data:
                return res.data
        except Exception:
            pass
        return [l for l in self._local_leaves if l.get("student_id") == student_id]

    def get_teacher_leaves(self, teacher_subject_ids: List[int]) -> List[Dict[str, Any]]:
        if not teacher_subject_ids:
            return []
        try:
            res = supabase.table("leave_requests").select("*").in_("subject_id", teacher_subject_ids).order("id", desc=True).execute()
            if res.data:
                return res.data
        except Exception:
            pass
        leaves = [l for l in self._local_leaves if l.get("subject_id") in teacher_subject_ids]
        leaves.sort(key=lambda x: x.get("id", 0), reverse=True)
        return leaves

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
                for l in self._local_leaves:
                    if l.get("id") == leave_id:
                        l["status"] = status
                        l["faculty_remarks"] = remarks
                _save_leaves(self._local_leaves)
                return res.data[0]
        except Exception:
            pass

        for l in self._local_leaves:
            if l.get("id") == leave_id:
                l["status"] = status
                l["faculty_remarks"] = remarks
                _save_leaves(self._local_leaves)
                return l

        raise ValueError(f"Leave request #{leave_id} not found")

    def count_excused_classes(self, student_id: int, subject_id: int) -> int:
        """
        Count approved excused classes for a given student in a given subject.
        Each approved leave counts as 2 excused attendance credits by default.
        """
        leaves = [
            l for l in self._local_leaves
            if l.get("student_id") == student_id and l.get("subject_id") == subject_id and l.get("status") == "approved"
        ]
        return len(leaves) * 2

leave_service = LeaveService()
