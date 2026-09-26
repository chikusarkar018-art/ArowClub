import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  ChevronLeft, Crown, Gift, Star, Shield, Coins,
  Vault, FileText, Check, Lock, X, Sparkles, Calendar
} from 'lucide-react';

interface UserVipViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
  onNavigatePage?: (page: string) => void;
}

export interface VipTierConfig {
  level: number;
  name: string;
  tierCategory: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Obsidian' | 'Supreme';
  tierCategoryHindi: string;
  requiredExp: number;
  levelUpReward: number;
  safeIncomeRate: string;
  rebateRate: string;
  monthlyReward: number;
  withdrawalLimit: number;
  theme: {
    cardBg: string;
    cardBorder: string;
    cardGlow: string;
    textColor: string;
    accentColor: string;
    accentBg: string;
    shieldGradient: string;
    shieldBorder: string;
    progressGradient: string;
    starColor: string;
    badgeStyle: string;
  };
}

export const VIP_TIERS: VipTierConfig[] = [
  {
    level: 1,
    name: 'VIP1',
    tierCategory: 'Bronze',
    tierCategoryHindi: 'ब्रॉन्ज (Bronze)',
    requiredExp: 3000,
    levelUpReward: 60,
    safeIncomeRate: '0.1%',
    rebateRate: '0.6%',
    monthlyReward: 30,
    withdrawalLimit: 5,
    theme: {
      cardBg: 'linear-gradient(135deg, #4a2810 0%, #2f1809 45%, #1c0e05 100%)',
      cardBorder: '#c07b46',
      cardGlow: 'rgba(192, 123, 70, 0.35)',
      textColor: '#f5b078',
      accentColor: '#e08a4c',
      accentBg: '#3d1f0c',
      shieldGradient: 'linear-gradient(145deg, #e5975d 0%, #b8672e 50%, #68300d 100%)',
      shieldBorder: '#f8c29b',
      progressGradient: 'linear-gradient(90deg, #b8672e, #f5b078)',
      starColor: '#ffcaa4',
      badgeStyle: 'bg-amber-700/40 text-amber-300 border border-amber-600/50',
    },
  },
  {
    level: 2,
    name: 'VIP2',
    tierCategory: 'Silver',
    tierCategoryHindi: 'सिल्वर (Silver)',
    requiredExp: 10000,
    levelUpReward: 90,
    safeIncomeRate: '0.2%',
    rebateRate: '0.8%',
    monthlyReward: 45,
    withdrawalLimit: 8,
    theme: {
      cardBg: 'linear-gradient(135deg, #374151 0%, #1f2937 45%, #111827 100%)',
      cardBorder: '#9ca3af',
      cardGlow: 'rgba(156, 163, 175, 0.4)',
      textColor: '#e5e7eb',
      accentColor: '#cbd5e1',
      accentBg: '#1f2937',
      shieldGradient: 'linear-gradient(145deg, #f3f4f6 0%, #9ca3af 50%, #4b5563 100%)',
      shieldBorder: '#ffffff',
      progressGradient: 'linear-gradient(90deg, #9ca3af, #f3f4f6)',
      starColor: '#ffffff',
      badgeStyle: 'bg-slate-700/50 text-slate-200 border border-slate-400/50',
    },
  },
  {
    level: 3,
    name: 'VIP3',
    tierCategory: 'Gold',
    tierCategoryHindi: 'गोल्डन (Gold)',
    requiredExp: 30000,
    levelUpReward: 120,
    safeIncomeRate: '0.3%',
    rebateRate: '1.0%',
    monthlyReward: 60,
    withdrawalLimit: 10,
    theme: {
      cardBg: 'linear-gradient(135deg, #573c09 0%, #382404 45%, #1f1301 100%)',
      cardBorder: '#eab308',
      cardGlow: 'rgba(234, 179, 8, 0.45)',
      textColor: '#fef08a',
      accentColor: '#facc15',
      accentBg: '#422a05',
      shieldGradient: 'linear-gradient(145deg, #fef08a 0%, #eab308 50%, #854d0e 100%)',
      shieldBorder: '#fef9c3',
      progressGradient: 'linear-gradient(90deg, #ca8a04, #fef08a)',
      starColor: '#fef08a',
      badgeStyle: 'bg-yellow-600/40 text-yellow-300 border border-yellow-500/50',
    },
  },
  {
    level: 4,
    name: 'VIP4',
    tierCategory: 'Platinum',
    tierCategoryHindi: 'प्लैटिनम (Platinum)',
    requiredExp: 80000,
    levelUpReward: 140,
    safeIncomeRate: '0.4%',
    rebateRate: '1.2%',
    monthlyReward: 70,
    withdrawalLimit: 15,
    theme: {
      cardBg: 'linear-gradient(135deg, #0c3e56 0%, #072535 45%, #03131c 100%)',
      cardBorder: '#38bdf8',
      cardGlow: 'rgba(56, 189, 248, 0.45)',
      textColor: '#bae6fd',
      accentColor: '#38bdf8',
      accentBg: '#082f49',
      shieldGradient: 'linear-gradient(145deg, #bae6fd 0%, #38bdf8 50%, #0369a1 100%)',
      shieldBorder: '#e0f2fe',
      progressGradient: 'linear-gradient(90deg, #0284c7, #7dd3fc)',
      starColor: '#e0f2fe',
      badgeStyle: 'bg-sky-700/40 text-sky-300 border border-sky-500/50',
    },
  },
  {
    level: 5,
    name: 'VIP5',
    tierCategory: 'Diamond',
    tierCategoryHindi: 'डायमंड (Diamond)',
    requiredExp: 200000,
    levelUpReward: 160,
    safeIncomeRate: '0.5%',
    rebateRate: '1.5%',
    monthlyReward: 80,
    withdrawalLimit: 20,
    theme: {
      cardBg: 'linear-gradient(135deg, #371b58 0%, #220e38 45%, #130722 100%)',
      cardBorder: '#a855f7',
      cardGlow: 'rgba(168, 85, 247, 0.45)',
      textColor: '#e9d5ff',
      accentColor: '#c084fc',
      accentBg: '#2e1065',
      shieldGradient: 'linear-gradient(145deg, #f3e8ff 0%, #a855f7 50%, #581c87 100%)',
      shieldBorder: '#faf5ff',
      progressGradient: 'linear-gradient(90deg, #7e22ce, #c084fc)',
      starColor: '#f3e8ff',
      badgeStyle: 'bg-purple-700/40 text-purple-300 border border-purple-500/50',
    },
  },
  {
    level: 6,
    name: 'VIP6',
    tierCategory: 'Obsidian',
    tierCategoryHindi: 'क्राउन ओब्सीडियन (Crown Obsidian)',
    requiredExp: 500000,
    levelUpReward: 180,
    safeIncomeRate: '0.6%',
    rebateRate: '1.8%',
    monthlyReward: 90,
    withdrawalLimit: 25,
    theme: {
      cardBg: 'linear-gradient(135deg, #4c0519 0%, #2b040e 45%, #140106 100%)',
      cardBorder: '#f43f5e',
      cardGlow: 'rgba(244, 63, 94, 0.45)',
      textColor: '#fecdd3',
      accentColor: '#fb7185',
      accentBg: '#4c0519',
      shieldGradient: 'linear-gradient(145deg, #ffe4e6 0%, #f43f5e 50%, #881337 100%)',
      shieldBorder: '#fff1f2',
      progressGradient: 'linear-gradient(90deg, #be123c, #fb7185)',
      starColor: '#fff1f2',
      badgeStyle: 'bg-rose-700/40 text-rose-300 border border-rose-500/50',
    },
  },
  {
    level: 7,
    name: 'VIP7',
    tierCategory: 'Supreme',
    tierCategoryHindi: 'सुप्रीम ड्रैगन (Supreme Dragon)',
    requiredExp: 1000000,
    levelUpReward: 199,
    safeIncomeRate: '0.8%',
    rebateRate: '2.0%',
    monthlyReward: 100,
    withdrawalLimit: 30,
    theme: {
      cardBg: 'linear-gradient(135deg, #451a03 0%, #1f0b00 45%, #0d0400 100%)',
      cardBorder: '#f97316',
      cardGlow: 'rgba(249, 115, 22, 0.5)',
      textColor: '#ffedd5',
      accentColor: '#fb923c',
      accentBg: '#431407',
      shieldGradient: 'linear-gradient(145deg, #ffedd5 0%, #f97316 50%, #7c2d12 100%)',
      shieldBorder: '#fff7ed',
      progressGradient: 'linear-gradient(90deg, #c2410c, #fdba74)',
      starColor: '#fff7ed',
      badgeStyle: 'bg-orange-700/40 text-orange-300 border border-orange-500/50',
    },
  },
];

export const UserVipView: React.FC<UserVipViewProps> = ({
  onBack,
  onNavigateDeposit,
  onNavigatePage,
}) => {
  const { user, showToast, refreshUser } = useAuth();
  const [vipTiersList, setVipTiersList] = useState<VipTierConfig[]>(VIP_TIERS);
  const [selectedVipLevel, setSelectedVipLevel] = useState<number>(user?.vipLevel || 1);
  const [activeTab, setActiveTab] = useState<'history' | 'rules'>('history');
  const [showAllModal, setShowAllModal] = useState<boolean>(false);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [claimedList, setClaimedList] = useState<string[]>(
    (user as any)?.claimedVipRewards || []
  );

  // User experience & level calculations
  const currentVipLevel = Number(user?.vipLevel || 0);
  const currentExp = Number(user?.vipExp ?? (Number(user?.totalDeposit || 0) + Number(user?.totalBet || 0)));

  // Sync dynamic VIP tiers & selected VIP card on mount
  useEffect(() => {
    api.getVipTiers().then((res) => {
      if (res?.tiers && Array.isArray(res.tiers) && res.tiers.length > 0) {
        // Merge dynamic values with theme styling
        const merged = res.tiers.map((t: any, i: number) => {
          const fallback = VIP_TIERS[i] || VIP_TIERS[VIP_TIERS.length - 1];
          return {
            ...fallback,
            ...t,
            theme: fallback.theme,
          };
        });
        setVipTiersList(merged);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.vipLevel !== undefined) {
      setSelectedVipLevel(Math.max(1, Math.min(vipTiersList.length, user.vipLevel || 1)));
    }
    if ((user as any)?.claimedVipRewards) {
      setClaimedList((user as any).claimedVipRewards);
    }
  }, [user?.vipLevel, user, vipTiersList.length]);

  const activeTier = vipTiersList.find((t) => t.level === selectedVipLevel) || vipTiersList[0] || VIP_TIERS[0];
  const requiredExpForSelected = activeTier.requiredExp;
  const isSelectedTierCompleted = currentExp >= requiredExpForSelected;
  const isSelectedUnlocked = isSelectedTierCompleted || (currentVipLevel >= activeTier.level && currentVipLevel > 0 && currentExp >= requiredExpForSelected);

  const expProgress = Math.min(requiredExpForSelected, currentExp);
  const expRemaining = Math.max(0, requiredExpForSelected - currentExp);

  const handleClaimReward = async (rewardType: 'levelup' | 'monthly' | 'safe', level: number, amount: number) => {
    const claimKey = `${rewardType}_vip${level}`;
    const targetTier = vipTiersList.find(t => t.level === level) || activeTier;
    const isCompleted = currentExp >= targetTier.requiredExp;

    if (!isCompleted) {
      const remaining = Math.max(0, targetTier.requiredExp - currentExp);
      showToast(`Task Incomplete: Complete ₹${targetTier.requiredExp.toLocaleString('en-IN')} EXP to claim! Need ₹${remaining.toLocaleString('en-IN')} more.`, 'info');
      return;
    }
    if (claimedList.includes(claimKey)) {
      showToast(`VIP${level} reward already claimed!`, 'info');
      return;
    }

    try {
      setClaimingKey(claimKey);
      const res = await api.claimVipReward(rewardType, level, amount);
      if (res?.success) {
        showToast(res.message || `₹${amount} VIP reward credited to wallet!`, 'success');
        setClaimedList((prev) => [...prev, claimKey]);
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to claim VIP reward', 'error');
    } finally {
      setClaimingKey(null);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07080e] text-white flex flex-col font-sans pb-28 select-none">
      
      {/* 1. Header Matching Exact Screenshot */}
      <header className="px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 bg-[#07080e] border-b border-[#1a1c26]">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="font-black text-lg text-white tracking-wider uppercase font-serif">
          VIP
        </h1>

        <div className="w-8" />
      </header>

      {/* Main Content Container */}
      <div className="flex-1 px-4 pt-3 max-w-md mx-auto w-full space-y-3.5">
        
        {/* 2. User Profile Header Info */}
        <div className="flex items-center gap-3.5 py-1">
          {/* Avatar with VIP Badge */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#e5a93c] shadow-[0_0_15px_rgba(229,169,60,0.35)] bg-zinc-800">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="VIP User"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* VIP Level Badge on Avatar */}
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] border-2 border-black text-black text-[9px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shadow-md">
              <Star className="w-2.5 h-2.5 fill-black text-black" />
              <span>VIP{currentVipLevel}</span>
            </div>
          </div>

          <div>
            <div className="font-extrabold text-base text-white tracking-wide">
              {user?.phone ? `Member ${user.phone.slice(-5)}` : 'Member 42562'}
            </div>
            <div className="text-xs text-[#e5a93c] flex items-center gap-1 mt-0.5 font-bold">
              <span>ArowClub Elite Club</span>
            </div>
          </div>
        </div>

        {/* 3. My Experience & Payout Time Stats (Yellow & Black Cards) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left: My experience */}
          <div className="bg-[#10121b] border border-[#262a3f] rounded-2xl p-3.5 text-center shadow-lg relative overflow-hidden">
            <div className="text-lg font-black text-[#e5a93c] font-mono tracking-tight">
              {currentExp} EXP
            </div>
            <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
              My experience
            </div>
          </div>

          {/* Right: Payout time */}
          <div className="bg-[#10121b] border border-[#262a3f] rounded-2xl p-3.5 text-center shadow-lg relative overflow-hidden">
            <div className="text-lg font-black text-[#e5a93c] font-mono tracking-tight">
              7 Days
            </div>
            <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
              Payout time
            </div>
          </div>
        </div>

        {/* 4. Notice Banner */}
        <div className="bg-[#121420] border border-white/5 rounded-xl px-3 py-2 text-center text-[10px] text-zinc-400">
          VIP level rewards are settled at <span className="text-[#e5a93c] font-bold">2:00 am</span> on the 1st of every month
        </div>

        {/* 5. 3D VIP Tier Cards Carousel (Bronze -> Silver -> Golden -> Platinum -> Diamond -> Obsidian) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
            <span className="font-bold flex items-center gap-1 text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Swipe 3D VIP Cards (ब्रॉन्ज ➔ सिल्वर ➔ गोल्ड)
            </span>
            <span className="text-[#e5a93c] font-bold font-mono">
              {selectedVipLevel}/{vipTiersList.length}
            </span>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x pt-1">
            {vipTiersList.map((tier) => {
              const isSelected = tier.level === selectedVipLevel;
              const isTierComplete = currentExp >= tier.requiredExp;
              const tierProgress = Math.min(tier.requiredExp, currentExp);
              const tierPercent = Math.min(100, Math.round((tierProgress / tier.requiredExp) * 100));

              return (
                <div
                  key={tier.level}
                  onClick={() => setSelectedVipLevel(tier.level)}
                  style={{
                    background: tier.theme.cardBg,
                    borderColor: isSelected ? tier.theme.cardBorder : 'rgba(255,255,255,0.08)',
                    boxShadow: isSelected
                      ? `0 14px 28px -5px ${tier.theme.cardGlow}, inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -2px 5px rgba(0,0,0,0.8)`
                      : '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
                  }}
                  className={`min-w-[290px] max-w-[290px] rounded-3xl p-4.5 cursor-pointer transition-all duration-300 border-2 relative overflow-hidden snap-center select-none ${
                    isSelected
                      ? 'scale-[1.02] ring-2 ring-white/20'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Glossy 3D Reflection Highlight Layer */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 30%, transparent 60%, rgba(0,0,0,0.4) 100%)',
                    }}
                  />

                  {/* Top Tier Tag */}
                  <div className="text-[10px] font-black uppercase tracking-wider mb-1 text-white/60">
                    {tier.tierCategoryHindi}
                  </div>

                  {/* Header Row: VIP Label + Status Tag + 3D Shield Medal */}
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5" style={{ color: tier.theme.accentColor }} />
                        <span
                          className="text-xl font-black tracking-wide font-sans drop-shadow-md"
                          style={{ color: tier.theme.textColor }}
                        >
                          {tier.name}
                        </span>

                        {isTierComplete ? (
                          <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" /> 100% Completed
                          </span>
                        ) : (
                          <span className="bg-black/50 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Incomplete ({tierPercent}%)
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-zinc-200/90 mt-1 font-medium">
                        Upgrading {tier.name} requires{' '}
                        <strong style={{ color: tier.theme.textColor }}>{tier.requiredExp}EXP</strong>
                      </div>
                    </div>

                    {/* 3D Realistic Metallic Shield with 5-Point Star */}
                    <div
                      style={{
                        background: tier.theme.shieldGradient,
                        borderColor: tier.theme.shieldBorder,
                        boxShadow: `0 6px 16px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.6)`,
                      }}
                      className="w-13 h-13 rounded-2xl border flex items-center justify-center relative shadow-lg shrink-0 -mt-1 -mr-1"
                    >
                      <Shield className="w-8 h-8 text-black/30 absolute" />
                      <Star
                        className="w-6 h-6 relative z-10 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] stroke-[1.5]"
                        style={{
                          fill: tier.theme.starColor,
                          color: '#000000',
                        }}
                      />
                    </div>
                  </div>

                  {/* Bet Rule Pill */}
                  <div className="mt-3 relative z-10 inline-block">
                    <div
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderColor: tier.theme.cardBorder,
                        color: tier.theme.textColor,
                      }}
                      className="border px-2.5 py-0.5 rounded-lg text-[10px] font-black font-mono shadow-inner"
                    >
                      Bet ₹1=1EXP
                    </div>
                  </div>

                  {/* 3D Progress Bar Area */}
                  <div className="mt-3 space-y-1 relative z-10">
                    <div className="w-full h-2 bg-black/70 rounded-full overflow-hidden border border-white/15 p-0.5 shadow-inner">
                      <div
                        className="h-full rounded-full transition-all duration-500 relative"
                        style={{
                          width: `${tierPercent}%`,
                          background: tier.theme.progressGradient,
                          boxShadow: '0 0 8px rgba(255,255,255,0.5)',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-300 font-mono">
                      <span>
                        {tierProgress}/{tier.requiredExp}
                      </span>
                      <span className="text-zinc-200 font-sans font-medium">
                        {tier.requiredExp} EXP can be leveled up
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Selected VIP Benefits Section (Exact from Reference) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span className="text-cyan-400">💎</span>
              <span>{activeTier.name} Benefits level</span>
            </h3>
            {isSelectedTierCompleted ? (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                <span>100% Complete • Ready to Claim</span>
              </span>
            ) : (
              <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Task Incomplete (Need ₹{expRemaining.toLocaleString('en-IN')} EXP)</span>
              </span>
            )}
          </div>

          <div className="bg-[#0f111a] border border-[#262a3f] rounded-3xl p-3 space-y-2.5 shadow-2xl">
            
            {/* Benefit 1: Level up rewards */}
            <div className="p-3 bg-[#141724] border border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* 3D Gift Icon matching screenshot */}
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 border border-yellow-200/50 flex items-center justify-center text-black shadow-md shrink-0">
                    <Gift className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Level up rewards</div>
                    <div className="text-[10px] text-zinc-400">Claim once after 100% completing {activeTier.name} task</div>
                  </div>
                </div>

                {/* Right Reward Chips */}
                <div className="space-y-1 text-right">
                  <div className="bg-[#241e08] border border-[#f5c443]/60 text-[#facc15] px-3 py-1 rounded-xl text-xs font-black flex items-center justify-end gap-1.5 shadow-sm font-mono">
                    <span>💰</span>
                    <span>₹{activeTier.levelUpReward}</span>
                  </div>
                </div>
              </div>

              {/* Live Claim / Status Button */}
              <div>
                {claimedList.includes(`levelup_vip${activeTier.level}`) ? (
                  <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-[11px] flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>VIP{activeTier.level} Upgrade Bonus Claimed</span>
                  </div>
                ) : isSelectedTierCompleted ? (
                  <button
                    onClick={() => handleClaimReward('levelup', activeTier.level, activeTier.levelUpReward)}
                    disabled={claimingKey === `levelup_vip${activeTier.level}`}
                    className="w-full py-2.5 bg-gradient-to-r from-[#d99b26] to-[#f5c443] hover:brightness-110 active:scale-98 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    <span>{claimingKey === `levelup_vip${activeTier.level}` ? 'Claiming...' : `Claim ₹${activeTier.levelUpReward} Bonus (100% Complete)`}</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      showToast(`Complete ₹${activeTier.requiredExp.toLocaleString('en-IN')} EXP task to unlock this bonus! (₹${expRemaining.toLocaleString('en-IN')} EXP remaining)`, 'info');
                    }}
                    className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Incomplete ({expProgress.toLocaleString('en-IN')}/{requiredExpForSelected.toLocaleString('en-IN')} EXP) • Need ₹{expRemaining.toLocaleString('en-IN')} more</span>
                  </button>
                )}
              </div>
            </div>

            {/* Benefit 2: Monthly Salary Reward */}
            <div className="p-3 bg-[#141724] border border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* 3D Monthly Icon */}
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 border border-emerald-300/50 flex items-center justify-center text-black shadow-md shrink-0">
                    <Calendar className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Monthly salary rewards</div>
                    <div className="text-[10px] text-zinc-400">Monthly loyalty allowance on 100% completed tier</div>
                  </div>
                </div>

                <div className="bg-[#0b2416] border border-emerald-500/60 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 font-mono shadow-sm">
                  <span>₹</span>
                  <span>{activeTier.monthlyReward}</span>
                </div>
              </div>

              {/* Monthly Claim Button */}
              <div>
                {claimedList.includes(`monthly_vip${activeTier.level}`) ? (
                  <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-[11px] flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Monthly Salary Claimed</span>
                  </div>
                ) : isSelectedTierCompleted ? (
                  <button
                    onClick={() => handleClaimReward('monthly', activeTier.level, activeTier.monthlyReward)}
                    disabled={claimingKey === `monthly_vip${activeTier.level}`}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-98 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    <span>{claimingKey === `monthly_vip${activeTier.level}` ? 'Claiming...' : `Claim Monthly ₹${activeTier.monthlyReward} (100% Complete)`}</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      showToast(`Complete ₹${activeTier.requiredExp.toLocaleString('en-IN')} EXP task to unlock monthly salary! (₹${expRemaining.toLocaleString('en-IN')} EXP remaining)`, 'info');
                    }}
                    className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Incomplete ({expProgress.toLocaleString('en-IN')}/{requiredExpForSelected.toLocaleString('en-IN')} EXP) • Need ₹{expRemaining.toLocaleString('en-IN')} more</span>
                  </button>
                )}
              </div>
            </div>

            {/* Benefit 3: Safe Income */}
            <div className="flex items-center justify-between p-3 bg-[#141724] border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                {/* 3D Safe Vault Icon */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-500/50 flex items-center justify-center text-[#facc15] shadow-md shrink-0">
                  <Vault className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">Safe Extra Income</div>
                  <div className="text-[10px] text-zinc-400">Extra daily income on balance kept in Safe</div>
                </div>
              </div>

              {/* Right Safe Percentage */}
              <div className="bg-[#11192e] border border-blue-500/40 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 font-mono shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span>{activeTier.safeIncomeRate}</span>
              </div>
            </div>

            {/* Benefit 4: Rebate rate */}
            <div className="flex items-center justify-between p-3 bg-[#141724] border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                {/* 3D Coins Icon */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 border border-amber-300/50 flex items-center justify-center text-black shadow-md shrink-0">
                  <Coins className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">Daily Bet Rebate</div>
                  <div className="text-[10px] text-zinc-400">Automatic turnover cashback rate</div>
                </div>
              </div>

              {/* Right Rebate Percentage */}
              <div className="bg-[#241e08] border border-[#f5c443]/60 text-[#facc15] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 font-mono shadow-sm">
                <span>🪙</span>
                <span>{activeTier.rebateRate}</span>
              </div>
            </div>

          </div>
        </div>

        {/* 7. Tabs: History & Rules */}
        <div className="space-y-3 pt-2">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 text-xs font-black text-center relative transition cursor-pointer ${
                activeTab === 'history' ? 'text-[#e5a93c]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>History</span>
              {activeTab === 'history' && (
                <div className="absolute bottom-0 inset-x-8 h-0.5 bg-[#e5a93c] shadow-[0_0_8px_#e5a93c]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex-1 py-2.5 text-xs font-black text-center relative transition cursor-pointer ${
                activeTab === 'rules' ? 'text-[#e5a93c]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Rules</span>
              {activeTab === 'rules' && (
                <div className="absolute bottom-0 inset-x-8 h-0.5 bg-[#e5a93c] shadow-[0_0_8px_#e5a93c]" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'history' ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-20 h-20 rounded-2xl bg-[#121420] border border-white/5 flex items-center justify-center text-zinc-600 shadow-inner">
                <FileText className="w-9 h-9 text-zinc-500 opacity-60" />
              </div>
              <div className="text-xs text-zinc-500 font-medium">No data</div>
            </div>
          ) : (
            <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-4 space-y-2.5 text-xs text-zinc-300 leading-relaxed">
              <div className="font-bold text-[#e5a93c] flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                <span>VIP Membership Privilege Rules</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                1. <strong>Promotion Standard:</strong> 1 EXP is accumulated for every ₹1 of valid bet across all games.
              </p>
              <p className="text-[11px] text-zinc-400">
                2. <strong>Settlement Cycle:</strong> VIP monthly rewards and safe interest rates are automatically calculated and distributed at 02:00 AM on the 1st of each month.
              </p>
              <p className="text-[11px] text-zinc-400">
                3. <strong>Level-Up Bonus:</strong> Can be received once per account upgrade.
              </p>
            </div>
          )}
        </div>

        {/* 8. Bottom Full-Width "View All" Button */}
        <div className="pt-2">
          <button
            onClick={() => setShowAllModal(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] hover:brightness-110 active:scale-98 text-black font-black text-sm tracking-wider uppercase shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition cursor-pointer"
          >
            View All
          </button>
        </div>

      </div>

      {/* 9. "View All" VIP Comparison Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#10121c] border border-[#e5a93c]/40 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl text-white overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#141824]">
              <h3 className="font-black text-base text-[#e5a93c] flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#facc15]" />
                <span>All VIP Tier Privileges</span>
              </h3>
              <button
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Table */}
            <div className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
              <div className="grid grid-cols-5 text-[10px] font-black text-[#e5a93c] uppercase tracking-wider pb-2 border-b border-white/10 text-center">
                <span>Tier</span>
                <span>EXP</span>
                <span>Reward</span>
                <span>Safe %</span>
                <span>Rebate</span>
              </div>

              {vipTiersList.map((tier) => (
                <div
                  key={tier.level}
                  className={`grid grid-cols-5 py-2.5 px-1 rounded-xl border text-center items-center font-mono text-[11px] ${
                    tier.level === currentVipLevel
                      ? 'bg-[#241e08] border-[#e5a93c] text-white font-black'
                      : 'bg-[#141724] border-white/5 text-zinc-300'
                  }`}
                >
                  <span className="font-sans font-bold" style={{ color: tier.theme.accentColor }}>
                    {tier.name}
                  </span>
                  <span>{tier.requiredExp}</span>
                  <span className="text-emerald-400">₹{tier.levelUpReward}</span>
                  <span className="text-blue-400">{tier.safeIncomeRate}</span>
                  <span className="text-yellow-400">{tier.rebateRate}</span>
                </div>
              ))}
            </div>

            {/* Modal Action Button */}
            <div className="p-4 border-t border-white/10 bg-[#141824]">
              <button
                onClick={() => {
                  setShowAllModal(false);
                  onNavigateDeposit();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                Recharge to Upgrade VIP
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
