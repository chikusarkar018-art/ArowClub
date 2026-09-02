import React, { useState } from 'react';
import { Smartphone, Lock, Eye, EyeOff, UserCheck, ChevronLeft, ChevronDown } from 'lucide-react';
import { UserLogo } from './UserLogo.js';
import { useAuth } from '../../context/AuthContext.js';

interface UserRegisterViewProps {
  onBack?: () => void;
  onNavigateLogin?: (prefilledPhone?: string) => void;
  onOpenSupport?: () => void;
  onOpenPortal?: () => void;
  onRegister?: (username: string, phone: string, email?: string, referralCode?: string, password?: string) => Promise<{ success: boolean; error?: string; phone?: string }>;
  initialInviteCode?: string;
}

export const UserRegisterView: React.FC<UserRegisterViewProps> = ({
  onBack,
  onNavigateLogin,
  onOpenSupport,
  onOpenPortal,
  onRegister,
  initialInviteCode,
}) => {
  const { registerUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Extract referral / invite code from URL if present (numbers only), otherwise default to Official Company Code 100001
  const getInitialInviteCode = () => {
    if (initialInviteCode) {
      const clean = String(initialInviteCode).replace(/\D/g, '');
      if (clean) return clean;
    }
    try {
      // Check standard query string
      const searchParams = new URLSearchParams(window.location.search);
      let urlCode = searchParams.get('invitationCode') || searchParams.get('inviteCode') || searchParams.get('ref') || searchParams.get('invite') || searchParams.get('code');
      
      // If not in search, check hash (e.g. #/register?invitationCode=741381986663)
      if (!urlCode && window.location.hash && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        urlCode = hashParams.get('invitationCode') || hashParams.get('inviteCode') || hashParams.get('ref') || hashParams.get('invite') || hashParams.get('code');
      }

      if (urlCode) {
        const cleanDigits = urlCode.replace(/\D/g, '');
        if (cleanDigits) return cleanDigits;
      }
    } catch {
      // fallback
    }
    return '100001';
  };

  const [inviteCode, setInviteCode] = useState(getInitialInviteCode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Please enter a valid phone number (minimum 8-10 digits)');
      return;
    }
    if (!password) {
      setErrorMessage('Please set a password (min 6 characters)');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('Please agree to the Privacy Agreement');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = cleanPhone.startsWith('+') ? cleanPhone : `${countryCode}${cleanPhone}`;
      const username = `Member_${cleanPhone.slice(-4)}`;
      
      let res: { success: boolean; error?: string; phone?: string };
      if (onRegister) {
        res = await onRegister(username, fullPhone, undefined, inviteCode.trim(), password);
      } else {
        res = await registerUser(username, fullPhone, undefined, inviteCode.trim(), password);
      }

      if (res.success) {
        if (onNavigateLogin) {
          onNavigateLogin(cleanPhone);
        }
      } else {
        setErrorMessage(res.error || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c12] text-white flex flex-col font-sans select-none">
      {/* Header */}
      <header className="p-4 flex items-center justify-between relative border-b border-[#f5c443]/15 bg-[#121520]/80 backdrop-blur-md">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2">
          <UserLogo size="md" />
        </div>
        <div className="w-9" />
      </header>

      {/* Main Content */}
      <div className="flex-1 px-5 pt-4 pb-8 flex flex-col max-w-md mx-auto w-full">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#f5c443] tracking-tight">Register</h1>
          <p className="text-xs text-zinc-400 mt-1">Please register with your phone number to get started</p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#f5c443]/20 mb-6">
          <div className="flex-1 pb-3 flex flex-col items-center gap-1.5 text-xs font-bold relative text-[#f5c443]">
            <Smartphone className="w-5 h-5 text-[#f5c443]" />
            <span>Register your phone</span>
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#f5c443] shadow-[0_0_8px_rgba(245,196,67,0.8)] rounded-t-full" />
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Number Row */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-1.5">
              <Smartphone className="w-4 h-4 text-[#f5c443]" />
              <span>Phone number</span>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-12 px-3 pr-7 bg-[#141722] border border-[#f5c443]/30 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[#f5c443] appearance-none cursor-pointer"
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+971">+971 (UAE)</option>
                  <option value="+880">+880 (BD)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Please enter the phone number"
                className="flex-1 h-12 px-4 bg-[#141722] border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f5c443] transition"
                required
              />
            </div>
          </div>

          {/* Set Password */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-1.5">
              <Lock className="w-4 h-4 text-[#f5c443]" />
              <span>Set password</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set password (min 6 characters)"
                className="w-full h-12 px-4 pr-11 bg-[#141722] border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f5c443] transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-1.5">
              <Lock className="w-4 h-4 text-[#f5c443]" />
              <span>Confirm password</span>
            </div>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full h-12 px-4 pr-11 bg-[#141722] border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f5c443] transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Invite Code (Numeric Only) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-1.5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#f5c443]" />
                <span>Invitation Code</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-normal">Numbers only</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter numeric invitation code"
              className="w-full h-12 px-4 bg-[#141722] border border-white/15 rounded-xl text-sm font-mono tracking-wider text-white placeholder-zinc-500 focus:outline-none focus:border-[#f5c443] transition"
            />
          </div>

          {/* Privacy Agreement Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-[#141722] text-[#f5c443] focus:ring-0 cursor-pointer accent-[#f5c443]"
              />
              <span>
                I have read and agree{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-[#f5c443] hover:underline font-bold"
                >
                  【Privacy Agreement】
                </button>
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#f5c443] via-[#fcd34d] to-[#d99b26] hover:brightness-105 active:scale-[0.99] text-black rounded-xl text-base font-black shadow-[0_0_20px_rgba(245,196,67,0.35)] transition flex items-center justify-center gap-2 disabled:opacity-50 tracking-wide"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                'Register'
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigateLogin()}
              className="w-full h-12 bg-[#141722] border border-[#f5c443]/50 text-zinc-200 hover:bg-[#f5c443]/10 active:scale-[0.99] rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5"
            >
              <span>I have an account</span>
              <span className="text-[#f5c443] font-bold">Login</span>
            </button>

            {onOpenPortal && (
              <button
                type="button"
                onClick={onOpenPortal}
                className="w-full py-2.5 text-xs text-zinc-400 hover:text-amber-400 flex items-center justify-center gap-1.5 transition"
              >
                <span>🌐 View Official Portal (एरून क्लब)</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Privacy Agreement Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141722] border border-[#f5c443]/30 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl">
            <h3 className="text-lg font-black mb-3 text-center text-[#f5c443]">Privacy & Service Agreement</h3>
            <div className="text-xs text-zinc-300 space-y-2 max-h-60 overflow-y-auto pr-1 leading-relaxed">
              <p>1. Players must be at least 18 years old to participate in game entertainment.</p>
              <p>2. We strictly protect user data privacy with advanced encryption algorithms.</p>
              <p>3. All deposits and withdrawals are processed transparently via authorized channels.</p>
              <p>4. Fair play and responsible gaming guidelines must be maintained at all times.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="mt-5 w-full py-2.5 bg-gradient-to-r from-[#f5c443] to-[#d99b26] text-black font-black rounded-xl text-sm shadow-md active:scale-98 transition"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
