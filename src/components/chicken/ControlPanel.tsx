import React, { useState } from 'react';
import { Difficulty, GameStatus } from '../../types/chickenGame';
import { ChevronDown, Coins } from 'lucide-react';

interface ControlPanelProps {
  betAmount: number;
  setBetAmount: (val: number) => void;
  balance: number;
  difficulty: Difficulty;
  setDifficulty: (val: Difficulty) => void;
  gameStatus: GameStatus;
  currentStep: number;
  currentMultiplier: number;
  maxLanes: number;
  onGo: () => void;
  onCashOut: () => void;
  currencySymbol?: string;
  isProcessing?: boolean;
  isDesktop?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  betAmount,
  setBetAmount,
  balance,
  difficulty,
  setDifficulty,
  gameStatus,
  currentStep,
  currentMultiplier,
  maxLanes,
  onGo,
  onCashOut,
  currencySymbol = '₹',
  isProcessing = false,
  isDesktop = false,
}) => {
  const isPlaying = gameStatus === 'playing';
  const cashoutValue = +(betAmount * currentMultiplier).toFixed(2);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const difficulties: { id: Difficulty; label: string; maxPayout: string }[] = [
    { id: 'easy', label: 'Easy', maxPayout: '15x' },
    { id: 'medium', label: 'Medium', maxPayout: '80x' },
    { id: 'hard', label: 'Hard', maxPayout: '250x' },
    { id: 'hardcore', label: 'Hardcore', maxPayout: '350x' },
  ];

  // Quick preset chips matching the authentic style (10, 20, 50, 100 or 1, 2, 5, 10 relative)
  const presetBets = [10, 20, 50, 100];

  const handleMin = () => {
    if (isPlaying) return;
    setBetAmount(10);
  };

  const handleMax = () => {
    if (isPlaying) return;
    setBetAmount(Math.max(10, Math.floor(balance)));
  };

  return (
    <div
      id="chicken-control-panel-root"
      className={`w-full bg-[#27282e] border border-[#373942] rounded-2xl p-3 sm:p-3.5 shadow-2xl flex flex-col gap-2.5 select-none relative ${
        isDesktop ? 'max-w-md mx-auto' : 'w-full'
      }`}
    >
      {/* ROW 1: Stepper [ MIN ] [ Bet Display / Input ] [ MAX ] */}
      <div
        id="chicken-bet-stepper-row"
        className="h-11 bg-[#33353d] border border-[#40434d] rounded-xl flex items-center justify-between px-1.5 shadow-inner"
      >
        <button
          id="chicken-btn-min"
          type="button"
          disabled={isPlaying}
          onClick={handleMin}
          className="h-8 px-3.5 rounded-lg bg-[#444752] hover:bg-[#4f535f] active:scale-95 text-zinc-200 hover:text-white font-extrabold text-xs tracking-wider uppercase transition shadow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          MIN
        </button>

        <div className="flex-1 flex items-center justify-center px-2">
          <input
            id="chicken-bet-input"
            type="number"
            disabled={isPlaying}
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value) || 10))}
            className="w-full bg-transparent text-center font-mono font-black text-base sm:text-lg text-white focus:outline-none disabled:text-zinc-300"
          />
        </div>

        <button
          id="chicken-btn-max"
          type="button"
          disabled={isPlaying}
          onClick={handleMax}
          className="h-8 px-3.5 rounded-lg bg-[#444752] hover:bg-[#4f535f] active:scale-95 text-zinc-200 hover:text-white font-extrabold text-xs tracking-wider uppercase transition shadow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          MAX
        </button>
      </div>

      {/* ROW 2: 4 Quick Preset Amount Chips [ 10 ₹ ] [ 20 ₹ ] [ 50 ₹ ] [ 100 ₹ ] */}
      <div id="chicken-presets-row" className="grid grid-cols-4 gap-1.5 sm:gap-2 h-9">
        {presetBets.map((amt) => {
          const isSelected = betAmount === amt;
          return (
            <button
              key={amt}
              id={`chicken-chip-${amt}`}
              type="button"
              disabled={isPlaying}
              onClick={() => setBetAmount(amt)}
              className={`h-full rounded-xl font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition-all active:scale-95 shadow ${
                isSelected
                  ? 'bg-[#f5c443] text-zinc-950 font-black shadow-md'
                  : 'bg-[#33353d] hover:bg-[#3d404a] text-zinc-200 border border-[#40434d]/60'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span>{amt}</span>
              <span className="text-[11px] opacity-80">{currencySymbol}</span>
            </button>
          );
        })}
      </div>

      {/* ROW 3: Difficulty Dropdown [ Easy ▾ ] */}
      <div id="chicken-difficulty-container" className="relative h-10">
        <button
          id="chicken-difficulty-trigger"
          type="button"
          disabled={isPlaying}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full h-full bg-[#33353d] hover:bg-[#3d404a] border border-[#40434d] rounded-xl px-3.5 flex items-center justify-between text-zinc-100 font-bold text-xs sm:text-sm transition shadow active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="capitalize">
            {difficulties.find((d) => d.id === difficulty)?.label || 'Easy'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && !isPlaying && (
          <div
            id="chicken-difficulty-menu"
            className="absolute bottom-11 left-0 right-0 z-50 bg-[#2b2c33] border border-[#444754] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#383a45]"
          >
            {difficulties.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setDifficulty(d.id);
                  setDropdownOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between hover:bg-[#3a3c47] transition ${
                  difficulty === d.id ? 'bg-[#383a45] text-[#f5c443]' : 'text-zinc-200'
                }`}
              >
                <span>{d.label}</span>
                <span className="text-[10px] font-mono text-zinc-400">Max {d.maxPayout}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ROW 4: Main Action Buttons (FIXED HEIGHT: Exactly h-14 sm:h-16, 0 movement up/down) */}
      <div id="chicken-action-button-slot" className="w-full h-14 sm:h-16 mt-0.5">
        {!isPlaying ? (
          /* IDLE / BEFORE START: Big Full-Width Green [ Play ] Button */
          <button
            id="chicken-play-btn"
            type="button"
            onClick={onGo}
            disabled={isProcessing}
            className="w-full h-full rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] active:bg-[#15803d] text-white font-black text-xl sm:text-2xl tracking-wide shadow-[0_8px_20px_rgba(34,197,94,0.35)] transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center disabled:opacity-60"
          >
            Play
          </button>
        ) : (
          /* IN-GAME / PLAYING: Side-by-Side Dual Buttons [ CASH OUT ] and [ GO ] */
          <div className="grid grid-cols-2 gap-2 h-full w-full">
            {/* CASH OUT (Dark Golden / Mustard Yellow) */}
            <button
              id="chicken-cashout-btn"
              type="button"
              onClick={onCashOut}
              disabled={currentStep === 0 || isProcessing}
              className={`h-full rounded-2xl flex flex-col items-center justify-center font-black transition-all shadow-lg active:scale-[0.98] cursor-pointer ${
                currentStep > 0
                  ? 'bg-[#c59a3f] hover:bg-[#b58b32] text-zinc-950 shadow-[0_6px_18px_rgba(197,154,63,0.35)]'
                  : 'bg-[#5a4823] text-zinc-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <span className="text-xs sm:text-sm uppercase tracking-wider font-extrabold leading-none">
                CASH OUT
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold mt-0.5">
                {currentStep > 0 ? `${cashoutValue.toFixed(2)} ${currencySymbol}` : `0.00 ${currencySymbol}`}
              </span>
            </button>

            {/* GO (Vibrant Green) */}
            <button
              id="chicken-go-btn"
              type="button"
              onClick={onGo}
              disabled={isProcessing || currentStep >= maxLanes}
              className="h-full rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] active:bg-[#15803d] text-white font-black text-xl sm:text-2xl uppercase tracking-wider shadow-[0_6px_18px_rgba(34,197,94,0.35)] transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center disabled:opacity-60"
            >
              GO
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
