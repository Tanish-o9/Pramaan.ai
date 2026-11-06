import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

async function convertBlobToWav(rawBlob) {
  try {
    const arrayBuffer = await rawBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close().catch(() => {});

    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    const dataLength = channelData.length * 2;
    const outBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(outBuffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true); // 16-bit PCM

    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < channelData.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view.buffer], { type: 'audio/wav' });
  } catch (err) {
    console.warn('WAV encode fallback to original blob', err);
    return rawBlob;
  }
}

export default function VoiceRecorder({ onRecorded, minDuration = 3 }) {
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const startRecording = async () => {
    setError('');
    setAudioUrl(null);
    setAudioBlob(null);
    audioChunksRef.current = [];
    cleanup();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio API for real-time waveform level indicator
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // MediaRecorder initialization
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        if (rawBlob.size < 500) {
          setError('Recording too short or silent. Please try again.');
          return;
        }
        const wavBlob = await convertBlobToWav(rawBlob);
        const url = URL.createObjectURL(wavBlob);
        setAudioBlob(wavBlob);
        setAudioUrl(url);
        if (onRecorded) {
          onRecorded(wavBlob);
        }
      };

      mediaRecorder.start(200);
      setRecording(true);
      setCountdown(5);

      let timeLeft = 5;
      timerRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in your browser.'
          : 'Could not access microphone: ' + (err.message || 'Check audio hardware.')
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setVolumeLevel(0);
    setRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleRetake = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setError('');
    if (onRecorded) onRecorded(null);
  };

  return (
    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 text-xs">
      {error && (
        <div className="mb-3 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-1.5 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {!recording && !audioUrl && (
        <div className="text-center py-2">
          <p className="text-zinc-400 text-xs mb-3">
            Record a 5-second voice sample for speaker verification. Say: <em>"My name is [Your Name] and I attend this class."</em>
          </p>
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-md shadow transition cursor-pointer"
          >
            <Mic className="w-4 h-4 text-rose-500" /> Start 5s Voice Recording
          </button>
        </div>
      )}

      {recording && (
        <div className="text-center py-2 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-semibold text-zinc-100 text-sm">Recording... {countdown}s</span>
          </div>

          {/* Real-time Waveform / Audio Level Bar */}
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800 max-w-xs mx-auto">
            <div
              className="bg-emerald-400 h-full transition-all duration-75 ease-out rounded-full"
              style={{ width: `${Math.max(5, volumeLevel)}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500">Speak clearly into your microphone...</p>

          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] cursor-pointer"
          >
            <Square className="w-3 h-3 text-rose-400" /> Stop Early
          </button>
        </div>
      )}

      {audioUrl && !recording && (
        <div className="space-y-3 py-1">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> 5-Second Voice Sample Captured
            </span>
            <button
              type="button"
              onClick={handleRetake}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Re-record
            </button>
          </div>

          <audio src={audioUrl} controls className="w-full h-8" />
        </div>
      )}
    </div>
  );
}

