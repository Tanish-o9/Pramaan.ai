# Pramaan: Comprehensive Automated QA & Testing Master Plan

> **System:** Pramaan — Enterprise Face + Voice Biometric Attendance Platform  
> **Test Stack:** Pytest 8.x, pytest-asyncio, pytest-cov, httpx AsyncClient, Vitest, React Testing Library, MSW, Playwright.

---

## 1. Scope & Modules Under Test

```
┌────────────────────────────────────────────────────────────────────────┐
│                      PRAMAAN TEST ARCHITECTURE                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────┬───────────────┼───────────────┬────────────────┐
    ▼               ▼               ▼               ▼                ▼
 Unit Tests     API & Integr.    Security       Biometric Eval      Frontend
- Bunk calc     - 14+ Endpoints  - Auth/JWT     - FAR / FRR / EER  - Vitest (UI)
- Face / Voice  - CRUD Flows     - IDOR / RBAC  - Spoof attacks    - Playwright
- Trust Engine  - DB isolation   - Sanitization - Density tests      (E2E flows)
```

### Backend Modules
1. **`src/auth.py`**: JWT access/refresh lifecycle, SameSite/HttpOnly cookie headers, bcrypt PIN/password hashing, role enforcement (`require_teacher`, `require_student`).
2. **`src/pipeline/face_pipeline.py`**: dlib ResNet-128 face recognition, 68-point landmark tracker, EAR (Eye Aspect Ratio) liveness, angle/illumination robustness, threshold boundary conditions.
3. **`src/pipeline/voice_pipeline.py`**: Resemblyzer 256-d d-vector speaker encoder, 16kHz mono audio normalization, energy/silence rejection, duration gates.
4. **`src/services/trust_score_service.py`**: Multi-factor Trust Score engine (0–100), factor weights, status thresholds, explanation formatting.
5. **`src/database/db.py`**: Supabase table abstractions, schema fallbacks, attendance queries.
6. **`server.py`**: FastAPI routing, rate-limiting (slowapi), upload handlers, CSV generation.

### Frontend Modules
1. **`StudentAuth.jsx`**: Face ID webcam feed, blank/shutter frame detector, Roll & PIN login, registration.
2. **`FacultyDashboard.jsx`**: Attendance modes (photo, video, voice, manual), Trust Score review drawer, sorting by lowest trust, LMS CSV export.
3. **`StudentDashboard.jsx`**: Subject percentages, Bunk/75% target calculator, profile voice enrollment.
4. **`VoiceRecorder.jsx`**: Audio recording, duration timer, audio playback, waveform level meter.

---

## 2. Risk Areas & Mitigation Strategy

| Risk Area | Potential Vulnerability | Test & Mitigation Strategy |
| :--- | :--- | :--- |
| **Biometric Spoofing** | Screen replays, printed photos, voice recordings | Synthetic test fixtures simulating printed photos, black frames, replayed voice; EAR blink validation. |
| **Production Data Leak** | Tests mutating production Supabase database | Strict mock Supabase client and in-memory test database fixture in `tests/conftest.py`. Production DB credentials never touched. |
| **Auth & IDOR** | Teacher accessing other teacher's class; student reading peer data | Dedicated test cases checking cross-tenant IDOR access (expecting 403 Forbidden). |
| **Token Hijacking** | Expired tokens, algorithm `none`, missing HttpOnly cookies | Security test suite validating JWT signatures, cookie flags, and token rotation. |
| **Camera Hardware Failure** | Laptop shutter closed / permission denied | Unit & E2E tests verifying client-side blank frame detection and fallback to file upload. |

---

## 3. Test Fixtures & Synthetic Datasets

### Synthetic Media Fixtures (`tests/fixtures/`)
1. **Face Images (`tests/fixtures/images/`)**:
   - `clear_face.jpg`: Centered, balanced lighting, eye landmarks visible.
   - `side_angle.jpg`: Yaw > 30 degrees.
   - `low_light.jpg`: Dark image with mean brightness < 30.
   - `blurred_face.jpg`: Gaussian blur filter applied.
   - `no_face.jpg`: Neutral wall texture without face.
   - `multi_faces.jpg`: Group of 3 distinct faces.
2. **Audio Clips (`tests/fixtures/audio/`)**:
   - `clean_speech.wav`: 4-second 16kHz speech utterance.
   - `silent.wav`: Flatline zeros audio (< 0.001 RMS).
   - `too_short.wav`: 0.8-second brief chirp.
   - `noisy.wav`: Background white noise.

---

## 4. Test Execution Phases

- **Phase 1: Test Infrastructure**: Pytest configuration, mock DB fixtures, test media generators, npm test scripts.
- **Phase 2: Backend Unit Tests**: Bunk math, face pipeline, voice pipeline, trust score, anti-proxy.
- **Phase 3: API & Integration Tests**: 14+ REST endpoints, database transaction rollbacks.
- **Phase 4: Security Audit**: JWT tampering, IDOR, input sanitization, rate limits.
- **Phase 5: Biometric Evaluation**: FAR/FRR/EER curves in `docs/EVALUATION.md`.
- **Phase 6: Frontend & E2E Tests**: Component tests & Playwright full user journeys.
- **Phase 7: Performance & Reliability**: Load & soak testing.
- **Phase 8: CI/CD Quality Gates**: Automated GitHub Actions workflows.
- **Phase 9: Final QA Report**: `docs/MANUAL_QA.md` and `docs/TEST_REPORT.md`.

