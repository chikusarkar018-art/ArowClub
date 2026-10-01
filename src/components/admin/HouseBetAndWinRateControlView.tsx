import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { GameHouseRule } from '../../types.js';
import {
  SlidersHorizontal,
  Percent,
  Coins,
  ShieldCheck,
  Zap,
  Save,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  Gamepad2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Plane,
  Bomb,
  Dice5,
  Crown,
  Layers,
  ArrowRight,
  Check,
  X,
  Info,
  Sliders,
  DollarSign
} from 'lucide-react';

interface ToastState {
  text: string;
  type: 'success' | 'error' | 'info';
}

export const HouseBetAndWinRateControlView: React.FC = () => {
  const { admin } = useAuth();
  const [rules, setRules] = useState<GameHouseRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingGameId, setSavingGameId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmPresetModal, setConfirmPresetModal] = useState<{ presetName: string; winPercent: number } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.getGameHouseRules();
      if (res?.success && Array.isArray(res.rules)) {
        setRules(res.rules);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load game house rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleUpdateField = (id: string, field: keyof GameHouseRule, value: any) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === 'clientWinRatePercent') {
          const win = Math.min(100, Math.max(0, Number(value) || 0));
          updated.clientWinRatePercent = win;
          updated.houseEdgePercent = Math.max(0, 100 - win);
        }
        return updated;
      })
    );
  };

  const handleSaveSingleGame = async (rule: GameHouseRule) => {
    try {
      setSavingGameId(rule.id);
      const res = await api.updateSingleGameHouseRule(rule, admin?.username || 'SuperAdmin');
      if (res?.success) {
        showToast(`${rule.name} house rules & ${rule.clientWinRatePercent}% win rate saved!`, 'success');
      } else {
        showToast(res?.message || 'Failed to save game rules', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving game rules', 'error');
    } finally {
      setSavingGameId(null);
    }
  };

  const handleSaveAllGames = async () => {
    try {
      setSavingAll(true);
      const res = await api.updateGameHouseRules(rules, admin?.username || 'SuperAdmin');
      if (res?.success) {
        showToast(`All ${rules.length} games house bet limits & win % saved successfully!`, 'success');
      } else {
        showToast(res?.message || 'Failed to save all games', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save rules', 'error');
    } finally {
      setSavingAll(false);
    }
  };

  const handleApplyPresetToAll = (winPercent: number, presetName: string) => {
    setRules((prev) =>
      prev.map((r) => ({
        ...r,
        clientWinRatePercent: winPercent,
        houseEdgePercent: 100 - winPercent,
        mode: winPercent <= 25 ? 'house_best' : winPercent >= 75 ? 'player_favor' : 'auto_managed',
      }))
    );
    setConfirmPresetModal(null);
    showToast(`Applied preset "${presetName}" (${winPercent}% Win) to all games! Click "Save All Games" to persist.`, 'info');
  };

  // Helper icons by category or id
  const getGameIcon = (id: string, category: string) => {
    if (id === 'aviator') return <Plane className="w-5 h-5 text-rose-400" />;
    if (id === 'mines') return <Bomb className="w-5 h-5 text-amber-400" />;
    if (id === 'roulette') return <Crown className="w-5 h-5 text-purple-400" />;
    if (id === 'seven_up_down') return <Dice5 className="w-5 h-5 text-emerald-400" />;
    if (id === 'teen_patti') return <Flame className="w-5 h-5 text-cyan-400" />;
    if (category === 'wingo') return <Sparkles className="w-5 h-5 text-amber-400" />;
    return <Gamepad2 className="w-5 h-5 text-indigo-400" />;
  };

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.hindiName && r.hindiName.includes(searchQuery));
    const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calculate platform averages
  const avgWinRate = rules.length
    ? Math.round(rules.reduce((acc, r) => acc + (Number(r.clientWinRatePercent) || 0), 0) / rules.length)
    : 50;
  const avgHouseEdge = 100 - avgWinRate;
  const activeCount = rules.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-white">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-[999999] animate-bounce-short">
          <div
            className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500 text-rose-300'
                : 'bg-indigo-950/90 border-indigo-500 text-indigo-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================= PAGE HEADER & LIVE METRICS ================= */}
      <div className="bg-[#12131a] border border-[#23273c] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <SlidersHorizontal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>House Bet & Client Win % Control</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                    PRO MASTER
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  गेम हाउस बेट सीमा (Min/Max Bet) और क्लाइंट विनिंग प्रतिशत (RTP / Win Odds) नियंत्रित करें
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Top Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchRules}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-[#1a1d2e] border border-[#2b304c] hover:border-indigo-500 text-xs font-semibold text-zinc-300 hover:text-white transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleSaveAllGames}
              disabled={savingAll || loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-95 text-white text-xs font-black transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              {savingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving All Games...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Games (सभी गेम्स सेव करें)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-[#1e202e]">
          <div className="bg-[#181a2e] border border-[#262940] rounded-xl p-3.5">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Total Configured Games</span>
              <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">{rules.length} Games</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">{activeCount} Currently Active</div>
          </div>

          <div className="bg-[#181a2e] border border-[#262940] rounded-xl p-3.5">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Avg Client Win Rate</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">{avgWinRate}%</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Average Player Payout Rate</div>
          </div>

          <div className="bg-[#181a2e] border border-[#262940] rounded-xl p-3.5">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Avg House Margin</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-400 font-mono mt-1">{avgHouseEdge}%</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">House Profit Edge</div>
          </div>

          <div className="bg-[#181a2e] border border-[#262940] rounded-xl p-3.5">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Algorithmic Defense</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">Active (सक्रिय)</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Auto Payout Balancing</div>
          </div>
        </div>
      </div>

      {/* ================= GLOBAL ONE-CLICK PRESET BAR ================= */}
      <div className="bg-[#12131a] border border-[#23273c] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Global Win % Presets (एक क्लिक में सभी गेम्स पर लागू करें)
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            Select a target strategy to instantly preset winning rates across all games
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            onClick={() => setConfirmPresetModal({ presetName: 'Maximum House Profit (हाउस का ज्यादा प्रॉफिट)', winPercent: 20 })}
            className="p-3 rounded-xl bg-gradient-to-b from-rose-950/40 to-rose-900/20 border border-rose-500/30 hover:border-rose-500 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-300">Max House Win</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 font-mono font-bold">20% Win</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">80% House Profit (कम यूजर विनिंग)</div>
          </button>

          <button
            onClick={() => setConfirmPresetModal({ presetName: 'Strict House Favor (टाइट हाउस प्रॉफिट)', winPercent: 35 })}
            className="p-3 rounded-xl bg-gradient-to-b from-amber-950/40 to-amber-900/20 border border-amber-500/30 hover:border-amber-500 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300">Strict House</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-mono font-bold">35% Win</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">65% House Profit (सुरक्षित मार्जिन)</div>
          </button>

          <button
            onClick={() => setConfirmPresetModal({ presetName: 'Balanced Play (50/50 संतुलित)', winPercent: 50 })}
            className="p-3 rounded-xl bg-gradient-to-b from-indigo-950/40 to-indigo-900/20 border border-indigo-500/30 hover:border-indigo-500 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-300">Balanced 50/50</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono font-bold">50% Win</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">50% House / 50% Player (संतुलित)</div>
          </button>

          <button
            onClick={() => setConfirmPresetModal({ presetName: 'Fair High Play (फेयर प्ले / हाई विनिंग)', winPercent: 70 })}
            className="p-3 rounded-xl bg-gradient-to-b from-emerald-950/40 to-emerald-900/20 border border-emerald-500/30 hover:border-emerald-500 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300">Fair High Win</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-mono font-bold">70% Win</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">30% House / 70% Player (हाई विन)</div>
          </button>

          <button
            onClick={() => setConfirmPresetModal({ presetName: 'Player Festival / Lucky Day (यूजर फेस्टिवल डे)', winPercent: 90 })}
            className="p-3 rounded-xl bg-gradient-to-b from-cyan-950/40 to-cyan-900/20 border border-cyan-500/30 hover:border-cyan-500 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300">Player Festival</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-200 font-mono font-bold">90% Win</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">10% House / 90% Player (लकी डे)</div>
          </button>
        </div>
      </div>

      {/* ================= SEARCH & CATEGORY FILTER TABS ================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#12131a] border border-[#23273c] p-3 sm:p-4 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by game name (e.g. Aviator, WinGo, Mines)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Games' },
            { id: 'wingo', label: 'WinGo' },
            { id: 'crash', label: 'Crash' },
            { id: 'mines', label: 'Mines & Arcade' },
            { id: 'casino', label: 'Roulette & Dice' },
            { id: 'cards', label: 'Cards' },
            { id: 'board', label: 'Board' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-[#181a2e] border border-[#2b304c] text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= GAME HOUSE RULES CARDS GRID ================= */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
          <p className="text-xs text-zinc-400">Loading Game House Rules & Winning Parameters...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-[#12131a] border border-[#23273c] rounded-2xl p-12 text-center">
          <Gamepad2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Games Found</h3>
          <p className="text-xs text-zinc-400 mt-1">Try changing your search query or category filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredRules.map((rule) => {
            const isSavingThis = savingGameId === rule.id;
            const winRate = Number(rule.clientWinRatePercent) || 0;
            const houseEdge = Math.max(0, 100 - winRate);

            return (
              <div
                key={rule.id}
                className={`bg-[#12131a] border rounded-2xl p-5 shadow-xl transition space-y-4 relative ${
                  rule.isActive ? 'border-[#23273c] hover:border-indigo-500/40' : 'border-rose-900/30 opacity-70'
                }`}
              >
                {/* Header: Title, Category, Active Toggle */}
                <div className="flex items-start justify-between gap-3 border-b border-[#1e202e] pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#181a2e] border border-[#2b304c] flex items-center justify-center shrink-0 shadow-inner">
                      {getGameIcon(rule.id, rule.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">{rule.name}</h3>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 uppercase">
                          {rule.category}
                        </span>
                      </div>
                      <div className="text-xs text-amber-400/90 font-medium mt-0.5">
                        {rule.hindiName || rule.name}
                      </div>
                    </div>
                  </div>

                  {/* Active / Maintenance Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11px] font-bold ${
                        rule.isActive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {rule.isActive ? 'Active (सक्रिय)' : 'Maintenance'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateField(rule.id, 'isActive', !rule.isActive)}
                      className={`w-11 h-6 rounded-full transition p-1 flex items-center ${
                        rule.isActive ? 'bg-emerald-600 justify-end' : 'bg-zinc-700 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {rule.description && (
                  <p className="text-[11px] text-zinc-400 italic leading-relaxed">
                    {rule.description}
                  </p>
                )}

                {/* SECTION 1: HOUSE BET LIMITS (न्यूनतम और अधिकतम बेट) */}
                <div className="bg-[#181a2e] border border-[#262940] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <Coins className="w-3.5 h-3.5 text-indigo-400" />
                      <span>House Bet Limits (हाउस बेट सीमा)</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal">Limits per bet placement</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Minimum Bet */}
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Minimum Bet (न्यूनतम बेट):
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs text-zinc-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="1"
                          max="100000"
                          value={rule.minBet}
                          onChange={(e) => handleUpdateField(rule.id, 'minBet', Number(e.target.value))}
                          className="w-full bg-[#12131a] border border-[#2b304c] rounded-lg pl-6 pr-2 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex gap-1 mt-1">
                        {[10, 50, 100].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleUpdateField(rule.id, 'minBet', chip)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] text-zinc-400 hover:text-white font-mono transition"
                          >
                            ₹{chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Maximum Bet */}
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Maximum Bet (अधिकतम बेट):
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs text-zinc-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="100"
                          max="1000000"
                          value={rule.maxBet}
                          onChange={(e) => handleUpdateField(rule.id, 'maxBet', Number(e.target.value))}
                          className="w-full bg-[#12131a] border border-[#2b304c] rounded-lg pl-6 pr-2 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex gap-1 mt-1">
                        {[10000, 50000, 100000].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleUpdateField(rule.id, 'maxBet', chip)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] text-zinc-400 hover:text-white font-mono transition"
                          >
                            ₹{chip >= 1000 ? `${chip / 1000}k` : chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Maximum Round Payout */}
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Max Round Payout (अधिकतम पेआउट):
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs text-zinc-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="1000"
                          max="5000000"
                          value={rule.maxPayout}
                          onChange={(e) => handleUpdateField(rule.id, 'maxPayout', Number(e.target.value))}
                          className="w-full bg-[#12131a] border border-[#2b304c] rounded-lg pl-6 pr-2 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex gap-1 mt-1">
                        {[100000, 250000, 500000].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleUpdateField(rule.id, 'maxPayout', chip)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] text-zinc-400 hover:text-white font-mono transition"
                          >
                            ₹{chip / 1000}k
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: CLIENT WINNING % (क्लाइंट को कितना % विनिंग देना है) */}
                <div className="bg-[#181a2e] border border-[#262940] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Percent className="w-3.5 h-3.5 text-amber-400" />
                      <span>Client Winning % (क्लाइंट विनिंग प्रतिशत / RTP)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-400 font-medium">Win Target:</span>
                      <div className="flex items-center bg-[#12131a] border border-amber-500/40 rounded-lg px-2 py-0.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={winRate}
                          onChange={(e) => handleUpdateField(rule.id, 'clientWinRatePercent', Number(e.target.value))}
                          className="w-12 bg-transparent text-right font-mono font-black text-amber-400 text-xs focus:outline-none"
                        />
                        <span className="text-amber-400 text-xs font-bold ml-0.5">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Bar Gauge: Client Win % vs House Edge % */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${winRate}%` }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                        title={`Client Win Rate: ${winRate}%`}
                      />
                      <div
                        style={{ width: `${houseEdge}%` }}
                        className="bg-gradient-to-r from-rose-500 to-purple-600 transition-all duration-300"
                        title={`House Profit Edge: ${houseEdge}%`}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        Client Win: {winRate}%
                      </span>
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        House Profit: {houseEdge}%
                      </span>
                    </div>
                  </div>

                  {/* Interactive Slider */}
                  <div className="pt-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={winRate}
                      onChange={(e) => handleUpdateField(rule.id, 'clientWinRatePercent', Number(e.target.value))}
                      className="w-full h-2 bg-[#12131a] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Quick Preset Pills */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-[10px] text-zinc-400">Quick Win %:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: '20% Low', val: 20 },
                        { label: '35% Med', val: 35 },
                        { label: '50% Fair', val: 50 },
                        { label: '75% High', val: 75 },
                        { label: '90% Max', val: 90 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => handleUpdateField(rule.id, 'clientWinRatePercent', p.val)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                            winRate === p.val
                              ? 'bg-amber-500 text-black font-black'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: RESULT MODE & ACTIONS */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  {/* Mode selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">Result Algorithm:</span>
                    <select
                      value={rule.mode}
                      onChange={(e: any) => handleUpdateField(rule.id, 'mode', e.target.value)}
                      className="bg-[#181a2e] border border-[#2b304c] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="auto_managed">Auto Managed (Target {winRate}% Win)</option>
                      <option value="house_best">House Best (Strict House Win)</option>
                      <option value="balanced">Balanced 50/50 Fair</option>
                      <option value="player_favor">Player Lucky (High Client Win)</option>
                    </select>
                  </div>

                  {/* Save Single Game Button */}
                  <button
                    type="button"
                    onClick={() => handleSaveSingleGame(rule)}
                    disabled={isSavingThis}
                    className="px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] active:scale-95 text-white text-xs font-bold transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingThis ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Save This Game (सेव करें)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: CONFIRM PRESET TO ALL ================= */}
      {confirmPresetModal && (
        <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12131a] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Apply Preset to All Games</h3>
              </div>
              <button onClick={() => setConfirmPresetModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs text-zinc-300">
              <p>
                क्या आप वाकई सभी <strong className="text-white">{rules.length} गेम्स</strong> पर{' '}
                <strong className="text-amber-400 font-mono font-bold">
                  {confirmPresetModal.presetName} ({confirmPresetModal.winPercent}% Win Rate)
                </strong>{' '}
                लागू करना चाहते हैं?
              </p>
              <p className="text-[11px] text-zinc-400">
                इसके बाद सभी गेम्स का हाउस मार्जिन{' '}
                <strong className="text-white font-mono">{100 - confirmPresetModal.winPercent}%</strong> हो जाएगा।
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPresetModal(null)}
                className="px-4 py-2 rounded-xl bg-[#181a2e] border border-[#2b304c] text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetToAll(confirmPresetModal.winPercent, confirmPresetModal.presetName)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black text-xs font-black transition shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-black" />
                <span>हाँ, सभी गेम्स पर लागू करें</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
