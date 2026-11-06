import React from 'react';
import { 
  Users, 
  GraduationCap, 
  ArrowRight, 
  ShieldCheck, 
  Camera, 
  Mic, 
  QrCode, 
  Zap, 
  Sparkles,
  LayoutGrid,
  FileCheck2,
  Clock
} from 'lucide-react';

export default function Landing({ onSelectRole, onOpenKiosk, currentUser, currentRole }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20 w-full flex flex-col items-center">
      {/* Top Active Session Banner (if logged in) */}
      {currentUser && currentRole && (
        <div className="mb-6 px-4 py-2 rounded-2xl bg-zinc-900/90 border border-cyan-500/30 flex items-center gap-3 text-xs shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-zinc-300">
            Active session: <strong className="text-white">{currentUser.name}</strong> ({currentRole === 'teacher' ? 'Faculty' : 'Student'})
          </span>
          <button
            onClick={() => onSelectRole(currentRole)}
            className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold border border-cyan-500/40 transition cursor-pointer"
          >
            Open Workspace &rarr;
          </button>
        </div>
      )}

      {/* Top Shimmering Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-emerald-500/10 border border-cyan-500/30 text-xs text-cyan-300 font-medium mb-6 shadow-lg shadow-cyan-500/5 animate-pulse-glow">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>Pramaan 2.0 • Enterprise Biometric Governance</span>
      </div>

      {/* Hero Headline */}
      <div className="text-center max-w-3xl mb-8">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 mb-5 leading-[1.15]">
          Campus attendance, <br />
          <span className="text-gradient-cyan">automated via Live Camera.</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-8">
          Continuous hands-free facial recognition, instant classroom panoramic scans, and multi-factor biometric verification. Powered by dlib 128-d ResNet, 68-point EAR liveness, and AI Trust Scoring.
        </p>

        {/* Big Live Camera Hero Terminal CTA */}
        {onOpenKiosk && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenKiosk}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-zinc-950 font-black text-sm tracking-wide shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-950"></span>
              </span>
              <Camera className="w-5 h-5 text-zinc-950 group-hover:rotate-12 transition-transform" />
              <span>Launch Live AI Camera Terminal</span>
              <ArrowRight className="w-4 h-4 text-zinc-950 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Zero-login required • Opens live webcam auto-scanner</span>
            </div>
          </div>
        )}
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-16">
        {/* Faculty Portal Card */}
        <div
          onClick={() => onSelectRole('teacher')}
          className="group relative panel rounded-2xl p-7 cursor-pointer border border-zinc-800 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden"
        >
          {/* Subtle gradient glow inside card */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />

          <div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-sky-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 group-hover:border-cyan-400 transition-all shadow-md">
              <Users className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">
                Faculty Portal
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Staff
              </span>
            </div>

            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Capture class attendance with Multi-Photo or Wide Group pan, trigger surprise Pulse Checks, configure Seat Maps, and export HoD Defaulter Notices.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Voice-Command Roll-Call (Hinglish/English AI)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Mid-Class Random Pulse Checks</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Official Defaulter Notices (Print/PDF)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 pt-4 border-t border-zinc-800/80 transition-colors">
            <span>Enter Faculty Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Student Portal Card */}
        <div
          onClick={() => onSelectRole('student')}
          className="group relative panel rounded-2xl p-7 cursor-pointer border border-zinc-800 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden"
        >
          {/* Subtle gradient glow inside card */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

          <div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 group-hover:border-emerald-400 transition-all shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">
                Student Portal
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Self-Service
              </span>
            </div>

            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Login via Face ID or Roll No, view live subject percentages, calculate safe bunks to keep 75%, and access your dynamic anti-proxy Digital ID card.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Rotating HMAC Dynamic Digital Student ID</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Smart 75% Bunk & Shortage Calculator</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Medical Leave & On-Duty (OD) Pass Requests</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 pt-4 border-t border-zinc-800/80 transition-colors">
            <span>Enter Student Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Live Enterprise Spec Banner */}
      <div className="w-full max-w-4xl panel rounded-2xl p-6 border border-zinc-800/90 shadow-xl mb-12">
        <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold text-center mb-6">
          Architectural Highlights & Benchmark Metrology
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">
          <div className="pt-2 sm:pt-0">
            <div className="text-2xl font-black text-cyan-400 font-mono">&lt; 0.4%</div>
            <div className="text-[11px] text-zinc-400 mt-1">Biometric FAR Rate</div>
          </div>
          <div className="pt-2 sm:pt-0">
            <div className="text-2xl font-black text-emerald-400 font-mono">128-d</div>
            <div className="text-[11px] text-zinc-400 mt-1">ResNet HNSW Indexing</div>
          </div>
          <div className="pt-2 sm:pt-0">
            <div className="text-2xl font-black text-amber-400 font-mono">68-pt</div>
            <div className="text-[11px] text-zinc-400 mt-1">EAR Geometry Liveness</div>
          </div>
          <div className="pt-2 sm:pt-0">
            <div className="text-2xl font-black text-purple-400 font-mono">256-d</div>
            <div className="text-[11px] text-zinc-400 mt-1">Voice GE2E Embeddings</div>
          </div>
        </div>
      </div>

      {/* Capabilities Feature Matrix */}
      <div className="w-full max-w-4xl border-t border-zinc-900 pt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-zinc-400">
          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3">
            <Camera className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-zinc-200">Classroom Vision</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Multi-Face & Video Sweeps</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3">
            <LayoutGrid className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-zinc-200">Seat Map Matrix</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Spatial Desk Layouts</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-zinc-200">Surprise Pulse Checks</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Anti-Bunking Verification</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-zinc-200">Multi-Factor Trust Engine</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Itemized Audit Scoring</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
