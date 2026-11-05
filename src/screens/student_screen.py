import streamlit as st
import numpy as np
from PIL import Image
import time
from src.ui.base_layout import style_base_layout
from src.ui.teacher_screen_layout import style_teacher_dashboard
from src.components.header import teacher_dashboard_header
from src.components.footer import footer
from src.pipline.face_pipline import predict_attendance, get_face_embeddings, train_classifier
from src.pipline.voice_pipline import get_voice_embedding
from src.components.subject_card import subject_card
from src.components.dialog_enroll import enroll_dialog
from src.database.db import (
    get_all_student,
    create_student,
    student_pin_login,
    update_student_biometrics,
    check_roll_exists,
    get_student_subject,
    get_student_attendance,
    unenroll_student_to_subject
)

@st.dialog("Update Your Biometric Profile")
def update_biometrics_dialog(student_id):
    st.caption("Re-scan your face or voice if lighting/appearance has changed.")
    tab_face, tab_voice = st.tabs(["📸 Face Re-scan", "🎙️ Voice Re-scan"])
    
    with tab_face:
        new_cam = st.camera_input("Capture Fresh Face", key="update_face_cam")
        if new_cam and st.button("Save New Face Profile", type="primary", key="save_face_btn"):
            img = np.array(Image.open(new_cam))
            encs = get_face_embeddings(img)
            if encs:
                update_student_biometrics(student_id, face_embedding=encs[0].tolist())
                train_classifier()
                st.success("Face ID profile updated successfully!")
                time.sleep(1)
                st.rerun()
            else:
                st.error("Face not clearly detected. Try again in good lighting.")

    with tab_voice:
        new_audio = st.audio_input("Record Voice Sample (e.g. 'I am present')")
        if new_audio and st.button("Save New Voice Profile", type="primary", key="save_voice_btn"):
            v_emb = get_voice_embedding(new_audio.read())
            if v_emb:
                update_student_biometrics(student_id, voice_embedding=v_emb)
                st.success("Voice profile updated successfully!")
                time.sleep(1)
                st.rerun()
            else:
                st.error("Could not capture audio profile clearly.")

def student_dashboard():
    student_data = st.session_state.student_data
    student_id = student_data["student_id"]
    
    col1, col2 = st.columns(2, vertical_alignment='center', gap="large")
    with col1:
        teacher_dashboard_header()
    with col2:
        st.subheader(f"Welcome, {student_data['name']} 🎓")
        c_btn1, c_btn2 = st.columns(2)
        with c_btn1:
            if st.button("🔄 Update Biometrics", type="secondary", width='stretch'):
                update_biometrics_dialog(student_id)
        with c_btn2:
            if st.button("Logout", type="secondary", key='logoutbtn', shortcut="control+backspace", width='stretch'):
                st.session_state["is_logged_in"] = False
                del st.session_state.student_data
                st.rerun()
    
    st.space()

    c1, c2 = st.columns(2)
    with c1:
        st.header("Your Enrolled Subjects")
    with c2:
        if st.button("➕ Enroll in subject", type='primary', width='stretch'):
            enroll_dialog()
    
    st.divider()

    with st.spinner("Loading your enrolled subjects & attendance..."):
        subjects = get_student_subject(student_id)
        logs = get_student_attendance(student_id)

    stats_map = {}
    for log in logs:
        sid = log['subject_id']
        if sid not in stats_map:
            stats_map[sid] = {'total': 0, "attended": 0}

        stats_map[sid]["total"] += 1
        if log.get("is_present"):
            stats_map[sid]['attended'] += 1

    if not subjects:
        st.info("You haven't enrolled in any subjects yet. Click 'Enroll in subject' above!")
    else:
        for i, sub_node in enumerate(subjects):
            sub = sub_node["subjects"]
            sid = sub['subject_id']
            stats = stats_map.get(sid, {'total': 0, "attended": 0})
            total = stats['total']
            attended = stats['attended']
            pct = round((attended / total * 100), 1) if total > 0 else 0.0

            # Feature 2: Bunk / Target Calculator Logic (75% Criteria)
            calc_badge = ""
            if total > 0:
                if pct >= 75.0:
                    # Can bunk classes?
                    # attended / (total + x) >= 0.75  =>  x <= (attended / 0.75) - total
                    bunks = int(attended / 0.75 - total)
                    calc_badge = f"🟢 Safe! You can bunk **{max(0, bunks)}** class(es) & stay ≥ 75%"
                else:
                    # Need to attend classes?
                    # (attended + x) / (total + x) >= 0.75  =>  x >= 3*total - 4*attended
                    need = max(0, 3 * total - 4 * attended)
                    calc_badge = f"🔴 Shortage! Attend next **{need}** class(es) continuously to reach 75%"

            def unenroll_button(sid=sid, sub=sub):
                if st.button(f"Unenroll from {sub['name']}", type="tertiary", width='stretch', key=f"unenroll_{sid}"):
                    unenroll_student_to_subject(student_id, sid)
                    st.toast(f"Unenrolled from {sub['name']} successfully")
                    st.rerun()

            status_icon = "🚨" if pct < 75.0 and total > 0 else "🎯"
            subject_card(
                name=sub["name"],
                code=sub["subject_code"],
                section=sub['section'],
                stats=[
                    ('📚', 'Total Classes', total),
                    ('✅', 'Attended', attended),
                    (status_icon, 'Attendance', f"{pct}%"),
                ],
                footer_callback=unenroll_button
            )
            if calc_badge:
                st.caption(calc_badge)
            st.space()

    footer()

def student_screen():
    style_base_layout()
    style_teacher_dashboard()
    
    if "student_data" in st.session_state:
        student_dashboard()
        return

    c1, c2 = st.columns(2, vertical_alignment='center', gap='large')
    with c1:
        teacher_dashboard_header()
    with c2:
        if st.button("Go back to home", type="secondary", key='loginbackbtn', shortcut="control+backspace"):
            st.session_state["login_type"] = None
            st.rerun() 
        
    st.header("Student Portal Login", text_alignment="center")
    st.space()

    # Feature 4: Dual Login Support (Face ID or Backup Roll No + PIN)
    login_tab_face, login_tab_pin = st.tabs(["⚡ Login with Face ID", "🔑 Login with Roll No & PIN"])

    with login_tab_face:
        show_registration = False
        photo_source = st.camera_input("Position your face in the center", key="cam_student_login")
        if photo_source:
            img = np.array(Image.open(photo_source))
            with st.spinner("AI is scanning biometric landmarks..."):
                detected, all_ids, num_faces = predict_attendance(img)
                if num_faces == 0:
                    st.warning("Face not found. Please look directly at the camera.")
                elif num_faces > 1:
                    st.warning("Multiple faces found in frame. Single face required.")
                else:
                    if detected:
                        student_id = list(detected.keys())[0]
                        all_students = get_all_student()
                        student = next((s for s in all_students if s["student_id"] == student_id), None)
                        if student:
                            st.session_state.is_logged_in = True
                            st.session_state.user_role = "student"
                            st.session_state.student_data = student
                            st.toast(f"Welcome Back {student['name']}!")
                            time.sleep(1)
                            st.rerun()
                    else:
                        st.info("Face not recognized! If you are a new student, register below.")
                        show_registration = True

        if show_registration:
            with st.container(border=True):
                st.header("Register New Student Profile")
                new_name = st.text_input("Full Name", placeholder='E.g. Tanish Rajput')
                new_roll = st.text_input("Roll Number", placeholder='E.g. 2025-CS-40')
                new_pin = st.text_input("Backup 4-digit PIN", type="password", value="1234", max_chars=6)
                
                st.subheader("Optional: Voice Enrollment")
                st.caption("Enroll voice sample for dual biometric or voice attendance.")
                audio_data = None
                try:
                    audio_data = st.audio_input("Record: 'I am present, my name is Tanish.'")
                except Exception:
                    st.error("Audio recording unavailable on this device.")

                if st.button("Create Profile Now", type='primary', width='stretch'):
                    clean_name = new_name.strip() if new_name else ""
                    clean_roll = new_roll.strip().upper() if new_roll else ""

                    if not clean_name:
                        st.warning("Please enter your name!")
                    elif not clean_roll:
                        st.warning("Please enter your roll number!")
                    elif check_roll_exists(clean_roll):
                        st.error("This roll number is already registered! Please log in.")
                    else:
                        with st.spinner("Analyzing face geometry & enrolling..."):
                            img = np.array(Image.open(photo_source))
                            encodings = get_face_embeddings(img)
                            if encodings:
                                face_emb = encodings[0].tolist()
                                voice_emb = None
                                if audio_data:
                                    voice_emb = get_voice_embedding(audio_data.read())

                                try:
                                    res_data = create_student(
                                        clean_name, clean_roll,
                                        face_embedding=face_emb,
                                        voice_embedding=voice_emb,
                                        pin=new_pin
                                    )
                                    if res_data:
                                        train_classifier()
                                        st.session_state.is_logged_in = True
                                        st.session_state.user_role = "student"
                                        st.session_state.student_data = res_data[0]
                                        st.success(f"Profile created! Welcome {clean_name}")
                                        time.sleep(1)
                                        st.rerun()
                                except Exception as e:
                                    st.error(f"Error creating profile: {e}")
                            else:
                                st.error("Could not extract facial features. Ensure clear lighting.")

    with login_tab_pin:
        st.caption("Use your Roll Number and backup PIN (Default is 1234 if unset).")
        roll_in = st.text_input("Roll Number", placeholder="E.g. 2025-CS-40", key="pin_roll_input")
        pin_in = st.text_input("PIN", type="password", placeholder="Enter 4-digit PIN", key="pin_code_input")
        if st.button("Login with PIN", type="primary", width="stretch", key="btn_pin_login"):
            if not roll_in or not pin_in:
                st.warning("Please enter both Roll Number and PIN.")
            else:
                student = student_pin_login(roll_in, pin_in)
                if student:
                    st.session_state.is_logged_in = True
                    st.session_state.user_role = "student"
                    st.session_state.student_data = student
                    st.toast(f"Welcome back, {student['name']}!")
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("Invalid Roll Number or PIN.")

    footer()

