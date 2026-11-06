import React, { useState } from 'react';
import { api } from '../api';
import { KeyRound, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function FacultyAuth({ onAuthSuccess }) {
  const [tab, setTab] = useState('login');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await api.teacherLogin(user.trim(), pass);
        onAuthSuccess(res.teacher, 'teacher');
      } else {
        if (!name.trim()) throw new Error('Please enter your full name');
        await api.teacherRegister(user.trim(), pass, name.trim());
        const res = await api.teacherLogin(user.trim(), pass);
        onAuthSuccess(res.teacher, 'teacher');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16 w-full">
      <div className="panel rounded-2xl p-6 sm:p-7 shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-sky-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 text-cyan-400 shadow-md">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Faculty Access</h2>
          <p className="text-xs text-zinc-400 mt-1">Sign in to manage classes and rosters</p>
        </div>

        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950/90 border border-zinc-800 text-xs mb-6 shadow-inner">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              tab === 'login' 
                ? 'bg-zinc-800 text-white shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              tab === 'register' 
                ? 'bg-zinc-800 text-white shadow-md' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Tanish Rajput"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Username</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="e.g. prof_tanish"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                {tab === 'login' ? 'Sign In to Workspace' : 'Complete Registration'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
