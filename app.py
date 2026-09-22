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
def main():


# Check if 'key' already exists in session_state
# If not, then initialize it
    if 'login_type' not in st.session_state:
        st.session_state['login_type'] = None


    match st.session_state['login_type']:
        case 'Teacher':
            teacher_screen()
        case 'Student':
            student_screen()
        case None:
            home_screen()    

        
    




main()