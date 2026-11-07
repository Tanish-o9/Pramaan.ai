import React, { useState } from 'react';
import { api } from '../api';
import { KeyRound, ArrowRight, Loader2, Lock, ShieldCheck } from 'lucide-react';

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
    <div className="max-w-md mx-auto px-4 py-12 sm:py-20 w-full">
      <div className="rounded-2xl p-7 bg-[#111624] border border-[#1e2a3f] shadow-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Faculty Sign In</h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your assigned teaching sections and attendance registers
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 rounded-lg bg-[#0c101a] border border-[#1b2538] text-xs mb-6">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`py-2 rounded-md font-medium transition cursor-pointer ${
              tab === 'login' 
                ? 'bg-[#182338] text-white shadow-sm border border-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`py-2 rounded-md font-medium transition cursor-pointer ${
              tab === 'register' 
                ? 'bg-[#182338] text-white shadow-sm border border-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            New Faculty Account
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Tanish Rajput"
                className="w-full px-3.5 py-2.5 rounded-lg text-xs"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Faculty Username</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="e.g. deepu or tanish_rajput"
              className="w-full px-3.5 py-2.5 rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg text-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
              </>
            ) : (
              <>
                {tab === 'login' ? 'Sign In to Workspace' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Account Helper */}
        <div className="mt-6 pt-4 border-t border-[#182338] text-center text-[11px] text-slate-400">
          <span>Demo credentials: </span>
          <span className="font-mono text-slate-300">deepu / 1234</span>
          <span> or </span>
          <span className="font-mono text-slate-300">tanish_rajput / 1234</span>
        </div>
      </div>
    </div>
  );
}
