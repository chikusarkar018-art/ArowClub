import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { ActivityPromoConfig } from '../../types.js';
import {
  ChevronLeft, Gift, Flame, Sparkles, Trophy, CheckCircle2,
  ChevronRight, Calendar, Zap, ShieldCheck, ArrowRight, RefreshCw,
  Bell, AlertTriangle, X, Wallet
} from 'lucide-react';

interface UserPromotionViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
  onNavigateGet500?: () => void;
  onNavigateAgency?: () => void;
}

const DEFAULT_ACTIVITIES: ActivityPromoConfig[] = [
  {
    id: 'act-daily-checkin',
    title: '7-Day Daily Check-In Bonus',
    rewardText: 'Up to ₹100 Daily',
    rewardValue: 100,
    tag: 'DAILY EVENT',
    tagColor: 'bg-emerald-500',
    desc: 'Log in daily and collect instant cash rewards directly into your gaming balance.',
    rules: 'Check in consecutive 7 days to collect progressive cash bonuses (₹5 to ₹100).',
    badge: 'HOT',
    targetType: 'checkin',
    isActive: true,
  },
  {
    id: 'act-first-deposit',
    title: 'First Deposit Match Bonus',
    rewardText: '+₹50 Extra Bonus',
    rewardValue: 50,
    tag: 'NEW PLAYERS',
    tagColor: 'bg-[#f5c443] text-black',
    desc: 'Deposit ₹100 or more on your first recharge and receive ₹50 extra bonus cash instantly.',
    rules: '1X turnover requirement on Win Go, 7 Up Down and Aviator.',
    badge: 'BEST OFFER',
    targetType: 'first_deposit',
    isActive: true,
  },
];

export const UserPromotionView: React.FC<UserPromotionViewProps> = ({
  onBack,
  onNavigateDeposit,
  onNavigateGet500,
  onNavigateAgency,
}) => {
  const { user, showToast, refreshUser } = useAuth();
  const [activities, setActivities] = useState<ActivityPromoConfig[]>(DEFAULT_ACTIVITIES);
  const [loading, setLoading] = useState(false);
  const [claimedPromos, setClaimedPromos] = useState<string[]>(
    (user as any)?.claimedActivities || []
  );
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [topNotification, setTopNotification] = useState<{
    show: boolean;
    type: 'alert' | 'info' | 'success';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.getActivityPromos();
      if (res && Array.isArray(res.activities) && res.activities.length > 0) {
        // Enforce rewards under 200 and filter removed promos
        const safeActivities = res.activities
          .filter((a: ActivityPromoConfig) => a.isActive !== false && a.id !== 'act-streak-jackpot' && a.id !== 'act-daily-cashback')
          .map((a: ActivityPromoConfig) => ({
            ...a,
            rewardValue: a.rewardValue ? Math.min(199, Number(a.rewardValue)) : a.rewardValue,
          }));
        setActivities(safeActivities);
      }
    } catch (e) {
      console.warn('Using default activities', e);
    } finally {
      setLoading(false);
    }
  };

  const evaluateActivityProgress = (act: ActivityPromoConfig) => {
    if (act.id === 'act-first-deposit') {
      const dep = Number(user?.totalDeposit || 0);
      const isCompleted = dep >= 100;
      const isClaimed = claimedPromos.includes(act.id);
      return { isCompleted, isClaimed, current: dep, target: 100, unit: '₹' };
    }
    if (act.id === 'act-daily-checkin') {
      const todayStr = new Date().toISOString().split('T')[0];
      const isClaimed = (user as any)?.lastCheckinDate === todayStr || claimedPromos.includes(act.id);
      return { isCompleted: true, isClaimed, current: 1, target: 1, unit: '' };
    }
    return { isCompleted: true, isClaimed: claimedPromos.includes(act.id), current: 0, target: 1, unit: '' };
  };

  const handleClaimActivity = async (act: ActivityPromoConfig) => {
    const evalData = evaluateActivityProgress(act);
    if (evalData.isClaimed) {
      setTopNotification({
        show: true,
        type: 'info',
        title: 'Already Claimed',
        message: `You have already claimed or participated in "${act.title}".`,
      });
      return;
    }

    // STRICT VALIDATION FOR ACTIVITY TASKS
    if (act.id === 'act-first-deposit' && !evalData.isCompleted) {
      setTopNotification({
        show: true,
        type: 'alert',
        title: 'Task Incomplete: First Recharge Required',
        message: `You must recharge ₹100 or more to claim the ₹50 First Deposit Match bonus! (Current deposit: ₹${evalData.current}/₹100).`,
      });
      showToast('⚠️ Task Incomplete: Please recharge ₹100+ first.', 'error');
      onNavigateDeposit();
      return;
    }

    try {
      setClaimingId(act.id);
      const res = await api.claimActivityReward(act.id, 0);
      if (res?.success) {
        setTopNotification({
          show: true,
          type: 'success',
          title: 'Reward Claimed!',
          message: res.message || `🎉 Successfully claimed reward for "${act.title}"!`,
        });
        showToast(res.message || `🎉 Successfully claimed ${act.title}!`, 'success');
        setClaimedPromos((prev) => [...prev, act.id]);
        refreshUser();
      }
    } catch (err: any) {
      setTopNotification({
        show: true,
        type: 'alert',
        title: 'Claim Blocked',
        message: err.message || 'Task requirement not met yet. Please complete the requirement.',
      });
      showToast(err.message || 'Failed to claim promotion', 'error');
    } finally {
      setClaimingId(null);
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

        <h1 className="font-extrabold text-base text-white flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Activity Center</span>
        </h1>

        <button
          onClick={fetchActivities}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-[#f5c443] active:scale-95 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* TOP NOTIFICATION POPUP / ALERT BAR */}
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

      {/* Main Container */}
      <div className="flex-1 px-3.5 pt-3 max-w-md mx-auto w-full space-y-3.5">
        
        {/* Banner Card */}
        <div className="bg-gradient-to-r from-[#2a1e07] via-[#1b150a] to-[#101320] border border-[#f5c443]/40 rounded-3xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded-full bg-[#f5c443] text-black text-[9px] font-black uppercase tracking-wider">
                Official Events
              </span>
              <h2 className="text-lg font-black text-white">
                Exclusive Event Rewards
              </h2>
              <p className="text-[11px] text-zinc-300">
                Task complete karein aur bonuses claim karein (&lt; ₹200).
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f5c443] to-amber-500 flex items-center justify-center text-black shadow-lg">
              <Gift className="w-6 h-6" />
            </div>
          </div>

          {onNavigateGet500 && (
            <button
              onClick={onNavigateGet500}
              className="mt-3 w-full py-2 bg-white/10 hover:bg-white/15 border border-[#f5c443]/40 rounded-xl text-xs font-bold text-[#fce08b] flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#f5c443]" />
              <span>Go to Task Mission Center</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Activities List */}
        <div className="space-y-3">
          {activities.map((act) => {
            const evalData = evaluateActivityProgress(act);
            const isClaimed = evalData.isClaimed;
            const isClaiming = claimingId === act.id;

            return (
              <div
                key={act.id}
                className="bg-[#0f121d] border border-[#23293e] hover:border-[#f5c443]/40 rounded-2xl overflow-hidden transition shadow-lg"
              >
                {/* Top header */}
                <div className="p-3.5 bg-gradient-to-r from-[#171b29] to-[#111422] border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${act.tagColor || 'bg-blue-500 text-white'}`}>
                      {act.tag || 'EVENT'}
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-white">{act.title}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-[#f5c443]">{act.rewardText}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3.5 space-y-2.5 text-xs">
                  <p className="text-zinc-300 text-[11px] leading-relaxed">{act.desc}</p>
                  
                  <div className="bg-[#0a0c14] p-2.5 rounded-xl border border-white/5 text-[10px] text-zinc-400">
                    <strong className="text-white">Task Requirement:</strong> {act.rules}
                  </div>

                  <div className="pt-0.5">
                    {isClaimed ? (
                      <div className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed & Active</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleClaimActivity(act)}
                        disabled={isClaiming}
                        className="w-full py-2.5 bg-gradient-to-r from-[#d99b26] to-[#f5c443] hover:brightness-110 active:scale-98 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>{isClaiming ? 'Processing...' : 'Complete Task & Claim'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
