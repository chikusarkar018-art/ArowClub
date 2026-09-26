import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Gift, Percent, Crown, Users, Save, CheckCircle,
  AlertTriangle, RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight,
  DollarSign, Sparkles, HelpCircle, Flame, Calendar, Trophy, Zap,
  Layers, ShieldAlert, CheckCircle2, ChevronRight, Edit3
} from 'lucide-react';
import {
  BonusCommissionSettings,
  ReferralSystemSettings,
  DepositAmountBonusTier,
  BonusTaskConfig,
  ActivityPromoConfig
} from '../../types.js';

export const BonusCommissionCrownView: React.FC = () => {
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState<'tasks' | 'activities' | 'deposit_tiers' | 'vip_tiers' | 'general'>('tasks');
  const [savingVip, setSavingVip] = useState(false);

  // General Settings
  const [bonusSettings, setBonusSettings] = useState<BonusCommissionSettings>({
    depositBonusPercent: 5,
    winningDeductionPercent: 0,
    firstDepositBonusPercent: 10,
  });

  const [referralSettings, setReferralSettings] = useState<ReferralSystemSettings>({
    signupBonus: 50,
    referralInviteBonus: 50,
    depositCommissionPercent: 10,
  });

  // Amount-wise deposit bonus tiers
  const [tiers, setTiers] = useState<DepositAmountBonusTier[]>([]);
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newBonusAmount, setNewBonusAmount] = useState<number | ''>('');
  const [newBonusPercent, setNewBonusPercent] = useState<number | ''>('');
  const [newLabel, setNewLabel] = useState<string>('');

  // Bonus Mission Tasks
  const [tasks, setTasks] = useState<BonusTaskConfig[]>([]);
  const [savingTasks, setSavingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskReward, setNewTaskReward] = useState<number | ''>(50);
  const [newTaskBadge, setNewTaskBadge] = useState('HOT');
  const [newTaskTargetType, setNewTaskTargetType] = useState<'deposit' | 'invite' | 'turnover' | 'vip' | 'custom'>('deposit');
  const [newTaskTargetValue, setNewTaskTargetValue] = useState<number | ''>(100);
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Activity Center Promotions
  const [activities, setActivities] = useState<ActivityPromoConfig[]>([]);
  const [savingActivities, setSavingActivities] = useState(false);
  const [newActTitle, setNewActTitle] = useState('');
  const [newActRewardText, setNewActRewardText] = useState('Up to ₹100');
  const [newActRewardValue, setNewActRewardValue] = useState<number | ''>(50);
  const [newActTag, setNewActTag] = useState('SPECIAL');
  const [newActDesc, setNewActDesc] = useState('');
  const [newActRules, setNewActRules] = useState('');

  const [vipLevels, setVipLevels] = useState<any[]>([]);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingTiers, setSavingTiers] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, rRes, vRes, tRes, taskRes, actRes] = await Promise.all([
        api.getAdminBonusCommission().catch(() => ({ settings: null })),
        api.getAdminReferralSettings().catch(() => ({ settings: null })),
        api.getAdminVipLevels().catch(() => ({ vipLevels: [] })),
        api.getDepositBonusTiers().catch(() => ({ tiers: [] })),
        api.getAdminBonusTasks().catch(() => ({ tasks: [] })),
        api.getAdminActivityPromos().catch(() => ({ activities: [] })),
      ]);
      if (bRes?.settings) setBonusSettings(bRes.settings);
      if (rRes?.settings) setReferralSettings(rRes.settings);
      if (vRes?.vipLevels) setVipLevels(vRes.vipLevels);
      if (tRes?.tiers) setTiers(tRes.tiers);
      if (taskRes?.tasks) setTasks(taskRes.tasks);
      if (actRes?.activities) setActivities(actRes.activities);
    } catch (err: any) {
      console.error('Failed to load bonus settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // ===================== 1. MISSION TASKS HANDLERS =====================
  const handleSaveTasks = async () => {
    setSavingTasks(true);
    try {
      const res = await api.updateAdminBonusTasks(tasks, admin?.username);
      if (res?.success) {
        showSuccess('Mission bonus tasks and reward amounts saved successfully!');
        if (res.tasks) setTasks(res.tasks);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save bonus tasks');
    } finally {
      setSavingTasks(false);
    }
  };

  const handleUpdateTask = (id: string, field: keyof BonusTaskConfig, value: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleToggleTaskStatus = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskReward) {
      showError('Task Title and Reward amount are required');
      return;
    }

    try {
      const rewardVal = Math.min(199, Math.max(1, Number(newTaskReward)));
      const newTaskObj = {
        title: newTaskTitle.trim(),
        reward: rewardVal,
        badge: newTaskBadge.trim() || 'BONUS',
        badgeColor: 'bg-amber-500',
        desc: newTaskDesc.trim() || `Complete requirements to claim ₹${rewardVal} cash bonus.`,
        actionLabel: 'Claim Reward',
        targetType: newTaskTargetType,
        targetValue: Number(newTaskTargetValue || 1),
        isActive: true,
      };

      const res = await api.addAdminBonusTask(newTaskObj, admin?.username);
      if (res?.success) {
        setTasks(res.tasks);
        setNewTaskTitle('');
        setNewTaskReward(50);
        setNewTaskDesc('');
        setNewTaskTargetValue(100);
        showSuccess(`Bonus task "${newTaskObj.title}" added successfully (capped at max ₹199)!`);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to add bonus task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bonus task?')) return;
    try {
      const res = await api.deleteAdminBonusTask(id, admin?.username);
      if (res?.success) {
        setTasks(res.tasks);
        showSuccess('Bonus task deleted successfully');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to delete task');
    }
  };

  // ===================== 2. ACTIVITY PROMOTIONS HANDLERS =====================
  const handleSaveActivities = async () => {
    setSavingActivities(true);
    try {
      const res = await api.updateAdminActivityPromos(activities, admin?.username);
      if (res?.success) {
        showSuccess('Activity promotions & rules updated successfully!');
        if (res.activities) setActivities(res.activities);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save activity promos');
    } finally {
      setSavingActivities(false);
    }
  };

  const handleUpdateActivity = (id: string, field: keyof ActivityPromoConfig, value: any) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleToggleActivityStatus = (id: string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim()) {
      showError('Activity Title is required');
      return;
    }

    try {
      const rewVal = Math.min(199, Math.max(1, Number(newActRewardValue || 0)));
      const newActObj = {
        title: newActTitle.trim(),
        rewardText: newActRewardText.trim() || `₹${rewVal}`,
        rewardValue: rewVal,
        tag: newActTag.trim() || 'PROMO',
        tagColor: 'bg-emerald-500',
        desc: newActDesc.trim() || 'Participate and claim exclusive bonus rewards.',
        rules: newActRules.trim() || 'Standard wagering requirements apply.',
        badge: 'ACTIVE',
        targetType: 'custom' as const,
        isActive: true,
      };

      const res = await api.addAdminActivityPromo(newActObj, admin?.username);
      if (res?.success) {
        setActivities(res.activities);
        setNewActTitle('');
        setNewActRewardText('Up to ₹100');
        setNewActRewardValue(50);
        setNewActDesc('');
        setNewActRules('');
        showSuccess(`Activity promotion "${newActObj.title}" added successfully!`);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to add activity promotion');
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity promotion?')) return;
    try {
      const res = await api.deleteAdminActivityPromo(id, admin?.username);
      if (res?.success) {
        setActivities(res.activities);
        showSuccess('Activity promotion deleted successfully');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to delete activity promo');
    }
  };

  // ===================== 3. DEPOSIT TIERS HANDLERS =====================
  const handleSaveTiers = async () => {
    setSavingTiers(true);
    try {
      const res = await api.updateAdminDepositBonusTiers(tiers, admin?.username);
      if (res?.success) {
        showSuccess('Amount-wise deposit bonus tiers updated successfully! Active on User Deposit page.');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update tiers');
    } finally {
      setSavingTiers(false);
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || Number(newAmount) <= 0) {
      showError('Please enter a valid deposit amount (e.g. 500, 1000)');
      return;
    }

    try {
      const newTierObj: Partial<DepositAmountBonusTier> = {
        amount: Number(newAmount),
        bonusAmount: Number(newBonusAmount || 0),
        bonusPercent: Number(newBonusPercent || 0),
        label: newLabel.trim() || (Number(newBonusAmount || 0) > 0 ? `+₹${newBonusAmount} Extra` : 'Standard'),
        isActive: true,
      };

      const res = await api.addAdminDepositBonusTier(newTierObj, admin?.username);
      if (res?.success) {
        setTiers(res.tiers);
        setNewAmount('');
        setNewBonusAmount('');
        setNewBonusPercent('');
        setNewLabel('');
        showSuccess(`Deposit tier for ₹${newTierObj.amount} added successfully!`);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to add tier');
    }
  };

  const handleDeleteTier = async (id: string) => {
    try {
      const res = await api.deleteAdminDepositBonusTier(id, admin?.username);
      if (res?.success) {
        setTiers(res.tiers);
        showSuccess('Tier deleted successfully');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to delete tier');
    }
  };

  const handleToggleTierStatus = (id: string) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  };

  const handleUpdateTierField = (id: string, field: keyof DepositAmountBonusTier, value: any) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // ===================== VIP TIERS HANDLERS =====================
  const handleSaveVipLevels = async () => {
    setSavingVip(true);
    try {
      const res = await api.updateAdminVipLevels(vipLevels, admin?.username);
      if (res?.success) {
        showSuccess('VIP level rewards & turnover task requirements saved successfully!');
        if (res.vipLevels) setVipLevels(res.vipLevels);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save VIP levels');
    } finally {
      setSavingVip(false);
    }
  };

  const handleUpdateVipField = (level: number, field: string, value: any) => {
    setVipLevels(prev => prev.map(v => v.level === level ? { ...v, [field]: value } : v));
  };

  // ===================== 4. GENERAL RULES HANDLERS =====================
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      const [bRes, rRes] = await Promise.all([
        api.updateAdminBonusCommission(bonusSettings, admin?.username),
        api.updateAdminReferralSettings(referralSettings, admin?.username),
      ]);
      if (bRes?.success && rRes?.success) {
        showSuccess('General Bonus, Tax & Referral rules saved successfully!');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save settings');
    } finally {
      setSavingGeneral(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                All Bonus & Rewards Master Control
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  Live Sync
                </span>
              </h1>
              <p className="text-xs text-zinc-300 mt-0.5">
                Manage ₹500 Mission Tasks, Activity Center Promotions, Deposit Amount-Wise Bonuses, and Referral Rewards
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            className="px-3.5 py-2 rounded-xl bg-[#1c1c22] border border-[#33333d] text-xs font-semibold text-zinc-200 hover:border-amber-500/40 hover:text-white flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            {errorMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 border-t border-[#26262e] pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'tasks'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#1a1a22] text-zinc-300 hover:text-white border border-[#2b2b36]'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>₹500 / Mission Bonus Tasks ({tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'activities'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#1a1a22] text-zinc-300 hover:text-white border border-[#2b2b36]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Activity Center & Promos ({activities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deposit_tiers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'deposit_tiers'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#1a1a22] text-zinc-300 hover:text-white border border-[#2b2b36]'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Amount-Wise Deposit Tiers ({tiers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vip_tiers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'vip_tiers'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#1a1a22] text-zinc-300 hover:text-white border border-[#2b2b36]'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>VIP Levels & Tasks ({vipLevels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'general'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#1a1a22] text-zinc-300 hover:text-white border border-[#2b2b36]'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>General Rules & Referral Economics</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: MISSION BONUS TASKS (₹500 View) ===================== */}
      {activeTab === 'tasks' && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                Mission Bonus Tasks Control (टास्क बोनस सेटिंग्स)
              </h2>
              <p className="text-xs text-zinc-300 mt-1">
                Customize the reward amounts, requirements (Recharge ₹500, Invite 2 Friends, ₹5000 Turnover, VIP), titles and descriptions for each mission shown in the "Get ₹500 Bonus" user view.
              </p>
            </div>
            <button
              onClick={handleSaveTasks}
              disabled={savingTasks}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              {savingTasks ? 'Saving Tasks...' : 'Save All Mission Tasks'}
            </button>
          </div>

          {/* Tasks Grid / Table */}
          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                className="bg-[#181822] border border-[#2b2b38] hover:border-amber-500/40 rounded-2xl p-4.5 space-y-4 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/20">
                      {idx + 1}
                    </span>
                    <div>
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                        className="bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 w-full max-w-sm"
                        placeholder="Task Title"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleTaskStatus(task.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                        task.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {task.isActive ? 'Active on App' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
                      title="Delete Mission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Cash Reward Amount (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-zinc-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        value={task.reward}
                        onChange={(e) => handleUpdateTask(task.id, 'reward', Number(e.target.value))}
                        className="w-full bg-[#121217] border border-[#33333d] rounded-lg pl-7 pr-3 py-1.5 text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Requirement Type
                    </label>
                    <select
                      value={task.targetType}
                      onChange={(e) => handleUpdateTask(task.id, 'targetType', e.target.value)}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="deposit">Deposit Amount (₹)</option>
                      <option value="invite">Invite Friends Count</option>
                      <option value="turnover">Bet Turnover (₹)</option>
                      <option value="vip">VIP Level Rank</option>
                      <option value="custom">Custom Requirement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Target Goal Value
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={task.targetValue}
                      onChange={(e) => handleUpdateTask(task.id, 'targetValue', Number(e.target.value))}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={task.badge}
                      onChange={(e) => handleUpdateTask(task.id, 'badge', e.target.value)}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      placeholder="e.g. POPULAR, HOT"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Task Description / User Instruction
                  </label>
                  <input
                    type="text"
                    value={task.desc}
                    onChange={(e) => handleUpdateTask(task.id, 'desc', e.target.value)}
                    className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-amber-400"
                    placeholder="Short description displayed to player"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add New Task Form */}
          <div className="bg-[#181820] border border-[#2b2b36] rounded-xl p-4.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-400" />
              Add New Mission Bonus Task (नया मिशन बोनस जोड़ें)
            </h3>
            <form onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Club Bonus"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Reward Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  min="1"
                  value={newTaskReward}
                  onChange={(e) => setNewTaskReward(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Requirement Type
                </label>
                <select
                  value={newTaskTargetType}
                  onChange={(e) => setNewTaskTargetType(e.target.value as any)}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="deposit">Deposit Amount (₹)</option>
                  <option value="invite">Invite Friends Count</option>
                  <option value="turnover">Bet Turnover (₹)</option>
                  <option value="vip">VIP Level Rank</option>
                  <option value="custom">Custom Goal</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Target Value
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  min="1"
                  value={newTaskTargetValue}
                  onChange={(e) => setNewTaskTargetValue(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Description / Instruction
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complete VIP 2 and claim your special reward"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Mission Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: ACTIVITY CENTER PROMOTIONS ===================== */}
      {activeTab === 'activities' && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                Activity Center & Promotional Events (एक्टिविटी सेंटर सेटिंग्स)
              </h2>
              <p className="text-xs text-zinc-300 mt-1">
                Configure 7-Day Check-in bonus amounts, First Deposit Match bonuses, Winning Streak Jackpot rewards, and Daily Cashback rebates.
              </p>
            </div>
            <button
              onClick={handleSaveActivities}
              disabled={savingActivities}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              {savingActivities ? 'Saving Events...' : 'Save All Activities'}
            </button>
          </div>

          {/* Activities List */}
          <div className="space-y-4">
            {activities.map((act, idx) => (
              <div
                key={act.id}
                className="bg-[#181822] border border-[#2b2b38] hover:border-amber-500/40 rounded-2xl p-4.5 space-y-4 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-400 font-black text-xs flex items-center justify-center border border-orange-500/20">
                      {idx + 1}
                    </span>
                    <div>
                      <input
                        type="text"
                        value={act.title}
                        onChange={(e) => handleUpdateActivity(act.id, 'title', e.target.value)}
                        className="bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 w-full max-w-sm"
                        placeholder="Event Title"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActivityStatus(act.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                        act.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {act.isActive ? 'Active on App' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(act.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Display Reward Text (e.g. "Up to ₹777", "100% Match")
                    </label>
                    <input
                      type="text"
                      value={act.rewardText}
                      onChange={(e) => handleUpdateActivity(act.id, 'rewardText', e.target.value)}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-amber-400 font-bold text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Base Numerical Cash Value (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={act.rewardValue || 0}
                      onChange={(e) => handleUpdateActivity(act.id, 'rewardValue', Number(e.target.value))}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Tag Text (e.g. DAILY EVENT, JACKPOT)
                    </label>
                    <input
                      type="text"
                      value={act.tag}
                      onChange={(e) => handleUpdateActivity(act.id, 'tag', e.target.value)}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Description Text
                    </label>
                    <input
                      type="text"
                      value={act.desc}
                      onChange={(e) => handleUpdateActivity(act.id, 'desc', e.target.value)}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Wagering / Eligibility Rule
                    </label>
                    <input
                      type="text"
                      value={act.rules}
                      onChange={(e) => handleUpdateActivity(act.id, 'rules', e.target.value)}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Activity Form */}
          <div className="bg-[#181820] border border-[#2b2b36] rounded-xl p-4.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-orange-400" />
              Add New Promotional Activity (नया प्रमोशनल इवेंट जोड़ें)
            </h3>
            <form onSubmit={handleAddActivity} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekend Mega Tournament"
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Reward Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Win ₹10,000"
                  value={newActRewardText}
                  onChange={(e) => setNewActRewardText(e.target.value)}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Tag Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. WEEKEND SPECIAL"
                  value={newActTag}
                  onChange={(e) => setNewActTag(e.target.value)}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Top 10 players win extra cash prizes every Sunday"
                  value={newActDesc}
                  onChange={(e) => setNewActDesc(e.target.value)}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Activity Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: AMOUNT-WISE DEPOSIT BONUS TIERS ===================== */}
      {activeTab === 'deposit_tiers' && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                Amount-Wise Deposit Bonus Tiers (राशि अनुसार डिपॉजिट बोनस)
              </h2>
              <p className="text-xs text-zinc-300 mt-1">
                Admin can set exact bonus cash (₹) and percentage (%) for every deposit amount. These bonuses show on the User Deposit screen chips.
              </p>
            </div>
            <button
              onClick={handleSaveTiers}
              disabled={savingTiers}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              {savingTiers ? 'Saving Changes...' : 'Save All Tiers'}
            </button>
          </div>

          {/* Tiers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-200">
              <thead className="bg-[#18181f] text-zinc-300 uppercase tracking-wider font-semibold text-[11px] border border-[#26262e] rounded-t-xl">
                <tr>
                  <th className="p-3.5">Deposit Amount (₹)</th>
                  <th className="p-3.5">Extra Bonus Cash (₹)</th>
                  <th className="p-3.5">Bonus Rate (%)</th>
                  <th className="p-3.5">Display Badge Label</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24242c] border border-t-0 border-[#26262e]">
                {tiers.map((tier) => (
                  <tr key={tier.id} className="hover:bg-[#181820]/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white text-sm">
                      ₹{tier.amount.toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <div className="relative max-w-[130px]">
                        <span className="absolute left-3 top-2 text-zinc-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={tier.bonusAmount}
                          onChange={(e) => handleUpdateTierField(tier.id, 'bonusAmount', Number(e.target.value))}
                          className="w-full bg-[#1b1b22] border border-[#33333d] rounded-lg pl-7 pr-2 py-1.5 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="relative max-w-[110px]">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={tier.bonusPercent}
                          onChange={(e) => handleUpdateTierField(tier.id, 'bonusPercent', Number(e.target.value))}
                          className="w-full bg-[#1b1b22] border border-[#33333d] rounded-lg px-3 py-1.5 text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:border-emerald-400"
                        />
                        <span className="absolute right-2.5 top-2 text-zinc-400 font-bold">%</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={tier.label || ''}
                        placeholder="+₹ Extra Bonus"
                        onChange={(e) => handleUpdateTierField(tier.id, 'label', e.target.value)}
                        className="w-full max-w-[180px] bg-[#1b1b22] border border-[#33333d] rounded-lg px-3 py-1.5 text-white font-medium text-xs focus:outline-none focus:border-amber-400"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleToggleTierStatus(tier.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                          tier.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {tier.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteTier(tier.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                        title="Delete Tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {tiers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-zinc-400">
                      No custom tiers set yet. Add your first deposit amount tier below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add New Amount Tier Form */}
          <div className="bg-[#181820] border border-[#2b2b36] rounded-xl p-4.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-400" />
              Add New Deposit Amount Bonus Rule (नया अमाउंट बोनस जोड़ें)
            </h3>
            <form onSubmit={handleAddTier} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Deposit Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  min="10"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Bonus Cash (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 175"
                  min="0"
                  value={newBonusAmount}
                  onChange={(e) => setNewBonusAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Bonus Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 3.5"
                  min="0"
                  value={newBonusPercent}
                  onChange={(e) => setNewBonusPercent(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-emerald-300 font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Badge Tag Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. +₹175 Extra"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== TAB: VIP TIERS & TURNOVER REQUIREMENTS ===================== */}
      {activeTab === 'vip_tiers' && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                VIP Level Rewards & Turnover Task Requirements (VIP सेटिंग्स)
              </h2>
              <p className="text-xs text-zinc-300 mt-1">
                Set required betting turnover and level-up cash rewards for each VIP tier. Users must complete the full turnover task before they can claim the level-up reward.
              </p>
            </div>
            <button
              onClick={handleSaveVipLevels}
              disabled={savingVip}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              {savingVip ? 'Saving VIP...' : 'Save All VIP Settings'}
            </button>
          </div>

          <div className="space-y-3">
            {vipLevels.map((lvl) => (
              <div
                key={lvl.level}
                className="bg-[#17171e] border border-[#2b2b36] hover:border-amber-500/30 rounded-2xl p-4 transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Badge */}
                  <div className="md:col-span-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
                      V{lvl.level}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-400">Tier {lvl.level}</span>
                      <input
                        type="text"
                        value={lvl.name}
                        onChange={(e) => handleUpdateVipField(lvl.level, 'name', e.target.value)}
                        className="w-full bg-[#101014] border border-[#33333d] rounded-lg px-2 py-1 text-xs text-white font-bold focus:outline-none focus:border-amber-400 mt-0.5"
                      />
                    </div>
                  </div>

                  {/* Required Turnover */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                      <span>Required Betting Turnover (₹)</span>
                      <span className="text-[10px] text-amber-400 font-normal">(Task req to unlock)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={lvl.requiredTurnover}
                      onChange={(e) => handleUpdateVipField(lvl.level, 'requiredTurnover', Number(e.target.value))}
                      className="w-full bg-[#101014] border border-[#33333d] rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Upgrade Cash Reward */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                      <span>Level-Up Reward (₹)</span>
                      <span className="text-[10px] text-emerald-400 font-normal">(Claim amount)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={lvl.upgradeReward}
                      onChange={(e) => handleUpdateVipField(lvl.level, 'upgradeReward', Number(e.target.value))}
                      className="w-full bg-[#101014] border border-[#33333d] rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Monthly Bonus */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-zinc-300">
                      Monthly Salary (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={lvl.monthlySalary || 0}
                      onChange={(e) => handleUpdateVipField(lvl.level, 'monthlySalary', Number(e.target.value))}
                      className="w-full bg-[#101014] border border-[#33333d] rounded-xl px-3 py-2 text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveVipLevels}
              disabled={savingVip}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingVip ? 'Saving VIP...' : 'Save All VIP Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: GENERAL RULES & REFERRALS ===================== */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#26262e] pb-3">
              <Percent className="w-5 h-5 text-amber-400" />
              General Deposit Bonus Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">
                  Fallback Every Deposit Bonus (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={bonusSettings.depositBonusPercent}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, depositBonusPercent: Number(e.target.value) })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-4 py-2.5 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400 font-mono"
                    required
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-zinc-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Applied on custom deposits that don't match any specific amount tier above.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">
                  First Deposit Welcome Bonus (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={bonusSettings.firstDepositBonusPercent}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, firstDepositBonusPercent: Number(e.target.value) })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-4 py-2.5 text-sm text-emerald-300 font-bold focus:outline-none focus:border-amber-400 font-mono"
                    required
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-zinc-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Special welcome bonus granted on player's 1st successful deposit.
                </p>
              </div>
            </div>
          </div>

          {/* Referral & Invite Rewards */}
          <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#26262e] pb-3">
              <Users className="w-5 h-5 text-cyan-400" />
              Referral & Affiliate Invite Program Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">
                  New User Sign-up Free Gift (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={referralSettings.signupBonus}
                  onChange={(e) => setReferralSettings({ ...referralSettings, signupBonus: Number(e.target.value) })}
                  className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 font-bold"
                />
                <p className="text-[11px] text-zinc-400">
                  Free initial welcome balance given automatically on new registration.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">
                  Referrer Reward per Invite (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={referralSettings.referralInviteBonus}
                  onChange={(e) => setReferralSettings({ ...referralSettings, referralInviteBonus: Number(e.target.value) })}
                  className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 font-bold"
                />
                <p className="text-[11px] text-zinc-400">
                  Bonus given to inviter when downline friend completes signup.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">
                  Downline Deposit Commission (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={referralSettings.depositCommissionPercent}
                  onChange={(e) => setReferralSettings({ ...referralSettings, depositCommissionPercent: Number(e.target.value) })}
                  className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 font-bold"
                />
                <p className="text-[11px] text-zinc-400">
                  Lifetime commission earned by inviter whenever referred user deposits money.
                </p>
              </div>
            </div>
          </div>

          {/* VIP Levels Overview */}
          <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262e] pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                VIP Level Hierarchy & Turnover Requirements
              </h2>
              <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                10 VIP Tiers
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {vipLevels.map((lvl) => (
                <div key={lvl.level} className="bg-[#181820] border border-[#2a2a32] rounded-xl p-3 text-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs flex items-center justify-center mx-auto mb-2">
                    V{lvl.level}
                  </div>
                  <h3 className="font-bold text-xs text-white">{lvl.name}</h3>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1">
                    Req: ₹{lvl.requiredTurnover.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                    Reward: ₹{lvl.upgradeReward}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingGeneral}
              className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingGeneral ? 'Saving Rules...' : 'Save General Rules'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
