import streamlit as st
import numpy as np
from src.ui.base_layout import style_base_layout
from src.ui.teacher_screen_layout import style_teacher_dashboard
from src.components.header import teacher_dashboard_header
from src.components.footer import footer
from PIL import Image # use for image
def student_screen():

    style_base_layout()
    style_teacher_dashboard()

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

    photo_source=st.camera_input("Position your face in the center")
    if photo_source:
        np.array(Image.open(photo_source)) # convert to numpy array
        
    footer()


        