import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Wallet, Clock, CheckCircle, AlertTriangle, Save,
  RefreshCw, ShieldCheck, ToggleLeft, ToggleRight, DollarSign
} from 'lucide-react';
import { WithdrawSettings } from '../../types.js';

export const WithdrawSettingsCrownView: React.FC = () => {
  const { admin } = useAuth();
  const [settings, setSettings] = useState<WithdrawSettings>({
    minAmount: 110,
    maxAmount: 100000,
    dailyLimitCount: 3,
    minBetTurnoverPercent: 100,
    withdrawStartTime: '09:00',
    withdrawEndTime: '23:59',
    instantPayoutEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await api.getAdminWithdrawSettings();
      if (res?.settings) {
        setSettings(res.settings);
      }
    } catch (err: any) {
      console.error('Failed to load withdraw settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateAdminWithdrawSettings(settings, admin?.username);
      if (res?.success) {
        setSuccessMsg('Withdrawal rules updated successfully! Changes are live immediately.');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update withdrawal settings');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-[#121215] border border-[#26262a] rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Withdrawal Setting & Security Rules
              </h1>
              <p className="text-xs text-[#a1a1aa]">
                Control minimum/maximum limits, daily withdrawal frequency, and operating hours
              </p>
            </div>
          </div>

          <button
            onClick={fetchSettings}
            className="px-3 py-2 rounded-xl bg-[#1a1a1e] border border-[#26262a] text-xs font-semibold text-[#e0e0e0] hover:border-amber-500/40 hover:text-white flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Rules
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}
      </div>

      {/* Form Settings Form */}
      <form onSubmit={handleSave} className="bg-[#121215] border border-[#26262a] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Min Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Minimum Withdrawal Amount (₹)
            </label>
            <input
              type="number"
              min="10"
              value={settings.minAmount}
              onChange={(e) => setSettings({ ...settings, minAmount: Number(e.target.value) })}
              className="w-full bg-[#18181c] border border-[#2a2a30] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
              required
            />
            <p className="text-[11px] text-[#71717a]">Minimum cash amount a user can request in a single withdrawal.</p>
          </div>

          {/* Max Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Maximum Withdrawal Amount (₹)
            </label>
            <input
              type="number"
              min="100"
              value={settings.maxAmount}
              onChange={(e) => setSettings({ ...settings, maxAmount: Number(e.target.value) })}
              className="w-full bg-[#18181c] border border-[#2a2a30] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
              required
            />
            <p className="text-[11px] text-[#71717a]">Maximum cash amount per single withdrawal request.</p>
          </div>

          {/* Daily Limit Count */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Daily Withdrawal Times Limit
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={settings.dailyLimitCount}
              onChange={(e) => setSettings({ ...settings, dailyLimitCount: Number(e.target.value) })}
              className="w-full bg-[#18181c] border border-[#2a2a30] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
              required
            />
            <p className="text-[11px] text-[#71717a]">Number of permitted withdrawal requests per user each 24 hours.</p>
          </div>

          {/* Min Bet Turnover % */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Bet Turnover Requirement (%)
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={settings.minBetTurnoverPercent}
              onChange={(e) => setSettings({ ...settings, minBetTurnoverPercent: Number(e.target.value) })}
              className="w-full bg-[#18181c] border border-[#2a2a30] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
              required
            />
            <p className="text-[11px] text-[#71717a]">Percentage of deposited funds required to be wagered before withdrawal is unlocked.</p>
          </div>

          {/* Start Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Withdrawal Window Start Time
            </label>
            <input
              type="time"
              value={settings.withdrawStartTime}
              onChange={(e) => setSettings({ ...settings, withdrawStartTime: e.target.value })}
              className="w-full bg-[#18181c] border border-[#2a2a30] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
              required
            />
            <p className="text-[11px] text-[#71717a]">Daily time when withdrawal gateway opens (e.g. 09:00 AM).</p>
          </div>

          {/* End Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Withdrawal Window End Time
            </label>
            <input
              type="time"
              value={settings.withdrawEndTime}
              onChange={(e) => setSettings({ ...settings, withdrawEndTime: e.target.value })}
              className="w-full bg-[#18181c] border border-[#2a2a30] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 transition-colors"
              required
            />
            <p className="text-[11px] text-[#71717a]">Daily time when withdrawal gateway closes (e.g. 23:59 PM).</p>
          </div>
        </div>

        {/* Instant Payout Toggle */}
        <div className="p-4 rounded-xl bg-[#18181c] border border-[#26262a] flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white">Instant IMPS Gateway Processing</h4>
            <p className="text-[11px] text-[#71717a]">Automatically route approved withdrawals through instant banking gateway.</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, instantPayoutEnabled: !settings.instantPayoutEnabled })}
            className={`text-2xl transition-colors ${settings.instantPayoutEnabled ? 'text-emerald-400' : 'text-[#52525b]'}`}
          >
            {settings.instantPayoutEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Withdrawal Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
