import streamlit as st
import segno
import io
import time
import secrets

@st.dialog("Share Class Join Link & QR")
def share_subject_dialog(subject_name, subject_code):
    app_domain = "presence-ai-main.streamlit.app"
    
    st.subheader(f"Enroll in: {subject_name}")
    share_tab_perm, share_tab_exp = st.tabs(["🔗 Standard Code", "⏳ Expiring Dynamic Passcode"])

    with share_tab_perm:
        join_url = f"https://{app_domain}/?join-code={subject_code}"
        qr = segno.make(join_url)
        out = io.BytesIO()
        qr.save(out, kind='png', scale=8, border=1)

        c1, c2 = st.columns(2)
        with c1:
            st.markdown("##### Shareable Link")
            st.code(join_url, language="text")
            st.caption("Permanent join link for batch onboarding.")
        with c2:
            st.image(out.getvalue(), caption="Scan to join class")

    with share_tab_exp:
        st.caption("Feature 13: Single-session 15-minute OTP join code to prevent link leaks.")
        exp_key = f"exp_code_{subject_code}"
        
        if exp_key not in st.session_state:
            # Generate random 6-character token
            st.session_state[exp_key] = secrets.token_hex(3).upper()
            st.session_state[f"{exp_key}_time"] = time.time()

        token = st.session_state[exp_key]
        elapsed = int(time.time() - st.session_state.get(f"{exp_key}_time", time.time()))
        remaining = max(0, 900 - elapsed) # 15 minutes = 900s
        mins = remaining // 60
        secs = remaining % 60

        st.metric("15-Min Dynamic Code", f"{token}", f"{mins:02d}:{secs:02d} left")
        if remaining == 0:
            st.warning("This code has expired. Generate a new one.")
            if st.button("Generate Fresh Passcode", type="primary"):
                st.session_state[exp_key] = secrets.token_hex(3).upper()
                st.session_state[f"{exp_key}_time"] = time.time()
                st.rerun()
