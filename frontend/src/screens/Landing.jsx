import React from 'react';
import { Users, GraduationCap, ArrowRight, ShieldCheck, Camera, Mic, QrCode, FileText } from 'lucide-react';

export default function Landing({ onSelectRole }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 w-full">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-zinc-100 mb-3">
          Campus attendance, automated.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Mark lecture attendance in seconds using classroom photos, video scans, or voice recordings. With built-in anti-spoof liveness and LMS export.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
        {/* Faculty */}
        <div
          onClick={() => onSelectRole('teacher')}
          className="panel panel-hover p-6 rounded-xl cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Faculty Portal</h2>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Capture classroom attendance, manage subject join codes, review records, and export LMS CSVs.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <span>Open Faculty Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Student */}
        <div
          onClick={() => onSelectRole('student')}
          className="panel panel-hover p-6 rounded-xl cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 mb-4">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Student Portal</h2>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Sign in with Face ID or Roll No, view your attendance %, track your safe bunk count, and join classes.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <span>Open Student Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Feature summary */}
      <div className="border-t border-zinc-900 pt-10">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium text-center mb-6">
          Core Capabilities
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-zinc-300 shrink-0" />
            <span>Classroom Photo & Video Sweep</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-300 shrink-0" />
            <span>68-Point Anti-Spoof Liveness</span>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-zinc-300 shrink-0" />
            <span>Voice Biomarker Verification</span>
          </div>
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-zinc-300 shrink-0" />
            <span>15-Min Dynamic Passcodes</span>
          </div>
        </div>
      </div>
    </div>
  );
}

