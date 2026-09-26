import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { X, Check, ArrowRight, Sparkles, Coins, Gift, AlertCircle, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FirstDepositBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateDeposit: () => void;
  onNavigateActivity?: () => void;
}

interface TierItem {
  id: string;
  amount: number;
  bonusAmount: number;
  label?: string;
  isActive: boolean;
}

export const FirstDepositBonusModal: React.FC<FirstDepositBonusModalProps> = ({
  isOpen,
  onClose,
  onNavigateDeposit,
  onNavigateActivity,
}) => {
  const { user, refreshUser, showToast } = useAuth();
  const [tiers, setTiers] = useState<TierItem[]>([]);
  const [claimedTiers, setClaimedTiers] = useState<string[]>([]);
  const [userDeposit, setUserDeposit] = useState<number>(0);
  const [noRemindersToday, setNoRemindersToday] = useState<boolean>(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Extra first deposit bonus');
  const [subtitle, setSubtitle] = useState<string>('Each account can only receive rewards once');

  // Default fallback tiers strictly matching user's image screenshot
  const defaultTiers: TierItem[] = [
    { id: 'tier-1000000', amount: 1000000, bonusAmount: 10000, isActive: true },
    { id: 'tier-50000', amount: 50000, bonusAmount: 588, isActive: true },
    { id: 'tier-10000', amount: 10000, bonusAmount: 288, isActive: true },
    { id: 'tier-5000', amount: 5000, bonusAmount: 188, isActive: true },
    { id: 'tier-1000', amount: 1000, bonusAmount: 58, isActive: true },
    { id: 'tier-500', amount: 500, bonusAmount: 28, isActive: true },
    { id: 'tier-100', amount: 100, bonusAmount: 10, isActive: true },
  ];

  const fetchConfig = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.getFirstDepositBonusConfig(user.uid || String(user.id).replace(/^u-/, ''));
      if (res?.success && res.config) {
        if (res.config.title) setTitle(res.config.title);
        if (res.config.subtitle) setSubtitle(res.config.subtitle);

        const loadedTiers = Array.isArray(res.config.tiers) && res.config.tiers.length > 0
          ? res.config.tiers.filter((t: any) => t.isActive !== false)
          : defaultTiers;
        
        // Sort descending like the screenshot (1,000,000 -> 50,000 -> 10,000 -> 5,000 -> 1,000 ...)
        loadedTiers.sort((a: any, b: any) => Number(b.amount) - Number(a.amount));
        setTiers(loadedTiers);
      } else {
        setTiers(defaultTiers);
      }

      if (Array.isArray(res?.claimedTiers)) {
        setClaimedTiers(res.claimedTiers);
      } else if (Array.isArray(user.claimedFirstDepositTiers)) {
        setClaimedTiers(user.claimedFirstDepositTiers);
      }

      const totalDep = res?.userTotalDeposit !== undefined ? Number(res.userTotalDeposit) : Number(user.totalDeposit || 0);
      setUserDeposit(totalDep);
    } catch {
      setTiers(defaultTiers);
      setUserDeposit(Number(user?.totalDeposit || 0));
      if (user?.claimedFirstDepositTiers) setClaimedTiers(user.claimedFirstDepositTiers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen, user?.totalDeposit]);

  if (!isOpen) return null;

  const actualDeposit = userDeposit || Number(user?.totalDeposit || 0);

  const handleClose = () => {
    if (noRemindersToday) {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('first_deposit_popup_dismissed_date', todayStr);
      } catch {}
    }
    onClose();
  };

  const handleDepositClick = () => {
    handleClose();
    onNavigateDeposit();
  };

  const handleActivityClick = () => {
    handleClose();
    if (onNavigateActivity) {
      onNavigateActivity();
    } else {
      onNavigateDeposit();
    }
  };

  const handleClaim = async (tier: TierItem) => {
    if (!user || claimingId) return;
    setClaimingId(tier.id);
    try {
      const res = await api.claimFirstDepositBonusTier(tier.id, user.uid || String(user.id).replace(/^u-/, ''));
      if (res?.success) {
        showToast(`🎉 ₹${res.bonusAmount || tier.bonusAmount} First Deposit Bonus credited to your wallet!`, 'success');
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}
        setClaimedTiers((prev) => [...prev, tier.id]);
        await refreshUser();
      } else {
        showToast(res.error || 'Failed to claim reward', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error claiming bonus', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-3 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Container in Luxury Yellow & Gold Theme - Compact to show more content with minimal scrolling */}
      <div className="relative w-full max-w-[355px] max-h-[80vh] bg-gradient-to-b from-[#241c06] via-[#161204] to-[#0c0902] border-2 border-[#f5c443]/70 rounded-2xl text-white shadow-[0_10px_45px_rgba(245,196,67,0.35)] flex flex-col overflow-hidden">
        
        {/* Ambient Top Golden Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-gradient-to-b from-[#f5c443]/35 via-[#eab308]/20 to-transparent rounded-full blur-xl pointer-events-none" />

        {/* Modal Top Header in Luxury Gold with Crisp White Title */}
        <div className="px-4 pt-3 pb-2 text-center shrink-0 border-b border-[#f5c443]/20 relative z-10">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="text-yellow-400 font-bold text-xs animate-pulse">✨</span>
            <h2 className="text-base sm:text-lg font-black tracking-wide text-white uppercase drop-shadow-[0_2px_8px_rgba(245,196,67,0.5)]">
              {title}
            </h2>
            <span className="text-yellow-400 font-bold text-xs animate-pulse">✨</span>
          </div>
          <p className="text-[10px] text-zinc-300 font-medium tracking-wide">
            {subtitle}
          </p>
        </div>

        {/* Scrollable Bonus Tiers List - Compact Spacing to Fit More Tiers */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 custom-scrollbar">
          {tiers.map((tier) => {
            const isClaimed = claimedTiers.includes(tier.id) || (user?.claimedFirstDepositTiers || []).includes(tier.id);
            const targetAmount = Number(tier.amount);
            const progress = Math.min(actualDeposit, targetAmount);
            const isCompleted = actualDeposit >= targetAmount;
            const progressPercent = Math.min(100, Math.round((progress / targetAmount) * 100));

            return (
              <div
                key={tier.id}
                className="bg-gradient-to-b from-[#221a05] to-[#151003] hover:from-[#2a2007] hover:to-[#1b1504] border border-[#f5c443]/35 rounded-xl p-2 sm:p-2.5 shadow-sm transition relative overflow-hidden"
              >
                {/* Header Row: Title & Bonus Amount in Crisp White */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs sm:text-[12px] font-bold text-white tracking-tight">
                      First deposit {tier.amount}
                    </span>
                  </div>
                  <div className="text-xs sm:text-[12px] font-black text-white shrink-0 drop-shadow-sm">
                    + ₹{tier.bonusAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Subtitle description in Soft White / Light Zinc */}
                <p className="text-[9px] sm:text-[10px] text-zinc-300 mb-1.5 leading-snug">
                  Deposit {tier.amount} for the first time and you will receive {tier.bonusAmount} bonus
                </p>

                {/* Bottom Row: Progress Capsule & Action Button */}
                <div className="flex items-center justify-between gap-2.5">
                  {/* Dark Progress Bar Capsule */}
                  <div className="flex-1 min-w-0 h-4.5 bg-[#0c0902] rounded-full p-0.5 border border-[#f5c443]/30 relative flex items-center overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 via-[#f5c443] to-yellow-300 transition-all duration-500 shadow-[0_0_10px_rgba(245,196,67,0.5)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tracking-tight text-white drop-shadow">
                      {progress}/{targetAmount}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0">
                    {isClaimed ? (
                      <button
                        disabled
                        className="px-2.5 py-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-[11px] font-bold flex items-center gap-1 cursor-default"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Claimed</span>
                      </button>
                    ) : isCompleted ? (
                      <button
                        onClick={() => handleClaim(tier)}
                        disabled={claimingId === tier.id}
                        className="px-3 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 via-[#f5c443] to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black text-[11px] font-black shadow-md shadow-amber-500/30 active:scale-95 transition flex items-center gap-1 cursor-pointer animate-pulse"
                      >
                        <Sparkles className="w-3 h-3 text-black" />
                        <span>{claimingId === tier.id ? 'Claiming...' : 'Receive'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleDepositClick}
                        className="px-3.5 py-0.5 rounded-lg bg-transparent border border-[#f5c443] hover:bg-[#f5c443]/20 text-white hover:text-amber-200 text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        Deposit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Bottom Controls Bar in Luxury Gold */}
        <div className="px-3.5 py-2 bg-[#140f03] border-t border-[#f5c443]/25 flex items-center justify-between gap-3 shrink-0">
          {/* Left Checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noRemindersToday}
              onChange={(e) => setNoRemindersToday(e.target.checked)}
              className="w-3.5 h-3.5 rounded-full border-amber-500/60 text-[#f5c443] focus:ring-0 bg-[#221a05] cursor-pointer accent-[#f5c443]"
            />
            <span className="text-[10px] text-zinc-200 font-medium">
              No more reminders today
            </span>
          </label>

          {/* Right Activity Button */}
          <button
            onClick={handleActivityClick}
            className="px-5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-[#f5c443] to-yellow-400 hover:brightness-110 active:scale-95 text-black font-black text-[11px] tracking-wide shadow-[0_3px_12px_rgba(245,196,67,0.35)] transition cursor-pointer"
          >
            Activity
          </button>
        </div>
      </div>

      {/* Floating Bottom Close Button */}
      <button
        onClick={handleClose}
        className="mt-3 w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-[#f5c443] text-[#f5c443] hover:text-white hover:border-white flex items-center justify-center shadow-2xl transition hover:scale-110 active:scale-95 cursor-pointer z-50"
        title="Close"
      >
        <X className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
