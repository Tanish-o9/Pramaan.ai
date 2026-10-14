from src.database.config import supabase

import bcrypt

# first for user name unique check true and false
def check_teacher_exists(username):
    response=supabase.table("teachers").select("username").eq("username",username).execute()
    return len(response.data)>0

def hash_pass(pwd):
    return bcrypt.hashpw(pwd.encode(),bcrypt.gensalt()).decode()
def check_pass(pwd,hased):
    return bcrypt.checkpw(pwd.encode(),hased.encode())
# register
def create_teacher(username,password,name):
    data={"username":username,
          "password":hash_pass(password),
          "name":name}
    response=supabase.table("teachers").insert(data).execute()
    return response.data
# log in

def teacher_login(username,password):
    response=supabase.table("teachers").select("*").eq("username",username).execute()
    if response.data:
        teacher=response.data[0]
        if check_pass(password,teacher["password"]):
            return teacher
    return None    

# 
def get_all_student():
    response=supabase.table("students").select("*").execute()
    return response.data


def create_student(new_name,roll_number,face_embedding=None,voice_embedding=None):
    data={'name':new_name,'face_embedding':face_embedding,"voice_embedding":voice_embedding,"roll_number": roll_number,}
    response=supabase.table('students').insert(data).execute()
    return response.data

def check_roll_exists(roll_number):
    response = supabase.table("students").select("roll_number").eq("roll_number", roll_number).execute()
    return len(response.data) > 0

def create_subjects(subject_code,name,selction,teacher_id):
    data={
        "subject_code":subject_code,"name":name,"section":selction,"teachers_id":teacher_id
    }
    response=supabase.table("subjects").insert(data).execute()
    return response

def get_teacher_subjects(teacher_id):
    response = (
        supabase.table('subjects')
        .select('*, subject_students(count), attendance_logs(timestamp)')
        .eq('teachers_id', teacher_id)        # ✅ column: teachers_id, value: teacher_id
        .execute()
    )
    subjects = response.data

    for sub in subjects:
        # kitne students enrolled hain
        enrolled = sub.get('subject_students', [])
        sub['total_students'] = enrolled[0].get('count', 0) if enrolled else 0

        # kitni classes (sessions) ho chuki hain
        attendance = sub.get('attendance_logs', [])
        unique_sessions = len(set(log['timestamp'] for log in attendance))
        sub['total_classes'] = unique_sessions

        # raw data hata do, sirf clean numbers rakho
        sub.pop('subject_students', None)
        sub.pop('attendance_logs', None)

    return subjects

def enroll_student_to_subject(student_id,subject_id):
    data={'student_id':student_id,"subject_id":subject_id}
    response=supabase.table('subject_students').insert(data).execute()
    return response.data

def unenroll_student_to_subject(student_id,subject_id):
    response=supabase.table("subject_students").delete().eq('student_id',student_id).eq('subject_id',subject_id).execute()
    return response.data


def get_student_subject(student_id):
    response=supabase.table("subject_students").select('*,subjects(*)').eq('student_id',student_id).execute()
    return response.data
def get_student_attendance(student_id):
    response=supabase.table("attendance_logs").select('*,subjects(*)').eq('student_id',student_id).execute()
    return response.data
