import streamlit as st
from src.database.config import supabase
from src.database.db import enroll_student_to_subject
import time


@st.dialog("Enroll in Subject")
def enroll_dialog():
    st.write("Enter the Subject code provided by your teacher to enroll")
    join_code = st.text_input('Subject Code', placeholder='Eg. CS101')

    if st.button("Enroll now", type='primary', width='stretch'):
        join_code = join_code.strip().upper()          # ✅ spaces hatao, uppercase karo

        if not join_code:
            st.warning("Please enter a subject code")
            return

        res = (
            supabase.table('subjects')
            .select("subject_id, name, subject_code")
            .eq('subject_code', join_code)
            .execute()
        )

        if not res.data:                               # ✅ galat code ka feedback
            st.error("Invalid subject code. Please check with your teacher.")
            return

        subject = res.data[0]
        student_id = st.session_state.student_data["student_id"]

        check = (
            supabase.table('subject_students')
            .select('*')
            .eq('subject_id', subject['subject_id'])   # ✅ sahi column
            .eq('student_id', student_id)
            .execute()
        )

        if check.data:
            st.warning(f"You are already enrolled in {subject['name']}")
            return

        try:
            enroll_student_to_subject(student_id, subject["subject_id"])
        except Exception:
            st.error("Could not enroll right now. Please try again.")
            return

        st.success(f"Successfully enrolled in {subject['name']}!")
        time.sleep(1)
        st.rerun()