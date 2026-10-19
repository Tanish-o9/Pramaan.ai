import streamlit as st
from src.database.config import supabase
from src.components.header import teacher_dashboard_header
from src.ui.teacher_screen_layout import style_teacher_dashboard
from src.ui.base_layout import style_base_layout
from src.components.footer import footer
from src.components.dialog_create_subject import create_subject_dialog
from src.database.db import get_teacher_subjects
from src.components.subject_card import subject_card
from src.components.dialog_share_subject import share_subject_dialog
from src.components.dialog_add_photos import add_photos_dialog
import numpy as np
from src.components.dialog_delete_subject import delete_subject_dialog
import pandas as pd
from src.components.dialog_attendance_results import attendance_result_dialog
from datetime import datetime
from src.pipline.face_pipline import predict_attendance
def teacher_screen():
    style_base_layout()
    style_teacher_dashboard()

    if'teacher_data' in st.session_state:
        teacher_dashboard()
    elif "teacher_login_type" not in st.session_state or st.session_state.teacher_login_type=="login":
        teacher_screen_login()
    elif st.session_state.teacher_login_type=="register":
        teacher_screen_register()   

def teacher_dashboard():
    teacher_data = st.session_state.teacher_data

    col1, col2 = st.columns(2, vertical_alignment='center', gap="xxlarge")
    with col1:
        teacher_dashboard_header()
    with col2:
        st.subheader(f"Welcome, {teacher_data['name']} 👋")
        if st.button("Logout", type="secondary", key='logoutbtn', shortcut="control+backspace"):
            st.session_state["is_logged_in"] = False
            del st.session_state.teacher_data
            st.rerun()

    st.space()

    if 'current_teacher_tab' not in st.session_state:
        st.session_state.current_teacher_tab = 'take_attendance'   # ✅ fixed typo

    current_tab = st.session_state.current_teacher_tab

    tab1, tab2, tab3 = st.columns(3)
    with tab1:
        if st.button(
            'Take Attendance',
            width='stretch',
            icon=':material/photo_camera:',
            type='primary' if current_tab == 'take_attendance' else 'secondary'
        ):
            st.session_state.current_teacher_tab = 'take_attendance'
            st.rerun()
    with tab2:
        if st.button(
            'Manage Subjects',
            width='stretch',
            icon=':material/book_ribbon:',
            type='primary' if current_tab == 'manage_subjects' else 'secondary'
        ):
            st.session_state.current_teacher_tab = 'manage_subjects'
            st.rerun()
    with tab3:
        if st.button(
            'Attendance Records',
            width='stretch',
            icon=':material/fact_check:',
            type='primary' if current_tab == 'attendance_records' else 'secondary'
        ):
            st.session_state.current_teacher_tab = 'attendance_records'
            st.rerun()

    st.space()
    st.divider()
    st.space()

    # --- Content area, based on selected tab ---
    if current_tab == 'take_attendance':
        teacher_tab_take_attendance()
    elif current_tab == 'manage_subjects':
        teacher_tab_manage_subjects()
    elif current_tab == 'attendance_records':
        teacher_tab_attendance_records()

    footer()


def teacher_tab_take_attendance():
    with st.container(border=True):
        st.subheader("📸 Take Attendance")
        st.caption("Capture a class photo to automatically mark attendance using Face ID.")

        teacher_id=st.session_state.teacher_data["teachers_id"]
        if 'attendance_images' not in st.session_state:
            st.session_state.attendance_mages=[]
        subjects=get_teacher_subjects(teacher_id)

        if not subjects:
            st.warning("You havent created any subjects yet! please create one to begin!")
            return
        subject_options={f"{s['name']}-{s['subject_code']}":s['subject_id'] for s in subjects}

        col1,col2=st.columns([2,1])

        with col1:
            selected_subject_label=st.selectbox("Select Subject",options=list(subject_options.keys()))
        with col2:
            st.space()
            if st.button("Add Photos",type='primary',width='stretch'):
                add_photos_dialog()

        selected_subject_id=subject_options[selected_subject_label]
        st.divider()
        

        images = st.session_state.get('attendance_images', [])
        if images:
            st.write(f"{len(images)}. photo(s) ready to scan")
           
            cols = st.columns(4)
            for i, img in enumerate(images):
                cols[i % 4].image(img, width='stretch')
            c1,c2,c3=st.columns(3)
            with c1:
                if st.button("🗑️ Clear all photos",type="primary",width='stretch'):
                    st.session_state.attendance_images = []
                    st.rerun()

        
            with c2:
                has_photos=bool(st.session_state.attendance_images)
                if st.button("Run Face Analysis",type='primary',width='stretch',icon=":material/analytics:"):
                    with st.spinner('Deep scanning classroom photos....'):
                        all_detected_id={}
                        for idx,img,in enumerate(st.session_state.attendance_images):
                            img_np=np.array(img.convert('RGB'))
                                            
                            detected,_,_=predict_attendance(img_np)
                            if detected:
                                for sid in detected.keys():
                                    student_id=int(sid)
                                    all_detected_id.setdefault(student_id,[]).append(f"Photo {idx+1}")
                        enrolled_res=supabase.table("subject_students").select("*,students(*)").eq("subject_id",selected_subject_id).execute()
                        enrolled_students=enrolled_res.data
                        if not enrolled_students:
                            st.warning("No students enrolled in this course")
                        else:
                            results,attendance_to_log=[],[]

                            current_timestamp=datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

                            for node in enrolled_students:
                                student=node["students"]
                                sources=all_detected_id.get(int(student["student_id"]),[])
                                is_present=len(sources) >0
                                results.append({
                                    "Name":student["name"],
                                    "Roll No":student.get("roll_number") or "-",
                                    "Source":",".join(sources) if is_present else "-",
                                    "Status":"✅Present" if is_present else "❌ Absent"
                                })
                                attendance_to_log.append({
                                    'student_id':student["student_id"],
                                    "subject_id":selected_subject_id,
                                    "timestamp":current_timestamp,
                                    "is_present":bool(is_present)
                            
                                })
                        attendance_result_dialog(pd.DataFrame(results),attendance_to_log)
            with c3:
                if st.button("Use Voice Attendance",type='primary',width='stretch',icon=':material/mic:'):
                    voice_attendace_dialog()
    
                        

            
def teacher_tab_manage_subjects():
    teacher_id = st.session_state.teacher_data["teachers_id"]

   
    with st.container(border=True):
        col1, col2 = st.columns([1.5, 1], vertical_alignment='center')
        with col1:
            st.subheader("📘 Manage Subjects")
            st.caption("Create subjects, enroll students, and organize your classes.")
        with col2:
            if st.button("➕ Create New Subject", width='stretch', type='primary'):
                create_subject_dialog(teacher_id)

    # list all subjects
    subjects = get_teacher_subjects(teacher_id)
    if subjects:
        for sub in subjects:
            stats = [
                ("👥", "Students", sub['total_students']),
                ("🕰️", "Classes", sub['total_classes']),
            ]

            def share_btn(sub=sub):   # ✅ har subject ka apna data bind
                b1, b2 = st.columns([4, 1])
                with b1:
                    if st.button(
                        f"Share Code: {sub['name']}",
                        key=f"share_{sub['subject_id']}",
                        icon=":material/share:",
                        width='stretch',
                    ):
                        share_subject_dialog(sub['name'], sub['subject_code'])
                with b2:
                    if st.button(
                        "",
                        key=f"del_{sub['subject_id']}",
                        icon=":material/delete:",
                        help="Delete this subject",
                        width='stretch',
                    ):
                        delete_subject_dialog(sub, teacher_id)
                st.space()

            subject_card(                 # ✅ ab loop ke andar
                name=sub["name"],
                code=sub["subject_code"],
                section=sub["section"],
                stats=stats,
                footer_callback=share_btn
            )
    else:
        st.info("No subjects found. Create one above!")

    
        

def teacher_tab_attendance_records():
    with st.container(border=True):
        st.subheader("📊 Attendance Records")
        st.caption("View attendance history and export reports.")
        st.info("This section is under construction — records view coming soon.")
        
             







from src.database.db import create_teacher,teacher_login

def login_teacher(username,password):
    if not username or not password:
        return False
    teacher=teacher_login(username,password)
    if teacher:
        st.session_state.user_role='teacher'
        st.session_state.teacher_data=teacher
        st.session_state.is_logged_int=True
        return True

def teacher_screen_login():
        col1,col2 =st.columns(2,vertical_alignment='center',gap="xxlarge")
        with col1:
            teacher_dashboard_header()
        with col2:
            # adding shortcut keys
            if st.button("Go to back to home",type="secondary",key='loginbackbtn',shortcut="control+backspace"):
                 st.session_state["login_type"]=None
                 st.rerun() 
    
        st.header("Login using password", text_alignment="center")
        st.space()
        teacher_username=st.text_input("Enter username",placeholder="sagar_yadav_96")
        teacher_pass=st.text_input("Enter password",type="password",placeholder="Enter your password")
        st.divider()
        btn_col1, btn_col2 = st.columns(2)
        with btn_col1:
           if st.button("Login Now",icon=":material/passkey:",shortcut='control+Enter', type="primary", use_container_width=True):
                if login_teacher(teacher_username,teacher_pass):
                    st.toast("Welcome back!")
                    import time
                    time.sleep(2)
                    st.rerun()
                else:
                    st.error("Invalid username and password")    






        with btn_col2:
            if st.button("Register Instead",icon=":material/passkey:", type="primary", use_container_width=True,shortcut='control+Enter'):
                st.session_state.teacher_login_type="register"
        st.space()
        footer()
 # dp function       
from src.database.db import check_teacher_exists


# register function db
def register_teacher(teacher_username,teacher_name,teacher_pass,teacher_pass_confirm):
    if not teacher_username or not teacher_name or not teacher_pass:
        return False,"All Fields are required!"
    if check_teacher_exists(teacher_username):
        return False,"Username already taken"
    if teacher_pass!=teacher_pass_confirm:
        return False,"Password doesn't match"
    try:
        create_teacher(teacher_username,teacher_pass,teacher_name)
        return True,"Sucessfully Created! Login Now"
    except Exception as e:
         return False,"Unexpected Error"
         

def teacher_screen_register():
        col1,col2 =st.columns(2,vertical_alignment='center',gap="xxlarge")
        with col1:
             teacher_dashboard_header()
        with col2:
             # adding shortcut keys
            if st.button("Go to back to home",type="secondary",key='loginbackbtn',shortcut="control+backspace"):
                 st.session_state["login_type"]=None
                 st.rerun()
     
        
        st.header("Register  Your  Teacher profile 👨‍🏫", text_alignment="center")
        
        teacher_username=st.text_input("Enter username",placeholder="sagar_yadav_96")
        teacher_name=st.text_input("Enter name",placeholder="sagar yadav")
        teacher_pass=st.text_input("Enter password",type="password",placeholder="Enter password")

        teacher_pass_confirm=st.text_input("Confirm your password",type="password",placeholder="Enter password")
        st.divider()
        btn_col1, btn_col2 = st.columns(2)
        with btn_col1:
            if st.button("Register Now",icon=":material/passkey:",shortcut='control+Enter', type="primary", use_container_width=True):
                success,message=register_teacher(teacher_username,teacher_name,teacher_pass,teacher_pass_confirm)
                if success:
                    st.success(message)
                    
                    import time
                    time.sleep(2)
                    st.session_state.teacher_login_type="login"
                    st.rerun()
                else:
                    st.error(message) 

        with btn_col2:
            if st.button("Login Instead",icon=":material/passkey:", type="primary", use_container_width=True,shortcut='control+Enter'):
                 st.session_state.teacher_login_type="login"
        st.space()
        footer() 