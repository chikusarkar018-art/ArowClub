import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { BonusTaskConfig } from '../../types.js';
import {
  ChevronLeft, Gift, Sparkles, CheckCircle2, ArrowRight,
  Flame, Zap, Trophy, DollarSign, Crown, Users, Wallet,
  ShieldCheck, Clock, RefreshCw, Bell, AlertTriangle, X
} from 'lucide-react';

interface UserGet500BonusViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
  onNavigatePromotion: () => void;
  onNavigateVip: () => void;
}

const DEFAULT_TASKS: BonusTaskConfig[] = [
  {
    id: 'task-first-deposit',
    title: 'First Recharge ₹100+ Bonus',
    reward: 50,
    badge: 'POPULAR',
    badgeColor: 'bg-red-500',
    desc: 'Recharge ₹100 or more in your account and claim an instant ₹50 extra bonus.',
    actionLabel: 'Recharge & Claim',
    targetType: 'deposit',
    targetValue: 100,
    isActive: true,
  },
  {
    id: 'task-invite-friends',
    title: 'Invite 1 Friend Bonus',
    reward: 50,
    badge: 'UNLIMITED',
    badgeColor: 'bg-purple-500',
    desc: 'Share your referral code. When 1 friend registers and joins, claim your ₹50 reward.',
    actionLabel: 'Invite & Claim',
    targetType: 'invite',
    targetValue: 1,
    isActive: true,
  },
  {
    id: 'task-bet-challenge',
    title: '₹500 Game Turnover Challenge',
    reward: 30,
    badge: 'DAILY BONUS',
    badgeColor: 'bg-amber-500',
    desc: 'Place bets totaling ₹500 or more in WinGo, 7 Up Down, Aviator or Mines.',
    actionLabel: 'Play & Claim',
    targetType: 'turnover',
    targetValue: 500,
    isActive: true,
  },
  {
    id: 'task-vip-bonus',
    title: 'VIP 1 Loyalty Gift',
    reward: 70,
    badge: 'VIP REWARD',
    badgeColor: 'bg-blue-500',
    desc: 'Unlock VIP 1 status and claim your special ₹70 loyalty package.',
    actionLabel: 'VIP Claim',
    targetType: 'vip',
    targetValue: 1,
    isActive: true,
  },
  {
    id: 'task-rounds-challenge',
    title: '10 Rounds Master Challenge',
    reward: 40,
    badge: 'GAME TASK',
    badgeColor: 'bg-emerald-500',
    desc: 'Play 10 rounds across WinGo, Roulette, Mines or 7 Up Down to claim ₹40 bonus.',
    actionLabel: 'Play & Claim',
    targetType: 'rounds',
    targetValue: 10,
    isActive: true,
  },
];

export const UserGet500BonusView: React.FC<UserGet500BonusViewProps> = ({
  onBack,
  onNavigateDeposit,
  onNavigatePromotion,
  onNavigateVip,
}) => {
  const { user, showToast, refreshUser } = useAuth();
  const [tasks, setTasks] = useState<BonusTaskConfig[]>(DEFAULT_TASKS);
  const [loading, setLoading] = useState(false);
  const [claimedTasks, setClaimedTasks] = useState<string[]>(
    (user as any)?.claimedGet500Tasks || []
  );
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [topNotification, setTopNotification] = useState<{
    show: boolean;
    type: 'alert' | 'info' | 'success';
    title: string;
    message: string;
    targetType?: string;
    targetValue?: number;
    currentValue?: number;
  } | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.getBonusTasks();
      if (res && Array.isArray(res.tasks) && res.tasks.length > 0) {
        // Enforce rewards under 200
        const safeTasks = res.tasks
          .filter((t: BonusTaskConfig) => t.isActive !== false)
          .map((t: BonusTaskConfig) => ({
            ...t,
            reward: Math.min(199, Number(t.reward || 50)),
          }));
        setTasks(safeTasks);
      }
    } catch (e) {
      console.warn('Using default bonus tasks', e);
    } finally {
      setLoading(false);
    }
  };

  const getTaskIcon = (targetType: string) => {
    switch (targetType) {
      case 'deposit':
      case 'first_deposit':
        return Wallet;
      case 'invite':
        return Users;
      case 'turnover':
      case 'bet':
        return Trophy;
      case 'vip':
        return Crown;
      default:
        return Gift;
    }
  };

  const getTaskEvaluation = (task: any) => {
    const isClaimed = claimedTasks.includes(task.id) || (user as any)?.claimedGet500Tasks?.includes(task.id);
    const target = Number(task.target || task.targetValue || 1);
    let current = 0;

    if (task.current !== undefined && task.target !== undefined) {
      current = Number(task.current || 0);
    } else {
      if (task.targetType === 'deposit' || task.targetType === 'first_deposit') {
        current = Number(user?.totalDeposit || 0);
      } else if (task.targetType === 'turnover' || task.targetType === 'bet') {
        current = Number(user?.totalBet || 0);
      } else if (task.targetType === 'vip') {
        current = Number(user?.vipLevel || 0);
      } else {
        current = 0;
      }
    }

    const isCompleted = current >= target;
    const percent = Math.min(100, Math.round((current / (target || 1)) * 100));
    return { current, target, percent, isCompleted, isClaimed };
  };

  // Find first active incomplete task for top persistent notification banner
  const activePendingTask = tasks.find((t) => {
    const ev = getTaskEvaluation(t);
    return !ev.isClaimed && !ev.isCompleted;
  }) || tasks[0];

  const pendingEval = activePendingTask ? getTaskEvaluation(activePendingTask) : null;

  const totalClaimable = tasks.reduce((sum, t) => sum + Math.min(199, Number(t.reward) || 0), 0);

  const handleClaim = async (task: any) => {
    const evalData = getTaskEvaluation(task);
    if (evalData.isClaimed) {
      setTopNotification({
        show: true,
        type: 'info',
        title: 'Already Claimed',
        message: `You have already claimed the ₹${task.reward} bonus for "${task.title}".`,
      });
      return;
    }

    // STRICT VALIDATION: Do not allow claim if not 100% completed
    if (!evalData.isCompleted) {
      const isCurr = task.targetType === 'deposit' || task.targetType === 'turnover';
      const unit = isCurr ? '₹' : '';
      setTopNotification({
        show: true,
        type: 'alert',
        title: `Task Incomplete: "${task.title}"`,
        message: `Bonus claim blocked! You must complete this task first. Required: ${unit}${evalData.target} (Current: ${unit}${evalData.current}).`,
        targetType: task.targetType,
        targetValue: evalData.target,
        currentValue: evalData.current,
      });
      showToast(`⚠️ Task incomplete! Complete "${task.title}" first to claim bonus.`, 'error');
      return;
    }

    try {
      setClaimingId(task.id);
      const res = await api.claimGet500Bonus(task.id, Math.min(199, task.reward));
      if (res?.success) {
        setTopNotification({
          show: true,
          type: 'success',
          title: 'Bonus Claimed Successfully!',
          message: `🎉 ₹${Math.min(199, task.reward)} bonus has been added to your wallet balance.`,
        });
        showToast(res.message || `₹${task.reward} Bonus credited to wallet!`, 'success');
        setClaimedTasks((prev) => [...prev, task.id]);
        refreshUser();
        fetchTasks();
      }
    } catch (err: any) {
      setTopNotification({
        show: true,
        type: 'alert',
        title: 'Claim Failed',
        message: err.message || 'Task requirement is not completed yet.',
      });
      showToast(err.message || 'Failed to claim bonus', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  const handleTaskAction = (task: any, evalData: { isCompleted: boolean; isClaimed: boolean; current?: number; target?: number; percent?: number }) => {
    if (evalData.isClaimed) return;

    if (evalData.isCompleted) {
      handleClaim(task);
      return;
    }

    const isCurr = task.targetType === 'deposit' || task.targetType === 'turnover';
    const unit = isCurr ? '₹' : '';
    setTopNotification({
      show: true,
      type: 'info',
      title: `Task Requirement: ${task.title}`,
      message: `Complete ${unit}${evalData.target} requirement to unlock ₹${task.reward} bonus (Current: ${unit}${evalData.current}).`,
      targetType: task.targetType,
      targetValue: evalData.target,
      currentValue: evalData.current,
    });

    // Direct user to complete the task requirement
    if (task.targetType === 'deposit' || task.targetType === 'first_deposit') {
      onNavigateDeposit();
    } else if (task.targetType === 'invite') {
      if (user?.referralCode || user?.uid) {
        const numericCode = String(user?.referralCode || user?.uid || '100001').replace(/\D/g, '');
        const link = `${window.location.origin}/?ref=${numericCode}`;
        navigator.clipboard?.writeText(link);
        showToast('Invite link copied! Share with friends to complete this mission.', 'success');
      } else {
        onNavigatePromotion();
      }
    } else if (task.targetType === 'vip') {
      onNavigateVip();
    } else {
      // Play games
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-[#07080e] text-white flex flex-col font-sans pb-28 select-none">
      
      {/* Top Header */}
      <header className="px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 bg-[#0c0e17] border-b border-[#222738] shadow-md">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="font-extrabold text-base text-[#f5c443] flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-[#f5c443]" />
          <span>Task Bonus Center</span>
        </h1>

        <button
          onClick={fetchTasks}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-[#f5c443] active:scale-95 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* TOP NOTIFICATION POPUP / ALERT BAR (Displays task notification at the top) */}
      {topNotification && topNotification.show && (
        <div className="sticky top-14 z-30 px-3.5 pt-2 animate-in slide-in-from-top duration-300">
          <div
            className={`p-3.5 rounded-2xl border shadow-xl flex items-start justify-between gap-3 ${
              topNotification.type === 'alert'
                ? 'bg-[#291215] border-rose-500/70 text-rose-200'
                : topNotification.type === 'success'
                ? 'bg-[#0e2a1b] border-emerald-500/70 text-emerald-200'
                : 'bg-[#261d09] border-[#f5c443]/70 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  topNotification.type === 'alert'
                    ? 'bg-rose-500 text-white'
                    : topNotification.type === 'success'
                    ? 'bg-emerald-500 text-black'
                    : 'bg-[#f5c443] text-black'
                }`}
              >
                {topNotification.type === 'alert' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : topNotification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-wide">{topNotification.title}</div>
                <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{topNotification.message}</div>
              </div>
            </div>

            <button
              onClick={() => setTopNotification(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-3.5 pt-3 max-w-md mx-auto w-full space-y-3.5">
        
        {/* PERMANENT TOP TASK STATUS NOTIFICATION CARD */}
        {activePendingTask && pendingEval && !pendingEval.isClaimed && (
          <div className="bg-gradient-to-r from-[#1c1809] via-[#161928] to-[#121522] border border-[#f5c443]/50 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#f5c443]/20 border border-[#f5c443]/40 flex items-center justify-center text-[#f5c443] shrink-0">
                  <Bell className="w-3.5 h-3.5 animate-bounce" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-[#f5c443]">
                    Active Task Requirement
                  </div>
                  <div className="text-xs font-extrabold text-white line-clamp-1">
                    {activePendingTask.title}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-black text-[#f5c443] bg-[#f5c443]/10 px-2 py-0.5 rounded-full border border-[#f5c443]/30">
                  Bonus: ₹{activePendingTask.reward}
                </span>
              </div>
            </div>

            {/* Progress bar inside top alert */}
            <div className="mt-2.5 space-y-1">
              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-[#f5c443] rounded-full transition-all duration-300"
                  style={{ width: `${pendingEval.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>
                  Progress: {activePendingTask.targetType === 'deposit' ? '₹' : ''}
                  {pendingEval.current} / {activePendingTask.targetType === 'deposit' ? '₹' : ''}
                  {pendingEval.target}
                </span>
                <span className={pendingEval.isCompleted ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {pendingEval.isCompleted ? 'Ready to Claim' : `${pendingEval.percent}% Completed`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Hero Mega Bonus Card */}
        <div className="relative bg-gradient-to-br from-[#2b1f06] via-[#1a1408] to-[#0d0f17] border-2 border-[#f5c443] rounded-3xl p-4 shadow-[0_10px_30px_rgba(245,196,67,0.25)] overflow-hidden text-center">
          
          <div className="absolute top-0 right-0 bg-[#f5c443] text-black font-black text-[9px] px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider">
            TASK REWARDS
          </div>

          <div className="w-12 h-12 mx-auto mb-1.5 rounded-2xl bg-gradient-to-tr from-[#d99b26] to-[#f5c443] flex items-center justify-center text-black shadow-lg">
            <Gift className="w-6 h-6 stroke-[2.5]" />
          </div>

          <h2 className="text-xl font-black text-white tracking-wide">
            CLAIM <span className="text-[#f5c443]">₹{totalClaimable.toLocaleString()}</span> TASK BONUSES
          </h2>

          <p className="text-[11px] text-zinc-300 mt-0.5 max-w-xs mx-auto">
            Task complete karein aur direct wallet cash bonus claim karein. Sabhi bonus ₹200 ke andar hain.
          </p>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-around text-center">
            <div>
              <div className="text-[9px] text-zinc-400">Total Rewards</div>
              <div className="text-base font-black text-[#f5c443] font-mono">₹{totalClaimable.toLocaleString()}</div>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <div className="text-[9px] text-zinc-400">Max Bonus/Task</div>
              <div className="text-base font-black text-emerald-400 font-mono">&lt; ₹200</div>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <div className="text-[9px] text-zinc-400">Instant Credit</div>
              <div className="text-base font-black text-cyan-400 font-mono">Direct Wallet</div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          <div className="text-xs font-black text-white flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Active Task Missions</span>
            </span>
            <span className="text-[#f5c443] font-mono text-[11px]">
              {claimedTasks.length}/{tasks.length} Claimed
            </span>
          </div>

          {tasks.map((task) => {
            const evalData = getTaskEvaluation(task);
            const { isClaimed, isCompleted, current, target, percent } = evalData;
            const isClaiming = claimingId === task.id;
            const Icon = getTaskIcon(task.targetType);

            // Unit label formatting
            const tType = String(task.targetType || '');
            const isCurrency = tType === 'deposit' || tType === 'first_deposit' || tType === 'turnover' || tType === 'bet';
            const unit = isCurrency ? '₹' : '';
            const suffix = tType === 'invite' ? ' Friend(s)' : tType === 'rounds' ? ' Round(s)' : tType === 'vip' ? ' VIP Level' : '';

            return (
              <div
                key={task.id}
                className={`bg-[#0f121d] border ${
                  isCompleted && !isClaimed
                    ? 'border-[#f5c443] shadow-[0_0_15px_rgba(245,196,67,0.2)]'
                    : 'border-[#23293e]'
                } rounded-2xl p-3.5 space-y-2.5 transition`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-2xl ${
                        isCompleted && !isClaimed
                          ? 'bg-[#f5c443]/20 border-[#f5c443]/50 text-[#f5c443]'
                          : 'bg-[#191e30] border-white/10 text-zinc-400'
                      } border flex items-center justify-center shrink-0 shadow-md`}
                    >
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-xs sm:text-sm text-white">{task.title}</h3>
                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded text-white ${task.badgeColor || 'bg-amber-500'}`}>
                          {task.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{task.desc}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className="text-[10px] font-bold text-zinc-400">Bonus</div>
                    <div className="text-sm font-black text-[#f5c443]">₹{task.reward}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-[#171a29] rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-[#f5c443]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>
                      Progress: {unit}{current} / {unit}{target}{suffix}
                    </span>
                    <span className={isCompleted ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {isCompleted ? 'Completed (100%)' : `${percent}%`}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-0.5">
                  {isClaimed ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-[#1a2130] text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Task Completed & Claimed</span>
                    </button>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaim(task)}
                      disabled={isClaiming}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#d99b26] to-[#f5c443] hover:brightness-110 active:scale-98 text-black font-black text-xs uppercase tracking-wide shadow-[0_0_12px_rgba(245,196,67,0.3)] transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      <Gift className="w-4 h-4" />
                      <span>{isClaiming ? 'Processing...' : `Claim ₹${task.reward} Bonus`}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTaskAction(task, evalData)}
                      className="w-full py-2.5 rounded-xl bg-[#161a29] hover:bg-[#1e2338] border border-amber-500/30 text-amber-300 hover:text-[#f5c443] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                    >
                      <span>
                        {tType === 'deposit' || tType === 'first_deposit'
                          ? `Complete Recharge (${unit}${current}/${unit}${target})`
                          : tType === 'invite'
                          ? `Invite Friends (${current}/${target})`
                          : tType === 'vip'
                          ? `Reach VIP ${target} (Current: VIP ${current})`
                          : `Play Games (${unit}${current}/${unit}${target})`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rules Footer */}
        <div className="bg-[#0f121d] border border-[#23293e] rounded-2xl p-3.5 text-xs text-zinc-400 space-y-1.5">
          <div className="font-bold text-[#f5c443] flex items-center gap-1.5 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Task Bonus Security Rules</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            • Sabhi bonuses task requirement 100% complete hone par hi claim honge.
            <br />
            • Koi bhi bonus reward ₹200 se upar nahi hai.
            <br />
            • Incomplete task par claim karne par upar exact task requirement notification aayega.
          </p>
        </div>

      </div>
    </div>
  );
};
