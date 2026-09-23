import streamlit as st

def style_background_home():
    st.markdown("""
        <style>
            /* Main background color */
            .stAppViewContainer {
                background: #5865F2 !important;
            }
            
            /* Target individual columns */
            .stApp div[data-testid="stColumn"] {
                background-color: #E0E3FF !important;
                padding: 2.5rem !important;
                border-radius: 15px !important; /* px gives a smoother curve than % */
            }
        </style>
    """, unsafe_allow_html=True)


def style_base_dashboard():
    st.markdown("""
        <style>

            .stAppViewContainer{
                background:#E0E3FF !important;
            }
            </style>


    """,unsafe_allow_html=True)
def style_base_layout():
    st.markdown("""
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Climate+Crisi');
            @import url('https://fonts.googleapis.com/css2?family=Climate+Crisis:YEAR@1979&family=Outfit:wght@100..900&display=swap');
            



            # /*Hide Top bar of streamlit */
            # #MainMenu,footer,header{
            #     visibility:hidden ;
            # }

            .block-container{
                padding-top:1.5rem ;
            }


            
            
            h1{
                font-family:'Climate crisis',sans-serif ! important;
                font-size:3.5rem ! important;
                line-height:1.1 !important;
                margin-bottom:0rem !important;
            
            }
            h2{
                font-family:'Climate crisis',sans-serif ! important;
                font-size:2rem ! important;
                line-height:1 !important;
                margin-bottom:0rem !important;
                color:#1E1E1E !important;
                }

            h3,h4,p{
                font-family:'outfit',sans-serif !important;
            }
            button[kind='secondary']{
                border-radius:1.5rem !important;
                background:#EB459E ! important;
                color:white !important;
                padding:10px 20px !important;
                transition:transform 0.25s ease-in-out !important;
                
            }
            button{
                border-radius:1.5rem !important;
                border: none !important;
                background:#5865F2 ! important;
                color:white !important;
                padding:10px 20px !important;
                transition:transform 0.25s ease-in-out !important;
            }
            button[kind='tertiary']{
                border-radius:1.5rem !important;
                background:black ! important;
                color:white !important;
                padding:10px 20px !important;
                transition:transform 0.25s ease-in-out !important;
            } 
            button:hover{
                tbackground-color: #4752C4 !important; /* Hover par thoda dark blue ho jayega */
                box-shadow: 0px 6px 15px rgba(0, 0, 0, 0.2) !important; /* Niche ek soft shadow aayegi */
                transform: translateY(-3px) !important; /* Button thoda sa upar uthega (Lift effect) */
                border: none !important;
                color: white !important;

            }           


            
            </style>


    """,unsafe_allow_html=True)