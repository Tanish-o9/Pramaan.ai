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
from src.database.db import get_all_student,create_student
from src.pipline.face_pipline import get_face_embeddings
from src.pipline.voice_pipline import get_voice_embedding
def student_dashboard():
    st.header("dashBoard here")
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

            st.subheader("Optional:voice Enrollment")
            st.info("Enroll Your  for Voice only attendance")

            audio_data=None

            try:
                audio_data=st.audio_input("Record a short phrase like I am present,My name is Akash.")
            except Exception:
                st.error("Audio Data failed !")

            if st.button("Create Account",type='primary'):
                if new_name:
                    with st.spinner("Creating profile.."):
                        img=np.array(Image.open(photo_source))
                        encodings=get_face_embeddings(img)
                        if encodings:
                            face_emb=encodings[0].tolist()
                            voice_emb=None
                            if audio_data:
                                voice_emb=get_voice_embedding(audio_data.read())
                            response_data=create_student(new_name,face_embedding=face_emb,voice_embedding=voice_emb)
                            if response_data:
                                train_classifier()
                                st.session_state.is_logged_in=True
                                st.session_state.user_role="student"
                                st.session_state.student_data=response_data[0]
                                st.toast(f"Profile Created Hi {new_name}")
                                time.sleep(1)
                                st.rerun()
                        else:
                            st.error("Couldnt capture your facial features for registration")
                else:
                    st.warning("please Enter your name!")  




        
            
    footer()


        