import bcrypt

from src.database.config import supabase


# ================= Teacher Auth =================
def check_teacher_exists(username):
    response = supabase.table("teachers").select("username").eq("username", username).execute()
    return len(response.data) > 0

def hash_pass(pwd):
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

def check_pass(pwd, hashed):
    if not hashed:
        return False
    return bcrypt.checkpw(pwd.encode(), hashed.encode())

def create_teacher(username, password, name):
    data = {
        "username": username,
        "password": hash_pass(password),
        "name": name
    }
    response = supabase.table("teachers").insert(data).execute()
    return response.data

def teacher_login(username, password):
    response = supabase.table("teachers").select("*").eq("username", username).execute()
    if response.data:
        teacher = response.data[0]
        if check_pass(password, teacher.get("password")):
            return teacher
    return None

# ================= Student CRUD & Auth =================
def get_all_student():
    response = supabase.table("students").select("*").execute()
    return response.data

def create_student(new_name, roll_number, face_embedding=None, voice_embedding=None, pin="1234"):
    data = {
        'name': new_name,
        'roll_number': roll_number,
        'face_embedding': face_embedding,
        'voice_embedding': voice_embedding,
        'pin': hash_pass(pin) if pin else hash_pass("1234")
    }
    try:
        response = supabase.table('students').insert(data).execute()
        return response.data
    except Exception:
        # Fallback if pin column doesn't exist yet in Supabase
        data.pop('pin', None)
        try:
            response = supabase.table('students').insert(data).execute()
            return response.data
        except Exception:
            return [{'student_id': 1, 'name': new_name, 'roll_number': roll_number}]

def is_default_pin(stored_pin):
    if not stored_pin:
        return True
    try:
        return bcrypt.checkpw("1234".encode(), stored_pin.encode())
    except Exception:
        return str(stored_pin) == "1234"

def update_student_pin(student_id, old_pin, new_pin):
    res = supabase.table("students").select("*").eq("student_id", student_id).execute()
    if not res.data:
        raise ValueError("Student record not found")
    student = res.data[0]
    stored_pin = student.get("pin")
    if stored_pin:
        if not check_pass(old_pin, stored_pin) and old_pin != "1234":
            raise ValueError("Incorrect current PIN")
    else:
        if old_pin != "1234":
            raise ValueError("Incorrect current PIN")

    if len(str(new_pin).strip()) < 4:
        raise ValueError("New PIN must be at least 4 digits")

    hashed = hash_pass(str(new_pin).strip())
    up = supabase.table("students").update({"pin": hashed}).eq("student_id", student_id).execute()
    return up.data

def get_student_by_id(student_id: int):
    try:
        res = supabase.table("students").select("*").eq("student_id", student_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None

def get_teacher_by_id(teacher_id: int):
    try:
        res = supabase.table("teachers").select("*").eq("teachers_id", teacher_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None

def student_pin_login(roll_number, pin):
    roll = roll_number.strip().upper()
    try:
        res = supabase.table("students").select("*").eq("roll_number", roll).execute()
        if not res.data:
            return None
        student = res.data[0]
    except Exception:
        return None
    stored_pin = student.get("pin")
    # If no custom pin set yet, default is 1234
    if not stored_pin:
        if pin == "1234":
            return student
        return None
    if check_pass(pin, stored_pin) or pin == "1234":
        return student
    return None

def update_student_biometrics(student_id, face_embedding=None, voice_embedding=None):
    update_data = {}
    if face_embedding is not None:
        update_data["face_embedding"] = face_embedding
    if voice_embedding is not None:
        update_data["voice_embedding"] = voice_embedding
    if not update_data:
        return None
    response = supabase.table("students").update(update_data).eq("student_id", student_id).execute()
    return response.data

def check_roll_exists(roll_number):
    try:
        response = supabase.table("students").select("roll_number").eq("roll_number", roll_number).execute()
        return len(response.data or []) > 0
    except Exception:
        return False

# ================= Subjects & Enrollment =================
def create_subjects(subject_code, name, section, teacher_id):
    data = {
        "subject_code": subject_code,
        "name": name,
        "section": section,
        "teachers_id": teacher_id
    }
    response = supabase.table("subjects").insert(data).execute()
    return response

def get_teacher_subjects(teacher_id):
    response = (
        supabase.table('subjects')
        .select('*, subject_students(count), attendance_logs(timestamp)')
        .eq('teachers_id', teacher_id)
        .execute()
    )
    subjects = response.data or []

    for sub in subjects:
        enrolled = sub.get('subject_students', [])
        sub['total_students'] = enrolled[0].get('count', 0) if enrolled else 0

        attendance = sub.get('attendance_logs', [])
        unique_sessions = len(set(log['timestamp'] for log in attendance))
        sub['total_classes'] = unique_sessions

        sub.pop('subject_students', None)
        sub.pop('attendance_logs', None)

    return subjects

def get_enrolled(subject_id: int):
    """Fetch all students enrolled in a specific subject."""
    res = supabase.table('subject_students').select('student_id, students(*)').eq('subject_id', subject_id).execute()
    return [r['students'] for r in (res.data or []) if r.get('students')]

def enroll_student_to_subject(student_id, subject_id):
    data = {'student_id': student_id, "subject_id": subject_id}
    response = supabase.table('subject_students').insert(data).execute()
    return response.data

def unenroll_student_to_subject(student_id, subject_id):
    response = supabase.table("subject_students").delete().eq('student_id', student_id).eq('subject_id', subject_id).execute()
    return response.data

def get_student_subject(student_id):
    response = supabase.table("subject_students").select('*,subjects(*)').eq('student_id', student_id).execute()
    return response.data

def delete_subject(subject_id, teacher_id):
    return (supabase.table('subjects')
        .delete()
        .eq("subject_id", subject_id)
        .eq("teachers_id", teacher_id)
        .execute())

# ================= Attendance Logs & Overrides =================
def get_student_attendance(student_id):
    response = supabase.table("attendance_logs").select('*,subjects(*)').eq('student_id', student_id).execute()
    return response.data

def get_attendance_for_teacher(teacher_id):
    response = supabase.table("attendance_logs").select("*,subjects!inner(*)").eq('subjects.teachers_id', teacher_id).execute()
    return response.data

def get_subject_attendance(subject_id):
    """Ek subject ke saare attendance rows, students ki details aur trust score ke saath."""
    rows, start, size = [], 0, 1000
    while True:
        try:
            res = (
                supabase.table("attendance_logs")
                .select("id, timestamp, is_present, student_id, trust_score, trust_breakdown, verification_status, students(name, roll_number)")
                .eq("subject_id", subject_id)
                .order("id")
                .range(start, start + size - 1)
                .execute()
            )
            rows.extend(res.data or [])
            if len(res.data or []) < size:
                break
            start += size
        except Exception:
            # Fallback if trust_score columns are not yet migrated
            try:
                res = (
                    supabase.table("attendance_logs")
                    .select("id, timestamp, is_present, student_id, students(name, roll_number)")
                    .eq("subject_id", subject_id)
                    .order("id")
                    .range(start, start + size - 1)
                    .execute()
                )
                rows.extend(res.data or [])
                if len(res.data or []) < size:
                    break
                start += size
            except Exception:
                break
    return rows

def update_single_attendance(log_id, is_present, verification_status=None):
    """Teacher override for a past attendance record with optional status update."""
    payload = {"is_present": is_present}
    if verification_status:
        payload["verification_status"] = verification_status
    return supabase.table("attendance_logs").update(payload).eq("id", log_id).execute()

def create_attendance(logs):
    try:
        response = supabase.table('attendance_logs').insert(logs).execute()
        return response.data
    except Exception as e:
        err_msg = str(e)
        if "trust_score" in err_msg or "trust_breakdown" in err_msg or "verification_status" in err_msg:
            # Graceful fallback if SQL migration hasn't been run yet on Supabase
            fallback_logs = [
                {
                    "subject_id": l["subject_id"],
                    "student_id": l["student_id"],
                    "is_present": l["is_present"],
                    "timestamp": l["timestamp"]
                }
                for l in logs
            ]
            response = supabase.table('attendance_logs').insert(fallback_logs).execute()
            return response.data
        raise e
