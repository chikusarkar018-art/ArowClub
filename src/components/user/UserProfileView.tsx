import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  User, Shield, Lock, Bell, Headphones, BookOpen,
  LogOut, Crown, Wallet, Copy, Check, ChevronRight,
  RefreshCw, Eye, EyeOff, FileText, ArrowDownCircle,
  ArrowUpCircle, History, Settings, MessageSquare,
  Volume2, HelpCircle, Info, Sparkles, Gift, BarChart2,
  Globe, ShieldAlert, KeyRound, AlertTriangle
} from 'lucide-react';
import { UserSettingsCenterView } from './UserSettingsCenterView.js';
import { DEFAULT_AVATAR_URL } from '../../constants/avatars.js';
import { UserLogo } from './UserLogo.js';

interface UserProfileViewProps {
  onBack: () => void;
  onNavigateWallet: (tab?: 'wallet' | 'deposit' | 'withdraw' | 'history' | 'withdraw_history' | 'deposit_history') => void;
  onNavigateTransactionHistory?: (filter?: 'all' | 'deposit' | 'withdrawal' | 'bet' | 'win') => void;
  onNavigateGameHistory?: () => void;
  onNavigateVip: () => void;
  onOpenNotifications: () => void;
  onOpenSupport: () => void;
  onOpenHowToPlay: () => void;
  onLogout: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onBack,
  onNavigateWallet,
  onNavigateTransactionHistory,
  onNavigateGameHistory,
  onNavigateVip,
  onOpenNotifications,
  onOpenSupport,
  onOpenHowToPlay,
  onLogout,
}) => {
  const { user, refreshUser, showToast } = useAuth();
  const [copiedUid, setCopiedUid] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsCenter, setShowSettingsCenter] = useState(false);
  
  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // If settings center is open, render it as full view
  if (showSettingsCenter) {
    return (
      <UserSettingsCenterView
        onBack={() => setShowSettingsCenter(false)}
        onOpenSupport={onOpenSupport}
      />
    );
  }

  const handleCopyUid = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    showToast('UID copied to clipboard', 'info');
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleOpenHistory = async (type: string) => {
    setActiveModal(type);
    setLoadingHistory(true);
    try {
      if (user?.uid) {
        const res = await api.getUserTransactions(user.uid);
        setTransactions(res?.transactions || []);
      }
    } catch {
      // quiet
    } finally {
      setLoadingHistory(false);
    }
  };

  const userAvatar = user?.avatarUrl || DEFAULT_AVATAR_URL;

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col font-sans pb-24 select-none">
      
      {/* Header Profile Info Banner */}
      <div className="bg-gradient-to-b from-[#14151c] via-[#0e0f15] to-[#060709] px-4 pt-5 pb-4 border-b border-[#f5c443]/20">
        <div className="flex items-center gap-3.5">
          {/* Circular Avatar with Luxury Golden Border */}
          <div
            onClick={() => setShowSettingsCenter(true)}
            className="relative cursor-pointer group"
            title="Click to Change Avatar / Settings"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#f5c443] via-[#ffe082] to-[#b38122] p-[2px] shadow-[0_0_15px_rgba(245,196,67,0.35)] overflow-hidden">
              <img
                src={userAvatar}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* VIP badge icon on avatar */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#f5c443] text-[#060709] font-black text-[9px] flex items-center justify-center border-2 border-[#060709] shadow">
              V{user?.vipLevel ?? 0}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Member ID and VIP Chip */}
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-white tracking-wide truncate">
                {user?.username || `Member_${user?.uid?.slice(-4) || '9982'}`}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-[#f5c443] to-[#e5a823] text-[#060709] flex items-center gap-1 shadow-sm">
                <Crown className="w-3 h-3 fill-[#060709]" />
                <span>VIP{user?.vipLevel ?? 0}</span>
              </span>
            </div>

            {/* UID Copy Strip */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-400 font-mono">UID | {user?.uid || '1084291'}</span>
              <button
                onClick={handleCopyUid}
                className="text-[#f5c443] hover:text-white transition p-0.5"
                title="Copy UID"
              >
                {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Last Login */}
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Last login: {user?.lastLogin || new Date().toISOString().replace('T', ' ').slice(0, 19)}
            </div>
          </div>

          {/* Quick Settings Icon Button */}
          <button
            onClick={() => setShowSettingsCenter(true)}
            className="w-9 h-9 rounded-xl bg-[#14151c] border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443] hover:bg-[#f5c443]/10 active:scale-95 transition"
            title="Settings Center"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-3.5 pt-3 max-w-md mx-auto w-full space-y-3.5">
        
        {/* Total Balance Card - Luxury Golden & Black */}
        <div className="bg-gradient-to-br from-[#1c1d26] via-[#12131b] to-[#0a0b0e] border-2 border-[#f5c443]/30 rounded-2xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#f5c443]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                <span>Total balance</span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-zinc-400 hover:text-white transition"
                >
                  {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleRefresh}
                  className={`text-zinc-400 hover:text-[#f5c443] transition ${refreshing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-2xl font-black text-[#fce08b] tracking-tight mt-1 font-mono">
                {showBalance ? `₹ ${(user?.walletBalance ?? 0).toFixed(2)}` : '₹ ****'}
              </div>
            </div>

            {/* Enter Wallet Pill */}
            <button
              onClick={() => onNavigateWallet('deposit')}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#f5c443] via-[#ffb703] to-[#d48b0c] text-[#060709] font-black text-xs rounded-full shadow-[0_0_12px_rgba(245,196,67,0.4)] hover:brightness-110 active:scale-95 transition flex items-center gap-1"
            >
              <span>Enter wallet</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          {/* 4 Action Icons underneath */}
          <div className="grid grid-cols-4 gap-2 pt-4 mt-3 border-t border-white/10 text-center">
            {/* ARWallet */}
            <button
              onClick={() => onNavigateWallet('deposit')}
              className="flex flex-col items-center gap-1.5 group active:scale-95 transition"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#0c0d12] border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443] group-hover:border-[#f5c443] transition shadow-md">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-zinc-300 group-hover:text-[#f5c443]">ARWallet</span>
            </button>

            {/* Deposit */}
            <button
              onClick={() => onNavigateWallet('deposit')}
              className="flex flex-col items-center gap-1.5 group active:scale-95 transition"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#0c0d12] border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443] group-hover:border-[#f5c443] transition shadow-md">
                <ArrowDownCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-zinc-300 group-hover:text-[#f5c443]">Deposit</span>
            </button>

            {/* Withdraw */}
            <button
              onClick={() => onNavigateWallet('withdraw')}
              className="flex flex-col items-center gap-1.5 group active:scale-95 transition"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#0c0d12] border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443] group-hover:border-[#f5c443] transition shadow-md">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-zinc-300 group-hover:text-[#f5c443]">Withdraw</span>
            </button>

            {/* VIP */}
            <button
              onClick={onNavigateVip}
              className="flex flex-col items-center gap-1.5 group active:scale-95 transition"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#0c0d12] border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443] group-hover:border-[#f5c443] transition shadow-md">
                <Crown className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-zinc-300 group-hover:text-[#f5c443]">VIP</span>
            </button>
          </div>
        </div>

        {/* Safe Vault Card Strip */}
        <div
          onClick={() => setActiveModal('safe')}
          className="bg-gradient-to-r from-[#14151c] to-[#0c0d12] border border-[#f5c443]/20 hover:border-[#f5c443]/40 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer shadow-md transition active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">Safe</span>
                <span className="text-xs font-bold text-[#f5c443]">₹ 0.00</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                Daily interest rate 0.1%, income calculated every 1 min
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </div>

        {/* 4 Quick History Cards - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Game History */}
          <div
            onClick={() => {
              if (onNavigateGameHistory) {
                onNavigateGameHistory();
              } else {
                handleOpenHistory('game_history');
              }
            }}
            className="bg-[#0f1016] border border-[#f5c443]/20 hover:border-[#f5c443]/50 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer shadow-md transition active:scale-98"
          >
            <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Game History</div>
              <div className="text-[9px] text-zinc-400">My game bet records</div>
            </div>
          </div>

          {/* Transaction History (Navigates to dedicated page) */}
          <div
            onClick={() => {
              if (onNavigateTransactionHistory) {
                onNavigateTransactionHistory('all');
              } else {
                handleOpenHistory('transaction_history');
              }
            }}
            className="bg-[#0f1016] border border-[#f5c443]/20 hover:border-[#f5c443]/50 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer shadow-md transition active:scale-98"
          >
            <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Transaction</div>
              <div className="text-[9px] text-zinc-400">All ledger balance</div>
            </div>
          </div>

          {/* Deposit History (Navigates to dedicated page) */}
          <div
            onClick={() => {
              if (onNavigateTransactionHistory) {
                onNavigateTransactionHistory('deposit');
              } else {
                onNavigateWallet('deposit_history');
              }
            }}
            className="bg-[#0f1016] border border-[#f5c443]/20 hover:border-[#f5c443]/50 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer shadow-md transition active:scale-98"
          >
            <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Deposit</div>
              <div className="text-[9px] text-zinc-400">Recharge history</div>
            </div>
          </div>

          {/* Withdraw History (Navigates to dedicated page) */}
          <div
            onClick={() => {
              if (onNavigateTransactionHistory) {
                onNavigateTransactionHistory('withdrawal');
              } else {
                onNavigateWallet('withdraw_history');
              }
            }}
            className="bg-[#0f1016] border border-[#f5c443]/20 hover:border-[#f5c443]/50 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer shadow-md transition active:scale-98"
          >
            <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443]">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Withdraw</div>
              <div className="text-[9px] text-zinc-400">Payout records</div>
            </div>
          </div>
        </div>

        {/* Settings & Info Menu List */}
        <div className="bg-[#0f1016] border border-[#f5c443]/20 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-md">
          {/* Notification */}
          <button
            onClick={onOpenNotifications}
            className="w-full p-3.5 flex items-center justify-between hover:bg-white/5 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#f5c443]/15 text-[#f5c443] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-200">Notification</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Gifts */}
          <button
            onClick={() => setActiveModal('gift')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-white/5 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#f5c443]/15 text-[#f5c443] flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-200">Gifts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Game statistics */}
          <button
            onClick={() => setActiveModal('statistics')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-white/5 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#f5c443]/15 text-[#f5c443] flex items-center justify-center">
                <BarChart2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-200">Game statistics</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Language */}
          <button
            onClick={() => showToast('Selected English (Default)', 'info')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-white/5 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#f5c443]/15 text-[#f5c443] flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-200">Language</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>English</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          </button>
        </div>

        {/* Service Center 2x3 Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-zinc-300 px-1">Service center</h3>
          <div className="grid grid-cols-3 gap-2">
            {/* Settings */}
            <button
              onClick={() => setShowSettingsCenter(true)}
              className="p-3 bg-[#0f1016] hover:bg-[#151720] border border-[#f5c443]/15 rounded-xl flex flex-col items-center gap-1 text-center transition active:scale-95 shadow-sm"
            >
              <Settings className="w-5 h-5 text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-300">Settings</span>
            </button>

            {/* Feedback */}
            <button
              onClick={() => setActiveModal('feedback')}
              className="p-3 bg-[#0f1016] hover:bg-[#151720] border border-[#f5c443]/15 rounded-xl flex flex-col items-center gap-1 text-center transition active:scale-95 shadow-sm"
            >
              <MessageSquare className="w-5 h-5 text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-300">Feedback</span>
            </button>

            {/* Announcement */}
            <button
              onClick={onOpenNotifications}
              className="p-3 bg-[#0f1016] hover:bg-[#151720] border border-[#f5c443]/15 rounded-xl flex flex-col items-center gap-1 text-center transition active:scale-95 shadow-sm"
            >
              <Volume2 className="w-5 h-5 text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-300">Announcement</span>
            </button>

            {/* Customer Service */}
            <button
              onClick={onOpenSupport}
              className="p-3 bg-[#0f1016] hover:bg-[#151720] border border-[#f5c443]/15 rounded-xl flex flex-col items-center gap-1 text-center transition active:scale-95 shadow-sm"
            >
              <Headphones className="w-5 h-5 text-[#f5c443]" />
              <span className="text-[10px] font-bold text-[#fce08b]">Customer Service</span>
            </button>

            {/* Beginner's Guide */}
            <button
              onClick={onOpenHowToPlay}
              className="p-3 bg-[#0f1016] hover:bg-[#151720] border border-[#f5c443]/15 rounded-xl flex flex-col items-center gap-1 text-center transition active:scale-95 shadow-sm"
            >
              <HelpCircle className="w-5 h-5 text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-300">Beginner's Guide</span>
            </button>

            {/* About us */}
            <button
              onClick={() => setActiveModal('about')}
              className="p-3 bg-[#141824] hover:bg-[#1a1f2e] border border-[#f5c443]/15 rounded-xl flex flex-col items-center gap-1 text-center transition active:scale-95 shadow-sm"
            >
              <Info className="w-5 h-5 text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-300">About us</span>
            </button>
          </div>
        </div>

        {/* Log out Button - Pill Outline */}
        <div className="pt-2">
          <button
            onClick={onLogout}
            className="w-full py-3 bg-[#141824] hover:bg-[#1f2436] border border-[#f5c443]/30 hover:border-[#f5c443] font-bold text-xs text-[#f5c443] rounded-full transition flex items-center justify-center gap-2 active:scale-98 shadow-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Dynamic Sub-Modals for Details */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161a2b] border border-[#f5c443]/30 rounded-2xl max-w-sm w-full p-4 text-white shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-[#fce08b] capitalize">
                {activeModal.replace('_', ' ')}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2 text-xs">
              {/* Safe Vault Modal */}
              {activeModal === 'safe' && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#0d0f17] rounded-xl border border-[#f5c443]/20 text-center">
                    <div className="text-zinc-400 text-[10px]">Safe Current Balance</div>
                    <div className="text-xl font-black text-[#f5c443] mt-1">₹ 0.00</div>
                    <div className="text-[10px] text-emerald-400 mt-1">Daily yield rate +0.10%</div>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Deposit idle funds into your Safe to earn continuous minute-by-minute compounding returns. Funds can be transferred back to your main wallet at any time without fees.
                  </p>
                  <button
                    onClick={() => showToast('Safe transfers are currently active', 'info')}
                    className="w-full py-2.5 bg-[#f5c443] text-[#0d0f17] font-black rounded-xl"
                  >
                    Transfer to Safe
                  </button>
                </div>
              )}

              {/* Gift Modal */}
              {activeModal === 'gift' && (
                <div className="space-y-3">
                  <p className="text-zinc-400 text-[11px]">
                    Enter a gift code provided by official ArowClub Telegram promotions to claim instant bonus cash.
                  </p>
                  <input
                    type="text"
                    placeholder="Enter gift code"
                    className="w-full h-10 px-3 bg-[#0d0f17] border border-[#f5c443]/30 rounded-xl text-white font-mono uppercase"
                  />
                  <button
                    onClick={() => showToast('Please enter a valid gift code', 'error')}
                    className="w-full py-2.5 bg-[#f5c443] text-[#0d0f17] font-black rounded-xl"
                  >
                    Redeem Code
                  </button>
                </div>
              )}

              {/* Statistics Modal */}
              {activeModal === 'statistics' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 bg-[#0d0f17] rounded-xl border border-white/5">
                      <div className="text-[10px] text-zinc-400">Total Bet Amount</div>
                      <div className="text-xs font-black text-[#f5c443] mt-1">
                        ₹ {(user?.totalBet ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#0d0f17] rounded-xl border border-white/5">
                      <div className="text-[10px] text-zinc-400">Total Win Amount</div>
                      <div className="text-xs font-black text-emerald-400 mt-1">
                        ₹ {(user?.totalWin ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#0d0f17] rounded-xl border border-white/5">
                      <div className="text-[10px] text-zinc-400">Current Turnover</div>
                      <div className="text-xs font-black text-cyan-400 mt-1">
                        ₹ {(user?.currentTurnover ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#0d0f17] rounded-xl border border-white/5">
                      <div className="text-[10px] text-zinc-400">Required Turnover</div>
                      <div className="text-xs font-black text-amber-400 mt-1">
                        ₹ {(user?.requiredTurnover ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings / Security Modal */}
              {activeModal === 'settings' && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#0d0f17] rounded-xl border border-[#f5c443]/20">
                    <div className="text-xs font-bold text-white mb-1">Account Security</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Per ArowClub security policy, password resets and sensitive account changes are managed directly by 24/7 Customer Support.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      onOpenSupport();
                    }}
                    className="w-full py-2.5 bg-[#f5c443] text-[#0d0f17] font-black rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Contact Customer Service</span>
                  </button>
                </div>
              )}

              {/* About Us Modal */}
              {activeModal === 'about' && (
                <div className="space-y-2 text-zinc-300 text-[11px] leading-relaxed">
                  <p>
                    <strong className="text-[#f5c443]">ArowClub</strong> is a premier color lottery and interactive gaming platform offering certified provably fair odds, instantaneous UPI recharges, and rapid automated withdrawals.
                  </p>
                  <p className="text-zinc-400">
                    Version: 3.2.0 (Build 2026.08)
                  </p>
                </div>
              )}

              {/* History Lists */}
              {(activeModal.includes('history')) && (
                <div className="space-y-1.5">
                  {loadingHistory ? (
                    <div className="text-center py-6 text-zinc-400">Loading history...</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500">No records found</div>
                  ) : (
                    transactions
                      .filter(t => {
                        if (activeModal === 'deposit_history') return t.type === 'deposit';
                        if (activeModal === 'withdraw_history') return t.type === 'withdrawal';
                        if (activeModal === 'game_history') return t.type === 'bet' || t.type === 'win';
                        return true;
                      })
                      .map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-[#0d0f17] rounded-xl border border-white/5 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-white capitalize">{item.type}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{item.createdAt?.slice(0, 16).replace('T', ' ')}</div>
                          </div>
                          <div className={`font-black ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.amount >= 0 ? `+₹${item.amount.toFixed(2)}` : `-₹${Math.abs(item.amount).toFixed(2)}`}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
