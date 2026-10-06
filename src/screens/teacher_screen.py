import streamlit as st
from src.components.header import teacher_dashboard_header
from src.ui.teacher_screen_layout import style_teacher_dashboard
from src.ui.base_layout import style_base_layout
from src.components.footer import footer


def teacher_screen():
    style_base_layout()
    style_teacher_dashboard()

    
    if "teacher_login_type" not in st.session_state or st.session_state.teacher_login_type=="login":
        teacher_screen_login()
    elif st.session_state.teacher_login_type=="register":
        teacher_screen_register()   






from src.database.db import create_teacher,teacher_login
    
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
                if teacher_login(teacher_username,teacher_pass):
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