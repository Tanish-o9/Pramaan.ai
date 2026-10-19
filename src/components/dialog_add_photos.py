import streamlit as st
from PIL import Image


@st.dialog("Add Classroom Photos")
def add_photos_dialog():
    st.write("Add classroom photos to scan for attendance")

    # ✅ saari state ek jagah initialize
    if 'attendance_images' not in st.session_state:
        st.session_state.attendance_images = []
    if 'photo_tab' not in st.session_state:
        st.session_state.photo_tab = 'camera'
    if 'cam_key' not in st.session_state:
        st.session_state.cam_key = 0
    if 'upload_key' not in st.session_state:
        st.session_state.upload_key = 0

    # --- tab buttons ---
    t1, t2 = st.columns(2)
    with t1:
        type_camera = "primary" if st.session_state.photo_tab == 'camera' else 'tertiary'
        if st.button("Camera", type=type_camera, width='stretch'):
            st.session_state.photo_tab = 'camera'
            st.rerun(scope="fragment")          # ✅ sirf dialog refresh
    with t2:
        type_upload = "primary" if st.session_state.photo_tab == 'upload' else 'tertiary'
        if st.button("Upload Photos", type=type_upload, width='stretch'):
            st.session_state.photo_tab = 'upload'
            st.rerun(scope="fragment")

    # --- active tab ka content ---
    if st.session_state.photo_tab == 'camera':
        cam_photo = st.camera_input(
            "Take Snapshot",
            key=f"dialog_cam_{st.session_state.cam_key}"      # ✅ key badalne se widget reset hota hai
        )
        if cam_photo:
            st.session_state.attendance_images.append(Image.open(cam_photo).convert("RGB"))
            st.session_state.cam_key += 1                      # ✅ agla photo ke liye fresh camera
            st.toast("Photo captured")
            st.rerun(scope="fragment")

    else:   # upload tab (camera ke andar nahi, usi level par)
        uploaded_files = st.file_uploader(
            "Choose image files",
            type=['jpg', 'png', 'jpeg'],
            accept_multiple_files=True,
            key=f"upload_image_{st.session_state.upload_key}"
        )
        if uploaded_files:
            for f in uploaded_files:
                st.session_state.attendance_images.append(Image.open(f).convert("RGB"))   # ✅ append
            st.session_state.upload_key += 1                   # ✅ uploader reset
            st.toast(f"{len(uploaded_files)} photo(s) uploaded")
            st.rerun(scope="fragment")

    # --- ye ab har tab mein dikhega ---
    st.caption(f"Photos added: {len(st.session_state.attendance_images)}")
    st.divider()
    if st.button("Done", type='primary', width='stretch'):
        st.rerun()                                             # ✅ full rerun = popup band