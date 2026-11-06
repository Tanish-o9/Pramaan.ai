import React, { useState } from 'react';
import { api } from '../api';
import { KeyRound, ArrowRight } from 'lucide-react';

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
    <div className="max-w-sm mx-auto px-4 py-16 w-full">
      <div className="panel rounded-xl p-6">
        <div className="text-center mb-6">
          <div className="w-9 h-9 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-2 text-zinc-200">
            <KeyRound className="w-4 h-4" />
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Faculty Access</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Sign in to manage classes and roll sheets</p>
        </div>

        <div className="grid grid-cols-2 p-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs mb-5">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`py-1.5 rounded font-medium transition ${tab === 'login' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`py-1.5 rounded font-medium transition ${tab === 'register' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Tanish Rajput"
                className="w-full px-3 py-2 rounded-md text-xs"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Username</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="username"
              className="w-full px-3 py-2 rounded-md text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md text-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 px-3 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

