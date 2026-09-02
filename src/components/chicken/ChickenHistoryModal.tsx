import React from 'react';
import { X, History, TrendingUp, TrendingDown } from 'lucide-react';
import { RoundHistoryItem } from '../../types/chickenGame';

interface ChickenHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: RoundHistoryItem[];
  currencySymbol?: string;
}

export const ChickenHistoryModal: React.FC<ChickenHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  currencySymbol = '₹'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141824] border border-[#f5c443]/30 rounded-3xl max-w-md w-full p-5 space-y-3.5 text-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-base text-[#fce08b]">Chicken Road History</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto space-y-2 no-scrollbar pr-1">
          {history.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-xs font-semibold">
              No rounds played yet. Place a bet and cross the road!
            </div>
          ) : (
            history.map((item) => {
              const isWon = item.status === 'won';
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isWon
                      ? 'bg-emerald-950/40 border-emerald-500/30'
                      : 'bg-rose-950/40 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${
                        isWon ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isWon ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="capitalize">{item.difficulty}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                          L{item.stepReached}/{item.totalLanes}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Bet: {currencySymbol}{item.bet.toFixed(2)} {isWon && `• ${item.multiplier.toFixed(2)}x`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className={`text-sm font-black ${isWon ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWon ? `+${currencySymbol}${item.profit.toFixed(2)}` : `-${currencySymbol}${item.bet.toFixed(2)}`}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
