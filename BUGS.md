# Pramaan QA Bug Tracker & Audit Log

| Bug ID | Severity | Module | Steps to Reproduce | Expected vs Actual | Fix Applied | Guard Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *BUG-001* | *Medium* | *Trust Score* | Calculate trust score with voice confidence <= 1.0 (e.g. 0.88) | Expected explanation string to show "Voice 88%", was showing "Voice 1%" due to integer rounding before percentage multiplier | Multiplied by 100 before round | `tests/test_trust_score.py::test_multi_modal_with_voice` |
| *BUG-002* | *High* | *Session Token* | Generate rotating 15-min session OTP code | Raised `AttributeError: 'Settings' object has no attribute 'SECRET_KEY'` because config defines `JWT_SECRET_KEY` | Handled attribute fallback to `JWT_SECRET_KEY` | `tests/test_session_token.py::test_code_generation_format` |
| *BUG-003* | *Low* | *Face Pipeline* | Exact float boundary comparison at Euclidean distance `0.60` | IEEE 754 float32 precision represented 0.60 as `0.6000000238...` failing strict `<=` comparison | Applied `round(dist, 4)` precision tolerance | `tests/test_face_pipeline.py::test_distance_threshold_boundary` |

