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