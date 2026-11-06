# Pramaan: Advanced Add-Ons Master Architecture & Implementation Plan

> **System:** Pramaan — Enterprise Face + Voice Biometric Attendance Platform  
> **Target Audience:** Universities, Colleges & Institutional Campuses  
> **Stack:** React 19 + Vite + Tailwind CSS (Dark Zinc `#09090b`), FastAPI (Python 3.13), Supabase (PostgreSQL), dlib ResNet-128, Resemblyzer 256-d, scikit-learn.

---

## 1. Current State & Baseline Audit

### What Exists & Is Operating
1. **Face Recognition & Liveness:** dlib 68-point landmark tracker, 128-d metric embeddings, EAR (Eye Aspect Ratio) blink detector, dynamic match threshold (`0.60`), multi-photo and video keyframe extraction.
2. **Voice Biometrics:** Resemblyzer 256-d speaker embeddings, silence rejection (`min_rms=0.005`), duration validation (`min_duration=2.0s`), multi-modal bulk audio diarization.
3. **Authentication & Session:** HTTP-only JWTs (access + refresh), PIN hashing with bcrypt, student first-login force PIN change, rotating 15-minute OTP and QR join codes.
4. **Academic Operations:** Bunk & 75% attendance calculator, CSV exports, teacher overrides, multi-class roster management.
5. **Test Suite:** 16/16 automated pytest tests passing across auth, bunk calculator, face pipeline, and voice pipeline.

---

## 2. Advanced Add-Ons Roadmap (Phases A – I)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRAMAAN ADVANCED ADD-ONS                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────┬───────────────┼───────────────┬────────────────┐
    ▼               ▼               ▼               ▼                ▼
 Phase A         Phase B         Phase C         Phase D          Phase E
Trust Score     ML Risk &     Safe AI Chat       DPDP Act       Classroom
  Engine        Anomalies     Assistant        Compliance         Kiosk
    │               │               │               │                │
    ├───────────────┼───────────────┴───────────────┼────────────────┘
    ▼               ▼                               ▼
 Phase F         Phase G                         Phase H & I
Academic       Multi-Tenant &                  Observability &
Workflows      Public API / i18n               Evaluation Benchmarks
```

---

### Phase A: Trust Score Engine (Core Differentiator)
- **Objective:** Move beyond binary (Present/Absent) to a multi-factor confidence rating (0–100) per mark.
- **Scoring Dimensions & Weights (Configurable):**
  1. *Face Match Confidence (35%)*: Cosine distance / SVM probability mapped to 0–100.
  2. *Liveness Score (20%)*: EAR ratio and landmark movement variance.
  3. *Voice Match (15%)*: Diarized audio similarity score (or neutral 100% when mode is face-only).
  4. *Session Code / Window (15%)*: Valid rotating code, submitted within the 15-min validity window.
  5. *Geofence & IP Consistency (10%)*: Campus Wi-Fi IP subnet check or GPS bounding radius.
  6. *Device Fingerprint (5%)*: Known browser/canvas hash vs. student's registered device history.
- **Decision Engine:**
  - `Trust Score >= 80`: **Auto-Accepted** (Instant green badge).
  - `50 <= Trust Score < 80`: **Needs Review** (Amber chip; requires teacher review).
  - `Trust Score < 50`: **Flagged / Rejected** (Red chip; flagged as high-risk proxy attempt).
- **Storage:** Persisted in `attendance_logs.trust_score` (INT) and `attendance_logs.trust_breakdown` (JSONB).
- **Teacher Review UI:** Sortable by lowest trust score first, interactive chip bar showing itemized factors and one-click override.

---

### Phase B: Attendance Risk Prediction (ML) & Anomaly Detection
- **Objective:** Early warning system for students projected to fall below the mandatory 75% threshold before term end.
- **ML Pipeline:**
  - Gradient Boosted / Random Forest Classifier trained on temporal features: current percentage, absence momentum (last 14 days), weekday distribution (e.g. Friday bunk patterns), course historical difficulty proxy.
  - Joblib model versioning (`src/ml/models/risk_v1.joblib`) with automated retraining script (`scripts/train_risk_model.py`).
  - Feature importance / SHAP value extraction explaining why a student is flagged at risk.
- **Anomaly Detection:** `IsolationForest` flagging suspicious patterns:
  - Exact simultaneous attendance timestamps from disparate students.
  - Repeated device fingerprint collisions across different roll numbers (device sharing/proxying).
  - Last-minute rapid marking bursts.

---

### Phase C: AI Assistant (Safe Chat Over Attendance Data)
- **Objective:** Conversational assistant for students ("Can I bunk DBMS tomorrow?") and teachers ("Show students below 75% in Sec A").
- **Safety Architecture:**
  - Role-scoped backend tool calling only — **ZERO raw SQL generation**.
  - Student tools: `get_my_attendance(subject)`, `simulate_bunk(subject, classes_to_skip)`, `get_my_schedule()`.
  - Faculty tools: `get_subject_summary(subject_id)`, `get_low_attendance_students(subject_id, threshold)`, `get_date_absentees(subject_id, date)`.
  - Defenses: Input sanitization, strict PII filtering, prompt-injection guardrails treating DB contents strictly as inert data strings.

---

### Phase D: Privacy & India DPDP Act Compliance
- **Consent Governance:**
  - Versioned digital consent checkbox at student registration (`consent_version`, `consent_timestamp`, `consent_ip`).
  - Consent withdrawal workflow: "Delete My Biometrics" endpoint that zeroizes face & voice embeddings with an audit trail entry.
- **Data Minimization & Encryption:**
  - Raw face photos and audio are never stored permanently; processed strictly in ephemeral RAM buffers and securely purged.
  - At-rest AES-256-GCM application-level encryption for floating-point embeddings (`EMBEDDING_ENCRYPTION_KEY`).
  - Self-service "Download My Attendance & Biometric Data" (JSON export).
  - Formal `docs/PRIVACY.md` documentation covering DPDP 2023 principles.

---

### Phase E: Classroom Kiosk Mode
- Dedicated tablet/laptop route (`/kiosk`) for walk-up classroom entrance scanning.
- Face + active liveness in continuous loop: auto-detects face, captures frame, verifies against class roster, plays audio-visual confirmation chime, displays "Welcome <Name>, Present".
- Duplicate protection: prevents marking twice in the same session with a clear cooldown badge.
- Ambient illumination and blur detection: warns when lighting is too dim or camera motion blur is high.

---

### Phase F: Academic Workflow Features
- **Leave / Medical Approvals:** Students submit leave applications with document attachment; teacher approves/rejects; approved leaves calculate as "Excused" attendance.
- **Parent / Guardian Portal:** Magic-link authenticated read-only portal for parents to view student percentage, daily logs, and shortfall warnings.
- **CSV Bulk Roster Importer:** Faculty upload CSV of students/subjects with dry-run preview, schema validation, and error reporting.
- **Timetable & Substitution:** Subject schedule slots with current class auto-detection.

---

### Phase G: Platform, Multi-Tenancy & Integrations
- Institutional scoping (`institution_id`) across all tables with PostgreSQL Row Level Security (RLS).
- Public REST API with scoped API keys (`pramaan_live_...`) and webhook triggers (`attendance.logged`, `student.at_risk`) with HMAC-SHA256 signatures.
- Full bilingual i18n support (English & Hindi) with `react-i18next`.

---

### Phase H: Enterprise Reliability & Observability
- Sentry error monitoring integration (frontend + backend).
- Prometheus metrics endpoint (`/metrics`) and structured JSON access logs with `X-Request-ID`.
- Background task queue with retry logic and dead-letter failure logging for multi-frame media jobs.
- Supabase versioned migration scripts.

---

### Phase I: Evaluation, Benchmarks & Showcase
- Automated biometric benchmark (`scripts/evaluate_biometrics.py`) generating FAR / FRR / EER curves and ROC plots in `docs/EVALUATION.md`.
- Liveness spoof attack evaluation (printed photo, screen replay).
- Load test suite (Locust) for high-density classroom processing (60 students in < 3s).
- Demo mode with pre-seeded test students and faculty accounts.

---

## 3. Database Migration Requirements (PostgreSQL / Supabase)

```sql
-- Phase A: Trust Score & Factor Breakdown
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS trust_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'auto_accepted',
ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(128),
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Index for filtering reviews by trust score
CREATE INDEX IF NOT EXISTS idx_attendance_logs_trust ON attendance_logs(subject_id, trust_score);
```

---

## 4. Immediate Next Step: Phase A Implementation
We will now execute **Phase A (Trust Score Engine)**:
1. Implement the mathematical scoring engine (`src/services/trust_score_service.py`).
2. Integrate scoring into attendance analysis & logging pipelines in `server.py` and `src/database/db.py`.
3. Add system settings for configurable trust weights and thresholds.
4. Upgrade the Faculty Review Drawer in `FacultyDashboard.jsx` with trust score chips, factor breakdowns, and low-trust sorting.
5. Write comprehensive unit tests in `tests/test_trust_score.py`.

