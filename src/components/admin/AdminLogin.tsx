import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Shield, Lock, Mail, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { UserLogo } from '../user/UserLogo.js';

export const AdminLogin: React.FC = () => {
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await loginAdmin(email, password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid credentials');
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-4 relative overflow-hidden text-[#e0e0e0]">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121215] border border-[#26262a] rounded-xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <UserLogo size="lg" layout="vertical" showSubtitle={true} className="mb-3" />
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">Admin Control Console</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Management & Real-time Game Operations</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800/80 rounded-lg text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-[#a1a1aa] mb-1.5">
              Admin Email / Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717a]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Enter admin email or username"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-white text-sm focus:outline-none focus:border-[#d4af37] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#a1a1aa] mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717a]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-white text-sm focus:outline-none focus:border-[#d4af37] transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded border-[#26262a] bg-[#1a1a1e] text-[#d4af37] focus:ring-0"
              />
              <span>Remember session</span>
            </label>
            <span className="text-[#71717a]">256-bit Encrypted</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#d4af37] hover:bg-[#c5a028] text-black font-bold rounded-lg shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 text-sm mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In to Admin Panel</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
