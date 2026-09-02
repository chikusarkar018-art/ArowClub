import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { BALL_ASSETS } from '../../constants/assets.js';
import { GameType } from '../../types.js';
import {
  RefreshCw, Lock, X, Check,
  AlertTriangle, CheckCircle2,
  Sliders, ChevronDown, Flame,
  ShieldCheck, ArrowUpRight
} from 'lucide-react';

interface GameControlRow {
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

// 3D Glossy Ball Component
const GlossyBall: React.FC<{
  number: number;
  label: string;
  profit?: number;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ number, label, profit = 0, isSelected = false, onClick }) => {
  const assetUrl = BALL_ASSETS[number];

  const getGradientStyle = (num: number) => {
    if (num === 0) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #f472b6 0%, #c084fc 35%, #9333ea 70%, #581c87 100%)',
        boxShadow: '0 4px 10px rgba(147, 51, 234, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(0, 0, 0, 0.4)'
      };
    }
    if (num === 5) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #a7f3d0 0%, #c084fc 35%, #8b5cf6 70%, #065f46 100%)',
        boxShadow: '0 4px 10px rgba(139, 92, 246, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(0, 0, 0, 0.4)'
      };
    }
    if ([1, 3, 7, 9].includes(num)) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #a7f3d0 0%, #34d399 35%, #059669 70%, #064e3b 100%)',
        boxShadow: '0 4px 10px rgba(5, 150, 105, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(0, 0, 0, 0.4)'
      };
    }
    return {
      background: 'radial-gradient(circle at 35% 30%, #fecaca 0%, #f87171 35%, #dc2626 70%, #7f1d1d 100%)',
      boxShadow: '0 4px 10px rgba(220, 38, 38, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(0, 0, 0, 0.4)'
    };
  };

  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition cursor-pointer select-none ${
        isSelected
          ? 'bg-[#1e1e28] border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-105'
          : 'bg-[#121218] border-white/5 hover:border-amber-400/30'
      }`}
    >
      <span className="text-[10px] font-black uppercase text-zinc-300 tracking-wider mb-1">
        {label}
      </span>
      <div
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-white text-base sm:text-lg relative transition-transform hover:scale-105"
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
      <span className="text-[#10b981] font-mono text-[11px] font-bold text-center mt-1">
        +{profit >= 1000 ? `${(profit / 1000).toFixed(0)}k` : profit}k
      </span>
    </button>
  );
};

export const WingoControlCenterMobileView: React.FC<{
  onOpenSidebar?: () => void;
  onNavigateTab?: (tab: string) => void;
}> = ({ onNavigateTab }) => {
  const { admin } = useAuth();
  const [games, setGames] = useState<GameControlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Selected mode per game card
  const [selectedModes, setSelectedModes] = useState<Record<string, string>>({
    wingo_30s: '50_percent',
    wingo_1m: '50_percent',
    wingo_3m: '50_percent',
    wingo_5m: '50_percent',
  });

  // Modal for Ball Locking
  const [modalGame, setModalGame] = useState<GameControlRow | null>(null);
  const [selectedLockNum, setSelectedLockNum] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchOverview = async () => {
    try {
      const res = await api.getGameControlOverview();
      if (res?.games && Array.isArray(res.games)) {
        setGames(res.games);
        // Sync selected modes
        const newModes: Record<string, string> = {};
        res.games.forEach((g: GameControlRow) => {
          if (g.isLocked && g.manualLockedNumber !== null) {
            newModes[g.gameType] = `lock_${g.manualLockedNumber}`;
          } else {
            newModes[g.gameType] = g.autoMode || '50_percent';
          }
        });
        setSelectedModes(prev => ({ ...prev, ...newModes }));
      }
    } catch (err: any) {
      console.error('Failed to fetch Win Go game control overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(fetchOverview, 1500);
    return () => clearInterval(timer);
  }, []);

  const handleModeSelect = async (game: GameControlRow, mode: string) => {
    setSelectedModes(prev => ({ ...prev, [game.gameType]: mode }));
    setSavingMode(game.gameType);
    try {
      if (mode.startsWith('lock_')) {
        const num = parseInt(mode.replace('lock_', ''), 10);
        await api.lockWingoResult(game.gameType, game.periodId, num, admin?.username);
        showToast(`🎯 ${game.name} Period #${game.periodId}: Ball #${num} Winner Locked!`);
      } else {
        if (game.isLocked && game.manualLockedNumber !== null) {
          await api.clearWingoLock(game.gameType, game.periodId, admin?.username);
        }
        await api.setGameAutoMode(game.gameType, mode);
        showToast(`✅ ${game.name}: Auto Mode set to '${getModeLabel(mode)}'`);
      }
      await fetchOverview();
    } catch (err: any) {
      showToast(err.message || 'Error updating mode', 'error');
    } finally {
      setSavingMode(null);
    }
  };

  const handleApplySelection = async (game: GameControlRow) => {
    const selectedMode = selectedModes[game.gameType] || '50_percent';
    await handleModeSelect(game, selectedMode);
  };

  const handleQuickLockBall = async (game: GameControlRow, ballNum: number) => {
    setActionLoading(true);
    try {
      await api.lockWingoResult(game.gameType, game.periodId, ballNum, admin?.username);
      showToast(`🎯 बॉल #${ballNum} सफलतापूर्वक लॉक हो गई (${game.name})`);
      setSelectedModes(prev => ({ ...prev, [game.gameType]: `lock_${ballNum}` }));
      await fetchOverview();
      setModalGame(null);
    } catch (err: any) {
      showToast(err.message || 'लॉक करने में त्रुटि', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearLock = async (game: GameControlRow) => {
    setActionLoading(true);
    try {
      await api.clearWingoLock(game.gameType, game.periodId, admin?.username);
      showToast(`🔓 ${game.name} का लॉक हटा दिया गया है, ऑटो मोड सक्रिय है`);
      setSelectedModes(prev => ({ ...prev, [game.gameType]: '50_percent' }));
      await fetchOverview();
    } catch (err: any) {
      showToast(err.message || 'अनलॉक करने में त्रुटि', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'house_best':
        return 'House Always Wins (0% Payout)';
      case '25_percent':
        return '25% Winning (High House Profit)';
      case '50_percent':
        return '50% Winning (Balanced)';
      case '75_percent':
        return '75% Winning (Player Favored)';
      case '100_percent':
        return '100% Winning (Full Payout)';
      case 'fair':
        return '100% Fair Random';
      default:
        if (mode.startsWith('lock_')) {
          return `Lock Number #${mode.replace('lock_', '')}`;
        }
        return mode;
    }
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-white flex flex-col font-sans select-none p-4 sm:p-6 lg:p-8 space-y-6 pb-28">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold transition-all border ${
          toastMsg.type === 'success'
            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
            : 'bg-rose-950 text-rose-300 border-rose-500/40'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Clean Desktop Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black shadow-md">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Win Go Live Control Center
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  • LIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                All 4 games (30s, 1m, 3m, 5m) live monitoring · Auto refresh 1.5s · Instant number locking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab?.('game_winning_cut')}
            className="px-4 py-2 rounded-xl bg-[#141622] hover:bg-[#1f2235] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Winning % Cut / GST Settings</span>
          </button>

          <button
            onClick={fetchOverview}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#141520] border border-[#232638] text-zinc-300 hover:text-white transition cursor-pointer"
            title="Refresh All"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#f3ba2f]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Games Desktop Grid Layout (2x2 on Desktop, 1-col on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {games.map((game) => {
          const hasActiveBet = game.totalBetAmount > 0 || game.playersCount > 0;
          const currentModeVal = selectedModes[game.gameType] || '50_percent';
          const isSavingThis = savingMode === game.gameType;

          return (
            <div
              key={game.gameType}
              className={`rounded-3xl border p-5 transition-all shadow-xl relative overflow-hidden flex flex-col justify-between ${
                hasActiveBet
                  ? 'bg-[#121019] border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
                  : 'bg-[#0d0e15] border-[#222538] hover:border-[#383d5c]'
              }`}
            >
              <div>
                {/* RED FLAG BANNER IF ACTIVE BETS DETECTED */}
                {hasActiveBet && (
                  <div className="mb-4 px-3.5 py-2 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚩</span>
                      <span className="text-xs font-black text-red-400 uppercase tracking-wide">
                        LIVE BET ACTIVE ON {game.name}!
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-white bg-red-600 px-2.5 py-0.5 rounded-lg shadow-sm">
                      ₹{game.totalBetAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Card Header: Title & Period ID & Timer */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                      <span>{game.name}</span>
                    </h2>
                    <div className="text-xs font-mono text-zinc-400 mt-0.5">
                      Period #{game.periodId}
                    </div>
                  </div>

                  {/* Big Timer Badge */}
                  <div className="bg-[#12131e] border border-[#2b2f48] rounded-2xl px-4 py-2 flex items-center justify-center shadow-inner">
                    <span className="text-lg font-black text-[#e5a93c] font-mono tracking-wider">
                      {game.formattedTime || '00:14'}
                    </span>
                  </div>
                </div>

                {/* Metrics Boxes (PLAYERS & TOTAL BET) */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-[#10111b] border border-[#1f2235] rounded-2xl p-3.5">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      PLAYERS
                    </div>
                    <div className="text-2xl font-black text-white font-mono mt-0.5">
                      {game.playersCount}
                    </div>
                  </div>

                  <div className="bg-[#10111b] border border-[#1f2235] rounded-2xl p-3.5">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      TOTAL BET
                    </div>
                    <div className={`text-2xl font-black font-mono mt-0.5 ${hasActiveBet ? 'text-red-400' : 'text-[#e5a93c]'}`}>
                      ₹ {game.totalBetAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Lock Status Pill if Manually Locked */}
                {game.isLocked && game.manualLockedNumber !== null && (
                  <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300">
                        Ball <strong>#{game.manualLockedNumber}</strong> is LOCKED to Win!
                      </span>
                    </div>
                    <button
                      onClick={() => handleClearLock(game)}
                      disabled={actionLoading}
                      className="text-[10px] font-black text-zinc-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      Unlock
                    </button>
                  </div>
                )}

                {/* 5 Recommendation Glossy Balls */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5 px-0.5">
                    <span className="font-bold text-zinc-300">Suggested Winning Balls (Tap to lock):</span>
                    <span className="text-emerald-400 font-bold">+Profit</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <GlossyBall
                      label="HOUSE"
                      number={game.houseBest?.number ?? 0}
                      profit={game.houseBest?.profitDiff ?? 0}
                      isSelected={!game.isLocked && game.autoMode === 'house_best'}
                      onClick={() => handleModeSelect(game, 'house_best')}
                    />
                    <GlossyBall
                      label="75%"
                      number={game.target75?.number ?? 7}
                      profit={game.target75?.profitDiff ?? 0}
                      isSelected={!game.isLocked && game.autoMode === '75_percent'}
                      onClick={() => handleModeSelect(game, '75_percent')}
                    />
                    <GlossyBall
                      label="50%"
                      number={game.target50?.number ?? 5}
                      profit={game.target50?.profitDiff ?? 0}
                      isSelected={!game.isLocked && (game.autoMode === '50_percent' || !game.autoMode)}
                      onClick={() => handleModeSelect(game, '50_percent')}
                    />
                    <GlossyBall
                      label="25%"
                      number={game.target25?.number ?? 2}
                      profit={game.target25?.profitDiff ?? 0}
                      isSelected={!game.isLocked && game.autoMode === '25_percent'}
                      onClick={() => handleModeSelect(game, '25_percent')}
                    />
                    <GlossyBall
                      label="100%"
                      number={game.target100?.number ?? 9}
                      profit={game.target100?.profitDiff ?? 0}
                      isSelected={!game.isLocked && game.autoMode === '100_percent'}
                      onClick={() => handleModeSelect(game, '100_percent')}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setModalGame(game)}
                      className="text-[11px] text-amber-400/90 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition hover:underline"
                    >
                      <span>🎯 Direct Lock Any Specific Ball (0 to 9)...</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Dropdown Selector & Select Button */}
              <div className="mt-5 flex items-center gap-3 pt-3 border-t border-white/5">
                <div className="relative flex-1">
                  <select
                    value={currentModeVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedModes(prev => ({ ...prev, [game.gameType]: val }));
                      handleModeSelect(game, val);
                    }}
                    className="w-full bg-[#10111b] border border-[#262a40] text-white font-bold text-xs rounded-2xl px-3.5 py-3 appearance-none outline-none focus:border-amber-400 transition cursor-pointer"
                  >
                    <option value="50_percent">50% Winning (Balanced Default)</option>
                    <option value="house_best">House Always Wins (0% Payout / Max Profit)</option>
                    <option value="25_percent">25% Winning (High House Profit)</option>
                    <option value="75_percent">75% Winning (Player Favored)</option>
                    <option value="100_percent">100% Winning (Full Payout)</option>
                    <option value="fair">100% Fair Random</option>
                    <optgroup label="--- Lock Specific Ball (0 to 9) ---">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <option key={n} value={`lock_${n}`}>
                          Lock Number #{n} ({n % 2 === 0 ? 'Red' : 'Green'}{n === 0 || n === 5 ? '/Violet' : ''})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => handleApplySelection(game)}
                  disabled={isSavingThis}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#e5a93c] via-[#f0b034] to-[#e5a93c] text-black font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSavingThis ? 'Saving...' : 'Apply'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Direct Ball 0-9 Interactive Selection */}
      {modalGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#10121b] border border-[#2a2e45] rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Lock Winning Ball for {modalGame.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  Period #{modalGame.periodId} · Remaining {modalGame.formattedTime}
                </p>
              </div>
              <button
                onClick={() => setModalGame(null)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-amber-300 font-bold text-center">
              Tap any ball (0 to 9) below to force it as the WINNER:
            </p>

            {/* 10 Balls Grid */}
            <div className="grid grid-cols-5 gap-2.5 py-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isSelected = selectedLockNum === num || (modalGame.manualLockedNumber === num);
                return (
                  <button
                    key={num}
                    onClick={() => {
                      setSelectedLockNum(num);
                      handleQuickLockBall(modalGame, num);
                    }}
                    disabled={actionLoading}
                    className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#22253b] border-amber-400 ring-2 ring-amber-400'
                        : 'bg-[#151724] border-white/10 hover:border-amber-400/40'
                    }`}
                  >
                    <GlossyBall
                      label={`#${num}`}
                      number={num}
                      profit={0}
                      isSelected={isSelected}
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  handleClearLock(modalGame);
                  setModalGame(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-zinc-300 transition cursor-pointer"
              >
                Revert to Auto Mode
              </button>
              <button
                onClick={() => setModalGame(null)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
