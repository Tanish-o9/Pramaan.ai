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