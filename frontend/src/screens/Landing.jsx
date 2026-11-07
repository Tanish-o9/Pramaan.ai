import React from 'react';
import { 
  Users, 
  GraduationCap, 
  ArrowRight, 
  ShieldCheck, 
  Camera, 
  Clock, 
  FileCheck2,
  CheckCircle2,
  Building,
  CalendarCheck
} from 'lucide-react';

export default function Landing({ onSelectRole, onOpenKiosk, currentUser, currentRole }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 w-full flex flex-col items-center">
      {/* Top Active Session Banner (if logged in) */}
      {currentUser && currentRole && (
        <div className="mb-8 w-full max-w-3xl px-4 py-3 rounded-xl bg-[#111827] border border-blue-500/30 flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">
              Active Session: <strong className="text-white font-semibold">{currentUser.name}</strong> ({currentRole === 'teacher' ? 'Faculty Member' : 'Student'})
            </span>
          </div>
          <button
            onClick={() => onSelectRole(currentRole)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer text-xs"
          >
            Continue to Workspace &rarr;
          </button>
        </div>
      )}

      {/* Institutional Header Banner */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121b2d] border border-blue-500/20 text-xs text-blue-300 font-medium mb-6">
        <Building className="w-3.5 h-3.5 text-blue-400" />
        <span>Ajay Kumar Garg Engineering College • Academic Year 2024–25</span>
      </div>

      {/* Main Hero Header */}
      <div className="text-center max-w-3xl mb-12">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 mb-4 leading-tight">
          Department Attendance Portal
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Official attendance recording and analytics system for the Department of Computer Science & Engineering (AIML & Data Science). Supports camera recognition, student self-service rosters, and AKGEC 75% attendance criteria tracking.
        </p>
      </div>

      {/* Core Portals Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
        {/* Faculty Portal Card */}
        <div
          onClick={() => onSelectRole('teacher')}
          className="group relative rounded-2xl bg-[#111624] p-7 cursor-pointer border border-[#1e2a3f] hover:border-blue-500/60 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <h2 className="text-xl font-bold text-slate-100 group-hover:text-white transition-colors">
                Faculty Workspace
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold bg-[#1a2337] text-blue-300 border border-blue-500/20">
                Authorized Staff
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Mark lecture attendance for your assigned timetable slots, view real-time class rosters, review student leave applications, and dispatch daily department attendance summaries.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Single & Multi-Photo Classroom Recognition</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Section & Subject Lecture Slider (CSE AIML-2 • Room CL-11)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Official Attendance Export & Group Dispatch</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300 pt-4 border-t border-[#1a2538] transition-colors">
            <span>Access Faculty Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Student Portal Card */}
        <div
          onClick={() => onSelectRole('student')}
          className="group relative rounded-2xl bg-[#111624] p-7 cursor-pointer border border-[#1e2a3f] hover:border-emerald-500/60 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <GraduationCap className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <h2 className="text-xl font-bold text-slate-100 group-hover:text-white transition-colors">
                Student Portal
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold bg-[#11241f] text-emerald-300 border border-emerald-500/20">
                Self-Service
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Sign in with your Roll Number or Registered Face to view personal subject-wise attendance, safe bunks calculation to maintain 75% criteria, and digital student identity card.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Live Personal Subject-wise Attendance Logs</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AKGEC 75% Criteria Tracker & Safe Bunks Forecast</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Medical Leave & On-Duty (OD) Submission</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 pt-4 border-t border-[#1a2538] transition-colors">
            <span>Access Student Portal</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Launch Classroom Kiosk Option */}
      {onOpenKiosk && (
        <div className="w-full max-w-4xl p-5 rounded-xl bg-[#0f1422] border border-[#1b263b] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-sm mb-10">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-200 text-sm">Classroom Wall Kiosk Scanner</div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Terminal auto-scanner for continuous classroom attendance recording in Room CL-11
              </div>
            </div>
          </div>
          <button
            onClick={onOpenKiosk}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#192338] hover:bg-[#202e49] border border-blue-500/30 text-blue-300 font-semibold transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <span>Open Kiosk Mode</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* College Info Footer Strip */}
      <div className="w-full max-w-4xl pt-6 border-t border-[#162032] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Timetable Venue: Room CL-11 (Section CSE AIML-2)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>AKGEC Academic Regulations</span>
          <span>•</span>
          <span>Minimum 75% Attendance Required</span>
        </div>
      </div>
    </div>
  );
}
