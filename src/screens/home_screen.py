import streamlit as st
from src.components.header import header_home
from src.ui.base_layout import style_base_layout,style_background_home
from src.components.footer import footer
def home_screen():
     


    header_home()
    style_background_home()
    style_base_layout() # for style in ui
    col1,col2=st.columns(2,gap='xlarge')
    with col1:
        st.header("I am Teacher")
        st.image("https://i.ibb.co/CsmQQV6X/nascot-prof.png",width=145)
        if st.button("Teacher Portal", icon=":material/arrow_outward:", use_container_width=True, type='primary', key='btn1'):
            st.session_state['login_type'] = 'Teacher'
            st.rerun()
    with col2:
        st.header("I am Student")
        st.image("https://i.ibb.co/844D9Lrt/nascot-student.png",width=120)
        if st.button("Student Portal", icon=":material/arrow_outward:", use_container_width=True, type='primary', key='btn2'):
            st.session_state['login_type'] = 'Student' 
            st.rerun()
    footer()