import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function KioskScreen({ subject, onExit }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [lastMatch, setLastMatch] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Position your face inside the target frame...');
  const [stats, setStats] = useState({ markedCount: 0, lastCheckTime: null });
  const cooldownCache = useRef(new Map()); // student_id -> timestamp

  // Sound Synthesizer: Clean high-tech "ding" chime without external audio files
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  };

  // Start Camera
  useEffect(() => {
    let activeStream = null;
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      })
      .then((s) => {
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        setStatusMessage(`Camera access denied or unavailable: ${err.message}`);
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Continuous Auto-Capture Loop
  useEffect(() => {
    if (!stream || !isScanning || !subject?.subject_id) return;

    let isProcessing = false;
    const interval = setInterval(async () => {
      if (isProcessing) return;
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState !== 4) return;

      isProcessing = true;
      try {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        if (!blob) {
          isProcessing = false;
          return;
        }

        const res = await api.verifyKioskFace(subject.subject_id, blob);

        if (res.status === 'success' || res.status === 'already_marked') {
          const student = res.student;
          const now = Date.now();
          const lastSeen = cooldownCache.current.get(student.student_id) || 0;

          // Only trigger celebratory chime if not recently seen in last 30 seconds
          if (now - lastSeen > 30000) {
            cooldownCache.current.set(student.student_id, now);
            playSuccessChime();
            setLastMatch({
              name: student.name,
              roll: student.roll_number,
              confidence: res.confidence,
              isNew: res.status === 'success',
            });
            if (res.status === 'success') {
              setStats((prev) => ({ ...prev, markedCount: prev.markedCount + 1 }));
            }
            setStatusMessage(`Verified: ${student.name} (${student.roll_number})`);
            setTimeout(() => setLastMatch(null), 4000);
          }
        } else if (res.status === 'liveness_failed') {
          setStatusMessage('Liveness check: please blink or align face.');
        } else {
          setStatusMessage('Looking for enrolled students...');
        }
      } catch (err) {
        // Silent catch for smooth continuous loop
      } finally {
        isProcessing = false;
      }
    }, 2200);

    return () => clearInterval(interval);
  }, [stream, isScanning, subject]);

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col text-zinc-100 select-none overflow-hidden font-sans">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Status Header */}
      <div className="p-4 sm:p-6 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              Pramaan Kiosk
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {subject?.subject_code} • {subject?.name}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Classroom Hands-Free Walk-Up Biometric Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-mono text-emerald-400">{stats.markedCount} Marked Today</div>
            <div className="text-[11px] text-zinc-500">Auto-Scan Active</div>
          </div>
          <button
            onClick={onExit}
            className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-xs font-medium text-zinc-200 hover:text-white transition-all"
          >
            Exit Kiosk
          </button>
        </div>
      </div>

      {/* Main Viewfinder Section */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover opacity-90 scale-x-[-1]"
        />

        {/* Target Guide Oval Overlay */}
        <div className="relative pointer-events-none flex flex-col items-center justify-center">
          <div
            className={`w-72 h-96 sm:w-80 sm:h-[420px] rounded-[100px] border-2 transition-all duration-300 flex items-center justify-center relative ${
              lastMatch
                ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)] bg-emerald-500/10'
                : 'border-zinc-500/40 border-dashed'
            }`}
          >
            {/* Animated scanning line */}
            {!lastMatch && (
              <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2"></div>
            )}
          </div>

          <div className="mt-6 px-4 py-2 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-xs text-zinc-300 shadow-xl">
            {statusMessage}
          </div>
        </div>

        {/* Celebration Popup Banner */}
        {lastMatch && (
          <div className="absolute top-8 inset-x-4 max-w-md mx-auto p-4 rounded-2xl bg-zinc-900/95 border border-emerald-500/80 shadow-2xl backdrop-blur-xl flex items-center gap-4 animate-bounce">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl font-bold">
              ✓
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold font-mono">
                {lastMatch.isNew ? 'Attendance Recorded' : 'Already Present'}
              </div>
              <div className="text-base font-bold text-zinc-100">{lastMatch.name}</div>
              <div className="text-xs text-zinc-400 font-mono">Roll: {lastMatch.roll} • {lastMatch.confidence}% Match</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div>Continuous Face Recognition & Liveness Protection Active</div>
        <div>Pramaan High-Speed Pipeline • 128-d ResNet</div>
      </div>
    </div>
  );
}

