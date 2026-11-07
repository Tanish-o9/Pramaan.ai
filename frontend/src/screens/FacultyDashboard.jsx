import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api';
import { toast } from '../components/Toast';
import QRCode from 'qrcode';
import KioskScreen from './KioskScreen';
import CopilotDrawer from '../components/CopilotDrawer';
import { AKGEC_META, AKGEC_PERIODS, AKGEC_WEEKLY_SCHEDULE, DEFAULT_AKGEC_SUBJECTS, getCurrentLectureSlot } from '../akgecTimetable';
import {
  Camera,
  Video,
  Mic,
  CheckSquare,
  Plus,
  Share2,
  Trash2,
  Download,
  Copy,
  Clock,
  X,
  RefreshCw,
  AlertCircle,
  Sliders,
  Upload,
  UserCheck,
  Users,
  ShieldCheck,
  ShieldAlert,
  Info,
  ArrowUpDown,
  ArrowRight,
  CheckCircle2,
  Loader2,
  FileText,
  AlertTriangle,
  Flame,
  Check,
  XCircle,
  LayoutGrid,
  Zap,
  Printer,
  Sparkles,
  Volume2,
  Search,
  MessageSquare,
  Send,
  ExternalLink,
  Eye,
  Flag,
  Smartphone,
  Repeat,
  Layers,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Lock,
  Globe
} from 'lucide-react';

export default function FacultyDashboard({ teacher }) {
  const [tab, setTab] = useState('attendance'); // 'attendance' | 'analytics' | 'leaves' | 'subjects' | 'logs' | 'settings'
  const [subjects, setSubjects] = useState(() => DEFAULT_AKGEC_SUBJECTS);
  const [selectedSubId, setSelectedSubId] = useState('1');
  const [selectedSection, setSelectedSection] = useState('CSE(AIML-2)');
  const [scopeFilter, setScopeFilter] = useState('my'); // Default: 'my' (Strictly faculty's assigned classes)
  const [loading, setLoading] = useState(false);
  const subjectSliderRef = useRef(null);

  const scrollSubjectSlider = (direction) => {
    if (subjectSliderRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      subjectSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Sections where this faculty actually has assigned classes
  const myAssignedSections = useMemo(() => {
    const secs = new Set(subjects.filter((s) => s.is_my_assigned && s.section && s.section !== 'ALL').map((s) => s.section));
    return Array.from(secs);
  }, [subjects]);

  // Pre-configured sections list across department (matches section slider ordering)
  const availableSections = useMemo(() => {
    const defaultSecs = [
      'CSE(AIML-2)',
      'CSE(AIML-1)',
      'CSE(DS-1)',
      'CSE(DS-2)',
      'CSE-1',
      'CSE-2',
      'CSE-3',
      'CSE(AIML-3)',
      'IT-1',
      'IT-2',
      'CS-1',
      'CS-2',
    ];
    const found = new Set(defaultSecs);
    subjects.forEach((s) => {
      if (s.section && s.section !== 'ALL') found.add(s.section);
    });
    return Array.from(found);
  }, [subjects]);

  // Auto-select faculty's assigned section on initial load or subject update
  useEffect(() => {
    const mySub = subjects.find((s) => s.is_my_assigned && s.section && s.section !== 'ALL');
    if (mySub) {
      setSelectedSection((prevSec) => {
        if (prevSec === 'ALL') return prevSec;
        const hasMyClass = subjects.some((s) => s.section === prevSec && s.is_my_assigned);
        return hasMyClass ? prevSec : mySub.section;
      });
      setSelectedSubId((prevId) => {
        const currentSub = subjects.find((s) => String(s.subject_id) === String(prevId));
        return currentSub?.is_my_assigned ? prevId : String(mySub.subject_id);
      });
    }
  }, [subjects]);

  // Derived filtered subjects strictly for selectedSection
  const visibleSubjects = useMemo(() => {
    const sectionSubs = (selectedSection === 'ALL')
      ? subjects
      : subjects.filter((s) => s.section === selectedSection);
    if (scopeFilter === 'my') {
      return sectionSubs.filter((s) => s.is_my_assigned);
    }
    return sectionSubs;
  }, [subjects, selectedSection, scopeFilter]);

  // Currently active subject object and strict authorization check
  const activeSubject = useMemo(() => {
    return subjects.find((s) => String(s.subject_id) === String(selectedSubId));
  }, [subjects, selectedSubId]);

  const isCurrentSubjectAuthorized = Boolean(activeSubject?.is_my_assigned);

  // Keep selectedSubId valid whenever selectedSection or visibleSubjects changes
  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => String(s.subject_id) === String(selectedSubId))) {
      setSelectedSubId(String(visibleSubjects[0].subject_id));
    }
  }, [visibleSubjects, selectedSubId]);

  // Classroom Kiosk Mode state
  const [kioskSubject, setKioskSubject] = useState(null);

  // ML Risk Prediction & Anomaly Radar state
  const [riskStudents, setRiskStudents] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loadingRisk, setLoadingRisk] = useState(false);

  // Medical Leave & OD Approvals state
  const [teacherLeaves, setTeacherLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState({});

  // Attendance Mode
  const [mode, setMode] = useState('live_camera'); // 'live_camera' | 'photos' | 'group_photo' | 'voice_command' | 'video' | 'voice' | 'manual'
  const [photoFiles, setPhotoFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [voiceFile, setVoiceFile] = useState(null);
  const [manualList, setManualList] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [review, setReview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sortByLowestTrust, setSortByLowestTrust] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Group / Mobile Live Classroom Photo Mode State
  const [groupPhotoFile, setGroupPhotoFile] = useState(null);
  const [groupScanResult, setGroupScanResult] = useState(null);
  const [mobileCamActive, setMobileCamActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [sessionAccumulated, setSessionAccumulated] = useState([]);
  const [scansCount, setScansCount] = useState(0);
  const mobileVideoRef = useRef(null);
  const mobileStreamRef = useRef(null);

  // Voice Command Roll-Call State
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceCommandSummary, setVoiceCommandSummary] = useState('');

  // Mid-Class Pulse Check State
  const [showPulseModal, setShowPulseModal] = useState(false);
  const [pulseSampleSize, setPulseSampleSize] = useState(3);
  const [activePulseSession, setActivePulseSession] = useState(null);
  const [pulseTriggering, setPulseTriggering] = useState(false);
  const [pulseCountdown, setPulseCountdown] = useState(0);

  // Classroom Seat Map State
  const [seatmapData, setSeatmapData] = useState(null);
  const [loadingSeatmap, setLoadingSeatmap] = useState(false);
  const [seatmapOrderBy, setSeatmapOrderBy] = useState('roll');

  // HoD Analytics State
  const [hodSummary, setHodSummary] = useState(null);
  const [loadingHod, setLoadingHod] = useState(false);

  // Enrolled Students modal / drawer in Subjects tab
  const [viewStudentsSub, setViewStudentsSub] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [uploadingStudentId, setUploadingStudentId] = useState(null);

  // Subject Modal
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSec, setNewSec] = useState('A');

  // Share Modal
  const [shareSub, setShareSub] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [dynamicCode, setDynamicCode] = useState('');
  const [dynamicSecs, setDynamicSecs] = useState(0);

  // Mobile Phone Connect QR Modal State
  const [showPhoneQrModal, setShowPhoneQrModal] = useState(false);
  const [mobileUrl, setMobileUrl] = useState('');
  const [mobileQrDataUrl, setMobileQrDataUrl] = useState('');

  const handleOpenPhoneQr = async () => {
    try {
      const net = await api.getNetworkIp();
      const url = net?.mobile_url || `http://${window.location.hostname}:5173`;
      setMobileUrl(url);
      const qr = await QRCode.toDataURL(url, { width: 260, margin: 2 });
      setMobileQrDataUrl(qr);
      setShowPhoneQrModal(true);
    } catch {
      const fallbackUrl = `http://${window.location.hostname}:5173`;
      setMobileUrl(fallbackUrl);
      const qr = await QRCode.toDataURL(fallbackUrl, { width: 260, margin: 2 });
      setMobileQrDataUrl(qr);
      setShowPhoneQrModal(true);
    }
  };

  // Official AKGEC Timetable Periods (Period 1 to Period 9)
  const COLLEGE_PERIODS = AKGEC_PERIODS;

  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const slot = getCurrentLectureSlot();
    return slot?.period?.id || 1;
  });
  const [selectedTimetableDay, setSelectedTimetableDay] = useState(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cur = dayNames[new Date().getDay()];
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(cur) ? cur : 'Mon';
  });

  // Forensic Logs & Multi-Lecture Audit State
  const [records, setRecords] = useState([]);
  const [sessionTime, setSessionTime] = useState('');
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'late' | 'proxy'
  const [selectedDossierStudent, setSelectedDossierStudent] = useState(null);

  // AI & Quality Settings
  const [settings, setSettings] = useState({
    face_match_threshold: 0.60,
    liveness_ear_threshold: 0.16,
    liveness_enabled: true
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSubjects = async () => {
    try {
      let res = await api.getSubjects();
      if (!res || res.length === 0) {
        res = await api.getKioskSubjects();
      }
      setSubjects(res || []);
      if (res && res.length > 0) {
        const mySub = res.find((s) => s.is_my_assigned);
        if (mySub) {
          setSelectedSection((prevSec) => {
            const hasMyClass = res.some((s) => s.section === prevSec && s.is_my_assigned);
            return hasMyClass ? prevSec : mySub.section;
          });
          setSelectedSubId((prev) => {
            const currentIsMine = res.some((s) => String(s.subject_id) === String(prev) && s.is_my_assigned);
            return currentIsMine ? prev : String(mySub.subject_id);
          });
        } else {
          setSelectedSubId((prev) => {
            if (prev && res.some((s) => String(s.subject_id) === String(prev))) {
              return prev;
            }
            return String(res[0].subject_id);
          });
        }
      }
    } catch (err) {
      console.error("loadSubjects error:", err);
      try {
        const kioskSubs = await api.getKioskSubjects();
        if (kioskSubs && kioskSubs.length > 0) {
          setSubjects(kioskSubs);
          setSelectedSubId(String(kioskSubs[0].subject_id));
        }
      } catch { }
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadRiskAnalytics = async (subId) => {
    const id = subId || selectedSubId;
    if (!id) return;
    setLoadingRisk(true);
    try {
      const [riskRes, anomRes] = await Promise.all([
        api.getRiskAnalytics(id),
        api.getAnomalies(id)
      ]);
      setRiskStudents(riskRes.students || []);
      setAnomalies(anomRes.anomalies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRisk(false);
    }
  };

  const loadTeacherLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await api.getTeacherLeaves();
      setTeacherLeaves(res.leaves || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleReviewLeave = async (leaveId, status) => {
    const remarks = reviewRemarks[leaveId] || (status === 'approved' ? 'Approved by faculty' : 'Declined');
    try {
      await api.reviewLeave(leaveId, status, remarks);
      toast(`Leave request marked as ${status}!`, 'success');
      loadTeacherLeaves();
    } catch (err) {
      toast(err.message || 'Failed to review leave', 'error');
    }
  };

  useEffect(() => {
    loadSubjects();
    loadSettings();
    loadTeacherLeaves();
  }, [teacher?.teachers_id]);

  useEffect(() => {
    if (selectedSubId && tab === 'analytics') {
      loadRiskAnalytics(selectedSubId);
    }
  }, [selectedSubId, tab]);

  // Load manual student list
  useEffect(() => {
    if (selectedSubId && mode === 'manual') {
      api.getSubjectStudents(selectedSubId).then((data) => {
        setManualList((data || []).map((s) => ({
          student_id: s.student_id,
          name: s.name,
          roll_number: s.roll_number || '-',
          is_present: true
        })));
      });
    }
  }, [selectedSubId, mode]);

  // Load logs
  useEffect(() => {
    if (selectedSubId && tab === 'logs') {
      api.getRecords(selectedSubId).then((res) => {
        const list = res.records || [];
        setRecords(list);
        if (list.length > 0) {
          const times = [...new Set(list.map((r) => r.timestamp))].sort().reverse();
          setSessionTime(times[0]);
        }
      });
    }
  }, [selectedSubId, tab]);

  // Share Modal setup
  const openShare = async (sub) => {
    setShareSub(sub);
    const joinUrl = `${window.location.origin}/?join-code=${sub.subject_code}`;
    const url = await QRCode.toDataURL(joinUrl, { width: 220, margin: 1 });
    setQrUrl(url);
    const dyn = await api.getDynamicCode(sub.subject_code);
    setDynamicCode(dyn.code);
    setDynamicSecs(dyn.remaining_seconds);
  };

  useEffect(() => {
    if (shareSub && dynamicSecs > 0) {
      const t = setInterval(() => setDynamicSecs((s) => Math.max(0, s - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [shareSub, dynamicSecs]);

  // View enrolled students
  const handleOpenStudents = async (sub) => {
    setViewStudentsSub(sub);
    try {
      const list = await api.getSubjectStudents(sub.subject_id);
      setEnrolledStudents(list || []);
    } catch (err) {
      toast('Failed to load students roster', 'error');
    }
  };

  const handleStudentPhotoUpload = async (studentId, file) => {
    if (!file) return;
    setUploadingStudentId(studentId);
    try {
      await api.teacherStudentFaceUpload(studentId, file);
      toast('Student face reference photo uploaded and enrolled successfully!', 'success');
      // Refresh list
      const list = await api.getSubjectStudents(viewStudentsSub.subject_id);
      setEnrolledStudents(list || []);
    } catch (err) {
      toast(err.message || 'Photo upload failed', 'error');
    } finally {
      setUploadingStudentId(null);
    }
  };

  // Run AI Scan
  const handleScan = async () => {
    if (!isCurrentSubjectAuthorized) {
      toast(`🔒 Access Denied: Aap sirf apni assigned class ki attendance le sakte hain (${teacher?.name || 'Faculty'}).`, 'error');
      return;
    }
    let subId = selectedSubId;
    if (!subId && subjects.length > 0) {
      subId = String(subjects[0].subject_id);
      setSelectedSubId(subId);
    }
    if (!subId) {
      toast("Please select an active Class from the dropdown first!", "warning");
      return;
    }
    setScanning(true);
    try {
      let res;
      if (mode === 'photos') {
        if (!photoFiles.length) throw new Error('Select at least one classroom photo');
        res = await api.analyzePhotos(subId, photoFiles);
      } else if (mode === 'video') {
        if (!videoFile) throw new Error('Select a classroom video file');
        res = await api.analyzeVideo(subId, videoFile);
      } else if (mode === 'voice') {
        if (!voiceFile) throw new Error('Select a classroom audio file');
        res = await api.analyzeVoice(subId, voiceFile);
      }
      setReview(res.results || []);
      const presentCount = (res.results || []).filter(r => r.is_present).length;
      toast(`AI Scan complete: ${presentCount} students identified present!`, 'success');
    } catch (err) {
      toast(err.message || 'Scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  // Save session
  const handleSave = async () => {
    if (!isCurrentSubjectAuthorized) {
      toast(`🔒 Access Denied: Aap sirf apni assigned class ki attendance commit kar sakte hain (${teacher?.name || 'Faculty'}).`, 'error');
      return;
    }
    const list = mode === 'manual' ? manualList : review;
    if (!list) return;
    setSaving(true);
    try {
      await api.saveAttendanceLogs(list.map((item) => ({
        subject_id: parseInt(selectedSubId),
        student_id: item.student_id,
        is_present: item.is_present
      })));
      toast('Attendance logs successfully committed to database!', 'success');
      setReview(null);
      setPhotoFiles([]);
      setVideoFile(null);
      setVoiceFile(null);
      loadSubjects();
    } catch (err) {
      toast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Voice Command Web Speech & API
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast('Speech recognition not supported in browser. Please type command.', 'info');
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = 'en-IN';
    recog.continuous = false;
    recog.interimResults = false;
    recog.onstart = () => setIsListening(true);
    recog.onend = () => setIsListening(false);
    recog.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      executeVoiceCommand(transcript);
    };
    recog.onerror = (e) => {
      setIsListening(false);
      toast('Speech recognition error: ' + (e.error || 'Check microphone permission'), 'error');
    };
    recog.start();
  };

  const executeVoiceCommand = async (transcriptText) => {
    if (!transcriptText || !selectedSubId) return;
    if (!isCurrentSubjectAuthorized) {
      toast(`🔒 Access Denied: Voice roll-call sirf assigned faculty run kar sakti hai (${teacher?.name || 'Faculty'}).`, 'error');
      return;
    }
    setScanning(true);
    try {
      const res = await api.processVoiceCommand(Number(selectedSubId), transcriptText);
      setVoiceCommandSummary(res.summary);
      const presentIds = new Set(res.present_students.map((s) => s.student_id));
      const enrolled = await api.getSubjectStudents(Number(selectedSubId));
      const newReview = (enrolled || []).map((st) => {
        const isPresent = presentIds.has(st.student_id);
        return {
          student_id: st.student_id,
          name: st.name,
          roll_number: st.roll_number,
          is_present: isPresent,
          confidence: isPresent ? 98.0 : 0.0,
          trust_score: isPresent ? 95 : 0,
          verification_status: isPresent ? 'auto_accepted' : 'flagged',
          trust_breakdown: {
            method: 'voice_command_ai',
            transcript: transcriptText,
            is_present: isPresent
          }
        };
      });
      setReview(newReview);
      toast(`Voice roll-call: ${res.present_count} present, ${res.absent_count} absent`, 'success');
    } catch (err) {
      toast(err.message || 'Voice command parsing failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  // Mobile & Live Classroom Camera Management
  const startMobileCamera = async (overrideFacing = facingMode) => {
    try {
      if (mobileStreamRef.current) {
        mobileStreamRef.current.getTracks().forEach((t) => t.stop());
        mobileStreamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: overrideFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      mobileStreamRef.current = stream;
      if (mobileVideoRef.current) {
        mobileVideoRef.current.srcObject = stream;
        mobileVideoRef.current.play().catch(() => { });
      }
      setMobileCamActive(true);
    } catch (err) {
      console.warn("Mobile camera getUserMedia error:", err);
      setMobileCamActive(false);
      toast("Live viewfinder unavailable. Tap 'Open Phone Camera App' to use native device camera.", "info");
    }
  };

  const stopMobileCamera = () => {
    if (mobileStreamRef.current) {
      mobileStreamRef.current.getTracks().forEach((t) => t.stop());
      mobileStreamRef.current = null;
    }
    setMobileCamActive(false);
  };

  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (mobileCamActive) {
      await startMobileCamera(nextMode);
    }
  };

  useEffect(() => {
    return () => {
      if (mobileStreamRef.current) {
        mobileStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (mode === 'group_photo' && !mobileCamActive) {
      startMobileCamera();
    } else if (mode !== 'group_photo' && mobileCamActive) {
      stopMobileCamera();
    }
  }, [mode]);

  // Unified Classroom / Mobile Photo Processor
  const processGroupPhotoFile = async (file) => {
    if (!file || !selectedSubId) {
      toast("Please select an active subject first", "warning");
      return;
    }
    if (!isCurrentSubjectAuthorized) {
      toast(`🔒 Access Denied: Phone cam attendance sirf assigned faculty run kar sakti hai (${teacher?.name || 'Faculty'}).`, 'error');
      return;
    }
    setScanning(true);
    try {
      const res = await api.takeGroupPhotoAttendance(Number(selectedSubId), file);
      setGroupScanResult(res);
      setScansCount((c) => c + 1);

      const recognizedMap = new Map((res.recognized || []).map((r) => [r.student_id, r]));
      const enrolled = await api.getSubjectStudents(Number(selectedSubId));
      const newReview = (enrolled || []).map((st) => {
        const match = recognizedMap.get(st.student_id);
        const isPresent = Boolean(match);
        return {
          student_id: st.student_id,
          name: st.name,
          roll_number: st.roll_number,
          is_present: isPresent,
          confidence: match ? match.confidence : 0.0,
          trust_score: match ? Math.min(100, Math.round(match.confidence + 10)) : 0,
          verification_status: match ? 'auto_accepted' : 'flagged',
          trust_breakdown: {
            method: 'faculty_mobile_camera',
            bounding_box: match ? match.bounding_box : null,
            distance: match ? match.distance : null,
            source: 'Faculty Phone Live Camera'
          }
        };
      });
      setReview(newReview);

      setSessionAccumulated((prev) => {
        const existingIds = new Set(prev.map((s) => s.student_id));
        const additions = (res.recognized || []).filter((r) => !existingIds.has(r.student_id));
        return [...prev, ...additions];
      });

      const newlyCount = res.newly_marked_count ?? res.recognized_count ?? 0;
      const totalToday = res.total_marked_today ?? (res.recognized || []).length;
      toast(`🎉 Attendance auto-marked! ${newlyCount} new students saved to DB (${totalToday} present today).`, 'success');

      // Refresh records immediately in background
      api.getRecords(Number(selectedSubId)).then((rec) => {
        if (rec?.records) setRecords(rec.records);
      }).catch(() => { });
    } catch (err) {
      toast(err.message || 'Group photo scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  // 1-Tap Shutter: Capture high-res frame from video stream & auto-mark attendance
  const captureLiveShutter = async () => {
    if (!mobileVideoRef.current || !selectedSubId) {
      toast("Please select an active subject first", "warning");
      return;
    }
    const video = mobileVideoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      toast("Live camera stream is starting, please wait a moment", "info");
      return;
    }

    try {
      setScanning(true);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error("Could not capture frame from live camera");

      setCapturedPreview(canvas.toDataURL('image/jpeg', 0.8));

      // Shutter audio chime & haptic feedback
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } catch { }

      if (navigator.vibrate) {
        navigator.vibrate([60, 40, 100]);
      }

      const file = new File([blob], `live_classroom_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await processGroupPhotoFile(file);
    } catch (err) {
      toast(err.message || "Failed to capture live photo", "error");
    } finally {
      setScanning(false);
    }
  };

  const handleGroupPhotoScan = async () => {
    if (groupPhotoFile) {
      await processGroupPhotoFile(groupPhotoFile);
    }
  };

  // Trigger Mid-Class Pulse Check
  const handleTriggerPulse = async () => {
    if (!selectedSubId) return;
    if (!isCurrentSubjectAuthorized) {
      toast(`🔒 Access Denied: Pulse check sirf assigned faculty trigger kar sakti hai (${teacher?.name || 'Faculty'}).`, 'error');
      return;
    }
    setPulseTriggering(true);
    try {
      const res = await api.triggerPulseCheck(Number(selectedSubId), pulseSampleSize);
      setActivePulseSession(res);
      setPulseCountdown(res.duration_sec || 120);
      toast(`⚡ Mid-class pulse check triggered for ${res.selected_count} students!`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to trigger pulse check', 'error');
    } finally {
      setPulseTriggering(false);
    }
  };

  // Pulse session countdown interval
  useEffect(() => {
    if (!activePulseSession || pulseCountdown <= 0) return;
    const interval = setInterval(() => {
      setPulseCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activePulseSession, pulseCountdown]);

  // Load Seat Map
  const loadSeatmap = async () => {
    if (!selectedSubId) return;
    setLoadingSeatmap(true);
    try {
      const res = await api.getSeatmap(Number(selectedSubId));
      setSeatmapData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSeatmap(false);
    }
  };

  const handleAutoArrangeSeatmap = async (orderBy) => {
    if (!selectedSubId) return;
    try {
      const res = await api.autoArrangeSeatmap(Number(selectedSubId), orderBy);
      setSeatmapData(res);
      toast(`Seating auto-arranged by ${orderBy === 'roll' ? 'Roll Number' : 'Name'}!`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to auto-arrange', 'error');
    }
  };

  // Load HoD Analytics
  const loadHodAnalytics = async () => {
    setLoadingHod(true);
    try {
      const res = await api.getHodAnalytics();
      setHodSummary(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHod(false);
    }
  };

  useEffect(() => {
    if (tab === 'seatmap') {
      loadSeatmap();
    } else if (tab === 'analytics') {
      loadHodAnalytics();
    }
  }, [tab, selectedSubId]);

  // Save AI Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.updateSettings(settings);
      if (settings.trust_score) {
        await api.updateTrustSettings(settings.trust_score);
      }
      setSettings(res.settings);
      toast('System & Trust Score parameters updated!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Override single log with punctuality & proxy support
  const toggleOverride = async (logId, curr, customStatus = null) => {
    const nextPres = customStatus === 'proxy' ? false : !curr;
    const nextStatus = customStatus === 'proxy' ? 'proxy_suspect' : (nextPres ? 'manual_accepted' : 'manual_absent');
    await api.overrideAttendance(logId, nextPres, nextStatus);
    setRecords((prev) => prev.map((r) => r.id === logId ? { ...r, is_present: nextPres, verification_status: nextStatus } : r));
    toast(customStatus === 'proxy' ? 'Flagged student as PROXY SUSPECT' : 'Attendance status updated', 'info');
  };

  // Defaulter list & rich student dossiers for Logs view
  const studentTotals = {};
  records.forEach((r) => {
    const sid = r.student_id;
    if (!studentTotals[sid]) {
      studentTotals[sid] = {
        student_id: sid,
        name: r.students?.name || 'Student',
        roll: r.students?.roll_number || '-',
        total: 0,
        attended: 0,
        logs: []
      };
    }
    studentTotals[sid].total += 1;
    if (r.is_present) studentTotals[sid].attended += 1;
    studentTotals[sid].logs.push(r);
  });

  const defaulters = Object.values(studentTotals).filter((st) => st.total >= 3 && (st.attended / st.total) * 100 < 75);

  const generateGuardianAlert = (std) => {
    if (!std) return '';
    const subObj = subjects.find((s) => s.subject_id === parseInt(selectedSubId));
    const subName = subObj ? `${subObj.name} (${subObj.subject_code})` : 'Class';
    const pct = std.total > 0 ? Math.round((std.attended / std.total) * 100) : 100;
    const msg = `Dear Parent/Guardian,\n\nOfficial Academic Alert from Department of Computer Science:\nYour ward ${std.name} (Roll No: ${std.roll}) currently has ${pct}% attendance in ${subName}.\n\nAs per University Ordinance, a minimum of 75% attendance is strictly mandatory to appear for Semester End Examinations. Please ensure regular attendance.\n\n- Dr. ${teacher?.name || 'Faculty'}, Course In-Charge`;
    return encodeURIComponent(msg);
  };

  if (kioskSubject) {
    return <KioskScreen subject={kioskSubject} onExit={() => setKioskSubject(null)} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full">
      {/* Executive Faculty Hero Banner */}
      <div className="panel-card rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 p-[2px] shadow-lg shadow-cyan-500/15">
                <div className="w-full h-full rounded-[14px] bg-zinc-950 flex items-center justify-center text-lg font-bold text-white uppercase">
                  {teacher.name ? teacher.name.slice(0, 2) : 'FC'}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 border-2 border-zinc-950 flex items-center justify-center" title="Faculty Active">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{teacher.name}</h1>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Faculty Workspace
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Biometrics Governance
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-400">
                <span>{subjects.length} Active Courses Assigned</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> ResNet-128 Multi-Face Online
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">dlib 68-pt EAR Liveness Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            {selectedSubId && (
              <>
                <button
                  onClick={() => setShowPulseModal(true)}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs transition cursor-pointer active:scale-98"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Surprise Pulse Check</span>
                </button>
                <button
                  onClick={handleOpenPhoneQr}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition shadow-lg shadow-cyan-500/10 cursor-pointer active:scale-98"
                  title="Open application on phone to take live mobile attendance"
                >
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Connect Phone (QR)</span>
                </button>
                <button
                  onClick={() => {
                    const sub = subjects.find((s) => s.subject_id === Number(selectedSubId));
                    if (sub) setKioskSubject(sub);
                  }}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs transition shadow-lg shadow-emerald-500/15 cursor-pointer active:scale-98"
                >
                  <Video className="w-4 h-4" />
                  <span>Launch Door Kiosk</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 Faculty Executive Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Active Subject Sections</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-black mt-1 tracking-tight text-white flex items-baseline gap-1">
              {subjects.length}
              <span className="text-[11px] font-normal text-zinc-400">classes</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              {subjects.reduce((acc, s) => acc + (s.students_count || 0), 0)} students enrolled
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Pending Leaves / OD</span>
              <FileText className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black mt-1 tracking-tight text-amber-400 flex items-baseline gap-1">
              {teacherLeaves.filter((l) => l.status === 'pending').length}
              <span className="text-[11px] font-normal text-zinc-400">requests</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              Requires faculty verification
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Classroom Desk Layout</span>
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-black mt-1 tracking-tight text-white flex items-baseline gap-1">
              {selectedSubId ? 'Grid Ready' : 'Select Class'}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              Interactive 5x6 spatial matrix
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>AI Governance Radar</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black mt-1 tracking-tight text-emerald-400 flex items-baseline gap-1">
              100%
              <span className="text-[11px] font-normal text-zinc-400">online</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              Trust Score Engine & HoD Reports
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Linear / Enterprise Clean Tab Strip) */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#1a2538] overflow-x-auto">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0c101a] border border-[#1b2538]">
          <button
            onClick={() => setTab('attendance')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${tab === 'attendance' ? 'bg-[#182338] text-white shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#121926]'
              }`}
          >
            <Camera className="w-3.5 h-3.5 text-blue-400" />
            <span>Take Attendance</span>
          </button>

          <button
            onClick={() => setTab('seatmap')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${tab === 'seatmap' ? 'bg-[#182338] text-white shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#121926]'
              }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
            <span>Seat Map</span>
          </button>

          <button
            onClick={() => setTab('analytics')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${tab === 'analytics' ? 'bg-[#182338] text-white shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#121926]'
              }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Risk Radar</span>
          </button>

          <button
            onClick={() => setTab('leaves')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${tab === 'leaves' ? 'bg-[#182338] text-white shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#121926]'
              }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Leave Requests</span>
            {teacherLeaves.filter((l) => l.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
                {teacherLeaves.filter((l) => l.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('subjects')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${tab === 'subjects' ? 'bg-[#182338] text-white shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#121926]'
              }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Subjects & Roster</span>
          </button>

          <button
            onClick={() => setTab('logs')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${tab === 'logs' ? 'bg-[#182338] text-white shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#121926]'
              }`}
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Logbook & Export</span>
          </button>

          <button
            onClick={() => setTab('timetable')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${tab === 'timetable' ? 'bg-[#182338] text-white shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#121926]'
              }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Timetable (CL-11)</span>
          </button>

          <button
            onClick={() => setTab('settings')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${tab === 'settings' ? 'bg-[#182338] text-white shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#121926]'
              }`}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* 1. ATTENDANCE TAB */}
      {tab === 'attendance' && (
        <div className="rounded-2xl p-5 sm:p-6 bg-[#111624] border border-[#1e2a3f] shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-[#1b2538]">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" /> Class Lecture Attendance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select section, choose active subject, and record student attendance</p>
            </div>
          </div>

          {/* Section Selection First -> Then Subject Slider Studio */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0f1422] border border-[#1e2a3f] flex flex-col gap-4 mb-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#1b2538]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
                    Class Attendance Setup
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Faculty: <strong className="text-slate-200">{teacher?.name || 'Faculty'}</strong> • Select section, then choose subject lecture from slider
                  </p>
                </div>
              </div>

              {/* Quick Summary Pill */}
              <div className="px-3 py-1.5 rounded-lg bg-[#0c101a] border border-[#1b2538] text-xs font-mono text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Sec: <strong className="text-blue-400">{selectedSection}</strong></span>
                <span>•</span>
                <span>Sub: <strong className="text-emerald-400">{visibleSubjects.find((s) => String(s.subject_id) === String(selectedSubId))?.subject_code || 'Select'}</strong></span>
              </div>
            </div>

            {/* ================= 1. SECTION SELECT SLIDER ================= */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-[#0b0f19] border border-[#1a2335]">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-xs font-medium text-slate-400 shrink-0 whitespace-nowrap pl-1 pr-1.5">
                  Select Section:
                </span>

                {/* All Sections Pill */}
                <button
                  type="button"
                  onClick={() => setSelectedSection('ALL')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    selectedSection === 'ALL'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'bg-[#121927] text-slate-300 hover:text-white hover:bg-[#1a2336] border border-[#1c273a]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>All Sections</span>
                </button>

                {/* Individual Section Pills */}
                {availableSections.map((sec) => {
                  const isSelected = selectedSection === sec;
                  const isAssigned = myAssignedSections.includes(sec);
                  const label = sec === 'CSE(AIML-2)' ? 'CSE(AIML-2) • CL-11' : sec;

                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSelectedSection(sec)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'bg-[#121927] text-slate-300 hover:text-white hover:bg-[#1a2336] border border-[#1c273a]'
                      }`}
                    >
                      <span>{label}</span>
                      {isAssigned && (
                        <span
                          title="Your assigned teaching section"
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ================= 2. SUBJECT SELECT KARNE KA SLIDER ================= */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1a2335] flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-[#162030]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      Subject Lecture
                      <span className="text-blue-400 font-mono normal-case">({selectedSection})</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">Select lecture card from slider to load attendance register</p>
                  </div>
                </div>

                {/* Scope Filter + Arrow Scroll Controls */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0f1422] border border-[#1c273a] text-xs">
                    <button
                      type="button"
                      onClick={() => setScopeFilter('my')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer text-[11px] ${scopeFilter === 'my'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      My Classes ({subjects.filter((s) => s.section === selectedSection && s.is_my_assigned).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeFilter('all')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer text-[11px] ${scopeFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      All ({subjects.filter((s) => s.section === selectedSection).length})
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollSubjectSlider('left')}
                      className="w-7 h-7 rounded-md bg-[#121927] hover:bg-[#1a2336] border border-[#1c273a] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shadow-sm"
                      title="Slide Left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollSubjectSlider('right')}
                      className="w-7 h-7 rounded-md bg-[#121927] hover:bg-[#1a2336] border border-[#1c273a] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shadow-sm"
                      title="Slide Right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Timetable Slot for CSE(AIML-2) */}
              {selectedSection === 'CSE(AIML-2)' && (() => {
                const currentSlot = getCurrentLectureSlot();
                return (
                  <div className="p-3 rounded-lg bg-[#0e1524] border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" /> TIMETABLE (CSE AIML-2 • Room CL-11)
                      </span>
                      <span className="text-slate-300 font-medium">
                        {currentSlot.day} • {currentSlot.period?.name} ({currentSlot.period?.slot}):
                      </span>
                      <strong className="text-white">
                        {currentSlot.lecture?.code || 'Free'} • {currentSlot.lecture?.subject || 'Break/Prep'}
                      </strong>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({currentSlot.lecture?.faculty || 'No Faculty'} • {currentSlot.lecture?.venue || 'CL-11'})
                      </span>
                    </div>

                    {currentSlot.lecture?.code && currentSlot.lecture?.code !== 'BREAK' && (
                      <button
                        type="button"
                        onClick={() => {
                          const match = subjects.find((s) => s.subject_code?.toUpperCase() === currentSlot.lecture.code.toUpperCase() && s.section === 'CSE(AIML-2)');
                          if (match) {
                            setSelectedSubId(String(match.subject_id));
                            toast(`⚡ Auto-selected live timetable lecture: ${match.name} (${match.subject_code})`, 'success');
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] transition cursor-pointer shrink-0 shadow-sm"
                      >
                        ⚡ Auto-Select Live Slot
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* The Subject Slider Cards Track */}
              {visibleSubjects.length === 0 ? (
                <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-white">
                    Aapko Section {selectedSection} mein koi class assign nahi hai
                  </h5>
                  <p className="text-[11px] text-zinc-400 max-w-sm">
                    Aap sirf apni assigned class ki attendance le sakte hain.
                  </p>
                  {myAssignedSections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSection(myAssignedSections[0]);
                      }}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs cursor-pointer"
                    >
                      Go to Your Assigned Section: {myAssignedSections[0]}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  ref={subjectSliderRef}
                  className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {visibleSubjects.map((s) => {
                    const isSelected = String(s.subject_id) === String(selectedSubId);
                    const isAssigned = Boolean(s.is_my_assigned);
                    return (
                      <button
                        key={s.subject_id}
                        type="button"
                        onClick={() => setSelectedSubId(String(s.subject_id))}
                        className={`p-3.5 rounded-xl border flex flex-col items-start gap-2 shrink-0 transition cursor-pointer text-left ${isSelected
                            ? isAssigned
                              ? 'bg-[#152338] border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                              : 'bg-[#22151b] border-rose-500/60 shadow-sm ring-1 ring-rose-500/30'
                            : isAssigned
                              ? 'bg-[#111726] hover:bg-[#151e30] border-[#1e2a3f] hover:border-blue-500/40'
                              : 'bg-[#0f1420]/60 hover:bg-[#131a28] border-[#182133] text-slate-400'
                          }`}
                        style={{ minWidth: '220px', maxWidth: '240px' }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1a2336] text-slate-200 border border-[#23314a]">
                            {s.subject_code}
                          </span>
                          {isAssigned ? (
                            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1" title="Your Assigned Class">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Your Class
                            </span>
                          ) : (
                            <span className="text-[10px] font-normal text-slate-400 flex items-center gap-1" title="Assigned to another faculty">
                              <Lock className="w-2.5 h-2.5 text-slate-400" /> View Only
                            </span>
                          )}
                        </div>

                        <div className="w-full">
                          <h5 className={`text-xs font-semibold line-clamp-1 ${isSelected ? (isAssigned ? 'text-blue-200' : 'text-rose-200') : 'text-slate-100'}`}>
                            {s.name}
                          </h5>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Faculty: <strong className="text-slate-300 font-normal">{s.faculty_name || 'Faculty'}</strong>
                          </p>
                        </div>

                        <div className="flex items-center justify-between w-full text-[10px] text-slate-400 pt-1 border-t border-[#1a2538] font-mono">
                          <span>Venue: {s.venue || 'CL-11'}</span>
                          <span className={isAssigned ? "text-emerald-400 font-semibold" : "text-slate-400"}>{s.total_students || 12} Students</span>
                        </div>

                        {isSelected && (
                          <div className={`w-full text-center py-1 rounded text-[10px] font-semibold font-mono ${isAssigned
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                            {isAssigned ? '✓ Authorized Lecture' : '🔒 Attendance Restricted'}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected Subject Confirmation Bar */}
              {isCurrentSubjectAuthorized ? (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-200 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Currently Selected: <strong className="text-white">{activeSubject?.name || 'Class'}</strong>
                    <span className="text-emerald-400 font-mono text-[11px]">({activeSubject?.subject_code})</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✅ Assigned to You
                    </span>
                  </span>
                  <span className="text-zinc-400 text-[11px]">
                    Ab niche capture studio choose karke attendance mark karein 👇
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <span className="text-rose-200 flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Attendance Locked:</strong> Ye lecture <strong>{activeSubject?.faculty_name || 'other faculty'}</strong> ko alloted hai. Aap ({teacher?.name || 'Faculty'}) sirf apni assigned class ki attendance mark kar sakte hain.
                    </span>
                  </span>
                  {myAssignedSections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const myClass = subjects.find((s) => s.is_my_assigned);
                        if (myClass) {
                          setSelectedSection(myClass.section);
                          setSelectedSubId(String(myClass.subject_id));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      ⚡ Go to My Class
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mode Selector and Capture Studios - Strictly available ONLY for authorized subjects */}
          {!isCurrentSubjectAuthorized ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-rose-950/25 via-zinc-900 to-zinc-950 border-2 border-rose-500/30 text-center relative overflow-hidden shadow-2xl flex flex-col items-center justify-center gap-4 my-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="max-w-md">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold mb-2">
                  <Lock className="w-3 h-3" /> ATTENDANCE MARKING LOCKED
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Aap is Class ki Attendance Mark Nahi Kar Sakte
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                  Ye subject (<strong className="text-rose-400">{activeSubject?.name || 'Subject'} - {activeSubject?.subject_code}</strong>) <strong className="text-white">{activeSubject?.faculty_name || 'other faculty'}</strong> ko assign kiya gaya hai.
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Aap (<strong className="text-white">{teacher?.name || 'Faculty'}</strong>) keval unhi classes ki attendance le sakte hain jo aapko alloted hain.
                </p>
              </div>

              {myAssignedSections.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const myClass = subjects.find((s) => s.is_my_assigned);
                    if (myClass) {
                      setSelectedSection(myClass.section);
                      setSelectedSubId(String(myClass.subject_id));
                      toast(`Switched to your assigned lecture: ${myClass.name} (${myClass.subject_code})`, 'success');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <span>Apni Assigned Class Par Jayein ({subjects.find(s => s.is_my_assigned)?.subject_code || 'My Class'})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mode Selector (Real-World Product Toolbar) */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#0c101a] border border-[#1b2538] overflow-x-auto no-scrollbar mb-6 text-xs">
                <button
                  onClick={() => { setMode('live_camera'); setReview(null); }}
                  className={`px-3.5 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${mode === 'live_camera'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]'
                    }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Camera</span>
                </button>
                <button
                  onClick={() => { setMode('photos'); setReview(null); }}
                  className={`px-3.5 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${mode === 'photos'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]'
                    }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Multi-Photo</span>
                </button>
                <button
                  onClick={() => { setMode('group_photo'); setReview(null); startMobileCamera(); }}
                  className={`px-3.5 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${mode === 'group_photo'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]'
                    }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Phone Cam / Panoramic</span>
                </button>
                <button
                  onClick={() => { setMode('voice_command'); setReview(null); }}
                  className={`px-3.5 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${mode === 'voice_command'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]'
                    }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Roll-Call</span>
                </button>
                <button
                  onClick={() => { setMode('video'); setReview(null); }}
                  className={`px-3.5 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${mode === 'video'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]'
                    }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video Pan</span>
                </button>
                <button
                  onClick={() => { setMode('manual'); setReview(null); loadManualList(); }}
                  className={`px-3.5 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${mode === 'manual'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]'
                    }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Manual Roster</span>
                </button>
              </div>

              {/* Mode Inputs */}
              {mode === 'live_camera' && (
                <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-emerald-500/30 text-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-lg shadow-emerald-500/10">
                    <Camera className="w-7 h-7" />
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-mono mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Automated Biometric Radar Ready</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                    Live Classroom Camera & Door Kiosk Terminal
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-400 mb-6 max-w-xl mx-auto leading-relaxed">
                    Transform any laptop, tablet, or classroom webcam into an autonomous biometric attendance station. Features hands-free walk-up scanning, 1-click panoramic classroom sweeps, and live audio chime confirmations.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const sub = subjects.find((s) => s.subject_id === Number(selectedSubId));
                        if (sub) setKioskSubject(sub);
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-extrabold text-xs tracking-wide shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 group"
                    >
                      <Camera className="w-4 h-4 text-zinc-950 group-hover:rotate-12 transition-transform" />
                      <span>Launch Live Camera Terminal</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-950 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Continuous Auto-Scan Loop
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1-Click Multi-Face Classroom Sweep
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Liveness Protection & Audio Chimes
                    </span>
                  </div>
                </div>
              )}

              {mode === 'group_photo' && (
                <div className="space-y-5">
                  {/* Top Feature Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-sky-950/20 to-zinc-950 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-sky-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
                        <Smartphone className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                            Faculty Mobile Live Attendance
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            INSTANT AI SYNC
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                          Point phone back camera at lecture hall rows and tap <strong>Snap</strong> anytime. Pramaan AI detects every face simultaneously and marks attendance directly in the database.
                        </p>
                      </div>
                    </div>

                    {/* Session Counter Pill */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-zinc-300">
                        Marked: <strong className="text-emerald-400">{groupScanResult?.total_marked_today || sessionAccumulated.length}</strong> students
                      </span>
                    </div>
                  </div>

                  {/* Live Viewfinder & Camera Frame */}
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-cyan-500/30 shadow-2xl shadow-cyan-500/5">
                    {/* Viewfinder Top Control Overlay */}
                    <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono tracking-wide bg-black/70 backdrop-blur-md border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                          <span>{facingMode === 'environment' ? 'REAR WIDE CAM' : 'FRONT CAM'}</span>
                        </span>
                        <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 backdrop-blur-md border border-zinc-800 text-zinc-300">
                          {AKGEC_META.room} • {AKGEC_PERIODS.find((p) => p.id === selectedPeriod)?.name || 'Period'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleCameraFacing}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 backdrop-blur-md border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
                          title="Switch Front/Back Camera"
                        >
                          <Repeat className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Flip Cam</span>
                        </button>
                        <button
                          onClick={() => mobileCamActive ? stopMobileCamera() : startMobileCamera()}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 backdrop-blur-md border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
                          title="Toggle Camera Stream"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{mobileCamActive ? 'Pause' : 'Start'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Video Stream Element */}
                    <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[460px] bg-zinc-950 flex items-center justify-center overflow-hidden">
                      <video
                        ref={mobileVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Targeting Reticle Corners Overlay */}
                      <div className="absolute inset-8 sm:inset-12 pointer-events-none border border-cyan-500/20 rounded-2xl flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg"></div>
                          <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg"></div>
                        </div>
                        <div className="text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-cyan-500/30 text-[11px] text-cyan-300 font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Aim at classroom benches & tap shutter below</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg"></div>
                          <div className="w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg"></div>
                        </div>
                      </div>

                      {/* Camera Paused / Error Placeholder */}
                      {!mobileCamActive && (
                        <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-center z-10">
                          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3 shadow-inner">
                            <Camera className="w-7 h-7 text-zinc-500" />
                          </div>
                          <h4 className="text-sm font-bold text-zinc-200 mb-1">Live Camera Feed Standby</h4>
                          <p className="text-xs text-zinc-400 max-w-sm mb-4">
                            Enable live viewfinder or use your phone's native camera app directly.
                          </p>
                          <button
                            onClick={() => startMobileCamera()}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-zinc-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
                          >
                            Start Live Camera Stream
                          </button>
                        </div>
                      )}

                      {/* Scanning Processing Spinner Overlay */}
                      {scanning && (
                        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in duration-150">
                          <div className="relative mb-3">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[2px] animate-spin">
                              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                                <Sparkles className="w-7 h-7 text-cyan-400" />
                              </div>
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-white mb-1">Pramaan AI Multi-Face Radar Active</h4>
                          <p className="text-xs text-cyan-300 font-mono">
                            Running 128-d ResNet matching & saving attendance into Supabase database...
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Shutter & Quick Controls Bar */}
                    <div className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      {/* Big Primary Shutter Button */}
                      <button
                        onClick={captureLiveShutter}
                        disabled={scanning || !selectedSubId}
                        className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-zinc-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 active:scale-98 transition-all cursor-pointer disabled:opacity-50 group"
                      >
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-950 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-950"></span>
                        </span>
                        <Camera className="w-5 h-5 text-zinc-950 group-hover:rotate-12 transition-transform" />
                        <span>{scansCount > 0 ? "📸 Snap Next Row / Angle" : "📸 Capture & Mark Attendance Now"}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Native Phone Camera App Trigger */}
                        <label className="flex-1 sm:flex-initial py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/50 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md">
                          <Smartphone className="w-4 h-4 text-cyan-400" />
                          <span>Phone Camera App</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                processGroupPhotoFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* Storage / Gallery Upload */}
                        <label className="py-3.5 px-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all" title="Upload Photo from Gallery">
                          <Upload className="w-4 h-4" />
                          <span className="hidden md:inline">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                processGroupPhotoFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Instant Auto-Attendance Result Summary */}
                  {groupScanResult && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-zinc-900/90 to-zinc-900/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">Live Attendance Successfully Marked!</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                SAVED IN SUPABASE DB
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 mt-1">
                              Detected <strong className="text-white">{groupScanResult.total_faces_detected || groupScanResult.total_detected || 0} faces</strong> • <strong className="text-emerald-400">+{groupScanResult.newly_marked_count ?? groupScanResult.recognized_count ?? 0} students</strong> marked present in {AKGEC_PERIODS.find((p) => p.id === groupScanResult.period)?.name || 'current period'} ({groupScanResult.total_marked_today || (groupScanResult.recognized || []).length} total present today).
                            </p>
                            <p className="text-[11px] text-cyan-300 mt-1 flex items-center gap-1.5 font-medium">
                              <Layers className="w-3.5 h-3.5" />
                              <span>Tip: You can point at back rows or side benches and tap <strong>Snap Next Row / Angle</strong> — new students will be added without overwriting!</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                          <button
                            onClick={() => setTab('logs')}
                            className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                          >
                            <span>View Official Logbook</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Recognized Students Card Roster */}
                      {(groupScanResult.recognized || []).length > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                                Recognized Students in This Photo ({(groupScanResult.recognized || []).length})
                              </h4>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400">
                              128-d Euclidean ResNet Match
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {(groupScanResult.recognized || []).map((st) => (
                              <div
                                key={st.student_id}
                                className="p-3 rounded-xl bg-zinc-900/80 border border-emerald-500/25 flex items-center justify-between gap-3 shadow-sm hover:border-emerald-500/40 transition"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                                    {st.name ? st.name.slice(0, 2).toUpperCase() : 'ST'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-zinc-100 truncate">{st.name}</div>
                                    <div className="text-[10px] text-zinc-400 font-mono">Roll: {st.roll_number || st.student_id}</div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    {Math.round(st.confidence || 95)}% MATCH
                                  </span>
                                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">AUTO-MARKED</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mode === 'voice_command' && (
                <div className="border border-dashed border-zinc-800 p-8 rounded-xl text-center">
                  <Volume2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-zinc-100 mb-1">Teacher Voice-Command Roll-Call (AI)</h3>
                  <p className="text-xs text-zinc-400 mb-4 max-w-lg mx-auto">
                    Speak naturally in English or Hinglish (e.g. <em>"Mark all present except roll 12 and 24"</em> or <em>"Roll 5, 8 absent baaki sab present"</em>).
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      disabled={scanning || isListening}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-lg ${isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                    >
                      <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />
                      {isListening ? 'Listening to speech...' : 'Push to Speak Command'}
                    </button>
                  </div>

                  {/* Or manual transcript input */}
                  <div className="max-w-md mx-auto flex gap-2">
                    <input
                      type="text"
                      value={voiceTranscript}
                      onChange={(e) => setVoiceTranscript(e.target.value)}
                      placeholder="Or type: 'Mark all present except roll 12, 15'"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          executeVoiceCommand(voiceTranscript);
                        }
                      }}
                    />
                    <button
                      onClick={() => executeVoiceCommand(voiceTranscript)}
                      disabled={scanning || !voiceTranscript.trim()}
                      className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {scanning ? 'Parsing...' : 'Apply'}
                    </button>
                  </div>

                  {voiceCommandSummary && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs max-w-md mx-auto text-left flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{voiceCommandSummary}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode Inputs */}
              {mode === 'photos' && (
                <div className="border border-dashed border-zinc-800 p-8 rounded-xl text-center">
                  <Camera className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 mb-3">Upload 1 or more photos of the classroom. dlib detects all faces and cross-verifies against enrolled profiles.</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setPhotoFiles(Array.from(e.target.files))}
                    className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-zinc-200 cursor-pointer"
                  />
                  {photoFiles.length > 0 && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <button
                        onClick={handleScan}
                        disabled={scanning}
                        className="px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-zinc-950 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shadow-lg shadow-sky-500/20"
                      >
                        {scanning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Detecting Faces with dlib 128-d ResNet...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" /> Scan {photoFiles.length} Photo(s) Now
                          </>
                        )}
                      </button>
                      {!selectedSubId && (
                        <p className="text-[11px] text-amber-400">Please select an active Class above first.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mode === 'video' && (
                <div className="border border-dashed border-zinc-800 p-8 rounded-xl text-center">
                  <Video className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 mb-3">Upload classroom panning video (mp4). OpenCV extracts keyframes every 1s for moving student recognition.</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                    className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-zinc-200 cursor-pointer"
                  />
                  {videoFile && (
                    <button
                      onClick={handleScan}
                      disabled={scanning}
                      className="mt-4 px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer disabled:opacity-50"
                    >
                      {scanning ? 'Extracting Keyframes...' : 'Analyze Video Keyframes'}
                    </button>
                  )}
                </div>
              )}

              {mode === 'voice' && (
                <div className="border border-dashed border-zinc-800 p-8 rounded-xl text-center">
                  <Mic className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 mb-3">Upload audio roll call recording. Resemblyzer speaker verification checks candidate vectors.</p>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setVoiceFile(e.target.files[0])}
                    className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-zinc-200 cursor-pointer"
                  />
                  {voiceFile && (
                    <button
                      onClick={handleScan}
                      disabled={scanning}
                      className="mt-4 px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer disabled:opacity-50"
                    >
                      {scanning ? 'Matching Voice Utterances...' : 'Verify Voice Biomarkers'}
                    </button>
                  )}
                </div>
              )}

              {mode === 'manual' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-zinc-400">Enrolled Students ({manualList.length})</span>
                    <div className="flex gap-2">
                      <button onClick={() => setManualList((l) => l.map((s) => ({ ...s, is_present: true })))} className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer">
                        All Present
                      </button>
                      <button onClick={() => setManualList((l) => l.map((s) => ({ ...s, is_present: false })))} className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer">
                        All Absent
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto mb-4">
                    {manualList.map((st) => (
                      <div
                        key={st.student_id}
                        onClick={() => setManualList((l) => l.map((s) => s.student_id === st.student_id ? { ...s, is_present: !s.is_present } : s))}
                        className={`p-2.5 rounded border text-xs flex justify-between items-center cursor-pointer ${st.is_present ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                          }`}
                      >
                        <span>{st.name} <span className="font-mono text-[10px] text-zinc-500">({st.roll_number})</span></span>
                        <span className={`text-[11px] font-semibold ${st.is_present ? 'text-emerald-400' : 'text-zinc-600'}`}>
                          {st.is_present ? 'PRESENT' : 'ABSENT'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving || !manualList.length}
                    className="w-full py-2 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Manual Attendance'}
                  </button>
                </div>
              )}

              {/* AI Multi-Factor Trust Score Review Drawer */}
              {review && (
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Multi-Factor Trust Verification Review
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {review.filter((r) => r.is_present).length} / {review.length} students detected & evaluated
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSortByLowestTrust(!sortByLowestTrust)}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                        {sortByLowestTrust ? 'Sort: Lowest Trust First' : 'Sort: Default'}
                      </button>
                      <button onClick={() => setReview(null)} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer">
                        Discard
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Confirm & Save'}
                      </button>
                    </div>
                  </div>

                  {/* Trust Score Summary Cards */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <div className="text-sm font-semibold">{review.filter((r) => r.is_present && (r.trust_score >= 80 || r.verification_status === 'auto_accepted')).length}</div>
                      <div className="text-[10px] text-zinc-400 font-medium">Auto-Accepted (≥80)</div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      <div className="text-sm font-semibold">{review.filter((r) => r.is_present && ((r.trust_score >= 50 && r.trust_score < 80) || r.verification_status === 'needs_review')).length}</div>
                      <div className="text-[10px] text-zinc-400 font-medium">Needs Review (50-79)</div>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                      <div className="text-sm font-semibold">{review.filter((r) => r.is_present && (r.trust_score < 50 || r.verification_status === 'flagged')).length}</div>
                      <div className="text-[10px] text-zinc-400 font-medium">Flagged (&lt;50)</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {[...review]
                      .sort((a, b) => {
                        if (sortByLowestTrust) {
                          const scoreA = a.is_present ? (a.trust_score ?? 100) : 999;
                          const scoreB = b.is_present ? (b.trust_score ?? 100) : 999;
                          return scoreA - scoreB;
                        }
                        return a.name.localeCompare(b.name);
                      })
                      .map((r) => {
                        const isExpanded = expandedId === r.student_id;
                        const isHigh = r.trust_score >= 80 || r.verification_status === 'auto_accepted';
                        const isMed = (r.trust_score >= 50 && r.trust_score < 80) || r.verification_status === 'needs_review';
                        const isLow = r.trust_score < 50 || r.verification_status === 'flagged';

                        return (
                          <div
                            key={r.student_id}
                            className={`rounded-lg border text-xs transition ${r.is_present
                                ? isLow
                                  ? 'bg-rose-950/20 border-rose-900/40 text-zinc-100'
                                  : isMed
                                    ? 'bg-amber-950/20 border-amber-900/40 text-zinc-100'
                                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-100'
                                : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                              }`}
                          >
                            <div className="p-2.5 flex justify-between items-center">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : r.student_id)}
                                  className="text-zinc-500 hover:text-zinc-300 cursor-pointer p-0.5"
                                  title="View trust score breakdown"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-200">{r.name}</span>
                                    <span className="font-mono text-[10px] text-zinc-500">({r.roll_number})</span>
                                    {r.is_present && r.trust_score !== undefined && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border ${isHigh
                                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                            : isMed
                                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                          }`}
                                      >
                                        Trust {r.trust_score}%
                                      </span>
                                    )}
                                  </div>
                                  {r.confidence > 0 && (
                                    <div className="text-[10px] text-zinc-400 mt-0.5 flex gap-2">
                                      <span>Match: {r.confidence}%</span>
                                      {r.sources && r.sources.length > 0 && <span>via {r.sources.join(', ')}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setReview((l) => l.map((item) => item.student_id === r.student_id ? { ...item, is_present: !item.is_present } : item))}
                                  className={`text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition ${r.is_present
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                                    }`}
                                >
                                  {r.is_present ? 'PRESENT' : 'ABSENT'}
                                </button>
                              </div>
                            </div>

                            {/* Factor Breakdown Chips */}
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-1 border-t border-zinc-800/60 bg-zinc-950/40 text-[11px]">
                                <p className="text-zinc-300 mb-2 font-mono text-[10.5px]">
                                  {r.explanation || 'Manual attendance selection'}
                                </p>
                                {r.trust_breakdown && Object.keys(r.trust_breakdown).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {r.trust_breakdown.face_score !== undefined && (
                                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                                        Face: <span className="font-mono text-zinc-100">{r.trust_breakdown.face_score}/{r.trust_breakdown.face_max}</span>
                                      </span>
                                    )}
                                    {r.trust_breakdown.liveness_score !== undefined && (
                                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                                        Liveness: <span className="font-mono text-zinc-100">{r.trust_breakdown.liveness_score}/{r.trust_breakdown.liveness_max}</span>
                                      </span>
                                    )}
                                    {r.trust_breakdown.session_score !== undefined && (
                                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                                        Session: <span className="font-mono text-zinc-100">{r.trust_breakdown.session_score}</span>
                                      </span>
                                    )}
                                    {r.trust_breakdown.ip_score !== undefined && (
                                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                                        Network/IP: <span className="font-mono text-zinc-100">{r.trust_breakdown.ip_score}</span>
                                      </span>
                                    )}
                                    {r.trust_breakdown.device_score !== undefined && (
                                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                                        Device: <span className="font-mono text-zinc-100">{r.trust_breakdown.device_score}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 2. CLASSROOM SEAT MAP GRID VIEW */}
      {tab === 'seatmap' && (
        <div className="panel rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-cyan-400" /> Classroom Seat Map & Spatial Attendance
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Visual desk matrix displaying real-time presence and seating distribution.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAutoArrangeSeatmap('roll')}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs rounded-md transition cursor-pointer"
              >
                Auto-Arrange (Roll No)
              </button>
              <button
                onClick={() => handleAutoArrangeSeatmap('name')}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs rounded-md transition cursor-pointer"
              >
                Auto-Arrange (Name)
              </button>
              <button
                onClick={loadSeatmap}
                className="p-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Refresh Seat Map"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSeatmap ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Teacher Podium Indicator */}
          <div className="max-w-md mx-auto py-2 px-6 rounded-lg bg-zinc-900 border border-zinc-800 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400 shadow-inner">
            Teacher Podium & Smart Board Screen
          </div>

          {/* Seating Grid */}
          {loadingSeatmap ? (
            <div className="py-12 flex justify-center text-zinc-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading Seating Matrix...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
              {(seatmapData?.seats || []).map((seat) => {
                const std = seat.student;
                const isPresent = std?.status === 'PRESENT';
                const isVacant = !std;

                return (
                  <div
                    key={seat.seat_id}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[92px] ${isVacant
                        ? 'bg-zinc-950/60 border-dashed border-zinc-800/80 text-zinc-600'
                        : isPresent
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-zinc-200 shadow-sm'
                          : 'bg-rose-950/20 border-rose-500/30 text-zinc-300'
                      }`}
                  >
                    <div className="flex justify-between items-start text-[10px] text-zinc-400">
                      <span className="font-mono font-semibold">{seat.seat_id}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${isVacant
                          ? 'text-zinc-600'
                          : isPresent
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                        {isVacant ? 'VACANT' : isPresent ? 'PRESENT' : 'ABSENT'}
                      </span>
                    </div>

                    {!isVacant ? (
                      <div className="mt-2">
                        <div className="font-semibold text-xs text-zinc-100 truncate">{std.name}</div>
                        <div className="font-mono text-[10px] text-zinc-400">{std.roll_number}</div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-600 italic">Empty Desk</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. AT-RISK PREDICTION & ANOMALY RADAR (ML) */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="panel rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Attendance Risk & Anomaly Radar
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Machine learning forecast predicting students likely to fall below 75% by term end
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open(api.getHodDefaultersNoticeUrl(), '_blank')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600/90 hover:bg-rose-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
                title="Generate printable official notice for attendance shortage"
              >
                <Printer className="w-3.5 h-3.5" /> Defaulter Notice (PDF)
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Class:</span>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
                >
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.name} ({s.subject_code})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => loadRiskAnalytics(selectedSubId)}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRisk ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Anomaly Alerts Banner */}
          {anomalies.length > 0 ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Detected {anomalies.length} Suspicious Attendance Pattern(s)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {anomalies.map((anom, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950/80 rounded-lg border border-rose-500/20 text-xs text-zinc-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-300">{anom.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        {anom.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{anom.description}</p>
                    {anom.affected_students && (
                      <p className="text-[10px] text-zinc-500 font-mono">
                        Flagged: {anom.affected_students.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Proxy Detector: No rapid-fire bursts or multi-identity device collisions detected.</span>
            </div>
          )}

          {/* At-Risk Students Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Student Risk Profiles ({riskStudents.length})
              </h3>
              <span className="text-xs text-zinc-500">Sorted by highest risk</span>
            </div>

            {riskStudents.length === 0 ? (
              <div className="panel rounded-xl p-8 text-center text-xs text-zinc-400">
                No student records found to analyze for this subject.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {riskStudents.map((st) => {
                  const badgeStyles = {
                    CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                    WARNING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    HEALTHY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    UNKNOWN: 'bg-zinc-800 text-zinc-400 border-zinc-700',
                  };
                  return (
                    <div key={st.student_id} className="panel rounded-xl p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-zinc-100">{st.name}</h4>
                            <span className="text-xs font-mono text-zinc-400">Roll: {st.roll_number}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${badgeStyles[st.risk_level] || badgeStyles.UNKNOWN}`}>
                              {st.risk_level} • {st.risk_score}% Risk
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs text-zinc-400">
                            <span>Current: <strong className={st.current_pct < 75 ? 'text-rose-400' : 'text-emerald-400'}>{st.current_pct}%</strong></span>
                            <span>Projected: <strong className="text-zinc-200">{st.projected_final_pct}%</strong></span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${st.current_pct < 75 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, st.current_pct)}%` }}
                            />
                          </div>
                        </div>

                        {/* Factors */}
                        <div className="mt-3 space-y-1">
                          {st.top_factors && st.top_factors.map((f, fIdx) => (
                            <div key={fIdx} className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                              <span className="text-amber-400/80">•</span>
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recovery Plan */}
                      <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-[11px] text-zinc-300">
                        <span className="font-semibold text-zinc-200">Prescription: </span>
                        <span>{st.recovery_plan}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MEDICAL LEAVE & OD APPROVALS TAB */}
      {tab === 'leaves' && (
        <div className="space-y-6">
          <div className="panel rounded-xl p-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Student Medical & OD Leaves
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Review verified medical slips and event passes to excuse student attendance penalties
              </p>
            </div>
            <button
              onClick={loadTeacherLeaves}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLeaves ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {teacherLeaves.length === 0 ? (
            <div className="panel rounded-xl p-8 text-center text-xs text-zinc-400">
              No leave or OD applications submitted by students for your subjects.
            </div>
          ) : (
            <div className="space-y-3">
              {teacherLeaves.map((leave) => {
                const isPending = leave.status === 'pending';
                return (
                  <div key={leave.id} className="panel rounded-xl p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-zinc-100">{leave.student_name}</h4>
                          <span className="text-xs font-mono text-zinc-400">({leave.roll_number})</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                            {leave.leave_type}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${leave.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                              leave.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-amber-500/10 text-amber-400'
                            }`}>
                            {leave.status}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          Subject: <span className="text-zinc-200 font-medium">{leave.subject_name}</span> · Period: <span className="font-mono text-zinc-300">{leave.start_date}</span> to <span className="font-mono text-zinc-300">{leave.end_date}</span>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{leave.document_name}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 text-xs text-zinc-300">
                      <span className="text-zinc-500 block text-[10px] uppercase font-mono">Reason for Absence:</span>
                      <p className="mt-0.5">{leave.reason}</p>
                    </div>

                    {isPending ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
                        <input
                          type="text"
                          value={reviewRemarks[leave.id] || ''}
                          onChange={(e) => setReviewRemarks({ ...reviewRemarks, [leave.id]: e.target.value })}
                          placeholder="Optional approval/rejection remark..."
                          className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs text-zinc-200 outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewLeave(leave.id, 'approved')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve (Excuse)
                          </button>
                          <button
                            onClick={() => handleReviewLeave(leave.id, 'rejected')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium transition cursor-pointer shadow-sm"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      leave.faculty_remarks && (
                        <div className="text-[11px] text-zinc-400 bg-zinc-900/40 px-3 py-1.5 rounded border border-zinc-800">
                          <span className="font-semibold text-zinc-300">Faculty Note: </span>
                          <span>{leave.faculty_remarks}</span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. SUBJECTS TAB & ROSTER */}
      {tab === 'subjects' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Active Subjects</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded text-xs font-semibold hover:bg-white transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s) => (
              <div key={s.subject_id} className="panel rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">{s.name}</h3>
                      <span className="text-[11px] font-mono text-zinc-400">{s.subject_code} · Sec {s.section}</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Delete ${s.name}?`)) return;
                        await api.deleteSubject(s.subject_id);
                        toast('Subject deleted', 'info');
                        loadSubjects();
                      }}
                      className="text-zinc-600 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-zinc-400 mb-4">
                    <span>{s.total_students || 0} Students Enrolled</span> · <span>{s.total_classes || 0} Sessions</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900">
                  <button
                    onClick={() => handleOpenStudents(s)}
                    className="py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Users className="w-3 h-3 text-sky-400" /> Roster
                  </button>
                  <button
                    onClick={() => openShare(s)}
                    className="py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Share2 className="w-3 h-3 text-emerald-400" /> Share Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FORENSIC LOGBOOK & MULTI-LECTURE AUDIT TAB */}
      {tab === 'logs' && (
        <div className="space-y-5">
          {/* Top College Timetable Period Selector */}
          <div className="panel rounded-2xl p-4 sm:p-5 border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    College Multi-Lecture Schedule & Audit Hub
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Slot Aware
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Filter attendance records per period slot, inspect biometric forensic entry in-times, and detect proxy walkouts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowPulseModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Trigger surprise mid-class verification to catch students who bunked after check-in"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Surprise Pulse Check</span>
                </button>

                <button
                  onClick={() => setTab('seatmap')}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Seat Map</span>
                </button>

                <a
                  href={`/api/attendance/export/csv/${selectedSubId}`}
                  download
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-violet-400" />
                  <span>LMS CSV</span>
                </a>
              </div>
            </div>

            {/* AKGEC Official Timetable 9-Period Quick Select Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-1.5 pt-2 border-t border-zinc-900">
              {COLLEGE_PERIODS.map((p) => {
                const isActive = selectedPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p.id)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${p.isBreak
                        ? 'bg-zinc-950/40 border-dashed border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        : isActive
                          ? 'bg-cyan-500/10 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${p.isBreak ? 'text-zinc-500' : isActive ? 'text-cyan-300' : 'text-zinc-200'}`}>
                        {p.name}
                      </span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400 mt-0.5 truncate">
                      {p.slot}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Selector & Defaulter Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="panel rounded-xl p-3.5 border border-zinc-800/80 bg-zinc-950/70">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Total Enrolled</span>
              <div className="text-xl font-extrabold text-white font-mono">
                {subjects.find((s) => s.subject_id === parseInt(selectedSubId))?.total_students || Object.keys(studentTotals).length || 12}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Active class roster</span>
            </div>

            <div className="panel rounded-xl p-3.5 border border-zinc-800/80 bg-zinc-950/70">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Present In Session</span>
              <div className="text-xl font-extrabold text-emerald-400 font-mono">
                {records.filter((r) => r.timestamp === sessionTime && r.is_present).length}
              </div>
              <span className="text-[10px] text-emerald-500/80 font-mono">Biometrically verified</span>
            </div>

            <div className="panel rounded-xl p-3.5 border border-zinc-800/80 bg-zinc-950/70">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Late Entries</span>
              <div className="text-xl font-extrabold text-amber-400 font-mono">
                {records.filter((r) => r.timestamp === sessionTime && (r.verification_status === 'late_entry' || r.trust_breakdown?.entry_status === 'LATE')).length}
              </div>
              <span className="text-[10px] text-amber-500/80 font-mono">&gt;15m late checkin</span>
            </div>

            <div className="panel rounded-xl p-3.5 border border-zinc-800/80 bg-zinc-950/70">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Defaulters Risk</span>
              <div className="text-xl font-extrabold text-rose-400 font-mono">
                {defaulters.length}
              </div>
              <span className="text-[10px] text-rose-500/80 font-mono">&lt;75% Attendance alert</span>
            </div>
          </div>

          {/* Defaulter Alert Notice */}
          {defaulters.length > 0 && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-rose-200">University Attendance Shortage Warning</strong>
                  <span>{defaulters.length} student(s) below 75% threshold in this course. Risk of semester exam detention.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const subObj = subjects.find((s) => s.subject_id === parseInt(selectedSubId));
                    const draft = `OFFICIAL UNIVERSITY NOTICE: Attendance below 75% in ${subObj?.name || 'Class'}. Semester examination eligibility compromised. Meet your Faculty Advisor immediately.`;
                    navigator.clipboard.writeText(draft);
                    toast('Official Notice copied to clipboard!', 'info');
                  }}
                  className="px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 hover:bg-rose-500/30 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Notice</span>
                </button>
              </div>
            </div>
          )}

          {/* Session Filters, Search & Table */}
          <div className="panel rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden shadow-xl">
            {/* Table Control Bar */}
            <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-900/40">
              <div className="flex flex-wrap items-center gap-2.5 text-xs w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-semibold">Subject:</span>
                  <select
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-semibold cursor-pointer focus:outline-none focus:border-cyan-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.subject_code})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-semibold">Session Date:</span>
                  <select
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 cursor-pointer focus:outline-none focus:border-cyan-500"
                  >
                    {[...new Set(records.map((r) => r.timestamp))].sort().reverse().map((t) => (
                      <option key={t} value={t}>{new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search & Status Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search student / roll..."
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 font-semibold cursor-pointer focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present Only</option>
                  <option value="late">Late Only</option>
                  <option value="absent">Absent Only</option>
                  <option value="proxy">Proxy Suspects</option>
                </select>
              </div>
            </div>

            {/* Forensic Entry Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-bold">Student Profile</th>
                    <th className="py-3 px-4 font-bold">Period Slot & In-Time</th>
                    <th className="py-3 px-4 font-bold">Punctuality Status</th>
                    <th className="py-3 px-4 font-bold">Biometric Security</th>
                    <th className="py-3 px-4 font-bold">Trust Score</th>
                    <th className="py-3 px-4 font-bold text-right">Faculty Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {records
                    .filter((r) => r.timestamp === sessionTime)
                    .filter((r) => {
                      if (!searchLogQuery) return true;
                      const q = searchLogQuery.toLowerCase();
                      const name = (r.students?.name || '').toLowerCase();
                      const roll = (r.students?.roll_number || '').toLowerCase();
                      return name.includes(q) || roll.includes(q);
                    })
                    .filter((r) => {
                      if (statusFilter === 'all') return true;
                      if (statusFilter === 'present') return r.is_present;
                      if (statusFilter === 'absent') return !r.is_present;
                      if (statusFilter === 'late') return r.verification_status === 'late_entry' || r.trust_breakdown?.entry_status === 'LATE';
                      if (statusFilter === 'proxy') return r.verification_status === 'proxy_suspect';
                      return true;
                    })
                    .map((r) => {
                      const tScore = r.trust_score;
                      const breakdown = r.trust_breakdown || {};
                      const inTime = breakdown.in_time || (r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A');
                      const periodSlot = breakdown.period_slot || `Period ${selectedPeriod}`;
                      const isLate = r.verification_status === 'late_entry' || breakdown.entry_status === 'LATE';
                      const isProxy = r.verification_status === 'proxy_suspect';

                      const sTotal = studentTotals[r.student_id] || {
                        name: r.students?.name || 'Student',
                        roll: r.students?.roll_number || 'N/A',
                        total: 1,
                        attended: r.is_present ? 1 : 0
                      };

                      return (
                        <tr key={r.id} className="hover:bg-zinc-900/40 transition-colors">
                          {/* Student Profile */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                                {(r.students?.name || 'S').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                                  <span>{r.students?.name || 'Unknown'}</span>
                                  {isProxy && (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" title="Flagged as Proxy Suspect" />
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-zinc-400">
                                  {r.students?.roll_number || '-'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Period Slot & In-Time */}
                          <td className="py-3 px-4 font-mono text-zinc-300">
                            <div className="font-semibold text-zinc-200">{inTime}</div>
                            <div className="text-[10px] text-zinc-500">{periodSlot}</div>
                          </td>

                          {/* Punctuality Status */}
                          <td className="py-3 px-4">
                            {isProxy ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                <AlertTriangle className="w-3 h-3 text-purple-400" /> PROXY SUSPECT
                              </span>
                            ) : isLate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <Clock className="w-3 h-3 text-amber-400" /> LATE ENTRY
                              </span>
                            ) : r.is_present ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ON TIME
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                <XCircle className="w-3 h-3 text-rose-400" /> ABSENT
                              </span>
                            )}
                          </td>

                          {/* Biometric Security */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{breakdown.confidence ? `${breakdown.confidence}% Match` : (r.is_present ? 'ResNet-128 Verified' : 'No biometric match')}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {breakdown.source === 'kiosk_tablet' ? 'AI Door Kiosk • Live' : 'Classroom Audit'}
                            </div>
                          </td>

                          {/* Trust Score */}
                          <td className="py-3 px-4">
                            {tScore !== null && tScore !== undefined ? (
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${tScore >= 80 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                                  tScore >= 50 ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                                    'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                }`}>
                                {tScore}%
                              </span>
                            ) : (
                              <span className="text-zinc-600 font-mono text-[10px]">-</span>
                            )}
                          </td>

                          {/* Faculty Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedDossierStudent({ ...sTotal, currentRecord: r })}
                                className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                                title="Open Student Forensic Dossier & Guardian Alerts"
                              >
                                <Eye className="w-3 h-3 text-cyan-400" />
                                <span>Dossier</span>
                              </button>

                              <button
                                onClick={() => toggleOverride(r.id, r.is_present)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${r.is_present
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                  }`}
                                title={r.is_present ? 'Mark Absent' : 'Mark Present'}
                              >
                                {r.is_present ? 'Mark Absent' : 'Mark Present'}
                              </button>

                              <button
                                onClick={() => toggleOverride(r.id, r.is_present, isProxy ? null : 'proxy')}
                                className={`p-1 rounded-md transition cursor-pointer border ${isProxy
                                    ? 'bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/20'
                                    : 'bg-zinc-800/80 hover:bg-purple-500/20 border-zinc-700 text-zinc-400 hover:text-purple-300'
                                  }`}
                                title={isProxy ? 'Clear Proxy Flag' : 'Flag as Proxy Suspect'}
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SETTINGS TAB */}
      {tab === 'settings' && (
        <div className="panel rounded-xl p-6 max-w-xl">
          <div className="flex items-center gap-2 mb-4 text-zinc-100 font-semibold text-sm">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span>Biometric Pipeline & Model Parameters</span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            {/* 1. Face Match Distance */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-300 font-medium">Face Recognition Distance Threshold</label>
                <span className="font-mono text-zinc-400 font-semibold">{settings.face_match_threshold}</span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.80"
                step="0.02"
                value={settings.face_match_threshold}
                onChange={(e) => setSettings({ ...settings, face_match_threshold: parseFloat(e.target.value) })}
                className="w-full accent-zinc-200 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                <span>0.40 (Strict / Zero False Positives)</span>
                <span>0.60 (Standard)</span>
                <span>0.80 (Lenient)</span>
              </div>
            </div>

            {/* 2. Liveness EAR Threshold */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-300 font-medium">Eye Aspect Ratio (EAR) Liveness Threshold</label>
                <span className="font-mono text-zinc-400 font-semibold">{settings.liveness_ear_threshold}</span>
              </div>
              <input
                type="range"
                min="0.12"
                max="0.24"
                step="0.01"
                value={settings.liveness_ear_threshold}
                onChange={(e) => setSettings({ ...settings, liveness_ear_threshold: parseFloat(e.target.value) })}
                className="w-full accent-zinc-200 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                <span>0.12 (Allows squinting)</span>
                <span>0.16 (Standard eyes open)</span>
                <span>0.24 (Wide eyes)</span>
              </div>
            </div>

            {/* 3. Anti-Spoofing Liveness Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <div>
                <strong className="block text-zinc-200 font-medium">68-Point Landmark Anti-Spoofing</strong>
                <span className="text-[11px] text-zinc-500">Rejects printed photo-on-screen attack vectors</span>
              </div>
              <input
                type="checkbox"
                checked={settings.liveness_enabled}
                onChange={(e) => setSettings({ ...settings, liveness_enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-zinc-200 cursor-pointer"
              />
            </div>

            {/* 4. Trust Score Engine Parameters */}
            {settings.trust_score && (
              <div className="pt-4 border-t border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 text-zinc-100 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Trust Score Engine Thresholds</span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-300 font-medium">Auto-Accept Threshold (High Trust)</label>
                    <span className="font-mono text-emerald-400 font-semibold">{settings.trust_score.thresholds?.high_trust || 80}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="95"
                    step="1"
                    value={settings.trust_score.thresholds?.high_trust || 80}
                    onChange={(e) => setSettings({
                      ...settings,
                      trust_score: {
                        ...settings.trust_score,
                        thresholds: { ...settings.trust_score.thresholds, high_trust: parseInt(e.target.value) }
                      }
                    })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                    <span>70% (More lenient auto-accept)</span>
                    <span>80% (Recommended)</span>
                    <span>95% (Strict multi-factor)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-300 font-medium">Review Threshold (Medium Trust)</label>
                    <span className="font-mono text-amber-300 font-semibold">{settings.trust_score.thresholds?.medium_trust || 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="70"
                    step="1"
                    value={settings.trust_score.thresholds?.medium_trust || 50}
                    onChange={(e) => setSettings({
                      ...settings,
                      trust_score: {
                        ...settings.trust_score,
                        thresholds: { ...settings.trust_score.thresholds, medium_trust: parseInt(e.target.value) }
                      }
                    })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                    <span>Scores below this are immediately flagged as suspicious proxy attempts</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Apply System Parameters'}
            </button>
          </form>
        </div>
      )}

      {/* 7. OFFICIAL AKGEC TIMETABLE & LECTURE MATRIX */}
      {tab === 'timetable' && (
        <div className="space-y-6">
          {/* AKGEC Official Header Card */}
          <div className="panel-card rounded-2xl p-6 border border-zinc-800/80 bg-zinc-950/90 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
              <div>
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest block mb-1">
                  {AKGEC_META.college} • {AKGEC_META.department}
                </span>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Class Timetable — Section: CSE(AIML-2) (Room CL-11)
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200">
                    {AKGEC_META.branch}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-300">
                    Sem {AKGEC_META.semester} • Sec {AKGEC_META.section}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300">
                    Room: {AKGEC_META.room}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                    Coordinator: {AKGEC_META.coordinator}
                  </span>
                </div>
              </div>

              {/* Live Slot Status Widget */}
              {(() => {
                const live = getCurrentLectureSlot();
                return (
                  <div className="p-4 rounded-xl bg-gradient-to-tr from-cyan-950/40 via-zinc-900/60 to-zinc-900/40 border border-cyan-500/30 w-full lg:w-auto min-w-[280px]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        Live Timetable Engine
                      </span>
                      <span className="font-mono text-[11px] font-bold text-cyan-400">{live.day} • {live.period.name}</span>
                    </div>
                    {live.lecture ? (
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {live.lecture.code}
                          <span className="text-xs font-normal text-zinc-300 truncate max-w-[180px]">{live.lecture.subject}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
                          <span>{live.period.slot}</span>
                          <span className="text-cyan-300 font-mono font-semibold">{live.lecture.venue || AKGEC_META.room}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400">Class hours concluded for today</div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Day Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => {
              const dayFull = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' }[day];
              const isSelected = selectedTimetableDay === day;
              const live = getCurrentLectureSlot();
              const isToday = live.day === day;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedTimetableDay(day)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${isSelected
                      ? 'bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 shadow-md ring-1 ring-cyan-500/20'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                >
                  <span>{dayFull}</span>
                  {isToday && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      TODAY
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Periods Matrix Grid for Selected Day */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(AKGEC_WEEKLY_SCHEDULE[selectedTimetableDay] || []).map((slotItem) => {
              const periodMeta = AKGEC_PERIODS.find((p) => p.id === slotItem.periodId) || {};
              const live = getCurrentLectureSlot();
              const isCurrent = live.day === selectedTimetableDay && live.period.id === slotItem.periodId;
              const matchedSub = subjects.find((s) => s.subject_code === slotItem.code);

              if (slotItem.isBreak) {
                return (
                  <div
                    key={slotItem.periodId}
                    className="p-4 rounded-xl border border-dashed border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between text-zinc-500"
                  >
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider">{periodMeta.name} ({periodMeta.slot})</div>
                      <div className="text-sm font-semibold text-zinc-400 mt-0.5">{slotItem.subject}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 font-mono">
                      Break
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={slotItem.periodId}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${isCurrent
                      ? 'bg-gradient-to-br from-cyan-950/30 to-zinc-900/90 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                      : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400 text-[11px]">
                          {periodMeta.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {periodMeta.slot}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                          LIVE NOW
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {slotItem.code}
                      </span>
                      <h4 className="text-xs font-bold text-zinc-200 truncate" title={slotItem.subject}>
                        {slotItem.subject}
                      </h4>
                    </div>

                    <div className="text-[11px] text-zinc-400 mt-2 space-y-0.5">
                      <div><span className="text-zinc-500">Faculty:</span> {slotItem.faculty || 'Department Faculty'}</div>
                      <div><span className="text-zinc-500">Venue:</span> <span className="font-mono text-cyan-300">{slotItem.venue || AKGEC_META.room}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        if (matchedSub) {
                          setSelectedSubId(matchedSub.subject_id);
                          setTab('attendance');
                        } else {
                          toast(`Lecture ${slotItem.code} active in timetable`, 'info');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-300 transition cursor-pointer flex-1"
                    >
                      Select Lecture
                    </button>

                    <button
                      onClick={() => {
                        if (matchedSub) {
                          setKioskSubject(matchedSub);
                        } else {
                          toast(`Launch Kiosk from Subjects tab`, 'info');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Video className="w-3 h-3" />
                      <span>Kiosk</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Official AKGEC Course Reference Roster Table */}
          <div className="panel-card rounded-2xl p-5 border border-zinc-800/80 bg-zinc-950/80">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3">
              Official Course Roster & Faculty Allocation (Section CSE(AIML-2) • Room CL-11)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">Sub Code</th>
                    <th className="py-2.5 px-3">Course Title</th>
                    <th className="py-2.5 px-3">Faculty In-Charge</th>
                    <th className="py-2.5 px-3">Venue</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {[
                    { code: 'BOE304', name: 'ESE', faculty: 'Respective OE Faculty', venue: 'CL-11' },
                    { code: 'BAS301', name: 'Technical Communication', faculty: 'Dr. Neetu Sharma', venue: 'CL-11' },
                    { code: 'BCS301', name: 'Data Structure', faculty: 'Mr. Sharma Ji', venue: 'CL-11' },
                    { code: 'BCS302', name: 'Computer Organisation & Architecture', faculty: 'Mr. Narendra', venue: 'CL-11' },
                    { code: 'BCS303', name: 'Discrete Structure & Theory', faculty: 'Ms. Ritika Dhyani', venue: 'CL-11' },
                    { code: 'BCS351', name: 'Data Structure Lab', faculty: 'Mr. Sharma Ji', venue: 'LAB-5, LAB-4' },
                    { code: 'BCS352', name: 'Computer Organisation Lab', faculty: 'Mr. Narendra', venue: 'LAB-4' },
                    { code: 'BCS353', name: 'Web Designing Workshop', faculty: 'Mr. Gaurav Kumar', venue: 'LAB-5' },
                    { code: 'BCC351', name: 'Internship Assesment/Mini Project', faculty: 'Mr. Amit Goel', venue: 'CL-11' },
                    { code: 'BCC301', name: 'Cyber Security', faculty: 'Mr. Manoj Kumar', venue: 'CL-11' },
                  ].map((row) => {
                    const matchedSub = subjects.find((s) => s.subject_code === row.code);
                    return (
                      <tr key={row.code} className="hover:bg-zinc-900/50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">{row.code}</td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-100">{row.name}</td>
                        <td className="py-2.5 px-3 text-zinc-300">{row.faculty}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-400">{row.venue}</td>
                        <td className="py-2.5 px-3 text-right">
                          {matchedSub && (
                            <button
                              onClick={() => {
                                setSelectedSubId(matchedSub.subject_id);
                                setTab('logs');
                              }}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition cursor-pointer"
                            >
                              Open Logbook
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Roster & Face Upload Modal */}
      {viewStudentsSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="panel max-w-lg w-full rounded-xl p-5 relative max-h-[85vh] flex flex-col">
            <button onClick={() => setViewStudentsSub(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-semibold text-zinc-100 mb-0.5">{viewStudentsSub.name} — Student Roster</h3>
            <p className="text-xs text-zinc-400 mb-4 font-mono">{viewStudentsSub.subject_code} · {enrolledStudents.length} Students</p>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {enrolledStudents.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs">No students enrolled yet.</div>
              ) : (
                enrolledStudents.map((st) => {
                  const hasFaceEmb = Boolean(st.face_embedding);
                  const isUploading = uploadingStudentId === st.student_id;

                  return (
                    <div key={st.student_id} className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-medium text-zinc-200">{st.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500">Roll: {st.roll_number}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasFaceEmb ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Face Enrolled
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              No Face Profile
                            </span>
                            <label className="text-[11px] px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 cursor-pointer inline-flex items-center gap-1">
                              {isUploading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Upload className="w-3 h-3" />
                              )}
                              Upload Photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) handleStudentPhotoUpload(st.student_id, file);
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="panel max-w-sm w-full rounded-xl p-5 relative">
            <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Create Subject</h3>
            <p className="text-xs text-zinc-400 mb-4">Add a new lecture class to your roster</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.createSubject(newCode.trim().toUpperCase(), newName.trim(), newSec.trim());
                toast('Subject created successfully!', 'success');
                setShowCreate(false);
                setNewCode('');
                setNewName('');
                loadSubjects();
              } catch (err) {
                toast(err.message || 'Failed to create subject', 'error');
              }
            }} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Subject Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Computer Networks"
                  className="w-full px-3 py-2 rounded text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Code</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="CS401"
                    className="w-full px-3 py-2 rounded text-xs font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Section</label>
                  <input
                    type="text"
                    value={newSec}
                    onChange={(e) => setNewSec(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded text-xs font-mono uppercase"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer">
                Create Subject
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="panel max-w-sm w-full rounded-xl p-5 relative text-center">
            <button onClick={() => setShareSub(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-semibold text-zinc-100 mb-0.5">{shareSub.name}</h3>
            <span className="font-mono text-xs text-zinc-400 block mb-4">Permanent Code: <strong className="text-zinc-100">{shareSub.subject_code}</strong></span>

            {qrUrl && <img src={qrUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg mb-4 bg-white p-2" />}

            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
              <span className="text-zinc-400 text-[11px] block">15-Minute Dynamic Passcode</span>
              <span className="font-mono text-2xl font-bold text-zinc-100 tracking-wider my-1 block">{dynamicCode}</span>
              <span className="text-zinc-500 text-[11px]">Expires in {Math.floor(dynamicSecs / 60)}:{(dynamicSecs % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Connect QR Modal */}
      {showPhoneQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="panel max-w-sm w-full rounded-2xl p-6 relative text-center border border-cyan-500/40 shadow-2xl shadow-cyan-500/10">
            <button
              onClick={() => setShowPhoneQrModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-inner">
              <Smartphone className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">Open Pramaan on Mobile Phone</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Scan this QR code with your phone camera to take attendance directly from your phone in the classroom.
            </p>

            {mobileQrDataUrl && (
              <div className="p-3 bg-white rounded-2xl mx-auto inline-block mb-4 shadow-xl">
                <img src={mobileQrDataUrl} alt="Mobile QR Code" className="w-48 h-48 block mx-auto" />
              </div>
            )}

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left mb-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-1">Direct Network Link:</div>
              <a
                href={mobileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-cyan-400 hover:underline break-all block"
              >
                {mobileUrl}
              </a>
            </div>

            <div className="text-left text-[11px] text-zinc-400 space-y-1.5 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
              <div className="font-semibold text-cyan-300">Quick 3-Step Setup:</div>
              <div>1. Connect your phone and laptop to the <strong>same Wi-Fi or Phone Hotspot</strong>.</div>
              <div>2. Point your phone camera at the QR code above and open link.</div>
              <div>3. Log in as faculty & tap <strong>"Phone Cam & Snap"</strong> to take live class attendance anytime!</div>
            </div>
          </div>
        </div>
      )}

      {/* Mid-Class Surprise Pulse Check Modal */}
      {showPulseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="panel max-w-md w-full rounded-2xl p-6 relative border border-amber-500/40 shadow-2xl">
            <button
              onClick={() => setShowPulseModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-semibold text-zinc-100">Mid-Class Pulse Check</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Select random students in active lecture for surprise face + liveness verification.
            </p>

            {!activePulseSession ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">Random Sample Size</label>
                  <div className="flex items-center gap-2">
                    {[1, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPulseSampleSize(num)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${pulseSampleSize === num
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                      >
                        {num} Students
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
                  <div>• Students get a 2-minute prompt on their active dashboard.</div>
                  <div>• Verification checks 68-point EAR geometry in real-time.</div>
                  <div>• Missed/abandoned checks flag session trust score.</div>
                </div>

                <button
                  onClick={handleTriggerPulse}
                  disabled={pulseTriggering}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  {pulseTriggering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Launching Pulse Check...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Trigger Random Check Now
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
                    <Clock className="w-4 h-4" />
                    <span>Time Remaining:</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {Math.floor(pulseCountdown / 60)}:{(pulseCountdown % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 font-medium block">Selected Targets ({activePulseSession.targets?.length || 0}):</span>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {activePulseSession.targets?.map((target) => (
                      <div
                        key={target.student_id}
                        className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-semibold text-zinc-200">{target.name}</div>
                          <div className="font-mono text-[10px] text-zinc-500">{target.roll_number}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${target.status === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : target.status === 'FAILED'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400 animate-pulse'
                          }`}>                          {target.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActivePulseSession(null)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  Done / Close Monitor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teacher-Only Student Forensic Dossier & Guardian Alert Modal */}
      {selectedDossierStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-sky-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold font-mono text-sm">
                  {selectedDossierStudent.name?.slice(0, 2).toUpperCase() || 'ST'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedDossierStudent.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {selectedDossierStudent.roll}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Teacher Confidential Forensic Attendance Profile</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDossierStudent(null)}
                className="w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(() => {
                  const pct = selectedDossierStudent.total > 0
                    ? Math.round((selectedDossierStudent.attended / selectedDossierStudent.total) * 100)
                    : 100;
                  const isLow = pct < 75;
                  const safeBunks = Math.max(0, Math.floor((selectedDossierStudent.attended - 0.75 * selectedDossierStudent.total) / 0.75));
                  const needLectures = Math.max(0, Math.ceil((0.75 * selectedDossierStudent.total - selectedDossierStudent.attended) / 0.25));

                  return (
                    <>
                      <div className={`p-3.5 rounded-xl border ${isLow ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Aggregate Ratio</div>
                        <div className="text-2xl font-black font-mono mt-1">{pct}%</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{selectedDossierStudent.attended} of {selectedDossierStudent.total} lectures</div>
                      </div>

                      <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-zinc-800">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Academic Standing</div>
                        <div className="mt-1">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                              Critical Detention
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Exam Eligible
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">Min required: 75%</div>
                      </div>

                      <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-zinc-800">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Lecture Bunk Allowance</div>
                        <div className="text-lg font-bold font-mono text-zinc-200 mt-1">
                          {isLow ? `+${needLectures} required` : `${safeBunks} safe bunks`}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {isLow ? 'to reach 75% threshold' : 'without detention penalty'}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Guardian Notice Dispatcher */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-gradient-to-r from-amber-500/10 via-zinc-900/60 to-zinc-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Guardian Academic Dispatch (WhatsApp)
                  </div>
                  <p className="text-[11px] text-zinc-400 max-w-md">
                    Send instant pre-formatted detention warning notice with live lecture stats directly to student's parent/guardian phone.
                  </p>
                </div>
                <a
                  href={`https://api.whatsapp.com/send?text=${generateGuardianAlert(selectedDossierStudent)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Notice
                </a>
              </div>

              {/* Recent Attendance Timeline */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Historical Lecture Check-ins</div>
                <div className="border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/80 max-h-56 overflow-y-auto">
                  {selectedDossierStudent.logs && selectedDossierStudent.logs.length > 0 ? (
                    selectedDossierStudent.logs.slice().reverse().map((lg) => {
                      const tb = lg.trust_breakdown || {};
                      return (
                        <div key={lg.id} className="p-3 bg-zinc-900/40 hover:bg-zinc-900/80 transition flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-zinc-400 text-[11px]">{lg.date}</span>
                            <span className="font-mono font-semibold text-zinc-300">{tb.period || 'Period 1'}</span>
                            {tb.in_time && (
                              <span className="text-[11px] text-zinc-500">In: {tb.in_time}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {lg.verification_status === 'proxy_suspect' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                PROXY SUSPECT
                              </span>
                            ) : lg.is_present ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                PRESENT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                ABSENT
                              </span>
                            )}
                            <button
                              onClick={() => toggleOverride(lg.id, lg.is_present)}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition cursor-pointer"
                            >
                              Toggle
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-zinc-500">No attendance entries recorded for this student yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex justify-end">
              <button
                onClick={() => setSelectedDossierStudent(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Copilot Assistant Drawer */}
      <CopilotDrawer role="teacher" user={teacher} activeSubjectId={selectedSubId} />
    </div>
  );
}
