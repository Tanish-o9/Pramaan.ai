import streamlit as st
from src.database.config import supabase
from src.database.db import enroll_student_to_subject
import time


def _close_dialog():
    st.query_params.clear()
    st.rerun()


@st.dialog("Quick Enrollment")
def auto_enroll_dialog(subject_code):
    subject_code = subject_code.strip().upper()          # ✅ clean input
    student_id = st.session_state.student_data["student_id"]

    res = (
        supabase.table('subjects')
        .select("subject_id, name")
        .eq("subject_code", subject_code)
        .execute()
    )

    if not res.data:
        st.error("Subject Code not found!")
        if st.button("Close"):
            _close_dialog()
        return

    subject = res.data[0]

    check = (
        supabase.table('subject_students')
        .select('*')
        .eq('subject_id', subject['subject_id'])
        .eq('student_id', student_id)
        .execute()
    )

    if check.data:
        st.info("You're already enrolled!")
        if st.button("Got it"):
            _close_dialog()
        return

    st.markdown(f"Would you like to enroll in **{subject['name']}**?")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("No thanks",type='primary', width='stretch'):
            _close_dialog()
        # ✅ yahan se "return" hata diya

    with col2:
        if st.button("Yes, enroll now!", type='primary', width='stretch'):
            try:                                          # ✅ safety net
                enroll_student_to_subject(student_id, subject["subject_id"])
            except Exception:
                st.error("Could not enroll right now. Please try again.")
                return
            st.success('Joined successfully!')
            time.sleep(2)
            _close_dialog()


   