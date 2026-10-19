import streamlit as st
import numpy as np
from src.ui.base_layout import style_base_layout
from src.ui.teacher_screen_layout import style_teacher_dashboard
from src.components.header import teacher_dashboard_header
from src.components.footer import footer
from PIL import Image # use for image
from src.pipline.face_pipline import predict_attendance
from src.pipline.face_pipline import get_all_student,train_classifier
import time
from src.database.db import get_all_student,create_student,check_roll_exists,get_student_subject,get_student_attendance,unenroll_student_to_subject
from src.pipline.face_pipline import get_face_embeddings
from src.pipline.voice_pipline import get_voice_embedding
from src.components.subject_card import subject_card
from src.components.dialog_enroll import enroll_dialog
def student_dashboard():
    student_data = st.session_state.student_data
    student_id=student_data["student_id"]
    col1, col2 = st.columns(2, vertical_alignment='center', gap="large")
    with col1:
        teacher_dashboard_header()
    with col2:
        st.subheader(f"Welcome, {student_data['name']}")
        if st.button("Logout", type="secondary", key='logoutbtn', shortcut="control+backspace"):
            st.session_state["is_logged_in"] = False
            del st.session_state.student_data
            st.rerun()
    
    st.space()

    c1,c2=st.columns(2)
    with c1:
        st.header("Your Enrolled Subjects")
    with c2:
        if st.button("Enroll in subject",type='primary',width='stretch'):
            enroll_dialog()
    

    st.divider()

    with st.spinner("Loading your enrolled subject.."):
        subject=get_student_subject(student_id)
        logs=get_student_attendance(student_id)

    stats_map={}
    for log in logs:
        sid=log['subject_id']
        if sid not in stats_map:
            stats_map[sid]={'total':0,"attended":0}

        stats_map[sid]["total"]+=1

        if log.get("is_present"):
            stats_map[sid]['attended']+=1

    cols=st.columns(2)
    for i ,sub_node in enumerate(subject):
        sub=sub_node["subjects"]
        sid=sub['subject_id']

        stats=stats_map.get(sid,{'total':0,"attended":0})

        def unenroll_button():
            if st.button("Unenroll from this course",type="tertiary",width='stretch'):
                unenroll_student_to_subject(student_id,sid)
                st.toast(f"Unenrolled from {sub['name']} successfully")
                st.rerun()

        
        subject_card(
            name=sub["name"],
            code=sub["subject_code"],
            section=sub['section'],
            stats=[
                ('','Total',stats['total']),
                ('',"Attended",stats["attended"]),
            ],
            footer_callback=unenroll_button
        )
            








    footer()
   
def student_screen():

    style_base_layout()
    style_teacher_dashboard()
    if "student_data" in st.session_state:
        student_dashboard()
        return

    c1,c2=st.columns(2,vertical_alignment='center',gap='xxlarge')
    with c1:
        teacher_dashboard_header()
    with c2:
    
        # adding shortcut keys
        if st.button("Go to back to home",type="secondary",key='loginbackbtn',shortcut="control+backspace"):
            st.session_state["login_type"]=None
            st.rerun() 
        
    st.header("Login using FaceID", text_alignment="center")
    st.space()
    st.space()

    show_registration=False

    photo_source=st.camera_input("Position your face in the center")
    if photo_source:
        img=np.array(Image.open(photo_source)) # convert to numpy array

        with st.spinner("AI is Scanning.."):
            detected,all_ids,num_faces=predict_attendance(img)
            if num_faces==0:
                st.warning("Face not found")
            elif num_faces>1:
                st.warning("Multiple Faces found")
            else:
                if detected:
                    student_id=list(detected.keys())[0]
                    all_students=get_all_student()
                    student=next((s for s in all_students if s["student_id"]==student_id),None)
                    if student:
                        st.session_state.is_logged_in=True
                        st.session_state.user_role="student"
                        st.session_state.student_data=student
                        st.toast(f"Welcome Back {student['name']}")
                        time.sleep(1)
                        st.rerun()

                else:
                    st.info("Face not recognized ! You might be a new student!")
                    show_registration=True
    if show_registration:
        with st.container(border=True):
            st.header("Register new profile")
            new_name=st.text_input("Enter your name",placeholder='E.g. Hamza Rizvi')
            new_roll = st.text_input("Enter your Roll Number", placeholder='E.g. 2025-CS-40')
            st.subheader("Optional:voice Enrollment")
            st.info("Enroll Your  for Voice only attendance")

            audio_data=None

            try:
                audio_data=st.audio_input("Record a short phrase like I am present,My name is Akash.")
            except Exception:
                st.error("Audio Data failed !")

            
            if st.button("Create Account", type='primary'):
                # Step 1: clean up whitespace
                clean_name = new_name.strip() if new_name else ""
                clean_roll = new_roll.strip().upper() if new_roll else ""

                # Step 2: basic empty checks
                if not clean_name:
                    st.warning("Please enter your name!")
                elif not clean_roll:
                    st.warning("Please enter your roll number!")
                elif check_roll_exists(clean_roll):
                    st.error("This roll number is already registered! Please check again.")
                else:
                    with st.spinner("Creating profile.."):
                        img = np.array(Image.open(photo_source))
                        encodings = get_face_embeddings(img)
                        if encodings:
                            face_emb = encodings[0].tolist()
                            voice_emb = None
                            if audio_data:
                                voice_emb = get_voice_embedding(audio_data.read())

                            try:
                                response_data = create_student(clean_name, clean_roll, face_embedding=face_emb, voice_embedding=voice_emb)
                                if response_data:
                                    train_classifier()
                                    st.session_state.is_logged_in = True
                                    st.session_state.user_role = "student"
                                    st.session_state.student_data = response_data[0]
                                    st.toast(f"Profile Created Hi {clean_name}")
                                    time.sleep(1)
                                    st.rerun()
                            except Exception as e:
                                if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                                    st.error("This roll number was just registered by someone else. Try a different one.")
                                else:
                                    st.error("Something went wrong while creating your profile.")
                        else:
                            st.error("Couldnt capture your facial features for registration")



        
            
    footer()


