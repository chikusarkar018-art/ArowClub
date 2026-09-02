import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Crown, Gift, Sparkles, Save, Plus, Trash2, CheckCircle2,
  AlertCircle, DollarSign, Users, Award, Shield, Percent,
  TrendingUp, RefreshCw, Check, Search, Edit2, X, ArrowUpRight,
  ShieldCheck, UserCheck
} from 'lucide-react';

export const VipBonusManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'vip_players' | 'vip_tiers' | 'bonus_tasks' | 'checkin_activities' | 'commissions'>('vip_players');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // VIP Players List
  const [vipUsers, setVipUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserForVip, setSelectedUserForVip] = useState<any | null>(null);
  const [targetVipLevel, setTargetVipLevel] = useState(1);
  const [targetVipExp, setTargetVipExp] = useState(0);
  const [targetRewardBonus, setTargetRewardBonus] = useState(0);
  const [vipReason, setVipReason] = useState('Admin VIP Upgrade Promotion');
  const [adjustingVip, setAdjustingVip] = useState(false);

  // VIP Tiers
  const [vipTiers, setVipTiers] = useState<any[]>([]);

  // Bonus Tasks (Get ₹500 & Missions)
  const [bonusTasks, setBonusTasks] = useState<any[]>([]);

  // Activity Promos (Daily check-in, first deposit, etc.)
  const [activityPromos, setActivityPromos] = useState<any[]>([]);

  // Bonus & Commission Settings
  const [bonusCommission, setBonusCommission] = useState<any>({
    depositBonusPercent: 10,
    winningDeductionPercent: 0,
    firstDepositBonusPercent: 10,
  });

  // Referral System Settings
  const [referralSettings, setReferralSettings] = useState<any>({
    signupBonus: 10,
    referralInviteBonus: 50,
    referralDepositCommissionPercent: 5,
    referralBetCommissionPercent: 1,
  });

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.getAdminUsers();
      if (res?.users) {
        setVipUsers(res.users);
      }
    } catch (err: any) {
      // ignore
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, usersRes] = await Promise.allSettled([
        api.getAdminBonusAllSettings(),
        api.getAdminUsers()
      ]);
      
      if (res.status === 'fulfilled' && res.value) {
        if (res.value.vipTiers) setVipTiers(res.value.vipTiers);
        if (res.value.bonusTasks) setBonusTasks(res.value.bonusTasks);
        if (res.value.activityPromos) setActivityPromos(res.value.activityPromos);
        if (res.value.bonusCommission) setBonusCommission(res.value.bonusCommission);
        if (res.value.referralSystem) setReferralSettings(res.value.referralSystem);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value?.users) {
        setVipUsers(usersRes.value.users);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bonus & VIP settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenVipModal = (u: any) => {
    setSelectedUserForVip(u);
    setTargetVipLevel(u.vipLevel || 0);
    setTargetVipExp(u.vipExp || 0);
    setTargetRewardBonus(0);
    setVipReason(`Admin VIP rank upgrade for UID ${u.uid}`);
  };

  const handleConfirmVipAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForVip) return;
    setAdjustingVip(true);
    try {
      await api.adminAdjustUserVip(
        selectedUserForVip.uid,
        Number(targetVipLevel),
        Number(targetVipExp),
        Number(targetRewardBonus),
        vipReason,
        admin?.username || 'SuperAdmin'
      );
      showToast?.(`VIP level updated to VIP ${targetVipLevel} for ${selectedUserForVip.username}!`, 'success');
      setSelectedUserForVip(null);
      fetchUsers();
    } catch (err: any) {
      showToast?.(err.message || 'Failed to adjust VIP level', 'error');
    } finally {
      setAdjustingVip(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateAdminBonusAllSettings({
        vipTiers,
        bonusTasks,
        activityPromos,
        bonusCommission,
        referralSystem: referralSettings,
      }, admin?.username || 'SuperAdmin');

      setSuccessToast('All VIP and Bonus settings updated successfully!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // VIP Tier Helpers
  const handleVipChange = (index: number, field: string, value: any) => {
    const next = [...vipTiers];
    next[index] = { ...next[index], [field]: value };
    setVipTiers(next);
  };

  const handleAddVipTier = () => {
    const nextLevel = vipTiers.length + 1;
    const newTier = {
      level: nextLevel,
      name: `VIP${nextLevel}`,
      tierCategory: 'Supreme',
      tierCategoryHindi: `सुप्रीम VIP ${nextLevel}`,
      requiredExp: (vipTiers[vipTiers.length - 1]?.requiredExp || 1000000) * 2,
      levelUpReward: 500,
      safeIncomeRate: '1.0%',
      rebateRate: '2.0%',
      monthlyReward: 200,
      withdrawalLimit: 50,
    };
    setVipTiers([...vipTiers, newTier]);
  };

  const handleDeleteVipTier = (index: number) => {
    setVipTiers(vipTiers.filter((_, i) => i !== index));
  };

  // Task Helpers
  const handleTaskChange = (index: number, field: string, value: any) => {
    const next = [...bonusTasks];
    next[index] = { ...next[index], [field]: value };
    setBonusTasks(next);
  };

  const handleAddTask = () => {
    const newTask = {
      id: `task-${Date.now()}`,
      title: 'New Reward Mission',
      reward: 50,
      badge: 'HOT BONUS',
      badgeColor: 'bg-emerald-500',
      desc: 'Complete mission to claim your instant cash reward.',
      actionLabel: 'Claim Reward',
      targetType: 'deposit',
      targetValue: 100,
      isActive: true,
    };
    setBonusTasks([...bonusTasks, newTask]);
  };

  const handleDeleteTask = (index: number) => {
    setBonusTasks(bonusTasks.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#f59e0b] animate-spin" />
          <span className="text-sm font-semibold text-zinc-400">Loading VIP & Bonus Configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#10b981] text-black font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="fixed top-6 right-6 z-50 bg-rose-600 text-white font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121215] border border-[#2a2415] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[#f59e0b]">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
                VIP & Bonus Master Management
              </h2>
              <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
                Full control to edit VIP tier cash rewards, mission bonus amounts, daily check-in & commissions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-sm px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Save All Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#26262a] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('vip_players')}
          className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'vip_players'
              ? 'bg-[#f59e0b] text-black shadow-md'
              : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 border border-[#26262a]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>VIP Members & Players</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono font-bold">
            {vipUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vip_tiers')}
          className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'vip_tiers'
              ? 'bg-[#f59e0b] text-black shadow-md'
              : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 border border-[#26262a]'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>VIP Tiers (1-10)</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
            {vipTiers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bonus_tasks')}
          className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'bonus_tasks'
              ? 'bg-[#f59e0b] text-black shadow-md'
              : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 border border-[#26262a]'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Bonus Tasks (Get ₹500)</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
            {bonusTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('checkin_activities')}
          className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'checkin_activities'
              ? 'bg-[#f59e0b] text-black shadow-md'
              : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 border border-[#26262a]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Daily Check-in & Events</span>
        </button>

        <button
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'commissions'
              ? 'bg-[#f59e0b] text-black shadow-md'
              : 'bg-[#18181b] text-zinc-400 hover:text-zinc-200 border border-[#26262a]'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Referral & Deduction %</span>
        </button>
      </div>

      {/* Tab 0: VIP Players List & Management */}
      {activeTab === 'vip_players' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#121215] border border-[#2a2415] rounded-2xl p-4 shadow-lg">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search VIP by UID, Name, Phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#09090b] border border-[#26262a] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f59e0b]"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchUsers}
                disabled={usersLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#18181b] border border-[#26262a] text-zinc-300 hover:text-white text-xs font-bold transition hover:border-[#f59e0b]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin text-[#f59e0b]' : ''}`} />
                <span>Refresh Members</span>
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-[#121215] border border-[#2a2415] rounded-2xl p-4 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#26262a] text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">UID</th>
                  <th className="pb-3 px-3">Member Name</th>
                  <th className="pb-3 px-3">Phone</th>
                  <th className="pb-3 px-3">Current VIP Rank</th>
                  <th className="pb-3 px-3">VIP EXP (Turnover)</th>
                  <th className="pb-3 px-3">Wallet Balance</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">VIP Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262a]">
                {vipUsers
                  .filter((u) => {
                    if (!userSearch) return true;
                    const q = userSearch.toLowerCase();
                    return (
                      u.uid?.toLowerCase().includes(q) ||
                      u.username?.toLowerCase().includes(q) ||
                      u.phone?.toLowerCase().includes(q)
                    );
                  })
                  .map((u, idx) => {
                    const currentLvl = u.vipLevel ?? 0;
                    return (
                      <tr key={u.uid || idx} className="hover:bg-[#18181b]/50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {u.uid}
                        </td>
                        <td className="py-3 px-3 font-bold text-zinc-100">
                          {u.username || `User_${u.uid}`}
                        </td>
                        <td className="py-3 px-3 text-emerald-400 font-mono font-bold text-xs tracking-wider">
                          {u.phone || '---'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                            currentLvl >= 5
                              ? 'bg-amber-500/20 text-[#f59e0b] border border-amber-500/40 shadow-sm shadow-amber-500/20'
                              : currentLvl > 0
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            <Crown className="w-3 h-3" />
                            <span>VIP {currentLvl}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-zinc-300 font-mono font-semibold">
                          {(u.vipExp ?? 0).toLocaleString('en-IN')} EXP
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                          ₹ {(Number(u.walletBalance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status !== 'blocked'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {u.status !== 'blocked' ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenVipModal(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-black transition shadow-sm active:scale-95"
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>Adjust VIP</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {vipUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-500 font-semibold">
                      No users registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIP Adjust Modal */}
      {selectedUserForVip && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2a2415] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#26262a]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#f59e0b]">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-100">
                    VIP Rank Control & Bonus Reward
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Player: <span className="text-white font-bold">{selectedUserForVip.username}</span> (UID: {selectedUserForVip.uid})
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedUserForVip(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmVipAdjust} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Target VIP Level (0 to 10)
                </label>
                <select
                  value={targetVipLevel}
                  onChange={(e) => setTargetVipLevel(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-xl px-3 py-2.5 text-zinc-100 font-bold focus:outline-none focus:border-[#f59e0b]"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      VIP {lvl} {lvl === 0 ? '(Standard Player)' : lvl <= 3 ? '(Silver / Gold)' : lvl <= 7 ? '(Platinum / Diamond)' : '(Supreme King)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Total VIP EXP (Points / Turnover)
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetVipExp}
                  onChange={(e) => setTargetVipExp(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-xl px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Immediate VIP Level-Up Cash Bonus (₹) <span className="text-[#f59e0b]">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetRewardBonus}
                  onChange={(e) => setTargetRewardBonus(Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-[#f59e0b]"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  If set &gt; 0, this amount will be immediately credited to the user's wallet with ledger entry.
                </span>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Admin Audit Note / Reason
                </label>
                <input
                  type="text"
                  value={vipReason}
                  onChange={(e) => setVipReason(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[#26262a]">
                <button
                  type="button"
                  onClick={() => setSelectedUserForVip(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustingVip}
                  className="px-5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black font-black transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {adjustingVip ? 'Updating...' : 'Save & Apply VIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 1: VIP Tiers */}
      {activeTab === 'vip_tiers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              VIP Tier Privileges & Cash Rewards
            </h3>
            <button
              onClick={handleAddVipTier}
              className="bg-[#18181b] hover:bg-[#27272a] border border-[#26262a] text-zinc-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Higher VIP Tier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vipTiers.map((tier, idx) => (
              <div
                key={tier.level || idx}
                className="bg-[#121215] border border-[#2a2415] rounded-2xl p-5 shadow-xl space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-xs">
                      {tier.name || `VIP ${tier.level}`}
                    </span>
                    <span className="text-xs font-bold text-zinc-400">
                      {tier.tierCategoryHindi || tier.tierCategory}
                    </span>
                  </div>
                  {vipTiers.length > 1 && (
                    <button
                      onClick={() => handleDeleteVipTier(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1.5 transition-colors"
                      title="Delete Tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Required EXP / Deposit (₹)</label>
                    <input
                      type="number"
                      value={tier.requiredExp}
                      onChange={(e) => handleVipChange(idx, 'requiredExp', Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 font-mono font-bold text-zinc-100 focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Level Up Cash Reward (₹)</label>
                    <input
                      type="number"
                      value={tier.levelUpReward}
                      onChange={(e) => handleVipChange(idx, 'levelUpReward', Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 font-mono font-bold text-emerald-400 focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Monthly Reward (₹)</label>
                    <input
                      type="number"
                      value={tier.monthlyReward}
                      onChange={(e) => handleVipChange(idx, 'monthlyReward', Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 font-mono font-bold text-zinc-100 focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Daily Withdrawal Limit (Count)</label>
                    <input
                      type="number"
                      value={tier.withdrawalLimit}
                      onChange={(e) => handleVipChange(idx, 'withdrawalLimit', Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 font-mono font-bold text-zinc-100 focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Safe Box Interest Rate</label>
                    <input
                      type="text"
                      value={tier.safeIncomeRate}
                      onChange={(e) => handleVipChange(idx, 'safeIncomeRate', e.target.value)}
                      className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 font-mono font-bold text-zinc-100 focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Rebate Rate</label>
                    <input
                      type="text"
                      value={tier.rebateRate}
                      onChange={(e) => handleVipChange(idx, 'rebateRate', e.target.value)}
                      className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 font-mono font-bold text-zinc-100 focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Bonus Tasks (Get ₹500 & Missions) */}
      {activeTab === 'bonus_tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              "Get ₹500 Bonus" & Mission Tasks
            </h3>
            <button
              onClick={handleAddTask}
              className="bg-[#18181b] hover:bg-[#27272a] border border-[#26262a] text-zinc-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Mission
            </button>
          </div>

          <div className="space-y-3">
            {bonusTasks.map((task, idx) => (
              <div
                key={task.id || idx}
                className="bg-[#121215] border border-[#2a2415] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => handleTaskChange(idx, 'title', e.target.value)}
                      className="bg-[#09090b] border border-[#26262a] text-sm font-bold text-zinc-100 rounded-lg px-3 py-1.5 focus:border-[#f59e0b] focus:outline-none flex-1"
                      placeholder="Mission Title"
                    />
                    <input
                      type="text"
                      value={task.badge}
                      onChange={(e) => handleTaskChange(idx, 'badge', e.target.value)}
                      className="bg-[#09090b] border border-[#26262a] text-xs font-black text-amber-400 rounded-lg px-2.5 py-1.5 w-32 focus:border-[#f59e0b] focus:outline-none uppercase"
                      placeholder="Badge"
                    />
                  </div>

                  <input
                    type="text"
                    value={task.desc}
                    onChange={(e) => handleTaskChange(idx, 'desc', e.target.value)}
                    className="w-full bg-[#09090b] border border-[#26262a] text-xs text-zinc-400 rounded-lg px-3 py-1.5 focus:border-[#f59e0b] focus:outline-none"
                    placeholder="Task Description"
                  />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">Cash Reward:</span>
                    <div className="flex items-center bg-[#09090b] border border-[#26262a] rounded-lg px-2 py-1">
                      <span className="text-emerald-400 font-bold text-sm mr-1">₹</span>
                      <input
                        type="number"
                        value={task.reward}
                        onChange={(e) => handleTaskChange(idx, 'reward', Number(e.target.value))}
                        className="bg-transparent border-none text-emerald-400 font-mono font-black text-sm w-20 focus:outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={task.isActive !== false}
                      onChange={(e) => handleTaskChange(idx, 'isActive', e.target.checked)}
                      className="w-4 h-4 accent-[#f59e0b] rounded"
                    />
                    <span className="text-xs font-semibold text-zinc-300">Active</span>
                  </label>

                  <button
                    onClick={() => handleDeleteTask(idx)}
                    className="text-zinc-500 hover:text-rose-400 p-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Daily Check-In & Events */}
      {activeTab === 'checkin_activities' && (
        <div className="space-y-6">
          {/* Daily Checkin 7 Days */}
          <div className="bg-[#121215] border border-[#2a2415] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>7-Day Progressive Daily Check-In Rewards</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Set the exact cash bonus amount players receive on each consecutive day of checking in.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const checkinPromo = activityPromos.find((a) => a.id === 'act-daily-checkin') || {
                  extraSettings: { dailyCheckinRewards: [5, 10, 15, 25, 40, 60, 100] },
                };
                const currentVal = checkinPromo.extraSettings?.dailyCheckinRewards?.[day - 1] ?? (day * 10);

                return (
                  <div key={day} className="bg-[#09090b] border border-[#26262a] rounded-xl p-3 text-center space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 block">Day {day}</span>
                    <div className="flex items-center justify-center">
                      <span className="text-emerald-400 font-bold text-xs mr-0.5">₹</span>
                      <input
                        type="number"
                        value={currentVal}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          const nextPromos = [...activityPromos];
                          const targetIdx = nextPromos.findIndex((a) => a.id === 'act-daily-checkin');
                          if (targetIdx >= 0) {
                            const rewards = [...(nextPromos[targetIdx].extraSettings?.dailyCheckinRewards || [5, 10, 15, 25, 40, 60, 100])];
                            rewards[day - 1] = val;
                            nextPromos[targetIdx].extraSettings = {
                              ...nextPromos[targetIdx].extraSettings,
                              dailyCheckinRewards: rewards,
                            };
                            setActivityPromos(nextPromos);
                          }
                        }}
                        className="bg-transparent border-none text-center font-mono font-black text-sm text-emerald-400 w-16 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* First Deposit Match Event */}
          <div className="bg-[#121215] border border-[#2a2415] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-2">
              <Gift className="w-4 h-4" />
              <span>First Deposit Match Bonus Settings</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">Minimum Qualifying Deposit (₹)</label>
                <input
                  type="number"
                  value={100}
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 text-sm font-mono font-bold text-zinc-100 focus:outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">Instant Extra Cash Bonus (₹)</label>
                <input
                  type="number"
                  value={50}
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Referral & Platform Deductions */}
      {activeTab === 'commissions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Referral Rules */}
          <div className="bg-[#121215] border border-[#2a2415] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Referral & Registration Bonus</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">
                  New Player Signup Welcome Bonus (₹)
                </label>
                <input
                  type="number"
                  value={referralSettings.signupBonus ?? 10}
                  onChange={(e) =>
                    setReferralSettings({ ...referralSettings, signupBonus: Number(e.target.value) })
                  }
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:border-[#f59e0b] focus:outline-none"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Credited to every new user immediately upon registration.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">
                  Referrer Invite Bonus per Friend (₹)
                </label>
                <input
                  type="number"
                  value={referralSettings.referralInviteBonus ?? 50}
                  onChange={(e) =>
                    setReferralSettings({ ...referralSettings, referralInviteBonus: Number(e.target.value) })
                  }
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:border-[#f59e0b] focus:outline-none"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Credited to the referring user when an invited user registers.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">
                  Referral Recharge Commission (%)
                </label>
                <input
                  type="number"
                  value={referralSettings.referralDepositCommissionPercent ?? 5}
                  onChange={(e) =>
                    setReferralSettings({ ...referralSettings, referralDepositCommissionPercent: Number(e.target.value) })
                  }
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 text-sm font-mono font-bold text-zinc-100 focus:border-[#f59e0b] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Platform Deductions */}
          <div className="bg-[#121215] border border-[#2a2415] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Platform Commission & Tax Deductions</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">
                  Global Winning Tax / Service Cut (%)
                </label>
                <input
                  type="number"
                  value={bonusCommission.winningDeductionPercent ?? 0}
                  onChange={(e) =>
                    setBonusCommission({ ...bonusCommission, winningDeductionPercent: Number(e.target.value) })
                  }
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 text-sm font-mono font-bold text-zinc-100 focus:border-[#f59e0b] focus:outline-none"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Automatically deducted from every winning bet across all games.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-1">
                  Default Recharge Bonus Boost (%)
                </label>
                <input
                  type="number"
                  value={bonusCommission.depositBonusPercent ?? 10}
                  onChange={(e) =>
                    setBonusCommission({ ...bonusCommission, depositBonusPercent: Number(e.target.value) })
                  }
                  className="w-full bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 text-sm font-mono font-bold text-zinc-100 focus:border-[#f59e0b] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
