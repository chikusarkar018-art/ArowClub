import React from 'react';
import { X, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

interface UserHowToPlayModalProps {
  onClose: () => void;
}

export const UserHowToPlayModal: React.FC<UserHowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-[#f5c443]/30 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col text-white shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#f5c443]/20 flex items-center justify-between bg-[#161a28]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#f5c443]" />
            <h3 className="font-bold text-base text-[#f5c443]">Win Go Game Rules & Multipliers</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs leading-relaxed text-zinc-300 bg-[#0e1017]">
          <div className="bg-[#161a28] p-3.5 rounded-xl border border-[#f5c443]/20 space-y-2">
            <h4 className="font-bold text-[#fce08b] text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#f5c443]" /> Game Format
            </h4>
            <p className="text-zinc-300">
              Win Go offers 4 distinct timeframes: <strong className="text-[#f5c443]">30 Seconds</strong>, <strong className="text-[#f5c443]">1 Minute</strong>, <strong className="text-[#f5c443]">3 Minutes</strong>, and <strong className="text-[#f5c443]">5 Minutes</strong>.
            </p>
            <p className="text-zinc-400">
              When the countdown is above 5 seconds, players can place bets on <strong className="text-white">Colors</strong>, <strong className="text-white">Numbers (0–9)</strong>, or <strong className="text-white">Big / Small</strong>. During the final 5 seconds, betting is locked for random settlement.
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-[#fce08b] text-sm">Payout Multipliers Table</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#161a28] p-2.5 rounded-lg border border-emerald-500/30">
                <div className="font-bold text-emerald-400">Green (1, 3, 7, 9)</div>
                <div className="text-zinc-400">Payout: <strong className="text-white">2X (1:2)</strong></div>
                <div className="text-zinc-500 text-[10px] mt-0.5">If 5 appears: 1.5X</div>
              </div>

              <div className="bg-[#161a28] p-2.5 rounded-lg border border-rose-500/30">
                <div className="font-bold text-rose-400">Red (2, 4, 6, 8)</div>
                <div className="text-zinc-400">Payout: <strong className="text-white">2X (1:2)</strong></div>
                <div className="text-zinc-500 text-[10px] mt-0.5">If 0 appears: 1.5X</div>
              </div>

              <div className="bg-[#161a28] p-2.5 rounded-lg border border-purple-500/30">
                <div className="font-bold text-purple-400">Violet (0 or 5)</div>
                <div className="text-zinc-400">Payout: <strong className="text-white">4.5X (1:4.5)</strong></div>
                <div className="text-zinc-500 text-[10px] mt-0.5">High reward bonus</div>
              </div>

              <div className="bg-[#161a28] p-2.5 rounded-lg border border-[#f5c443]/40">
                <div className="font-bold text-[#f5c443]">Number (0 – 9)</div>
                <div className="text-zinc-400">Payout: <strong className="text-white">9X (1:9)</strong></div>
                <div className="text-zinc-500 text-[10px] mt-0.5">Exact number match</div>
              </div>

              <div className="bg-[#161a28] p-2.5 rounded-lg border border-amber-500/30">
                <div className="font-bold text-amber-400">Big (5, 6, 7, 8, 9)</div>
                <div className="text-zinc-400">Payout: <strong className="text-white">2X (1:2)</strong></div>
              </div>

              <div className="bg-[#161a28] p-2.5 rounded-lg border border-blue-500/30">
                <div className="font-bold text-blue-400">Small (0, 1, 2, 3, 4)</div>
                <div className="text-zinc-400">Payout: <strong className="text-white">2X (1:2)</strong></div>
              </div>
            </div>
          </div>

          <div className="bg-[#161a28] p-3 rounded-xl border border-white/5 text-[11px] text-zinc-400 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Platform Fair Rules
            </div>
            <p>• Service fee of 2% is deducted automatically on placed bet amounts.</p>
            <p>• Winnings are credited instantly to your wallet upon period result draw.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161a28] border-t border-[#f5c443]/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-[#f5c443] to-[#d48b0c] hover:brightness-105 font-black text-sm text-[#0d0f17] rounded-xl transition shadow"
          >
            I Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
