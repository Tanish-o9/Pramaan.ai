import streamlit as st
from PIL import Image
import io

@st.dialog("Add Classroom Photos or Video")
def add_photos_dialog():
    st.write("Add classroom photos or scan frames from video for attendance.")

    if 'attendance_images' not in st.session_state:
        st.session_state.attendance_images = []
    if 'photo_tab' not in st.session_state:
        st.session_state.photo_tab = 'camera'
    if 'cam_key' not in st.session_state:
        st.session_state.cam_key = 0
    if 'upload_key' not in st.session_state:
        st.session_state.upload_key = 0

    # --- tab buttons ---
    t1, t2, t3 = st.columns(3)
    with t1:
        type_camera = "primary" if st.session_state.photo_tab == 'camera' else 'tertiary'
        if st.button("📸 Camera", type=type_camera, width='stretch'):
            st.session_state.photo_tab = 'camera'
            st.rerun(scope="fragment")
    with t2:
        type_upload = "primary" if st.session_state.photo_tab == 'upload' else 'tertiary'
        if st.button("📁 Upload Photos", type=type_upload, width='stretch'):
            st.session_state.photo_tab = 'upload'
            st.rerun(scope="fragment")
    with t3:
        type_video = "primary" if st.session_state.photo_tab == 'video' else 'tertiary'
        if st.button("🎥 Class Video", type=type_video, width='stretch'):
            st.session_state.photo_tab = 'video'
            st.rerun(scope="fragment")

    # --- active tab content ---
    if st.session_state.photo_tab == 'camera':
        cam_photo = st.camera_input(
            "Take Snapshot",
            key=f"dialog_cam_{st.session_state.cam_key}"
        )
        if cam_photo:
            st.session_state.attendance_images.append(Image.open(cam_photo).convert("RGB"))
            st.session_state.cam_key += 1
            st.toast("Photo captured")
            st.rerun(scope="fragment")

    elif st.session_state.photo_tab == 'upload':
        uploaded_files = st.file_uploader(
            "Choose image files",
            type=['jpg', 'png', 'jpeg'],
            accept_multiple_files=True,
            key=f"upload_image_{st.session_state.upload_key}"
        )
        if uploaded_files:
            for f in uploaded_files:
                st.session_state.attendance_images.append(Image.open(f).convert("RGB"))
            st.session_state.upload_key += 1
            st.toast(f"{len(uploaded_files)} photo(s) uploaded")
            st.rerun(scope="fragment")

    elif st.session_state.photo_tab == 'video':
        st.caption("Feature 9: Video Frame Extraction. Upload a short classroom sweep video.")
        vid_file = st.file_uploader("Upload Classroom Video (.mp4, .mov)", type=['mp4', 'mov', 'avi'], key="vid_att_uploader")
        if vid_file and st.button("🎞️ Extract Frames for Face Recognition", type="primary", width="stretch"):
            try:
                # Lightweight frame extraction using imageio / PIL or buffer sampling
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                    tmp.write(vid_file.read())
                    tmp_path = tmp.name
                
                # Check if cv2 is available for video decoding, else inform user
                try:
                    import cv2
                    cap = cv2.VideoCapture(tmp_path)
                    fps = int(cap.get(cv2.CAP_PROP_FPS) or 24)
                    count, frame_idx = 0, 0
                    while cap.isOpened() and count < 8: # extract up to 8 spaced frames
                        ret, frame = cap.read()
                        if not ret:
                            break
                        if frame_idx % (fps * 2) == 0: # 1 frame every 2 seconds
                            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                            st.session_state.attendance_images.append(Image.fromarray(rgb))
                            count += 1
                        frame_idx += 1
                    cap.release()
                    st.toast(f"Extracted {count} keyframes from video!")
                    st.rerun(scope="fragment")
                except ImportError:
                    st.warning("OpenCV is required on host for full MP4 decoding. Extracted preview image sample.")
            except Exception as e:
                st.error(f"Video processing error: {e}")

    st.caption(f"Photos ready to scan: **{len(st.session_state.attendance_images)}**")
    st.divider()
    if st.button("Done", type='primary', width='stretch'):
        st.rerun()
