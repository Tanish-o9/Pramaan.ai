"""
Seed comprehensive demo data for Pramaan.ai:
- Multiple subjects assigned to Dr. Tanish Rajput
- Realistic engineering students with PIN 1234
- Full subject enrollments for all students including student tani (25153162)
- Multi-day attendance logs with trust scores and verification statuses
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from src.database.config import supabase
from src.database.db import hash_pass


def run_seed():
    print("🚀 Starting Pramaan demo data seeding...\n")

    # 1. Verify / Get Teacher
    teacher_res = supabase.table("teachers").select("*").eq("username", "tanish_rajput").execute()
    if not teacher_res.data:
        print("Creating teacher tanish_rajput...")
        t_data = {
            "username": "tanish_rajput",
            "password": hash_pass("1234"),
            "name": "Dr. Tanish Rajput"
        }
        teacher = supabase.table("teachers").insert(t_data).execute().data[0]
    else:
        teacher = teacher_res.data[0]
    teacher_id = teacher["teachers_id"]
    print(f"✅ Active Teacher: {teacher['name']} (ID: {teacher_id})")

    # 2. Update existing student 3 if needed
    try:
        supabase.table("students").update({"name": "Aditya Verma", "roll_number": "22CS044"}).eq("student_id", 3).execute()
    except Exception as e:
        print(f"Note on student 3: {e}")

    # Ensure tani has proper name
    try:
        supabase.table("students").update({"name": "Tanish Rajput (You)"}).eq("roll_number", "25153162").execute()
    except Exception as e:
        print(f"Note on tani: {e}")

    # 3. New Students to Seed
    demo_students = [
        {"name": "Ananya Deshmukh", "roll_number": "22CS045"},
        {"name": "Rohan Gupta", "roll_number": "22CS046"},
        {"name": "Sneha Patel", "roll_number": "22CS047"},
        {"name": "Vikramaditya Rao", "roll_number": "22CS048"},
        {"name": "Ishita Joshi", "roll_number": "22CS049"},
        {"name": "Kabir Mehta", "roll_number": "22CS050"},
        {"name": "Neha Choudhary", "roll_number": "22CS051"},
        {"name": "Arjun Kapoor", "roll_number": "22CS052"},
    ]

    pin_hash = hash_pass("1234")
    for s in demo_students:
        existing = supabase.table("students").select("*").eq("roll_number", s["roll_number"]).execute()
        if not existing.data:
            s_data = {
                "name": s["name"],
                "roll_number": s["roll_number"],
                "pin": pin_hash
            }
            try:
                supabase.table("students").insert(s_data).execute()
                print(f"  + Added student {s['name']} ({s['roll_number']})")
            except Exception as ex:
                s_data.pop("pin", None)
                supabase.table("students").insert(s_data).execute()
                print(f"  + Added student (fallback) {s['name']} ({s['roll_number']})")
        else:
            print(f"  • Student {s['name']} ({s['roll_number']}) already exists")

    # Retrieve all current students
    all_students = supabase.table("students").select("student_id, name, roll_number").execute().data or []
    print(f"\n✅ Total Students in Database: {len(all_students)}")
    for s in all_students:
        print(f"    - [{s['student_id']}] {s['roll_number']}: {s['name']}")

    # 4. Subjects to Seed
    demo_subjects = [
        {"subject_code": "CS501", "name": "Deep Learning & Neural Networks", "section": "A"},
        {"subject_code": "CS502", "name": "Computer Vision & Biometrics", "section": "A"},
        {"subject_code": "CS503", "name": "Cloud Systems & Distributed Computing", "section": "B"},
        {"subject_code": "CS504", "name": "Natural Language Processing", "section": "A"},
    ]

    subjects_map = {}
    for sub in demo_subjects:
        res = (
            supabase.table("subjects")
            .select("*")
            .eq("subject_code", sub["subject_code"])
            .eq("teachers_id", teacher_id)
            .execute()
        )
        if not res.data:
            # Check without teacher filter
            res_any = supabase.table("subjects").select("*").eq("subject_code", sub["subject_code"]).execute()
            if res_any.data:
                sub_rec = res_any.data[0]
                # Update teacher id to 1
                supabase.table("subjects").update({"teachers_id": teacher_id, "name": sub["name"]}).eq("subject_id", sub_rec["subject_id"]).execute()
                subjects_map[sub["subject_code"]] = sub_rec["subject_id"]
                print(f"  • Updated subject {sub['subject_code']}: {sub['name']} (ID: {sub_rec['subject_id']})")
            else:
                new_sub = {
                    "subject_code": sub["subject_code"],
                    "name": sub["name"],
                    "section": sub["section"],
                    "teachers_id": teacher_id
                }
                sub_rec = supabase.table("subjects").insert(new_sub).execute().data[0]
                subjects_map[sub["subject_code"]] = sub_rec["subject_id"]
                print(f"  + Created subject {sub['subject_code']}: {sub['name']} (ID: {sub_rec['subject_id']})")
        else:
            sub_rec = res.data[0]
            subjects_map[sub["subject_code"]] = sub_rec["subject_id"]
            print(f"  • Subject {sub['subject_code']} already exists (ID: {sub_rec['subject_id']})")

    # 5. Enroll Students in Subjects (subject_students)
    print("\n📝 Enrolling students across active subjects...")
    for sub_code, sub_id in subjects_map.items():
        # Get existing enrolled student IDs
        enrolled_res = supabase.table("subject_students").select("student_id").eq("subject_id", sub_id).execute()
        enrolled_ids = {r["student_id"] for r in (enrolled_res.data or [])}

        to_enroll = []
        for s in all_students:
            if s["student_id"] not in enrolled_ids:
                to_enroll.append({"subject_id": sub_id, "student_id": s["student_id"]})

        if to_enroll:
            try:
                supabase.table("subject_students").insert(to_enroll).execute()
                print(f"  ✅ Enrolled {len(to_enroll)} students into {sub_code} (Subject ID: {sub_id})")
            except Exception as e:
                print(f"  ⚠️ Error enrolling students into {sub_code}: {e}")
        else:
            print(f"  • All {len(all_students)} students already enrolled in {sub_code}")

    # 6. Seed Multi-Day Attendance Logs
    print("\n📅 Generating realistic historical attendance sessions...")
    now = datetime.now(timezone.utc)

    # We generate 12 past sessions for CS501 and 8 sessions for CS502
    session_dates_cs501 = [
        now - timedelta(days=14, hours=2),
        now - timedelta(days=13, hours=1),
        now - timedelta(days=11, hours=3),
        now - timedelta(days=10, hours=2),
        now - timedelta(days=9, hours=4),
        now - timedelta(days=7, hours=1),
        now - timedelta(days=6, hours=2),
        now - timedelta(days=4, hours=3),
        now - timedelta(days=3, hours=1),
        now - timedelta(days=2, hours=2),
        now - timedelta(days=1, hours=3),
        now - timedelta(hours=4),
    ]

    cs501_id = subjects_map["CS501"]

    # Delete old attendance logs for CS501 to have clean, calibrated demo data
    try:
        supabase.table("attendance_logs").delete().eq("subject_id", cs501_id).execute()
        print("  Cleared old logs for CS501 to seed calibrated history")
    except Exception as e:
        print(f"  Note on clear logs: {e}")

    attendance_batch = []
    for session_idx, sess_time in enumerate(session_dates_cs501):
        ts = sess_time.isoformat()
        for s in all_students:
            s_id = s["student_id"]
            roll = s.get("roll_number", "")

            # Preset attendance patterns for testing various states:
            # - tani (25153162): Attends 10 out of 12 classes (absent at session 3 and 7) -> ~83.3% safe
            # - Aditya Verma (22CS044): Attends only 4 classes -> CRITICAL Defaulter (33.3%)
            # - Rohan Gupta (22CS046): Attends only 5 classes -> CRITICAL Defaulter (41.7%)
            # - Priya Singh (22CS043): Attends 8 classes -> 66.7% Warning Defaulter
            # - Rahul Sharma (22CS042): Attends 11 classes -> 91.7% High honor
            # - Others: 9-11 classes
            if "25153162" in roll:
                is_present = (session_idx not in (2, 6))
            elif "22CS044" in roll:
                is_present = (session_idx in (0, 4, 8, 11))
            elif "22CS046" in roll:
                is_present = (session_idx in (1, 5, 7, 9, 10))
            elif "22CS043" in roll:
                is_present = (session_idx not in (1, 3, 5, 8))
            elif "22CS042" in roll:
                is_present = (session_idx != 4)
            else:
                # Modulo pseudo-random based on ID and session
                is_present = ((s_id + session_idx) % 5 != 0)

            trust_score = 0.96 if is_present else 0.0
            status = "VERIFIED" if is_present else "ABSENT"

            log_entry = {
                "subject_id": cs501_id,
                "student_id": s_id,
                "is_present": is_present,
                "timestamp": ts,
            }
            # Attempt to include trust score fields if available
            try:
                log_entry["trust_score"] = trust_score
                log_entry["verification_status"] = status
            except Exception:
                pass
            attendance_batch.append(log_entry)

    # Insert in chunks of 50
    chunk_size = 50
    inserted_count = 0
    for i in range(0, len(attendance_batch), chunk_size):
        chunk = attendance_batch[i:i + chunk_size]
        try:
            supabase.table("attendance_logs").insert(chunk).execute()
            inserted_count += len(chunk)
        except Exception as e:
            # Fallback without trust_score/verification_status if table lacks columns
            clean_chunk = [
                {
                    "subject_id": c["subject_id"],
                    "student_id": c["student_id"],
                    "is_present": c["is_present"],
                    "timestamp": c["timestamp"],
                }
                for c in chunk
            ]
            supabase.table("attendance_logs").insert(clean_chunk).execute()
            inserted_count += len(clean_chunk)

    print(f"  ✅ Inserted {inserted_count} attendance records for CS501 across 12 lecture dates!")

    # 7. Also seed attendance for CS502 (8 sessions)
    cs502_id = subjects_map.get("CS502")
    if cs502_id:
        try:
            supabase.table("attendance_logs").delete().eq("subject_id", cs502_id).execute()
        except Exception:
            pass
        batch_502 = []
        for session_idx in range(8):
            ts = (now - timedelta(days=12 - session_idx, hours=3)).isoformat()
            for s in all_students:
                s_id = s["student_id"]
                roll = s.get("roll_number", "")
                if "25153162" in roll:
                    is_present = (session_idx != 3)  # 7 of 8 = 87.5%
                else:
                    is_present = ((s_id + session_idx) % 4 != 0)

                batch_502.append({
                    "subject_id": cs502_id,
                    "student_id": s_id,
                    "is_present": is_present,
                    "timestamp": ts
                })
        for i in range(0, len(batch_502), chunk_size):
            chunk = batch_502[i:i + chunk_size]
            try:
                supabase.table("attendance_logs").insert(chunk).execute()
            except Exception:
                pass
        print(f"  ✅ Inserted {len(batch_502)} attendance records for CS502 across 8 lecture dates!")

    print("\n✨ Demo data seeding finished successfully!")

if __name__ == "__main__":
    run_seed()
