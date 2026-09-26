import React from 'react';
import {
  Lock,
  Wallet,
  Sparkles,
  ArrowRight,
  X,
  ShieldCheck,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface DepositRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateDeposit: () => void;
  minRequired?: number;
  currentDeposit?: number;
}

export const DepositRequiredModal: React.FC<DepositRequiredModalProps> = ({
  isOpen,
  onClose,
  onNavigateDeposit,
  minRequired = 100,
  currentDeposit = 0,
}) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const actualDeposit = currentDeposit || Number(user?.totalDeposit || 0);
  const remaining = Math.max(0, minRequired - actualDeposit);
  const progressPercent = Math.min(100, Math.round((actualDeposit / minRequired) * 100));

  const handleGoToDeposit = () => {
    onClose();
    onNavigateDeposit();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#181924] via-[#10111a] to-[#0a0b10] border border-[#f5c443]/40 rounded-3xl p-5 text-white shadow-2xl shadow-black/90 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-b from-[#f5c443]/25 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock & Gift Icon Header */}
        <div className="flex flex-col items-center text-center mt-1 mb-4">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-[#f5c443]/20 to-amber-300/10 border border-[#f5c443]/50 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8 text-[#f5c443] animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-[#f5c443] text-black text-[9px] font-black rounded-full shadow">
              ₹100 RECHARGE
            </span>
          </div>

          <h3 className="text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#f5c443] to-amber-400">
            बेटिंग अनलॉक करें
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-medium">
            Unlock Real-Money Betting
          </p>
        </div>

        {/* Informative Notice Box */}
        <div className="bg-[#12131c]/90 border border-amber-500/20 rounded-2xl p-3.5 mb-4 text-left space-y-2">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#f5c443] shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-200 leading-relaxed">
              नमस्ते <span className="font-bold text-[#f5c443]">{user?.username || 'Member'}</span>, आपके वॉलेट में <span className="text-emerald-400 font-bold">₹{user?.walletBalance || 10}</span> का वेलकम बोनस मौजूद है।
            </p>
          </div>

          <div className="flex items-start gap-2.5 pt-1 border-t border-white/5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              बेट लगाने और गेम खेलने के लिए <span className="text-[#f5c443] font-bold">कम से कम ₹{minRequired} का पहला डिपॉजिट</span> अनिवार्य है। रिचार्ज होते ही बेटिंग तुरंत अनलॉक हो जाएगी!
            </p>
          </div>
        </div>

        {/* Deposit Progress Card */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-3 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#f5c443]" /> आपका कुल डिपॉजिट:
            </span>
            <span className="text-[#f5c443]">
              ₹{actualDeposit} / ₹{minRequired}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-[#f5c443] to-amber-300 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>प्रगति: {progressPercent}%</span>
            <span>बाकी: ₹{remaining}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleGoToDeposit}
            className="w-full py-3.5 px-4 rounded-2xl font-black text-black bg-gradient-to-r from-[#f5c443] via-amber-400 to-[#e2ad2b] hover:brightness-110 active:scale-98 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 group"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>अभी ₹{minRequired} रिचार्ज करें</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition font-medium"
          >
            बाद में रिचार्ज करें (Cancel)
          </button>
        </div>

        {/* Trust Badge */}
        <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>24/7 सुरक्षित UPI / QR ऑटो-क्रेडिट डिपॉजिट</span>
        </div>
      </div>
    </div>
  );
};
