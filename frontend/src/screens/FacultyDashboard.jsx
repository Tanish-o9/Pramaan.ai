import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from '../components/Toast';
import QRCode from 'qrcode';
import KioskScreen from './KioskScreen';
import CopilotDrawer from '../components/CopilotDrawer';
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
  Volume2
} from 'lucide-react';

export default function FacultyDashboard({ teacher }) {
  const [tab, setTab] = useState('attendance'); // 'attendance' | 'analytics' | 'leaves' | 'subjects' | 'logs' | 'settings'
  const [subjects, setSubjects] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Group Photo Mode State
  const [groupPhotoFile, setGroupPhotoFile] = useState(null);
  const [groupScanResult, setGroupScanResult] = useState(null);

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

  // Logs & Overrides
  const [records, setRecords] = useState([]);
  const [sessionTime, setSessionTime] = useState('');

  // AI & Quality Settings
  const [settings, setSettings] = useState({
    face_match_threshold: 0.60,
    liveness_ear_threshold: 0.16,
    liveness_enabled: true
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSubjects = async () => {
    try {
      const res = await api.getSubjects();
      setSubjects(res || []);
      if (res && res.length > 0 && !selectedSubId) {
        setSelectedSubId(res[0].subject_id);
      }
    } catch (err) {
      console.error(err);
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
  }, [teacher.teachers_id]);

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
    if (!selectedSubId) return;
    setScanning(true);
    try {
      let res;
      if (mode === 'photos') {
        if (!photoFiles.length) throw new Error('Select at least one classroom photo');
        res = await api.analyzePhotos(selectedSubId, photoFiles);
      } else if (mode === 'video') {
        if (!videoFile) throw new Error('Select a classroom video file');
        res = await api.analyzeVideo(selectedSubId, videoFile);
      } else if (mode === 'voice') {
        if (!voiceFile) throw new Error('Select a classroom audio file');
        res = await api.analyzeVoice(selectedSubId, voiceFile);
      }
      setReview(res.results || []);
      toast(`AI Scan complete: ${res.results.filter(r => r.is_present).length} identified present`, 'info');
    } catch (err) {
      toast(err.message || 'Scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  // Save session
  const handleSave = async () => {
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

  // Group / Class Photo Scan
  const handleGroupPhotoScan = async () => {
    if (!groupPhotoFile || !selectedSubId) return;
    setScanning(true);
    try {
      const res = await api.takeGroupPhotoAttendance(Number(selectedSubId), groupPhotoFile);
      setGroupScanResult(res);
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
            method: 'group_photo_dlib',
            bounding_box: match ? match.bounding_box : null,
            distance: match ? match.distance : null
          }
        };
      });
      setReview(newReview);
      toast(`Classroom photo: ${res.recognized_count} students recognized (${res.total_faces_detected} faces found)`, 'success');
    } catch (err) {
      toast(err.message || 'Group photo scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  // Trigger Mid-Class Pulse Check
  const handleTriggerPulse = async () => {
    if (!selectedSubId) return;
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

  // Override single log
  const toggleOverride = async (logId, curr) => {
    await api.overrideAttendance(logId, !curr);
    setRecords((prev) => prev.map((r) => r.id === logId ? { ...r, is_present: !curr } : r));
    toast('Attendance status overridden', 'info');
  };

  // Defaulter list for Logs view
  const studentTotals = {};
  records.forEach((r) => {
    const sid = r.student_id;
    if (!studentTotals[sid]) studentTotals[sid] = { name: r.students?.name || 'Student', roll: r.students?.roll_number || '-', total: 0, attended: 0 };
    studentTotals[sid].total += 1;
    if (r.is_present) studentTotals[sid].attended += 1;
  });
  const defaulters = Object.values(studentTotals).filter((st) => st.total >= 3 && (st.attended / st.total) * 100 < 75);

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

      {/* Floating Modern Pill Navigation */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-white/5 overflow-x-auto">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/90 border border-zinc-800/90 shadow-inner">
          <button
            onClick={() => setTab('attendance')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'attendance' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>Take Attendance</span>
          </button>

          <button
            onClick={() => setTab('seatmap')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'seatmap' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
            <span>Seat Map</span>
          </button>

          <button
            onClick={() => setTab('analytics')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'analytics' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Risk Radar</span>
          </button>

          <button
            onClick={() => setTab('leaves')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'leaves' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200'
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
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'subjects' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Subjects & Roster</span>
          </button>

          <button
            onClick={() => setTab('logs')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'logs' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-violet-400" />
            <span>Logbook & Export</span>
          </button>

          <button
            onClick={() => setTab('settings')}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              tab === 'settings' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* 1. ATTENDANCE TAB */}
      {tab === 'attendance' && (
        <div className="panel-card rounded-2xl p-6 border border-zinc-800/80 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-white/5">
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" /> Take Class Attendance
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Select active subject lecture and preferred capture studio</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-zinc-400 font-medium">Class:</span>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer bg-zinc-900 border border-zinc-700/80 text-white w-full sm:w-auto shadow-sm"
                >
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.name} ({s.subject_code} - Sec {s.section})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6 text-xs">
            <button
              onClick={() => { setMode('live_camera'); setReview(null); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-98 ${
                mode === 'live_camera' 
                  ? 'bg-zinc-800/90 border-emerald-500/50 text-white font-bold shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30' 
                  : 'bg-zinc-900/60 hover:bg-zinc-800/50 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 relative">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1 opacity-75"></span>
                <Camera className="w-4 h-4" />
              </div>
              <span className="font-medium text-emerald-300">Live Camera</span>
            </button>
            <button
              onClick={() => { setMode('photos'); setReview(null); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-98 ${
                mode === 'photos' 
                  ? 'bg-zinc-800/90 border-sky-500/50 text-white font-bold shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/30' 
                  : 'bg-zinc-900/60 hover:bg-zinc-800/50 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Camera className="w-4 h-4" />
              </div>
              <span className="font-medium">Multi-Photo</span>
            </button>
            <button
              onClick={() => { setMode('group_photo'); setReview(null); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-98 ${
                mode === 'group_photo' 
                  ? 'bg-zinc-800/90 border-cyan-500/50 text-white font-bold shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30' 
                  : 'bg-zinc-900/60 hover:bg-zinc-800/50 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-medium">Class Photo</span>
            </button>
            <button
              onClick={() => { setMode('voice_command'); setReview(null); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-98 ${
                mode === 'voice_command' 
                  ? 'bg-zinc-800/90 border-emerald-500/50 text-white font-bold shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30' 
                  : 'bg-zinc-900/60 hover:bg-zinc-800/50 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Mic className="w-4 h-4" />
              </div>
              <span className="font-medium">Voice AI</span>
            </button>
            <button
              onClick={() => { setMode('video'); setReview(null); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-98 ${
                mode === 'video' 
                  ? 'bg-zinc-800/90 border-violet-500/50 text-white font-bold shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30' 
                  : 'bg-zinc-900/60 hover:bg-zinc-800/50 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Video className="w-4 h-4" />
              </div>
              <span className="font-medium">Video Pan</span>
            </button>
            <button
              onClick={() => { setMode('voice'); setReview(null); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-98 ${
                mode === 'voice' 
                  ? 'bg-zinc-800/90 border-amber-500/50 text-white font-bold shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30' 
                  : 'bg-zinc-900/60 hover:bg-zinc-800/50 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <span className="font-medium">Single Voice</span>
            </button>
            <button
              onClick={() => { setMode('manual'); setReview(null); loadManualList(); }}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-98 ${
                mode === 'manual' 
                  ? 'bg-zinc-800/90 border-rose-500/50 text-white font-bold shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/30' 
                  : 'bg-zinc-900/60 hover:bg-zinc-800/50 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="font-medium">Manual</span>
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
            <div className="border border-dashed border-zinc-800 p-8 rounded-xl text-center">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-zinc-100 mb-1">Classroom Pan / Wide Group Photo</h3>
              <p className="text-xs text-zinc-400 mb-3 max-w-md mx-auto">
                Upload a single wide-angle photo of the entire classroom. Our pipeline detects every face in the frame simultaneously and maps them to enrolled student embeddings.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setGroupPhotoFile(e.target.files[0])}
                className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-zinc-200 cursor-pointer"
              />
              {groupPhotoFile && (
                <div className="mt-4">
                  <button
                    onClick={handleGroupPhotoScan}
                    disabled={scanning}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold rounded text-xs transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting All Faces in Classroom...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Scan Entire Class Photo
                      </>
                    )}
                  </button>
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
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-lg ${
                    isListening 
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
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="mt-4 px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer disabled:opacity-50"
                >
                  {scanning ? 'Detecting Faces with dlib...' : `Scan ${photoFiles.length} Photo(s)`}
                </button>
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
                    className={`p-2.5 rounded border text-xs flex justify-between items-center cursor-pointer ${
                      st.is_present ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-zinc-950 border-zinc-900 text-zinc-500'
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
                        className={`rounded-lg border text-xs transition ${
                          r.is_present
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
                                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border ${
                                      isHigh
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
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition ${
                                r.is_present
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
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[92px] ${
                      isVacant
                        ? 'bg-zinc-950/60 border-dashed border-zinc-800/80 text-zinc-600'
                        : isPresent
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-zinc-200 shadow-sm'
                        : 'bg-rose-950/20 border-rose-500/30 text-zinc-300'
                    }`}
                  >
                    <div className="flex justify-between items-start text-[10px] text-zinc-400">
                      <span className="font-mono font-semibold">{seat.seat_id}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        isVacant
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
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                            leave.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
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

      {/* 3. LOGS TAB */}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="panel rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">Subject:</span>
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                className="px-2.5 py-1 rounded text-xs cursor-pointer"
              >
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.subject_code})</option>
                ))}
              </select>

              <span className="text-zinc-400 ml-2">Session:</span>
              <select
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="px-2.5 py-1 rounded text-xs font-mono cursor-pointer"
              >
                {[...new Set(records.map((r) => r.timestamp))].sort().reverse().map((t) => (
                  <option key={t} value={t}>{new Date(t).toLocaleString()}</option>
                ))}
              </select>
            </div>

            <a
              href={`/api/attendance/export/csv/${selectedSubId}`}
              download
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded transition cursor-pointer"
            >
              <Download className="w-3 h-3" /> Export LMS CSV
            </a>
          </div>

          {/* Defaulter Alert Notice */}
          {defaulters.length > 0 && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex justify-between items-center">
              <div>
                <strong className="block font-semibold">Attendance Shortage Alert</strong>
                <span>{defaulters.length} student(s) below 75% threshold in this subject.</span>
              </div>
              <button
                onClick={() => {
                  const subObj = subjects.find((s) => s.subject_id === parseInt(selectedSubId));
                  const draft = `NOTICE: Attendance below 75% in ${subObj?.name || 'Class'}. Meet your advisor.`;
                  navigator.clipboard.writeText(draft);
                  toast('Notification template copied to clipboard!', 'info');
                }}
                className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 rounded text-rose-200 hover:bg-rose-500/30 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy Notice
              </button>
            </div>
          )}

          {/* Record entries */}
          <div className="panel rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Roll No</th>
                  <th className="py-2.5 px-4 font-medium">Student</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Trust Score</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {records.filter((r) => r.timestamp === sessionTime).map((r) => {
                  const tScore = r.trust_score;
                  return (
                    <tr key={r.id}>
                      <td className="py-2 px-4 font-mono text-zinc-400">{r.students?.roll_number || '-'}</td>
                      <td className="py-2 px-4 text-zinc-200 font-medium">{r.students?.name || 'Unknown'}</td>
                      <td className="py-2 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${r.is_present ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {r.is_present ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        {tScore !== null && tScore !== undefined ? (
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                            tScore >= 80 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                            tScore >= 50 ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                            'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          }`}>
                            {tScore}%
                          </span>
                        ) : (
                          <span className="text-zinc-600 font-mono text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          onClick={() => toggleOverride(r.id, r.is_present)}
                          className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                        >
                          Toggle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                          pulseSampleSize === num
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          target.status === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : target.status === 'FAILED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400 animate-pulse'
                        }`}>
                          {target.status}
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

      {/* Floating AI Copilot Assistant Drawer */}
      <CopilotDrawer role="teacher" user={teacher} activeSubjectId={selectedSubId} />
    </div>
  );
}
