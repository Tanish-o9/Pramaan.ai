import streamlit as st

def apply_premium_dark_theme():
    st.markdown("""
        <style>
            /* Import modern Outfit font for entire page */
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;800&display=swap');
            
            /* Deep Dark Tech Background */
            .stAppViewContainer {
                background-color: #0F172A !important;
                background-image: radial-gradient(circle at 50% 0%, #1E293B 0%, #0F172A 80%) !important;
            }
            
            # /* Hide default Streamlit elements */
            # header, footer, #MainMenu { visibility: hidden; }
            # .block-container { padding-top: 2rem; padding-bottom: 2rem; }
            
            /* Global Font Setting */
            * { font-family: 'Outfit', sans-serif !important; }
            
            /* Glassmorphism Effect for Columns (Cards) */
            div[data-testid="column"] {
                background: rgba(30, 41, 59, 0.4) !important; /* Semi-transparent dark slate */
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 20px !important;
                padding: 2.5rem 1.5rem !important;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
                text-align: center;
                transition: transform 0.3s ease;
            }
            
            /* Column Hover Effect */
            div[data-testid="column"]:hover {
                transform: translateY(-5px);
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
            }

            /* Text Colors inside Cards */
            h1, h2 { color: #F8FAFC !important; font-weight: 700 !important; text-align: center;}
             p{  text-align: center; font-weight: 300 !important;}
            
            /* Gradient Animated Buttons */
            .stButton > button {
                background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%) !important;
                color: white !important;
                border: none !important;
                border-radius: 12px !important;
                padding: 12px 24px !important;
                font-size: 1.15rem !important;
                font-weight: 800 !important;
                transition: all 0.3s ease !important;
                box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3) !important;
            }
            
            /* Button Hover Glow */
            .stButton > button:hover {
                transform: translateY(-3px) !important;
                box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5) !important;
            }
            
            /* Aesthetic Footer */
            .aesthetic-footer {
                position: relative;
                margin-top: 60px;
                width: 100%;
                background: rgba(255, 255, 255, 0.02);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                color: #64748B;
                text-align: center;
                padding: 15px 0px;
                font-size: 0.9rem;
            }
            .aesthetic-footer .highlight {
                color: #38BDF8; /* Bright Cyan for your name */
                font-weight: 600;
                letter-spacing: 1px;
            }
            
        </style>
    """, unsafe_allow_html=True)