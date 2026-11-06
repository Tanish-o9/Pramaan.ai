import functools
import os
import dlib
import numpy as np
import face_recognition_models
from sklearn.svm import SVC
from src.database.db import get_all_student

CONFIG = {
    "face_match_threshold": float(os.environ.get("FACE_MATCH_THRESHOLD", 0.60)),
    "liveness_ear_threshold": float(os.environ.get("LIVENESS_EAR_THRESHOLD", 0.16)),
    "liveness_enabled": True
}

def get_face_config():
    return CONFIG.copy()

def set_face_config(face_match_threshold=None, liveness_ear_threshold=None, liveness_enabled=None):
    if face_match_threshold is not None:
        CONFIG["face_match_threshold"] = float(face_match_threshold)
    if liveness_ear_threshold is not None:
        CONFIG["liveness_ear_threshold"] = float(liveness_ear_threshold)
    if liveness_enabled is not None:
        CONFIG["liveness_enabled"] = bool(liveness_enabled)
    return CONFIG.copy()

@functools.lru_cache(maxsize=1)
def load_dlib_model():
    detector = dlib.get_frontal_face_detector()
    sp = dlib.shape_predictor(face_recognition_models.pose_predictor_model_location())
    facerec = dlib.face_recognition_model_v1(face_recognition_models.face_recognition_model_location())
    return detector, sp, facerec

def get_eye_aspect_ratio(pts):
    """
    Computes Eye Aspect Ratio (EAR) given 6 (x, y) landmark points of an eye:
    EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
    """
    pts = np.array(pts, dtype=np.float32)
    a = float(np.linalg.norm(pts[1] - pts[5]))
    b = float(np.linalg.norm(pts[2] - pts[4]))
    c = float(np.linalg.norm(pts[0] - pts[3]))
    return 0.0 if c == 0 else (a + b) / (2.0 * c)

def check_liveness_landmarks(image_np, ear_threshold=None, enabled=None):
    """Calculates Eye Aspect Ratio (EAR) from 68 facial landmarks to verify eye geometry."""
    is_enabled = enabled if enabled is not None else CONFIG.get("liveness_enabled", True)
    if not is_enabled:
        return True, "Liveness check disabled"

    thresh = ear_threshold if ear_threshold is not None else CONFIG.get("liveness_ear_threshold", 0.16)
    detector, sp, _ = load_dlib_model()
    faces = detector(image_np, 1)
    if not faces:
        return False, "No face detected in frame. Please align your face inside the guide oval."

    shape = sp(image_np, faces[0])
    left_pts = np.array([[shape.part(i).x, shape.part(i).y] for i in range(36, 42)])
    right_pts = np.array([[shape.part(i).x, shape.part(i).y] for i in range(42, 48)])
    ear = (get_eye_aspect_ratio(left_pts) + get_eye_aspect_ratio(right_pts)) / 2.0

    is_live = bool(ear > thresh)
    return is_live, "Live face verified" if is_live else f"Anti-spoofing warning: EAR {ear:.2f} below threshold {thresh:.2f}"

def get_face_embeddings(image_np):
    detector, sp, facerec = load_dlib_model()
    faces = detector(image_np, 1)
    return [np.array(facerec.compute_face_descriptor(image_np, sp(image_np, f), 1)) for f in faces]

def get_trained_model():
    students = get_all_student() or []
    x, y = [], []
    for s in students:
        emb = s.get('face_embedding')
        if emb:
            x.append(np.array(emb))
            y.append(s.get('student_id'))

    if not x:
        return None

    clf = SVC(kernel='linear', probability=True, class_weight='balanced')
    if len(set(y)) >= 2:
        try:
            clf.fit(x, y)
        except Exception:
            pass
    return {'clf': clf, 'x': x, 'y': y}

def predict_attendance_with_confidence(image_np, match_threshold=None, subject_id=None):
    thresh = match_threshold if match_threshold is not None else CONFIG.get("face_match_threshold", 0.60)
    encodings = get_face_embeddings(image_np)
    detected = {}
    if not encodings:
        return detected, [], 0

    # Fast Subject-Scoped Vector Search (pgvector HNSW / scoped fallback)
    if subject_id:
        try:
            from src.services.vector_search_service import vector_service
            for enc in encodings:
                res = vector_service.search_face(enc.tolist(), subject_id=subject_id, threshold=thresh)
                if res and res.get("matched"):
                    pid = int(res["student_id"])
                    conf = float(res["confidence"])
                    if pid not in detected or conf > detected[pid]:
                        detected[pid] = conf
            if detected:
                return detected, list(detected.keys()), len(encodings)
        except Exception:
            pass

    model_data = get_trained_model()
    if not model_data or not encodings:
        return detected, [], len(encodings)

    clf, x_train, y_train = model_data['clf'], model_data['x'], model_data['y']
    all_students = sorted(list(set(y_train)))

    for enc in encodings:
        pid = int(clf.predict([enc])[0]) if len(all_students) >= 2 else int(all_students[0])
        student_emb = x_train[y_train.index(pid)]
        distance = np.linalg.norm(student_emb - enc)
        
        # Euclidean distance <= threshold
        if distance <= thresh:
            conf = max(0.0, min(100.0, round((1.0 - (distance / (thresh + 0.2))) * 100, 1)))
            if pid not in detected or conf > detected[pid]:
                detected[pid] = conf

    return detected, all_students, len(encodings)

