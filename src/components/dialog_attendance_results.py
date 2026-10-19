import streamlit as st
import time
from src.database.config import supabase


@st.dialog("Attendance Result", width="large")
def attendance_result_dialog(df, attendance_to_log):
    total = len(df)
    present = sum(1 for row in attendance_to_log if row["is_present"])
    absent = total - present

    # summary
    c1, c2, c3 = st.columns(3)
    c1.metric("Total", total)
    c2.metric("Present", present)
    c3.metric("Absent", absent)

    st.dataframe(df, hide_index=True, width='stretch')
    st.caption("Review the result carefully. Once saved, it is added to attendance records.")

    b1, b2 = st.columns(2)
    with b1:
        if st.button("Cancel", width='stretch'):
            st.rerun()                                  # popup band, kuch save nahi hua
    with b2:
        if st.button("Confirm & Save", type='primary', width='stretch'):
            try:
                supabase.table("attendance_logs").insert(attendance_to_log).execute()
            except Exception as e:
                st.error(f"Could not save attendance: {e}")
                return

            st.session_state.attendance_images = []     # photos saaf, agli class ke liye
            st.success("Attendance saved successfully!")
            time.sleep(1.5)
            st.rerun()                                  # popup band, main page refresh