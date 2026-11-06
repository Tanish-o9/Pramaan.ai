const BASE_URL = import.meta.env.VITE_API_URL || '';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include', // Ensure HTTP-only JWT cookies are sent & received
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    throw new Error('Network error or server unreachable. Please check connection.');
  }

  // Handle 401 Unauthorized with automatic refresh token retry
  if (response.status === 401 && !endpoint.includes('/api/auth/')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => request(endpoint, options));
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        processQueue(null);
        isRefreshing = false;
        return request(endpoint, options);
      } else {
        processQueue(new Error('Session expired'));
        isRefreshing = false;
        // Signal app to redirect to login
        window.dispatchEvent(new CustomEvent('auth:expired'));
        throw new Error('Session expired. Please log in again.');
      }
    } catch (refreshErr) {
      processQueue(refreshErr);
      isRefreshing = false;
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw refreshErr;
    }
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const err = await response.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  teacherLogin: (username, password) =>
    request('/api/auth/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),

  teacherRegister: (username, password, name) =>
    request('/api/auth/teacher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name }),
    }),

  studentPinLogin: (roll_number, pin) =>
    request('/api/auth/student/login-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roll_number, pin }),
    }),

  studentFaceLogin: (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'face_capture.jpg');
    return request('/api/auth/student/login-face', {
      method: 'POST',
      body: formData,
    });
  },

  studentRegister: (formData) =>
    request('/api/auth/student/register', {
      method: 'POST',
      body: formData,
    }),

  authRefresh: () =>
    request('/api/auth/refresh', {
      method: 'POST',
    }),

  authLogout: () =>
    request('/api/auth/logout', {
      method: 'POST',
    }),

  authMe: () =>
    request('/api/auth/me'),

  // Student specific
  studentVoiceEnroll: (audioBlob) => {
    const fd = new FormData();
    fd.append('file', audioBlob, 'voice_sample.wav');
    return request('/api/student/voice-enroll', {
      method: 'POST',
      body: fd,
    });
  },

  studentChangePin: (old_pin, new_pin) =>
    request('/api/student/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_pin, new_pin }),
    }),

  getStudentDashboard: (student_id) =>
    request(`/api/student/dashboard/${student_id}`),

  enrollStudent: (student_id, subject_code) =>
    request('/api/student/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, subject_code }),
    }),

  unenrollStudent: (student_id, subject_id) =>
    request('/api/student/unenroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, subject_id }),
    }),

  // Teacher specific
  getSubjects: () =>
    request('/api/teacher/subjects'),

  createSubject: (subject_code, name, section) =>
    request('/api/teacher/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_code, name, section }),
    }),

  deleteSubject: (subject_id) =>
    request(`/api/teacher/subjects/${subject_id}`, {
      method: 'DELETE',
    }),

  getSubjectStudents: (subject_id) =>
    request(`/api/teacher/subjects/${subject_id}/students`),

  teacherStudentFaceUpload: (student_id, photoFile) => {
    const fd = new FormData();
    fd.append('student_id', student_id);
    fd.append('photo', photoFile);
    return request('/api/teacher/student-face-upload', {
      method: 'POST',
      body: fd,
    });
  },

  getDynamicCode: (subject_code) =>
    request(`/api/subject/dynamic-code/${encodeURIComponent(subject_code)}`),

  // Attendance AI
  analyzePhotos: (subject_id, files) => {
    const fd = new FormData();
    fd.append('subject_id', subject_id);
    files.forEach((f) => fd.append('files', f));
    return request('/api/attendance/analyze-photos', {
      method: 'POST',
      body: fd,
    });
  },

  analyzeVideo: (subject_id, videoFile) => {
    const fd = new FormData();
    fd.append('subject_id', subject_id);
    fd.append('file', videoFile);
    return request('/api/attendance/analyze-video', {
      method: 'POST',
      body: fd,
    });
  },

  analyzeVoice: (subject_id, audioBlob) => {
    const fd = new FormData();
    fd.append('subject_id', subject_id);
    fd.append('file', audioBlob, 'recording.wav');
    return request('/api/attendance/analyze-voice', {
      method: 'POST',
      body: fd,
    });
  },

  saveAttendanceLogs: (logs) =>
    request('/api/attendance/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs }),
    }),

  getRecords: (subject_id) =>
    request(`/api/attendance/records/${subject_id}`),

  overrideAttendance: (log_id, is_present) =>
    request('/api/attendance/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id, is_present }),
    }),

  // System Settings
  getSettings: () =>
    request('/api/settings'),

  updateSettings: (settings) =>
    request('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }),

  getTrustSettings: () =>
    request('/api/settings/trust-score'),

  updateTrustSettings: (data) =>
    request('/api/settings/trust-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Advanced Analytics & Risk Prediction
  getRiskAnalytics: (subject_id) =>
    request(subject_id ? `/api/analytics/risk?subject_id=${subject_id}` : '/api/analytics/risk'),

  getAnomalies: (subject_id) =>
    request(`/api/analytics/anomalies?subject_id=${subject_id}`),

  // Pramaan AI Copilot
  sendCopilotMessage: (message, subject_id = null) =>
    request('/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, subject_id }),
    }),

  // Classroom Kiosk & Live Camera Terminal
  getKioskSubjects: () =>
    request('/api/kiosk/subjects'),

  kioskQuickEnroll: (student_id, fileBlob) => {
    const fd = new FormData();
    fd.append('student_id', student_id);
    fd.append('file', fileBlob, 'webcam_enroll.jpg');
    return request('/api/kiosk/quick-enroll', {
      method: 'POST',
      body: fd,
    });
  },

  kioskClassroomScan: (subject_id, fileBlob) => {
    const fd = new FormData();
    fd.append('subject_id', subject_id);
    fd.append('file', fileBlob, 'classroom_scan.jpg');
    return request('/api/kiosk/classroom-scan', {
      method: 'POST',
      body: fd,
    });
  },

  verifyKioskFace: (subject_id, fileBlob) => {
    const fd = new FormData();
    fd.append('subject_id', subject_id);
    fd.append('file', fileBlob, 'kiosk_frame.jpg');
    return request('/api/kiosk/verify', {
      method: 'POST',
      body: fd,
    });
  },

  // Medical Leave & OD Workflow
  applyLeave: (leaveData) =>
    request('/api/leaves/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leaveData),
    }),

  getStudentLeaves: () =>
    request('/api/leaves/student'),

  getTeacherLeaves: () =>
    request('/api/leaves/teacher'),

  reviewLeave: (leave_id, status, remarks = '') =>
    request(`/api/leaves/${leave_id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, remarks }),
    }),

  // Dynamic Digital Student ID
  getDigitalId: () =>
    request('/api/student/digital-id'),

  verifyDigitalId: (token) =>
    request('/api/verify-digital-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }),

  // Voice Command Roll-Call
  processVoiceCommand: (subject_id, transcript) =>
    request('/api/attendance/voice-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id, transcript }),
    }),

  // Mid-Class Random Pulse Check
  triggerPulseCheck: (subject_id, sample_size = 3) =>
    request('/api/pulse-check/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id, sample_size }),
    }),

  getActivePulse: () =>
    request('/api/pulse-check/active'),

  respondToPulse: (pulse_id, is_verified, remarks = '') =>
    request('/api/pulse-check/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pulse_id, is_verified, remarks }),
    }),

  getPulseStatus: (pulse_id) =>
    request(`/api/pulse-check/status/${pulse_id}`),

  getPulseHistory: (subject_id) =>
    request(`/api/pulse-check/history/${subject_id}`),

  // Classroom Seat Map
  getSeatmap: (subject_id) =>
    request(`/api/subjects/${subject_id}/seatmap`),

  autoArrangeSeatmap: (subject_id, order_by = 'roll') =>
    request(`/api/subjects/${subject_id}/seatmap/auto-arrange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_by }),
    }),

  // HoD Governance & Defaulters
  getHodAnalytics: () =>
    request('/api/hod/analytics'),

  getHodDefaultersNoticeUrl: () =>
    `${BASE_URL}/api/hod/defaulters-notice`,

  // Group / Class Photo Attendance
  takeGroupPhotoAttendance: (subject_id, fileBlob) => {
    const fd = new FormData();
    fd.append('subject_id', subject_id);
    fd.append('photo', fileBlob, 'group_class_photo.jpg');
    return request('/api/take-attendance/group-photo', {
      method: 'POST',
      body: fd,
    });
  },
};
