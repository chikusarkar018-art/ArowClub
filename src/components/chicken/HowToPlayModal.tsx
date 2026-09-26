import React from 'react';
import { X, HelpCircle, ShieldCheck, Flame, Trophy, Award } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141824] border border-[#f5c443]/30 rounded-3xl max-w-sm w-full p-5 space-y-3.5 text-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐔</span>
            <h3 className="font-black text-base text-[#fce08b]">How to Play Chicken Cross</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="text-xs text-zinc-300 space-y-2.5 leading-relaxed">
          <li className="flex items-start gap-2.5 bg-zinc-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">1</span>
            <span>Choose your <strong>Bet Amount</strong> and select a difficulty mode: Easy (22 lanes), Medium (18 lanes), Hard (14 lanes), or Hardcore (10 lanes).</span>
          </li>
          <li className="flex items-start gap-2.5 bg-zinc-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">2</span>
            <span>Tap <strong>START GAME</strong> or click on the glowing lane to hop the chicken forward. Each lane safely crossed puts a safety barrier and increases your multiplier!</span>
          </li>
          <li className="flex items-start gap-2.5 bg-zinc-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">3</span>
            <span>Watch out for oncoming traffic! If a vehicle hits the chicken, feathers fly and the round is lost.</span>
          </li>
          <li className="flex items-start gap-2.5 bg-zinc-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">4</span>
            <span>Hit <strong>CASH OUT</strong> at any moment to take <strong>100% pure profit (0% Tax)</strong> directly into your wallet balance!</span>
          </li>
        </ul>

        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-300">
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Provably Fair RNG calculation with real-time responsive road traffic.</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          Got It, Let's Play!
        </button>
      </div>
    </div>
  );
};
