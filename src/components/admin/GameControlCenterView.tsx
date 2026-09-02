import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { BALL_ASSETS } from '../../constants/assets.js';
import { GameType } from '../../types.js';
import {
  Sliders, Check, Lock, Unlock, X, RefreshCw,
  Sparkles, Plus, Trash2, CheckCircle2, ChevronDown,
  AlertCircle, Target, Zap, Clock, Users, IndianRupee
} from 'lucide-react';

interface GameRowData {
  gameType: GameType;
  name: string;
  periodId: string;
  remainingSeconds: number;
  formattedTime: string;
  playersCount: number;
  totalBetAmount: number;
  houseBest: { number: number; payout: number; profitDiff: number };
  target75: { number: number; payout: number; profitDiff: number };
  target50: { number: number; payout: number; profitDiff: number };
  target25: { number: number; payout: number; profitDiff: number };
  target100: { number: number; payout: number; profitDiff: number };
  autoMode: string;
  manualLockedNumber: number | null;
  isLocked: boolean;
}

interface AutoRule {
  id?: string;
  maxAmount: number | string;
  mode: string;
}

// 3D Glossy Sphere Ball Component - No redundant text overlay on top of graphic balls!
const GlossyBall: React.FC<{
  number: number;
  profit?: number;
  size?: 'sm' | 'md' | 'lg';
  showProfit?: boolean;
}> = ({
  number,
  profit = 0,
  size = 'md',
  showProfit = true,
}) => {
  const assetUrl = BALL_ASSETS[number];
  const sizeClass = size === 'lg' ? 'w-11 h-11' : size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const [imgFailed, setImgFailed] = useState(false);

  const getGradientStyle = (num: number) => {
    if (num === 0) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #f472b6 0%, #c084fc 30%, #9333ea 65%, #4c1d95 100%)',
        boxShadow: '0 4px 10px rgba(147, 51, 234, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
      };
    }
    if (num === 5) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #a7f3d0 0%, #c084fc 35%, #8b5cf6 65%, #065f46 100%)',
        boxShadow: '0 4px 10px rgba(139, 92, 246, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
      };
    }
    if ([1, 3, 7, 9].includes(num)) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #a7f3d0 0%, #34d399 30%, #059669 65%, #064e3b 100%)',
        boxShadow: '0 4px 10px rgba(5, 150, 105, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
      };
    }
    return {
      background: 'radial-gradient(circle at 35% 30%, #fecaca 0%, #f87171 30%, #dc2626 65%, #7f1d1d 100%)',
      boxShadow: '0 4px 10px rgba(220, 38, 38, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
    };
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`relative ${sizeClass} rounded-full flex items-center justify-center select-none transition-transform hover:scale-110`}
        style={imgFailed || !assetUrl ? getGradientStyle(number) : undefined}
      >
        {assetUrl && !imgFailed ? (
          <img
            src={assetUrl}
            alt={`Ball ${number}`}
            className="w-full h-full object-contain filter drop-shadow-md rounded-full pointer-events-none"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="font-extrabold text-white text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {number}
          </span>
        )}
      </div>
      {showProfit && (
        <span className="text-[#10b981] font-mono text-[11px] font-bold text-center mt-1 tracking-tight">
          +{profit >= 0 ? profit : 0}
        </span>
      )}
    </div>
  );
};

export const GameControlCenterView: React.FC = () => {
  const { admin } = useAuth();
  const [games, setGames] = useState<GameRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Active game selected in the direct manual controller located right below the table
  const [selectedGameType, setSelectedGameType] = useState<GameType>('wingo_30s');
  const [chosenBall, setChosenBall] = useState<number | null>(null);
  const [lockingOutcome, setLockingOutcome] = useState(false);

  // Auto result rules
  const [autoRules, setAutoRules] = useState<AutoRule[]>([
    { id: '1', maxAmount: 5000, mode: 'house_best' },
    { id: '2', maxAmount: 30000, mode: 'house_best' },
    { id: '3', maxAmount: 70000, mode: 'house_best' },
    { id: '4', maxAmount: 'infinity', mode: 'house_best' },
  ]);
  const [savingRules, setSavingRules] = useState(false);

  const directControlRef = useRef<HTMLDivElement>(null);

  const fetchOverview = async (isInitial = false) => {
    try {
      const res = await api.getGameControlOverview();
      if (res?.games) {
        setGames(res.games);
        if (res.autoResultRules && res.autoResultRules.length > 0) {
          setAutoRules(res.autoResultRules);
        }
      }
      if (isInitial) setLoading(false);
    } catch (err: any) {
      if (isInitial) {
        setError(err.message || 'Failed to connect to Game Control');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchOverview(true);
    // Auto refresh every 1.5 seconds matching live sync
    const interval = setInterval(() => {
      fetchOverview(false);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const activeGame = games.find((g) => g.gameType === selectedGameType) || games[0];

  // Sync chosenBall with active game locked state when switching tabs if not manually changed
  useEffect(() => {
    if (activeGame) {
      setChosenBall(activeGame.manualLockedNumber);
    }
  }, [selectedGameType, activeGame?.periodId]);

  const handleAutoModeChange = async (gameType: GameType, mode: string) => {
    try {
      // Optimistic update
      setGames((prev) =>
        prev.map((g) => (g.gameType === gameType ? { ...g, autoMode: mode } : g))
      );
      await api.setGameAutoMode(gameType, mode);
      setSuccessToast(`Auto mode updated to ${mode.replace('_', ' ')}!`);
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update auto mode');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await api.setAutoResultRules(autoRules);
      setSuccessToast('Auto result rules saved successfully!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save rules');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingRules(false);
    }
  };

  const handleAddRule = () => {
    setAutoRules((prev) => [
      ...prev,
      { id: String(Date.now()), maxAmount: 100000, mode: 'house_best' },
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setAutoRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectGameRow = (game: GameRowData) => {
    setSelectedGameType(game.gameType);
    setChosenBall(game.manualLockedNumber);
    if (directControlRef.current) {
      directControlRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleLockWinningOutcome = async (overrideNumber?: number | null) => {
    if (!activeGame) return;
    const targetBall = overrideNumber !== undefined ? overrideNumber : chosenBall;
    setLockingOutcome(true);
    try {
      await api.lockGameWinningNumber(
        activeGame.gameType,
        activeGame.periodId,
        targetBall,
        admin?.username || 'SuperAdmin'
      );
      setSuccessToast(
        targetBall !== null && targetBall !== undefined
          ? `Locked winning Ball #${targetBall} for ${activeGame.name} (Period #${activeGame.periodId})!`
          : `Unlocked ${activeGame.name} (Reverted to Auto Mode)!`
      );
      setChosenBall(targetBall);
      fetchOverview(false);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to lock winning outcome');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLockingOutcome(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white p-4 md:p-8 font-sans select-none">
      {/* Toast notifications */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#10b981] text-black font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce border border-emerald-300">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="fixed top-6 right-6 z-50 bg-rose-600 text-white font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-rose-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header matching exact image layout */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#f59e0b] tracking-tight flex items-center gap-2.5">
              <span>Game Control Center</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-1 font-medium">
              All four games live on one screen • live odds & manual outcome setter
            </p>
          </div>

          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400 font-bold text-xs tracking-wider">LIVE 1.5s SYNC</span>
          </div>
        </div>

        {/* 1. Main Live Games Table Card (Exact image layout) */}
        <div className="bg-[#0e0e12] border border-[#2a2415] rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#26262a]/60 text-[11px] font-bold text-[#b59b58] uppercase tracking-wider">
                  <th className="py-3 px-3">GAME</th>
                  <th className="py-3 px-3">TIME LEFT</th>
                  <th className="py-3 px-3 text-center">PLAYERS</th>
                  <th className="py-3 px-3 text-center">TOTAL BET</th>
                  <th className="py-3 px-2 text-center">HOUSE BEST</th>
                  <th className="py-3 px-2 text-center">75%</th>
                  <th className="py-3 px-2 text-center">50%</th>
                  <th className="py-3 px-2 text-center">25%</th>
                  <th className="py-3 px-2 text-center">100%</th>
                  <th className="py-3 px-3 text-center">AUTO MODE</th>
                  <th className="py-3 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#201d14]">
                {games.map((g) => {
                  const isLocked = g.manualLockedNumber !== null && g.manualLockedNumber !== undefined;
                  const isSelected = selectedGameType === g.gameType;
                  return (
                    <tr
                      key={g.gameType}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#1c180d] border-l-4 border-l-[#f59e0b]'
                          : 'hover:bg-[#15151a]'
                      }`}
                      onClick={() => setSelectedGameType(g.gameType)}
                    >
                      {/* Game & Period */}
                      <td className="py-4 px-3 align-middle">
                        <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                          {g.name}
                          {isLocked && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-[#f59e0b] text-[10px] font-black border border-amber-500/40">
                              LOCKED #{g.manualLockedNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {g.periodId}
                        </div>
                      </td>

                      {/* Time Left pill */}
                      <td className="py-4 px-3 align-middle">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full border shadow-inner ${
                            g.remainingSeconds <= 5
                              ? 'bg-rose-950/60 border-rose-500/50 text-rose-400 animate-pulse'
                              : 'bg-[#1c180d] border-[#f59e0b]/40 text-[#f59e0b]'
                          }`}
                        >
                          <span className="font-mono font-bold text-sm">
                            {g.formattedTime}
                          </span>
                        </div>
                      </td>

                      {/* Players */}
                      <td className="py-4 px-3 align-middle text-center font-mono font-bold text-sm text-zinc-200">
                        {g.playersCount}
                      </td>

                      {/* Total Bet */}
                      <td className="py-4 px-3 align-middle text-center font-mono font-bold text-sm text-zinc-100">
                        ₹ {g.totalBetAmount.toLocaleString('en-IN')}
                      </td>

                      {/* House Best Ball */}
                      <td className="py-4 px-2 align-middle text-center">
                        <GlossyBall
                          number={g.houseBest?.number ?? 0}
                          profit={g.houseBest?.profitDiff ?? 0}
                        />
                      </td>

                      {/* 75% Ball */}
                      <td className="py-4 px-2 align-middle text-center">
                        <GlossyBall
                          number={g.target75?.number ?? 1}
                          profit={g.target75?.profitDiff ?? 0}
                        />
                      </td>

                      {/* 50% Ball */}
                      <td className="py-4 px-2 align-middle text-center">
                        <GlossyBall
                          number={g.target50?.number ?? 2}
                          profit={g.target50?.profitDiff ?? 0}
                        />
                      </td>

                      {/* 25% Ball */}
                      <td className="py-4 px-2 align-middle text-center">
                        <GlossyBall
                          number={g.target25?.number ?? 3}
                          profit={g.target25?.profitDiff ?? 0}
                        />
                      </td>

                      {/* 100% Ball */}
                      <td className="py-4 px-2 align-middle text-center">
                        <GlossyBall
                          number={g.target100?.number ?? 4}
                          profit={g.target100?.profitDiff ?? 0}
                        />
                      </td>

                      {/* Auto Mode Dropdown */}
                      <td
                        className="py-4 px-3 align-middle text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block w-36">
                          <select
                            value={g.autoMode}
                            onChange={(e) =>
                              handleAutoModeChange(g.gameType, e.target.value)
                            }
                            className="w-full appearance-none bg-[#09090b] border border-[#2a2415] hover:border-[#f59e0b]/50 text-xs font-semibold text-zinc-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#f59e0b] cursor-pointer"
                          >
                            <option value="50_percent">50% Winning</option>
                            <option value="house_best">House Best</option>
                            <option value="75_percent">75% Winning</option>
                            <option value="25_percent">25% Winning</option>
                            <option value="100_percent">100% Winning</option>
                            <option value="random">Random Fair</option>
                            <option value="auto_rules">Auto (rules)</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* Action: Select Button (Selects & scrolls to manual outcome setter below) */}
                      <td
                        className="py-4 px-3 align-middle text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleSelectGameRow(g)}
                          className={`font-bold text-xs px-4 py-1.5 rounded-full shadow-md transition-all ${
                            isSelected
                              ? 'bg-[#10b981] text-black ring-2 ring-emerald-400'
                              : 'bg-[#f59e0b] hover:bg-[#d97706] text-black active:scale-95'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. DIRECT MANUAL RESULT CONTROLLER - POSITIONED DIRECTLY BELOW COLOR PREDICTION TABLE */}
        <div
          ref={directControlRef}
          className="bg-[#0e0e12] border-2 border-[#f59e0b]/60 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5 relative overflow-hidden"
        >
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#26262a] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b]">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-extrabold text-zinc-100 flex items-center gap-2">
                  <span>Direct Manual Result Controller</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-[#f59e0b] border border-amber-500/40 font-mono">
                    Direct Action
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Select game round, click winning ball / color below to lock the exact result in real time
                </p>
              </div>
            </div>

            {/* Live game tabs */}
            <div className="flex items-center gap-1.5 bg-[#09090b] p-1 rounded-xl border border-[#26262a]">
              {games.map((g) => {
                const isSelected = selectedGameType === g.gameType;
                const isLocked = g.manualLockedNumber !== null && g.manualLockedNumber !== undefined;
                return (
                  <button
                    key={g.gameType}
                    onClick={() => {
                      setSelectedGameType(g.gameType);
                      setChosenBall(g.manualLockedNumber);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#f59e0b] text-black shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
                    }`}
                  >
                    <span>{g.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-black/30 text-black'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {g.formattedTime}
                    </span>
                    {isLocked && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white/50"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Round Status Strip */}
          {activeGame && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#09090b] p-3.5 rounded-xl border border-[#201d14]">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#f59e0b]" />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Round / Period</div>
                  <div className="text-xs font-mono font-bold text-zinc-200">{activeGame.periodId}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Pool</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    ₹ {activeGame.totalBetAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Active Bettors</div>
                  <div className="text-xs font-mono font-bold text-sky-300">{activeGame.playersCount} Players</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {activeGame.manualLockedNumber !== null && activeGame.manualLockedNumber !== undefined ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Zap className="w-4 h-4 text-emerald-400" />
                )}
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Current Target</div>
                  <div className="text-xs font-bold text-zinc-200">
                    {activeGame.manualLockedNumber !== null && activeGame.manualLockedNumber !== undefined ? (
                      <span className="text-[#f59e0b]">Locked Ball #{activeGame.manualLockedNumber}</span>
                    ) : (
                      <span className="text-emerald-400">Auto ({activeGame.autoMode.replace('_', ' ')})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Winning Ball Pickers (0 - 9) with large 3D glossy spheres */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider flex items-center gap-1.5">
                <span>Select Winning Ball (0 to 9)</span>
              </label>
              <span className="text-[11px] text-zinc-400">
                Click any ball to lock result for next settlement
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isSelected = chosenBall === num;
                const isCurrentlyLockedInDB = activeGame?.manualLockedNumber === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setChosenBall(num);
                      handleLockWinningOutcome(num);
                    }}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all transform active:scale-95 ${
                      isSelected
                        ? 'bg-[#2a2415] border-[#f59e0b] ring-2 ring-[#f59e0b] scale-105 shadow-lg shadow-amber-500/20'
                        : 'bg-[#141418] border-[#26262a] hover:border-zinc-500 hover:bg-[#1a1a20]'
                    }`}
                  >
                    <GlossyBall number={num} size="lg" showProfit={false} />
                    <div className="text-center">
                      <span className="text-[11px] font-bold text-zinc-300">
                        #{num}
                      </span>
                      {isCurrentlyLockedInDB && (
                        <div className="text-[9px] font-black text-amber-400 uppercase tracking-tighter">
                          Active
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Color & Size Patterns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Colors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Quick Color Setter
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChosenBall(1);
                    handleLockWinningOutcome(1);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-xs font-bold hover:bg-emerald-900/60 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>Green (1,3,7,9)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChosenBall(0);
                    handleLockWinningOutcome(0);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-purple-950/60 border border-purple-500/50 text-purple-400 text-xs font-bold hover:bg-purple-900/60 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                  <span>Violet (0, 5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChosenBall(2);
                    handleLockWinningOutcome(2);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-400 text-xs font-bold hover:bg-rose-900/60 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span>Red (2,4,6,8)</span>
                </button>
              </div>
            </div>

            {/* Big / Small */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Quick Big / Small Setter
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChosenBall(6);
                    handleLockWinningOutcome(6);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs font-bold hover:bg-amber-900/60 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🟡 Big (5, 6, 7, 8, 9)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChosenBall(3);
                    handleLockWinningOutcome(3);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-sky-950/60 border border-sky-500/50 text-sky-300 text-xs font-bold hover:bg-sky-900/60 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🔵 Small (0, 1, 2, 3, 4)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#26262a]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setChosenBall(null);
                  handleLockWinningOutcome(null);
                }}
                disabled={lockingOutcome}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 bg-[#18181b] hover:bg-zinc-800 border border-[#27272a] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Reset to Auto Mode (Clear Lock)</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleLockWinningOutcome()}
                disabled={lockingOutcome || chosenBall === null}
                className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-extrabold text-xs px-6 py-2.5 rounded-full shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {lockingOutcome ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : chosenBall !== null ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Ball #{chosenBall} for {activeGame?.name}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pick a Ball Above</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. AUTO RESULT RULES Card (Exact image replica) */}
        <div className="bg-[#0e0e12] border border-[#2a2415] rounded-2xl p-5 md:p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-[#f59e0b] font-bold text-sm tracking-wider uppercase">
            <Sliders className="w-4 h-4" />
            <span>AUTO RESULT RULES</span>
          </div>

          <div className="space-y-3 pt-2">
            {autoRules.map((rule, idx) => (
              <div
                key={rule.id || idx}
                className="flex items-center gap-3 w-full max-w-4xl"
              >
                {/* UP TO label & input */}
                <div className="flex-1 flex items-center bg-[#09090b] border border-[#26262a] rounded-lg px-3 py-2 focus-within:border-[#f59e0b]">
                  <span className="text-xs font-bold text-zinc-400 tracking-wider mr-3 select-none">
                    UP TO
                  </span>
                  <input
                    type="text"
                    value={
                      rule.maxAmount === 'infinity' || rule.maxAmount === Infinity
                        ? '∞'
                        : rule.maxAmount
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = [...autoRules];
                      next[idx].maxAmount =
                        val === '∞' || val.toLowerCase() === 'infinity'
                          ? 'infinity'
                          : Number(val.replace(/\D/g, '')) || 0;
                      setAutoRules(next);
                    }}
                    className="bg-transparent border-none text-sm font-mono text-zinc-100 focus:outline-none w-full font-bold"
                  />
                </div>

                {/* Mode dropdown */}
                <div className="relative flex-1">
                  <select
                    value={rule.mode}
                    onChange={(e) => {
                      const next = [...autoRules];
                      next[idx].mode = e.target.value;
                      setAutoRules(next);
                    }}
                    className="w-full appearance-none bg-[#09090b] border border-[#26262a] text-sm text-zinc-200 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-[#f59e0b] cursor-pointer font-medium"
                  >
                    <option value="house_best">House Best</option>
                    <option value="50_percent">50% Winning</option>
                    <option value="75_percent">75% Winning</option>
                    <option value="25_percent">25% Winning</option>
                    <option value="100_percent">100% Winning</option>
                    <option value="random">Random Fair</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {autoRules.length > 1 && (
                  <button
                    onClick={() => handleRemoveRule(idx)}
                    className="text-zinc-500 hover:text-rose-400 p-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={handleAddRule}
              className="bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-zinc-200 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add rule
            </button>
            <button
              onClick={handleSaveRules}
              disabled={savingRules}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-extrabold px-6 py-2 rounded-full shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {savingRules ? 'Saving...' : 'Save rules'}
            </button>
          </div>

          {/* Subtitle / note */}
          <p className="text-[11px] text-zinc-500 font-medium pt-1">
            Applied when a game's Auto Mode is "Auto (rules)" and the admin locked nothing.
          </p>
        </div>
      </div>
    </div>
  );
};
