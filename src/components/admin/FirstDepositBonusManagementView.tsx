import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Gift, Sparkles, Plus, Trash2, Save, RefreshCw, CheckCircle2,
  AlertCircle, Eye, ShieldCheck, DollarSign, ArrowUpRight, Flame, Layers
} from 'lucide-react';

interface TierItem {
  id: string;
  amount: number;
  bonusAmount: number;
  label?: string;
  isActive: boolean;
}

export const FirstDepositBonusManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('Extra first deposit bonus');
  const [subtitle, setSubtitle] = useState<string>('Each account can only receive rewards once');
  const [tiers, setTiers] = useState<TierItem[]>([]);

  // New Tier form inputs
  const [newAmount, setNewAmount] = useState<string>('');
  const [newBonus, setNewBonus] = useState<string>('');

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.getFirstDepositBonusConfig();
      if (res?.success && res.config) {
        setIsEnabled(res.config.isEnabled !== false);
        setTitle(res.config.title || 'Extra first deposit bonus');
        setSubtitle(res.config.subtitle || 'Each account can only receive rewards once');
        if (Array.isArray(res.config.tiers)) {
          // Sort descending for display
          const sorted = [...res.config.tiers].sort((a, b) => Number(b.amount) - Number(a.amount));
          setTiers(sorted);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch first deposit bonus configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleTierChange = (index: number, field: keyof TierItem, value: any) => {
    const updated = [...tiers];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setTiers(updated);
  };

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newAmount);
    const parsedBonus = parseFloat(newBonus);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }
    if (isNaN(parsedBonus) || parsedBonus <= 0) {
      showToast('Please enter a valid bonus amount', 'error');
      return;
    }

    const newTier: TierItem = {
      id: `tier-${parsedAmount}`,
      amount: parsedAmount,
      bonusAmount: parsedBonus,
      label: `+₹${parsedBonus.toFixed(2)}`,
      isActive: true,
    };

    const updated = [newTier, ...tiers].sort((a, b) => Number(b.amount) - Number(a.amount));
    setTiers(updated);
    setNewAmount('');
    setNewBonus('');
    showToast(`Added tier for ₹${parsedAmount} deposit (+₹${parsedBonus} bonus)`, 'success');
  };

  const handleDeleteTier = (id: string) => {
    setTiers(prev => prev.filter(t => t.id !== id));
    showToast('Tier removed', 'info');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        isEnabled,
        title,
        subtitle,
        tiers,
      };
      const res = await api.updateAdminFirstDepositBonusConfig(payload, admin?.username || 'SuperAdmin');
      if (res?.success) {
        showToast('First Deposit Bonus settings saved and live in client app!', 'success');
        fetchConfig();
      } else {
        showToast(res?.error || 'Failed to save settings', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving first deposit bonus configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#171307] via-[#201908] to-[#120f04] border border-[#f5c443]/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#f5c443]/15 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-[#f5c443] flex items-center justify-center text-black shadow-lg shadow-amber-500/25">
              <Gift className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">
                  First Deposit Bonus Control (प्रथम डिपॉजिट बोनस)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#f5c443]/20 text-[#f5c443] border border-[#f5c443]/40">
                  Yellow Theme Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-400 mt-1">
                Configure user first deposit reward tiers, amounts, and live pop-up modal settings. Existing client data & balances remain 100% safe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchConfig}
              disabled={loading || saving}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-[#f5c443] to-yellow-400 hover:brightness-110 active:scale-95 text-black font-black text-xs tracking-wide shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Settings & Tiers Table + Live Yellow Phone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: General Settings & Tiers Editor (8 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* General Modal Settings */}
          <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-[#f5c443]" />
                Modal Master Settings
              </h2>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <span className="text-xs text-zinc-400 font-medium">Activity Status:</span>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#f5c443] focus:ring-0 bg-zinc-800 border-zinc-700 cursor-pointer accent-[#f5c443]"
                />
                <span className={`text-xs font-black ${isEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Modal Title (हेडिंग)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#181c28] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#f5c443]"
                  placeholder="Extra first deposit bonus"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Modal Subtitle (सब-हेडिंग)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-[#181c28] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#f5c443]"
                  placeholder="Each account can only receive rewards once"
                />
              </div>
            </div>
          </div>

          {/* Add New Tier Form */}
          <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 shadow-lg space-y-3">
            <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
              <Plus className="w-4 h-4 text-[#f5c443]" />
              Add New Deposit Bonus Tier (नया टियर जोड़ें)
            </h2>

            <form onSubmit={handleAddTier} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Required First Deposit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full bg-[#181c28] border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#f5c443]"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Bonus Given (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-amber-400">+₹</span>
                  <input
                    type="number"
                    step="any"
                    value={newBonus}
                    onChange={(e) => setNewBonus(e.target.value)}
                    placeholder="e.g. 108"
                    className="w-full bg-[#181c28] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#f5c443]"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-[#f5c443] hover:brightness-110 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  Add Tier
                </button>
              </div>
            </form>
          </div>

          {/* Existing Tiers List Table */}
          <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Layers className="w-4 h-4 text-[#f5c443]" />
                Active Bonus Tiers ({tiers.length})
              </h2>
              <span className="text-[11px] text-zinc-400">
                Sorted from highest deposit to lowest
              </span>
            </div>

            <div className="space-y-2.5">
              {tiers.map((tier, idx) => {
                const bonusPercent = tier.amount > 0 ? ((tier.bonusAmount / tier.amount) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={tier.id || idx}
                    className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      tier.isActive !== false
                        ? 'bg-[#151928] border-white/10 hover:border-[#f5c443]/40'
                        : 'bg-[#10131d]/60 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#241c06] border border-[#f5c443]/40 flex items-center justify-center text-[#f5c443] font-black text-xs shrink-0">
                        #{idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            First deposit ₹{tier.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-[#f5c443] border border-amber-500/30">
                            {bonusPercent}% Bonus
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Player receives <strong className="text-[#f5c443]">+₹{tier.bonusAmount.toLocaleString('en-IN')}</strong> wallet reward
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-zinc-400">Bonus (₹):</label>
                        <input
                          type="number"
                          value={tier.bonusAmount}
                          onChange={(e) => handleTierChange(idx, 'bonusAmount', Number(e.target.value))}
                          className="w-20 bg-[#1c2236] border border-white/15 rounded-lg px-2 py-1 text-xs text-[#f5c443] font-bold focus:outline-none focus:border-[#f5c443]"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tier.isActive !== false}
                          onChange={(e) => handleTierChange(idx, 'isActive', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-[#f5c443] bg-zinc-800 border-zinc-700 accent-[#f5c443] cursor-pointer"
                        />
                        <span className="text-[10px] text-zinc-300 font-medium">Active</span>
                      </label>

                      <button
                        onClick={() => handleDeleteTier(tier.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                        title="Delete Tier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Live Luxury Yellow Mobile Mockup Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#f5c443]" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Live Client Yellow Modal Preview (लाइव प्रिव्यू)
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Real-Time
              </span>
            </div>

            {/* Mobile Frame Container */}
            <div className="mx-auto w-full max-w-[340px] rounded-3xl bg-[#060709] p-2 border-2 border-white/15 shadow-2xl">
              {/* Inner Luxury Yellow Modal Replica */}
              <div className="relative w-full bg-gradient-to-b from-[#241c06] via-[#161204] to-[#0c0902] border-2 border-[#f5c443]/70 rounded-2xl text-white shadow-xl flex flex-col overflow-hidden">
                {/* Ambient Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-gradient-to-b from-[#f5c443]/35 via-[#eab308]/20 to-transparent rounded-full blur-xl pointer-events-none" />

                {/* Header */}
                <div className="px-4 pt-3 pb-2 text-center shrink-0 border-b border-[#f5c443]/20 relative z-10">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <span className="text-yellow-400 text-xs">✨</span>
                    <h4 className="text-xs font-black tracking-wide text-white uppercase drop-shadow-[0_2px_8px_rgba(245,196,67,0.5)]">
                      {title || 'Extra first deposit bonus'}
                    </h4>
                    <span className="text-yellow-400 text-xs">✨</span>
                  </div>
                  <p className="text-[9px] text-zinc-300 font-medium">
                    {subtitle || 'Each account can only receive rewards once'}
                  </p>
                </div>

                {/* Tiers List */}
                <div className="p-2 space-y-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                  {tiers.filter(t => t.isActive !== false).slice(0, 5).map((tier) => (
                    <div
                      key={tier.id}
                      className="bg-gradient-to-b from-[#221a05] to-[#151003] border border-[#f5c443]/35 rounded-xl p-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-white">
                          First deposit {tier.amount}
                        </span>
                        <span className="text-[10px] font-black text-white drop-shadow-sm">
                          + ₹{tier.bonusAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-[8px] text-zinc-300 mb-1.5 leading-none">
                        Deposit {tier.amount} for the first time and you will receive {tier.bonusAmount} bonus
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 h-4 bg-[#0c0902] rounded-full p-0.5 border border-[#f5c443]/30 relative flex items-center overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-[#f5c443] to-yellow-300"
                            style={{ width: '0%' }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                            0/{tier.amount}
                          </div>
                        </div>

                        <button className="px-2.5 py-0.5 rounded bg-transparent border border-[#f5c443] text-white hover:text-amber-200 text-[9px] font-bold">
                          Deposit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Bar */}
                <div className="px-3 py-1.5 bg-[#140f03] border-t border-[#f5c443]/25 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      readOnly
                      className="w-3 h-3 rounded-full border-amber-500/60 bg-[#221a05] accent-[#f5c443]"
                    />
                    <span className="text-[8px] text-zinc-200 font-medium">
                      No more reminders today
                    </span>
                  </div>

                  <button className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-[#f5c443] to-yellow-400 text-black font-black text-[9px]">
                    Activity
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-center text-zinc-500 mt-3">
              This preview matches exactly what your players see on their mobile screens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
