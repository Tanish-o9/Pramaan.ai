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
from src.components.dialog_voice_attendance import voice_attendance_dialog
from src.components.dialog_delete_subject import delete_subject_dialog
import pandas as pd
from src.utiils import roll_sort_key
from src.components.dialog_attendance_results import attendance_result_dialog
from datetime import datetime,timezone
from src.pipline.face_pipline import predict_attendance
from src.database.db import get_attendance_for_teacher
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
            '📋 Take Attendance',
            width='stretch',
            
            type='primary' if current_tab == 'take_attendance' else 'secondary'
        ):
            st.session_state.current_teacher_tab = 'take_attendance'
            st.rerun()
    with tab2:
        if st.button(
            '📚  Manage Subjects',
            width='stretch',
            
            type='primary' if current_tab == 'manage_subjects' else 'secondary'
        ):
            st.session_state.current_teacher_tab = 'manage_subjects'
            st.rerun()
    with tab3:
        if st.button(
            '🗂️ Attendance Records',
            width='stretch',
            
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


def get_enrolled_students(subject_id):
    res = (
        supabase.table("subject_students")
        .select("student_id, students(student_id, name, roll_number)")
        .eq("subject_id", subject_id)
        .execute()
    )
    return [n["students"] for n in res.data if n.get("students")]


def teacher_tab_take_attendance():
    teacher_id = st.session_state.teacher_data["teachers_id"]

    with st.container(border=True):
        st.subheader("📋 Take Attendance")        # camera emoji hata diya
        st.caption("Choose a subject and a method to mark attendance.")

        subjects = get_teacher_subjects(teacher_id)
        if not subjects:
            st.warning("You haven't created any subjects yet! Please create one to begin.")
            return

        subject_options = {f"{s['name']} - {s['subject_code']}": s['subject_id'] for s in subjects}
        label = st.selectbox("Select Subject", options=list(subject_options.keys()))
        subject_id = subject_options[label]

        st.space()

        # naya session key, purane "attendance_method" se takkar na ho
        if st.session_state.get('att_method') not in ('photos', 'voice', 'manual'):
            st.session_state.att_method = 'photos'
        method = st.session_state.att_method

        st.caption("Attendance method")
        m1, m2, m3 = st.columns(3)
        with m1:
            if st.button("Photos", icon=":material/photo_library:", width='stretch',
                         key="method_photos",
                         type='primary' if method == 'photos' else 'secondary'):
                st.session_state.att_method = 'photos'
                st.rerun()
        with m2:
            if st.button("Voice", icon=":material/mic:", width='stretch',
                         key="method_voice",
                         type='primary' if method == 'voice' else 'secondary'):
                st.session_state.att_method = 'voice'
                st.rerun()
        with m3:
            if st.button("Manual", icon=":material/checklist:", width='stretch',
                         key="method_manual",
                         type='primary' if method == 'manual' else 'secondary'):
                st.session_state.att_method = 'manual'
                st.rerun()

        st.divider()

        if method == 'voice':
            attendance_voice_mode(subject_id)
        elif method == 'manual':
            attendance_manual_mode(subject_id)
        else:
            attendance_photo_mode(subject_id)
def attendance_photo_mode(subject_id):
    images = st.session_state.setdefault('attendance_images', [])

    if st.button("➕ Add photos", width='stretch'):
        add_photos_dialog()

    if not images:
        st.info("No photos yet. Add classroom photos to begin.")
        return

    st.write(f"**{len(images)}** photo(s) ready to scan")
    cols = st.columns(4)
    for i, img in enumerate(images):
        cols[i % 4].image(img, width='stretch')

    c1, c2 = st.columns(2)
    with c1:
        if st.button("🗑️ Clear all photos", width='stretch'):
            st.session_state.attendance_images = []
            st.rerun()
    with c2:
        if st.button("Run Face Analysis", type='primary', width='stretch',
                     icon=":material/analytics:"):
            run_face_analysis(subject_id, images)


def run_face_analysis(subject_id, images):
    with st.spinner("Deep scanning classroom photos...."):
        detected_map = {}
        for idx, img in enumerate(images):
            detected, _, _ = predict_attendance(np.array(img.convert('RGB')))
            for sid in detected.keys():
                detected_map.setdefault(int(sid), []).append(f"Photo {idx + 1}")
        students = get_enrolled_students(subject_id)

    if not students:
        st.warning("No students enrolled in this course")
        return

    timestamp = datetime.now(timezone.utc).isoformat()
    results, to_log = [], []
    for s in students:
        sources = detected_map.get(int(s["student_id"]), [])
        present = len(sources) > 0
        results.append({
            "Roll No": s.get("roll_number") or "-",
            "Name": s["name"],
            "Source": ", ".join(sources) if present else "-",
            "Status": "✅ Present" if present else "❌ Absent",
        })
        to_log.append({
            "student_id": s["student_id"],
            "subject_id": subject_id,
            "timestamp": timestamp,
            "is_present": present,
        })

    results.sort(key=lambda r: roll_sort_key(r["Roll No"]))
    attendance_result_dialog(pd.DataFrame(results), to_log)


def attendance_manual_mode(subject_id):
    students = get_enrolled_students(subject_id)
    if not students:
        st.warning("No students enrolled in this course")
        return

    students.sort(key=lambda s: (roll_sort_key(s.get("roll_number")), s["name"].lower()))

    all_present = st.toggle("Mark everyone present", value=False)
    df = pd.DataFrame({
        "Present": [all_present] * len(students),
        "Roll No": [s.get("roll_number") or "-" for s in students],
        "Name": [s["name"] for s in students],
    })

    edited = st.data_editor(
        df,
        key=f"manual_editor_{subject_id}_{all_present}",   # toggle badalne par table reset
        hide_index=True,
        disabled=["Roll No", "Name"],
        width='stretch',
    )

    if st.button("Review & Save", type='primary', width='stretch'):
        timestamp = datetime.now(timezone.utc).isoformat()
        to_log = [
            {
                "student_id": s["student_id"],
                "subject_id": subject_id,
                "timestamp": timestamp,
                "is_present": bool(p),
            }
            for s, p in zip(students, edited["Present"])
        ]
        view = edited[["Roll No", "Name"]].copy()
        view["Status"] = ["✅ Present" if p else "❌ Absent" for p in edited["Present"]]
        attendance_result_dialog(view, to_log)


def attendance_voice_mode(subject_id):
    st.caption("Record the whole class. Each student says a short phrase one after another.")
    if st.button("Start voice attendance", type='primary', width='stretch', icon=":material/mic:"):
        st.session_state.pop(f"voice_result_{subject_id}", None)   # purana result saaf
        voice_attendance_dialog(subject_id)
                        

            
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
        st.header("📊 Attendance Records")

        teacher_id=st.session_state.teacher_data["teacher_id"]

        records=get_attendance_for_teacher(teacher_id)

        if not records:
            return
        data=[]
        for r in records:
            ts=r.get("timestamp")
            data.append({
                "ts_group":ts.split(".")[0] if ts else None,
                "Time":datetime.fromisoformat(ts).strftime("%Y-%m-%d %I:%M %p") if ts else "N'A",
                "Subject":r["subjects"]["name"],
                "Subject Code":r["subjects"]["subject_code"],
                "is_present":bool(r.get("is_present",False))
            })
             
        df=pd.DataFrame(data)

        summary=(
            df.groupby(["ts_group","Time","Subject","Subject Code"])
            .agg(
                Present_Count=('is_present','sum'),
                Tital_Count=('is_present','count')
            ).reset_index

        )

        summary["Attendance Stats"]=(
                "✅"+summary["Present_Count"].astype(str)+" /"+summary["Total_Count"].astype(str)+'Students'
            )
        display_df=(summary.sort_values(groupby='ts_group',ascending=False)[["Time","Subject","Subject Code","Attendance Stats"]])









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