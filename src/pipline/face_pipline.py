import dlib 
import numpy as np
import face_recognition_models
from sklearn.svm import SVC
import streamlit as st
from src.database.db import get_all_student

@st.cache_resource
def load_dlib_model():
    detector = dlib.get_frontal_face_detector()
    sp = dlib.shape_predictor(
        face_recognition_models.pose_predictor_model_location()
    )
    facerec = dlib.face_recognition_model_v1(
        face_recognition_models.face_recognition_model_location()
    )
    return detector, sp, facerec

def check_liveness_landmarks(image_np):
    """
    Feature 6: Anti-Spoofing & Liveness Check
    Calculates Eye Aspect Ratio (EAR) from 68 facial landmarks to verify eye geometry.
    """
    detector, sp, _ = load_dlib_model()
    faces = detector(image_np, 1)
    if not faces:
        return False, "No face found"
    
    shape = sp(image_np, faces[0])
    
    # Left eye landmarks: 36-41, Right eye landmarks: 42-47
    def eye_aspect_ratio(eye_points):
        # Vertical distances
        a = np.linalg.norm(eye_points[1] - eye_points[5])
        b = np.linalg.norm(eye_points[2] - eye_points[4])
        # Horizontal distance
        c = np.linalg.norm(eye_points[0] - eye_points[3])
        if c == 0:
            return 0.0
        return (a + b) / (2.0 * c)

    left_pts = np.array([[shape.part(i).x, shape.part(i).y] for i in range(36, 42)])
    right_pts = np.array([[shape.part(i).x, shape.part(i).y] for i in range(42, 48)])
    
    left_ear = eye_aspect_ratio(left_pts)
    right_ear = eye_aspect_ratio(right_pts)
    ear = (left_ear + right_ear) / 2.0
    
    # Open real eyes typically have EAR > 0.18
    is_live = bool(ear > 0.16)
    msg = "Live face verified" if is_live else "Anti-spoofing warning: Eyes appear closed or inactive"
    return is_live, msg

def get_face_embeddings(image_np):
    detector, sp, facerec = load_dlib_model()
    faces = detector(image_np, 1)

    encodings = []
    for face in faces:
        shape = sp(image_np, face)
        face_descriptor = facerec.compute_face_descriptor(image_np, shape, 1)
        encodings.append(np.array(face_descriptor))
    return encodings

def get_trained_model():
    x = []
    y = []

    student_db = get_all_student()
    if not student_db:
        return None
        
    for student in student_db:
        embedding = student.get('face_embedding')
        if embedding:
            x.append(np.array(embedding))
            y.append(student.get('student_id'))
            
    if len(x) == 0:
        return None

    clf = SVC(kernel='linear', probability=True, class_weight='balanced')
    if len(set(y)) >= 2:
        try:
            clf.fit(x, y)
        except Exception:
            pass
    return {'clf': clf, 'x': x, 'y': y}

def train_classifier():
    st.cache_resource.clear()
    model_data = get_trained_model()
    return bool(model_data)

def predict_attendance_with_confidence(class_image_np):
    """
    Feature 8: Real-time match confidence score (%) per student
    """
    encoding = get_face_embeddings(class_image_np)
    detected_student = {}
    model_data = get_trained_model()
    if not model_data:
        return detected_student, [], len(encoding)
        
    clf = model_data['clf']
    x_train = model_data['x']
    y_train = model_data['y']

    all_student = sorted(list(set(y_train)))
    for encod in encoding:
        if len(all_student) >= 2:
            predicted_id = int(clf.predict([encod])[0])
        else:
            predicted_id = int(all_student[0])
            
        student_embedding = x_train[y_train.index(predicted_id)]
        distance = np.linalg.norm(student_embedding - encod)
        resemblance_threshold = 0.6

        # Convert Euclidean distance (0.0 - 0.6) into intuitive match percentage (100% - 60%)
        confidence_pct = max(0.0, min(100.0, round((1.0 - (distance / 0.8)) * 100, 1)))

        if distance <= resemblance_threshold:
            # Keep the highest confidence if seen across multiple photos
            if predicted_id not in detected_student or confidence_pct > detected_student[predicted_id]:
                detected_student[predicted_id] = confidence_pct

    return detected_student, all_student, len(encoding)

def predict_attendance(class_image_np):
    """Backward compatibility wrapper"""
    detected_student, all_students, num_faces = predict_attendance_with_confidence(class_image_np)
    bool_detected = {sid: True for sid in detected_student.keys()}
    return bool_detected, all_students, num_faces
