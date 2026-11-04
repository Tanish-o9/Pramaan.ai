import streamlit as st
from src.screens.home_screen import home_screen
from src.screens.teacher_screen import teacher_screen
from src.screens.student_screen import student_screen
from src.components.dialog_auto_enroll import auto_enroll_dialog


def main():
    st.set_page_config(
        page_title="Presence.ai - Making Attendance Faster using AI",
        page_icon="https://i.ibb.co/YTYGn5qV/logo.png",
        layout="wide",
        initial_sidebar_state="collapsed"
    )

    st.markdown("""
    <style>
    /* Phone screens styling */
    @media (max-width: 768px) {
        .stApp {
            padding-top: 10px;
        }
        h3 {
            font-size: 1.2rem !important;
        }
        p, span {
            font-size: 0.85rem !important;
        }
    }
    </style>
    """, unsafe_allow_html=True)

    if 'login_type' not in st.session_state:
        st.session_state['login_type'] = None

    # Auto-route to student screen if opened via a join link
    join_code = st.query_params.get('join-code')
    if join_code and st.session_state['login_type'] != 'Student':
        st.session_state['login_type'] = 'Student'

    match st.session_state['login_type']:
        case 'Teacher':
            teacher_screen()
        case 'Student':
            student_screen()
        case _:
            home_screen()

    # Open enrollment dialog once student is logged in
    if (join_code
            and st.session_state.get('is_logged_in')
            and st.session_state.get('user_role') == "student"):
        auto_enroll_dialog(join_code)


if __name__ == "__main__":
    main()
