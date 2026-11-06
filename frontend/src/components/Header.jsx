import React from 'react';
import { LogOut, ArrowLeft, GraduationCap } from 'lucide-react';

export default function Header({ user, role, onLogout, onBackToHome }) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-40 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div onClick={onBackToHome} className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">
            Presence<span className="text-zinc-400">.ai</span>
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">attendance</span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 hidden sm:inline">
                {user.name} <span className="text-zinc-600">·</span> {role === 'teacher' ? 'Faculty' : `Roll ${user.roll_number || ''}`}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          ) : role ? (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              System Online
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

