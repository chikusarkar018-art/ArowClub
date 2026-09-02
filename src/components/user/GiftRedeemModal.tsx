import React, { useState } from 'react';
import {
  Gift,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  Coins,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, newBalance: number) => void;
}

export const GiftRedeemModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState<number | null>(null);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setCode(text.trim().toUpperCase());
    } catch {
      // Ignore clipboard permission reject
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/redeem-gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || '',
        },
        body: JSON.stringify({
          code: code.trim(),
          uid: user?.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to redeem gift code.');
      }

      setRewardClaimed(data.amount);
      if (refreshUser) refreshUser();
      if (onSuccess) onSuccess(data.amount, data.newBalance);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired gift code.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRewardClaimed(null);
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#181a2b] via-[#121420] to-[#0c0e17] border-2 border-[#f5c443]/40 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-100">
        {/* Ambient Gold Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#f5c443]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {rewardClaimed !== null ? (
          // Success State
          <div className="text-center py-4 space-y-4 animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#f5c443] to-amber-400 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30">
              <Sparkles className="w-8 h-8 fill-slate-950 animate-bounce" />
            </div>

            <div>
              <div className="text-xs font-black text-[#f5c443] uppercase tracking-widest">
                CONGRATULATIONS!
              </div>
              <h3 className="text-2xl font-black text-white mt-1">
                ₹{rewardClaimed} Added!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your gift bonus has been instantly credited to your wallet balance.
              </p>
            </div>

            <button
              onClick={handleReset}
              className="w-full h-12 bg-gradient-to-r from-[#f5c443] to-amber-500 hover:from-[#e5b332] hover:to-amber-600 text-slate-950 font-black rounded-2xl text-sm shadow-lg shadow-amber-500/25 transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Awesome, Let's Play!</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Entry State
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f5c443] to-amber-500 flex items-center justify-center text-slate-950 shadow-md">
                <Gift className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Redeem Gift Code</h3>
                <p className="text-xs text-slate-400">
                  Enter your promotional code to claim instant cash
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Gift / Promo Code
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter or paste code..."
                    required
                    className="w-full h-12 pl-4 pr-16 bg-[#0a0c14] border-2 border-[#23273c] focus:border-[#f5c443] rounded-2xl text-white font-mono font-bold text-sm tracking-wider focus:outline-none transition uppercase"
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="absolute right-2 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full h-12 bg-gradient-to-r from-[#f5c443] to-amber-500 hover:from-[#e5b332] hover:to-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-sm shadow-lg shadow-amber-500/25 transition transform active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>Redeem Code Now</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center">
              <p className="text-[11px] text-slate-500">
                Join our Telegram channel to receive daily gift codes & bonuses!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
