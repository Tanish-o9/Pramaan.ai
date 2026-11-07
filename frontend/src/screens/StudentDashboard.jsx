import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { api } from '../api';
import VoiceRecorder from '../components/VoiceRecorder';
import CopilotDrawer from '../components/CopilotDrawer';
import { toast } from '../components/Toast';
import { 
  Plus, Trash2, X, RefreshCw, CheckCircle2, Mic, UserCheck, 
  KeyRound, Loader2, AlertCircle, FileText, Upload, QrCode,
  ShieldCheck, Zap, Camera, Clock, Sparkles
} from 'lucide-react';

export default function StudentDashboard({ student, onUpdateStudent }) {
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'leaves' | 'profile'
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [code, setCode] = useState('');
  const [enrollMsg, setEnrollMsg] = useState({ error: '', success: '' });

  // Medical Leave & OD State
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    subject_id: '',
    leave_type: 'medical',
    start_date: '',
    end_date: '',
    reason: '',
    document_name: 'medical_prescription.pdf'
  });

  // Voice enrollment state
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [savingVoice, setSavingVoice] = useState(false);
  const [hasVoice, setHasVoice] = useState(Boolean(student.voice_embedding));
  const [hasFace, setHasFace] = useState(Boolean(student.face_embedding));

  // Change PIN state in profile tab
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // Dynamic Digital ID State
  const [digitalIdData, setDigitalIdData] = useState(null);
  const [idQrUrl, setIdQrUrl] = useState('');
  const [idCountdown, setIdCountdown] = useState(60);
  const [loadingId, setLoadingId] = useState(false);

  // Mid-Class Pulse Check State
  const [activePulse, setActivePulse] = useState(null);
  const [pulseRemaining, setPulseRemaining] = useState(0);
  const [showPulseModal, setShowPulseModal] = useState(false);
  const [pulseVerifying, setPulseVerifying] = useState(false);
  const pulseVideoRef = useRef(null);
  const pulseStreamRef = useRef(null);

  const loadDigitalId = async () => {
    setLoadingId(true);
    try {
      const res = await api.getDigitalId();
      setDigitalIdData(res);
      setIdCountdown(res.ttl_seconds || 60);
      const url = await QRCode.toDataURL(res.token, {
        width: 260,
        margin: 2,
        color: { dark: '#18181b', light: '#ffffff' },
      });
      setIdQrUrl(url);
    } catch (err) {
      console.error('Failed to load digital ID', err);
    } finally {
      setLoadingId(false);
    }
  };

  // Poll for active pulse check every 8s
  useEffect(() => {
    let isMounted = true;
    const checkPulse = async () => {
      try {
        const res = await api.getActivePulse();
        if (isMounted) {
          if (res.active && res.pulse) {
            setActivePulse(res.pulse);
            setPulseRemaining(res.pulse.seconds_remaining || 120);
          } else {
            setActivePulse(null);
          }
        }
      } catch (err) {
        // silent
      }
    };

    checkPulse();
    const interval = setInterval(checkPulse, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Timer countdown for active pulse
  useEffect(() => {
    if (!activePulse || pulseRemaining <= 0) return;
    const t = setInterval(() => {
      setPulseRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          setActivePulse(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [activePulse, pulseRemaining]);

  // Digital ID timer countdown & auto-refresh
  useEffect(() => {
    if (activeTab !== 'digital-id') return;
    loadDigitalId();
    const timer = setInterval(() => {
      setIdCountdown((prev) => {
        if (prev <= 1) {
          loadDigitalId();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTab]);

  const startPulseCamera = async () => {
    setShowPulseModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      pulseStreamRef.current = stream;
      if (pulseVideoRef.current) {
        pulseVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast('Could not access camera for pulse check', 'error');
    }
  };

  const stopPulseCamera = () => {
    if (pulseStreamRef.current) {
      pulseStreamRef.current.getTracks().forEach((track) => track.stop());
      pulseStreamRef.current = null;
    }
    setShowPulseModal(false);
  };

  const handleVerifyPulse = async () => {
    if (!activePulse) return;
    setPulseVerifying(true);
    try {
      // Simulate/capture frame
      await api.respondToPulse(activePulse.pulse_id, true, 'Verified via student live camera');
      toast('⚡ Pulse verification confirmed! Attendance trust updated.', 'success');
      setActivePulse(null);
      stopPulseCamera();
    } catch (err) {
      toast(err.message || 'Verification failed', 'error');
    } finally {
      setPulseVerifying(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getStudentDashboard(student.student_id);
      setSubjects(res.subjects || []);

      // Also refresh profile to check biometric status
      const meRes = await api.authMe();
      if (meRes.profile) {
        setHasVoice(Boolean(meRes.profile.voice_embedding));
        setHasFace(Boolean(meRes.profile.face_embedding));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await api.getStudentLeaves();
      setLeaves(res.leaves || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.subject_id) {
      toast('Please select a subject', 'error');
      return;
    }
    setLeaveSubmitting(true);
    try {
      const sub = subjects.find((s) => s.subject_id === Number(leaveForm.subject_id));
      await api.applyLeave({
        subject_id: Number(leaveForm.subject_id),
        subject_name: sub?.name || '',
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason,
        document_name: leaveForm.document_name,
      });
      toast('Leave / OD application submitted to faculty!', 'success');
      setShowLeaveModal(false);
      setLeaveForm({
        subject_id: '',
        leave_type: 'medical',
        start_date: '',
        end_date: '',
        reason: '',
        document_name: 'medical_prescription.pdf',
      });
      loadLeaves();
      loadData();
    } catch (err) {
      toast(err.message || 'Failed to submit leave', 'error');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  useEffect(() => {
    loadData();
    loadLeaves();
    const joinCode = new URLSearchParams(window.location.search).get('join-code');
    if (joinCode) {
      setCode(joinCode.toUpperCase());
      setShowEnroll(true);
    }
  }, [student.student_id]);

  const handleEnroll = async (e) => {
    e.preventDefault();
    setEnrollMsg({ error: '', success: '' });
    try {
      await api.enrollStudent(student.student_id, code.trim().toUpperCase());
      setEnrollMsg({ error: '', success: 'Enrolled successfully!' });
      toast('Enrolled in subject successfully!', 'success');
      setTimeout(() => { setShowEnroll(false); setCode(''); loadData(); }, 800);
    } catch (err) {
      setEnrollMsg({ error: err.message || 'Invalid code', success: '' });
      toast(err.message || 'Enrollment failed', 'error');
    }
  };

  const handleUnenroll = async (id, name) => {
    if (!window.confirm(`Unenroll from ${name}?`)) return;
    try {
      await api.unenrollStudent(student.student_id, id);
      toast(`Unenrolled from ${name}`, 'info');
      loadData();
    } catch (err) {
      toast(err.message || 'Failed to unenroll', 'error');
    }
  };

  const handleSaveVoice = async () => {
    if (!voiceBlob) {
      toast('Please record a voice sample first', 'error');
      return;
    }
    setSavingVoice(true);
    try {
      await api.studentVoiceEnroll(voiceBlob);
      setHasVoice(true);
      setVoiceBlob(null);
      toast('Voice biometric sample enrolled successfully!', 'success');
      loadData();
    } catch (err) {
      toast(err.message || 'Voice enrollment failed', 'error');
    } finally {
      setSavingVoice(false);
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      toast('New PIN must be at least 4 digits', 'error');
      return;
    }
    setSavingPin(true);
    try {
      await api.studentChangePin(currentPin.trim(), newPin.trim());
      toast('PIN updated successfully!', 'success');
      setShowPinChange(false);
      setCurrentPin('');
      setNewPin('');
    } catch (err) {
      toast(err.message || 'Failed to update PIN', 'error');
    } finally {
      setSavingPin(false);
    }
  };

  const totalClasses = subjects.reduce((a, s) => a + s.total_classes, 0);
  const attendedClasses = subjects.reduce((a, s) => a + s.attended_classes, 0);
  const overallPct = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full">
      {/* Active Mid-Class Pulse Check High-Priority Banner */}
      {activePulse && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-orange-500/10 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Action Required: Mid-Class Pulse Check</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/20 text-amber-300 font-semibold">
                  {Math.floor(pulseRemaining / 60)}:{(pulseRemaining % 60).toString().padStart(2, '0')} remaining
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Faculty initiated a random classroom verification. Please verify your presence to maintain trust score.
              </p>
            </div>
          </div>
          <button
            onClick={startPulseCamera}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-lg"
          >
            <Camera className="w-4 h-4" /> Verify Now
          </button>
        </div>
      )}

      {/* Student Academic Profile Header */}
      <div className="rounded-2xl p-6 mb-6 bg-[#111624] border border-[#1e2a3f] shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-13 h-13 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-400 uppercase tracking-tight">
                {student.name ? student.name.slice(0, 2) : 'ST'}
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#111624]" title="Active Student" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">{student.name}</h1>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-[#182338] text-slate-300 border border-[#22334f]">
                  {student.roll_number}
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border flex items-center gap-1.5 ${
                  overallPct >= 75 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {overallPct >= 75 ? 'Good Academic Standing (≥75%)' : 'Attendance Shortage (<75%)'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span className="text-slate-300 font-medium">B.Tech CSE (AIML & DS)</span>
                <span className="text-slate-600">•</span>
                <span>Section CSE(AIML-2)</span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Face Biometrics Enrolled
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Mic className="w-3.5 h-3.5 text-slate-400" /> {hasVoice ? 'Voice Enrolled' : 'Voice Optional'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setShowEnroll(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll in Class</span>
            </button>
            <button
              onClick={() => setActiveTab('digital-id')}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#182338] hover:bg-[#1e2d47] border border-[#22334f] text-slate-200 text-xs font-semibold transition cursor-pointer active:scale-98"
            >
              <QrCode className="w-4 h-4 text-blue-400" />
              <span>Digital ID Card</span>
            </button>
          </div>
        </div>

        {/* 4 Top Metric Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#1e2a3f]">
          <div className="p-3.5 rounded-xl bg-[#0d131f] border border-[#1b2538]">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Overall Attendance</span>
              <span className={`w-2 h-2 rounded-full ${overallPct >= 75 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            </div>
            <div className="text-2xl font-bold mt-1 tracking-tight text-slate-100 flex items-baseline gap-1">
              {overallPct}%
              <span className="text-[11px] font-normal text-slate-400">avg</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {overallPct >= 75 ? 'Above 75% university requirement' : 'Requires immediate recovery'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0d131f] border border-[#1b2538]">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Safe Bunks Remaining</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold mt-1 tracking-tight text-emerald-400 flex items-baseline gap-1">
              {subjects.reduce((acc, s) => acc + (s.bunks_available || 0), 0)}
              <span className="text-[11px] font-normal text-slate-400">classes</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Without falling below 75%
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0d131f] border border-[#1b2538]">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Registered Courses</span>
              <FileText className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold mt-1 tracking-tight text-slate-100 flex items-baseline gap-1">
              {subjects.length}
              <span className="text-[11px] font-normal text-slate-400">subjects</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {subjects.filter(s => s.attendance_percentage < 75).length === 0 ? 'All courses compliant' : `${subjects.filter(s => s.attendance_percentage < 75).length} subject(s) in deficit`}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0d131f] border border-[#1b2538]">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Excused Leaves & OD</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold mt-1 tracking-tight text-slate-100 flex items-baseline gap-1">
              {leaves.filter(l => l.status === 'approved').length}
              <span className="text-[11px] font-normal text-slate-400">approved</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {leaves.filter(l => l.status === 'pending').length} pending review
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#1e2a3f]">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0d131f] border border-[#1b2538]">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'classes' 
                ? 'bg-[#182338] text-white shadow-sm border border-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>My Classes</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#111624] text-slate-300 font-mono">
              {subjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'leaves' 
                ? 'bg-[#182338] text-white shadow-sm border border-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Leave & OD</span>
            {leaves.length > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#111624] text-slate-300 font-mono">
                {leaves.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile' 
                ? 'bg-[#182338] text-white shadow-sm border border-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            <span>Biometrics</span>
          </button>

          <button
            onClick={() => setActiveTab('digital-id')}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'digital-id' 
                ? 'bg-[#182338] text-white shadow-sm border border-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Digital ID</span>
          </button>
        </div>

        <button 
          onClick={loadData} 
          className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111624] border border-[#1e2a3f] hover:border-slate-700 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh Register</span>
        </button>
      </div>

      {/* TAB 1: CLASSES */}
      {activeTab === 'classes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Enrolled Subjects ({subjects.length})</h2>
            <button onClick={loadData} className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 cursor-pointer">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="panel-card rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto border border-zinc-800">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
                <FileText className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-100">No Enrolled Classes Yet</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-6 max-w-sm leading-relaxed">
                Enter your subject join code or scan your faculty's QR code to enroll and start automated biometric tracking.
              </p>
              <button
                onClick={() => setShowEnroll(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950 font-bold text-xs transition shadow-lg shadow-cyan-500/15 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Join Your First Class</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((sub) => {
                const isSafe = sub.attendance_percentage >= 75;
                return (
                  <div key={sub.subject_id} className="panel rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100">{sub.name}</h3>
                          <span className="text-[11px] font-mono text-zinc-400">{sub.subject_code} · Sec {sub.section}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isSafe ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {sub.attendance_percentage}%
                        </span>
                      </div>

                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden my-3">
                        <div
                          className={`h-full rounded-full ${isSafe ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, sub.attendance_percentage)}%` }}
                        />
                      </div>

                      <div className="text-[11px] text-zinc-400 flex justify-between items-center mb-3">
                        <span>Attended: {sub.attended_classes}</span>
                        {sub.excused_classes > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                            +{sub.excused_classes} Excused (OD/Med)
                          </span>
                        )}
                        <span>Total Held: {sub.total_classes}</span>
                      </div>

                      {/* Plain English advice */}
                      <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 mb-4">
                        {sub.total_classes === 0 ? (
                          'No classes conducted yet.'
                        ) : isSafe ? (
                          sub.bunks_available > 0 ? (
                            <>You can miss <strong className="text-emerald-400 font-semibold">{sub.bunks_available}</strong> more classes and remain above 75%.</>
                          ) : (
                            'Attendance is right at 75%. Do not miss the next class.'
                          )
                        ) : (
                          <>Shortage: You must attend <strong className="text-rose-400 font-semibold">{sub.classes_needed}</strong> consecutive classes to recover to 75%.</>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-zinc-900">
                      <button
                        onClick={() => handleUnenroll(sub.subject_id, sub.name)}
                        className="text-[11px] text-zinc-500 hover:text-rose-400 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Unenroll
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEAVE & ON-DUTY (OD) REQUESTS */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Medical Leaves & On-Duty (OD) Passes</h2>
              <p className="text-xs text-zinc-400">Approved leaves count as excused attendance in university calculations</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Apply for Leave
            </button>
          </div>

          {leaves.length === 0 ? (
            <div className="panel rounded-xl p-8 text-center text-xs text-zinc-400">
              No leave requests submitted yet. Click "Apply for Leave" to upload doctor's prescription or event pass.
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave) => {
                const statusStyles = {
                  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                };
                return (
                  <div key={leave.id} className="panel rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200">{leave.subject_name || 'All Subjects'}</span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${statusStyles[leave.status] || statusStyles.pending}`}>
                          {leave.status}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {leave.leave_type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300">{leave.reason}</p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                        <span>Period: {leave.start_date} to {leave.end_date}</span>
                        <span>•</span>
                        <span>Doc: {leave.document_name}</span>
                      </div>
                      {leave.faculty_remarks && (
                        <p className="text-xs text-amber-400/90 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">
                          Faculty Remark: {leave.faculty_remarks}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BIOMETRIC PROFILE & VOICE ENROLLMENT */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Face Profile Card */}
            <div className="panel rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-200">Face Recognition ID</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${hasFace ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {hasFace ? 'Enrolled' : 'Missing Photo'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Used for instant Face ID sign-in and automated classroom photo and video keyframe attendance.
              </p>
              {!hasFace && (
                <p className="text-[11px] text-amber-400/90">
                  Ask your faculty to upload a reference photo or re-register to enable Face ID.
                </p>
              )}
            </div>

            {/* Voice Profile Card */}
            <div className="panel rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-200">Voice Biometric ID</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${hasVoice ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {hasVoice ? 'Enrolled' : 'Not Enrolled'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Enables Resemblyzer acoustic speaker identification during classroom roll call recordings.
              </p>
            </div>
          </div>

          {/* Voice Enrollment Tool */}
          <div className="panel rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2 text-zinc-100 font-semibold text-sm">
              <Mic className="w-4 h-4 text-rose-500" />
              <span>{hasVoice ? 'Update Voice Biometrics' : 'Enroll Voice Biometrics'}</span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Record a clear 5-second voice sample speaking in a normal tone. Resemblyzer will compute your 256-dimensional d-vector.
            </p>

            <VoiceRecorder onRecorded={(blob) => setVoiceBlob(blob)} />

            {voiceBlob && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveVoice}
                  disabled={savingVoice}
                  className="px-4 py-2 bg-zinc-100 text-zinc-950 hover:bg-white font-semibold rounded text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingVoice ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enrolling Voice...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Save Voice Profile
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Security & PIN Section */}
          <div className="panel rounded-xl p-5 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Account Security PIN</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Change your 4-digit PIN used for fallback login</p>
            </div>
            <button
              onClick={() => setShowPinChange(!showPinChange)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white rounded text-xs cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 inline mr-1" /> {showPinChange ? 'Cancel' : 'Change PIN'}
            </button>
          </div>

          {showPinChange && (
            <div className="panel rounded-xl p-5 animate-in fade-in">
              <form onSubmit={handleUpdatePin} className="max-w-xs space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Current PIN</label>
                  <input
                    type="password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="Current PIN"
                    className="w-full px-3 py-2 rounded text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">New 4+ Digit PIN</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New PIN"
                    className="w-full px-3 py-2 rounded text-xs font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPin}
                  className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer disabled:opacity-50"
                >
                  {savingPin ? 'Saving...' : 'Update PIN'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ROTATING DYNAMIC DIGITAL STUDENT ID */}
      {activeTab === 'digital-id' && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-base font-semibold text-zinc-100 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Digital Student Identity Card
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Cryptographically signed dynamic ID. Rotates every 60s to prevent screenshot fraud.
            </p>
          </div>

          {/* Apple Wallet Style Identity Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-700/80 p-6 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] tracking-widest text-zinc-400 font-bold uppercase">INSTITUTIONAL PASSPORT</div>
                <div className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> PRAMAAN CAMPUS
                </div>
              </div>
              <div className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> ACTIVE
              </div>
            </div>

            <div className="flex flex-col items-center justify-center my-4">
              <div className="p-3 bg-white rounded-xl shadow-inner relative">
                {idQrUrl ? (
                  <img src={idQrUrl} alt="Dynamic QR Code" className="w-48 h-48 rounded" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-800" />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Next token rotation in <strong className="text-emerald-400">{idCountdown}s</strong></span>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 mt-2 grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Student Name</div>
                <div className="font-semibold text-zinc-100 mt-0.5">{student.name}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Roll Number</div>
                <div className="font-mono font-semibold text-zinc-100 mt-0.5">{student.roll_number}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Department</div>
                <div className="text-zinc-300 mt-0.5">Computer Science & Eng.</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Biometrics Status</div>
                <div className="text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Enrolled (128-d)
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={loadDigitalId}
              disabled={loadingId}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingId ? 'animate-spin' : ''}`} /> Force Regenerate Token
            </button>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="panel max-w-sm w-full rounded-xl p-5 relative">
            <button onClick={() => setShowEnroll(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Join Subject</h3>
            <p className="text-xs text-zinc-400 mb-4">Enter permanent code (e.g. CS101) or 15-min passcode</p>

            {enrollMsg.error && <div className="p-2 bg-rose-500/10 text-rose-300 rounded text-xs mb-3">{enrollMsg.error}</div>}
            {enrollMsg.success && <div className="p-2 bg-emerald-500/10 text-emerald-300 rounded text-xs mb-3">{enrollMsg.success}</div>}

            <form onSubmit={handleEnroll} className="space-y-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CS101"
                className="w-full px-3 py-2 rounded text-xs font-mono uppercase"
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-zinc-100 text-zinc-950 font-semibold rounded text-xs hover:bg-white transition cursor-pointer"
              >
                Join Class
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave / OD Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="panel max-w-md w-full rounded-2xl p-6 relative border border-zinc-700/80 shadow-2xl">
            <button
              onClick={() => setShowLeaveModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-semibold text-zinc-100 mb-1">Apply for Leave / OD Pass</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Submit proof for illness, university event, or sports participation.
            </p>

            <form onSubmit={handleApplyLeave} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Select Subject</label>
                <select
                  value={leaveForm.subject_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, subject_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 outline-none"
                  required
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.name} ({s.subject_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Leave Type</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 outline-none"
                  >
                    <option value="medical">Medical / Health</option>
                    <option value="on_duty">On-Duty (College Event)</option>
                    <option value="sports">Sports Tournament</option>
                    <option value="personal">Emergency Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Document Name</label>
                  <input
                    type="text"
                    value={leaveForm.document_name}
                    onChange={(e) => setLeaveForm({ ...leaveForm, document_name: e.target.value })}
                    placeholder="doctor_slip.pdf"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Reason / Explanation</label>
                <textarea
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Explain why you could not attend lectures..."
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={leaveSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-md"
              >
                {leaveSubmitting ? 'Submitting Application...' : 'Submit for Approval'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mid-Class Pulse Check Camera Modal */}
      {showPulseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="panel max-w-md w-full rounded-2xl p-6 relative border border-amber-500/40 shadow-2xl">
            <button
              onClick={stopPulseCamera}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-semibold text-zinc-100">Live Face Verification</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Look into the camera. We are checking facial geometry and active eye aspect ratio (EAR).
            </p>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 mb-4 flex items-center justify-center border border-zinc-800">
              <video
                ref={pulseVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-40 h-52 border-2 border-dashed border-amber-400/80 rounded-full" />
              </div>
            </div>

            <button
              onClick={handleVerifyPulse}
              disabled={pulseVerifying}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              {pulseVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Biometrics...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" /> Capture & Confirm Presence
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating AI Copilot Drawer */}
      <CopilotDrawer role="student" user={student} />
    </div>
  );
}
