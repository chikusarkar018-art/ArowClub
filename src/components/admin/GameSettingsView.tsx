import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { GameSettings } from '../../types.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Sliders, Save, RefreshCw, DollarSign, Percent,
  Cpu, Clock, ShieldCheck, Check
} from 'lucide-react';

export const GameSettingsView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminGameSettings();
      if (res) setSettings(res);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      await api.updateAdminGameSettings(settings, admin?.username || 'SuperAdmin');
      showToast('Game configuration updated and live across all engines!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] border border-[#26262a] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Wingo Global Game Parameters & Multipliers</h2>
            <p className="text-xs text-[#a1a1aa]">Configure betting limits, payout odds, and default game engine mode.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-[#d4af37] hover:bg-[#c5a028] text-black font-bold rounded-lg text-xs shadow-lg transition flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Betting Limits */}
        <div className="bg-[#121215] border border-[#26262a] rounded-xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Betting Limits (Min / Max)</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Minimum Bet Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                required
                value={settings.minBetAmount}
                onChange={e => setSettings({ ...settings, minBetAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Maximum Bet Amount (₹)
              </label>
              <input
                type="number"
                min="100"
                required
                value={settings.maxBetAmount}
                onChange={e => setSettings({ ...settings, maxBetAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Engine Result Mode */}
        <div className="bg-[#121215] border border-[#26262a] rounded-xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Game Engine Algorithm Mode</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-2">
                Default Outcome Algorithm Mode:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, resultMode: 'auto' })}
                  className={`p-3.5 rounded-lg border text-left transition ${
                    settings.resultMode === 'auto'
                      ? 'bg-[#d4af37]/10 border-[#d4af37] text-[#d4af37] font-bold'
                      : 'bg-[#0a0a0b] border-[#26262a] text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold uppercase mb-0.5">Automated RNG</div>
                  <div className="text-[11px] opacity-80">Fair random distribution or lowest payout formula.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, resultMode: 'manual' })}
                  className={`p-3.5 rounded-lg border text-left transition ${
                    settings.resultMode === 'manual'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400 font-bold'
                      : 'bg-[#0a0a0b] border-[#26262a] text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold uppercase mb-0.5">Manual Control</div>
                  <div className="text-[11px] opacity-80">Admin locks guaranteed numbers via Result Control tab.</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Multipliers & Odds */}
        <div className="md:col-span-2 bg-[#121215] border border-[#26262a] rounded-xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-[#d4af37]" />
            <span>Winning Multipliers & Payout Multipliers</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Number Ball (0–9) Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={settings.numberMultiplier}
                onChange={e => setSettings({ ...settings, numberMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
              <span className="text-[10px] text-[#71717a]">Standard: 9.0x</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Single Color (Green/Red) Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={settings.colorMultiplier}
                onChange={e => setSettings({ ...settings, colorMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
              <span className="text-[10px] text-[#71717a]">Standard: 2.0x</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Violet Color Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={settings.violetMultiplier}
                onChange={e => setSettings({ ...settings, violetMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
              <span className="text-[10px] text-[#71717a]">Standard: 4.5x</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Big / Small Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={settings.bigSmallMultiplier}
                onChange={e => setSettings({ ...settings, bigSmallMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
              <span className="text-[10px] text-[#71717a]">Standard: 2.0x</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Dual Color Half-Payout Multiplier (0 or 5)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={settings.dualColorMultiplier}
                onChange={e => setSettings({ ...settings, dualColorMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
              <span className="text-[10px] text-[#71717a]">Standard: 1.5x</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
