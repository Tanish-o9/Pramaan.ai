import streamlit as st
from src.components.header import header_home
from src.ui.base_layout import style_base_layout
from src.components.footer import footer
from src.ui.home_page_layout import apply_premium_dark_theme

def home_screen():
    # Saari custom styling ek hi function mein apply kar di
    apply_premium_dark_theme()
    header_home()
    
    col1, col2 = st.columns(2, gap='large')
    
    with col1:
        st.markdown("<h2>Teacher</h2>", unsafe_allow_html=True)
        st.markdown("<p>Manage classes & track attendance</p>", unsafe_allow_html=True)
        # Markdown hack to center image in Streamlit
        st.markdown("<div style='text-align: center; margin-bottom: 20px;'><img src='https://i.ibb.co/CsmQQV6X/nascot-prof.png' width='130'></div>", unsafe_allow_html=True)
        
        if st.button("↗ Teacher Portal", use_container_width=True, type='primary', key='btn1'):
            st.session_state['login_type'] = 'Teacher'
            st.rerun()
            
    with col2:
        st.markdown("<h2>Student</h2>", unsafe_allow_html=True)
        st.markdown("<p>View logs & enroll biometric data</p>", unsafe_allow_html=True)
        st.markdown("<div style='text-align: center; margin-bottom: 20px;'><img src='https://i.ibb.co/844D9Lrt/nascot-student.png' width='110'></div>", unsafe_allow_html=True)
        
        if st.button("↗ Student Portal", use_container_width=True, type='primary', key='btn2'):
            st.session_state['login_type'] = 'Student' 
            st.rerun()

    footer()