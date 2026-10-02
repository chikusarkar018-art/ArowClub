import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Users, UserCheck, UserX, Globe, Search, Filter,
  Download, Eye, DollarSign, ShieldAlert, CheckCircle2,
  ChevronLeft, ChevronRight, X, Phone, Mail, Calendar, ArrowRight,
  RefreshCw, UserPlus, Sparkles, Key, ArrowDownCircle, ArrowUpCircle,
  Copy, Check, Gamepad2, Sliders, PlayCircle, BarChart3, TrendingUp, TrendingDown,
  Info, ShieldCheck, Layers, Coins, Lock, Unlock, AlertTriangle, Trash2
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
  const [exposureSort, setExposureSort] = useState<'none' | 'desc' | 'asc'>('none');

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

  // Delete User Confirmation Modal
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserSummary | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Quick Delete by UID Modal
  const [showQuickDeleteModal, setShowQuickDeleteModal] = useState(false);
  const [quickDeleteUidInput, setQuickDeleteUidInput] = useState('');
  const [quickDeleteSearchResult, setQuickDeleteSearchResult] = useState<AdminUserSummary | null>(null);

  // Clear All Users Modal
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearingAllUsers, setClearingAllUsers] = useState(false);

  const handleConfirmClearAllUsers = async () => {
    setClearingAllUsers(true);
    try {
      const res = await api.adminDeleteAllUsers(admin?.username);
      setUsers([]);
      setShowClearAllModal(false);
      showToast(res.message || 'All client IDs removed successfully', 'success');
      fetchUsers(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove all IDs', 'error');
    } finally {
      setClearingAllUsers(false);
    }
  };

  // Radhe Exchange Client List State
  const [searchUidInput, setSearchUidInput] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);

  const handleToggleBetLock = async (u: AdminUserSummary) => {
    try {
      const isLocked = Array.isArray(u.disabledGames) && u.disabledGames.length > 0;
      const allGames = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m', 'aviator', 'mines', 'roulette', 'seven_up_down', 'teen_patti', 'chicken_road', 'plinko'];
      const newDisabledGames = isLocked ? [] : allGames;
      await api.updateAdminUserGameControl(u.uid, newDisabledGames, admin?.username || 'SuperAdmin');
      showToast(`Bet Lock ${!isLocked ? 'ENABLED' : 'DISABLED'} for ${u.username}`, 'success');
      setUsers(prev => prev.map(item => item.uid === u.uid ? { ...item, disabledGames: newDisabledGames } : item));
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle bet lock', 'error');
    }
  };

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
    if (!u) return;
    setExposureUser(u);
    setShowExposureModal(true);
    // Instant fallback state so the modal appears immediately without delay
    setExposureData({
      uid: u.uid,
      username: u.username,
      walletBalance: Number(u.walletBalance || 0),
      exposure: Number(u.exposure !== undefined ? u.exposure : u.activeExposure || 0),
      activeExposure: Number(u.exposure !== undefined ? u.exposure : u.activeExposure || 0),
      totalBet: Number(u.totalBet || 0),
      totalWin: Number(u.totalWin || 0),
      netProfitLoss: (u as any).netProfitLoss !== undefined 
        ? Number((u as any).netProfitLoss) 
        : (Number(u.totalWin || 0) - Number(u.totalBet || 0)),
      gameBreakdown: u.gameBreakdown || {},
      activeBets: [],
      recentBets: [],
    });
    setExposureLoading(true);
    try {
      const res = await api.getAdminUserExposure(u.uid);
      if (res) {
        setExposureData(res);
      }
    } catch (err: any) {
      console.warn('getAdminUserExposure error:', err);
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

  // Open Delete User Confirmation Modal
  const handleOpenDeleteModal = (u: AdminUserSummary) => {
    setUserToDelete(u);
    setShowDeleteUserModal(true);
  };

  // Confirm and Execute User Deletion
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      const res = await api.adminDeleteUser(userToDelete.uid, admin?.username || 'SuperAdmin');
      if (res?.success) {
        showToast(`User UID ${userToDelete.uid} (${userToDelete.username}) deleted successfully!`, 'success');
        setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
        setShowDeleteUserModal(false);
        setUserToDelete(null);
      } else {
        showToast(res?.error || 'Failed to delete user', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // Universal matcher for UID, Phone, UPI ID, Bank Accounts, Username, Email
    const matchesUser = (itemQuery: string) => {
      const q = itemQuery.trim().toLowerCase();
      if (!q) return true;
      const uidMatch = u.uid.toLowerCase().includes(q);
      const usernameMatch = u.username.toLowerCase().includes(q);
      const phoneMatch =
        (u.phone && String(u.phone).toLowerCase().includes(q)) ||
        ((u as any).phoneNumber && String((u as any).phoneNumber).toLowerCase().includes(q)) ||
        ((u as any).mobile && String((u as any).mobile).toLowerCase().includes(q));
      const emailMatch = u.email && u.email.toLowerCase().includes(q);
      const upiMatch =
        ((u as any).upiId && String((u as any).upiId).toLowerCase().includes(q)) ||
        ((u as any).upi && String((u as any).upi).toLowerCase().includes(q)) ||
        (Array.isArray((u as any).bankAccounts) &&
          (u as any).bankAccounts.some(
            (b: any) =>
              (b.upiId && String(b.upiId).toLowerCase().includes(q)) ||
              (b.accountNumber && String(b.accountNumber).toLowerCase().includes(q)) ||
              (b.accountHolder && String(b.accountHolder).toLowerCase().includes(q)) ||
              (b.bankName && String(b.bankName).toLowerCase().includes(q)) ||
              (b.ifsc && String(b.ifsc).toLowerCase().includes(q))
          ));

      return uidMatch || usernameMatch || phoneMatch || emailMatch || upiMatch;
    };

    if (searchUidInput.trim() && !matchesUser(searchUidInput)) {
      return false;
    }
    if (searchQuery.trim() && !matchesUser(searchQuery)) {
      return false;
    }
    return true;
  });

  // Calculate totals matching the Radhe Exchange summary row
  const totalCreditReference = filteredUsers.reduce(
    (sum, u) => sum + (Number((u as any).creditReference) || 50000),
    0
  );
  const totalBalance = filteredUsers.reduce(
    (sum, u) => sum + (Number(u.walletBalance) || 0),
    0
  );
  const totalPendingBal = filteredUsers.reduce(
    (sum, u) => sum + ((Number(u.walletBalance) || 0) - (Number((u as any).creditReference) || 50000)),
    0
  );
  const totalAvailableBal = filteredUsers.reduce(
    (sum, u) => {
      const exp = Number(u.exposure !== undefined ? u.exposure : u.activeExposure || 0);
      return sum + Math.max(0, (Number(u.walletBalance) || 0) - Math.abs(exp));
    },
    0
  );
  const totalPnl = filteredUsers.reduce(
    (sum, u) => {
      const uBet = Number(u.totalBet || 0);
      const uWin = Number(u.totalWin || 0);
      const p = (u as any).netProfitLoss !== undefined ? Number((u as any).netProfitLoss) : (uWin - uBet);
      return sum + p;
    },
    0
  );
  const totalExposure = filteredUsers.reduce(
    (sum, u) => sum + Number(u.exposure !== undefined ? u.exposure : u.activeExposure || 0),
    0
  );

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status !== 'blocked').length;
  const blockedUsersCount = users.filter((u) => u.status === 'blocked').length;
  const onlineUsersCount = activeUsersCount;

  // Sort and pagination calculation
  let displayUsers = [...filteredUsers];
  if (exposureSort === 'desc') {
    displayUsers.sort((a, b) => Number(b.exposure !== undefined ? b.exposure : b.activeExposure || 0) - Number(a.exposure !== undefined ? a.exposure : a.activeExposure || 0));
  } else if (exposureSort === 'asc') {
    displayUsers.sort((a, b) => Number(a.exposure !== undefined ? a.exposure : a.activeExposure || 0) - Number(b.exposure !== undefined ? b.exposure : b.activeExposure || 0));
  }
  const totalPages = Math.max(1, Math.ceil(displayUsers.length / pageSize));
  const paginatedUsers = displayUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* ================= TOP 4 KPI CARDS (CLEAN LIGHT/CONTRAST) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Clients */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#004d5a] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Total Clients</div>
            <div className="text-xl font-black text-slate-800 font-mono">{totalUsersCount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 2: Active Clients */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Active Clients</div>
            <div className="text-xl font-black text-emerald-600 font-mono">{activeUsersCount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 3: Locked Clients */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">U-Locked Clients</div>
            <div className="text-xl font-black text-rose-600 font-mono">{blockedUsersCount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 4: Total Portfolio Balance */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase">Total Balance</div>
            <div className="text-xl font-black text-cyan-800 font-mono">₹ {totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RADHE EXCHANGE CLIENT LIST CONTAINER (Exact visual match to screenshot)
      ========================================================================= */}
      <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
        {/* Top Control Bar: Title, Search Inputs, Export Icons, Entries, Add Client Account */}
        <div className="p-3 bg-[#fdfdfd] border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Left: Heading + Search Inputs + Export Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 mr-2 tracking-tight">
              Client List
            </h2>

            {/* Quick UID / Phone / UPI Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="UID / Phone / UPI"
                value={searchUidInput}
                onChange={(e) => {
                  setSearchUidInput(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-32 sm:w-36 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#004d5a] font-mono shadow-inner pr-6"
                title="Search by UID, Phone Number, or UPI ID"
              />
              {searchUidInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchUidInput('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* General Search by Client (Phone, UPI, Username, UID, Bank) */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search Phone, UPI, Name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-40 sm:w-56 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#004d5a] pr-6"
                title="Search by Phone Number, UPI ID, UID, Username, or Bank Account"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 4 Export Badges matching screenshot: CSV, PDF, CSV ALL, PDF ALL */}
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => showToast('Exporting Client List to CSV...', 'success')}
                className="px-1.5 py-0.5 rounded bg-[#2e7d32] hover:bg-[#1b5e20] text-white text-[10px] font-bold shadow-xs flex items-center gap-0.5 cursor-pointer"
                title="Export CSV"
              >
                <span>📊</span>
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={() => showToast('Exporting Client List to PDF...', 'success')}
                className="px-1.5 py-0.5 rounded bg-[#c62828] hover:bg-[#b71c1c] text-white text-[10px] font-bold shadow-xs flex items-center gap-0.5 cursor-pointer"
                title="Export PDF"
              >
                <span>📄</span>
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => showToast('Exporting All Client Records to CSV...', 'success')}
                className="px-1.5 py-0.5 rounded bg-[#2e7d32] hover:bg-[#1b5e20] text-white text-[10px] font-bold shadow-xs flex items-center gap-0.5 cursor-pointer"
                title="Export CSV ALL"
              >
                <span>📊</span>
                <span>CSV ALL</span>
              </button>

              <button
                type="button"
                onClick={() => showToast('Exporting All Client Records to PDF...', 'success')}
                className="px-1.5 py-0.5 rounded bg-[#c62828] hover:bg-[#b71c1c] text-white text-[10px] font-bold shadow-xs flex items-center gap-0.5 cursor-pointer"
                title="Export PDF ALL"
              >
                <span>📄</span>
                <span>PDF ALL</span>
              </button>
            </div>
          </div>

          {/* Right: Show Entries, Add Client Account, Inactive List, Delete UID */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="flex items-center gap-1 text-slate-600 text-xs">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-[#004d5a] font-medium"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            {/* Add Client Account (Teal button) */}
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-3 py-1 rounded bg-[#02848c] hover:bg-[#006f76] text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Client Account</span>
            </button>

            {/* Inactive List / Blocked Filter */}
            <button
              onClick={() => setStatusFilter(statusFilter === 'blocked' ? 'all' : 'blocked')}
              className={`px-3 py-1 rounded text-xs font-bold transition shadow-xs cursor-pointer ${
                statusFilter === 'blocked'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#02848c] hover:bg-[#006f76] text-white'
              }`}
            >
              {statusFilter === 'blocked' ? 'All Clients' : 'Inactive List'}
            </button>

            {/* Delete UID button */}
            <button
              onClick={() => {
                setQuickDeleteUidInput('');
                setQuickDeleteSearchResult(null);
                setShowQuickDeleteModal(true);
              }}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
              title="Permanently Delete User Account by UID"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete UID</span>
            </button>

            {/* Remove All IDs button */}
            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
              title="Remove All Client Accounts (सभी आईडी हटाएं)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove All IDs</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            CLIENT LIST TABLE (Dark Teal Header #035a68 + Aggregate Summary Row)
        ===================================================================== */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header: Dark Teal #035a68 */}
            <thead>
              <tr className="bg-[#035a68] text-white font-bold text-[11px] whitespace-nowrap select-none">
                <th className="py-2.5 px-3 border-r border-teal-800">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>UID</span>
                    <span className="text-[10px] opacity-80">↑↓</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-teal-800">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>User Name</span>
                    <span className="text-[10px] opacity-80">↑↓</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-teal-800 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>Phone Number</span>
                    <span className="text-[10px] opacity-80">↑↓</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-teal-800 text-right">
                  <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-cyan-200">
                    <span>Balance</span>
                    <span className="text-[10px] opacity-80">↑↓</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-teal-800 text-right">
                  <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-cyan-200">
                    <span>Pending Bal.</span>
                    <span className="text-[10px] opacity-80">↑↓</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-teal-800 text-right">
                  <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-cyan-200">
                    <span>Available Bal.</span>
                    <span className="text-[10px] opacity-80">↑↓</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-teal-800 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>Current P&L</span>
                    <span className="text-[10px] opacity-80">↑↓</span>
                  </div>
                </th>
                <th
                  onClick={() => {
                    setExposureSort(prev => prev === 'desc' ? 'asc' : 'desc');
                  }}
                  className="py-2.5 px-3 border-r border-teal-800 text-right cursor-pointer hover:text-cyan-200 select-none"
                  title="Click to sort by Exposure (High/Low)"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Exposure</span>
                    <span className="text-[10px] opacity-80">{exposureSort === 'desc' ? '↓' : exposureSort === 'asc' ? '↑' : '↑↓'}</span>
                  </div>
                </th>
                <th className="py-2.5 px-2 border-r border-teal-800 text-center">
                  <span>U Lock</span>
                </th>
                <th className="py-2.5 px-2 border-r border-teal-800 text-center">
                  <span>B Lock</span>
                </th>
                <th className="py-2.5 px-2 border-r border-teal-800 text-center">
                  <span>My %</span>
                </th>
                <th className="py-2.5 px-3 border-r border-teal-800 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-cyan-200">
                    <span>Type</span>
                    <span className="text-[10px] opacity-80">↑↓</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">
                  <span>Actions</span>
                </th>
              </tr>

              {/* Aggregate / Total Row right below header (Matching screenshot) */}
              <tr className="bg-[#f0f4f7] border-b-2 border-slate-300 font-black text-slate-800 text-[11px] whitespace-nowrap">
                <td className="py-2 px-3 border-r border-slate-200 text-slate-400">
                  {/* Empty for UID */}
                </td>
                <td className="py-2 px-3 border-r border-slate-200 text-slate-400">
                  {/* Empty for User Name */}
                </td>
                <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                  {filteredUsers.length} Clients
                </td>
                <td className="py-2 px-3 border-r border-slate-200 text-right font-mono">
                  {totalBalance.toFixed(2)}
                </td>
                <td className={`py-2 px-3 border-r border-slate-200 text-right font-mono ${totalPendingBal < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {totalPendingBal.toFixed(2)}
                </td>
                <td className="py-2 px-3 border-r border-slate-200 text-right font-mono">
                  {totalAvailableBal.toFixed(2)}
                </td>
                <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">
                  <span className={`font-bold ${totalPnl < 0 ? 'text-rose-600' : totalPnl > 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {totalPnl > 0 ? `+${totalPnl.toFixed(2)}` : totalPnl.toFixed(2)}
                  </span>
                </td>
                <td
                  onClick={() => {
                    const firstUserWithExp = filteredUsers.find(u => Number(u.exposure !== undefined ? u.exposure : u.activeExposure || 0) > 0) || filteredUsers[0];
                    if (firstUserWithExp) handleOpenExposureModal(firstUserWithExp);
                  }}
                  className="py-2 px-3 border-r border-slate-200 text-right font-mono text-rose-600 font-bold cursor-pointer hover:bg-rose-100/60 transition-colors"
                  title="Click to view client exposure"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const firstUserWithExp = filteredUsers.find(u => Number(u.exposure !== undefined ? u.exposure : u.activeExposure || 0) > 0) || filteredUsers[0];
                      if (firstUserWithExp) handleOpenExposureModal(firstUserWithExp);
                    }}
                    className="cursor-pointer font-bold hover:underline"
                  >
                    {totalExposure > 0 ? `(${totalExposure.toFixed(2)})` : totalExposure.toFixed(2)}
                  </button>
                </td>
                <td className="py-2 px-2 border-r border-slate-200"></td>
                <td className="py-2 px-2 border-r border-slate-200"></td>
                <td className="py-2 px-2 border-r border-slate-200"></td>
                <td className="py-2 px-3 border-r border-slate-200"></td>
                <td className="py-2 px-3"></td>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    <Users className="w-9 h-9 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">No client accounts found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery || searchUidInput
                        ? `No match found for your search query`
                        : 'Clients will appear here immediately upon registration.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const isBlocked = u.status === 'blocked';
                  const isBetLocked = Array.isArray(u.disabledGames) && u.disabledGames.length > 0;
                  const creditRef = Number((u as any).creditReference) || 50000;
                  const bal = Number(u.walletBalance) || 0;
                  const pendingBal = bal - creditRef;
                  const exposureVal = Number(u.exposure !== undefined ? u.exposure : u.activeExposure || 0);
                  const availableBal = Math.max(0, bal - Math.abs(exposureVal));
                  const uBet = Number(u.totalBet || 0);
                  const uWin = Number(u.totalWin || 0);
                  const pnl = (u as any).netProfitLoss !== undefined ? Number((u as any).netProfitLoss) : (uWin - uBet);

                  return (
                    <tr
                      key={u.uid || idx}
                      className="hover:bg-[#f0f8fa] transition-colors border-b border-slate-200 text-slate-700 text-xs whitespace-nowrap"
                    >
                      {/* 1. UID (Placed before User Name) */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <span
                          onClick={() => {
                            if (onViewUserDetails) {
                              onViewUserDetails(u.uid);
                            } else {
                              setSelectedUser(u);
                            }
                          }}
                          className="font-mono text-xs font-bold text-teal-800 hover:text-teal-600 hover:underline cursor-pointer bg-slate-100 hover:bg-teal-50 px-2 py-0.5 rounded border border-slate-200 inline-block"
                          title="Click to view client details"
                        >
                          {u.uid}
                        </span>
                      </td>

                      {/* 2. User Name with [C] Green badge */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded bg-[#10b981] text-white flex items-center justify-center font-black text-[10px] shrink-0"
                            title="Client Account"
                          >
                            C
                          </span>
                          <span
                            onClick={() => {
                              if (onViewUserDetails) {
                                onViewUserDetails(u.uid);
                              } else {
                                setSelectedUser(u);
                              }
                            }}
                            className="font-semibold text-slate-800 hover:text-teal-700 hover:underline cursor-pointer font-mono"
                          >
                            {u.username || u.uid}
                          </span>
                        </div>
                      </td>

                      {/* 3. Phone Number & UPI (Replaces Credit Reference) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-semibold text-slate-700">
                        <div>{u.phone || (u as any).phoneNumber || (u as any).mobile || '-'}</div>
                        {((u as any).upiId || (Array.isArray((u as any).bankAccounts) && (u as any).bankAccounts[0]?.upiId)) && (
                          <div
                            className="text-[10px] text-teal-700 font-sans font-medium bg-teal-50 border border-teal-200/60 px-1 py-0.5 rounded mt-0.5 max-w-[130px] mx-auto truncate"
                            title={`UPI: ${(u as any).upiId || (u as any).bankAccounts[0]?.upiId}`}
                          >
                            {(u as any).upiId || (u as any).bankAccounts[0]?.upiId}
                          </div>
                        )}
                      </td>

                      {/* 3. Balance (Green bold font) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-[#059669]">
                        {bal.toFixed(2)}
                      </td>

                      {/* 4. Pending Bal. (Red if negative, Green if positive) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold">
                        {pendingBal < 0 ? (
                          <span className="text-[#dc2626]">-{Math.abs(pendingBal).toFixed(2)}</span>
                        ) : (
                          <span className="text-[#059669]">{pendingBal.toFixed(2)}</span>
                        )}
                      </td>

                      {/* 5. Available Bal. (Green bold font) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-[#059669]">
                        {availableBal.toFixed(2)}
                      </td>

                      {/* 6. Current P&L (Green if client in +, Red if client in -) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono">
                        {pnl > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded bg-[#d1fae5] border border-[#34d399] text-[#065f46] font-black text-xs shadow-xs">
                            +{pnl.toFixed(2)}
                          </span>
                        ) : pnl < 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded bg-[#fee2e2] border border-[#f87171] text-[#b91c1c] font-black text-xs shadow-xs">
                            {pnl.toFixed(2)}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 font-bold text-xs">
                            0.00
                          </span>
                        )}
                      </td>

                      {/* 7. Exposure */}
                      <td
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenExposureModal(u);
                        }}
                        className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-semibold cursor-pointer hover:bg-rose-50/70 select-none group"
                        title="Click to view bets & active exposure breakdown"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenExposureModal(u);
                          }}
                          className={`cursor-pointer font-bold inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all shadow-xs ${
                            exposureVal > 0
                              ? 'text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300'
                              : 'text-slate-700 bg-slate-100 hover:bg-teal-50 border border-slate-300 hover:border-teal-400 hover:text-teal-800'
                          }`}
                        >
                          <span>{exposureVal > 0 ? `(${exposureVal.toFixed(2)})` : exposureVal.toFixed(2)}</span>
                          <span className="text-[10px] text-teal-600 font-sans font-medium group-hover:underline">
                            View ▾
                          </span>
                        </button>
                      </td>

                      {/* 8. U Lock (User Account Lock Checkbox) */}
                      <td className="py-2.5 px-2 border-r border-slate-200 text-center">
                        <input
                          type="checkbox"
                          checked={isBlocked}
                          onChange={() => handleToggleBlock(u)}
                          className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-[#004d5a]"
                          title={isBlocked ? 'Account is LOCKED (Click to Unlock)' : 'Account is UNLOCKED (Click to Lock)'}
                        />
                      </td>

                      {/* 9. B Lock (Bet Lock Checkbox) */}
                      <td className="py-2.5 px-2 border-r border-slate-200 text-center">
                        <input
                          type="checkbox"
                          checked={isBetLocked}
                          onChange={() => handleToggleBetLock(u)}
                          className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-[#004d5a]"
                          title={isBetLocked ? 'Betting is LOCKED (Click to Unlock)' : 'Betting is UNLOCKED (Click to Lock)'}
                        />
                      </td>

                      {/* 10. My % */}
                      <td className="py-2.5 px-2 border-r border-slate-200 text-center font-mono text-slate-600">
                        {(u as any).sharePercent || 0}%
                      </td>

                      {/* 11. Type */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center text-slate-700 font-medium">
                        Client
                      </td>

                      {/* 12. Actions: The exact colorful square badges (U, D|C, W, P, GC, CC, DEL) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* U (User Profile) - Orange Square */}
                          <button
                            onClick={() => {
                              if (onViewUserDetails) {
                                onViewUserDetails(u.uid);
                              } else {
                                setSelectedUser(u);
                              }
                            }}
                            className="w-6 h-6 rounded bg-[#f97316] hover:bg-[#ea580c] text-white flex items-center justify-center font-black text-xs shadow-xs cursor-pointer"
                            title="User Profile (U)"
                          >
                            U
                          </button>

                          {/* D|C (Deposit / Credit) - Green Square */}
                          <button
                            onClick={() => {
                              setManualDepositUser(u);
                              setManualDepAmount('500');
                              setManualDepUtr(`DEP-${Date.now().toString().slice(-6)}`);
                              setShowManualDepositModal(true);
                            }}
                            className="h-6 px-1 rounded bg-[#15803d] hover:bg-[#16a34a] text-white flex items-center justify-center font-black text-[10px] shadow-xs cursor-pointer tracking-tighter"
                            title="Deposit / Credit Adjustment (D|C)"
                          >
                            <span className="text-[#38bdf8]">D</span>
                            <span className="text-[#ea580c] mx-0.5">|</span>
                            <span className="text-[#facc15]">C</span>
                          </button>

                          {/* W (Withdrawal) - Indigo Square */}
                          <button
                            onClick={() => {
                              setManualWithdrawUser(u);
                              setManualWthAmount(String(Math.min(500, Number(u.walletBalance || 0))));
                              setManualWthUtr(`PAYOUT-${Date.now().toString().slice(-6)}`);
                              setShowManualWithdrawModal(true);
                            }}
                            className="w-6 h-6 rounded bg-[#1d4ed8] hover:bg-[#2563eb] text-white flex items-center justify-center font-black text-xs shadow-xs cursor-pointer"
                            title="Manual Withdrawal (W)"
                          >
                            W
                          </button>

                          {/* P (Password) - Yellow Square */}
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setCustomNewPass('Password@123');
                              setResetSuccessData(null);
                              setShowResetPassModal(true);
                            }}
                            className="w-6 h-6 rounded bg-[#facc15] hover:bg-[#eab308] text-black flex items-center justify-center font-black text-xs shadow-xs cursor-pointer"
                            title="Reset Password (P)"
                          >
                            P
                          </button>

                          {/* GC (Game Control) - Pink Square */}
                          <button
                            onClick={() => handleOpenGameControl(u)}
                            className="h-6 px-1 rounded bg-[#e879f9] hover:bg-[#f472b6] text-black flex items-center justify-center font-black text-[10px] shadow-xs cursor-pointer relative"
                            title="Game Control (GC) - Manage Allowed Games for this Client"
                          >
                            <span>GC</span>
                            {isBetLocked && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-600 text-white rounded-full text-[7px] flex items-center justify-center font-bold">
                                !
                              </span>
                            )}
                          </button>

                          {/* CC (Client Control) - Lime Green Square */}
                          <button
                            onClick={() => handleOpenClientControl(u)}
                            className={`h-6 px-1 rounded ${
                              isBlocked ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-[#4ade80] hover:bg-[#22c55e] text-black'
                            } flex items-center justify-center font-black text-[10px] shadow-xs cursor-pointer`}
                            title={`Client Control (CC) - Currently ${!isBlocked ? 'Active' : 'Blocked'}`}
                          >
                            CC
                          </button>

                          {/* DEL (Delete User ID) - Crimson Red Square */}
                          <button
                            onClick={() => handleOpenDeleteModal(u)}
                            className="w-6 h-6 rounded bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center font-black text-xs shadow-xs cursor-pointer"
                            title="Delete User ID Permanently (DEL)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* =====================================================================
            PAGINATION FOOTER (Matching screenshot First, Prev, 1, Next, Last)
        ===================================================================== */}
        <div className="p-3 bg-[#fdfdfd] border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div>
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} entries
          </div>

          <div className="flex items-center gap-1 font-semibold text-xs">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-[#4ba3b1] hover:bg-[#3b8e9c] disabled:opacity-40 text-white transition cursor-pointer"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-[#4ba3b1] hover:bg-[#3b8e9c] disabled:opacity-40 text-white transition cursor-pointer"
            >
              Prev
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded transition cursor-pointer font-bold ${
                    currentPage === pageNum ? 'bg-black text-white' : 'bg-[#4ba3b1] hover:bg-[#3b8e9c] text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-[#4ba3b1] hover:bg-[#3b8e9c] disabled:opacity-40 text-white transition cursor-pointer"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-[#4ba3b1] hover:bg-[#3b8e9c] disabled:opacity-40 text-white transition cursor-pointer"
            >
              Last
            </button>
          </div>
        </div>
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
                <button
                  onClick={() => {
                    handleOpenDeleteModal(selectedUser);
                    setSelectedUser(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                  title="Delete user account permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#121422] border border-[#2b304c] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto relative">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#23273c] flex items-center justify-between bg-[#16192b]/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-lg">
                  📊
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Client Exposure & Bets Breakdown</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      UID: {exposureUser.uid}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Client: <strong className="text-slate-200">{exposureUser.username}</strong> | Phone: <strong className="text-slate-200">{exposureUser.phone || (exposureUser as any).phoneNumber || '---'}</strong>
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
              {exposureLoading && (
                <div className="py-2 px-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-semibold text-xs">Syncing latest live round bets & exposure...</span>
                </div>
              )}

              {(() => {
                const activeExposureVal = Number(exposureData?.activeExposure ?? exposureUser.exposure ?? 0);
                const expTotalBet = Number(exposureData?.totalBet ?? exposureUser.totalBet ?? 0);
                const expTotalWin = Number(exposureData?.totalWin ?? exposureUser.totalWin ?? 0);
                const clientNetPnl = exposureData?.netProfitLoss !== undefined 
                  ? Number(exposureData.netProfitLoss) 
                  : (expTotalWin - expTotalBet);
                const isProfit = clientNetPnl > 0;
                const isLoss = clientNetPnl < 0;

                // Active open bets currently pending (active liabilities)
                const activeBetsList = Array.isArray(exposureData?.activeBets) && exposureData.activeBets.length > 0
                  ? exposureData.activeBets
                  : (Array.isArray(exposureData?.recentBets)
                      ? exposureData.recentBets.filter((b: any) => b.status === 'pending')
                      : []);

                // Filter games: ONLY show games where bets have been placed ("jisame bet laga rhega whi show kre")
                const playedGames = ALL_AVAILABLE_GAMES.filter((game) => {
                  const bData = exposureData?.gameBreakdown?.[game.key];
                  return bData && (bData.totalBet > 0 || bData.rounds > 0 || bData.totalWin > 0);
                });

                // Recent bets placed log
                const recentBetsList = Array.isArray(exposureData?.recentBets)
                  ? exposureData.recentBets.filter((b: any) => Number(b.totalAmount || b.amount || 0) > 0)
                  : [];

                return (
                  <>
                    {/* Top 4 KPI Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* 1. Active Exposure */}
                      <div className={`rounded-xl p-3 border ${activeExposureVal > 0 ? 'bg-rose-950/30 border-rose-500/40' : 'bg-[#181a2e] border-[#2b304c]'}`}>
                        <div className="text-[11px] text-slate-400 font-medium">Active Exposure (Open Bets)</div>
                        <div className={`text-lg sm:text-xl font-bold font-mono mt-1 ${activeExposureVal > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {activeExposureVal > 0 ? `(₹ ${activeExposureVal.toFixed(2)})` : '₹ 0.00'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {activeExposureVal > 0 ? 'Pending round liabilities' : 'No open liabilities'}
                        </div>
                      </div>

                      {/* 2. Total Game Turnover */}
                      <div className="bg-[#181a2e] border border-[#2b304c] rounded-xl p-3">
                        <div className="text-[11px] text-slate-400 font-medium">Total Game Turnover (Stake)</div>
                        <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-1">
                          ₹ {expTotalBet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">All-time total stakes played</div>
                      </div>

                      {/* 3. Total Client Winnings */}
                      <div className="bg-[#181a2e] border border-[#2b304c] rounded-xl p-3">
                        <div className="text-[11px] text-slate-400 font-medium">Total Client Winnings</div>
                        <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
                          ₹ {expTotalWin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Gross won amount</div>
                      </div>

                      {/* 4. Current Profit / Loss (Green if client in +, Red if client in -) */}
                      <div className={`rounded-xl p-3 border ${
                        isProfit 
                          ? 'bg-emerald-950/40 border-emerald-500/50' 
                          : isLoss 
                            ? 'bg-rose-950/40 border-rose-500/50' 
                            : 'bg-[#181a2e] border-[#2b304c]'
                      }`}>
                        <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                          <span>Current Profit / Loss</span>
                          {isProfit && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Client +
                            </span>
                          )}
                          {isLoss && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Client -
                            </span>
                          )}
                        </div>
                        <div className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
                          isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'
                        }`}>
                          {isProfit ? `+₹ ${clientNetPnl.toFixed(2)}` : isLoss ? `-₹ ${Math.abs(clientNetPnl).toFixed(2)}` : '₹ 0.00'}
                        </div>
                        <div className="text-[10px] mt-0.5">
                          {isProfit ? (
                            <span className="text-emerald-400 font-medium">Client is in PROFIT (Green)</span>
                          ) : isLoss ? (
                            <span className="text-rose-400 font-medium">Client is in LOSS (Red)</span>
                          ) : (
                            <span className="text-slate-500">Break-even (₹0.00)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section: ACTIVE OPEN BETS (Current Exposure) */}
                    {activeBetsList.length > 0 && (
                      <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            <span className="text-sm font-bold text-rose-300">
                              Active Open Bets / Current Exposure ({activeBetsList.length})
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-rose-400">
                            Total Exposure: ₹ {activeExposureVal.toFixed(2)}
                          </span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-[#2b304c] bg-[#141628]">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="border-b border-[#23273c] text-[10px] text-slate-400 font-semibold uppercase bg-[#181a2e]">
                                <th className="py-2 px-3">Time</th>
                                <th className="py-2 px-3">Game</th>
                                <th className="py-2 px-3">Period / Round</th>
                                <th className="py-2 px-3">Selection / Bet</th>
                                <th className="py-2 px-3 text-right">Stake Amount</th>
                                <th className="py-2 px-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e2238]">
                              {activeBetsList.map((bet: any, idx: number) => {
                                const bDate = bet.createdAt ? new Date(bet.createdAt).toLocaleTimeString('en-IN') : 'Just now';
                                return (
                                  <tr key={bet.id || idx} className="hover:bg-[#181b30] transition text-[11px]">
                                    <td className="py-2 px-3 text-slate-400">{bDate}</td>
                                    <td className="py-2 px-3 font-sans font-bold text-white capitalize">
                                      {String(bet.gameType || 'Game').replace(/_/g, ' ')}
                                    </td>
                                    <td className="py-2 px-3 text-slate-300">#{bet.periodId || bet.roundId || '---'}</td>
                                    <td className="py-2 px-3 font-bold text-cyan-300">
                                      {bet.selectType || bet.choice || bet.betType || bet.number || 'Standard Bet'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-rose-400">
                                      ₹ {(Number(bet.totalAmount || bet.amount || 0)).toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                        ACTIVE EXPOSURE
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Section: PLAYED GAMES BREAKDOWN (ONLY SHOW GAMES WHERE BET WAS PLACED) */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">Games With Placed Bets (जिस गेम में बेट लगा हुआ है)</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {playedGames.length} Played Games
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          (Unplayed games with ₹0.00 are hidden)
                        </span>
                      </div>

                      {playedGames.length === 0 ? (
                        <div className="py-8 px-4 text-center rounded-xl border border-[#2b304c] bg-[#141628] text-slate-400">
                          <p className="font-semibold text-slate-300">No bets placed on any games yet</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Client has not placed wagers in any game categories yet. Exposure is ₹0.00.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-[#2b304c] bg-[#141628]">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#23273c] text-[11px] text-slate-400 font-semibold uppercase bg-[#181a2e]">
                                <th className="py-2.5 px-3">Game Name</th>
                                <th className="py-2.5 px-3">Category</th>
                                <th className="py-2.5 px-3 text-right">Rounds Played</th>
                                <th className="py-2.5 px-3 text-right">Total Bet (Stake)</th>
                                <th className="py-2.5 px-3 text-right">Total Won</th>
                                <th className="py-2.5 px-3 text-right">Client Net P&L</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e2238]">
                              {playedGames.map((game) => {
                                const bData = exposureData?.gameBreakdown?.[game.key] || { totalBet: 0, totalWin: 0, rounds: 0, netProfit: 0 };
                                const gamePnl = bData.netProfit;
                                const isGameProfit = gamePnl > 0;
                                const isGameLoss = gamePnl < 0;

                                return (
                                  <tr key={game.key} className="hover:bg-[#181b30] transition bg-[#181a2e]/40 font-medium">
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
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                                      {bData.rounds}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                                      ₹ {bData.totalBet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                      ₹ {bData.totalWin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono">
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                        isGameProfit
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                          : isGameLoss
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                            : 'bg-slate-700/40 text-slate-300 border border-slate-600'
                                      }`}>
                                        {isGameProfit ? `+₹${gamePnl.toFixed(2)}` : isGameLoss ? `-₹${Math.abs(gamePnl).toFixed(2)}` : '₹0.00'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Section: RECENT PLACED BETS ACTIVITY LOG */}
                    {recentBetsList.length > 0 && (
                      <div>
                        <div className="text-sm font-bold text-white mb-2 flex items-center justify-between">
                          <span>Recent Placed Bets Activity Log ({recentBetsList.length} Bets)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Shows individual settled and pending bets</span>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-[#2b304c] bg-[#141628] max-h-64">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="border-b border-[#23273c] text-[10px] text-slate-400 font-semibold uppercase bg-[#181a2e]">
                                <th className="py-2 px-3">Time</th>
                                <th className="py-2 px-3">Game</th>
                                <th className="py-2 px-3">Period / Round</th>
                                <th className="py-2 px-3">Selection</th>
                                <th className="py-2 px-3 text-right">Stake Amount</th>
                                <th className="py-2 px-3 text-center">Status</th>
                                <th className="py-2 px-3 text-right">Win Payout</th>
                                <th className="py-2 px-3 text-right">Client P&L</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e2238]">
                              {recentBetsList.slice(0, 30).map((bet: any, bIdx: number) => {
                                const isWon = bet.status === 'won';
                                const isPending = bet.status === 'pending';
                                const bDate = bet.createdAt ? new Date(bet.createdAt).toLocaleTimeString('en-IN') : '---';
                                const stakeAmt = Number(bet.totalAmount || bet.amount || 0);
                                const winAmt = Number(bet.winAmount || 0);
                                const betPnl = isWon ? (winAmt - stakeAmt) : (isPending ? 0 : -stakeAmt);

                                return (
                                  <tr key={bet.id || bIdx} className="hover:bg-[#181b30] transition text-[11px]">
                                    <td className="py-2 px-3 text-slate-400">{bDate}</td>
                                    <td className="py-2 px-3 font-sans font-bold text-white capitalize">
                                      {String(bet.gameType || 'Game').replace(/_/g, ' ')}
                                    </td>
                                    <td className="py-2 px-3 text-slate-300">#{bet.periodId || bet.roundId || '---'}</td>
                                    <td className="py-2 px-3 font-sans text-cyan-300 font-medium">
                                      {bet.selectType || bet.choice || bet.betType || bet.number || 'Bet'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-amber-400">
                                      ₹ {stakeAmt.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isWon 
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                          : isPending
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      }`}>
                                        {bet.status?.toUpperCase() || 'COMPLETED'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-emerald-400">
                                      {isWon ? `₹ ${winAmt.toFixed(2)}` : '₹ 0.00'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold">
                                      {isWon ? (
                                        <span className="text-emerald-400">+₹{betPnl.toFixed(2)}</span>
                                      ) : isPending ? (
                                        <span className="text-amber-400">Pending</span>
                                      ) : (
                                        <span className="text-rose-400">-₹{Math.abs(betPnl).toFixed(2)}</span>
                                      )}
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
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#23273c] flex items-center justify-between bg-[#16192b]/80">
              <span className="text-xs text-slate-400">
                Exposure & P&L are accurately computed from active pending wagers and settled game results.
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

      {/* ================= DELETE USER CONFIRMATION MODAL ================= */}
      {showDeleteUserModal && userToDelete && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12131a] border border-rose-500/40 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Delete User ID (यूजर डिलीट करें)</h3>
                  <p className="text-[11px] text-zinc-400">Permanent removal of account & cloud data</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!deletingUser) {
                    setShowDeleteUserModal(false);
                    setUserToDelete(null);
                  }
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>सावधानी: यह यूजर स्थायी रूप से डिलीट हो जाएगा!</span>
              </div>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                क्या आप वाकई यूजर <strong className="text-white font-mono">UID: {userToDelete.uid}</strong> ({userToDelete.username}) का अकाउंट डिलीट करना चाहते हैं?
                इसका वॉलेट बैलेंस, गेम रिकॉर्ड और क्लाउड डेटाबेस एंट्री हमेशा के लिए हटा दी जाएगी।
              </p>
            </div>

            {/* User Details Summary */}
            <div className="bg-[#181924] border border-[#2b2d3d] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">User ID (UID):</span>
                <span className="font-mono text-amber-400 font-bold">{userToDelete.uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Username:</span>
                <span className="text-white font-semibold">{userToDelete.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Phone Number:</span>
                <span className="font-mono text-zinc-300">{userToDelete.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Current Wallet Balance:</span>
                <span className="font-mono text-emerald-400 font-bold">₹ {Number(userToDelete.walletBalance || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 justify-end pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteUserModal(false);
                  setUserToDelete(null);
                }}
                disabled={deletingUser}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel (रद्द करें)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={deletingUser}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>हाँ, यूजर डिलीट करें (Confirm Delete)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= QUICK DELETE USER BY UID MODAL ================= */}
      {showQuickDeleteModal && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12131a] border border-rose-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Quick Delete User by UID (यूजर आईडी से डिलीट करें)</h3>
                  <p className="text-[11px] text-zinc-400">Enter User ID (UID) to permanently delete account</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowQuickDeleteModal(false);
                  setQuickDeleteUidInput('');
                  setQuickDeleteSearchResult(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input search box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Enter User ID (UID), Username, or Phone Number:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 73923178 or Member_1200"
                  value={quickDeleteUidInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickDeleteUidInput(val);
                    if (val.trim()) {
                      const clean = val.trim().toLowerCase();
                      const found = users.find(
                        (u) =>
                          u.uid.toLowerCase() === clean ||
                          u.username.toLowerCase() === clean ||
                          (u.phone && u.phone.includes(clean))
                      );
                      setQuickDeleteSearchResult(found || null);
                    } else {
                      setQuickDeleteSearchResult(null);
                    }
                  }}
                  className="flex-1 bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={async () => {
                    const clean = quickDeleteUidInput.trim();
                    if (!clean) return;
                    try {
                      setLoading(true);
                      const data = await api.getAdminUsers(clean);
                      if (data?.users && data.users.length > 0) {
                        setQuickDeleteSearchResult(data.users[0]);
                      } else {
                        showToast('No user found matching this UID/phone', 'error');
                        setQuickDeleteSearchResult(null);
                      }
                    } catch (err: any) {
                      showToast(err.message || 'Error searching user', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find</span>
                </button>
              </div>
            </div>

            {/* If user found */}
            {quickDeleteSearchResult ? (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">User ID (UID):</span>
                    <span className="font-mono text-amber-400 font-black text-sm">{quickDeleteSearchResult.uid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Username:</span>
                    <span className="text-white font-bold">{quickDeleteSearchResult.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Mobile Phone:</span>
                    <span className="font-mono text-zinc-300">{quickDeleteSearchResult.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Current Balance:</span>
                    <span className="font-mono text-emerald-400 font-black">
                      ₹ {Number(quickDeleteSearchResult.walletBalance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Status:</span>
                    <span className={`font-bold ${quickDeleteSearchResult.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {quickDeleteSearchResult.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
                  ⚠️ यह यूजर हमेशा के लिए डेटाबेस और क्लाउड स्टोरेज से डिलीट हो जाएगा। इस प्रक्रिया को वापस नहीं लाया जा सकता।
                </div>

                <div className="flex gap-2.5 justify-end pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickDeleteModal(false);
                      setQuickDeleteSearchResult(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenDeleteModal(quickDeleteSearchResult);
                      setShowQuickDeleteModal(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Proceed to Delete (डिलीट करें)</span>
                  </button>
                </div>
              </div>
            ) : quickDeleteUidInput.trim() ? (
              <div className="p-4 bg-zinc-900/60 rounded-xl text-center text-xs text-zinc-400">
                Type exact UID or click Find to verify user details before deleting.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLEAR ALL USER IDS MODAL                                */}
      {/* ======================================================== */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121422] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Remove All Client IDs?</h3>
              <p className="text-xs text-rose-300 font-medium">
                (क्या आप सिस्टम से सभी यूजर आईडी और अकाउंट्स हटाना चाहते हैं?)
              </p>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                This will permanently delete all registered user accounts, their placed bets, transactions, and exposures from the database and storage.
              </p>
            </div>

            <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-500/20 text-center">
              <span className="text-xs font-mono font-bold text-rose-300">
                Total Clients to Remove: {users.length}
              </span>
            </div>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={clearingAllUsers}
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingAllUsers}
                onClick={handleConfirmClearAllUsers}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-2"
              >
                {clearingAllUsers ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing All...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Remove All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
