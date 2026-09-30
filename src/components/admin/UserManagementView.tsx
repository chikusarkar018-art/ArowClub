import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Users, UserCheck, UserX, Globe, Search, Filter,
  Download, Eye, DollarSign, ShieldAlert, CheckCircle2,
  ChevronLeft, ChevronRight, X, Phone, Mail, Calendar, ArrowRight,
  RefreshCw, UserPlus, Sparkles, Key, ArrowDownCircle, ArrowUpCircle,
  Copy, Check, Gamepad2, Sliders, PlayCircle, BarChart3, TrendingUp, TrendingDown,
  Info, ShieldCheck, Layers, Coins, Lock, Unlock, AlertTriangle
} from 'lucide-react';
import { AdminUserSummary } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const ALL_AVAILABLE_GAMES = [
  { key: 'seven_up_down', name: '7 Up 7 Down', tag: 'Live Casino 12x', icon: '♠️', category: 'Casino Table', color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30' },
  { key: 'teen_patti', name: 'Teen Patti (20-20)', tag: 'Live Dealer', icon: '🃏', category: 'Card Game', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30' },
  { key: 'wingo_30s', name: 'Win Go 30 Sec', tag: 'Ultra Turbo', icon: '⚡', category: 'Color Prediction', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30' },
  { key: 'wingo_1m', name: 'Win Go 1 Min', tag: 'Most Popular', icon: '⏱️', category: 'Color Prediction', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30' },
  { key: 'wingo_3m', name: 'Win Go 3 Min', tag: 'Classic', icon: '⏱️', category: 'Color Prediction', color: 'from-teal-500/20 to-cyan-500/10 border-teal-500/30' },
  { key: 'wingo_5m', name: 'Win Go 5 Min', tag: 'Standard', icon: '⏱️', category: 'Color Prediction', color: 'from-teal-500/20 to-cyan-500/10 border-teal-500/30' },
  { key: 'aviator', name: 'Aviator (Crash)', tag: 'Up to 100x', icon: '✈️', category: 'Crash Curve', color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30' },
  { key: 'mines', name: 'Mines (Diamond Rush)', tag: 'High RTP', icon: '💣', category: 'Grid Cashout', color: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30' },
  { key: 'roulette', name: 'European Roulette', tag: '37 Numbers 36x', icon: '🎡', category: 'Casino Wheel', color: 'from-red-500/20 to-amber-500/10 border-red-500/30' },
  { key: 'chicken_road', name: 'Chicken Road', tag: 'Multiplier Steps', icon: '🐔', category: 'Step Multiplier', color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30' },
  { key: 'plinko', name: 'Plinko (Lucky Drop)', tag: 'Pinball Pegs', icon: '⚪', category: 'Arcade Drop', color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30' },
  { key: 'ludo', name: 'Ludo Club', tag: 'Multiplayer Real', icon: '🎲', category: 'Board Game', color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30' },
  { key: 'chess', name: 'Speed Chess', tag: 'Skill 1v1', icon: '♟️', category: 'Strategy Board', color: 'from-zinc-500/20 to-slate-500/10 border-zinc-500/30' },
];

interface UserManagementViewProps {
  initialStatusFilter?: string;
  onViewUserDetails?: (uid: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ initialStatusFilter, onViewUserDetails }) => {
  const { admin, showToast } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>((initialStatusFilter as any) || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);

  // Top-Up / Balance Modal
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAction, setBalanceAction] = useState<'credit' | 'debit'>('credit');
  const [balanceAmount, setBalanceAmount] = useState('500');
  const [balanceNote, setBalanceNote] = useState('Admin Manual Adjustment');

  // Manual Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newInitialBal, setNewInitialBal] = useState('0');
  const [creatingUser, setCreatingUser] = useState(false);

  // Password Reset Modal
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<AdminUserSummary | null>(null);
  const [customNewPass, setCustomNewPass] = useState('Password@123');
  const [resettingPass, setResettingPass] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<any | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Manual Deposit Modal
  const [showManualDepositModal, setShowManualDepositModal] = useState(false);
  const [manualDepositUser, setManualDepositUser] = useState<AdminUserSummary | null>(null);
  const [manualDepAmount, setManualDepAmount] = useState('500');
  const [manualDepUtr, setManualDepUtr] = useState('');
  const [manualDepMethod, setManualDepMethod] = useState('UPI Instant Manual');
  const [manualDepNote, setManualDepNote] = useState('Direct Admin Recharge');
  const [submittingDep, setSubmittingDep] = useState(false);

  // Manual Withdrawal Modal
  const [showManualWithdrawModal, setShowManualWithdrawModal] = useState(false);
  const [manualWithdrawUser, setManualWithdrawUser] = useState<AdminUserSummary | null>(null);
  const [manualWthAmount, setManualWthAmount] = useState('500');
  const [manualWthUtr, setManualWthUtr] = useState('');
  const [manualWthBankName, setManualWthBankName] = useState('IMPS Bank Transfer');
  const [manualWthAccount, setManualWthAccount] = useState('');
  const [manualWthIfsc, setManualWthIfsc] = useState('');
  const [manualWthNote, setManualWthNote] = useState('Direct Admin Manual Payout');
  const [submittingWth, setSubmittingWth] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  // Exposure & Played Amount Breakdown Modal
  const [showExposureModal, setShowExposureModal] = useState(false);
  const [exposureUser, setExposureUser] = useState<AdminUserSummary | null>(null);
  const [exposureLoading, setExposureLoading] = useState(false);
  const [exposureData, setExposureData] = useState<any | null>(null);

  // Client Specific Game Control (GC) Modal
  const [showGameControlModal, setShowGameControlModal] = useState(false);
  const [gameControlTargetUser, setGameControlTargetUser] = useState<AdminUserSummary | null>(null);
  const [clientDisabledGames, setClientDisabledGames] = useState<string[]>([]);
  const [savingGameControl, setSavingGameControl] = useState(false);

  // Client Control / Status & Limits (CC) Modal
  const [showClientControlModal, setShowClientControlModal] = useState(false);
  const [clientControlTargetUser, setClientControlTargetUser] = useState<AdminUserSummary | null>(null);
  const [ccStatus, setCcStatus] = useState<'active' | 'blocked'>('active');
  const [ccReason, setCcReason] = useState('Admin Review');
  const [savingCc, setSavingCc] = useState(false);

  const fetchUsers = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setIsLiveSyncing(true);
      }
      const data = await api.getAdminUsers(searchQuery.trim() || undefined, statusFilter);
      if (data?.users) {
        setUsers(data.users);
      }
    } catch (err: any) {
      if (!silent) {
        showToast(err.message || 'Failed to load users', 'error');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setTimeout(() => setIsLiveSyncing(false), 500);
    }
  };

  // Initial load & filter change
  useEffect(() => {
    fetchUsers(false);
  }, [statusFilter]);

  // Real-time live polling every 2.5 seconds (seamless, zero blinking/flickering)
  useEffect(() => {
    const liveInterval = setInterval(() => {
      fetchUsers(true);
    }, 2500);
    return () => clearInterval(liveInterval);
  }, [searchQuery, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPhone) {
      showToast('Username and Phone number are required', 'error');
      return;
    }
    setCreatingUser(true);
    try {
      const res = await api.adminCreateUser({
        username: newUsername.trim(),
        phone: newPhone.trim(),
        password: newPassword.trim(),
        initialBalance: Number(newInitialBal) || 0,
        adminUsername: admin?.username || 'SuperAdmin',
      });
      showToast(res.message || 'User created successfully!', 'success');
      setShowAddUserModal(false);
      setNewUsername('');
      setNewPhone('');
      setNewPassword('123456');
      setNewInitialBal('0');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleBlock = async (user: AdminUserSummary) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    try {
      await api.updateUserStatus(user.uid, newStatus, `Admin toggle status to ${newStatus}`, admin?.username || 'SuperAdmin');
      showToast(`User ${user.username} is now ${newStatus.toUpperCase()}`, 'success');
      fetchUsers();
      if (selectedUser?.uid === user.uid) {
        setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const numAmount = Math.abs(Number(balanceAmount));
      await api.adjustUserBalance(
        selectedUser.uid,
        numAmount,
        balanceAction,
        balanceNote || 'Manual adjustment from admin panel',
        admin?.username || 'SuperAdmin'
      );
      showToast(`Balance adjusted by ${balanceAction === 'credit' ? '+' : '-'}₹${numAmount} for ${selectedUser.username}`, 'success');
      setShowBalanceModal(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust balance', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    const pass = customNewPass.trim();
    if (!pass || pass.length < 4) {
      showToast('Password must be at least 4 characters long', 'error');
      return;
    }
    setResettingPass(true);
    try {
      const res = await api.resetUserPassword(resetTargetUser.uid, pass, admin?.username || 'SuperAdmin');
      setResetSuccessData({
        uid: resetTargetUser.uid,
        username: resetTargetUser.username,
        phone: resetTargetUser.phone,
        password: res?.newPassword || pass,
      });
      showToast(res.message || 'Password updated successfully!', 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setResettingPass(false);
    }
  };

  const handleManualDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDepositUser) return;
    const amt = Number(manualDepAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }
    setSubmittingDep(true);
    try {
      const res = await api.adminCreateManualDeposit({
        uid: manualDepositUser.uid,
        amount: amt,
        utrReference: manualDepUtr || `DEP-${Date.now()}`,
        paymentMethod: manualDepMethod,
        adminNote: manualDepNote,
        adminUsername: admin?.username || 'SuperAdmin',
      });
      showToast(res.message || `₹${amt} deposited successfully!`, 'success');
      setShowManualDepositModal(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to process manual deposit', 'error');
    } finally {
      setSubmittingDep(false);
    }
  };

  const handleManualWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWithdrawUser) return;
    const amt = Number(manualWthAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid withdrawal amount', 'error');
      return;
    }
    if (amt > Number(manualWithdrawUser.walletBalance || 0)) {
      showToast(`Amount exceeds user current balance (₹${manualWithdrawUser.walletBalance})`, 'error');
      return;
    }
    const compTurn = Number(manualWithdrawUser.completedTurnover ?? 0);
    const reqTurn = Number(manualWithdrawUser.requiredTurnover ?? 0);
    const remTurn = manualWithdrawUser.remainingTurnover !== undefined 
      ? Number(manualWithdrawUser.remainingTurnover) 
      : Math.max(0, parseFloat((reqTurn - compTurn).toFixed(2)));

    if (remTurn > 0) {
      showToast(`Withdrawal Blocked: Rollover Incomplete (₹${remTurn.toFixed(2)} pending)! User cannot withdraw until wagering is met.`, 'error');
      return;
    }

    setSubmittingWth(true);
    try {
      const res = await api.adminCreateManualWithdrawal({
        uid: manualWithdrawUser.uid,
        amount: amt,
        payoutUtr: manualWthUtr || `WTH-${Date.now()}`,
        bankDetails: {
          bankName: manualWthBankName,
          accountNumber: manualWthAccount || 'Admin Payout Direct',
          ifscCode: manualWthIfsc || 'DIRECT',
        },
        adminNote: manualWthNote,
        adminUsername: admin?.username || 'SuperAdmin',
      });
      showToast(res.message || `₹${amt} withdrawal processed!`, 'success');
      setShowManualWithdrawModal(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to process manual withdrawal', 'error');
    } finally {
      setSubmittingWth(false);
    }
  };

  // Open Exposure & Game Breakdown Modal
  const handleOpenExposureModal = async (u: AdminUserSummary) => {
    setExposureUser(u);
    setShowExposureModal(true);
    setExposureLoading(true);
    try {
      const res = await api.getAdminUserExposure(u.uid);
      setExposureData(res);
    } catch (err: any) {
      // Fallback to locally present breakdown if already loaded
      setExposureData({
        uid: u.uid,
        username: u.username,
        walletBalance: u.walletBalance,
        exposure: u.exposure !== undefined ? u.exposure : u.activeExposure || 0,
        activeExposure: u.activeExposure || 0,
        totalBet: u.totalBet || 0,
        totalWin: u.totalWin || 0,
        gameBreakdown: u.gameBreakdown || {},
        recentBets: [],
      });
    } finally {
      setExposureLoading(false);
    }
  };

  // Open Client Game Control Modal (GC)
  const handleOpenGameControl = (u: AdminUserSummary) => {
    setGameControlTargetUser(u);
    setClientDisabledGames(Array.isArray(u.disabledGames) ? [...u.disabledGames] : []);
    setShowGameControlModal(true);
  };

  const handleToggleClientGame = (gameKey: string) => {
    setClientDisabledGames(prev => {
      if (prev.includes(gameKey)) {
        return prev.filter(k => k !== gameKey);
      } else {
        return [...prev, gameKey];
      }
    });
  };

  const handleAllowAllGames = () => {
    setClientDisabledGames([]);
  };

  const handleBlockAllGames = () => {
    setClientDisabledGames(ALL_AVAILABLE_GAMES.map(g => g.key));
  };

  const handleSaveClientGameControl = async () => {
    if (!gameControlTargetUser) return;
    setSavingGameControl(true);
    try {
      const res = await api.updateAdminUserGameControl(
        gameControlTargetUser.uid,
        clientDisabledGames,
        admin?.username || 'SuperAdmin'
      );
      showToast(res.message || 'Game control updated successfully!', 'success');
      setShowGameControlModal(false);
      setUsers(prev => prev.map(u => u.uid === gameControlTargetUser.uid ? { ...u, disabledGames: clientDisabledGames } : u));
    } catch (err: any) {
      showToast(err.message || 'Failed to update game control', 'error');
    } finally {
      setSavingGameControl(false);
    }
  };

  // Open Client Status & Control Modal (CC)
  const handleOpenClientControl = (u: AdminUserSummary) => {
    setClientControlTargetUser(u);
    setCcStatus(u.status || 'active');
    setCcReason('Admin Status Adjustment');
    setShowClientControlModal(true);
  };

  const handleSaveClientControl = async () => {
    if (!clientControlTargetUser) return;
    setSavingCc(true);
    try {
      await api.updateUserStatus(
        clientControlTargetUser.uid,
        ccStatus,
        ccReason,
        admin?.username || 'SuperAdmin'
      );
      showToast(`User status updated to ${ccStatus.toUpperCase()}`, 'success');
      setShowClientControlModal(false);
      fetchUsers(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setSavingCc(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.uid.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.phone && u.phone.toLowerCase().includes(q))
    );
  });

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => u.status !== 'blocked').length;
  const blockedUsersCount = users.filter(u => u.status === 'blocked').length;
  const onlineUsersCount = users.filter(u => u.status !== 'blocked').length;

  return (
    <div className="space-y-6">
      {/* ================= TOP 4 KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Users</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">{totalUsersCount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 2: Active Users */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Users</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{activeUsersCount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 3: Blocked Users */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Blocked Users</div>
            <div className="text-2xl font-bold text-rose-400 font-mono mt-0.5">{blockedUsersCount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 4: Online Users */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Online Users</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono mt-0.5">{onlineUsersCount}</div>
          </div>
        </div>
      </div>

      {/* ================= USERS TABLE CONTAINER ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        {/* Search & Action Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by User ID, Name, Mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
            
            {/* Live Auto-Sync Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold flex-shrink-0" title="Auto-updating instantly when users register or data updates">
              <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isLiveSyncing ? 'animate-ping' : 'animate-pulse'}`} />
              <span>Live Auto-Sync</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-[#181a2e] border border-[#2b304c] text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
            </select>

            <button
              onClick={() => fetchUsers(false)}
              title="Refresh Users List"
              className="p-2 rounded-xl bg-[#181a2e] border border-[#2b304c] text-slate-300 hover:text-white transition hover:border-indigo-500"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>

            <button
              onClick={() => showToast('Exported user list to CSV', 'success')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181a2e] border border-[#2b304c] text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">User ID</th>
                <th className="pb-3 px-3">Name</th>
                <th className="pb-3 px-3">Mobile</th>
                <th className="pb-3 px-3">Balance</th>
                <th className="pb-3 px-3 text-center">Exposure</th>
                <th className="pb-3 px-3 text-center">Status</th>
                <th className="pb-3 px-3">Registered On</th>
                <th className="pb-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e202e]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-300">No registered users found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery ? `No user matches query "${searchQuery}"` : 'Users will show here immediately upon registration.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button
                        onClick={() => fetchUsers(false)}
                        className="px-3 py-1.5 rounded-xl bg-[#181a2e] border border-[#2b304c] text-xs font-semibold text-white hover:border-indigo-500"
                      >
                        Refresh List
                      </button>
                      <button
                        onClick={() => setShowAddUserModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-[#5b50e6] text-xs font-bold text-white shadow"
                      >
                        Create User
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.slice((currentPage - 1) * 20, currentPage * 20).map((u, idx) => {
                  const isBlocked = u.status === 'blocked';
                  const displayPhone = u.phone || '---';
                  const displayDate = u.registrationDate
                    ? (typeof u.registrationDate === 'string' && u.registrationDate.includes('/')
                        ? u.registrationDate
                        : new Date(u.registrationDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }))
                    : new Date().toLocaleDateString('en-GB');

                  return (
                    <tr key={u.uid || idx} className="hover:bg-[#181a28] transition-colors">
                      <td className="py-3.5 px-3 font-medium text-slate-200">
                        {u.uid}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-white">
                        {u.username || `User_${u.uid}`}
                      </td>
                      <td className="py-3.5 px-3 text-slate-200 font-medium text-xs">
                        {displayPhone}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-amber-400">
                        ₹ {(Number(u.walletBalance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {/* EXPOSURE (Clickable for full game-by-game breakdown) */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenExposureModal(u)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-400 text-rose-400 font-mono font-bold text-xs transition cursor-pointer group shadow-sm"
                          title="Click to view full game-by-game played amount & turnover breakdown"
                        >
                          <span className="group-hover:underline">
                            (₹ {(Number(u.exposure !== undefined ? u.exposure : u.activeExposure || 0)).toFixed(2)})
                          </span>
                          <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 font-sans font-semibold">
                            📊
                          </span>
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            !isBlocked
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {!isBlocked ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 text-xs">
                        {displayDate}
                      </td>
                      {/* ACTIONS: Compact Square Badges (U, D|C, W, P, GC, CC) matching Image 2 */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                          {/* 1. U (User Details) - Orange Square */}
                          <button
                            onClick={() => {
                              if (onViewUserDetails) {
                                onViewUserDetails(u.uid);
                              } else {
                                setSelectedUser(u);
                              }
                            }}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#f97316] hover:bg-[#ea580c] text-white flex items-center justify-center font-black text-xs sm:text-[13px] shadow transition-transform transform hover:scale-105 active:scale-95 cursor-pointer"
                            title="User Details (U)"
                          >
                            U
                          </button>

                          {/* 2. D|C (Deposit / Credit) - Green Square */}
                          <button
                            onClick={() => {
                              setManualDepositUser(u);
                              setManualDepAmount('500');
                              setManualDepUtr(`DEP-${Date.now().toString().slice(-6)}`);
                              setShowManualDepositModal(true);
                            }}
                            className="h-7 px-1.5 sm:h-8 sm:px-2 rounded-md bg-[#15803d] hover:bg-[#16a34a] text-white flex items-center justify-center font-black text-[11px] sm:text-xs shadow transition-transform transform hover:scale-105 active:scale-95 cursor-pointer tracking-tighter"
                            title="Deposit / Credit (D|C)"
                          >
                            <span className="text-[#38bdf8]">D</span>
                            <span className="text-[#ea580c] mx-0.5">|</span>
                            <span className="text-[#facc15]">C</span>
                          </button>

                          {/* 3. W (Withdrawal) - Blue Square */}
                          <button
                            onClick={() => {
                              setManualWithdrawUser(u);
                              setManualWthAmount(String(Math.min(500, Number(u.walletBalance || 0))));
                              setManualWthUtr(`PAYOUT-${Date.now().toString().slice(-6)}`);
                              setShowManualWithdrawModal(true);
                            }}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#1d4ed8] hover:bg-[#2563eb] text-white flex items-center justify-center font-black text-xs sm:text-[13px] shadow transition-transform transform hover:scale-105 active:scale-95 cursor-pointer"
                            title="Withdrawal (W)"
                          >
                            W
                          </button>

                          {/* 4. P (Password) - Yellow Square */}
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setCustomNewPass('Password@123');
                              setResetSuccessData(null);
                              setShowResetPassModal(true);
                            }}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#facc15] hover:bg-[#eab308] text-black flex items-center justify-center font-black text-xs sm:text-[13px] shadow transition-transform transform hover:scale-105 active:scale-95 cursor-pointer"
                            title="Change Password (P)"
                          >
                            P
                          </button>

                          {/* 5. GC (Game Control) - Lilac/Pink Square */}
                          <button
                            onClick={() => handleOpenGameControl(u)}
                            className="h-7 px-1.5 sm:h-8 sm:px-2 rounded-md bg-[#e879f9] hover:bg-[#f472b6] text-black flex items-center justify-center font-black text-[11px] sm:text-xs shadow transition-transform transform hover:scale-105 active:scale-95 cursor-pointer relative"
                            title="Game Control (GC) - Manage Allowed Games for this Client"
                          >
                            <span>GC</span>
                            {Array.isArray(u.disabledGames) && u.disabledGames.length > 0 && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white rounded-full text-[8px] flex items-center justify-center font-bold">
                                {u.disabledGames.length}
                              </span>
                            )}
                          </button>

                          {/* 6. CC (Casino Control / Client Status) - Lime Green Square */}
                          <button
                            onClick={() => handleOpenClientControl(u)}
                            className={`h-7 px-1.5 sm:h-8 sm:px-2 rounded-md ${
                              isBlocked ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-[#4ade80] hover:bg-[#22c55e] text-black'
                            } flex items-center justify-center font-black text-[11px] sm:text-xs shadow transition-transform transform hover:scale-105 active:scale-95 cursor-pointer`}
                            title={`Client Status & Control (CC) - Currently ${!isBlocked ? 'Active' : 'Blocked'}`}
                          >
                            CC
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination bar (20 rows per page) */}
        <PaginationControl
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={20}
          onPageChange={setCurrentPage}
          itemName="users"
        />
      </div>

      {/* ================= MODAL: QUICK USER PROFILE VIEW ================= */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e202e]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center">
                  {selectedUser.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedUser.username}</h3>
                  <div className="text-xs text-slate-400 font-mono">UID: {selectedUser.uid}</div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#181a2e] rounded-xl border border-[#2b304c]">
                <div>
                  <span className="text-slate-400">Wallet Balance:</span>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    ₹ {(selectedUser.walletBalance ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Account Status:</span>
                  <div className={`font-bold mt-0.5 ${selectedUser.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedUser.status?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowBalanceModal(true)}
                  className="flex-1 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-bold text-xs"
                >
                  Adjust Balance
                </button>
                <button
                  onClick={() => handleToggleBlock(selectedUser)}
                  className={`flex-1 py-2 rounded-xl border font-bold text-xs ${
                    selectedUser.status === 'blocked'
                      ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-600/20 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {selectedUser.status === 'blocked' ? 'Unblock User' : 'Block User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e202e]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create New Player Account</h3>
                  <p className="text-[11px] text-slate-400">Add user directly to the platform</p>
                </div>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul_99"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mobile Number (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Login Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Wallet Balance (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={newInitialBal}
                  onChange={(e) => setNewInitialBal(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold transition shadow-md disabled:opacity-50"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Balance Adjust Modal */}
      {showBalanceModal && selectedUser && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1e202e]">
              <h3 className="text-sm font-bold text-white">
                Adjust Balance for {selectedUser.username}
              </h3>
              <button onClick={() => setShowBalanceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdjustBalance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceAction('credit')}
                    className={`py-2 rounded-xl font-bold border transition ${
                      balanceAction === 'credit'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-[#181a2e] border-[#2b304c] text-slate-400'
                    }`}
                  >
                    + Credit (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('debit')}
                    className={`py-2 rounded-xl font-bold border transition ${
                      balanceAction === 'debit'
                        ? 'bg-rose-600/20 border-rose-500 text-rose-400'
                        : 'bg-[#181a2e] border-[#2b304c] text-slate-400'
                    }`}
                  >
                    - Debit (Deduct)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowBalanceModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#5b50e6] text-white font-bold"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET USER PASSWORD ================= */}
      {showResetPassModal && resetTargetUser && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e202e]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset User Password</h3>
                  <p className="text-[11px] text-slate-400">{resetTargetUser.username} (UID: {resetTargetUser.uid})</p>
                </div>
              </div>
              <button onClick={() => setShowResetPassModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccessData ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Password Reset Successfully!</span>
                </div>
                <div className="bg-[#181a2e] p-3 rounded-xl space-y-1.5 font-mono text-slate-300">
                  <div><strong>UID:</strong> {resetSuccessData.uid}</div>
                  <div><strong>Mobile:</strong> {resetSuccessData.phone}</div>
                  <div><strong>New Password:</strong> <span className="text-amber-400 font-bold">{resetSuccessData.password}</span></div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`UID: ${resetSuccessData.uid}\nPhone: ${resetSuccessData.phone}\nPassword: ${resetSuccessData.password}`);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2000);
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedPass ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPass ? 'Copied Details!' : 'Copy Credentials'}</span>
                  </button>
                  <button
                    onClick={() => setShowResetPassModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                <div className="bg-[#181a2e] p-3 rounded-xl border border-[#2b304c] space-y-1">
                  <div className="text-slate-400">Client Mobile: <strong className="text-emerald-400 font-mono">{resetTargetUser.phone || '---'}</strong></div>
                  <div className="text-slate-400">Current Balance: <strong className="text-amber-400 font-mono">₹{Number(resetTargetUser.walletBalance || 0).toFixed(2)}</strong></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-semibold">New Password (नया पासवर्ड) *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const rand = 'User@' + Math.floor(100000 + Math.random() * 900000);
                        setCustomNewPass(rand);
                      }}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      🎲 Generate Random
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={customNewPass}
                    onChange={(e) => setCustomNewPass(e.target.value)}
                    placeholder="Enter new password (min 4 chars)"
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetPassModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPass}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Key className="w-4 h-4" />
                    <span>{resettingPass ? 'Updating...' : 'Set Password (पासवर्ड बदलें)'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: MANUAL CLIENT DEPOSIT ================= */}
      {showManualDepositModal && manualDepositUser && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e202e]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowDownCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manual Client Deposit (जमा करें)</h3>
                  <p className="text-[11px] text-slate-400">{manualDepositUser.username} (UID: {manualDepositUser.uid})</p>
                </div>
              </div>
              <button onClick={() => setShowManualDepositModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualDepositSubmit} className="space-y-3 text-xs">
              <div className="bg-[#181a2e] p-3 rounded-xl border border-[#2b304c] flex justify-between items-center">
                <span className="text-slate-400">Current Balance:</span>
                <span className="text-amber-400 font-mono font-bold text-sm">
                  ₹{Number(manualDepositUser.walletBalance || 0).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Deposit Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualDepAmount}
                  onChange={(e) => setManualDepAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 500)"
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">UTR / Reference No.</label>
                <input
                  type="text"
                  value={manualDepUtr}
                  onChange={(e) => setManualDepUtr(e.target.value)}
                  placeholder="e.g. 439201938210"
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                <select
                  value={manualDepMethod}
                  onChange={(e) => setManualDepMethod(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                >
                  <option value="UPI Instant Manual">UPI (PhonePe / Paytm / GPay)</option>
                  <option value="Bank IMPS Transfer">Bank IMPS / NEFT</option>
                  <option value="Cash / Agent Direct">Direct Cash / Agent Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Audit Note</label>
                <input
                  type="text"
                  value={manualDepNote}
                  onChange={(e) => setManualDepNote(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualDepositModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDep}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>{submittingDep ? 'Processing...' : `Deposit ₹${manualDepAmount} to Wallet`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MANUAL CLIENT WITHDRAWAL ================= */}
      {showManualWithdrawModal && manualWithdrawUser && (() => {
        const compTurn = Number(manualWithdrawUser.completedTurnover ?? 0);
        const reqTurn = Number(manualWithdrawUser.requiredTurnover ?? 0);
        const remTurn = manualWithdrawUser.remainingTurnover !== undefined 
          ? Number(manualWithdrawUser.remainingTurnover) 
          : Math.max(0, parseFloat((reqTurn - compTurn).toFixed(2)));
        const rollPct = reqTurn > 0 ? Math.min(100, Math.round((compTurn / reqTurn) * 100)) : 100;
        const isRollMet = remTurn <= 0;

        return (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e202e]">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <ArrowUpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Manual Client Withdrawal (निकासी करें)</h3>
                    <p className="text-[11px] text-slate-400">{manualWithdrawUser.username} (UID: {manualWithdrawUser.uid})</p>
                  </div>
                </div>
                <button onClick={() => setShowManualWithdrawModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleManualWithdrawalSubmit} className="space-y-3 text-xs">
                <div className="bg-[#181a2e] p-3 rounded-xl border border-[#2b304c] flex justify-between items-center">
                  <span className="text-slate-400">Current Balance:</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    ₹{Number(manualWithdrawUser.walletBalance || 0).toFixed(2)}
                  </span>
                </div>

                {/* Rollover Status Card */}
                <div className={`p-3.5 rounded-xl border ${
                  isRollMet 
                    ? 'bg-emerald-950/20 border-emerald-500/30' 
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {isRollMet ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
                      <span>Rollover Wagering (रोलओवर)</span>
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
                      <span className="text-[9px] text-slate-400 block font-sans">Required</span>
                      <span className="text-white font-bold">₹{reqTurn.toFixed(0)}</span>
                    </div>
                    <div className="bg-[#0a0a0b]/60 p-1.5 rounded border border-[#26262a]">
                      <span className="text-[9px] text-slate-400 block font-sans">Completed</span>
                      <span className="text-emerald-400 font-bold">₹{compTurn.toFixed(0)}</span>
                    </div>
                    <div className="bg-[#0a0a0b]/60 p-1.5 rounded border border-[#26262a]">
                      <span className="text-[9px] text-slate-400 block font-sans">Pending</span>
                      <span className={`font-bold ${isRollMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{remTurn.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Warning / Notice */}
                  {!isRollMet ? (
                    <div className="text-[11px] text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 leading-tight">
                      ⛔ <strong>Rollover Incomplete:</strong> User has ₹{remTurn.toFixed(2)} remaining turnover requirement. Manual withdrawal cannot be processed until rollover is completed.
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 leading-tight">
                      ✅ <strong>Rollover Cleared:</strong> User has completed full betting requirement.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Withdrawal Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    max={manualWithdrawUser.walletBalance || 0}
                    required
                    disabled={!isRollMet}
                    value={manualWthAmount}
                    onChange={(e) => setManualWthAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-rose-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payout Reference / UTR</label>
                  <input
                    type="text"
                    disabled={!isRollMet}
                    value={manualWthUtr}
                    onChange={(e) => setManualWthUtr(e.target.value)}
                    placeholder="e.g. PAYOUT-991823"
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bank / Channel Name</label>
                  <input
                    type="text"
                    disabled={!isRollMet}
                    value={manualWthBankName}
                    onChange={(e) => setManualWthBankName(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Admin Audit Note</label>
                  <input
                    type="text"
                    disabled={!isRollMet}
                    value={manualWthNote}
                    onChange={(e) => setManualWthNote(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualWithdrawModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingWth || !isRollMet}
                    className={`px-5 py-2 rounded-xl font-bold transition shadow-md flex items-center gap-1.5 ${
                      !isRollMet 
                        ? 'bg-rose-900/40 text-rose-300 border border-rose-800 cursor-not-allowed opacity-75' 
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    }`}
                  >
                    {!isRollMet ? (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>Blocked (Rollover Pending)</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle className="w-4 h-4" />
                        <span>{submittingWth ? 'Processing...' : `Deduct & Settle ₹${manualWthAmount}`}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 1. EXPOSURE & GAME PLAYED BREAKDOWN MODAL               */}
      {/* ======================================================== */}
      {showExposureModal && exposureUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#121422] border border-[#2b304c] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#23273c] flex items-center justify-between bg-[#16192b]/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-lg">
                  📊
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Client Exposure & Game Breakdown</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      UID: {exposureUser.uid}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Player: <strong className="text-slate-200">{exposureUser.username}</strong> | Mobile: <strong className="text-slate-200">{exposureUser.phone || '---'}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowExposureModal(false)}
                className="p-2 rounded-xl bg-[#1e2238] text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {exposureLoading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-rose-400" />
                  <p className="text-sm font-semibold">Calculating game-by-game turnover & exposure...</p>
                </div>
              ) : (
                <>
                  {/* Top 4 KPI Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#181a2e] border border-[#2b304c] rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 font-medium">Active Exposure (Open Bets)</div>
                      <div className="text-lg sm:text-xl font-bold font-mono text-rose-400 mt-1">
                        (₹ {(Number(exposureData?.activeExposure || exposureUser.exposure || 0)).toFixed(2)})
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Current pending liabilities</div>
                    </div>

                    <div className="bg-[#181a2e] border border-[#2b304c] rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 font-medium">Total Game Turnover</div>
                      <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-1">
                        ₹ {(Number(exposureData?.totalBet || exposureUser.totalBet || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">All-time stakes played</div>
                    </div>

                    <div className="bg-[#181a2e] border border-[#2b304c] rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 font-medium">Total User Winnings</div>
                      <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
                        ₹ {(Number(exposureData?.totalWin || exposureUser.totalWin || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Gross won amount</div>
                    </div>

                    <div className="bg-[#181a2e] border border-[#2b304c] rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 font-medium">Player Net P&L</div>
                      {(() => {
                        const net = (Number(exposureData?.totalWin || 0)) - (Number(exposureData?.totalBet || 0));
                        return (
                          <div className={`text-lg sm:text-xl font-bold font-mono mt-1 ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {net >= 0 ? `+₹ ${net.toFixed(2)}` : `-₹ ${Math.abs(net).toFixed(2)}`}
                          </div>
                        );
                      })()}
                      <div className="text-[10px] text-slate-500 mt-0.5">Player win vs stake</div>
                    </div>
                  </div>

                  {/* Section: Game-by-Game Played Breakdown */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Played Amount by Game (Kaun Se Game Me Kitna Khela Hai)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1e2238] text-slate-300">
                          {ALL_AVAILABLE_GAMES.length} Games Tracked
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowExposureModal(false);
                          handleOpenGameControl(exposureUser);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#e879f9]/20 hover:bg-[#e879f9]/30 text-[#e879f9] border border-[#e879f9]/30 font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <span>Manage in GC</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-[#2b304c] bg-[#141628]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#23273c] text-[11px] text-slate-400 font-semibold uppercase bg-[#181a2e]">
                            <th className="py-2.5 px-3">Game Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Rounds</th>
                            <th className="py-2.5 px-3 text-right">Total Bet (Stake)</th>
                            <th className="py-2.5 px-3 text-right">Total Won</th>
                            <th className="py-2.5 px-3 text-right">Player Net P&L</th>
                            <th className="py-2.5 px-3 text-center">GC Access</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2238]">
                          {ALL_AVAILABLE_GAMES.map((game) => {
                            const bData = exposureData?.gameBreakdown?.[game.key] || { totalBet: 0, totalWin: 0, rounds: 0, netProfit: 0 };
                            const isGameBlocked = Array.isArray(exposureUser.disabledGames) && exposureUser.disabledGames.includes(game.key);
                            const hasPlayed = bData.totalBet > 0 || bData.rounds > 0;

                            return (
                              <tr key={game.key} className={`hover:bg-[#181b30] transition ${hasPlayed ? 'bg-[#181a2e]/40 font-medium' : 'opacity-70'}`}>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{game.icon}</span>
                                    <div>
                                      <div className="font-bold text-white">{game.name}</div>
                                      <div className="text-[10px] text-slate-400">{game.tag}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  <span className="px-2 py-0.5 rounded-md bg-[#1f233b] text-[10px] text-slate-300">
                                    {game.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                                  {bData.rounds > 0 ? (
                                    <span className="font-bold text-white">{bData.rounds}</span>
                                  ) : (
                                    <span className="text-slate-500">0</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {bData.totalBet > 0 ? (
                                    <span className="font-bold text-amber-400">
                                      ₹ {bData.totalBet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">₹ 0.00</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {bData.totalWin > 0 ? (
                                    <span className="font-bold text-emerald-400">
                                      ₹ {bData.totalWin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">₹ 0.00</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {hasPlayed ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                      bData.netProfit >= 0 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    }`}>
                                      {bData.netProfit >= 0 ? `+₹${bData.netProfit.toFixed(2)}` : `-₹${Math.abs(bData.netProfit).toFixed(2)}`}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">--</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    !isGameBlocked
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {!isGameBlocked ? 'Allowed' : 'Blocked'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section: Recent Bets Table */}
                  {Array.isArray(exposureData?.recentBets) && exposureData.recentBets.length > 0 && (
                    <div>
                      <div className="text-sm font-bold text-white mb-2">Recent Game Activity Log ({exposureData.recentBets.length} Bets)</div>
                      <div className="overflow-x-auto rounded-xl border border-[#2b304c] bg-[#141628] max-h-60">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#23273c] text-[10px] text-slate-400 font-semibold uppercase bg-[#181a2e]">
                              <th className="py-2 px-3">Time</th>
                              <th className="py-2 px-3">Game</th>
                              <th className="py-2 px-3">Period / Round</th>
                              <th className="py-2 px-3 text-right">Stake Amount</th>
                              <th className="py-2 px-3 text-center">Status</th>
                              <th className="py-2 px-3 text-right">Win / Payout</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1e2238] font-mono">
                            {exposureData.recentBets.slice(0, 15).map((bet: any, bIdx: number) => {
                              const isWon = bet.status === 'won';
                              const bDate = bet.createdAt ? new Date(bet.createdAt).toLocaleTimeString('en-IN') : '---';
                              return (
                                <tr key={bet.id || bIdx} className="hover:bg-[#181b30] transition text-[11px]">
                                  <td className="py-2 px-3 text-slate-400">{bDate}</td>
                                  <td className="py-2 px-3 font-sans font-bold text-white capitalize">
                                    {String(bet.gameType || 'Game').replace(/_/g, ' ')}
                                  </td>
                                  <td className="py-2 px-3 text-slate-300">#{bet.periodId}</td>
                                  <td className="py-2 px-3 text-right font-bold text-amber-400">
                                    ₹ {(Number(bet.totalAmount || bet.amount || 0)).toFixed(2)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isWon ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                    }`}>
                                      {bet.status?.toUpperCase() || 'COMPLETED'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-emerald-400">
                                    {isWon ? `₹ ${(Number(bet.winAmount || 0)).toFixed(2)}` : '₹ 0.00'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#23273c] flex items-center justify-between bg-[#16192b]/80">
              <span className="text-xs text-slate-400">
                Exposure data is computed real-time from settled & active round wagers.
              </span>
              <button
                onClick={() => setShowExposureModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CLIENT GAME CONTROL (GC) MODAL                       */}
      {/* ======================================================== */}
      {showGameControlModal && gameControlTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#121422] border border-[#2b304c] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#23273c] flex items-center justify-between bg-[#16192b]/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e879f9]/20 border border-[#e879f9]/30 flex items-center justify-center text-[#e879f9] font-black text-sm">
                  GC
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Client Game Control (GC)</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#e879f9]/15 text-[#e879f9] border border-[#e879f9]/30">
                      UID: {gameControlTargetUser.uid}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Player: <strong className="text-slate-200">{gameControlTargetUser.username}</strong> | Mobile: <strong className="text-slate-200">{gameControlTargetUser.phone || '---'}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGameControlModal(false)}
                className="p-2 rounded-xl bg-[#1e2238] text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-header Notice & Quick Batch Buttons */}
            <div className="p-4 bg-[#141628] border-b border-[#23273c] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-300 font-medium">
                  Select which games this client is allowed to play. When a game is turned <strong className="text-rose-400">OFF (BLOCKED)</strong>, the client cannot enter or place any bets on that game.
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono">
                  <span className="text-emerald-400 font-bold">
                    ✓ {ALL_AVAILABLE_GAMES.length - clientDisabledGames.length} Allowed
                  </span>
                  <span className="text-rose-400 font-bold">
                    ✕ {clientDisabledGames.length} Blocked
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleAllowAllGames}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Allow All</span>
                </button>
                <button
                  type="button"
                  onClick={handleBlockAllGames}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Block All</span>
                </button>
              </div>
            </div>

            {/* Games Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 max-h-[55vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_AVAILABLE_GAMES.map((game) => {
                  const isBlocked = clientDisabledGames.includes(game.key);
                  const isAllowed = !isBlocked;

                  return (
                    <div
                      key={game.key}
                      onClick={() => handleToggleClientGame(game.key)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isAllowed
                          ? 'bg-[#181a2e] border-emerald-500/30 hover:border-emerald-500/60 shadow-sm'
                          : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50 opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-lg flex-shrink-0">
                          {game.icon}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span>{game.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{game.category}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-amber-400/80">{game.tag}</span>
                          </div>
                        </div>
                      </div>

                      {/* Switch Pill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleClientGame(game.key);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
                          isAllowed
                            ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:bg-emerald-400'
                            : 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:bg-rose-500'
                        }`}
                      >
                        {isAllowed ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>ALLOWED</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>BLOCKED</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#23273c] flex items-center justify-between bg-[#16192b]/80">
              <button
                type="button"
                onClick={() => setShowGameControlModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClientGameControl}
                disabled={savingGameControl}
                className="px-6 py-2 rounded-xl bg-[#e879f9] hover:bg-[#d946ef] text-black font-black text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{savingGameControl ? 'Saving...' : 'Save Game Permissions'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CLIENT STATUS & CONTROL (CC) MODAL                   */}
      {/* ======================================================== */}
      {showClientControlModal && clientControlTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#121422] border border-[#2b304c] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#23273c] flex items-center justify-between bg-[#16192b]/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4ade80]/20 border border-[#4ade80]/30 flex items-center justify-center text-[#4ade80] font-black text-sm">
                  CC
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Client Control & Status (CC)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">UID: {clientControlTargetUser.uid} ({clientControlTargetUser.username})</p>
                </div>
              </div>

              <button
                onClick={() => setShowClientControlModal(false)}
                className="p-2 rounded-xl bg-[#1e2238] text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Account Access Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCcStatus('active')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                      ccStatus === 'active'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#181a2e] border-[#2b304c] text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ACTIVE (Allow Login & Bets)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCcStatus('blocked')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                      ccStatus === 'blocked'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-[#181a2e] border-[#2b304c] text-slate-400'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span>BLOCKED (Suspend Account)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason / Note for Audit</label>
                <input
                  type="text"
                  value={ccReason}
                  onChange={(e) => setCcReason(e.target.value)}
                  placeholder="e.g. Risk check, user requested hold, etc."
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-[#181a2e] rounded-xl border border-[#2b304c] space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Wallet Balance:</span>
                  <span className="font-bold text-amber-400 font-mono">₹ {(Number(clientControlTargetUser.walletBalance) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Active Exposure:</span>
                  <span className="font-bold text-rose-400 font-mono">₹ {(Number(clientControlTargetUser.exposure || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Blocked Games:</span>
                  <span className="font-bold text-slate-200">
                    {Array.isArray(clientControlTargetUser.disabledGames) ? clientControlTargetUser.disabledGames.length : 0} Games
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowClientControlModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveClientControl}
                  disabled={savingCc}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingCc ? 'Updating...' : 'Save Account Status'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
