import streamlit as st
from src.database.db import create_subjects

@st.dialog("Create New Subject")
def create_subject_dialog(teacher_id):
    st.write("Enter the details of new subject")
    sub_id=st.text_input("Subject Code",placeholder="M001")
    sub_name=st.text_input("Subject Name",placeholder="Introduction to Computer Science").capitalize()
    sub_section=st.text_input("Branch",placeholder="CSE").upper()

    if st.button("Create Subject Now",type='primary',width="stretch"):
        if sub_id and sub_name and sub_section:
            try:
                create_subjects(sub_id,sub_name,sub_section,teacher_id)
                st.toast("Subject Created Succesfully!")

                st.rerun()
            except Exception as e:
                st.error(f"Error {str(e)}")
        else:
            st.warning("Please fill all the fields")

