import streamlit as st

def style_base_layout():
    st.markdown("""
        <style>
            /* 1. Import Premium Outfit Font */
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;800&display=swap');
            
            /* 2. Global Font & App Settings */
            * { font-family: 'Outfit', sans-serif !important; }
            # header, footer, #MainMenu { visibility: hidden; }
            .block-container { padding-top: 2rem; padding-bottom: 2rem;margin-top: -3rem !important; }
            
            /* 3. Deep Dark Tech Background */
            .stAppViewContainer {
                background-color: #0F172A !important;
                background-image: radial-gradient(circle at 50% 0%, #1E293B 0%, #0F172A 80%) !important;
            }
            
            /* 4. Headings & Paragraphs */
            h1, h2, h3 { color: #F8FAFC !important; font-weight: 700 !important; letter-spacing: -0.5px; }
            p, label { color: #94A3B8 !important; font-weight: 300 !important; }
            
            /* 5. Primary Buttons (Blue-Purple Gradient & Bold Text) */
            div[data-testid="stButton"] > button[kind="primary"] {
                background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%) !important;
                border: none !important;
                border-radius: 12px !important;
                padding: 10px 24px !important;
                transition: all 0.3s ease !important;
                box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3) !important;
            }
            div[data-testid="stButton"] > button[kind="primary"] * {
                color: #FFFFFF !important;
                font-weight: 400 !important;
                font-size: 1.1rem !important;
                letter-spacing: 0.5px !important;
                opacity: 1 !important;
            }
            div[data-testid="stButton"] > button[kind="primary"]:hover {
                transform: translateY(-4px) !important; /* Ye sirf visual (dekhne mein) button uthayega, layout ko hilaaye bina */
                box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5) !important;
                border: none !important; /* Make sure border change na ho */
                margin: 0 !important;
            }
            
            /* 6. Secondary Buttons (Hollow outline for 'Back' buttons) */
            div[data-testid="stButton"] > button[kind="secondary"] {
                background-color: transparent !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 12px !important;
                padding: 8px 20px !important;
                transition: all 0.3s ease !important;
            }
            div[data-testid="stButton"] > button[kind="secondary"] * {
                color: #FFFFFF !important;
                font-weight: 600 !important;
                opacity: 1 !important;
            }
            div[data-testid="stButton"] > button[kind="secondary"]:hover {
                border: 1px solid #38BDF8 !important;
                box-shadow: 0 0 10px rgba(56, 189, 248, 0.2) !important;
            }
            div[data-testid="stButton"] > button[kind="secondary"]:hover * {
                color: #38BDF8 !important; /* Text turns cyan on hover */
            }

            /* 7. Form Input Fields (Dark Mode Glass Look) */
            div[data-baseweb="input"] {
                background-color: rgba(30, 41, 59, 0.6) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 10px !important;
                transition: all 0.3s ease;
            }
            /* Remove white background from inner wrapper */
            div[data-baseweb="input"] > div {
                background-color: transparent !important;
            }
            /* Text inside input fields */
            div[data-baseweb="input"] input {
                color: #F8FAFC !important; 
                -webkit-text-fill-color: #F8FAFC !important;
            }
            /* Glow effect when typing in the box */
            div[data-baseweb="input"]:focus-within {
                border-color: #38BDF8 !important;
                box-shadow: 0 0 8px rgba(56, 189, 248, 0.3) !important;
                background-color: rgba(30, 41, 59, 0.8) !important;
            }
            /* --- FIX FOR BUTTON ICONS --- */
            div[data-testid="stButton"] button span.material-symbols-rounded {
                font-family: 'Material Symbols Rounded', 'Material Icons' !important;
                font-weight: 400 !important; /* Icon ko normal weight par lane ke liye */
                font-size: 1.3rem !important; /* Icon ka size theek karne ke liye */
                margin-right: 5px !important; /* Icon aur text ke beech thoda gap dene ke liye */
            }
            /* Ye force karega ki Streamlit ke icons par Outfit font apply na ho */
            span[data-testid="stIconMaterial"] {
                font-family: "Material Symbols Rounded" !important;
                font-weight: 400 !important;
            }
        </style>
    """, unsafe_allow_html=True)