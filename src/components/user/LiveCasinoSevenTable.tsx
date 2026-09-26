import React from 'react';
import dealerIdleImg from '../../assets/images/seven_casino_dealer_idle_1787645253268.jpg';
import dealerDealImg from '../../assets/images/seven_dealer_dealing_1787645278927.jpg';
import { PlayingCard } from './UserSevenUpDownGameView.js';

interface LiveCasinoSevenTableProps {
  phase: 'betting' | 'dealing' | 'result';
  dealingStep: number; // 0: idle, 1: deal card 1, 2: deal card 2, 3: flip card 1, 4: flip card 2, 5: result ready
  countdown: number;
  roundNumber: number;
  clockTime: string;
  card1: PlayingCard | null;
  card2: PlayingCard | null;
  totalResult: {
    sum: number;
    zone: 'down' | 'seven' | 'up';
    card1: PlayingCard;
    card2: PlayingCard;
  } | null;
  history: { zone: 'down' | 'seven' | 'up'; rank: string; symbol: string; color: string }[];
  bets: Record<string, number>;
  onPlaceBet: (key: string) => void;
}

export const LiveCasinoSevenTable: React.FC<LiveCasinoSevenTableProps> = ({
  phase,
  dealingStep,
  countdown,
  roundNumber,
  clockTime,
  card1,
  card2,
  totalResult,
  history,
  bets,
  onPlaceBet,
}) => {
  const isDealingCard1 = dealingStep === 1;
  const isDealingCard2 = dealingStep === 2;
  const isFlippingCard1 = dealingStep >= 3 && card1 !== null;
  const isFlippingCard2 = dealingStep >= 4 && card2 !== null;
  const isResultReady = dealingStep >= 5 && totalResult !== null;

  // Realistic Casino Playing Card Front
  const renderCardFront = (card: PlayingCard) => {
    const isRed = card.color === 'red';
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#ffffff] via-[#faf7f2] to-[#ede4d3] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between select-none shadow-[0_10px_25px_rgba(0,0,0,0.8)] border border-amber-200/60 ring-1 ring-black/10">
        {/* Top left rank & suit */}
        <div className={`text-left leading-none font-black ${isRed ? 'text-rose-600' : 'text-zinc-950'}`}>
          <div className="text-sm sm:text-xl font-mono tracking-tight font-extrabold">{card.rank}</div>
          <div className="text-xs sm:text-base leading-none mt-0.5">{card.suitSymbol}</div>
        </div>

        {/* Center suit emblem */}
        <div className="flex flex-col items-center justify-center my-auto">
          <span className={`text-3xl sm:text-5xl font-black drop-shadow-sm ${isRed ? 'text-rose-600' : 'text-zinc-950'}`}>
            {card.suitSymbol}
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-zinc-500 mt-0.5">
            {card.value}
          </span>
        </div>

        {/* Bottom right inverted */}
        <div className={`text-right leading-none font-black rotate-180 ${isRed ? 'text-rose-600' : 'text-zinc-950'}`}>
          <div className="text-sm sm:text-xl font-mono tracking-tight font-extrabold">{card.rank}</div>
          <div className="text-xs sm:text-base leading-none mt-0.5">{card.suitSymbol}</div>
        </div>
      </div>
    );
  };

  // Realistic Casino Playing Card Back
  const renderCardBack = () => {
    return (
      <div className="w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#851818] via-[#a31c1c] to-[#540c0c] border-2 border-amber-400/90 p-1 shadow-[0_10px_25px_rgba(0,0,0,0.85)] flex items-center justify-center">
        <div className="w-full h-full border border-amber-300/50 rounded-lg sm:rounded-xl bg-[#5e0e0e] flex flex-col items-center justify-center p-1 relative overflow-hidden">
          {/* Filigree pattern */}
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#f59e0b_1.2px,transparent_1.2px)] [background-size:5px_5px]" />
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-amber-400/80 bg-amber-950/80 flex items-center justify-center text-amber-300 text-xs sm:text-sm font-serif shadow-inner">
            👑
          </div>
          <span className="text-[7px] sm:text-[8px] font-mono tracking-widest text-amber-300 font-bold mt-1 uppercase">
            CASINO
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto bg-[#07090e] overflow-hidden shadow-2xl border-b border-[#232738] select-none">
      {/* 1. REAL STUDIO CASINO ENVIRONMENT & DEALER BACKGROUND */}
      <div className="relative w-full min-h-[380px] sm:min-h-[440px] aspect-[16/11] sm:aspect-[16/9] overflow-hidden bg-black flex flex-col justify-between">
        {/* Female Dealer Live Photos (Clean Studio Look) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Dealer Idle Background Image */}
          <img
            src={dealerIdleImg}
            alt="Live 7 Up Down Dealer"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ${
              isDealingCard1 || isDealingCard2 ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            } animate-dealer-breathe`}
          />

          {/* Dealer Active Dealing Action Image */}
          <img
            src={dealerDealImg}
            alt="Live 7 Up Down Dealer Dealing"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500 ${
              isDealingCard1 || isDealingCard2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          />

          {/* Natural Dealer Blinking Eyelid Layer */}
          <div
            className="absolute top-[27%] left-[49.7%] -translate-x-1/2 w-7 h-2 bg-black/30 blur-[1px] rounded-full animate-dealer-blink pointer-events-none"
            style={{ animationDelay: '3s' }}
          />

          {/* Clean studio ambient warmth & gentle lighting tone */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#04130e]/95 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* 2. TOP HUD: STUDIO DIGITAL CLOCK & ROUND DETAILS */}
        <div className="relative z-20 pt-2.5 px-3 flex items-start justify-between">
          {/* Digital Clock & Round details */}
          <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-left font-mono shadow-xl">
            <div className="text-xs sm:text-sm font-black text-amber-400 tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              {clockTime}
            </div>
            <div className="text-[10px] text-zinc-300 font-bold mt-0.5">
              Table #701 · Round #{roundNumber}
            </div>
          </div>

          {/* Live Round Countdown & Status Pill */}
          <div
            className={`px-3 sm:px-4 py-1.5 rounded-2xl backdrop-blur-md border text-center shadow-2xl transition-all ${
              phase === 'betting'
                ? 'bg-black/85 border-emerald-400/90 text-emerald-300 ring-2 ring-emerald-500/30'
                : phase === 'dealing'
                ? 'bg-black/85 border-amber-400/90 text-amber-300 ring-2 ring-amber-500/30'
                : 'bg-black/85 border-rose-400/90 text-rose-300 ring-2 ring-rose-500/30'
            }`}
          >
            <div className="text-xs sm:text-sm font-mono font-black tracking-widest uppercase flex items-center justify-center gap-1.5">
              {phase === 'betting' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>0:{String(countdown).padStart(2, '0')}</span>
                </>
              ) : phase === 'dealing' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin" />
                  <span>DEALING...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>ROUND CLOSED</span>
                </>
              )}
            </div>
            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mt-0.5 text-zinc-300">
              {phase === 'betting'
                ? 'Betting Open'
                : phase === 'dealing'
                ? 'Betting Closed'
                : 'Result Declared'}
            </div>
          </div>
        </div>

        {/* 3. CASINO SHOE (LEFT CORNER) */}
        <div className="absolute top-[48%] left-3 sm:left-6 z-20 pointer-events-none flex flex-col items-center">
          <div className="w-11 h-16 sm:w-14 sm:h-20 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black rounded-lg border border-amber-500/50 shadow-2xl transform -rotate-12 flex flex-col justify-between p-1.5">
            <div className="w-full h-1 bg-amber-400/60 rounded-full" />
            <div className="text-[7px] sm:text-[9px] text-amber-300 font-mono font-black text-center uppercase tracking-widest">
              SHOE
            </div>
            <div className="w-full h-2.5 bg-red-900 rounded border border-amber-400/40" />
          </div>
        </div>

        {/* 4. AUTHENTIC GREEN FELT TABLE MAT & DEALING AREA */}
        <div className="relative z-10 w-full mt-auto mb-10 px-2 sm:px-6 flex flex-col items-center">
          {/* Green Casino Table Felt Border & Texture */}
          <div className="w-full max-w-2xl bg-gradient-to-b from-[#093d2c]/95 via-[#072d20] to-[#041d15] border-2 border-amber-500/60 rounded-3xl p-3 sm:p-5 shadow-[0_-10px_35px_rgba(0,0,0,0.85)] relative overflow-hidden backdrop-blur-sm">
            {/* Felt Texture Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#155c44_1.5px,transparent_1.5px)] [background-size:10px_10px] opacity-40 pointer-events-none" />
            
            {/* Gold Arc Trim Line on Felt */}
            <div className="absolute -top-12 left-8 right-8 h-20 border-b border-amber-400/30 rounded-b-full pointer-events-none" />

            {/* TABLE TOP ODDS TILES: 7 DOWN | [ 7 ] | 7 UP */}
            <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 mb-3">
              {/* 7 Down Felt Button */}
              <div
                onClick={() => onPlaceBet('zone_down')}
                className={`px-3 sm:px-5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs ${
                  totalResult?.zone === 'down' && isResultReady
                    ? 'bg-blue-600/70 border-blue-300 text-white ring-2 ring-blue-300 scale-105 shadow-[0_0_20px_rgba(59,130,246,0.8)]'
                    : bets.zone_down
                    ? 'bg-blue-950/70 border-blue-400 text-blue-200 ring-1 ring-blue-400'
                    : 'bg-black/50 border-white/20 text-zinc-200 hover:border-blue-400/60'
                }`}
              >
                <span className="text-[11px] sm:text-xs font-black tracking-wider">7 DOWN</span>
                <span className="text-[9px] sm:text-[10px] text-blue-300 font-mono font-bold">1.98X</span>
                {bets.zone_down > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[9px] font-mono">
                    ₹{bets.zone_down}
                  </span>
                )}
              </div>

              {/* Exact 7 Felt Button */}
              <div
                onClick={() => onPlaceBet('zone_seven')}
                className={`px-3 sm:px-5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs ${
                  totalResult?.zone === 'seven' && isResultReady
                    ? 'bg-amber-600/70 border-amber-300 text-white ring-2 ring-amber-300 scale-105 shadow-[0_0_25px_rgba(245,158,11,0.9)]'
                    : bets.zone_seven
                    ? 'bg-amber-950/70 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                    : 'bg-black/50 border-red-500/50 text-red-400 hover:border-amber-400/60'
                }`}
              >
                <span className="text-xs sm:text-sm font-black font-mono tracking-wider">[ 7 ]</span>
                <span className="text-[9px] sm:text-[10px] text-amber-300 font-mono font-bold">12.0X</span>
                {bets.zone_seven > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[9px] font-mono">
                    ₹{bets.zone_seven}
                  </span>
                )}
              </div>

              {/* 7 Up Felt Button */}
              <div
                onClick={() => onPlaceBet('zone_up')}
                className={`px-3 sm:px-5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs ${
                  totalResult?.zone === 'up' && isResultReady
                    ? 'bg-emerald-600/70 border-emerald-300 text-white ring-2 ring-emerald-300 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.8)]'
                    : bets.zone_up
                    ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                    : 'bg-black/50 border-white/20 text-zinc-200 hover:border-emerald-400/60'
                }`}
              >
                <span className="text-[11px] sm:text-xs font-black tracking-wider">7 UP</span>
                <span className="text-[9px] sm:text-[10px] text-emerald-300 font-mono font-bold">1.98X</span>
                {bets.zone_up > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[9px] font-mono">
                    ₹{bets.zone_up}
                  </span>
                )}
              </div>
            </div>

            {/* 100% FULLY VISIBLE CARD DEALING SPOTS */}
            <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-8 py-1">
              {/* CARD 1 POSITION */}
              <div className="relative w-20 h-28 sm:w-28 sm:h-38 rounded-xl sm:rounded-2xl border-2 border-dashed border-amber-400/40 flex items-center justify-center bg-black/40 perspective-1000 shadow-inner">
                {/* Empty spot watermark */}
                {!card1 && (
                  <div className="text-center opacity-40 text-amber-200">
                    <span className="text-[10px] sm:text-xs font-mono font-bold block">CARD 1</span>
                    <span className="text-xl sm:text-2xl mt-0.5 block">🂠</span>
                  </div>
                )}

                {/* Card 1 Physical Entity on Table */}
                {card1 && (
                  <div
                    className={`w-full h-full relative preserve-3d transition-transform duration-700 ${
                      isDealingCard1 ? 'animate-deal-card-1' : ''
                    } ${isFlippingCard1 ? 'rotate-y-180' : ''}`}
                  >
                    {/* Face Down Back */}
                    <div className="absolute inset-0 backface-hidden">
                      {renderCardBack()}
                    </div>

                    {/* Face Up Front */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                      {renderCardFront(card1)}
                    </div>
                  </div>
                )}
              </div>

              {/* PLUS SIGN */}
              <div className="text-amber-400/90 font-black text-base sm:text-2xl font-mono">
                +
              </div>

              {/* CARD 2 POSITION */}
              <div className="relative w-20 h-28 sm:w-28 sm:h-38 rounded-xl sm:rounded-2xl border-2 border-dashed border-amber-400/40 flex items-center justify-center bg-black/40 perspective-1000 shadow-inner">
                {/* Empty spot watermark */}
                {!card2 && (
                  <div className="text-center opacity-40 text-amber-200">
                    <span className="text-[10px] sm:text-xs font-mono font-bold block">CARD 2</span>
                    <span className="text-xl sm:text-2xl mt-0.5 block">🂠</span>
                  </div>
                )}

                {/* Card 2 Physical Entity on Table */}
                {card2 && (
                  <div
                    className={`w-full h-full relative preserve-3d transition-transform duration-700 ${
                      isDealingCard2 ? 'animate-deal-card-2' : ''
                    } ${isFlippingCard2 ? 'rotate-y-180' : ''}`}
                  >
                    {/* Face Down Back */}
                    <div className="absolute inset-0 backface-hidden">
                      {renderCardBack()}
                    </div>

                    {/* Face Up Front */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                      {renderCardFront(card2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5. RESULT OUTCOME BANNER OVERLAY WHEN RESULT DECLARED */}
        {isResultReady && totalResult && (
          <div className="absolute top-[35%] sm:top-[38%] left-0 right-0 z-30 flex items-center justify-center pointer-events-none animate-fadeIn">
            <div className="px-4 sm:px-6 py-2 rounded-2xl bg-black/95 border-2 border-amber-400 backdrop-blur-md text-center shadow-[0_0_35px_rgba(245,158,11,0.8)] flex items-center gap-3">
              <div className="text-left font-mono">
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">
                  {totalResult.card1.rank}{totalResult.card1.suitSymbol} + {totalResult.card2.rank}{totalResult.card2.suitSymbol}
                </span>
                <span className="text-xs sm:text-sm font-black text-white">
                  Total: <strong className="text-amber-400 text-base sm:text-lg">{totalResult.sum}</strong>
                </span>
              </div>
              <div className="h-7 w-px bg-white/20" />
              <div className="text-left">
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">Outcome</span>
                <span
                  className={`text-sm sm:text-base font-black uppercase tracking-wider font-mono ${
                    totalResult.zone === 'seven'
                      ? 'text-amber-300'
                      : totalResult.zone === 'up'
                      ? 'text-emerald-300'
                      : 'text-blue-300'
                  }`}
                >
                  {totalResult.zone === 'seven'
                    ? '★ EXACT 7 ★'
                    : totalResult.zone === 'up'
                    ? '7 UP (HIGH)'
                    : '7 DOWN (LOW)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 6. ROAD HISTORY STRIP DOCKED CLEANLY AT BOTTOM OF VIDEO CONTAINER */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-md px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-white/10 scrollbar-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1 shrink-0 font-mono">
            ROAD:
          </span>
          {history.map((h, i) => (
            <div
              key={`hist-${i}-${h.rank}-${h.symbol}-${h.zone}`}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md font-mono font-black text-[10px] flex items-center justify-center shrink-0 border transition-all ${
                h.zone === 'down'
                  ? 'bg-blue-900/70 text-blue-300 border-blue-500/60'
                  : h.zone === 'up'
                  ? 'bg-emerald-900/70 text-emerald-300 border-emerald-500/60'
                  : 'bg-amber-900/70 text-amber-300 border-amber-500/80 ring-1 ring-amber-400'
              }`}
              title={`${h.rank}${h.symbol} (${h.zone.toUpperCase()})`}
            >
              {h.zone === 'down' ? '7D' : h.zone === 'up' ? '7U' : '7'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
