import streamlit as st
from html import escape

def subject_card(name, code, section, stats=None, footer_callback=None):
    # Pink border ko Cyan (#38BDF8) mein badal diya gaya hai
    card = (
        '<div style="background:rgba(30,41,59,0.6);'
        'border:1px solid rgba(255,255,255,0.1);'
        'border-left:8px solid #38BDF8;' 
        'padding:25px;border-radius:20px;margin-bottom:20px;'
        'box-shadow: 0 4px 15px rgba(0,0,0,0.2);">'
        f'<h3 style="margin:0;color:#F8FAFC;font-size:1.5rem;">{escape(str(name))}</h3>'
        '<p style="color:#94A3B8;margin:10px 0;">Code: '
        # Code badge ko dark theme ke hisaab se soft cyan kar diya hai
        f'<span style="background:rgba(56,189,248,0.1);color:#38BDF8;padding:4px 10px;border-radius:8px;font-weight:600;border:1px solid rgba(56,189,248,0.2);">{escape(str(code))}</span>'
        f' &nbsp;•&nbsp; Section: {escape(str(section))}</p>'
    )

    if stats:
        card += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px;">'
        for icon, label, value in stats:
            # Stats background ko pink se hata kar subtle purple/blue kar diya hai
            card += (
                '<div style="background:rgba(139,92,246,0.15);padding:6px 14px;'
                'border-radius:10px;font-size:0.9rem;color:#E2E8F0;border:1px solid rgba(139,92,246,0.2);">'
                f'<span style="margin-right:5px;">{icon}</span> <b style="color:#F8FAFC;">{value}</b> {label}</div>'
            )
        card += '</div>'

    card += '</div>'

    st.markdown(card, unsafe_allow_html=True)
    if footer_callback:
        footer_callback()