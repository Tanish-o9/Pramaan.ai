from src.database.db import delete_subject
import streamlit as st

@st.dialog("Delete Subject")
def delete_subject_dialog(sub, teacher_id):
    st.error(
        f"Deleting **{sub['name']}** will permanently remove all student enrollments "
        f"and the entire attendance history for this subject. This cannot be undone."
    )
    st.caption(f"{sub['total_students']} students • {sub['total_classes']} classes recorded")

    typed = st.text_input(f"Type the subject name to confirm: {sub['name']}")

    c1, c2 = st.columns(2)
    with c1:
        if st.button("Cancel", width='stretch'):
            st.rerun()
    with c2:
        if st.button("Delete permanently", type='primary', width='stretch',
                     disabled=(typed.strip() != sub['name'])):
            try:
                delete_subject(sub['subject_id'], teacher_id)
            except Exception as e:
                st.error(f"Could not delete the subject: {e}")
                return
            st.toast("Subject deleted")
            st.rerun()