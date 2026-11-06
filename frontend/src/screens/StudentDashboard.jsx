import React, { useState, useEffect } from 'react';
import { api } from '../api';
import VoiceRecorder from '../components/VoiceRecorder';
import CopilotDrawer from '../components/CopilotDrawer';
import { toast } from '../components/Toast';
import { Plus, Trash2, X, RefreshCw, CheckCircle2, Mic, UserCheck, KeyRound, Loader2, AlertCircle, FileText, Upload } from 'lucide-react';

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
      {/* Top Banner */}
      <div className="panel rounded-xl p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Welcome, {student.name}</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Roll: <span className="font-mono text-zinc-300 font-medium">{student.roll_number}</span> · Overall Attendance: <span className={overallPct >= 75 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{overallPct}%</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              activeTab === 'classes' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            My Classes
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'leaves' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Leave & OD
            {leaves.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300 font-mono">
                {leaves.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> Biometric Profile
          </button>
          <button
            onClick={() => setShowEnroll(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Join Class</span>
          </button>
        </div>
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
            <div className="panel rounded-xl p-8 text-center text-xs text-zinc-400">
              No enrolled classes found. Ask your faculty for a subject join code.
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

      {/* Floating AI Copilot Drawer */}
      <CopilotDrawer role="student" user={student} />
    </div>
  );
}
