import streamlit as st
def style_teacher_dashboard():
    st.markdown("""
        <style>

            .stAppViewContainer{
                background:#0B1120 !important;
            }
            div[data-testid="stButton"] {
                margin-top: -5px; /* Alignment theek karne ke liye thoda upar shift karega */
            }

            div[data-testid="stButton"] > button {
                background-color: transparent !important; /* Hollow background */
                border: 1px solid rgba(255, 255, 255, 0.2) !important; /* Halka white/grey border */
                color: #94A3B8 !important; /* Soft grey text */
                transition: all 0.3s ease !important;
            }


            div[data-testid="stButton"] > button:hover {
                border: 1px solid #38BDF8 !important; /* Hover par cyan glow */
                color: #38BDF8 !important;
                box-shadow: 0 0 10px rgba(56, 189, 248, 0.2) !important;
            }


            /* --- FIX FOR INPUT FIELDS --- */
            
            /* 1. "Press Enter to apply" wale text ko puri tarah hide karne ke liye */
            div[data-testid="InputInstructions"] {
                display: none !important;
            }

            /* 2. Password field ke "visibility" text ko wapas Eye Icon banne ke liye */
            .material-symbols-rounded, 
            .material-icons,
            button[aria-label="Show password"] span, 
            button[aria-label="Hide password"] span {
                font-family: 'Material Symbols Rounded', 'Material Icons' !important;
                font-size: 1.2rem !important;
                color: #94A3B8 !important; /* Icon ka color soft grey karne ke liye */
            }
            



            </style>


    """,unsafe_allow_html=True)