import streamlit as st
from src.database.config import supabase
from src.components.header import teacher_dashboard_header
from src.ui.teacher_screen_layout import style_teacher_dashboard
from src.ui.base_layout import style_base_layout
from src.components.footer import footer
from src.components.dialog_create_subject import create_subject_dialog
from src.database.db import get_teacher_subjects
from src.components.subject_card import subject_card
from src.components.dialog_share_subject import share_subject_dialog
from src.components.dialog_add_photos import add_photos_dialog
import numpy as np
import calendar
from io import BytesIO
from datetime import date, datetime, timedelta, timezone
import pandas as pd
import streamlit as st

from src.database.db import get_teacher_subjects, get_subject_attendance
from src.utiils import roll_sort_key
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
IST = timezone(timedelta(hours=5, minutes=30))
from src.components.dialog_voice_attendance import voice_attendance_dialog
from src.components.dialog_delete_subject import delete_subject_dialog
import pandas as pd
from src.utiils import roll_sort_key
from src.components.dialog_attendance_results import attendance_result_dialog
from datetime import datetime,timezone
from src.pipline.face_pipline import predict_attendance
from src.database.db import get_attendance_for_teacher
DOWNLOAD_BTN_CSS = """<style>
.st-key-dl_full.st-key-dl_full.st-key-dl_full button,
[class*="st-key-dl_day_"][class*="st-key-dl_day_"] button {
    background: linear-gradient(135deg, #3B82F6, #8B5CF6) !important;
    border: none !important;
    box-shadow: 0 4px 14px rgba(59,130,246,0.35) !important;
}
.st-key-dl_full button *,
[class*="st-key-dl_day_"] button * {
    color: #ffffff !important;
    font-weight: 700 !important;
}
</style>"""
def teacher_screen():
    style_base_layout()
    style_teacher_dashboard()

    if'teacher_data' in st.session_state:
        teacher_dashboard()
    elif "teacher_login_type" not in st.session_state or st.session_state.teacher_login_type=="login":
        teacher_screen_login()
    elif st.session_state.teacher_login_type=="register":
        teacher_screen_register()   

def teacher_dashboard():
    teacher_data = st.session_state.teacher_data

    col1, col2 = st.columns(2, vertical_alignment='center', gap="xxlarge")
    with col1:
        teacher_dashboard_header()
    with col2:
        st.subheader(f"Welcome, {teacher_data['name']} 👋")
        if st.button("Logout", type="secondary", key='logoutbtn', shortcut="control+backspace"):
            st.session_state["is_logged_in"] = False
            del st.session_state.teacher_data
            st.rerun()

    st.space()

    if 'current_teacher_tab' not in st.session_state:
        st.session_state.current_teacher_tab = 'take_attendance'   # ✅ fixed typo

    current_tab = st.session_state.current_teacher_tab

    tab1, tab2, tab3 = st.columns(3)
    with tab1:
        if st.button(
            '📋 Take Attendance',
            width='stretch',
            
            type='primary' if current_tab == 'take_attendance' else 'secondary'
        ):
            st.session_state.current_teacher_tab = 'take_attendance'
            st.rerun()
    with tab2:
        if st.button(
            '📚  Manage Subjects',
            width='stretch',
            
            type='primary' if current_tab == 'manage_subjects' else 'secondary'
        ):
            st.session_state.current_teacher_tab = 'manage_subjects'
            st.rerun()
    with tab3:
        if st.button(
            '🗂️ Attendance Records',
            width='stretch',
            
            type='primary' if current_tab == 'attendance_records' else 'secondary'
        ):
            st.session_state.current_teacher_tab = 'attendance_records'
            st.rerun()

    st.space()
    st.divider()
    st.space()

    # --- Content area, based on selected tab ---
    if current_tab == 'take_attendance':
        teacher_tab_take_attendance()
    elif current_tab == 'manage_subjects':
        teacher_tab_manage_subjects()
    elif current_tab == 'attendance_records':
        teacher_tab_attendance_records()

    footer()


def get_enrolled_students(subject_id):
    res = (
        supabase.table("subject_students")
        .select("student_id, students(student_id, name, roll_number)")
        .eq("subject_id", subject_id)
        .execute()
    )
    return [n["students"] for n in res.data if n.get("students")]


def teacher_tab_take_attendance():
    teacher_id = st.session_state.teacher_data["teachers_id"]

    with st.container(border=True):
        st.subheader("📋 Take Attendance")        # camera emoji hata diya
        st.caption("Choose a subject and a method to mark attendance.")

        subjects = get_teacher_subjects(teacher_id)
        if not subjects:
            st.warning("You haven't created any subjects yet! Please create one to begin.")
            return

        subject_options = {f"{s['name']} - {s['subject_code']}": s['subject_id'] for s in subjects}
        label = st.selectbox("Select Subject", options=list(subject_options.keys()))
        subject_id = subject_options[label]

        st.space()

        # naya session key, purane "attendance_method" se takkar na ho
        if st.session_state.get('att_method') not in ('photos', 'voice', 'manual'):
            st.session_state.att_method = 'photos'
        method = st.session_state.att_method

        st.caption("Attendance method")
        m1, m2, m3 = st.columns(3)
        with m1:
            if st.button("Photos", icon=":material/photo_library:", width='stretch',
                         key="method_photos",
                         type='primary' if method == 'photos' else 'secondary'):
                st.session_state.att_method = 'photos'
                st.rerun()
        with m2:
            if st.button("Voice", icon=":material/mic:", width='stretch',
                         key="method_voice",
                         type='primary' if method == 'voice' else 'secondary'):
                st.session_state.att_method = 'voice'
                st.rerun()
        with m3:
            if st.button("Manual", icon=":material/checklist:", width='stretch',
                         key="method_manual",
                         type='primary' if method == 'manual' else 'secondary'):
                st.session_state.att_method = 'manual'
                st.rerun()

        st.divider()

        if method == 'voice':
            attendance_voice_mode(subject_id)
        elif method == 'manual':
            attendance_manual_mode(subject_id)
        else:
            attendance_photo_mode(subject_id)
def attendance_photo_mode(subject_id):
    images = st.session_state.setdefault('attendance_images', [])

    if st.button("➕ Add photos", width='stretch'):
        add_photos_dialog()

    if not images:
        st.info("No photos yet. Add classroom photos to begin.")
        return

    st.write(f"**{len(images)}** photo(s) ready to scan")
    cols = st.columns(4)
    for i, img in enumerate(images):
        cols[i % 4].image(img, width='stretch')

    c1, c2 = st.columns(2)
    with c1:
        if st.button("🗑️ Clear all photos", width='stretch'):
            st.session_state.attendance_images = []
            st.rerun()
    with c2:
        if st.button("Run Face Analysis", type='primary', width='stretch',
                     icon=":material/analytics:"):
            run_face_analysis(subject_id, images)


def run_face_analysis(subject_id, images):
    with st.spinner("Deep scanning classroom photos...."):
        detected_map = {}
        for idx, img in enumerate(images):
            detected, _, _ = predict_attendance(np.array(img.convert('RGB')))
            for sid in detected.keys():
                detected_map.setdefault(int(sid), []).append(f"Photo {idx + 1}")
        students = get_enrolled_students(subject_id)

    if not students:
        st.warning("No students enrolled in this course")
        return

    timestamp = datetime.now(timezone.utc).isoformat()
    results, to_log = [], []
    for s in students:
        sources = detected_map.get(int(s["student_id"]), [])
        present = len(sources) > 0
        results.append({
            "Roll No": s.get("roll_number") or "-",
            "Name": s["name"],
            "Source": ", ".join(sources) if present else "-",
            "Status": "✅ Present" if present else "❌ Absent",
        })
        to_log.append({
            "student_id": s["student_id"],
            "subject_id": subject_id,
            "timestamp": timestamp,
            "is_present": present,
        })

    results.sort(key=lambda r: roll_sort_key(r["Roll No"]))
    attendance_result_dialog(pd.DataFrame(results), to_log)


def attendance_manual_mode(subject_id):
    students = get_enrolled_students(subject_id)
    if not students:
        st.warning("No students enrolled in this course")
        return

    students.sort(key=lambda s: (roll_sort_key(s.get("roll_number")), s["name"].lower()))

    all_present = st.toggle("Mark everyone present", value=False)
    df = pd.DataFrame({
        "Present": [all_present] * len(students),
        "Roll No": [s.get("roll_number") or "-" for s in students],
        "Name": [s["name"] for s in students],
    })

    edited = st.data_editor(
        df,
        key=f"manual_editor_{subject_id}_{all_present}",   # toggle badalne par table reset
        hide_index=True,
        disabled=["Roll No", "Name"],
        width='stretch',
    )

    if st.button("Review & Save", type='primary', width='stretch'):
        timestamp = datetime.now(timezone.utc).isoformat()
        to_log = [
            {
                "student_id": s["student_id"],
                "subject_id": subject_id,
                "timestamp": timestamp,
                "is_present": bool(p),
            }
            for s, p in zip(students, edited["Present"])
        ]
        view = edited[["Roll No", "Name"]].copy()
        view["Status"] = ["✅ Present" if p else "❌ Absent" for p in edited["Present"]]
        attendance_result_dialog(view, to_log)


def attendance_voice_mode(subject_id):
    st.caption("Record the whole class. Each student says a short phrase one after another.")
    if st.button("Start voice attendance", type='primary', width='stretch', icon=":material/mic:"):
        st.session_state.pop(f"voice_result_{subject_id}", None)   # purana result saaf
        voice_attendance_dialog(subject_id)
                        

            
def teacher_tab_manage_subjects():
    teacher_id = st.session_state.teacher_data["teachers_id"]

   
    with st.container(border=True):
        col1, col2 = st.columns([1.5, 1], vertical_alignment='center')
        with col1:
            st.subheader("📘 Manage Subjects")
            st.caption("Create subjects, enroll students, and organize your classes.")
        with col2:
            if st.button("➕ Create New Subject", width='stretch', type='primary'):
                create_subject_dialog(teacher_id)

    # list all subjects
    subjects = get_teacher_subjects(teacher_id)
    if subjects:
        for sub in subjects:
            stats = [
                ("👥", "Students", sub['total_students']),
                ("🕰️", "Classes", sub['total_classes']),
            ]

            def share_btn(sub=sub):   # ✅ har subject ka apna data bind
                b1, b2 = st.columns([4, 1])
                with b1:
                    if st.button(
                        f"Share Code: {sub['name']}",
                        key=f"share_{sub['subject_id']}",
                        icon=":material/share:",
                        width='stretch',
                    ):
                        share_subject_dialog(sub['name'], sub['subject_code'])
                with b2:
                    if st.button(
                        "",
                        key=f"del_{sub['subject_id']}",
                        icon=":material/delete:",
                        help="Delete this subject",
                        width='stretch',
                    ):
                        delete_subject_dialog(sub, teacher_id)
                st.space()

            subject_card(                 # ✅ ab loop ke andar
                name=sub["name"],
                code=sub["subject_code"],
                section=sub["section"],
                stats=stats,
                footer_callback=share_btn
            )
    else:
        st.info("No subjects found. Create one above!")
# for record code start from here
    
        



def parse_logs(raw):
    out = []
    for r in raw:
        ts = r.get("timestamp")
        if not ts:
            continue
        stu = r.get("students") or {}
        dt = datetime.fromisoformat(ts).astimezone(IST)        # UTC se India time
        out.append({
            "session_id": ts,                                  # ek class ki sab rows ka same
            "dt": dt,
            "date": dt.date(),
            "label": dt.strftime("%I:%M %p"),
            "Roll No": stu.get("roll_number") or "-",
            "Name": stu.get("name", "Unknown"),
            "present": bool(r.get("is_present")),
        })
    return pd.DataFrame(out)


def build_sheet(df):
    """Rows = students, columns = classes (P/A), aakhir mein total aur percentage."""
    d = df.copy()
    d["flag"] = d["present"].astype(int)

    sessions = d[["session_id", "dt"]].drop_duplicates().sort_values("session_id")
    labels = {r.session_id: r.dt.strftime("%d %b %Y %I:%M %p") for r in sessions.itertuples()}

    num = d.pivot_table(index=["Roll No", "Name"], columns="session_id",
                        values="flag", aggfunc="max")
    num = num[sessions["session_id"].tolist()]                 # time ke order mein columns

    total = num.notna().sum(axis=1)
    attended = num.fillna(0).sum(axis=1)

    sheet = num.apply(lambda col: col.map(
        lambda v: "-" if pd.isna(v) else ("P" if v == 1 else "A")))
    sheet.columns = [labels[c] for c in sheet.columns]
    sheet["Classes"] = total
    sheet["Attended"] = attended.astype(int)
    sheet["Percentage"] = (attended / total * 100).round(1)

    sheet = sheet.reset_index()
    order = sorted(range(len(sheet)), key=lambda i: roll_sort_key(sheet.iloc[i]["Roll No"]))
    return sheet.iloc[order].reset_index(drop=True)


def to_excel_bytes(sheet):
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        sheet.to_excel(writer, index=False, sheet_name="Attendance")
    return buf.getvalue()


def _shift_month(delta):
    y, m = st.session_state.rec_month
    m += delta
    if m < 1:
        y, m = y - 1, 12
    elif m > 12:
        y, m = y + 1, 1
    st.session_state.rec_month = (y, m)


def _pick_day(d):
    st.session_state.rec_date = d
def _pick_empty(d):
    st.session_state.rec_date = None
    st.session_state.rec_note = f"No attendance was recorded on {d.strftime('%d %B %Y')}."
def calendar_css(y, m, class_days, selected):
    today = datetime.now(IST).date()
    first = min(class_days) if class_days else None

    styles = {
        "green": ("background:rgba(34,197,94,0.18) !important;background-image:none !important;"
                  "border:1px solid #22C55E !important;color:#4ADE80 !important;"),
        "green_sel": ("background:#22C55E !important;background-image:none !important;"
                      "border:1px solid #22C55E !important;color:#052E16 !important;"
                      "box-shadow:0 0 14px rgba(34,197,94,0.5) !important;"),
        "red": ("background:rgba(239,68,68,0.15) !important;background-image:none !important;"
                "border:1px solid rgba(239,68,68,0.6) !important;color:#F87171 !important;"),
        "gray": ("background:rgba(148,163,184,0.08) !important;background-image:none !important;"
                 "border:1px solid rgba(148,163,184,0.25) !important;color:#64748B !important;"),
    }

    rules = []
    for day in range(1, calendar.monthrange(y, m)[1] + 1):
        d = date(y, m, day)
        if d in class_days:
            kind = "green_sel" if d == selected else "green"
        elif first and first <= d <= today:
            kind = "red"
        else:
            kind = "gray"
        k = f"st-key-rec_day_{d.isoformat()}"
        rules.append(
            f".{k}.{k}.{k} button, "
            f".{k}.{k}.{k} [data-testid='stButton'] button{{{styles[kind]}}}"
        )
    return "<style>" + "".join(rules) + "</style>"
def render_calendar(class_days, selected):
    y, m = st.session_state.rec_month

    n1, n2, n3 = st.columns([1, 4, 1], vertical_alignment='center')
    n1.button("", icon=":material/chevron_left:", key="rec_prev",
              on_click=_shift_month, args=(-1,), width='stretch')
    n2.subheader(f"{calendar.month_name[m]} {y}", text_alignment="center")
    n3.button("", icon=":material/chevron_right:", key="rec_next",
              on_click=_shift_month, args=(1,), width='stretch')

    st.markdown(calendar_css(y, m, class_days, selected), unsafe_allow_html=True)

    for col, name in zip(st.columns(7), ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]):
        col.caption(name)

    for week in calendar.monthcalendar(y, m):
        for col, day in zip(st.columns(7), week):
            if day == 0:
                continue
            d = date(y, m, day)
            col.button(
                str(day),
                key=f"rec_day_{d.isoformat()}",
                on_click=_pick_day if d in class_days else _pick_empty,   # ✅ koi disabled nahi
                args=(d,),
                width='stretch',
            )

    note = st.session_state.pop("rec_note", None)
    if note:
        st.caption(note)

    st.caption(":green[■] Class held   :red[■] No class   :gray[■] Upcoming / before first class")
def render_day_view(df, selected, subject_code):
    day_df = df[df["date"] == selected]
    sessions = day_df[["session_id", "label"]].drop_duplicates().sort_values("session_id")

    if len(sessions) > 1:                                      # ek din mein 2 classes
        chosen = st.selectbox("Class time", sessions["label"].tolist(), key=f"rec_time_{selected}")
        session_id = sessions.loc[sessions["label"] == chosen, "session_id"].iloc[0]
    else:
        session_id = sessions["session_id"].iloc[0]
        st.caption(f"Class at {sessions['label'].iloc[0]}")

    sess = day_df[day_df["session_id"] == session_id]
    present = int(sess["present"].sum())
    total = len(sess)

    c1, c2, c3 = st.columns(3)
    c1.metric("Total", total)
    c2.metric("Present", present)
    c3.metric("Absent", total - present)

    view = sess[["Roll No", "Name", "present"]].copy()
    view["Status"] = view["present"].map({True: "Present", False: "Absent"})
    view = view.drop(columns="present")
    order = sorted(range(len(view)), key=lambda i: roll_sort_key(view.iloc[i]["Roll No"]))
    view = view.iloc[order].reset_index(drop=True)             # ✅ sirf ek baar

    st.dataframe(view, hide_index=True, width='stretch')

    stamp = sess["dt"].iloc[0].strftime("%Y-%m-%d_%I%M%p")
    safe_id = "".join(ch for ch in str(session_id) if ch.isalnum())    # ✅ saaf key

    st.download_button(                                        # ✅ sirf ek button
        "Download this day's attendance",
        data=to_excel_bytes(view),
        file_name=f"{subject_code}_{stamp}.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        icon=":material/download:",
        key=f"dl_day_{safe_id}",
        width='stretch',
    )
def teacher_tab_attendance_records():
    teacher_id = st.session_state.teacher_data["teachers_id"]
    st.markdown(DOWNLOAD_BTN_CSS, unsafe_allow_html=True)
    with st.container(border=True):
        st.subheader("📊 Attendance Records")
        st.caption("Pick a subject, then a day to see that day's attendance.")

        subjects = get_teacher_subjects(teacher_id)
        if not subjects:
            st.info("You haven't created any subjects yet.")
            return

        options = {f"{s['name']} - {s['subject_code']}": s for s in subjects}
        label = st.selectbox("Subject", list(options.keys()), key="rec_subject_label")
        subject = options[label]
        sid = subject["subject_id"]

        raw = get_subject_attendance(sid)
        if not raw:
            st.info("No attendance has been taken for this subject yet.")
            return
        df = parse_logs(raw)
        class_days = set(df["date"])

        # subject badla ho to calendar ko latest class wale mahine par le jao
        if st.session_state.get("rec_subject_id") != sid:
            st.session_state.rec_subject_id = sid
            last = max(class_days)
            st.session_state.rec_month = (last.year, last.month)
            st.session_state.rec_date = None

        st.divider()
        selected = st.session_state.get("rec_date")
        render_calendar(class_days, selected)

        if selected and selected in class_days:
            st.divider()
            st.markdown(f"**{selected.strftime('%A, %d %B %Y')}**")
            render_day_view(df, selected, subject['subject_code'])

        # --- download ---
        st.divider()
        st.markdown("**Download attendance sheet**")
        y, m = st.session_state.rec_month
        month_df = df[df["date"].map(lambda d: (d.year, d.month) == (y, m))]
        xlsx_mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        d1, d2 = st.columns(2)
        with d1:
            if month_df.empty:
                st.button(f"{calendar.month_name[m]} {y}", disabled=True, width='stretch',
                          icon=":material/download:", key="dl_month_off")
            else:
                st.download_button(
                    f"{calendar.month_name[m]} {y}",
                    data=to_excel_bytes(build_sheet(month_df)),
                    file_name=f"{subject['subject_code']}_{y}-{m:02d}.xlsx",
                    mime=xlsx_mime, icon=":material/download:", width='stretch',
                    key="dl_month")
        with d2:
            st.download_button(
                "Full sheet (all classes)",
                data=to_excel_bytes(build_sheet(df)),
                file_name=f"{subject['subject_code']}_full.xlsx",
                mime=xlsx_mime, icon=":material/download:", type='primary', width='stretch',
                key="dl_full")





from src.database.db import create_teacher,teacher_login

def login_teacher(username,password):
    if not username or not password:
        return False
    teacher=teacher_login(username,password)
    if teacher:
        st.session_state.user_role='teacher'
        st.session_state.teacher_data=teacher
        st.session_state.is_logged_int=True
        return True

def teacher_screen_login():
        col1,col2 =st.columns(2,vertical_alignment='center',gap="xxlarge")
        with col1:
            teacher_dashboard_header()
        with col2:
            # adding shortcut keys
            if st.button("Go to back to home",type="secondary",key='loginbackbtn',shortcut="control+backspace"):
                 st.session_state["login_type"]=None
                 st.rerun() 
    
        st.header("Login using password", text_alignment="center")
        st.space()
        teacher_username=st.text_input("Enter username",placeholder="sagar_yadav_96")
        teacher_pass=st.text_input("Enter password",type="password",placeholder="Enter your password")
        st.divider()
        btn_col1, btn_col2 = st.columns(2)
        with btn_col1:
           if st.button("Login Now",icon=":material/passkey:",shortcut='control+Enter', type="primary", use_container_width=True):
                if login_teacher(teacher_username,teacher_pass):
                    st.toast("Welcome back!")
                    import time
                    time.sleep(2)
                    st.rerun()
                else:
                    st.error("Invalid username and password")    






        with btn_col2:
            if st.button("Register Instead",icon=":material/passkey:", type="primary", use_container_width=True,shortcut='control+Enter'):
                st.session_state.teacher_login_type="register"
        st.space()
        footer()
 # dp function       
from src.database.db import check_teacher_exists


# register function db
def register_teacher(teacher_username,teacher_name,teacher_pass,teacher_pass_confirm):
    if not teacher_username or not teacher_name or not teacher_pass:
        return False,"All Fields are required!"
    if check_teacher_exists(teacher_username):
        return False,"Username already taken"
    if teacher_pass!=teacher_pass_confirm:
        return False,"Password doesn't match"
    try:
        create_teacher(teacher_username,teacher_pass,teacher_name)
        return True,"Sucessfully Created! Login Now"
    except Exception as e:
         return False,"Unexpected Error"
         

def teacher_screen_register():
        col1,col2 =st.columns(2,vertical_alignment='center',gap="xxlarge")
        with col1:
             teacher_dashboard_header()
        with col2:
             # adding shortcut keys
            if st.button("Go to back to home",type="secondary",key='loginbackbtn',shortcut="control+backspace"):
                 st.session_state["login_type"]=None
                 st.rerun()
     
        
        st.header("Register  Your  Teacher profile 👨‍🏫", text_alignment="center")
        
        teacher_username=st.text_input("Enter username",placeholder="sagar_yadav_96")
        teacher_name=st.text_input("Enter name",placeholder="sagar yadav")
        teacher_pass=st.text_input("Enter password",type="password",placeholder="Enter password")

        teacher_pass_confirm=st.text_input("Confirm your password",type="password",placeholder="Enter password")
        st.divider()
        btn_col1, btn_col2 = st.columns(2)
        with btn_col1:
            if st.button("Register Now",icon=":material/passkey:",shortcut='control+Enter', type="primary", use_container_width=True):
                success,message=register_teacher(teacher_username,teacher_name,teacher_pass,teacher_pass_confirm)
                if success:
                    st.success(message)
                    
                    import time
                    time.sleep(2)
                    st.session_state.teacher_login_type="login"
                    st.rerun()
                else:
                    st.error(message) 

        with btn_col2:
            if st.button("Login Instead",icon=":material/passkey:", type="primary", use_container_width=True,shortcut='control+Enter'):
                 st.session_state.teacher_login_type="login"
        st.space()
        footer() 