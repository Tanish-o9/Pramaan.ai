import streamlit as st

def footer():
    st.markdown("""
        <style>
            /* Scrollable Glassmorphism Footer Style */
            .aesthetic-footer {
                position: relative; /* Fixed ko hata kar relative kar diya */
                margin-top: 60px; /* Upar ke buttons aur columns se gap dene ke liye */
                margin-bottom: 20px;
                width: 100%;
                background: rgba(255, 255, 255, 0.05); /* Very light transparent background */
                backdrop-filter: blur(10px); /* Background blur effect */
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1); /* Subtle border */
                border-radius: 15px; /* Scrollable hai toh corners thode gol acche lagenge */
                color: #E0E3FF;
                text-align: center;
                padding: 15px 0px;
                font-family: 'Outfit', sans-serif;
                font-size: 0.9rem;
            }
            
            /* Highlighted name style */
            .aesthetic-footer .highlight {
                font-weight: 600;
                color: #FFFFFF;
                letter-spacing: 1px;
            }
            
            /* Hide Streamlit's default watermark footer completely */
            footer {
                visibility: hidden;
            }
        </style>
        
        <div class="aesthetic-footer">
            Crafted with 💡 by <span class="highlight">SAGAR YADAV</span> | B.Tech CSE (2025-29)
        </div>
    """, unsafe_allow_html=True)