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
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Container matching uploaded image style: deep casino green, gold accents */}
      <div className="relative w-full max-w-[390px] max-h-[85vh] bg-gradient-to-b from-[#082a20] via-[#051c15] to-[#04140f] border-2 border-[#1a5742] rounded-3xl text-white shadow-[0_10px_40px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-gradient-to-b from-[#22c55e]/20 via-[#f5c443]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Modal Top Header (Exact Copy from Screenshot) */}
        <div className="px-5 pt-5 pb-3 text-center shrink-0 border-b border-[#144735]/80 relative z-10">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-amber-400 font-bold text-xs">✨</span>
            <h2 className="text-lg sm:text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-[#f5c443] to-amber-200 uppercase drop-shadow-md">
              Extra first deposit bonus
            </h2>
            <span className="text-amber-400 font-bold text-xs">✨</span>
          </div>
          <p className="text-[11px] sm:text-xs text-emerald-200/90 font-medium tracking-wide">
            Each account can only receive rewards once
          </p>
        </div>

        {/* Scrollable Bonus Tiers List */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 custom-scrollbar">
          {tiers.map((tier) => {
            const isClaimed = claimedTiers.includes(tier.id) || (user?.claimedFirstDepositTiers || []).includes(tier.id);
            const targetAmount = Number(tier.amount);
            const progress = Math.min(actualDeposit, targetAmount);
            const isCompleted = actualDeposit >= targetAmount;
            const progressPercent = Math.min(100, Math.round((progress / targetAmount) * 100));

            return (
              <div
                key={tier.id}
                className="bg-[#093527]/90 hover:bg-[#0b3e2e] border border-[#14563f] rounded-2xl p-3 shadow-md transition relative overflow-hidden"
              >
                {/* Header Row: Title & Bonus Amount */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs sm:text-[13px] font-black text-amber-300 tracking-tight">
                      First deposit {tier.amount}
                    </span>
                  </div>
                  <div className="text-xs sm:text-[13px] font-black text-[#f5c443] shrink-0">
                    + ₹{tier.bonusAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Subtitle description */}
                <p className="text-[10px] sm:text-[11px] text-zinc-300/90 mb-2.5 leading-snug">
                  Deposit {tier.amount} for the first time and you will receive {tier.bonusAmount} bonus
                </p>

                {/* Bottom Row: Progress Capsule & Action Button */}
                <div className="flex items-center justify-between gap-3">
                  {/* Dark Progress Bar Capsule */}
                  <div className="flex-1 min-w-0 h-6 bg-[#041711] rounded-full p-0.5 border border-[#124232] relative flex items-center overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-amber-500 to-[#f5c443] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-tight text-white drop-shadow">
                      {progress}/{targetAmount}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0">
                    {isClaimed ? (
                      <button
                        disabled
                        className="px-3 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-xs font-bold flex items-center gap-1 cursor-default"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Claimed</span>
                      </button>
                    ) : isCompleted ? (
                      <button
                        onClick={() => handleClaim(tier)}
                        disabled={claimingId === tier.id}
                        className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-[#f5c443] hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-1 cursor-pointer animate-pulse"
                      >
                        <Sparkles className="w-3 h-3 text-black" />
                        <span>{claimingId === tier.id ? 'Claiming...' : 'Receive'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleDepositClick}
                        className="px-4 py-1 rounded-lg bg-transparent border border-[#d97706] hover:bg-[#d97706]/15 text-[#f5c443] hover:text-amber-300 text-xs font-black transition active:scale-95 cursor-pointer shadow-sm"
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

        {/* Modal Bottom Controls Bar (Exact Copy from Screenshot) */}
        <div className="px-4 py-3 bg-[#051c15] border-t border-[#144735] flex items-center justify-between gap-3 shrink-0">
          {/* Left Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noRemindersToday}
              onChange={(e) => setNoRemindersToday(e.target.checked)}
              className="w-4 h-4 rounded-full border-emerald-500/60 text-[#f5c443] focus:ring-0 bg-[#07241b] cursor-pointer accent-[#f5c443]"
            />
            <span className="text-[11px] text-zinc-300 font-medium">
              No more reminders today
            </span>
          </label>

          {/* Right Activity Button */}
          <button
            onClick={handleActivityClick}
            className="px-6 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-[#f5c443] hover:brightness-110 active:scale-95 text-black font-black text-xs tracking-wide shadow-md transition cursor-pointer"
          >
            Activity
          </button>
        </div>
      </div>

      {/* Floating Bottom Close Button ("X" circle matching screenshot) */}
      <button
        onClick={handleClose}
        className="mt-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border-2 border-white/80 text-white flex items-center justify-center shadow-2xl transition hover:scale-110 active:scale-95 cursor-pointer z-50"
        title="Close"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
};
