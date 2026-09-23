import streamlit as st

def header_home():
    # Logo aur Naya Naam
    logo_url = "https://i.ibb.co/YTYGn5qV/logo.png"
    st.markdown(f"""
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:40px;">
        <img src='{logo_url}' style='height:110px; margin-bottom: 10px; filter: drop-shadow(0px 4px 10px rgba(56, 189, 248, 0.4));'/>
        <h1 style='font-size: 3.2rem; margin: 0; letter-spacing: -1px;'>Presence<span style="color:#38BDF8;">.ai</span></h1>
        <p style='margin: 0; font-size: 1.1rem; color: #94A3B8;'>Next-Gen Facial & Voice Authentication</p>
    </div>
    """, unsafe_allow_html=True)