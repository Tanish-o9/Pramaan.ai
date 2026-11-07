"""
Comprehensive Live Feature Verification Script for Presence.ai / Pramaan.ai
Tests all core and ecosystem features against running FastAPI backend.
"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def log_test(name, success, detail=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"[{status}] {name}")
    if detail:
        print(f"       -> {detail}")
    return success

def run_tests():
    test_results = []
    print("\n" + "="*70)
    print("🚀 PRESENCE.AI COMPLETE FEATURE & ECOSYSTEM VERIFICATION SUITE")
    print("="*70 + "\n")

    # ================= 1. TEACHER AUTHENTICATION =================
    session_deepu = requests.Session()
    session_tanish_faculty = requests.Session()

    try:
        res = session_deepu.post(f"{BASE_URL}/api/auth/teacher/login", json={"username": "deepu", "password": "1234"}, timeout=5)
        ok = res.status_code == 200 and res.json().get("status") == "success"
        teacher_deepu = res.json().get("teacher", {})
        test_results.append(log_test("1.1 Faculty Sign-In (deepu / 1234)", ok, f"Name: {teacher_deepu.get('name')}, ID: {teacher_deepu.get('teachers_id')}"))

        bad_session = requests.Session()
        res_bad = bad_session.post(f"{BASE_URL}/api/auth/teacher/login", json={"username": "deepu", "password": "wrongpassword"}, timeout=5)
        ok_bad = res_bad.status_code == 401
        test_results.append(log_test("1.2 Faculty Rejection on Invalid Password", ok_bad, f"Response Code: {res_bad.status_code}"))

        res_tanish = session_tanish_faculty.post(f"{BASE_URL}/api/auth/teacher/login", json={"username": "tanish_rajput", "password": "1234"}, timeout=5)
        ok_tanish = res_tanish.status_code == 200
        teacher_tanish = res_tanish.json().get("teacher", {})
        test_results.append(log_test("1.3 Faculty Sign-In (tanish_rajput / 1234)", ok_tanish, f"Name: {teacher_tanish.get('name')}, ID: {teacher_tanish.get('teachers_id')}"))
    except Exception as e:
        test_results.append(log_test("1. Faculty Authentication", False, str(e)))

    # ================= 2. STUDENT AUTHENTICATION =================
    session_priya = requests.Session()
    session_tanish_student = requests.Session()

    try:
        res_stu = session_priya.post(f"{BASE_URL}/api/auth/student/login-pin", json={"roll_number": "22CS043", "pin": "1234"}, timeout=5)
        ok_stu = res_stu.status_code == 200 and res_stu.json().get("status") == "success"
        student_priya = res_stu.json().get("student", {})
        test_results.append(log_test("2.1 Student Sign-In (Priya Singh / 22CS043 / PIN: 1234)", ok_stu, f"Name: {student_priya.get('name')}, ID: {student_priya.get('student_id')}"))

        bad_stu_sess = requests.Session()
        res_stu_bad = bad_stu_sess.post(f"{BASE_URL}/api/auth/student/login-pin", json={"roll_number": "22CS043", "pin": "9999"}, timeout=5)
        ok_stu_bad = res_stu_bad.status_code == 401
        test_results.append(log_test("2.2 Student Rejection on Invalid PIN", ok_stu_bad, f"Response Code: {res_stu_bad.status_code}"))

        res_stu_t = session_tanish_student.post(f"{BASE_URL}/api/auth/student/login-pin", json={"roll_number": "25153162", "pin": "1234"}, timeout=5)
        ok_stu_t = res_stu_t.status_code == 200
        student_tanish = res_stu_t.json().get("student", {})
        test_results.append(log_test("2.3 Student Sign-In (Tanish Rajput / 25153162)", ok_stu_t, f"Name: {student_tanish.get('name')}, ID: {student_tanish.get('student_id')}"))
    except Exception as e:
        test_results.append(log_test("2. Student Authentication", False, str(e)))

    # ================= 3. TEACHER SUBJECTS & SECTION FILTERING =================
    subjects = []
    deepu_sub = None
    other_sub = None
    try:
        res_subs = session_deepu.get(f"{BASE_URL}/api/teacher/subjects", timeout=5)
        ok_subs = res_subs.status_code == 200 and isinstance(res_subs.json(), list)
        if ok_subs:
            subjects = res_subs.json()
            sections_found = sorted(list(set(s.get("section") for s in subjects if s.get("section"))))
            deepu_sub = next((s for s in subjects if s.get("is_my_assigned")), None)
            other_sub = next((s for s in subjects if not s.get("is_my_assigned")), None)
            test_results.append(log_test("3.1 Subject & Section Roster Fetching", ok_subs, f"Total Subjects: {len(subjects)}, Sections: {sections_found}"))
            test_results.append(log_test("3.2 Teacher Assignment Tagging", deepu_sub is not None, f"Deepu Assigned: {deepu_sub.get('name')} ({deepu_sub.get('subject_code')})"))
    except Exception as e:
        test_results.append(log_test("3. Teacher Subjects & Sections", False, str(e)))

    # ================= 4. STRICT TEACHER AUTHORIZATION SECURITY =================
    try:
        if deepu_sub and other_sub:
            # 4.1 Try to mark attendance for unassigned subject -> MUST BE 403
            res_unauth = session_deepu.post(f"{BASE_URL}/api/attendance/log", json={
                "subject_id": other_sub["subject_id"],
                "logs": [{"subject_id": other_sub["subject_id"], "roll_number": "22CS043", "is_present": True}]
            }, timeout=5)
            ok_block = res_unauth.status_code == 403 and "not authorized" in res_unauth.json().get("detail", "").lower()
            test_results.append(log_test("4.1 Security: Block Unauthorized Class Attendance", ok_block, f"Code: {res_unauth.status_code}, Msg: '{res_unauth.json().get('detail')}'"))

            # 4.2 Try to mark attendance for assigned subject -> MUST BE 200
            res_auth = session_deepu.post(f"{BASE_URL}/api/attendance/log", json={
                "subject_id": deepu_sub["subject_id"],
                "logs": [
                    {"subject_id": deepu_sub["subject_id"], "roll_number": "22CS043", "is_present": True, "verification_status": "verified"},
                    {"subject_id": deepu_sub["subject_id"], "roll_number": "22CS044", "is_present": False, "verification_status": "absent"}
                ]
            }, timeout=5)
            ok_allow = res_auth.status_code == 200 and res_auth.json().get("status") == "success"
            test_results.append(log_test("4.2 Security: Allow Authorized Class Attendance", ok_allow, f"Subject: {deepu_sub['name']}, Inserted Records: {res_auth.json().get('count')}"))
    except Exception as e:
        test_results.append(log_test("4. Security Authorization", False, str(e)))

    # ================= 5. STUDENT DASHBOARD & ACCESS CONTROL =================
    try:
        # Priya Singh (student_id: 2) accessing her own dashboard
        res_dash = session_priya.get(f"{BASE_URL}/api/student/dashboard/2", timeout=5)
        ok_dash = res_dash.status_code == 200
        dash_data = res_dash.json() if ok_dash else []
        test_results.append(log_test("5.1 Student Personal Dashboard & Bunk Metrics", ok_dash, f"Priya Singh Enrolled Subjects: {len(dash_data)}"))

        # Cross-Student ID isolation security check: Priya trying to access Tanish's dashboard -> MUST BE 403
        res_cross = session_priya.get(f"{BASE_URL}/api/student/dashboard/4", timeout=5)
        ok_cross = res_cross.status_code == 403
        test_results.append(log_test("5.2 Student Dashboard Privacy Isolation Check", ok_cross, f"Blocked cross-student read with code: {res_cross.status_code}"))

        # Tanish accessing his own Digital ID Card
        res_did = session_tanish_student.get(f"{BASE_URL}/api/student/digital-id", timeout=5)
        ok_did = res_did.status_code == 200 and "token" in res_did.json()
        token_len = len(res_did.json().get("token", "")) if ok_did else 0
        test_results.append(log_test("5.3 Student Dynamic Cryptographic Digital ID Token", ok_did, f"Student: {res_did.json().get('name')}, Token Size: {token_len} chars"))
    except Exception as e:
        test_results.append(log_test("5. Student Portal & Dashboard", False, str(e)))

    # ================= 6. ML RADAR, RISK & INTELLIGENCE =================
    try:
        if deepu_sub:
            # Dropout risk ML prediction for faculty's subject
            res_risk = session_deepu.get(f"{BASE_URL}/api/analytics/risk?subject_id={deepu_sub['subject_id']}", timeout=5)
            ok_risk = res_risk.status_code == 200 and res_risk.json().get("status") == "success"
            risk_students = res_risk.json().get("students", [])
            test_results.append(log_test("6.1 ML Dropout Risk Prediction", ok_risk, f"Evaluated Enrolled Students: {len(risk_students)}"))

            # Anomaly / Proxy detection radar
            res_anom = session_deepu.get(f"{BASE_URL}/api/analytics/anomalies?subject_id={deepu_sub['subject_id']}", timeout=5)
            ok_anom = res_anom.status_code == 200 and res_anom.json().get("status") == "success"
            anom_data = res_anom.json().get("anomalies", [])
            test_results.append(log_test("6.2 ML Proxy & Anomaly Radar", ok_anom, f"Detected Anomalies: {len(anom_data)}"))
    except Exception as e:
        test_results.append(log_test("6. ML Intelligence Features", False, str(e)))

    # ================= 7. LEAVE & OD MANAGEMENT =================
    try:
        res_leaves = session_deepu.get(f"{BASE_URL}/api/leaves/teacher", timeout=5)
        ok_leaves = res_leaves.status_code == 200 and "leaves" in res_leaves.json()
        leaves_list = res_leaves.json().get("leaves", [])
        test_results.append(log_test("7.1 Medical Leaves & OD Review Queue", ok_leaves, f"Total Pending/Reviewed Leaves: {len(leaves_list)}"))
    except Exception as e:
        test_results.append(log_test("7. Leave Management", False, str(e)))

    # ================= 8. CLASSROOM KIOSK & MULTI-DEVICE FEATURES =================
    try:
        res_kiosk = session_deepu.get(f"{BASE_URL}/api/kiosk/subjects", timeout=5)
        ok_kiosk = res_kiosk.status_code == 200 and "subjects" in res_kiosk.json()
        kiosk_subs = res_kiosk.json().get("subjects", [])
        test_results.append(log_test("8.1 Classroom Wall Kiosk Mode", ok_kiosk, f"Kiosk-enabled subjects: {len(kiosk_subs)}"))

        res_net = session_deepu.get(f"{BASE_URL}/api/network-ip", timeout=5)
        ok_net = res_net.status_code == 200 and "ip" in res_net.json()
        test_results.append(log_test("8.2 LAN Network Auto-Discovery (Phone Cam Connect)", ok_net, f"Local IP: {res_net.json().get('ip')}"))

        res_trust = session_deepu.get(f"{BASE_URL}/api/settings/trust-score", timeout=5)
        ok_trust = res_trust.status_code == 200 and "weights" in res_trust.json()
        test_results.append(log_test("8.3 Multi-Factor Biometric Trust Engine", ok_trust, f"Configured weights: {list(res_trust.json().get('weights', {}).keys())}"))
    except Exception as e:
        test_results.append(log_test("8. Kiosk & Multi-Device", False, str(e)))

    # ================= 9. ATTENDANCE AUDIT TRAIL & CSV EXPORT =================
    try:
        if deepu_sub:
            res_rec = session_deepu.get(f"{BASE_URL}/api/attendance/records/{deepu_sub['subject_id']}", timeout=5)
            ok_rec = res_rec.status_code == 200 and res_rec.json().get("status") == "success"
            records = res_rec.json().get("records", [])
            test_results.append(log_test("9.1 Teacher Attendance Audit Trail Records", ok_rec, f"Logs for {deepu_sub['subject_code']}: {len(records)} entries"))

            res_csv = session_deepu.get(f"{BASE_URL}/api/attendance/export/csv/{deepu_sub['subject_id']}", timeout=5)
            ok_csv = res_csv.status_code == 200 and "text/csv" in res_csv.headers.get("content-type", "")
            test_results.append(log_test("9.2 Official CSV Export Engine", ok_csv, f"CSV payload size: {len(res_csv.text)} bytes"))
    except Exception as e:
        test_results.append(log_test("9. Audit Trail & CSV Export", False, str(e)))

    all_passed = all(test_results)
    print("\n" + "="*70)
    if all_passed:
        print(f"🎉 ALL {len(test_results)} TESTS PASSED! EVERY FEATURE OPERATING FLAWLESSLY 🚀")
    else:
        print(f"⚠️ {test_results.count(False)} OUT OF {len(test_results)} TESTS FAILED - SEE LOGS ABOVE")
    print("="*70 + "\n")
    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
