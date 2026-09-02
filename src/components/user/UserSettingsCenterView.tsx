import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Mail, Info, Copy, Check, Eye, EyeOff, X, User, Moon, Sun, Sparkles, Palette } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { api } from '../../services/api.js';
import { AVATARS_LIST, DEFAULT_AVATAR_URL } from '../../constants/avatars.js';

interface UserSettingsCenterViewProps {
  onBack: () => void;
  onOpenSupport?: () => void;
}

export const UserSettingsCenterView: React.FC<UserSettingsCenterViewProps> = ({
  onBack,
  onOpenSupport,
}) => {
  const { user, refreshUser, showToast } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  
  // Sub-view: 'center' | 'avatar'
  const [subView, setSubView] = useState<'center' | 'avatar'>('center');

  // Modals inside settings
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showBindEmailModal, setShowBindEmailModal] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Nickname form state
  const [nicknameInput, setNicknameInput] = useState(user?.username || '');
  const [nicknameLoading, setNicknameLoading] = useState(false);

  // Email form state
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [emailLoading, setEmailLoading] = useState(false);

  const handleCopyUid = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    showToast('UID copied to clipboard', 'info');
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSelectAvatar = async (avatarUrl: string) => {
    try {
      await api.updateProfile({ avatarUrl });
      await refreshUser();
      showToast('Avatar updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update avatar', 'error');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.changePassword({
        currentPassword,
        oldPassword: currentPassword,
        newPassword,
      });
      await refreshUser();
      showToast('Login password modified successfully!', 'success');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nicknameInput.trim();
    if (!clean) {
      showToast('Nickname cannot be empty', 'error');
      return;
    }
    setNicknameLoading(true);
    try {
      await api.updateProfile({ nickname: clean, username: clean });
      await refreshUser();
      showToast('Nickname updated successfully', 'success');
      setShowNicknameModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update nickname', 'error');
    } finally {
      setNicknameLoading(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim();
    if (!clean || !clean.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    setEmailLoading(true);
    try {
      await api.updateProfile({ email: clean });
      await refreshUser();
      showToast('Mailbox bound successfully', 'success');
      setShowBindEmailModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to bind mailbox', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const currentAvatar = user?.avatarUrl || DEFAULT_AVATAR_URL;

  // ===================== AVATAR SELECTION VIEW (Image 2) =====================
  if (subView === 'avatar') {
    return (
      <div className="min-h-screen bg-[#0d0f17] text-white flex flex-col font-sans select-none pb-8">
        {/* Header matching Image 2 with Gold & Black theme */}
        <header className="px-4 py-3.5 flex items-center justify-between bg-[#141824] border-b border-[#f5c443]/20 sticky top-0 z-20 shadow-md">
          <button
            onClick={() => setSubView('center')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-[#f5c443] hover:bg-[#f5c443]/10 active:scale-95 transition"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
            <span className="text-[#f5c443]">Change</span> avatar
          </h1>
          <div className="w-8" />
        </header>

        {/* 3-Column Avatar Grid */}
        <div className="flex-1 px-4 pt-4 max-w-md mx-auto w-full">
          <div className="grid grid-cols-3 gap-3.5">
            {AVATARS_LIST.map((av, idx) => {
              const isSelected = currentAvatar === av.url || (!user?.avatarUrl && idx === 0);

              return (
                <div
                  key={av.id}
                  onClick={() => handleSelectAvatar(av.url)}
                  className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 active:scale-95 shadow-lg ${
                    isSelected
                      ? 'ring-2 ring-[#f5c443] ring-offset-2 ring-offset-[#0d0f17] scale-102'
                      : 'hover:opacity-90 border border-white/10 hover:border-[#f5c443]/50'
                  }`}
                >
                  <img
                    src={av.url}
                    alt={av.name}
                    className="w-full h-full object-cover bg-[#141824]"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />

                  {/* Gold/Yellow checkmark badge */}
                  {isSelected && (
                    <div className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-[#f5c443] border-2 border-[#0d0f17] flex items-center justify-center shadow-lg">
                      <Check className="w-3 h-3 text-[#0d0f17] stroke-[3.5]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ===================== SETTINGS CENTER VIEW =====================
  return (
    <div className="min-h-screen bg-[#0d0f17] text-white flex flex-col font-sans select-none pb-12">
      {/* Header with Yellow & Black theme */}
      <header className="px-4 py-3.5 flex items-center justify-between bg-[#141824] border-b border-[#f5c443]/20 sticky top-0 z-20 shadow-md">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-[#f5c443] hover:bg-[#f5c443]/10 active:scale-95 transition"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
          <span className="text-[#f5c443]">Settings</span> Center
        </h1>
        <div className="w-8" />
      </header>

      <div className="flex-1 px-4 pt-4 max-w-md mx-auto w-full space-y-4">
        {/* Top Profile Card with Gold/Black Luxury theme */}
        <div className="bg-[#141824] border border-[#f5c443]/25 rounded-2xl p-4 shadow-xl space-y-4">
          {/* Avatar Row */}
          <div className="flex items-center justify-between">
            <div className="w-16 h-16 rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-[#f5c443] via-[#ffe082] to-[#b38122] shadow-[0_0_15px_rgba(245,196,67,0.3)]">
              <img
                src={currentAvatar}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full bg-[#0d0f17]"
                referrerPolicy="no-referrer"
              />
            </div>

            <button
              onClick={() => setSubView('avatar')}
              className="flex items-center gap-1 text-xs text-[#f5c443] hover:text-[#fce08b] transition group py-1.5 px-3 rounded-xl bg-[#f5c443]/10 border border-[#f5c443]/30 hover:bg-[#f5c443]/20"
            >
              <span className="font-semibold">Change avatar</span>
              <ChevronRight className="w-4 h-4 text-[#f5c443] group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* Nickname Row */}
          <div
            onClick={() => {
              setNicknameInput(user?.username || '');
              setShowNicknameModal(true);
            }}
            className="flex items-center justify-between py-1 cursor-pointer group hover:opacity-90 transition"
          >
            <span className="text-xs text-zinc-400 font-medium">Nickname</span>
            <div className="flex items-center gap-1 text-xs text-zinc-200 group-hover:text-[#f5c443] transition">
              <span className="font-semibold">{user?.username || 'MemberNNGP0YGJ'}</span>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#f5c443] group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* UID Row */}
          <div className="flex items-center justify-between py-1 border-t border-white/10 pt-3">
            <span className="text-xs text-zinc-400 font-medium">UID</span>
            <div className="flex items-center gap-2 text-xs font-mono text-[#f5c443]">
              <span className="font-bold">{user?.uid || '23556598'}</span>
              <button
                onClick={handleCopyUid}
                className="p-1 text-zinc-400 hover:text-[#f5c443] transition active:scale-90"
                title="Copy UID"
              >
                {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Security Information Section Title */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-1 h-3.5 bg-[#f5c443] rounded-full shadow-[0_0_8px_rgba(245,196,67,0.6)]" />
            <h2 className="text-xs font-bold text-white tracking-wide uppercase">Security information</h2>
          </div>

          {/* 3 Security Cards */}
          <div className="space-y-2.5">
            {/* 1. Login Password */}
            <div
              onClick={() => {
                setPasswordError('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordModal(true);
              }}
              className="bg-[#141824] hover:bg-[#1a2030] border border-[#f5c443]/15 hover:border-[#f5c443]/35 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-md active:scale-99"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-zinc-100">Login password</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-[#f5c443]">
                <span className="font-semibold">Edit</span>
                <ChevronRight className="w-4 h-4 text-[#f5c443]" />
              </div>
            </div>

            {/* 2. Bind Mailbox */}
            <div
              onClick={() => {
                setEmailInput(user?.email || '');
                setShowBindEmailModal(true);
              }}
              className="bg-[#141824] hover:bg-[#1a2030] border border-[#f5c443]/15 hover:border-[#f5c443]/35 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-md active:scale-99"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-zinc-100">Bind mailbox</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <span className={user?.email ? 'text-zinc-200' : 'text-[#f5c443] font-semibold'}>
                  {user?.email ? user.email : 'to bind'}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </div>

            {/* 3. Theme Mode (Dark / Night / Light) */}
            <div className="bg-[#141824] border border-[#f5c443]/15 rounded-2xl p-3.5 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-100 block">Theme Mode</span>
                    <span className="text-[10px] text-zinc-400">Dark / Night / Light</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#f5c443] capitalize">{themeMode}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setThemeMode('light');
                    showToast('Switched to Light Mode (Default)', 'info');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                    themeMode === 'light'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 shadow-lg border border-yellow-300 ring-1 ring-yellow-400'
                      : 'bg-[#1e2336] text-zinc-300 hover:text-white border border-white/5'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setThemeMode('dark');
                    showToast('Switched to Dark Mode', 'info');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                    themeMode === 'dark'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border border-purple-400 ring-1 ring-purple-400'
                      : 'bg-[#1e2336] text-zinc-300 hover:text-white border border-white/5'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark Mode</span>
                </button>
              </div>
            </div>

            {/* 4. Updated Version */}
            <div
              onClick={() => showToast('You are using the latest version: 1.0.9', 'info')}
              className="bg-[#141824] hover:bg-[#1a2030] border border-[#f5c443]/15 hover:border-[#f5c443]/35 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-md active:scale-99"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-zinc-100">Updated version</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <span className="font-mono text-[#f5c443] font-bold">1.0.9</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== CHANGE PASSWORD MODAL ===================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-[#f5c443]/40 rounded-3xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Change Login Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-200 text-xs">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-3">
              {/* Current Password */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full h-11 px-3 pr-10 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  New Password (min 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full h-11 px-3 pr-10 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-11 px-3 pr-10 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-[#0d0f17] font-black text-xs rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {passwordLoading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== EDIT NICKNAME MODAL ===================== */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-[#f5c443]/40 rounded-3xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white">Modify Nickname</h3>
              <button
                onClick={() => setShowNicknameModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNickname} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Enter your nickname"
                  maxLength={20}
                  className="w-full h-11 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNicknameModal(false)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={nicknameLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-[#0d0f17] font-black text-xs rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {nicknameLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== BIND EMAIL MODAL ===================== */}
      {showBindEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-[#f5c443]/40 rounded-3xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white">Bind Mailbox</h3>
              <button
                onClick={() => setShowBindEmailModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmail} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full h-11 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBindEmailModal(false)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-[#0d0f17] font-black text-xs rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {emailLoading ? 'Saving...' : 'Bind'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* End of modals */}
    </div>
  );
};
