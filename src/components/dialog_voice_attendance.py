import numpy as np
import pandas as pd
import streamlit as st
from datetime import datetime, timezone

from src.database.config import supabase
from src.pipline.voice_pipline import process_bulk_audio
from src.components.dialog_attendance_results import attendance_result_dialog
from src.utiils import roll_sort_key


@st.dialog("Voice Attendance")
def voice_attendance_dialog(selected_subject_id):
    result_key = f"voice_result_{selected_subject_id}"

    # Step 2: analysis ho chuka hai, ab review dikhao
    if result_key in st.session_state:
        df, logs = st.session_state[result_key]
        attendance_result_dialog(df, logs)
        return

    # Step 1: record karo aur analyze karo
    st.write('Record the class audio. Each student should say a short phrase like "I am present".')
    audio_data = st.audio_input("Record classroom audio")

    if st.button("Analyze Audio", width="stretch", type="primary"):
        if not audio_data:
            st.warning("Please record the audio first.")
            return

        with st.spinner("Processing audio data..."):
            enrolled_res = (
                supabase.table("subject_students")
                .select("student_id, students(student_id, name, roll_number, voice_embedding)")
                .eq("subject_id", selected_subject_id)
                .execute()
            )
            students = [n["students"] for n in enrolled_res.data if n.get("students")]

            if not students:
                st.warning("No students enrolled in this course")
                return

            candidates_dict = {
                s["student_id"]: np.array(s["voice_embedding"])
                for s in students if s.get("voice_embedding")
            }
            if not candidates_dict:
                st.error("No enrolled students have voice profiles registered!")
                return

            detected_scores = process_bulk_audio(audio_data.read(), candidates_dict)

        if detected_scores is None:          # process_bulk_audio ne error dikha diya
            return

        timestamp = datetime.now(timezone.utc).isoformat()
        results, attendance_to_log = [], []

        for s in students:
            score = detected_scores.get(s["student_id"])
            is_present = score is not None

            if is_present:
                source = f"Voice ({score:.2f})"
            elif not s.get("voice_embedding"):
                source = "No voice profile"
            else:
                source = "-"

            results.append({
                "Roll No": s.get("roll_number") or "-",
                "Name": s["name"],
                "Source": source,
                "Status": "Present" if is_present else "Absent",
            })
            attendance_to_log.append({
                "student_id": s["student_id"],
                "subject_id": selected_subject_id,
                "timestamp": timestamp,
                "is_present": is_present,
            })

        results.sort(key=lambda r: roll_sort_key(r["Roll No"]))
        st.session_state[result_key] = (pd.DataFrame(results), attendance_to_log)
        st.rerun(scope="fragment")            # sirf dialog refresh, review screen dikhegi