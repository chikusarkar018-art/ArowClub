import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { AllGamesControlSettings } from '../../types.js';
import {
  Percent,
  ShieldCheck,
  Zap,
  Save,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Sliders,
  DollarSign,
  TrendingDown,
  Check,
  AlertCircle,
  Bomb,
  Plane,
  Coins,
  Gamepad2,
  Dice5,
  RotateCcw,
  Trophy,
  Flame,
  Award,
  Layers,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const GameWinningCutSettingsView: React.FC = () => {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGameId, setSavingGameId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Global default winning tax cut %
  const [globalWinningCut, setGlobalWinningCut] = useState<number>(0);

  // Individual Per-Game Winning Tax Cut %
  const [gameWinningCuts, setGameWinningCuts] = useState<Record<string, number>>({
    seven_up_down: 0,
    wingo_30s: 0,
    wingo_1m: 0,
    wingo_3m: 0,
    wingo_5m: 0,
    mines: 0,
    aviator: 0,
    roulette: 0,
    chicken_road: 0,
    plinko: 0,
  });

  // Win Go Profit & Result Modes
  const [gameAutoModes, setGameAutoModes] = useState<Record<string, string>>({
    wingo_30s: 'house_best',
    wingo_1m: 'house_best',
    wingo_3m: 'house_best',
    wingo_5m: 'house_best',
  });

  // Other Realtime Games Controls (Mines, Aviator, Roulette, Chicken Road, Plinko)
  const [otherControls, setOtherControls] = useState<AllGamesControlSettings>({
    mines: {
      mode: 'house_best',
      forcedTrapStep: 2,
      autoTrapHighBetThreshold: 100,
      forcedMineCoordinates: [2, 7, 12, 17, 22],
      houseRTP: 0.85,
    },
    roulette: {
      mode: 'house_best',
      forcedNextNumber: null,
      forcedNextColor: null,
      houseRTP: 0.90,
    },
    aviator: {
      mode: 'house_best',
      forcedCrashMultiplier: 1.25,
      autoCrashPoolThreshold: 500,
      houseRTP: 0.92,
    },
    chicken_road: {
      mode: 'house_best',
      forcedTrapStep: 3,
      houseRTP: 0.88,
    },
    plinko: {
      mode: 'house_best',
      forcedSlotMultiplier: 0.2,
      houseRTP: 0.90,
    },
  });

  // Active selected tab / game view ('all' or specific game id)
  const [selectedGameTab, setSelectedGameTab] = useState<string>('all');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      // 1. Fetch Bonus / Winning Deduction settings
      const bonusRes = await api.getAdminBonusCommission();
      if (bonusRes?.settings) {
        const globalCut = Number(bonusRes.settings.winningDeductionPercent ?? 0);
        setGlobalWinningCut(globalCut);
        if (bonusRes.settings.gameWinningDeductions) {
          setGameWinningCuts(prev => ({
            ...prev,
            ...bonusRes.settings.gameWinningDeductions,
          }));
        }
      }

      // 2. Fetch Win Go game modes
      const wingoRes = await api.getGameControlOverview();
      if (wingoRes?.gameAutoModes) {
        setGameAutoModes(wingoRes.gameAutoModes);
      }

      // 3. Fetch other games controls
      const otherRes = await api.getAdminAllGameControls();
      if (otherRes?.controls) {
        setOtherControls(otherRes.controls);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  // Save All Games in one click
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Save winning deduction GST % (Global + Per-Game)
      await api.updateAdminBonusCommission({
        winningDeductionPercent: Number(globalWinningCut),
        gameWinningDeductions: gameWinningCuts,
      }, admin?.username);

      // 2. Save Win Go modes
      for (const [gt, mode] of Object.entries(gameAutoModes)) {
        await api.setGameAutoMode(gt, mode);
      }

      // 3. Save other games controls
      await api.updateAdminAllGameControls(otherControls, admin?.username);

      showToast('✅ All Games Tax & Profit Settings successfully saved and live!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Single Game individually
  const handleSaveSingleGame = async (gameId: string, gameName: string) => {
    setSavingGameId(gameId);
    try {
      // 1. Save winning deduction GST % (Global + Per-Game)
      await api.updateAdminBonusCommission({
        winningDeductionPercent: Number(globalWinningCut),
        gameWinningDeductions: gameWinningCuts,
      }, admin?.username);

      // 2. If it's a wingo game, update its specific mode
      if (gameId.startsWith('wingo_')) {
        const mode = gameAutoModes[gameId] || 'house_best';
        await api.setGameAutoMode(gameId, mode);
      } else {
        await api.updateAdminAllGameControls(otherControls, admin?.username);
      }

      showToast(`✅ ${gameName} Tax (${gameWinningCuts[gameId] ?? 0}%) saved successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save game settings', 'error');
    } finally {
      setSavingGameId(null);
    }
  };

  // Bulk Apply Winning Cut % to ALL Games
  const handleApplyGlobalCutToAll = (percent: number) => {
    setGlobalWinningCut(percent);
    const updated: Record<string, number> = {};
    Object.keys(gameWinningCuts).forEach(key => {
      updated[key] = percent;
    });
    setGameWinningCuts(updated);
    showToast(`⚡ Set all games winning tax to ${percent}%`);
  };

  // Bulk Profit Mode Setter
  const handleBulkSetProfitMode = (mode: string) => {
    setGameAutoModes({
      wingo_30s: mode,
      wingo_1m: mode,
      wingo_3m: mode,
      wingo_5m: mode,
    });
    setOtherControls(prev => ({
      ...prev,
      mines: { ...prev.mines, mode: mode as any },
      roulette: { ...prev.roulette, mode: mode as any },
      aviator: { ...prev.aviator, mode: mode as any },
      chicken_road: { ...prev.chicken_road, mode: mode as any },
      plinko: { ...prev.plinko, mode: mode as any },
    }));
    showToast(`🛡️ Bulk profit mode set to '${mode === 'house_best' ? 'House Best (Max Profit)' : mode}'`);
  };

  const updateSingleGameCut = (gameId: string, val: number) => {
    setGameWinningCuts(prev => ({
      ...prev,
      [gameId]: Math.max(0, Math.min(50, Number(val))),
    }));
  };

  // All 10 Games in the platform
  const ALL_GAMES_LIST = [
    {
      id: 'wingo_30s',
      name: 'Win Go (30 Seconds)',
      shortTitle: 'Win Go 30s',
      category: 'wingo',
      tag: 'FAST LOTTERY',
      icon: '🎯',
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
      desc: 'Rapid 30-second color ball & number lottery draw.',
      hasModes: true,
      currentMode: gameAutoModes.wingo_30s || 'house_best',
      setMode: (m: string) => setGameAutoModes(prev => ({ ...prev, wingo_30s: m })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ House Best (100% Profit)', desc: 'Selects the outcome with lowest payout' },
        { id: 'target_50', label: '⚖️ 50% Balanced', desc: 'Balanced player payouts' },
        { id: 'target_75', label: '🌟 75% Player Favored', desc: 'Higher player win rate' },
        { id: 'fair', label: '🎲 100% Fair Random', desc: 'Pure random RNG number distribution' },
      ],
    },
    {
      id: 'wingo_1m',
      name: 'Win Go (1 Minute)',
      shortTitle: 'Win Go 1M',
      category: 'wingo',
      tag: 'CLASSIC 1M',
      icon: '🎯',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
      desc: '1-minute classic Win Go number and color lottery.',
      hasModes: true,
      currentMode: gameAutoModes.wingo_1m || 'house_best',
      setMode: (m: string) => setGameAutoModes(prev => ({ ...prev, wingo_1m: m })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ House Best (100% Profit)', desc: 'Lowest payout outcome for maximum house margin' },
        { id: 'target_50', label: '⚖️ 50% Balanced', desc: 'Balanced player win rate' },
        { id: 'target_75', label: '🌟 75% Player Favored', desc: 'High player win rate' },
        { id: 'fair', label: '🎲 100% Fair Random', desc: 'Pure random RNG' },
      ],
    },
    {
      id: 'wingo_3m',
      name: 'Win Go (3 Minutes)',
      shortTitle: 'Win Go 3M',
      category: 'wingo',
      tag: 'STRATEGIC 3M',
      icon: '🎯',
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
      desc: '3-minute high-pool strategic color lottery rounds.',
      hasModes: true,
      currentMode: gameAutoModes.wingo_3m || 'house_best',
      setMode: (m: string) => setGameAutoModes(prev => ({ ...prev, wingo_3m: m })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ House Best (100% Profit)', desc: 'Maximizes house net earnings' },
        { id: 'target_50', label: '⚖️ 50% Balanced', desc: 'Balanced distribution' },
        { id: 'target_75', label: '🌟 75% Player Favored', desc: 'Player favorable rounds' },
        { id: 'fair', label: '🎲 100% Fair Random', desc: 'Random balls' },
      ],
    },
    {
      id: 'wingo_5m',
      name: 'Win Go (5 Minutes)',
      shortTitle: 'Win Go 5M',
      category: 'wingo',
      tag: 'VIP 5M',
      icon: '🎯',
      color: 'from-purple-500/20 to-fuchsia-500/10 border-purple-500/30',
      desc: '5-minute VIP big turnover lottery with maximum bet pool.',
      hasModes: true,
      currentMode: gameAutoModes.wingo_5m || 'house_best',
      setMode: (m: string) => setGameAutoModes(prev => ({ ...prev, wingo_5m: m })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ House Best (100% Profit)', desc: 'Guarantees lowest house payout' },
        { id: 'target_50', label: '⚖️ 50% Balanced', desc: 'Standard 50% target' },
        { id: 'target_75', label: '🌟 75% Player Favored', desc: 'Player favored' },
        { id: 'fair', label: '🎲 100% Fair Random', desc: 'Unbiased RNG' },
      ],
    },
    {
      id: 'seven_up_down',
      name: '7 Up 7 Down (Live Casino)',
      shortTitle: '7 Up Down',
      category: 'casino',
      tag: 'LIVE DEALER 12X',
      icon: '♠️',
      color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30',
      desc: 'Live dealer card & dice game (Down 2-6, Lucky 7, Up 8-12).',
      hasModes: true,
      currentMode: 'house_best',
      setMode: () => {},
      modeOptions: [
        { id: 'house_best', label: '🛡️ House Best (Lowest Payout Card/Dice)', desc: 'Picks lowest payout side' },
        { id: 'fair', label: '🎲 Fair 52-Deck & Twin Dice RNG', desc: 'Pure random outcome' },
      ],
    },
    {
      id: 'aviator',
      name: 'Aviator Crash Plane',
      shortTitle: 'Aviator',
      category: 'crash',
      tag: 'CRASH 100X',
      icon: '✈️',
      color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30',
      desc: 'Ascending airplane multiplier crash curve with instant cashouts.',
      hasModes: true,
      currentMode: otherControls.aviator.mode || 'house_best',
      setMode: (m: string) => setOtherControls(prev => ({ ...prev, aviator: { ...prev.aviator, mode: m as any } })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ Auto Crash on High Pool', desc: 'Crashes early when bet pool is large' },
        { id: 'force_multiplier', label: '⚡ Fixed Crash Multiplier', desc: 'Crashes at exact configured multiplier' },
        { id: 'fair', label: '🎲 100% Fair RNG Multiplier', desc: 'Random crash point' },
      ],
      extraControls: (
        <div className="mt-3 p-3 bg-[#0a0c14] rounded-xl border border-white/5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-300">
            <span>Forced Crash Multiplier:</span>
            <span className="font-mono font-bold text-sky-400">
              {(otherControls.aviator.forcedCrashMultiplier || 1.25).toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="1.05"
            max="3.50"
            step="0.05"
            value={otherControls.aviator.forcedCrashMultiplier || 1.25}
            onChange={(e) => setOtherControls(prev => ({
              ...prev,
              aviator: { ...prev.aviator, forcedCrashMultiplier: Number(e.target.value) }
            }))}
            className="w-full accent-sky-400 cursor-pointer"
          />
        </div>
      ),
    },
    {
      id: 'mines',
      name: 'Mines (5x5 Bomb Matrix)',
      shortTitle: 'Mines',
      category: 'instant',
      tag: '25 TILES',
      icon: '💣',
      color: 'from-amber-500/20 to-red-500/10 border-amber-500/30',
      desc: '25-tile gemstone finding game with hidden explosive traps.',
      hasModes: true,
      currentMode: otherControls.mines.mode || 'house_best',
      setMode: (m: string) => setOtherControls(prev => ({ ...prev, mines: { ...prev.mines, mode: m as any } })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ Smart Anti-Greed Trap', desc: 'Protects house against high bets' },
        { id: 'step_trap', label: '⚡ Forced Step Blast', desc: 'Triggers bomb on step 2 or 3' },
        { id: 'fair', label: '🎲 100% Fair Tile Distribution', desc: 'True random gemstone placement' },
      ],
      extraControls: (
        <div className="mt-3 p-3 bg-[#0a0c14] rounded-xl border border-white/5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-300">
            <span>High-Bet Trap Threshold:</span>
            <span className="font-mono font-bold text-amber-400">
              ₹{otherControls.mines.autoTrapHighBetThreshold || 100}+
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="1000"
            step="20"
            value={otherControls.mines.autoTrapHighBetThreshold || 100}
            onChange={(e) => setOtherControls(prev => ({
              ...prev,
              mines: { ...prev.mines, autoTrapHighBetThreshold: Number(e.target.value) }
            }))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>
      ),
    },
    {
      id: 'roulette',
      name: 'European Roulette',
      shortTitle: 'Roulette',
      category: 'casino',
      tag: '37 NUMBERS',
      icon: '🎡',
      color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/30',
      desc: 'Single-zero European spinning roulette wheel (0-36).',
      hasModes: true,
      currentMode: otherControls.roulette.mode || 'house_best',
      setMode: (m: string) => setOtherControls(prev => ({ ...prev, roulette: { ...prev.roulette, mode: m as any } })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ Minimum Payout Number/Color', desc: 'Spins into lowest liability slot' },
        { id: 'fair', label: '🎲 Standard Physics Random Spin', desc: 'Pure random wheel outcome' },
      ],
    },
    {
      id: 'chicken_road',
      name: 'Chicken Cross Road',
      shortTitle: 'Chicken Road',
      category: 'instant',
      tag: 'CROSSING',
      icon: '🐔',
      color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30',
      desc: 'Multi-lane obstacle crossing multiplier game.',
      hasModes: true,
      currentMode: otherControls.chicken_road.mode || 'house_best',
      setMode: (m: string) => setOtherControls(prev => ({ ...prev, chicken_road: { ...prev.chicken_road, mode: m as any } })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ House Trap Mode', desc: 'Limits deep multi-lane payouts' },
        { id: 'fair', label: '🎲 Fair Lane Obstacles', desc: 'Pure random obstacles' },
      ],
    },
    {
      id: 'plinko',
      name: 'Plinko Pegs & Balls',
      shortTitle: 'Plinko',
      category: 'instant',
      tag: 'PIN PYRAMID',
      icon: '🟢',
      color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
      desc: 'Pyramid bounce peg drop into bottom multiplier buckets.',
      hasModes: true,
      currentMode: otherControls.plinko.mode || 'house_best',
      setMode: (m: string) => setOtherControls(prev => ({ ...prev, plinko: { ...prev.plinko, mode: m as any } })),
      modeOptions: [
        { id: 'house_best', label: '🛡️ Low Multiplier Slots (0.2x–1x)', desc: 'Favors central low payout buckets' },
        { id: 'fair', label: '🎲 Standard Physics Pin Drop', desc: 'Pure random bounces' },
      ],
    },
    {
      id: 'ludo',
      name: 'Ludo Battle Cash',
      shortTitle: 'Ludo',
      category: 'table',
      tag: '4-PLAYER PVP & BOTS',
      icon: '🎲',
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
      desc: 'Multiplayer 4-Player & 2-Player classic Ludo Board game with cash prizes.',
      hasModes: true,
      currentMode: 'house_best',
      setMode: () => {},
      modeOptions: [
        { id: 'house_best', label: '🛡️ House Edge (Smart Bot Strategy & 5% Table Cut)', desc: '5% house rake with balanced bot assistance' },
        { id: 'fair', label: '🎲 100% Fair Random Dice & Real PVP', desc: 'Pure unbiased physics dice rolls' },
      ],
    },
  ];

  const displayedGames = selectedGameTab === 'all'
    ? ALL_GAMES_LIST
    : ALL_GAMES_LIST.filter(g => g.id === selectedGameTab);

  return (
    <div className="min-h-screen bg-[#07080b] text-white p-4 sm:p-6 lg:p-8 font-sans space-y-6 pb-32 select-none">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 border animate-fadeIn ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950 text-rose-300 border-rose-500/40'
          }`}
        >
          {toastMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Main Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black font-black shadow-md">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Game Tax & Winning Deduction Settings</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Per-Game Sections
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure individual winning tax percentages (% GST Cut) and profit algorithm modes for every game independently.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAllSettings}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-[#141622] hover:bg-[#1f2235] border border-white/10 text-xs font-bold text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white text-xs font-black transition flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Games'}</span>
          </button>
        </div>
      </div>

      {/* QUICK BULK PRESET TOOLBAR */}
      <div className="bg-[#0f111a] border border-[#23273c] rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-black text-white">Quick Bulk Actions (Apply to All 10 Games):</span>
          </div>
          <span className="text-xs text-zinc-400">
            Easily standardize tax or profit modes across all games simultaneously
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick Winning Cut % */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-300 block">
              Set Winning Tax % for ALL Games:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 1, 2, 3, 5, 10].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handleApplyGlobalCutToAll(pct)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono transition border cursor-pointer ${
                    globalWinningCut === pct
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                      : 'bg-[#181b28] hover:bg-[#23273a] text-zinc-300 border-white/10'
                  }`}
                >
                  {pct}% {pct === 0 ? '(0% No Tax)' : pct === 2 ? '(Standard GST)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Profit Mode */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-300 block">
              Set Profit Engine Mode for ALL Games:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBulkSetProfitMode('house_best')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black transition cursor-pointer"
              >
                🛡️ All House Best (Max Profit)
              </button>
              <button
                onClick={() => handleBulkSetProfitMode('target_50')}
                className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-black transition cursor-pointer"
              >
                ⚖️ All 50% Balanced
              </button>
              <button
                onClick={() => handleBulkSetProfitMode('fair')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black transition cursor-pointer"
              >
                🎲 All 100% Fair RNG
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED PER-GAME NAVIGATION TABS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span className="font-bold uppercase tracking-wider text-[11px] text-zinc-400">Select Game Section:</span>
          <span>{ALL_GAMES_LIST.length} Games Available</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedGameTab('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${
              selectedGameTab === 'all'
                ? 'bg-amber-500 text-black border-amber-400 shadow-lg'
                : 'bg-[#10121c] border-white/5 text-zinc-400 hover:text-white hover:bg-[#181b28]'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>All Games Overview ({ALL_GAMES_LIST.length})</span>
          </button>

          {ALL_GAMES_LIST.map((g) => {
            const isSelected = selectedGameTab === g.id;
            const cut = gameWinningCuts[g.id] !== undefined ? gameWinningCuts[g.id] : globalWinningCut;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGameTab(g.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md font-black'
                    : 'bg-[#10121c] border-white/5 text-zinc-400 hover:text-white hover:bg-[#181b28]'
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.shortTitle}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                    isSelected ? 'bg-black/30 text-black' : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {cut}% Tax
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GAMES GRID: EVERY GAME HAS ITS OWN DEDICATED STANDALONE SECTION */}
      <div className={`grid gap-6 ${selectedGameTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {displayedGames.map((game) => {
          const currentCut = gameWinningCuts[game.id] !== undefined ? gameWinningCuts[game.id] : globalWinningCut;
          const exampleWin = 1000;
          const taxCut = (exampleWin * currentCut) / 100;
          const netCredit = Math.max(0, exampleWin - taxCut);
          const isSavingThis = savingGameId === game.id;

          return (
            <div
              key={game.id}
              className={`bg-[#0e1019] border ${
                selectedGameTab === game.id ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-[#23273c] hover:border-[#3b4164]'
              } rounded-3xl p-5 sm:p-6 shadow-2xl transition-all flex flex-col justify-between space-y-5`}
            >
              <div className="space-y-4">
                {/* Header: Icon, Name, Category Tag */}
                <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#151824] border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                      {game.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-white">
                          {game.name}
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{game.desc}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2.5 py-1 bg-[#1a1e2f] border border-white/10 text-amber-300 font-mono text-[10px] font-bold rounded-xl whitespace-nowrap">
                      {game.tag}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Current Tax: {currentCut}%
                    </span>
                  </div>
                </div>

                {/* SECTION 1: DEDICATED WINNING TAX / GST CUT % INPUT */}
                <div className="bg-[#121522] border border-amber-500/25 rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-400" />
                      <span>{game.shortTitle} Winning Tax / GST Deduction</span>
                    </span>
                    <div className="flex items-center gap-1.5 bg-[#0a0c13] px-3 py-1 rounded-xl border border-amber-500/30">
                      <span className="text-[11px] text-zinc-400 font-bold">Deduction:</span>
                      <span className="text-sm font-black font-mono text-amber-400">{currentCut}%</span>
                    </div>
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Quick Tax Presets:</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[0, 1, 2, 3, 4, 5].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => updateSingleGameCut(game.id, pct)}
                          className={`py-1.5 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${
                            currentCut === pct
                              ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md'
                              : 'bg-[#0a0c13] border-white/5 text-zinc-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {pct}% {pct === 0 ? 'Free' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Number Input & Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-zinc-300">
                      <span>Custom Tax Percentage:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.1"
                          value={currentCut}
                          onChange={(e) => updateSingleGameCut(game.id, Number(e.target.value))}
                          className="w-16 bg-[#0a0c13] border border-amber-500/40 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                        />
                        <span className="font-bold text-amber-400">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={currentCut}
                      onChange={(e) => updateSingleGameCut(game.id, Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Dynamic Real-Time Example Formula Calculation */}
                  <div className="bg-[#090b12] p-3 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Live Payout Formula Preview:</span>
                      <span className="text-zinc-500 font-mono">Formula: Win - (Win × {currentCut}%)</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-[#141622] p-2 rounded-lg">
                      <span className="text-zinc-300">Player Gross Win: <strong>₹{exampleWin}</strong></span>
                      <span className="text-rose-400">Tax Cut ({currentCut}%): <strong>-₹{taxCut.toFixed(2)}</strong></span>
                      <span className="text-emerald-400 font-bold">Net Wallet Credit: <strong>₹{netCredit.toFixed(2)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PROFIT ENGINE & RISK MODE FOR THIS GAME */}
                {game.hasModes && (
                  <div className="bg-[#121522] border border-white/10 rounded-2xl p-4 space-y-2.5">
                    <span className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>{game.shortTitle} Algorithm & Profit Mode</span>
                    </span>

                    <div className="space-y-1.5">
                      {game.modeOptions.map((opt) => {
                        const isSelected = game.currentMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => game.setMode(opt.id)}
                            className={`w-full py-2 px-3 rounded-xl text-left transition flex items-center justify-between border cursor-pointer ${
                              isSelected
                                ? 'bg-blue-500/20 border-blue-400 text-blue-300 font-black'
                                : 'bg-[#0a0c13] border-white/5 text-zinc-400 hover:bg-white/5'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold">{opt.label}</div>
                              <div className="text-[10px] text-zinc-400">{opt.desc}</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Extra Controls if any (Mines Threshold, Aviator Multiplier) */}
                    {game.extraControls}
                  </div>
                )}
              </div>

              {/* Dedicated Save Button for this Individual Game */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                  <span>Configured Tax:</span>
                  <span className="font-mono font-bold text-amber-300">{currentCut}%</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveSingleGame(game.id, game.name)}
                  disabled={isSavingThis || saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingThis ? 'Saving...' : `Save ${game.shortTitle} Tax`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* STICKY BOTTOM SAVE BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#07080b]/95 backdrop-blur-md border-t border-white/10 py-3 px-4 sm:px-8 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Total <strong>10 Games</strong> Active</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Global Tax Preset: <strong className="text-amber-300 font-mono">{globalWinningCut}%</strong></span>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-black text-sm transition flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Save All 10 Games Settings'}</span>
        </button>
      </div>
    </div>
  );
};
