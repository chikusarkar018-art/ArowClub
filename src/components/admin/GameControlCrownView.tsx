import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { BALL_ASSETS, getNumberColor, getNumberBigSmall } from '../../constants/assets.js';
import { GameType, AllGamesControlSettings } from '../../types.js';
import {
  Sliders, Check, Lock, Unlock, X, RefreshCw, Zap,
  AlertTriangle, CheckCircle2, ChevronDown, Bomb, CircleDot,
  Plane, Flame, Save, ShieldAlert, Sparkles, Target, Eye,
  Gamepad2, Power, Dices
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

interface AutoRule {
  id?: string;
  maxAmount: number | string;
  mode: string;
}

// 3D Glossy Sphere Ball Component
const ShinyGlossBall: React.FC<{ number: number; profit?: number; size?: 'sm' | 'md' | 'lg' }> = ({
  number,
  profit = 0,
  size = 'md'
}) => {
  const assetUrl = BALL_ASSETS[number];
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';

  const getGradientStyle = (num: number) => {
    if (num === 0) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #f472b6 0%, #c084fc 30%, #9333ea 65%, #4c1d95 100%)',
        boxShadow: '0 4px 10px rgba(147, 51, 234, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.4)'
      };
    }
    if (num === 5) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #a7f3d0 0%, #c084fc 35%, #8b5cf6 65%, #065f46 100%)',
        boxShadow: '0 4px 10px rgba(139, 92, 246, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.4)'
      };
    }
    if ([1, 3, 7, 9].includes(num)) {
      return {
        background: 'radial-gradient(circle at 35% 30%, #a7f3d0 0%, #34d399 30%, #059669 65%, #064e3b 100%)',
        boxShadow: '0 4px 10px rgba(5, 150, 105, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0, 0, 0, 0.4)'
      };
    }
    return {
      background: 'radial-gradient(circle at 35% 30%, #fecaca 0%, #f87171 30%, #dc2626 65%, #7f1d1d 100%)',
      boxShadow: '0 4px 10px rgba(220, 38, 38, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0, 0, 0, 0.4)'
    };
  };

  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`relative ${sizeClass} rounded-full flex items-center justify-center font-black text-white select-none transition-transform hover:scale-105`}
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
          <span className="font-extrabold text-white text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {number}
          </span>
        )}
      </div>
      <span className="text-[#10b981] font-mono text-[11px] font-bold text-center mt-1 tracking-tight">
        +{profit >= 0 ? profit : 0}
      </span>
    </div>
  );
};

export const GameControlCrownView: React.FC<{ defaultActiveTab?: string }> = ({ defaultActiveTab = 'all_games' }) => {
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState<'all_games' | 'wingo' | 'mines' | 'roulette' | 'aviator' | 'chicken_plinko' | 'ludo'>(
    (defaultActiveTab as any) || 'all_games'
  );

  // Wingo Games state
  const [games, setGames] = useState<GameControlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auto Result Rules state for Wingo
  const [rules, setRules] = useState<AutoRule[]>([
    { id: 'rule-1', maxAmount: 5000, mode: 'house_best' },
    { id: 'rule-2', maxAmount: 30000, mode: 'house_best' },
    { id: 'rule-3', maxAmount: 70000, mode: 'house_best' },
    { id: 'rule-4', maxAmount: 'infinity', mode: 'house_best' },
  ]);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Modal for Wingo manual ball selection
  const [selectedGameForModal, setSelectedGameForModal] = useState<GameControlRow | null>(null);
  const [lockingNumber, setLockingNumber] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Master All Games Controls
  const [allControls, setAllControls] = useState<AllGamesControlSettings>({
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
      forcedCrashMultiplier: null,
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
    ludo: {
      isActive: true,
      maintenanceNotice: 'लूडो गेम में नया अपडेट और मेंटेनेंस कार्य प्रगति पर है। कृपया कुछ समय बाद पुनः प्रयास करें।',
      botDifficulty: 'medium',
      winTargetRTP: 0.90,
    },
  });
  const [savingMasterControls, setSavingMasterControls] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchOverview = async () => {
    try {
      const [wRes, cRes] = await Promise.all([
        api.getGameControlOverview().catch(() => ({ games: [] })),
        api.getAdminAllGameControls().catch(() => ({ controls: null })),
      ]);

      if (wRes?.games) {
        setGames(wRes.games);
        if (wRes.autoResultRules && Array.isArray(wRes.autoResultRules) && wRes.autoResultRules.length > 0) {
          setRules(wRes.autoResultRules);
        }
      }

      if (cRes?.controls) {
        setAllControls(prev => ({
          ...prev,
          ...cRes.controls,
        }));
      }
    } catch (err: any) {
      console.error('Failed to fetch game control:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(fetchOverview, 1500);
    return () => clearInterval(timer);
  }, []);

  const handleSaveMasterControls = async () => {
    setSavingMasterControls(true);
    try {
      const res = await api.updateAdminAllGameControls(allControls, admin?.username);
      if (res?.success) {
        showToast('All Game Controls & Rigging Parameters saved successfully!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save controls', 'error');
    } finally {
      setSavingMasterControls(false);
    }
  };

  // Wingo Auto Mode Change
  const handleAutoModeChange = async (gameType: GameType, mode: string) => {
    setSavingMode(gameType);
    try {
      const res = await api.setGameAutoMode(gameType, mode);
      if (res?.success) {
        showToast(`Auto Mode set to [${formatModeLabel(mode)}] for ${getGameDisplayName(gameType)}`);
        fetchOverview();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update auto mode', 'error');
    } finally {
      setSavingMode(null);
    }
  };

  const handleLockWinningBall = async (num: number | null) => {
    if (!selectedGameForModal) return;
    setActionLoading(true);
    try {
      const res = await api.lockGameWinningNumber(
        selectedGameForModal.gameType,
        selectedGameForModal.periodId,
        num,
        admin?.username || 'SuperAdmin'
      );
      if (res?.success) {
        showToast(
          num !== null
            ? `Winning Ball #${num} LOCKED for ${selectedGameForModal.name} Period #${selectedGameForModal.periodId}!`
            : `Lock cleared for ${selectedGameForModal.name} (reverted to Auto Mode)`
        );
        setSelectedGameForModal(null);
        fetchOverview();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to lock number', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRules = async () => {
    setIsSavingRules(true);
    try {
      const res = await api.setGameAutoRules(rules);
      if (res?.success) {
        showToast('Auto Result Rules saved successfully!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save rules', 'error');
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleAddRule = () => {
    setRules(prev => [
      ...prev,
      { id: `rule-${Date.now()}`, maxAmount: 100000, mode: 'house_best' }
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRuleAmountChange = (index: number, val: string) => {
    setRules(prev => {
      const copy = [...prev];
      if (val === '∞' || val.toLowerCase() === 'infinity') {
        copy[index].maxAmount = 'infinity';
      } else {
        const parsed = parseInt(val.replace(/[^0-9]/g, ''), 10);
        copy[index].maxAmount = isNaN(parsed) ? '' : parsed;
      }
      return copy;
    });
  };

  const handleRuleModeChange = (index: number, mode: string) => {
    setRules(prev => {
      const copy = [...prev];
      copy[index].mode = mode;
      return copy;
    });
  };

  const getGameDisplayName = (gt: string) => {
    switch (gt) {
      case 'wingo_30s': return '30 Seconds';
      case 'wingo_1m': return '1 Minute';
      case 'wingo_3m': return '3 Minutes';
      case 'wingo_5m': return '5 Minutes';
      default: return gt;
    }
  };

  const formatModeLabel = (mode: string) => {
    switch (mode) {
      case 'house_best': return 'House Best (Min Payout)';
      case '50_percent': return '50% Winning Target';
      case '75_percent': return '75% Winning Target';
      case '25_percent': return '25% Winning Target';
      case '100_percent': return '100% Winning Target';
      case 'auto_rules': return 'Custom Auto Rules';
      case 'fair': return '100% Fair Random';
      default: return mode;
    }
  };

  // Toggle Mine custom coordinate in 5x5 grid
  const toggleMineTile = (tileIndex: number) => {
    setAllControls(prev => {
      const current = prev.mines.forcedMineCoordinates || [];
      const updated = current.includes(tileIndex)
        ? current.filter(t => t !== tileIndex)
        : [...current, tileIndex];
      return {
        ...prev,
        mines: {
          ...prev.mines,
          forcedMineCoordinates: updated,
        }
      };
    });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold transition-all ${
          toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toastMsg.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                All Games Master Control & Result Override
                <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                  100% Admin Dictated
                </span>
              </h1>
              <p className="text-xs text-zinc-300 mt-0.5">
                Total control over all platform games (Win Go, Mines, Roulette, Aviator, Chicken Road, Plinko). "Admin jo chahega waisa hi hoga."
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveMasterControls}
              disabled={savingMasterControls}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingMasterControls ? 'Saving...' : 'Save All Game Controls'}
            </button>
            <button
              onClick={fetchOverview}
              className="p-2 rounded-xl bg-[#1c1c22] border border-[#33333d] text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 border-t border-[#26262e] pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all_games')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all_games'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181820] text-zinc-300 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Master Overview (सभी गेम्स)
          </button>
          <button
            onClick={() => setActiveTab('wingo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wingo'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181820] text-zinc-300 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            Win Go 30s/1m/3m/5m
          </button>
          <button
            onClick={() => setActiveTab('mines')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mines'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181820] text-zinc-300 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <Bomb className="w-4 h-4 text-red-400" />
            Mines Game Hack & Bomb Grid
          </button>
          <button
            onClick={() => setActiveTab('roulette')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'roulette'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181820] text-zinc-300 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <CircleDot className="w-4 h-4 text-amber-400" />
            Roulette Spin Number Override
          </button>
          <button
            onClick={() => setActiveTab('aviator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'aviator'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181820] text-zinc-300 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <Plane className="w-4 h-4 text-cyan-400" />
            Aviator Crash Multiplier Control
          </button>
          <button
            onClick={() => setActiveTab('chicken_plinko')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chicken_plinko'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181820] text-zinc-300 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-400" />
            Chicken Road & Plinko
          </button>
          <button
            onClick={() => setActiveTab('ludo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ludo'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181820] text-zinc-300 hover:text-white hover:bg-[#20202a]'
            }`}
          >
            <Dices className="w-4 h-4 text-rose-400" />
            Ludo King (Active / Inactive)
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: MASTER OVERVIEW ===================== */}
      {activeTab === 'all_games' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Mines Game Control Summary */}
          <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262e] pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Bomb className="w-4 h-4 text-red-400" />
                Mines Game Master Setting
              </h3>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                allControls.mines.mode === 'house_best' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                Mode: {allControls.mines.mode.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Mines Algorithm Mode:</label>
                <select
                  value={allControls.mines.mode}
                  onChange={(e) => setAllControls({ ...allControls, mines: { ...allControls.mines, mode: e.target.value as any } })}
                  className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="house_best">House Dominance (Auto Trap on high bets / early explosion)</option>
                  <option value="step_trap">Forced Explosion at Specific Step</option>
                  <option value="custom_tiles">Custom Mine Coordinates (Pre-set bomb positions)</option>
                  <option value="fair">Fair Probability (97.5% Spribe Standard)</option>
                  <option value="force_win">Force Player Win (Safe gems)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Explode at Step (1-24):</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={allControls.mines.forcedTrapStep}
                    onChange={(e) => setAllControls({ ...allControls, mines: { ...allControls.mines, forcedTrapStep: Number(e.target.value) } })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Auto-Trap High Bet (₹):</label>
                  <input
                    type="number"
                    min="10"
                    value={allControls.mines.autoTrapHighBetThreshold}
                    onChange={(e) => setAllControls({ ...allControls, mines: { ...allControls.mines, autoTrapHighBetThreshold: Number(e.target.value) } })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-red-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 italic">
                Tip: When bet &gt;= ₹{allControls.mines.autoTrapHighBetThreshold}, player will hit a bomb on step 1-2 to protect house margin.
              </p>
            </div>
          </div>

          {/* Card 2: Roulette Game Control Summary */}
          <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262e] pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-amber-400" />
                Roulette Master Setting
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Mode: {allControls.roulette.mode.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Roulette Mode:</label>
                <select
                  value={allControls.roulette.mode}
                  onChange={(e) => setAllControls({ ...allControls, roulette: { ...allControls.roulette, mode: e.target.value as any } })}
                  className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="house_best">House Best Profit (Picks number with minimum user payout)</option>
                  <option value="force_number">Force Exact Number (0 to 36)</option>
                  <option value="force_color">Force Winning Color (Red / Black / Green)</option>
                  <option value="fair">Fair Standard European Random</option>
                </select>
              </div>

              {allControls.roulette.mode === 'force_number' && (
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Lock Exact Next Spin Number (0-36):</label>
                  <input
                    type="number"
                    min="0"
                    max="36"
                    placeholder="Enter 0 to 36"
                    value={allControls.roulette.forcedNextNumber ?? ''}
                    onChange={(e) => setAllControls({ ...allControls, roulette: { ...allControls.roulette, forcedNextNumber: e.target.value !== '' ? Number(e.target.value) : null } })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {allControls.roulette.mode === 'force_color' && (
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Lock Exact Winning Color:</label>
                  <select
                    value={allControls.roulette.forcedNextColor || 'red'}
                    onChange={(e) => setAllControls({ ...allControls, roulette: { ...allControls.roulette, forcedNextColor: e.target.value as any } })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="red">🔴 Red Numbers (1, 3, 5, 7, 9, 12...)</option>
                    <option value="black">⚫ Black Numbers (2, 4, 6, 8, 10, 11...)</option>
                    <option value="green">🟢 Green Zero (0)</option>
                  </select>
                </div>
              )}

              <p className="text-[11px] text-zinc-400 italic">
                In 'House Best Profit' mode, the server evaluates all user chips on the table and spins into the pocket that pays out ₹0 or least amount.
              </p>
            </div>
          </div>

          {/* Card 3: Aviator Crash Game Control Summary */}
          <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262e] pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plane className="w-4 h-4 text-cyan-400" />
                Aviator Crash Multiplier Control
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Mode: {allControls.aviator.mode.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Crash Algorithm Mode:</label>
                <select
                  value={allControls.aviator.mode}
                  onChange={(e) => setAllControls({ ...allControls, aviator: { ...allControls.aviator, mode: e.target.value as any } })}
                  className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="house_best">House Dominance (Auto Crash &lt; 1.25x on large bets)</option>
                  <option value="force_multiplier">Force Next Flight Crash Multiplier (e.g. 1.10x, 2.50x, 10x)</option>
                  <option value="fair">Fair Standard Multiplier Engine</option>
                </select>
              </div>

              {allControls.aviator.mode === 'force_multiplier' && (
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Set Next Crash Multiplier (x):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    placeholder="e.g. 1.25, 2.50, 10.00"
                    value={allControls.aviator.forcedCrashMultiplier ?? ''}
                    onChange={(e) => setAllControls({ ...allControls, aviator: { ...allControls.aviator, forcedCrashMultiplier: e.target.value ? Number(e.target.value) : null } })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-cyan-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Total Pool Threshold for Early Crash (₹):</label>
                <input
                  type="number"
                  min="50"
                  value={allControls.aviator.autoCrashPoolThreshold}
                  onChange={(e) => setAllControls({ ...allControls, aviator: { ...allControls.aviator, autoCrashPoolThreshold: Number(e.target.value) } })}
                  className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Chicken Road & Plinko */}
          <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262e] pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Chicken Road & Plinko Control
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Chicken Road Trap Step:</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={allControls.chicken_road.forcedTrapStep}
                    onChange={(e) => setAllControls({ ...allControls, chicken_road: { ...allControls.chicken_road, forcedTrapStep: Number(e.target.value) } })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-orange-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Plinko Default Slot (x):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    value={allControls.plinko.forcedSlotMultiplier}
                    onChange={(e) => setAllControls({ ...allControls, plinko: { ...allControls.plinko, forcedSlotMultiplier: Number(e.target.value) } })}
                    className="w-full bg-[#181820] border border-[#33333d] rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveMasterControls}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Apply All Controls
                </button>
              </div>
            </div>
          </div>

          {/* Card 5: Ludo Game Active / Inactive & Maintenance Control */}
          <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-5 shadow-xl space-y-4 md:col-span-2">
            <div className="flex items-center justify-between border-b border-[#26262e] pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Dices className="w-4 h-4 text-rose-400" />
                Ludo King Realtime Switch & Maintenance Control (लूडो गेम चालू/बंद कंट्रोल)
              </h3>
              <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${
                allControls.ludo?.isActive !== false
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
              }`}>
                {allControls.ludo?.isActive !== false ? '🟢 LIVE (ACTIVE - खिलाड़ी खेल सकते हैं)' : '🔴 INACTIVE / MAINTENANCE (बंद - काम जारी है)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-2 bg-[#181820] border border-[#2b2b36] rounded-xl p-3.5">
                <label className="text-zinc-300 font-bold block">Game Live Toggle / स्विच:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAllControls({
                        ...allControls,
                        ludo: {
                          ...(allControls.ludo || { maintenanceNotice: '', botDifficulty: 'medium', winTargetRTP: 0.90 }),
                          isActive: true,
                        }
                      });
                      showToast('लूडो गेम चालू (Active) कर दिया गया है।');
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      allControls.ludo?.isActive !== false
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                        : 'bg-[#121217] text-zinc-400 hover:text-white border border-[#33333d]'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    चालू (Active)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAllControls({
                        ...allControls,
                        ludo: {
                          ...(allControls.ludo || { maintenanceNotice: '', botDifficulty: 'medium', winTargetRTP: 0.90 }),
                          isActive: false,
                        }
                      });
                      showToast('लूडो गेम बंद (Inactive / Maintenance) कर दिया गया है।', 'error');
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      allControls.ludo?.isActive === false
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-[#121217] text-zinc-400 hover:text-white border border-[#33333d]'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    बंद (Inactive)
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400">
                  यदि बंद करेंगे, तो यूजर साइड पर मेंटेनेंस सूचना दिखेगी और गेम में एंट्री बंद रहेगी।
                </p>
              </div>

              <div className="space-y-2 bg-[#181820] border border-[#2b2b36] rounded-xl p-3.5 md:col-span-2">
                <label className="text-zinc-300 font-bold block">
                  Maintenance Notice to Users (बंद रहने पर दिखने वाली सूचना):
                </label>
                <input
                  type="text"
                  value={allControls.ludo?.maintenanceNotice ?? 'लूडो गेम में नया अपडेट और मेंटेनेंस कार्य प्रगति पर है। कृपया कुछ समय बाद पुनः प्रयास करें।'}
                  onChange={(e) => setAllControls({
                    ...allControls,
                    ludo: {
                      ...(allControls.ludo || { isActive: true, botDifficulty: 'medium', winTargetRTP: 0.90 }),
                      maintenanceNotice: e.target.value,
                    }
                  })}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400 text-xs"
                  placeholder="e.g. लूडो गेम में काम चल रहा है, 15 मिनट बाद चालू होगा..."
                />
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveMasterControls}
                    disabled={savingMasterControls}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md hover:from-emerald-400 hover:to-green-500 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Ludo Status & Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: WINGO LIVE DASHBOARD & BALL LOCK ===================== */}
      {(activeTab === 'wingo' || activeTab === 'all_games') && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                Win Go Live Tables (30s, 1m, 3m, 5m) Result Control & Hack
              </h2>
              <p className="text-xs text-zinc-300 mt-0.5">
                Realtime countdown, house best profit calculation, and instant manual number locking.
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400 bg-[#1a1a22] px-3 py-1.5 rounded-lg border border-[#2a2a32]">
              Live Feed: 1.5s refresh
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-200">
              <thead className="bg-[#181820] text-zinc-300 uppercase tracking-wider font-semibold text-[11px] border border-[#26262e]">
                <tr>
                  <th className="p-3">Timer Game</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Time Left</th>
                  <th className="p-3">Total Bet (₹)</th>
                  <th className="p-3 text-center">House Best (Min Payout)</th>
                  <th className="p-3 text-center">50% Payout</th>
                  <th className="p-3 text-center">75% Payout</th>
                  <th className="p-3 text-center">Auto Mode</th>
                  <th className="p-3 text-right">Lock Next Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24242c] border border-t-0 border-[#26262e]">
                {games.map((g) => (
                  <tr key={g.gameType} className="hover:bg-[#181822]/60 transition-colors">
                    <td className="p-3 font-bold text-white whitespace-nowrap">
                      {g.name}
                    </td>
                    <td className="p-3 font-mono text-amber-300 font-bold">
                      #{g.periodId}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                        g.remainingSeconds <= 5
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {g.formattedTime}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-white">
                      ₹{g.totalBetAmount.toLocaleString()} ({g.playersCount} players)
                    </td>
                    <td className="p-3 text-center">
                      {g.houseBest ? (
                        <ShinyGlossBall number={g.houseBest.number} profit={g.houseBest.profitDiff} size="sm" />
                      ) : '---'}
                    </td>
                    <td className="p-3 text-center">
                      {g.target50 ? (
                        <ShinyGlossBall number={g.target50.number} profit={g.target50.profitDiff} size="sm" />
                      ) : '---'}
                    </td>
                    <td className="p-3 text-center">
                      {g.target75 ? (
                        <ShinyGlossBall number={g.target75.number} profit={g.target75.profitDiff} size="sm" />
                      ) : '---'}
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={g.autoMode}
                        onChange={(e) => handleAutoModeChange(g.gameType, e.target.value)}
                        disabled={savingMode === g.gameType}
                        className="bg-[#1b1b24] border border-[#33333e] rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-amber-400"
                      >
                        <option value="house_best">House Best</option>
                        <option value="50_percent">50% Winning</option>
                        <option value="75_percent">75% Winning</option>
                        <option value="25_percent">25% Winning</option>
                        <option value="100_percent">100% Winning</option>
                        <option value="auto_rules">Auto Rules</option>
                        <option value="fair">Fair Random</option>
                      </select>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {g.manualLockedNumber !== null ? (
                        <button
                          onClick={() => {
                            setSelectedGameForModal(g);
                            setLockingNumber(g.manualLockedNumber);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 ml-auto shadow-md cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Locked: #{g.manualLockedNumber}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedGameForModal(g);
                            setLockingNumber(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 ml-auto shadow-md cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Lock Result
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: MINES MASTER GRID & COORDINATE PICKER ===================== */}
      {activeTab === 'mines' && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bomb className="w-5 h-5 text-red-400" />
                Mines 5x5 Grid Interactive Bomb Coordinate Hacker
              </h2>
              <p className="text-xs text-zinc-300 mt-0.5">
                Click tiles to place custom fixed mines on specific coordinates (0 to 24) or set automatic house-edge explosion rules.
              </p>
            </div>
            <button
              onClick={handleSaveMasterControls}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Mines Settings
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Interactive 5x5 Grid */}
            <div className="bg-[#181820] border border-[#2b2b36] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-400" />
                  Pre-set Mine Coordinates (Selected: {allControls.mines.forcedMineCoordinates?.length || 0})
                </span>
                <span className="text-[11px] text-zinc-400">
                  Click tile to toggle bomb 💥
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 max-w-[320px] mx-auto p-2 bg-[#121217] rounded-xl border border-[#26262e]">
                {Array.from({ length: 25 }, (_, i) => {
                  const isMine = (allControls.mines.forcedMineCoordinates || []).includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleMineTile(i)}
                      className={`h-12 rounded-lg font-mono font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                        isMine
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-102 border border-red-400'
                          : 'bg-[#22222c] text-zinc-400 hover:bg-[#2c2c38] hover:text-white border border-[#33333e]'
                      }`}
                    >
                      {isMine ? (
                        <>
                          <Bomb className="w-4 h-4" />
                          <span className="text-[9px] mt-0.5">#{i}</span>
                        </>
                      ) : (
                        <span>#{i}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-zinc-400 text-center">
                When 'Custom Mine Coordinates' mode is active, the game engine will place hidden mines at these exact grid locations.
              </p>
            </div>

            {/* Strategy & Rules */}
            <div className="space-y-4 bg-[#181820] border border-[#2b2b36] rounded-2xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Mines Rigging & Execution Mode
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-200 font-bold block mb-1">Execution Mode:</label>
                  <select
                    value={allControls.mines.mode}
                    onChange={(e) => setAllControls({ ...allControls, mines: { ...allControls.mines, mode: e.target.value as any } })}
                    className="w-full bg-[#121217] border border-[#33333d] rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="house_best">House Dominance (Auto Trap on high bets)</option>
                    <option value="custom_tiles">Custom Mine Coordinates (Grid above)</option>
                    <option value="step_trap">Forced Explosion at Step X</option>
                    <option value="fair">Fair 97.5% RTP</option>
                    <option value="force_win">Force Win (All Safe)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-200 font-bold block mb-1">Trap at Step Number:</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={allControls.mines.forcedTrapStep}
                      onChange={(e) => setAllControls({ ...allControls, mines: { ...allControls.mines, forcedTrapStep: Number(e.target.value) } })}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-200 font-bold block mb-1">Auto-Trap Bet Cutoff (₹):</label>
                    <input
                      type="number"
                      min="10"
                      value={allControls.mines.autoTrapHighBetThreshold}
                      onChange={(e) => setAllControls({ ...allControls, mines: { ...allControls.mines, autoTrapHighBetThreshold: Number(e.target.value) } })}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-xl px-3 py-2 text-red-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-zinc-300 text-[11px] leading-relaxed">
                  <span className="font-bold text-red-400">Admin Dictate Guarantee:</span> The client game automatically consults this master configuration. When a player bets over ₹{allControls.mines.autoTrapHighBetThreshold}, the server guarantees a mine detonation before cashout.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: ROULETTE MASTER RESULT LOCK ===================== */}
      {activeTab === 'roulette' && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-amber-400" />
                Roulette Result Lock & Profit Maximize Mode
              </h2>
              <p className="text-xs text-zinc-300 mt-0.5">
                Force the physical wheel to land on exact number (0 to 36) or enable real-time minimum house payout calculations.
              </p>
            </div>
            <button
              onClick={handleSaveMasterControls}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Roulette Controls
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 bg-[#181820] border border-[#2b2b36] rounded-2xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Select Active Roulette Control Mode
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-[#121217] border border-[#2b2b36] cursor-pointer hover:border-amber-500/40">
                  <input
                    type="radio"
                    name="rouletteMode"
                    value="house_best"
                    checked={allControls.roulette.mode === 'house_best'}
                    onChange={() => setAllControls({ ...allControls, roulette: { ...allControls.roulette, mode: 'house_best' } })}
                    className="text-amber-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">House Best Profit (Live Minimum Payout)</div>
                    <div className="text-[11px] text-zinc-400">Calculates all player bets on table in real-time and lands on the number with zero or lowest payout.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-[#121217] border border-[#2b2b36] cursor-pointer hover:border-amber-500/40">
                  <input
                    type="radio"
                    name="rouletteMode"
                    value="force_number"
                    checked={allControls.roulette.mode === 'force_number'}
                    onChange={() => setAllControls({ ...allControls, roulette: { ...allControls.roulette, mode: 'force_number' } })}
                    className="text-amber-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Force Exact Next Number (0 - 36)</div>
                    <div className="text-[11px] text-zinc-400">Manually pick exact number for the next wheel spin.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-[#121217] border border-[#2b2b36] cursor-pointer hover:border-amber-500/40">
                  <input
                    type="radio"
                    name="rouletteMode"
                    value="force_color"
                    checked={allControls.roulette.mode === 'force_color'}
                    onChange={() => setAllControls({ ...allControls, roulette: { ...allControls.roulette, mode: 'force_color' } })}
                    className="text-amber-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Force Exact Color (Red / Black / Green)</div>
                    <div className="text-[11px] text-zinc-400">Wheel automatically lands on a number matching this color.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Live Number Picker Grid */}
            <div className="bg-[#181820] border border-[#2b2b36] rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Direct Number Selector (0 - 36)</span>
                {allControls.roulette.forcedNextNumber !== null && (
                  <span className="text-amber-400 font-mono font-bold">Selected: #{allControls.roulette.forcedNextNumber}</span>
                )}
              </h3>

              <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
                {Array.from({ length: 37 }, (_, i) => {
                  const isSelected = allControls.roulette.forcedNextNumber === i;
                  const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(i);
                  const isGreen = i === 0;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAllControls({
                          ...allControls,
                          roulette: {
                            ...allControls.roulette,
                            mode: 'force_number',
                            forcedNextNumber: i,
                          }
                        });
                      }}
                      className={`h-10 rounded-lg font-black text-xs flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-amber-400 scale-105 shadow-lg shadow-amber-400/30'
                          : ''
                      } ${
                        isGreen
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : isRed
                          ? 'bg-red-600 text-white hover:bg-red-500'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setAllControls({ ...allControls, roulette: { ...allControls.roulette, forcedNextNumber: null, mode: 'house_best' } })}
                  className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Clear Number Lock (Reset to House Best)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 5: AVIATOR CRASH CONTROL ===================== */}
      {activeTab === 'aviator' && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plane className="w-5 h-5 text-cyan-400" />
                Aviator Flight Multiplier Control & Pool Safeguard
              </h2>
              <p className="text-xs text-zinc-300 mt-0.5">
                Preset exact flight crash multipliers (e.g. 1.00x instant crash, 1.15x, 2.50x, 10.00x) or automatic high-pool crash defenses.
              </p>
            </div>
            <button
              onClick={handleSaveMasterControls}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Aviator Controls
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2 bg-[#181820] border border-[#2b2b36] rounded-2xl p-5">
              <h3 className="text-xs font-bold text-white">Preset Instant Crash</h3>
              <p className="text-[11px] text-zinc-400">Lock the very next round to crash instantly:</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {[1.00, 1.12, 1.25, 1.50, 2.00, 5.00, 10.00, 50.00].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => {
                      setAllControls({
                        ...allControls,
                        aviator: {
                          ...allControls.aviator,
                          mode: 'force_multiplier',
                          forcedCrashMultiplier: mult,
                        }
                      });
                      showToast(`Next Aviator flight locked to crash at ${mult.toFixed(2)}x`);
                    }}
                    className={`py-2 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
                      allControls.aviator.forcedCrashMultiplier === mult
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                        : 'bg-[#121217] text-zinc-200 hover:bg-[#22222c] border border-[#33333d]'
                    }`}
                  >
                    {mult.toFixed(2)}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 bg-[#181820] border border-[#2b2b36] rounded-2xl p-5 md:col-span-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Custom Multiplier & Safeguards</h3>

              <div>
                <label className="text-zinc-200 font-bold block mb-1 text-xs">Custom Multiplier Value (x):</label>
                <input
                  type="number"
                  step="0.01"
                  min="1.00"
                  placeholder="e.g. 1.18"
                  value={allControls.aviator.forcedCrashMultiplier ?? ''}
                  onChange={(e) => setAllControls({ ...allControls, aviator: { ...allControls.aviator, mode: 'force_multiplier', forcedCrashMultiplier: e.target.value ? Number(e.target.value) : null } })}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-xl px-4 py-2.5 text-cyan-400 font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-zinc-200 font-bold block mb-1 text-xs">High Bet Auto-Crash Cutoff (₹):</label>
                <input
                  type="number"
                  min="100"
                  value={allControls.aviator.autoCrashPoolThreshold}
                  onChange={(e) => setAllControls({ ...allControls, aviator: { ...allControls.aviator, autoCrashPoolThreshold: Number(e.target.value) } })}
                  className="w-full bg-[#121217] border border-[#33333d] rounded-xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[11px] text-zinc-400 mt-1">If total bets in a round exceed this amount, plane will crash between 1.00x - 1.25x.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 6: LUDO KING ACTIVE / INACTIVE & BOT CONTROL ===================== */}
      {activeTab === 'ludo' && (
        <div className="bg-[#121215] border border-[#2a2a32] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262e] pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Dices className="w-5 h-5 text-rose-400" />
                Ludo King Realtime Master Switch & Game Control (लूडो गेम ऑन / ऑफ कंट्रोल)
              </h2>
              <p className="text-xs text-zinc-300 mt-0.5">
                यहाँ से आप लूडो गेम को चालू या बंद (Under Maintenance) कर सकते हैं और मेंटेनेंस नोटिस सेट कर सकते हैं।
              </p>
            </div>
            <button
              onClick={handleSaveMasterControls}
              disabled={savingMasterControls}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" />
              {savingMasterControls ? 'Saving...' : 'Save Ludo Settings (सेव करें)'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Status Card */}
            <div className="bg-[#181820] border border-[#2b2b36] rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Game Operational Status</span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  allControls.ludo?.isActive !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {allControls.ludo?.isActive !== false ? 'ACTIVE (LIVE)' : 'INACTIVE (MAINTENANCE)'}
                </span>
              </h3>

              <div className="p-4 rounded-xl bg-[#121217] border border-[#262630] text-center space-y-3">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl transition-all ${
                  allControls.ludo?.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  <Power className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">
                    {allControls.ludo?.isActive !== false ? 'Ludo Game is LIVE' : 'Ludo Game is INACTIVE'}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {allControls.ludo?.isActive !== false
                      ? 'खिलाड़ी लॉबी में मैच खेल सकते हैं।'
                      : 'गेम बंद है, खिलाड़ी एंट्री नहीं कर सकते।'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAllControls({
                        ...allControls,
                        ludo: {
                          ...(allControls.ludo || { maintenanceNotice: '', botDifficulty: 'medium', winTargetRTP: 0.90 }),
                          isActive: true,
                        }
                      });
                      showToast('लूडो गेम चालू (Active) कर दिया गया है।');
                    }}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      allControls.ludo?.isActive !== false
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                        : 'bg-[#1a1a24] text-zinc-300 hover:text-white border border-[#33333d]'
                    }`}
                  >
                    🟢 Make Live
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAllControls({
                        ...allControls,
                        ludo: {
                          ...(allControls.ludo || { maintenanceNotice: '', botDifficulty: 'medium', winTargetRTP: 0.90 }),
                          isActive: false,
                        }
                      });
                      showToast('लूडो गेम मेंटेनेंस (Inactive) कर दिया गया है।', 'error');
                    }}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      allControls.ludo?.isActive === false
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-[#1a1a24] text-zinc-300 hover:text-white border border-[#33333d]'
                    }`}
                  >
                    🔴 Turn Off
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Maintenance Message */}
            <div className="bg-[#181820] border border-[#2b2b36] rounded-2xl p-5 space-y-4 md:col-span-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Maintenance Notice & Configuration (यूजर को दिखने वाला नोटिस)
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-zinc-200 font-bold block mb-1 text-xs">
                    Maintenance Banner Message (गेम बंद रहने पर प्रदर्शित सूचना):
                  </label>
                  <textarea
                    rows={3}
                    value={allControls.ludo?.maintenanceNotice ?? 'लूडो गेम में नया अपडेट और मेंटेनेंस कार्य प्रगति पर है। कृपया कुछ समय बाद पुनः प्रयास करें।'}
                    onChange={(e) => setAllControls({
                      ...allControls,
                      ludo: {
                        ...(allControls.ludo || { isActive: true, botDifficulty: 'medium', winTargetRTP: 0.90 }),
                        maintenanceNotice: e.target.value,
                      }
                    })}
                    className="w-full bg-[#121217] border border-[#33333d] rounded-xl p-3 text-white font-medium text-xs focus:outline-none focus:border-rose-400"
                    placeholder="e.g. लूडो गेम में अभी काम चल रहा है..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-200 font-bold block mb-1 text-xs">Bot Algorithm Difficulty:</label>
                    <select
                      value={allControls.ludo?.botDifficulty || 'medium'}
                      onChange={(e) => setAllControls({
                        ...allControls,
                        ludo: {
                          ...(allControls.ludo || { isActive: true, maintenanceNotice: '', winTargetRTP: 0.90 }),
                          botDifficulty: e.target.value as any,
                        }
                      })}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="easy">Easy (Casual Bot / Relaxed)</option>
                      <option value="medium">Medium (Standard Strategic Bot)</option>
                      <option value="hard">Hard (Aggressive Token Cut Bot)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-200 font-bold block mb-1 text-xs">Target RTP House Margin:</label>
                    <select
                      value={allControls.ludo?.winTargetRTP ?? 0.90}
                      onChange={(e) => setAllControls({
                        ...allControls,
                        ludo: {
                          ...(allControls.ludo || { isActive: true, maintenanceNotice: '', botDifficulty: 'medium' }),
                          winTargetRTP: Number(e.target.value),
                        }
                      })}
                      className="w-full bg-[#121217] border border-[#33333d] rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value={0.85}>85% Payout (15% House Cut)</option>
                      <option value={0.90}>90% Standard (10% House Cut)</option>
                      <option value={0.95}>95% High Payout (5% House Cut)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span>
                    जब आप लूडो गेम को <strong>"बंद (Inactive)"</strong> करेंगे, तो खिलाड़ी लॉबी से गेम शुरू नहीं कर पाएंगे और उन्हें आपका सेट किया हुआ नोटिस दिखेगा। जब आपका काम पूरा हो जाए, तो <strong>"चालू (Make Live)"</strong> कर दें।
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL FOR WINGO BALL MANUAL SELECTION ===================== */}
      {selectedGameForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#16161c] border border-[#33333e] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2a34] pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Lock Winning Ball for {selectedGameForModal.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  Period #{selectedGameForModal.periodId} (Remaining: {selectedGameForModal.formattedTime})
                </p>
              </div>
              <button
                onClick={() => setSelectedGameForModal(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Select the exact number (0 to 9) to force as the winning outcome:
            </p>

            <div className="grid grid-cols-5 gap-3 py-2">
              {Array.from({ length: 10 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleLockWinningBall(i)}
                  disabled={actionLoading}
                  className="flex flex-col items-center p-2 rounded-xl bg-[#1f1f28] hover:bg-[#282834] border border-[#33333e] transition-all cursor-pointer disabled:opacity-50"
                >
                  <ShinyGlossBall number={i} profit={0} size="md" />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#2a2a34]">
              <button
                type="button"
                onClick={() => handleLockWinningBall(null)}
                disabled={actionLoading}
                className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-[#1f1f28] transition-all cursor-pointer"
              >
                Clear Lock (Auto Mode)
              </button>
              <button
                type="button"
                onClick={() => setSelectedGameForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
