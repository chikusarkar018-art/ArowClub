import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { User, DepositRequest, WithdrawalRequest, Bet, WalletTransaction } from '../../types.js';
import {
  ArrowLeft, User as UserIcon, Shield, Phone, Mail, Calendar,
  Clock, DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle,
  TrendingUp, TrendingDown, Layers, History, ShieldAlert,
  ShieldCheck, CheckCircle2, XCircle, Building2, Trash2,
  Key, Eye, EyeOff, Copy, RefreshCw, Check
} from 'lucide-react';
import { BallView } from '../common/BallView.js';

interface UserDetailsViewProps {
  uid: string;
  onBack: () => void;
}

export const UserDetailsView: React.FC<UserDetailsViewProps> = ({ uid, onBack }) => {
  const [data, setData] = useState<{
    user: User;
    rollover?: {
      requiredTurnover: number;
      completedTurnover: number;
      remainingTurnover: number;
      rolloverProgress: number;
      isCompleted: boolean;
    };
    deposits: DepositRequest[];
    withdrawals: WithdrawalRequest[];
    bets: Bet[];
    transactions: WalletTransaction[];
    loginHistory: any[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'bankAccounts' | 'bets' | 'transactions' | 'gameHistory' | 'loginHistory'>('overview');
  const [loading, setLoading] = useState(true);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);

  // Password reset modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('Password@123');
  const [showPasswordText, setShowPasswordText] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccessInfo, setResetSuccessInfo] = useState<{
    uid: string;
    username: string;
    phone: string;
    password: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Manual Deposit / Withdrawal Modals
  const [showManualDepositModal, setShowManualDepositModal] = useState(false);
  const [showManualWithdrawModal, setShowManualWithdrawModal] = useState(false);
  const [manualAmount, setManualAmount] = useState('500');
  const [manualUtr, setManualUtr] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualMethod, setManualMethod] = useState('Admin Manual Credit (UPI/Bank)');
  const [processingManual, setProcessingManual] = useState(false);

  const handleManualDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.user) return;
    const amt = Number(manualAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }
    setProcessingManual(true);
    try {
      const res = await api.adminCreateManualDeposit({
        uid: data.user.uid,
        amount: amt,
        utrReference: manualUtr.trim() || undefined,
        paymentMethod: manualMethod,
        adminNote: manualNote.trim() || undefined,
        adminUsername: 'SuperAdmin',
      });
      if (res.success) {
        alert(`Successfully deposited ₹${amt} to ${data.user.username}'s wallet!`);
        setShowManualDepositModal(false);
        setManualAmount('500');
        setManualUtr('');
        setManualNote('');
        const refreshRes = await api.getAdminUserDetails(uid);
        if (refreshRes?.user) setData(refreshRes);
      } else {
        alert(res.error || 'Failed to create manual deposit');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create manual deposit');
    } finally {
      setProcessingManual(false);
    }
  };

  const handleManualWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.user) return;
    const amt = Number(manualAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }
    if (amt > data.user.walletBalance) {
      alert(`Insufficient balance! User wallet balance is ₹${data.user.walletBalance}`);
      return;
    }

    const completedTurnover = Number(data?.rollover?.completedTurnover ?? data?.user.completedTurnover ?? 0);
    const requiredTurnover = Number(data?.rollover?.requiredTurnover ?? data?.user.requiredTurnover ?? 0);
    const remainingTurnover = data?.rollover?.remainingTurnover !== undefined 
      ? Number(data.rollover.remainingTurnover) 
      : (data?.user.remainingTurnover !== undefined 
          ? Number(data.user.remainingTurnover) 
          : Math.max(0, parseFloat((requiredTurnover - completedTurnover).toFixed(2))));

    if (remainingTurnover > 0) {
      alert(`Withdrawal Blocked: Rollover Incomplete (रोलओवर अधूरा है)!\n\nUser has ₹${remainingTurnover.toFixed(2)} remaining rollover requirement pending (Played: ₹${completedTurnover.toFixed(2)} / Required: ₹${requiredTurnover.toFixed(2)}).\n\nManual withdrawal cannot be processed until the player completes the required rollover.`);
      return;
    }

    setProcessingManual(true);
    try {
      const res = await api.adminCreateManualWithdrawal({
        uid: data.user.uid,
        amount: amt,
        payoutUtr: manualUtr.trim() || undefined,
        adminNote: manualNote.trim() || undefined,
        adminUsername: 'SuperAdmin',
      });
      if (res.success) {
        alert(`Successfully processed manual withdrawal of ₹${amt} for ${data.user.username}!`);
        setShowManualWithdrawModal(false);
        setManualAmount('500');
        setManualUtr('');
        setManualNote('');
        const refreshRes = await api.getAdminUserDetails(uid);
        if (refreshRes?.user) setData(refreshRes);
      } else {
        alert(res.error || 'Failed to create manual withdrawal');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create manual withdrawal');
    } finally {
      setProcessingManual(false);
    }
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#';
    let rand = '';
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(rand);
  };

  const handleCopyCredentials = (info: { uid: string; phone: string; password: string; username: string }) => {
    const text = `ArowClub Login Credentials:\nUID: ${info.uid}\nPhone: ${info.phone}\nPassword: ${info.password}`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handlePasswordReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!data?.user) return;
    const pass = newPassword.trim();
    if (!pass || pass.length < 4) {
      alert('Password must be at least 4 characters long');
      return;
    }

    try {
      setResettingPassword(true);
      const res = await api.resetUserPassword(data.user.uid, pass, 'SuperAdmin');
      const updatedPass = res?.newPassword || pass;
      setResetSuccessInfo({
        uid: data.user.uid,
        username: data.user.username,
        phone: data.user.phone,
        password: updatedPass,
      });
      // Refresh user details
      const refreshRes = await api.getAdminUserDetails(uid);
      if (refreshRes?.user) setData(refreshRes);
    } catch (err: any) {
      alert(err.message || 'Password reset failed');
    } finally {
      setResettingPassword(false);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.getAdminUserDetails(uid);
        if (res?.user) setData(res);
      } catch (err) {
        console.error('Failed to load user details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [uid]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { user, deposits, withdrawals, bets, transactions, loginHistory } = data;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'deposits', label: `Deposits (${deposits.length})` },
    { id: 'withdrawals', label: `Withdrawals (${withdrawals.length})` },
    { id: 'bankAccounts', label: `Bank Accounts (${(user.bankAccounts || []).length})` },
    { id: 'bets', label: `Bets (${bets.length})` },
    { id: 'transactions', label: `Transactions (${transactions.length})` },
    { id: 'gameHistory', label: 'Game History' },
    { id: 'loginHistory', label: 'Login History' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar with Back button & Action buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#121215] border border-[#26262a] hover:bg-[#1a1a1e] text-[#e0e0e0] rounded-lg text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users List</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setManualAmount('500');
              setManualUtr('');
              setManualNote('');
              setShowManualDepositModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition shadow-sm"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>+ Manual Deposit</span>
          </button>

          <button
            onClick={() => {
              setManualAmount('500');
              setManualUtr('');
              setManualNote('');
              setShowManualWithdrawModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition shadow-sm"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>- Manual Payout</span>
          </button>

          <button
            onClick={() => {
              setNewPassword('Password@123');
              setShowPasswordText(true);
              setResetSuccessInfo(null);
              setCopiedText(false);
              setShowPasswordModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold transition"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
          <span className="text-xs text-[#71717a] font-mono">UID #{user.uid}</span>
        </div>
      </div>

      {/* User Header Profile Card */}
      <div className="bg-[#121215] border border-[#26262a] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#f3e5ab] flex items-center justify-center text-black font-black text-2xl shadow-lg">
              {user.username.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white">{user.username}</h2>
                <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-semibold">
                  VIP {user.vipLevel}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    user.status === 'active'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border-rose-800'
                  }`}
                >
                  {user.status === 'active' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span className="capitalize">{user.status}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#a1a1aa]">
                <span className="font-mono text-[#d4af37] font-semibold">UID: {user.uid}</span>
                <span>•</span>
                <span>Phone: {user.phone}</span>
                <span>•</span>
                <span>Registered: {new Date(user.registrationDate).toLocaleDateString()}</span>
                <span>•</span>
                <span>Last Login: {new Date(user.lastLogin).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-center">
              <div className="text-[10px] text-[#a1a1aa] font-semibold uppercase">Wallet Balance</div>
              <div className="text-base font-bold text-emerald-400 font-mono">₹{user.walletBalance.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-center">
              <div className="text-[10px] text-[#a1a1aa] font-semibold uppercase">Total Deposit</div>
              <div className="text-base font-bold text-white font-mono">₹{user.totalDeposit.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-3 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-center">
              <div className="text-[10px] text-[#a1a1aa] font-semibold uppercase">Total Withdrawal</div>
              <div className="text-base font-bold text-white font-mono">₹{user.totalWithdrawal.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-3 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-center">
              <div className="text-[10px] text-[#a1a1aa] font-semibold uppercase">Total Turnover</div>
              <div className="text-base font-bold text-[#d4af37] font-mono">₹{user.totalBet.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Tabs Bar */}
      <div className="flex bg-[#121215] border border-[#26262a] p-1.5 rounded-xl overflow-x-auto gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-[#d4af37] text-black font-bold shadow-md'
                : 'text-[#a1a1aa] hover:text-white hover:bg-[#1a1a1e]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Panels */}
      <div className="bg-[#121215] border border-[#26262a] rounded-xl p-5 shadow-xl">
        {/* 1. Overview Tab */}
        {activeTab === 'overview' && (() => {
          const compTurn = Number(data?.rollover?.completedTurnover ?? user.completedTurnover ?? 0);
          const reqTurn = Number(data?.rollover?.requiredTurnover ?? user.requiredTurnover ?? 0);
          const remTurn = data?.rollover?.remainingTurnover !== undefined 
            ? Number(data.rollover.remainingTurnover) 
            : (user.remainingTurnover !== undefined 
                ? Number(user.remainingTurnover) 
                : Math.max(0, parseFloat((reqTurn - compTurn).toFixed(2))));
          const rollPct = reqTurn > 0 ? Math.min(100, Math.round((compTurn / reqTurn) * 100)) : 100;
          const isRollMet = remTurn <= 0;

          return (
            <div className="space-y-6">
              {/* Rollover Requirement Status Card */}
              <div className={`p-4 rounded-xl border ${
                isRollMet 
                  ? 'bg-emerald-950/20 border-emerald-500/30' 
                  : 'bg-amber-950/20 border-amber-500/40'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isRollMet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {isRollMet ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Game Rollover / Wagering Requirement (रोलओवर स्थिति)</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isRollMet 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        }`}>
                          {isRollMet ? '✅ 100% Completed' : `⏳ ₹${remTurn.toFixed(2)} Pending`}
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        {isRollMet 
                          ? 'This user has fulfilled all game wagering conditions. Allowed to withdraw.' 
                          : 'Rollover is incomplete. User must bet more before withdrawing.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400">Rollover Progress</div>
                      <div className={`font-mono font-bold text-sm ${isRollMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {rollPct}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#18181b] h-2.5 rounded-full overflow-hidden mb-3 border border-[#26262a]">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isRollMet ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-rose-500'
                    }`}
                    style={{ width: `${Math.max(2, rollPct)}%` }}
                  />
                </div>

                {/* Stats 3-Col Box */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-[#0a0a0b]/60 rounded-lg border border-[#26262a]">
                    <span className="text-[10px] text-zinc-400 block">Required Turnover</span>
                    <span className="font-mono font-bold text-white text-xs sm:text-sm">₹{reqTurn.toFixed(2)}</span>
                  </div>
                  <div className="p-2.5 bg-[#0a0a0b]/60 rounded-lg border border-[#26262a]">
                    <span className="text-[10px] text-zinc-400 block">Completed (Played)</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">₹{compTurn.toFixed(2)}</span>
                  </div>
                  <div className="p-2.5 bg-[#0a0a0b]/60 rounded-lg border border-[#26262a]">
                    <span className="text-[10px] text-zinc-400 block">Remaining Pending</span>
                    <span className={`font-mono font-bold text-xs sm:text-sm ${isRollMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{remTurn.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-sm">Account Overview</h3>
                  <div className="space-y-2 text-xs divide-y divide-[#26262a]">
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">UID:</span> <span className="font-mono text-white font-bold">{user.uid}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Username:</span> <span className="text-white font-medium">{user.username}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Phone Number:</span> <span className="text-white">{user.phone}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Email Address:</span> <span className="text-white">{user.email || 'None'}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Referral Code:</span> <span className="font-mono text-[#d4af37] font-bold">{user.referralCode}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Referred By UID:</span> <span className="font-mono text-[#e0e0e0]">{user.referredBy || 'Direct Signup'}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Account Status:</span> <span className="font-bold uppercase text-emerald-400">{user.status}</span></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-white text-sm">Game & Financial Stats</h3>
                  <div className="space-y-2 text-xs divide-y divide-[#26262a]">
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Current Balance:</span> <span className="font-mono text-emerald-400 font-bold text-sm">₹{user.walletBalance.toFixed(2)}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Total Deposits:</span> <span className="font-mono text-white">₹{user.totalDeposit.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Total Withdrawals:</span> <span className="font-mono text-white">₹{user.totalWithdrawal.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Total Bets Placed:</span> <span className="font-mono text-white">₹{user.totalBet.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Total Winning Payout:</span> <span className="font-mono text-emerald-400 font-bold">₹{user.totalWin.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">Total Losing Bets:</span> <span className="font-mono text-rose-400">₹{user.totalLoss.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between py-2"><span className="text-[#a1a1aa]">VIP Level & EXP:</span> <span className="text-[#d4af37] font-bold">VIP {user.vipLevel} ({user.vipExp} EXP)</span></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 2. Deposits Tab */}
        {activeTab === 'deposits' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a] pb-2">
                <tr>
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">UTR Reference</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262a]">
                {deposits.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-[#71717a]">No deposit records</td></tr>
                ) : (
                  deposits.map(d => (
                    <tr key={d.id} className="hover:bg-[#1a1a1e]/30">
                      <td className="py-2.5 px-3 font-mono text-[#e0e0e0]">{d.id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">₹{d.amount}</td>
                      <td className="py-2.5 px-3 text-[#e0e0e0]">{d.paymentMethod}</td>
                      <td className="py-2.5 px-3 font-mono text-[#d4af37]">{d.utrReference}</td>
                      <td className="py-2.5 px-3 text-[#a1a1aa]">{new Date(d.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          d.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          d.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a] pb-2">
                <tr>
                  <th className="py-2.5 px-3">Withdrawal ID</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Bank / UPI</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262a]">
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-[#71717a]">No withdrawal records</td></tr>
                ) : (
                  withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-[#1a1a1e]/30">
                      <td className="py-2.5 px-3 font-mono text-[#e0e0e0]">{w.id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-400">₹{w.amount}</td>
                      <td className="py-2.5 px-3 text-[#e0e0e0]">
                        {w.bankUpiDetails?.upiId || (w.bankUpiDetails?.bankName ? `${w.bankUpiDetails.bankName} - ${w.bankUpiDetails.accountNumber}` : (w.bankName ? `${w.bankName} - ${w.accountNumber}` : '---'))}
                      </td>
                      <td className="py-2.5 px-3 text-[#a1a1aa]">{new Date(w.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          w.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          w.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3b. Bank Beneficiaries Tab (Admin Control) */}
        {activeTab === 'bankAccounts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#d4af37]" />
                <span>User Linked Bank Beneficiaries (Max 3 Allowed)</span>
              </h3>
              <span className="text-xs text-[#a1a1aa]">
                Total: {(user.bankAccounts || []).length} / 3 Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(!user.bankAccounts || user.bankAccounts.length === 0) ? (
                <div className="col-span-full py-8 text-center text-xs text-[#71717a] bg-[#0a0a0b] rounded-xl border border-[#26262a]">
                  No bank accounts or beneficiaries added by this user yet.
                </div>
              ) : (
                user.bankAccounts.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl bg-[#0a0a0b] border border-[#26262a] space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#d4af37]" />
                        <span className="font-bold text-white text-xs">{b.bankName}</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to delete bank beneficiary ${b.bankName} (${b.accountNumber}) for user ${user.uid}?`)) return;
                          try {
                            setDeletingBankId(b.id);
                            await api.deleteAdminUserBankAccount(user.uid, b.id, 'SuperAdmin');
                            // Refresh
                            const res = await api.getAdminUserDetails(uid);
                            if (res?.user) setData(res);
                          } catch (err: any) {
                            alert(err.message || 'Failed to delete bank account');
                          } finally {
                            setDeletingBankId(null);
                          }
                        }}
                        disabled={deletingBankId === b.id}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition"
                        title="Delete Bank Account (Admin Action)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#a1a1aa]">
                      <div className="flex justify-between">
                        <span>Holder:</span>
                        <span className="font-bold text-white">{b.accountHolder || (b as any).accountHolderName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>A/C No:</span>
                        <span className="font-mono font-bold text-[#d4af37]">{b.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IFSC:</span>
                        <span className="font-mono text-white">{b.ifsc || (b as any).ifscCode}</span>
                      </div>
                      <div className="flex justify-between text-[11px] pt-1 border-t border-[#1f1f23]">
                        <span>Added On:</span>
                        <span>{b.addedAt ? new Date(b.addedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. Bets Tab */}
        {activeTab === 'bets' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a] pb-2">
                <tr>
                  <th className="py-2.5 px-3">Bet ID / Period</th>
                  <th className="py-2.5 px-3">Game Type</th>
                  <th className="py-2.5 px-3">Selection</th>
                  <th className="py-2.5 px-3">Bet Amount</th>
                  <th className="py-2.5 px-3">Win Amount</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262a]">
                {bets.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-[#71717a]">No bets placed yet</td></tr>
                ) : (
                  bets.map(b => (
                    <tr key={b.id} className="hover:bg-[#1a1a1e]/30">
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-[#e0e0e0]">{b.id}</div>
                        <div className="font-mono text-[11px] text-[#71717a]">#{b.periodId}</div>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[#d4af37] font-semibold">{b.gameType}</td>
                      <td className="py-2.5 px-3 font-bold uppercase text-white">{b.selection}</td>
                      <td className="py-2.5 px-3 font-mono text-[#e0e0e0]">₹{b.totalAmount}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                        {b.winAmount > 0 ? `₹${b.winAmount}` : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {b.resultNumber !== undefined ? (
                          <BallView number={b.resultNumber} size="xs" />
                        ) : (
                          <span className="text-[#71717a]">Pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'won' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          b.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a] pb-2">
                <tr>
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Prev / New Balance</th>
                  <th className="py-2.5 px-3">Reference / Note</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262a]">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#1a1a1e]/30">
                    <td className="py-2.5 px-3 font-mono text-[#71717a]">{t.id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.amount >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 font-mono font-bold ${t.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.amount >= 0 ? `+₹${t.amount}` : `-₹${Math.abs(t.amount)}`}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#a1a1aa]">
                      ₹{t.previousBalance} → <span className="text-white font-bold">₹{t.newBalance}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#e0e0e0]">
                      <div>{t.reference}</div>
                      {t.note && <div className="text-[11px] text-[#71717a]">{t.note}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-[#71717a]">{new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Game History & 7. Login History */}
        {activeTab === 'gameHistory' && (
          <div className="text-xs text-[#a1a1aa]">
            <p className="mb-3">Recent game participation across all Win Go cycles for UID {user.uid}:</p>
            <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-lg">
              <span className="text-white font-bold">{bets.length}</span> total rounds played with turnover of{' '}
              <span className="text-[#d4af37] font-bold">₹{user.totalBet.toLocaleString('en-IN')}</span> and payout of{' '}
              <span className="text-emerald-400 font-bold">₹{user.totalWin.toLocaleString('en-IN')}</span>.
            </div>
          </div>
        )}

        {activeTab === 'loginHistory' && (
          <div className="space-y-2">
            {loginHistory.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#121215] text-[#a1a1aa] font-mono">
                    IP: {item.ip}
                  </div>
                  <div className="text-white font-medium">{item.device}</div>
                </div>
                <div className="text-[#71717a]">{new Date(item.time).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Password Reset */}
      {showPasswordModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121215] border border-[#26262a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            {resetSuccessInfo ? (
              /* Success Confirmation & Copy View */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Password Updated Successfully</h3>
                    <p className="text-xs text-emerald-400">User account can now log in with the new password.</p>
                  </div>
                </div>

                <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs border-b border-[#1f1f23] pb-2">
                    <span className="text-[#71717a]">Player Username:</span>
                    <span className="text-white font-bold">{resetSuccessInfo.username}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-[#1f1f23] pb-2">
                    <span className="text-[#71717a]">User ID (UID):</span>
                    <span className="font-mono text-[#d4af37] font-bold">{resetSuccessInfo.uid}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-[#1f1f23] pb-2">
                    <span className="text-[#71717a]">Phone Number:</span>
                    <span className="font-mono text-white font-semibold">{resetSuccessInfo.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#71717a]">New Password:</span>
                    <span className="font-mono font-black text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded border border-purple-500/30">
                      {resetSuccessInfo.password}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26262a]">
                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(resetSuccessInfo)}
                    className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                  >
                    {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedText ? 'Credentials Copied!' : 'Copy Login Details'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setResetSuccessInfo(null);
                    }}
                    className="px-4 py-2.5 bg-[#1a1a1e] text-[#a1a1aa] hover:text-white font-semibold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Password Reset Form */
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Reset Player Password</h3>
                    <p className="text-xs text-[#a1a1aa]">
                      UID: <span className="text-[#d4af37] font-bold font-mono">{user.uid}</span> ({user.username})
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs space-y-1">
                  <div className="flex justify-between text-[#71717a]">
                    <span>Registered Phone:</span>
                    <span className="text-white font-mono">{user.phone}</span>
                  </div>
                  <div className="flex justify-between text-[#71717a]">
                    <span>Current Wallet Balance:</span>
                    <span className="text-emerald-400 font-mono font-bold">₹{user.walletBalance.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
                    Enter New Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="e.g. Password@123 or 123456"
                      className="w-full px-3 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-sm font-mono text-white focus:outline-none focus:border-purple-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white p-1"
                    >
                      {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#71717a] mb-1.5">
                    <span>Quick Password Presets:</span>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="w-3 h-3" /> Generate Random
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Password@123', '123456', 'Win777', 'Arow@2026'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewPassword(preset)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded border transition ${
                          newPassword === preset
                            ? 'bg-purple-950 border-purple-500 text-purple-200 font-bold'
                            : 'bg-[#1a1a1e] border-[#26262a] text-[#a1a1aa] hover:text-white'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26262a]">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 bg-[#1a1a1e] text-[#a1a1aa] rounded-lg text-xs font-semibold hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {resettingPassword ? 'Resetting...' : 'Confirm Reset'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: MANUAL DEPOSIT ================= */}
      {showManualDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#26262a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                <span>Admin Manual Deposit / Credit</span>
              </h3>
              <button
                onClick={() => setShowManualDepositModal(false)}
                className="text-[#71717a] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualDeposit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-[#18181b] border border-[#26262a] rounded-xl flex justify-between items-center">
                <div>
                  <div className="text-zinc-400 text-[10px]">Beneficiary User</div>
                  <div className="font-bold text-white">{data?.user.username}</div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-400 text-[10px]">Current Balance</div>
                  <div className="font-bold text-emerald-400 font-mono">₹{data?.user.walletBalance.toFixed(2)}</div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Deposit Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#26262a] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Payment Method / Channel</label>
                <input
                  type="text"
                  value={manualMethod}
                  onChange={(e) => setManualMethod(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#26262a] rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Transaction / UTR Reference No. (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 423987123456"
                  value={manualUtr}
                  onChange={(e) => setManualUtr(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#26262a] rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Admin Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Manual UPI Recharge / Special Bonus"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#26262a] rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#26262a]">
                <button
                  type="button"
                  onClick={() => setShowManualDepositModal(false)}
                  className="px-4 py-2 bg-[#18181b] text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingManual}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  {processingManual ? 'Processing...' : `Confirm Deposit ₹${manualAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MANUAL WITHDRAWAL ================= */}
      {showManualWithdrawModal && (() => {
        const compTurn = Number(data?.rollover?.completedTurnover ?? data?.user.completedTurnover ?? 0);
        const reqTurn = Number(data?.rollover?.requiredTurnover ?? data?.user.requiredTurnover ?? 0);
        const remTurn = data?.rollover?.remainingTurnover !== undefined 
          ? Number(data.rollover.remainingTurnover) 
          : (data?.user.remainingTurnover !== undefined 
              ? Number(data.user.remainingTurnover) 
              : Math.max(0, parseFloat((reqTurn - compTurn).toFixed(2))));
        const rollPct = reqTurn > 0 ? Math.min(100, Math.round((compTurn / reqTurn) * 100)) : 100;
        const isRollMet = remTurn <= 0;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121215] border border-[#26262a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-amber-400" />
                  <span>Admin Manual Payout / Withdrawal</span>
                </h3>
                <button
                  onClick={() => setShowManualWithdrawModal(false)}
                  className="text-[#71717a] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleManualWithdrawal} className="space-y-3.5 text-xs">
                <div className="p-3 bg-[#18181b] border border-[#26262a] rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-zinc-400 text-[10px]">User Account</div>
                    <div className="font-bold text-white">{data?.user.username} (UID #{data?.user.uid})</div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-400 text-[10px]">Available Balance</div>
                    <div className="font-bold text-amber-400 font-mono text-sm">₹{data?.user.walletBalance.toFixed(2)}</div>
                  </div>
                </div>

                {/* Rollover Status Box */}
                <div className={`p-3.5 rounded-xl border ${
                  isRollMet 
                    ? 'bg-emerald-950/20 border-emerald-500/30' 
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {isRollMet ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
                      <span>Rollover Requirement (रोलओवर)</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isRollMet ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {isRollMet ? '✅ 100% Completed' : `⏳ Incomplete (${rollPct}%)`}
                    </span>
                  </div>

                  {/* 3 mini stats */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] mb-2 font-mono">
                    <div className="bg-[#0a0a0b]/60 p-1.5 rounded border border-[#26262a]">
                      <span className="text-[9px] text-zinc-400 block font-sans">Required</span>
                      <span className="text-white font-bold">₹{reqTurn.toFixed(0)}</span>
                    </div>
                    <div className="bg-[#0a0a0b]/60 p-1.5 rounded border border-[#26262a]">
                      <span className="text-[9px] text-zinc-400 block font-sans">Completed</span>
                      <span className="text-emerald-400 font-bold">₹{compTurn.toFixed(0)}</span>
                    </div>
                    <div className="bg-[#0a0a0b]/60 p-1.5 rounded border border-[#26262a]">
                      <span className="text-[9px] text-zinc-400 block font-sans">Pending</span>
                      <span className={`font-bold ${isRollMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{remTurn.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Warning / Notice */}
                  {!isRollMet ? (
                    <div className="text-[11px] text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 leading-tight">
                      ⛔ <strong>Rollover Incomplete:</strong> User has ₹{remTurn.toFixed(2)} pending game turnover requirement. As per system rules, manual withdrawal cannot be processed until rollover is completed.
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 leading-tight">
                      ✅ <strong>Rollover Cleared:</strong> User has fulfilled 100% turnover requirement. Safe to payout.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Withdrawal Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={data?.user.walletBalance || 999999}
                    step="1"
                    disabled={!isRollMet}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#26262a] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Bank / UPI Transfer UTR Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. IMPS49281903482"
                    disabled={!isRollMet}
                    value={manualUtr}
                    onChange={(e) => setManualUtr(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#26262a] rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Admin Reason / Audit Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Direct Offline IMPS Settlement"
                    disabled={!isRollMet}
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#26262a] rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#26262a]">
                  <button
                    type="button"
                    onClick={() => setShowManualWithdrawModal(false)}
                    className="px-4 py-2 bg-[#18181b] text-zinc-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingManual || !isRollMet}
                    className={`px-5 py-2 font-bold rounded-xl transition shadow-md flex items-center gap-1.5 ${
                      !isRollMet 
                        ? 'bg-rose-900/40 text-rose-300 border border-rose-800 cursor-not-allowed opacity-75' 
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                    }`}
                  >
                    {!isRollMet ? (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>Withdrawal Blocked (Rollover Pending)</span>
                      </>
                    ) : (
                      <span>{processingManual ? 'Processing...' : `Confirm Payout ₹${manualAmount}`}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
