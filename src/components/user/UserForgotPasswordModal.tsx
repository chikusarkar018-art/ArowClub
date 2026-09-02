import React, { useState } from 'react';
import { X, Lock, Phone, HelpCircle } from 'lucide-react';
import { api } from '../../services/api.js';

interface UserForgotPasswordModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const UserForgotPasswordModal: React.FC<UserForgotPasswordModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError('Please enter your phone number or email');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(identifier, newPassword);
      onSuccess('Password updated successfully! Please log in with your new password.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unable to reset password. Contact customer support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141722] border border-[#f5c443]/30 rounded-2xl max-w-sm w-full p-5 text-white relative shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-black text-[#f5c443] mb-1">Reset Password</h3>
        <p className="text-xs text-zinc-400 mb-4">
          Enter your registered phone or email and set a new password.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-300 font-semibold mb-1 block">Phone or Email</label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Phone number / Email / UID"
                className="w-full h-11 px-3.5 bg-[#0a0c12] border border-[#f5c443]/30 rounded-xl text-sm text-white focus:outline-none focus:border-[#f5c443]"
                required
              />
              <Phone className="w-4 h-4 text-[#f5c443]/70 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-300 font-semibold mb-1 block">New Password</label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full h-11 px-3.5 bg-[#0a0c12] border border-[#f5c443]/30 rounded-xl text-sm text-white focus:outline-none focus:border-[#f5c443]"
                required
              />
              <Lock className="w-4 h-4 text-[#f5c443]/70 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-[#f5c443] via-[#fcd34d] to-[#d99b26] hover:brightness-105 font-bold rounded-xl text-sm text-black transition disabled:opacity-50 shadow-[0_0_15px_rgba(245,196,67,0.3)]"
            >
              {loading ? 'Updating...' : 'Confirm Reset Password'}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-[#f5c443]" />
            <span>Need manual help? Contact Customer Support</span>
          </p>
        </div>
      </div>
    </div>
  );
};
