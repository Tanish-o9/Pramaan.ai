import React, { useState } from 'react';
import { api } from '../api';
import { ShieldAlert, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react';

export default function PinChangeModal({ student, onSuccess, onClose }) {
  const [oldPin, setOldPin] = useState('1234');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPin.trim().length < 4) {
      setError('New PIN must be at least 4 digits.');
      return;
    }
    if (newPin === '1234') {
      setError('New PIN cannot be the default 1234. Choose a unique PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PIN and Confirmation PIN do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.studentChangePin(oldPin.trim(), newPin.trim());
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="panel max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-zinc-700/80 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/80 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2.5 mb-3 text-amber-400">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-semibold text-zinc-100">Security Update Required</h3>
        </div>

        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Welcome, <strong>{student.name}</strong>. Please change your default student PIN (<code>1234</code>) to secure your attendance profile.
        </p>

        {error && (
          <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Current PIN</label>
            <input
              type="password"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              placeholder="1234"
              className="w-full px-3 py-2 rounded-lg text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">New PIN (min 4 digits)</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Enter new PIN"
              className="w-full px-3 py-2 rounded-lg text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Confirm New PIN</label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Re-enter new PIN"
              className="w-full px-3 py-2 rounded-lg text-xs font-mono"
              required
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-zinc-950 font-semibold rounded-lg text-xs hover:opacity-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving PIN...
                </>
              ) : (
                <>
                  Set New PIN & Continue <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200 transition text-center cursor-pointer font-medium"
              >
                Skip for now, remind me later
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
