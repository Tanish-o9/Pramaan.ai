import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import VoiceRecorder from '../components/VoiceRecorder';
import { toast } from '../components/Toast';
import { Camera, KeyRound, UserPlus, ShieldCheck, ArrowRight, RefreshCw, Upload, Loader2, AlertCircle, Info, Mic } from 'lucide-react';

export default function StudentAuth({ onAuthSuccess }) {
  const [tab, setTab] = useState('face'); // 'face' | 'pin' | 'register'
  const [roll, setRoll] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [voiceBlob, setVoiceBlob] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [shutterWarning, setShutterWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Callback ref guarantees instant stream attachment whenever <video> enters the DOM
  const attachVideo = (el) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.muted = true;
      el.play().catch(() => {});
    }
  };

  const startCamera = async () => {
    setError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      setCameraActive(false);
      let msg = 'Camera error: ' + (err.message || 'Unable to open camera');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please click the lock icon in your browser address bar and choose "Allow".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. Please connect a webcam or upload a photo below.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Webcam is in use by another app (e.g. Zoom, Teams, or another window). Please close it and retry.';
      }
      setError(msg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (tab === 'face' || tab === 'register') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [tab]);

  // Monitor live camera stream to detect hardware privacy shutter / closed slider
  useEffect(() => {
    if (!cameraActive) {
      setShutterWarning(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 64, 48);
        const imgData = ctx.getImageData(0, 0, 64, 48).data;

        let sum = 0;
        let sumSq = 0;
        let samples = 0;
        for (let i = 0; i < imgData.length; i += 16) {
          const brightness = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
          sum += brightness;
          sumSq += brightness * brightness;
          samples++;
        }
        if (samples > 0) {
          const mean = sum / samples;
          const variance = (sumSq / samples) - (mean * mean);
          const stdDev = Math.sqrt(Math.max(0, variance));

          // Solid black, pitch dark, or uniform gray lock-screen placeholder from hardware
          const isBlocked = mean < 12 || (stdDev < 6.0 && (mean < 65 || (mean > 105 && mean < 155)));
          setShutterWarning(isBlocked);
        }
      } catch (e) {
        // ignore
      }
    }, 1200);

    return () => clearInterval(checkInterval);
  }, [cameraActive]);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) {
      throw new Error('Camera is not active. Click "Enable Camera" or upload a selfie image.');
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Camera is warming up. Please wait 1 second and click again.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Frame quality & shutter / lock screen check
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let sum = 0;
      let sumSq = 0;
      let samples = 0;
      // sample every 32 bytes (8 pixels) for speed
      for (let i = 0; i < data.length; i += 32) {
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += brightness;
        sumSq += brightness * brightness;
        samples++;
      }
      if (samples > 0) {
        const mean = sum / samples;
        const variance = (sumSq / samples) - (mean * mean);
        const stdDev = Math.sqrt(Math.max(0, variance));

        // Solid black (e.g. shutter closed), pitch dark, or uniform gray lock screen placeholder
        if (mean < 12) {
          throw new Error('Camera feed is pitch black! Your webcam physical shutter/slider is closed or lighting is too dark. Please slide open your webcam cover, or click "Upload Photo" below.');
        }
        if (stdDev < 5.0 && (mean < 60 || (mean > 110 && mean < 145))) {
          throw new Error('Camera appears blocked by Windows privacy lock or a physical slider. Please open your laptop camera shutter switch or click "Upload Photo" below.');
        }
      }
    } catch (checkErr) {
      if (checkErr.message && (checkErr.message.includes('privacy') || checkErr.message.includes('pitch black') || checkErr.message.includes('blocked'))) {
        throw checkErr;
      }
    }

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95));
  };

  // Face ID Login
  const handleFaceLogin = async (blobToUse = null) => {
    setError('');
    setLoading(true);
    try {
      let blob = blobToUse;
      if (!blob) {
        blob = await captureFrame();
      }
      if (!blob) throw new Error('Could not capture frame from camera');
      const res = await api.studentFaceLogin(blob);
      stopCamera();
      toast(`Welcome back, ${res.student.name}!`, 'success');
      onAuthSuccess(res.student, 'student', { mustChangePin: res.must_change_pin });
    } catch (err) {
      setError(err.message || 'Face matching failed. Try again or use Roll No.');
    } finally {
      setLoading(false);
    }
  };

  // PIN Login
  const handlePinLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.studentPinLogin(roll.trim(), pin.trim());
      toast(`Welcome back, ${res.student.name}!`, 'success');
      onAuthSuccess(res.student, 'student', { mustChangePin: res.must_change_pin });
    } catch (err) {
      setError(err.message || 'Invalid Roll Number or PIN');
    } finally {
      setLoading(false);
    }
  };

  // Student Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!photoBlob) {
      setError('Please take a photo or upload an image for your biometric profile.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('roll_number', regRoll.trim().toUpperCase());
      fd.append('pin', '1234');
      fd.append('face_image', photoBlob, 'face.jpg');
      if (voiceBlob) {
        fd.append('voice_audio', voiceBlob, 'voice.wav');
      }

      await api.studentRegister(fd);
      toast('Registration successful! Profile created.', 'success');
      const res = await api.studentPinLogin(regRoll.trim().toUpperCase(), '1234');
      onAuthSuccess(res.student, 'student', { mustChangePin: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isNoFaceProfilesError = error && (
    error.includes('No registered face profiles') ||
    error.includes('No face profiles')
  );

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-14 w-full">
      <div className="rounded-2xl p-6 sm:p-7 bg-[#111624] border border-[#1e2a3f] shadow-lg">
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Student Portal Sign In</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in with Face ID or Roll Number & PIN</p>
        </div>

        <div className="grid grid-cols-3 p-1 rounded-lg bg-[#0c101a] border border-[#1b2538] text-xs mb-6">
          <button
            onClick={() => { setTab('face'); setError(''); }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              tab === 'face' 
                ? 'bg-zinc-800 text-white shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Face ID
          </button>
          <button
            onClick={() => { setTab('pin'); setError(''); }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              tab === 'pin' 
                ? 'bg-zinc-800 text-white shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Roll & PIN
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              tab === 'register' 
                ? 'bg-zinc-800 text-white shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
            {(error.includes('No face found') || error.includes('Liveness') || error.includes('blocked') || error.includes('shutter') || error.includes('black')) && (
              <div className="mt-2 pt-2 border-t border-rose-500/20 text-[11px] text-zinc-300 leading-relaxed">
                <span className="font-semibold text-amber-300">Tip:</span> If you see a grey box with a lock icon or black screen, your laptop's physical camera slider is closed or Windows blocked the lens. Slide open the webcam cover, or click <span className="font-semibold text-zinc-100">"Upload selfie"</span> below.
              </div>
            )}
            {isNoFaceProfilesError && (
              <button
                type="button"
                onClick={() => { setTab('register'); setError(''); }}
                className="mt-2.5 w-full py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold rounded text-xs transition cursor-pointer text-center block border border-rose-500/30"
              >
                Register Your Biometric Profile Now &rarr;
              </button>
            )}
          </div>
        )}

        {/* 1. FACE ID LOGIN */}
        {tab === 'face' && (
          <div>
            <div className="relative h-56 w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 mb-3 flex items-center justify-center">
              <video 
                ref={attachVideo} 
                autoPlay 
                playsInline 
                muted 
                style={{ transform: 'scaleX(-1)' }}
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`} 
              />
              
              {cameraActive ? (
                <>
                  <div className="absolute inset-0 border border-zinc-700/50 rounded-lg pointer-events-none flex items-center justify-center">
                    <div className="w-36 h-48 border border-zinc-400/40 rounded-full"></div>
                  </div>
                  {shutterWarning && (
                    <div className="absolute inset-x-3 bottom-9 p-2 rounded-lg bg-amber-500/95 text-zinc-950 text-[11px] font-semibold text-center backdrop-blur-sm shadow-xl flex items-center justify-center gap-1.5 animate-pulse z-10">
                      <AlertCircle className="w-4 h-4 shrink-0 text-zinc-950" />
                      <span>Laptop webcam slider/shutter band hai! Upar lens ka cover slide karein.</span>
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-300 border border-zinc-800 flex items-center gap-1 backdrop-blur-xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Liveness Active
                  </span>
                  <button
                    type="button"
                    onClick={startCamera}
                    title="Restart Camera"
                    className="absolute top-2 right-2 text-zinc-400 hover:text-white p-1 rounded bg-zinc-900/80 border border-zinc-800 cursor-pointer backdrop-blur-xs text-[10px] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div className="text-center p-4">
                  <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 mb-3">Camera access needed for Face ID</p>
                  <button 
                    type="button"
                    onClick={startCamera} 
                    className="text-xs px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded shadow cursor-pointer transition"
                  >
                    Enable Camera
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleFaceLogin()}
              disabled={loading || !cameraActive}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying Face...
                </>
              ) : (
                <>
                  Sign In with Face ID <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Fallback Photo Upload & Roll Login option */}
            <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <label className="hover:text-zinc-300 cursor-pointer inline-flex items-center gap-1">
                <Upload className="w-3 h-3" /> Upload selfie
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFaceLogin(file);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => { setTab('pin'); setError(''); }}
                className="hover:text-zinc-300 cursor-pointer"
              >
                Use Roll & PIN instead
              </button>
            </div>
          </div>
        )}

        {/* 2. ROLL & PIN LOGIN */}
        {tab === 'pin' && (
          <form onSubmit={handlePinLogin} className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Roll Number</label>
              <input
                type="text"
                value={roll}
                onChange={(e) => setRoll(e.target.value.toUpperCase())}
                placeholder="22CS042"
                className="w-full px-3 py-2 rounded-md text-xs uppercase"
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-zinc-400">PIN</label>
                <span className="text-[10px] text-zinc-500">Default: 1234</span>
              </div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
                className="w-full px-3 py-2 rounded-md text-xs font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-3 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setTab('face'); setError(''); }}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                &larr; Switch to Face ID Login
              </button>
            </div>
          </form>
        )}

        {/* 3. STUDENT REGISTRATION */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full px-3 py-2 rounded-md text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Roll Number</label>
              <input
                type="text"
                value={regRoll}
                onChange={(e) => setRegRoll(e.target.value.toUpperCase())}
                placeholder="22CS042"
                className="w-full px-3 py-2 rounded-md text-xs uppercase"
                required
              />
            </div>

            {/* 1. Face Photo Box */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Face Reference Photo</label>
              <div className="relative h-44 w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                {photoPreview ? (
                  <div className="relative w-full h-full">
                    <img src={photoPreview} alt="Face sample" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhotoBlob(null); setPhotoPreview(null); startCamera(); }}
                      className="absolute bottom-2 right-2 text-[10px] px-2 py-1 bg-zinc-900/90 border border-zinc-700 text-zinc-200 rounded flex items-center gap-1 cursor-pointer hover:bg-zinc-800"
                    >
                      <RefreshCw className="w-3 h-3" /> Retake
                    </button>
                  </div>
                ) : (
                  <>
                    <video 
                      ref={attachVideo} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ transform: 'scaleX(-1)' }}
                      className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`} 
                    />
                    {cameraActive ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const b = await captureFrame();
                            if (b) { setPhotoBlob(b); setPhotoPreview(URL.createObjectURL(b)); stopCamera(); }
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                        className="absolute bottom-2 text-xs px-3.5 py-1 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded shadow cursor-pointer transition"
                      >
                        Take Photo
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={startCamera} 
                        className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 cursor-pointer"
                      >
                        Enable Camera
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Upload Option */}
              <div className="flex items-center justify-center gap-2 py-1">
                <label className="text-[11px] px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded border border-zinc-800 cursor-pointer inline-flex items-center gap-1.5 transition">
                  <Upload className="w-3 h-3 text-zinc-400" /> Or Upload Photo File
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setPhotoBlob(file);
                        setPhotoPreview(URL.createObjectURL(file));
                        stopCamera();
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* 2. Voice Sample Recording Section */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1 flex items-center justify-between">
                <span>Voice Biometric Sample <span className="text-zinc-500">(Optional / Recommended)</span></span>
                {voiceBlob && <span className="text-[10px] text-emerald-400 font-semibold">Recorded</span>}
              </label>
              <VoiceRecorder onRecorded={(blob) => setVoiceBlob(blob)} />
            </div>

            <button
              type="submit"
              disabled={loading || !photoBlob}
              className="w-full mt-2 py-2.5 px-3 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Profile...
                </>
              ) : (
                <>
                  Complete Registration <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
