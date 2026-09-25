import streamlit as st

def footer():
    st.markdown("""
        <div style="position: relative; margin-top: 60px; width: 100%; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 15px; color: #64748B; text-align: center; padding: 15px 0px; font-size: 0.9rem;">
            Crafted with 💡 by <span style="color: #38BDF8; font-weight: 600; letter-spacing: 1px;">SAGAR YADAV</span> | B.Tech CSE (2025-29)
        </div>
    """, unsafe_allow_html=True)

# Apne form (login/register buttons) ke code ke sabse last mein isey call kar dijiye: