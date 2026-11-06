# Pramaan: Real-Device Manual QA Audit Checklist

> **Target Devices:** Android Chrome (v120+), iPhone Safari (iOS 17+), Windows Laptop Webcams (Lenovo/HP/Dell/MacBook).  
> **Test Environment:** HTTPS / Local Tunnel (`localhost:5173` & `localhost:8000`).

---

## 1. Physical Hardware & Camera Shutter Verification

| Test ID | Scenario | Steps to Execute | Expected Behavior | Status |
| :--- | :--- | :--- | :--- | :---: |
| **CAM-01** | Physical Privacy Shutter Closed | 1. Close webcam slider/cover.<br>2. Navigate to Student Portal -> Face ID. | System detects low brightness (< 12) / zero variance and displays clear banner: *"Webcam privacy shutter/slider is closed. Please open it or click Upload Photo"* rather than generic crash. | **PASS** |
| **CAM-02** | Hardware Permission Denied | 1. Block camera permissions in browser address bar.<br>2. Click "Enable Camera". | Inline error displays instructions to click the lock icon and toggle permissions. Direct "Upload selfie" link remains accessible. | **PASS** |
| **CAM-03** | Low Light / Dark Room | 1. Test in dimly lit classroom (< 15 lux).<br>2. Click "Sign in with Face ID". | Prompts user with low-light warning or falls back to Roll & PIN. | **PASS** |
| **CAM-04** | Lens Obstruction / Finger over camera | 1. Cover lens with finger.<br>2. Click Snap Photo. | Blank frame detector rejects solid frame before sending to server. | **PASS** |

---

## 2. Student Authentication & PIN Recovery

| Test ID | Scenario | Steps to Execute | Expected Behavior | Status |
| :--- | :--- | :--- | :--- | :---: |
| **STU-01** | First Login Force PIN Change | 1. Register student with default PIN `1234`.<br>2. Sign in via Roll & PIN. | Security modal forces mandatory PIN update. Entering `1234` again is blocked with *"Cannot be default 1234"*. | **PASS** |
| **STU-02** | Face ID Login | 1. Face camera directly inside the oval guide.<br>2. Click "Sign in with Face ID". | Landmark blink detector validates liveness. Matches against enrolled embeddings and logs in within < 1.5s. | **PASS** |
| **STU-03** | Bunk Calculator Live Display | 1. Navigate to Student Dashboard.<br>2. Check subject cards. | Accurately renders percentage, exact permissible bunks, and required classes to recover to 75%. | **PASS** |
| **STU-04** | Voice Enrollment in Profile | 1. Go to Biometric Profile tab.<br>2. Speak clearly for 5 seconds.<br>3. Click Save Sample. | Waveform visualizer animates. Silence/whispers are rejected. 256-d voice embedding persists in profile. | **PASS** |

---

## 3. Faculty Verification & Trust Score Review

| Test ID | Scenario | Steps to Execute | Expected Behavior | Status |
| :--- | :--- | :--- | :--- | :---: |
| **FAC-01** | Multi-Photo Verification | 1. Select Subject -> Multi-Photo mode.<br>2. Upload 2 classroom photos.<br>3. Click Analyze Photos. | Multi-Factor Review Drawer opens showing count of Auto-Accepted, Needs Review, and Flagged students. | **PASS** |
| **FAC-02** | Sort by Lowest Trust First | 1. Click "Sort: Lowest Trust First" toggle. | Reorders list with lowest trust / flagged students at the top for immediate faculty inspection. | **PASS** |
| **FAC-03** | Trust Factor Breakdown | 1. Click info icon next to any student. | Expands to show Face, Liveness, Session Code, IP, and Device chips with exact subscores. | **PASS** |
| **FAC-04** | One-Click Attendance Override | 1. Click "PRESENT" / "ABSENT" toggle on any row.<br>2. Click Confirm & Save. | Updates record status in Supabase and persists audit trail. | **PASS** |
| **FAC-05** | LMS CSV Export | 1. Go to Past Records tab.<br>2. Click "Export LMS CSV". | Downloads RFC 4180 compliant CSV preserving student names, roll numbers, status, and Trust Scores. | **PASS** |

