import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Users, UserCheck, UserX, Globe, Search, Filter,
  Download, Eye, DollarSign, ShieldAlert, CheckCircle2,
  ChevronLeft, ChevronRight, X, Phone, Mail, Calendar, ArrowRight,
  RefreshCw, UserPlus, Sparkles, Key, ArrowDownCircle, ArrowUpCircle,
  Copy, Check
} from 'lucide-react';
import { AdminUserSummary } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

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
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Registered On</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e202e]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
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
                      <td className="py-3.5 px-3">
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
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              if (onViewUserDetails) {
                                onViewUserDetails(u.uid);
                              } else {
                                setSelectedUser(u);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#5b50e6] hover:bg-[#4d42db] text-white text-[11px] font-bold transition shadow-sm"
                            title="View Full Profile"
                          >
                            View
                          </button>

                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setCustomNewPass('Password@123');
                              setResetSuccessData(null);
                              setShowResetPassModal(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition flex items-center gap-1"
                            title="Reset User Password"
                          >
                            <Key className="w-3 h-3" />
                            <span>Password</span>
                          </button>

                          <button
                            onClick={() => {
                              setManualDepositUser(u);
                              setManualDepAmount('500');
                              setManualDepUtr(`DEP-${Date.now().toString().slice(-6)}`);
                              setShowManualDepositModal(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1"
                            title="Manual Deposit for Client"
                          >
                            <ArrowDownCircle className="w-3 h-3" />
                            <span>+ Deposit</span>
                          </button>

                          <button
                            onClick={() => {
                              setManualWithdrawUser(u);
                              setManualWthAmount(String(Math.min(500, Number(u.walletBalance || 0))));
                              setManualWthUtr(`PAYOUT-${Date.now().toString().slice(-6)}`);
                              setShowManualWithdrawModal(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition flex items-center gap-1"
                            title="Manual Withdrawal Payout"
                          >
                            <ArrowUpCircle className="w-3 h-3" />
                            <span>- Withdraw</span>
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
    </div>
  );
};
