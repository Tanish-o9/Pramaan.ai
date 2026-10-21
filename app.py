import streamlit as st


# basic clear code

# def main():
#     st.title("My first title")

#     name=st.text_input("Enter  your name:")

#     col1, col2=st.columns(2,gap="small")
#     with col1:
#         if st.button("Hi",type="tertiary" ,key='btn1',width='stretch'):
#             print("hi",name)
   
#     with col2:
#         if st.button("Bye",type="primary", key='btn2' ,width="stretch"):
#             print("Bye",name)




#     st.markdown(""""
#          <style>
#                 button{
#                     background:orange !important;
#                 }
#             </style>


#     """,unsafe_allow_html=True)

# #     st.markdown("""
# #   # Markdown Cheat Sheet

# # Thanks for visiting [The Markdown Guide](https://www.markdownguide.org)!

# # This Markdown cheat sheet provides a quick overview of all the Markdown syntax elements. It can’t cover every edge case, so if you need more information about any of these elements, refer to the reference guides for [basic syntax](https://www.markdownguide.org/basic-syntax/) and [extended syntax](https://www.markdownguide.org/extended-syntax/).

# # ## Basic Syntax

# # These are the elements outlined in John Gruber’s original design document. All Markdown applications support these elements.

# # ### Heading

# # # H1
# # ## H2
# # ### H3

# # ### Bold

# # **bold text**

# # ### Italic

# # *italicized text*

# # ### Blockquote

# # > blockquote

# # ### Ordered List

# # 1. First item
# # 2. Second item
# # 3. Third item

# # ### Unordered List

# # - First item
# # - Second item
# # - Third item

# # ### Code

# # `code`

# # ### Horizontal Rule

# # ---

# # ### Link

# # [Markdown Guide](https://www.markdownguide.org)

# # ### Image

# # ![alt text](https://www.markdownguide.org/assets/images/tux.png)

# # ## Extended Syntax

# # These elements extend the basic syntax by adding additional features. Not all Markdown applications support these elements.

# # ### Table

# # | Syntax | Description |
# # | ----------- | ----------- |
# # | Header | Title |
# # | Paragraph | Text |

# # ### Fenced Code Block

# # ```
# # {
# #   "firstName": "John",
# #   "lastName": "Smith",
# #   "age": 25
# # }
# # ```

# # ### Footnote

# # Here's a sentence with a footnote. [^1]

# # [^1]: This is the footnote.

# # ### Heading ID

# # ### My Great Heading {#custom-id}

# # ### Definition List

# # term
# # : definition

# # ### Strikethrough

# # ~~The world is flat.~~

# # ### Task List

# # - [x] Write the press release
# # - [ ] Update the website
# # - [ ] Contact the media

# # ### Emoji

# # That is so funny! :joy:

# # (See also [Copying and Pasting Emoji](https://www.markdownguide.org/extended-syntax/#copying-and-pasting-emoji))

# # ### Highlight

# # I need to highlight these ==very important words==.

# # ### Subscript

# # H~2~O

# # ### Superscript

# # X^2^

# # """)

    


from src.screens.home_screen import home_screen
from src.screens.teacher_screen import teacher_screen
from src.screens.student_screen import student_screen
from src.components.dialog_auto_enroll import auto_enroll_dialog
def main():
    st.set_page_config(
    page_title="Presence.ai - Making Attendance Faster using AI",
    page_icon="https://i.ibb.co/YTYGn5qV/logo.png",
    layout="wide",
    initial_sidebar_state="collapsed" # Agar aap chahte hain ki sidebar by-default band rahe
)
    st.markdown("""
    <style>
    /* Phone screens ke liye (width 768px se kam) */
    @media (max-width: 768px) {
        .stApp {
            padding-top: 10px;
        }
        /* HTML cards ki styling mobile ke hisaab se adjust karein */
        h3 {
            font-size: 1.2rem !important;
        }
        p, span {
            font-size: 0.85rem !important;
        }
    }
    </style>
    """, unsafe_allow_html=True)
    if 'login_type' not in st.session_state:
        st.session_state['login_type'] = None

    # join link se aaye ho to pehle student mode set karo
    join_code = st.query_params.get('join-code')
    if join_code and st.session_state['login_type'] != 'Student':
        st.session_state['login_type'] = 'Student'     # ✅ capital S, match ke saath same

    match st.session_state['login_type']:
        case 'Teacher':
            teacher_screen()
        case 'Student':
            student_screen()
        case _:                                         # ✅ None ya koi aur value, sab home par
            home_screen()

    # student login ho chuka ho to enrollment popup kholo
    if (join_code
            and st.session_state.get('is_logged_in')
            and st.session_state.get('user_role') == "student"):
        auto_enroll_dialog(join_code)


main()
        
    









