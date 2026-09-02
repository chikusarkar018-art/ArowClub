import React, { useState } from 'react';
import { Smartphone, Mail, Lock, Eye, EyeOff, ChevronLeft, Headphones, ShieldAlert, X } from 'lucide-react';
import { UserLogo } from './UserLogo.js';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';

interface UserLoginViewProps {
  initialPhone?: string;
  onBack?: () => void;
  onNavigateRegister?: () => void;
  onNavigateForgotPassword?: () => void;
  onOpenSupport?: () => void;
  onOpenPortal?: () => void;
  onLogin?: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
}

export const UserLoginView: React.FC<UserLoginViewProps> = ({
  initialPhone = '',
  onBack,
  onNavigateRegister,
  onNavigateForgotPassword,
  onOpenSupport,
  onOpenPortal,
  onLogin,
}) => {
  const { loginUser } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [countryCode, setCountryCode] = useState('+91');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    let identifier = '';
    if (tab === 'phone') {
      const cleanP = phone.trim();
      if (!cleanP) {
        setErrorMessage(t('enter_phone', 'Please enter your phone number'));
        return;
      }
      // If user typed without +, prepend countryCode, or pass raw phone
      identifier = cleanP.startsWith('+') ? cleanP : `${countryCode}${cleanP}`;
    } else {
      identifier = email.trim();
      if (!identifier) {
        setErrorMessage('Please enter your email or username');
        return;
      }
    }

    if (!password) {
      setErrorMessage(t('enter_password', 'Please enter your password'));
      return;
    }

    setLoading(true);
    try {
      let res: { success: boolean; error?: string };
      if (onLogin) {
        res = await onLogin(identifier, password);
      } else {
        res = await loginUser(identifier, password);
      }

      if (!res.success) {
        setErrorMessage(res.error || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your connection.');
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
      <div className="flex-1 px-4 pt-4 pb-8 flex flex-col max-w-md mx-auto w-full">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#f5c443] tracking-tight">{t('login', 'Log in')}</h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {t('enter_phone', 'Please log in with your phone number or email.')}
          </p>
        </div>

        {/* Tab Selector: Yellow & Black */}
        <div className="flex border-b border-[#f5c443]/20 mb-6">
          <button
            type="button"
            onClick={() => setTab('phone')}
            className={`flex-1 pb-3 flex flex-col items-center gap-1.5 text-xs font-bold relative transition ${
              tab === 'phone' ? 'text-[#f5c443]' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>{t('phone_number', 'Phone Number')}</span>
            {tab === 'phone' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#f5c443] shadow-[0_0_8px_rgba(245,196,67,0.8)] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 pb-3 flex flex-col items-center gap-1.5 text-xs font-bold relative transition ${
              tab === 'email' ? 'text-[#f5c443]' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-5 h-5" />
            <span>Email</span>
            {tab === 'email' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#f5c443] shadow-[0_0_8px_rgba(245,196,67,0.8)] rounded-t-full" />
            )}
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'phone' ? (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-1.5">
                <Smartphone className="w-4 h-4 text-[#f5c443]" />
                <span>{t('phone_number', 'Phone number')}</span>
              </div>
              <div className="flex gap-2 items-center">
                {/* Compact +91 box designed to fit perfectly on any mobile screen */}
                <div className="w-16 shrink-0 h-12 bg-[#141722] border border-[#f5c443]/30 rounded-xl flex items-center justify-center font-bold text-sm text-[#f5c443] font-mono shadow-sm">
                  +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('enter_phone', 'Enter phone number')}
                  className="flex-1 min-w-0 h-12 px-3.5 bg-[#141722] border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f5c443] transition font-mono"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-1.5">
                <Mail className="w-4 h-4 text-[#f5c443]" />
                <span>Email Address</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Please enter your email"
                className="w-full h-12 px-4 bg-[#141722] border border-white/15 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f5c443] transition"
                required
              />
            </div>
          )}

          {/* Password Input */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-1.5">
              <Lock className="w-4 h-4 text-[#f5c443]" />
              <span>{t('password', 'Password')}</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enter_password', 'Password')}
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

          {/* Remember Password & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-[#141722] text-[#f5c443] focus:ring-0 cursor-pointer accent-[#f5c443]"
              />
              <span>Remember password</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotNotice(true)}
              className="text-xs text-[#f5c443] hover:underline font-semibold"
            >
              {t('forgot_password', 'Forgot password?')}
            </button>
          </div>

          {/* Buttons: Luxury Yellow & Black */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#f5c443] via-[#fcd34d] to-[#d99b26] hover:brightness-105 active:scale-[0.99] text-black rounded-xl text-base font-black shadow-[0_0_20px_rgba(245,196,67,0.35)] transition flex items-center justify-center gap-2 disabled:opacity-50 tracking-wide"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                t('login', 'Log in')
              )}
            </button>

            <button
              type="button"
              onClick={onNavigateRegister}
              className="w-full h-12 bg-[#141722] border border-[#f5c443]/50 text-[#f5c443] hover:bg-[#f5c443]/10 active:scale-[0.99] rounded-xl text-base font-bold transition flex items-center justify-center tracking-wide"
            >
              {t('register', 'Register')}
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

      {/* Forgot Password Customer Support Notice Modal */}
      {showForgotNotice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141722] border border-[#f5c443]/40 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#f5c443]">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black text-sm">{t('forgot_password', 'Forgot Password?')}</h3>
              </div>
              <button
                onClick={() => setShowForgotNotice(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed bg-[#0d0f17] p-3.5 rounded-xl border border-white/5">
              <p className="font-semibold text-white">
                {t('forgot_password_tip', 'For security reasons, password recovery is managed by Customer Care. Please contact Support.')}
              </p>
              <p className="text-[11px] text-zinc-400">
                खाते की सुरक्षा के लिए, पासवर्ड रीसेट सिर्फ ऑफिशियल कस्टमर सपोर्ट टीम द्वारा ही किया जाता है। कृपया सपोर्ट टीम से संपर्क करें।
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setShowForgotNotice(false);
                  if (onOpenSupport) onOpenSupport();
                  else if (onNavigateForgotPassword) onNavigateForgotPassword();
                }}
                className="w-full py-3 bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-[#0d0f17] font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-98 transition"
              >
                <Headphones className="w-4 h-4" />
                <span>{t('contact_support', 'Contact 24/7 Support Desk')}</span>
              </button>

              <button
                onClick={() => setShowForgotNotice(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs rounded-xl transition"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
