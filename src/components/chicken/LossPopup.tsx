import React from 'react';

interface LossPopupProps {
  isOpen: boolean;
  lostAmount: number;
  currencySymbol?: string;
  onRestartNow?: () => void;
  restartCountdown?: number;
}

export const LossPopup: React.FC<LossPopupProps> = ({
  isOpen,
  lostAmount,
  currencySymbol = '₹',
  onRestartNow,
  restartCountdown = 3
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[360px] animate-in slide-in-from-top-6 duration-300 pointer-events-auto">
      <div className="bg-gradient-to-b from-[#2b1013] via-[#1a0c0f] to-[#12080a] border-2 border-red-500/90 rounded-2xl p-3.5 shadow-[0_10px_35px_rgba(239,68,68,0.5)] flex flex-col items-center gap-2 backdrop-blur-md">
        <div className="flex items-center justify-between w-full border-b border-red-500/30 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">💥</span>
            <span className="text-red-400 font-black text-sm uppercase tracking-wider">
              ROUND LOST!
            </span>
          </div>
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>🪶</span> CRASH
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 py-1">
          <span className="text-zinc-400 text-xs font-semibold">You Lost:</span>
          <span className="text-red-400 font-black font-mono text-xl drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]">
            -{lostAmount.toFixed(2)} {currencySymbol}
          </span>
        </div>

        <div className="w-full flex items-center justify-between bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2 text-xs">
          <span className="text-zinc-400 text-[11px] flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Auto restarting in <strong className="text-amber-300 font-mono font-black text-sm">{restartCountdown}s</strong>
          </span>

          <button
            onClick={onRestartNow}
            className="bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-lg transition-all shadow cursor-pointer"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
