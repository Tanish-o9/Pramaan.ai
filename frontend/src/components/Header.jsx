import React from 'react';
import { LogOut, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';

export default function Header({ user, role, onLogout, onBackToHome }) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-zinc-950/70 border-b border-white/5 transition-all">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={onBackToHome} 
          className="flex items-center gap-3 cursor-pointer group transition-transform active:scale-95"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/10 group-hover:shadow-cyan-500/25 transition-all">
            <div className="w-full h-full rounded-[11px] bg-zinc-950 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                Pramaan
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                2.0
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
              Presence.ai Ecosystem
            </span>
          </div>
        </div>

        {/* User Status / Action Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-medium text-zinc-100">{user.name}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  {role === 'teacher' ? 'Faculty' : `Roll ${user.roll_number || ''}`}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-300 text-xs font-medium transition cursor-pointer shadow-sm active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          ) : role ? (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise Ready</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
