"""
Classroom Seat Map & Spatial Attendance Service for Pramaan / Presence.ai.
Manages classroom layouts (rows x columns) and student desk assignments.
"""
from typing import Dict, Any, List, Optional

class SeatmapService:
    def __init__(self):
        # In-memory storage for subject seat maps
        # Key: subject_id -> config
        self._seatmaps: Dict[int, Dict[str, Any]] = {}

    def get_or_create_seatmap(
        self, 
        subject_id: int, 
        rows: int = 5, 
        cols: int = 6, 
        enrolled_students: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Retrieves existing seat map for a subject, or initializes default grid with enrolled students.
        """
        if subject_id in self._seatmaps:
            m = self._seatmaps[subject_id]
            # Update student metadata if provided
            if enrolled_students:
                self._sync_attendance_status(m, enrolled_students)
            return m

        # Initialize default grid
        seats = []
        enrolled = enrolled_students or []
        std_idx = 0

        for r in range(1, rows + 1):
            for c in range(1, cols + 1):
                student_info = None
                if std_idx < len(enrolled):
                    s = enrolled[std_idx]
                    student_info = {
                        "student_id": s.get("student_id"),
                        "name": s.get("name"),
                        "roll_number": s.get("roll_number"),
                        "status": "PRESENT" if s.get("is_present") else "ABSENT"
                    }
                    std_idx += 1

                seats.append({
                    "seat_id": f"R{r}C{c}",
                    "row": r,
                    "col": c,
                    "student": student_info
                })

        new_map = {
            "subject_id": subject_id,
            "rows": rows,
            "cols": cols,
            "total_seats": rows * cols,
            "assigned_count": len(enrolled),
            "seats": seats
        }
        self._seatmaps[subject_id] = new_map
        return new_map

    def _sync_attendance_status(self, seatmap: Dict[str, Any], enrolled_students: List[Dict[str, Any]]):
        status_map = {s.get("student_id"): s.get("is_present", False) for s in enrolled_students}
        for seat in seatmap.get("seats", []):
            st = seat.get("student")
            if st and st.get("student_id") in status_map:
                st["status"] = "PRESENT" if status_map[st["student_id"]] else "ABSENT"

    def assign_seat(self, subject_id: int, seat_id: str, student: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Manually assigns or vacates a student at a specific desk."""
        m = self._seatmaps.get(subject_id)
        if not m:
            return {"success": False, "error": "Seatmap not found"}

        for s in m["seats"]:
            if s["seat_id"] == seat_id:
                s["student"] = student
                return {"success": True, "seat": s}

        return {"success": False, "error": "Seat ID not found"}

    def auto_arrange(self, subject_id: int, enrolled_students: List[Dict[str, Any]], order_by: str = "roll") -> Dict[str, Any]:
        """Automatically assigns students across desks in alphabetical or roll number order."""
        m = self.get_or_create_seatmap(subject_id, enrolled_students=enrolled_students)
        sorted_stds = sorted(
            enrolled_students, 
            key=lambda x: str(x.get("roll_number" if order_by == "roll" else "name", "")).lower()
        )

        seats = m["seats"]
        for i, seat in enumerate(seats):
            if i < len(sorted_stds):
                s = sorted_stds[i]
                seat["student"] = {
                    "student_id": s.get("student_id"),
                    "name": s.get("name"),
                    "roll_number": s.get("roll_number"),
                    "status": "PRESENT" if s.get("is_present") else "ABSENT"
                }
            else:
                seat["student"] = None

        m["assigned_count"] = min(len(sorted_stds), len(seats))
        return m

seatmap_service = SeatmapService()

