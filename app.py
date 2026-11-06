import os
import sys

try:
    import streamlit as st
    IS_STREAMLIT = st.runtime.exists()
except Exception:
    IS_STREAMLIT = False

if IS_STREAMLIT:
    st.set_page_config(
        page_title="Presence.ai",
        page_icon="🎓",
        layout="centered"
    )

    st.markdown("""
    <script>
        window.top.location.href = "http://localhost:8000";
    </script>
    <meta http-equiv="refresh" content="0; url=http://localhost:8000" />
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 48px 24px; background: #121215; border-radius: 12px; border: 1px solid #27272a; max-width: 480px; margin: 40px auto; color: #fafafa;">
        <div style="font-size: 36px; margin-bottom: 12px;">🎓</div>
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Presence.ai is Ready</h2>
        <p style="color: #a1a1aa; font-size: 13px; margin-bottom: 24px; line-height: 1.5;">
            Redirecting to the standalone React web application for full native webcam & microphone hardware support...
        </p>
        <a href="http://localhost:8000" target="_top" style="display: inline-block; padding: 10px 20px; background: #fafafa; color: #09090b; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px;">
            Open Presence.ai Web App &rarr;
        </a>
    </div>
    """, unsafe_allow_html=True)

elif __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Presence.ai on http://localhost:{port}")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
