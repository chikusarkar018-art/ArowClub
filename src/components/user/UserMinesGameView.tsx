import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  ChevronLeft, Volume2, VolumeX, HelpCircle, Shield,
  RotateCcw, Sparkles, Trophy, Award, X, Shuffle,
  Zap, ChevronDown, Check, Star, RefreshCw
} from 'lucide-react';
import { minesAudio } from '../../utils/minesAudio.js';

interface UserMinesGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
}

interface TileState {
  index: number;
  revealed: boolean;
  isMine: boolean;
}

export const UserMinesGameView: React.FC<UserMinesGameViewProps> = ({
  onBack,
  onNavigateDeposit,
}) => {
  const { user, refreshUser, showToast } = useAuth();

  // Sound Settings
  const [isMuted, setIsMuted] = useState(false);

  // Game Settings & State
  const [roundId, setRoundId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('arowclub_mines_round_counter');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return 1001;
  });
  const [betAmount, setBetAmount] = useState<number>(50);
  const [numMines, setNumMines] = useState<number>(2); // Default to 2 mines like Spribe screenshot!
  const [showMinesDropdown, setShowMinesDropdown] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [isAutoGame, setIsAutoGame] = useState<boolean>(false);

  // Tiles grid (5x5 = 25 tiles)
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [revealedGemsCount, setRevealedGemsCount] = useState<number>(0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.00);
  const [nextMultiplier, setNextMultiplier] = useState<number>(1.14);

  // Modals & UI
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [recentWin, setRecentWin] = useState<{ amount: number; multiplier: number } | null>(null);

  const minesOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 24];

  // Sync Audio Mute
  useEffect(() => {
    minesAudio.setMuted(isMuted);
  }, [isMuted]);

  // Calculate multiplier mathematically based on remaining tiles and mines (97.5% Spribe RTP formula)
  const calculateMultiplier = (revealed: number, mines: number): number => {
    if (revealed === 0) return 1.00;
    const totalTiles = 25;
    const houseRTP = 0.975;
    let prob = 1;
    for (let i = 0; i < revealed; i++) {
      prob *= (totalTiles - mines - i) / (totalTiles - i);
    }
    const rawMult = (1 / prob) * houseRTP;
    return Math.max(1.01, parseFloat(rawMult.toFixed(2)));
  };

  // Initialize fresh 5x5 grid
  const initializeGrid = () => {
    const newTiles: TileState[] = [];
    for (let i = 0; i < 25; i++) {
      newTiles.push({
        index: i,
        revealed: false,
        isMine: false,
      });
    }
    setTiles(newTiles);
    setRevealedGemsCount(0);
    setCurrentMultiplier(1.00);
    setNextMultiplier(calculateMultiplier(1, numMines));
    setIsPlaying(false);
    setGameOver(false);
    setGameWon(false);
  };

  useEffect(() => {
    initializeGrid();
  }, []);

  // Update next multiplier when mine count changes
  useEffect(() => {
    if (!isPlaying) {
      setNextMultiplier(calculateMultiplier(1, numMines));
    }
  }, [numMines]);

  // Start Mines Game
  const handleStartGame = async () => {
    minesAudio.playClickSound();
    if (!user) {
      showToast('Please log in to play Mines', 'error');
      return;
    }
    if (betAmount < 10) {
      showToast('Minimum bet amount is ₹10', 'error');
      return;
    }
    if (user.walletBalance < betAmount) {
      showToast('Insufficient balance. Please recharge.', 'error');
      onNavigateDeposit();
      return;
    }

    setRecentWin(null);

    // Deduct balance
    const res = await api.updateWalletBalance(user.id, -betAmount, 'bet');
    if (!res.success) {
      showToast(res.message || 'Failed to place bet', 'error');
      return;
    }
    await refreshUser();

    // Randomly place hidden mines
    const mineIndices = new Set<number>();
    while (mineIndices.size < numMines) {
      mineIndices.add(Math.floor(Math.random() * 25));
    }

    const newTiles: TileState[] = [];
    for (let i = 0; i < 25; i++) {
      newTiles.push({
        index: i,
        revealed: false,
        isMine: mineIndices.has(i),
      });
    }

    setTiles(newTiles);
    setRevealedGemsCount(0);
    setCurrentMultiplier(1.00);
    setNextMultiplier(calculateMultiplier(1, numMines));
    setIsPlaying(true);
    setGameOver(false);
    setGameWon(false);
  };

  // Click on a tile
  const handleTileClick = (index: number) => {
    if (!isPlaying || gameOver || gameWon) return;
    const tile = tiles[index];
    if (tile.revealed) return;

    if (tile.isMine) {
      // Hit a mine!
      minesAudio.playMineSound();
      const updated = tiles.map(t => ({
        ...t,
        revealed: true,
      }));
      setTiles(updated);
      setIsPlaying(false);
      setGameOver(true);

      if (user) {
        api.recordGameBet({
          userId: user.id,
          gameType: 'mines' as any,
          periodId: `${roundId}`,
          betColor: undefined,
          betNumber: undefined,
          betBigSmall: undefined,
          unitAmount: betAmount,
          multiplier: 1,
          totalAmount: betAmount,
          status: 'lost',
          winAmount: 0,
        });
      }
      setRoundId(prev => {
        const next = prev + 1;
        try { localStorage.setItem('arowclub_mines_round_counter', String(next)); } catch {}
        return next;
      });

      showToast('💥 Mine exploded! Round ended.', 'error');
    } else {
      // Star uncovered!
      const newRevealedCount = revealedGemsCount + 1;
      const newMult = calculateMultiplier(newRevealedCount, numMines);
      const nextMult = calculateMultiplier(newRevealedCount + 1, numMines);

      minesAudio.playStarSound(newRevealedCount - 1);
      setRevealedGemsCount(newRevealedCount);
      setCurrentMultiplier(newMult);
      setNextMultiplier(nextMult);

      const updated = tiles.map(t =>
        t.index === index ? { ...t, revealed: true } : t
      );
      setTiles(updated);

      // Max stars achieved (cleared whole board)
      const maxGems = 25 - numMines;
      if (newRevealedCount >= maxGems) {
        handleCashOut(newMult);
      }
    }
  };

  // Pick a Random Tile
  const handlePickRandom = () => {
    if (!isPlaying || gameOver || gameWon) {
      if (!isPlaying) {
        handleStartGame();
      }
      return;
    }

    const unrevealedIndices = tiles
      .filter(t => !t.revealed)
      .map(t => t.index);

    if (unrevealedIndices.length === 0) return;

    const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    handleTileClick(randomIndex);
  };

  // Cash Out & Win
  const handleCashOut = async (finalMult?: number) => {
    if (!isPlaying || gameOver || revealedGemsCount === 0) return;
    const multToUse = finalMult || currentMultiplier;
    const winAmount = parseFloat((betAmount * multToUse).toFixed(2));

    minesAudio.playCashoutSound();
    setIsPlaying(false);
    setGameWon(true);
    setRecentWin({ amount: winAmount, multiplier: multToUse });

    // Reveal rest of board softly
    setTiles(prev => prev.map(t => ({ ...t, revealed: true })));

    if (user) {
      await api.updateWalletBalance(user.id, winAmount, 'win');
      await api.recordGameBet({
        userId: user.id,
        gameType: 'mines' as any,
        periodId: `${roundId}`,
        betColor: undefined,
        betNumber: undefined,
        betBigSmall: undefined,
        unitAmount: betAmount,
        multiplier: 1,
        totalAmount: betAmount,
        status: 'won',
        winAmount,
      });
      await refreshUser();
    }

    setRoundId(prev => {
      const next = prev + 1;
      try { localStorage.setItem('arowclub_mines_round_counter', String(next)); } catch {}
      return next;
    });

    showToast(`🎉 Cashed out ₹${winAmount.toFixed(2)} (${multToUse.toFixed(2)}x)!`, 'success');
  };

  const nextWinValue = (betAmount * nextMultiplier).toFixed(2);
  const currentCashoutValue = (betAmount * currentMultiplier).toFixed(2);

  return (
    <div className="min-h-screen bg-[#051c5e] bg-gradient-to-b from-[#0a2e7a] via-[#051c5e] to-[#020d2d] text-white flex flex-col font-sans select-none overflow-x-hidden relative">
      
      {/* Background Floating Star / Snowflake Watermark Accents (Like Spribe Mines) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <Star className="absolute -left-12 top-1/4 w-64 h-64 text-sky-400 stroke-[1.5]" />
        <div className="absolute -right-16 top-1/3 w-72 h-72 rounded-full border-8 border-dashed border-sky-400" />
        <Star className="absolute right-6 bottom-16 w-48 h-48 text-sky-300 stroke-[1]" />
      </div>

      {/* TOP HEADER (Spribe Style) */}
      <header className="px-3 sm:px-6 py-2.5 flex items-center justify-between z-40 bg-[#062468]/90 backdrop-blur-md border-b border-sky-500/20 shadow-md">
        
        {/* Left: Back / MINES logo pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d348a] hover:bg-[#1342a8] text-white font-black text-xs sm:text-sm rounded-lg border border-sky-400/30 shadow transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="tracking-wider">MINES</span>
            <ChevronDown className="w-3 h-3 text-sky-300 ml-0.5 opacity-70" />
          </button>

          {/* How to Play? Orange Pill */}
          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs rounded-full shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-zinc-950/20 flex items-center justify-center text-[10px] font-black">?</span>
            <span className="font-extrabold tracking-wide">How to Play?</span>
          </button>
        </div>

        {/* Right: Balance Pill & Sound controls */}
        <div className="flex items-center gap-2">
          
          {/* User Balance Badge */}
          <div
            onClick={onNavigateDeposit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#092b75] border border-sky-400/30 rounded-lg shadow-inner cursor-pointer hover:border-amber-400 transition"
            title="Click to Deposit"
          >
            <span className="font-mono font-black text-xs sm:text-sm text-zinc-100">
              ₹{(user?.walletBalance ?? 0).toFixed(2)}
            </span>
            <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20 uppercase">
              +
            </span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-lg bg-[#0d348a] border border-sky-400/20 flex items-center justify-center text-sky-200 hover:text-white transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
          </button>
        </div>
      </header>

      {/* MAIN GAME WRAPPER */}
      <main className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 max-w-xl mx-auto w-full z-10">
        
        {/* SUB-HEADER: Mines Count Selector & Next Multiplier Pill */}
        <div className="w-full flex items-center justify-between px-2 sm:px-4 py-1.5 my-1">
          
          {/* Mines Selector Dropdown / Pill */}
          <div className="relative">
            <button
              disabled={isPlaying}
              onClick={() => setShowMinesDropdown(!showMinesDropdown)}
              className={`flex items-center gap-2 px-3.5 py-1.5 bg-[#092c7a] border border-sky-400/30 rounded-xl shadow text-xs sm:text-sm font-black transition cursor-pointer ${
                isPlaying ? 'opacity-80 cursor-not-allowed' : 'hover:border-sky-300'
              }`}
            >
              <span className="text-sky-300 font-bold">Mines:</span>
              <span className="text-white font-black font-mono">{numMines}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-sky-300 transition-transform ${showMinesDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Subtle active green bar indicator beneath Mines */}
            <div className="w-full h-0.5 bg-emerald-400 rounded-full mt-0.5 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />

            {/* Dropdown Menu */}
            {showMinesDropdown && !isPlaying && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-[#0a276b] border border-sky-400/40 rounded-2xl shadow-2xl p-2 z-50 grid grid-cols-4 gap-1.5">
                {minesOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setNumMines(opt);
                      setShowMinesDropdown(false);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-mono font-black transition cursor-pointer ${
                      numMines === opt
                        ? 'bg-amber-500 text-zinc-950 shadow-md scale-105'
                        : 'bg-[#0f348a] text-sky-200 hover:bg-[#1643ab] hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Next Multiplier / Payout Banner Pill (Spribe Golden Yellow) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 rounded-xl font-mono font-black text-xs sm:text-sm shadow-md">
            <span className="text-[11px] font-bold uppercase tracking-tight text-zinc-900/80">Next:</span>
            <span>₹{nextWinValue} ({nextMultiplier.toFixed(2)}x)</span>
          </div>
        </div>

        {/* 5x5 MINES GAME BOARD */}
        <div className="w-full max-w-[360px] sm:max-w-[400px] aspect-square p-2.5 sm:p-3 bg-[#031542]/90 border border-sky-500/30 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-sm relative flex items-center justify-center">
          
          <div className="grid grid-cols-5 grid-rows-5 gap-2 sm:gap-2.5 w-full h-full">
            {tiles.map((tile) => {
              const isRevealed = tile.revealed;
              const isMine = tile.isMine;

              return (
                <button
                  key={tile.index}
                  onClick={() => handleTileClick(tile.index)}
                  disabled={!isPlaying || isRevealed}
                  className={`aspect-square w-full h-full rounded-xl sm:rounded-2xl transition-all duration-150 flex items-center justify-center select-none p-0 relative overflow-hidden cursor-pointer ${
                    // REVEALED TILE STYLING
                    isRevealed
                      ? isMine
                        ? 'bg-gradient-to-b from-rose-600 to-rose-900 border-2 border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.7)]'
                        : 'bg-[#ff7a00] border-2 border-[#ffae19] shadow-[0_0_16px_rgba(255,122,0,0.6)]'
                      // UNOPENED TILE STYLING (Spribe Authentic Beveled Deep Navy 3D Tiles)
                      : isPlaying
                      ? 'bg-[#0b2b73] hover:bg-[#10378f] border border-[#1b51c4] hover:border-[#2a6fed] shadow-[inset_0_2px_4px_rgba(255,255,255,0.12),0_3px_6px_rgba(0,0,0,0.3)] active:scale-[0.97]'
                      : 'bg-[#092564] border border-[#1442a3]/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.25)] opacity-90'
                  }`}
                >
                  {isRevealed ? (
                    isMine ? (
                      // Bomb fitted cleanly inside the box
                      <div className="flex items-center justify-center w-full h-full animate-bounce">
                        <span className="text-xl sm:text-2xl filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">💣</span>
                      </div>
                    ) : (
                      // Spribe Star fitted perfectly inside the box with clean padding
                      <div className="flex items-center justify-center w-full h-full">
                        <svg
                          viewBox="0 0 24 24"
                          fill="white"
                          className="w-5 h-5 sm:w-6 sm:h-6 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    )
                  ) : (
                    // Unopened Tile Inner Dot Indent
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#05163d] border border-sky-400/40 shadow-inner flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-sky-300/40" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Win Result Modal Overlay */}
          {recentWin && (
            <div className="absolute inset-0 bg-[#030f2c]/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-4 z-30 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 mb-2 shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-300">CONGRATULATIONS!</span>
              <span className="text-3xl sm:text-4xl font-mono font-black text-white my-1">
                ₹{recentWin.amount.toFixed(2)}
              </span>
              <span className="px-3 py-1 bg-amber-500 text-zinc-950 rounded-full font-black text-xs font-mono">
                {recentWin.multiplier.toFixed(2)}x MULTIPLIER
              </span>
              <button
                onClick={() => setRecentWin(null)}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg cursor-pointer"
              >
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>

        {/* SUB-GRID CONTROLS: RANDOM Button, Refresh & Auto-game Toggle */}
        <div className="w-full flex items-center justify-between px-2 sm:px-4 py-2 mt-1">
          
          {/* RANDOM Tile Picker Pill Button */}
          <button
            onClick={handlePickRandom}
            className="flex-1 max-w-[140px] py-1.5 bg-[#092b75] hover:bg-[#113a96] border border-sky-400/40 hover:border-sky-300 rounded-full text-xs font-black text-sky-100 shadow flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-sky-300" />
            <span className="tracking-wider">RANDOM</span>
          </button>

          {/* Reset / Clean Board Icon */}
          <button
            disabled={isPlaying}
            onClick={initializeGrid}
            className="w-8 h-8 rounded-full bg-[#092b75] border border-sky-400/30 flex items-center justify-center text-sky-200 hover:text-white transition active:scale-95 disabled:opacity-40 cursor-pointer"
            title="Reset Board"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Auto-game Switch */}
          <div
            onClick={() => setIsAutoGame(!isAutoGame)}
            className="flex items-center gap-2 px-3 py-1 bg-[#092b75]/80 border border-sky-400/20 rounded-full cursor-pointer hover:border-sky-400 transition"
          >
            <div className={`w-8 h-4 rounded-full transition-colors flex items-center p-0.5 ${isAutoGame ? 'bg-amber-500' : 'bg-sky-950 border border-sky-400/30'}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isAutoGame ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-[11px] font-bold text-sky-200">Auto-game</span>
          </div>
        </div>

        {/* BOTTOM CONTROL BAR (Spribe Signature Layout) */}
        <div className="w-full bg-[#061e57] border border-sky-400/30 rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-2xl mt-1">
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            
            {/* Left: Bet Amount & Steppers & Preset Quick Multipliers */}
            <div className="sm:col-span-7 flex flex-col gap-1.5">
              
              <div className="flex items-center gap-1.5 bg-[#031133] border border-sky-500/30 rounded-xl p-1 shadow-inner">
                
                {/* Minus Button */}
                <button
                  disabled={isPlaying}
                  onClick={() => setBetAmount(prev => Math.max(10, prev - 10))}
                  className="w-8 h-8 rounded-lg bg-[#0d2f78] hover:bg-[#133d99] text-white font-bold flex items-center justify-center transition active:scale-90 disabled:opacity-40 cursor-pointer"
                >
                  -
                </button>

                {/* Bet Input with Label */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-black text-sky-300/80 uppercase tracking-widest leading-none">
                    BET, INR
                  </span>
                  <input
                    type="number"
                    value={betAmount}
                    disabled={isPlaying}
                    onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value) || 10))}
                    className="w-full bg-transparent text-center font-mono font-black text-base text-white focus:outline-none leading-tight"
                  />
                </div>

                {/* Plus Button */}
                <button
                  disabled={isPlaying}
                  onClick={() => setBetAmount(prev => prev + 10)}
                  className="w-8 h-8 rounded-lg bg-[#0d2f78] hover:bg-[#133d99] text-white font-bold flex items-center justify-center transition active:scale-90 disabled:opacity-40 cursor-pointer"
                >
                  +
                </button>

                {/* Preset Chips (1/2, 2X, Min, Max) */}
                <div className="flex items-center gap-1 pl-1 border-l border-sky-500/20">
                  <button
                    disabled={isPlaying}
                    onClick={() => setBetAmount(prev => Math.max(10, Math.floor(prev / 2)))}
                    className="px-2 py-1.5 bg-[#09235e] hover:bg-[#103387] rounded-lg text-[10px] font-mono font-bold text-sky-200 disabled:opacity-40 cursor-pointer"
                  >
                    ½
                  </button>
                  <button
                    disabled={isPlaying}
                    onClick={() => setBetAmount(prev => prev * 2)}
                    className="px-2 py-1.5 bg-[#09235e] hover:bg-[#103387] rounded-lg text-[10px] font-mono font-bold text-sky-200 disabled:opacity-40 cursor-pointer"
                  >
                    2×
                  </button>
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div className="grid grid-cols-5 gap-1">
                {[50, 100, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    disabled={isPlaying}
                    onClick={() => setBetAmount(amt)}
                    className={`py-1 rounded-lg text-[11px] font-mono font-bold transition border cursor-pointer ${
                      betAmount === amt
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black shadow'
                        : 'bg-[#082261] text-sky-200 border-sky-500/20 hover:bg-[#103387] hover:text-white disabled:opacity-40'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Middle: Turbo Spin Action Icon (Optional) */}
            <div className="hidden sm:flex sm:col-span-1 items-center justify-center">
              <button
                onClick={handlePickRandom}
                className="w-10 h-10 rounded-full bg-[#0a2e7a] hover:bg-[#1242a8] border border-sky-400/40 flex items-center justify-center text-amber-400 shadow-md active:scale-95 cursor-pointer"
                title="Random Pick"
              >
                <Zap className="w-5 h-5 fill-current" />
              </button>
            </div>

            {/* Right: ICONIC BIG 3D PILL BUTTON (BET / CASHOUT) */}
            <div className="sm:col-span-4">
              {isPlaying ? (
                // Fiery Red CASHOUT Button
                <button
                  onClick={() => handleCashOut()}
                  disabled={revealedGemsCount === 0}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center shadow-xl transition-all select-none ${
                    revealedGemsCount > 0
                      ? 'bg-gradient-to-b from-[#e52e2e] via-[#c61818] to-[#990c0c] hover:from-[#f23838] hover:to-[#b01313] border-2 border-rose-400 text-white shadow-[0_0_25px_rgba(229,46,46,0.8)] active:scale-98 animate-pulse cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="font-extrabold text-sm sm:text-base tracking-widest text-white drop-shadow">
                    CASHOUT
                  </span>
                  {revealedGemsCount > 0 && (
                    <span className="font-mono text-xs font-black text-amber-300">
                      ₹{currentCashoutValue} ({currentMultiplier.toFixed(2)}x)
                    </span>
                  )}
                </button>
              ) : (
                // Vibrant Green BET Button
                <button
                  onClick={handleStartGame}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] hover:from-[#29db6a] hover:to-[#179644] border-2 border-emerald-300 text-zinc-950 font-black text-sm sm:text-base uppercase tracking-widest shadow-[0_0_25px_rgba(34,197,94,0.6)] active:scale-98 transition flex flex-col items-center justify-center cursor-pointer"
                >
                  <span className="font-extrabold text-zinc-950 tracking-wider">BET</span>
                  <span className="font-mono text-xs font-black text-zinc-950/80">
                    ₹{betAmount.toFixed(2)}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Provably Fair Badge */}
        <div className="text-center text-[10px] text-sky-400/60 flex items-center justify-center gap-1 mt-1">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>Spribe Certified Provably Fair RNG Algorithm</span>
        </div>
      </main>

      {/* HOW TO PLAY MODAL */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#082261] border border-sky-400/40 rounded-3xl max-w-sm w-full p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-sky-500/20">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-xs">
                  ?
                </div>
                <h3 className="font-black text-base text-white">How to Play Mines</h3>
              </div>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-sky-100 space-y-3 leading-relaxed">
              <div className="flex items-start gap-2.5 bg-[#04143d] p-2.5 rounded-xl border border-sky-500/20">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">1</span>
                <span>Select your bet amount and how many hidden mines (1 to 24) are on the 5x5 grid.</span>
              </div>
              <div className="flex items-start gap-2.5 bg-[#04143d] p-2.5 rounded-xl border border-sky-500/20">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">2</span>
                <span>Click tiles to discover <b>⭐ Stars</b>. Each star multiplies your winnings!</span>
              </div>
              <div className="flex items-start gap-2.5 bg-[#04143d] p-2.5 rounded-xl border border-sky-500/20">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">3</span>
                <span>Tap <b>CASHOUT</b> anytime before hitting a <b>💣 Mine</b> to lock in your payout!</span>
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black text-xs rounded-xl shadow cursor-pointer hover:brightness-110"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
