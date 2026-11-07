import React from 'react';
import { LogOut, ArrowLeft, Camera, Monitor, Building2, User } from 'lucide-react';

export default function Header({ user, role, onLogout, onBackToHome, onOpenKiosk }) {
  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d131f]/95 backdrop-blur-md border-b border-[#1e2a3f] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* Brand / Institution Logo */}
        <div 
          onClick={onBackToHome} 
          className="flex items-center gap-3 cursor-pointer group transition-opacity hover:opacity-90"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
            AK
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-100">
                AKGEC Attendance
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[#1a2335] text-blue-400 border border-blue-500/20 font-mono">
                Official
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">
              Ajay Kumar Garg Engineering College • CSE(AIML & DS)
            </span>
          </div>
        </div>

        {/* User Status / Action Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Launch Live Camera Kiosk Button */}
          {onOpenKiosk && (
            <button
              onClick={onOpenKiosk}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#142036] hover:bg-[#1a2b4a] border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Open Fullscreen Classroom Kiosk Terminal"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Classroom Kiosk</span>
              <span className="sm:hidden">Kiosk</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#111726] border border-[#1e2a3f] text-xs">
                <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold text-[10px]">
                  {getInitials(user.name)}
                </div>
                <div className="flex flex-col text-left leading-tight hidden sm:flex">
                  <span className="font-semibold text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {role === 'teacher' ? 'Faculty Member' : `Roll: ${user.roll_number || ''}`}
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141b2a] hover:bg-rose-950/40 hover:text-rose-300 border border-[#202b40] hover:border-rose-800/50 text-slate-400 text-xs font-medium transition cursor-pointer"
                title="Sign out of your session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : role ? (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141b2a] hover:bg-[#1c263b] border border-[#202b40] text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-[#131d2e] border border-[#1f2e47] text-[11px] text-slate-300 font-medium">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Academic Session 2024-25 (Odd Sem)</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
