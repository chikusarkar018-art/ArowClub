import React, { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Users,
  Award,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
} from 'lucide-react';
import { GiftCode } from '../../types.js';
import { useAuth } from '../../context/AuthContext.js';

export const GiftCodeManagementView: React.FC = () => {
  const { admin } = useAuth();
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [stats, setStats] = useState({
    totalCodes: 0,
    activeCodes: 0,
    totalRedeemed: 0,
    totalDistributed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Code Form
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [rewardAmount, setRewardAmount] = useState('50');
  const [totalLimit, setTotalLimit] = useState('100');
  const [minVipLevel, setMinVipLevel] = useState('0');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchGiftCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/gift-codes');
      const data = await res.json();
      if (data.success) {
        setGiftCodes(data.giftCodes || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to fetch gift codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiftCodes();
  }, []);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/gift-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          title,
          rewardAmount: Number(rewardAmount),
          totalLimit: Number(totalLimit),
          minVipLevel: Number(minVipLevel),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          status: 'active',
          adminUsername: admin?.username || 'SuperAdmin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create gift code');
      }

      setSuccessMsg(`🎁 Gift Code "${code.toUpperCase()}" created successfully!`);
      setShowModal(false);
      setCode('');
      setTitle('');
      fetchGiftCodes();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gift code?')) return;
    try {
      const res = await fetch(`/api/admin/gift-codes/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: admin?.username }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Gift code deleted');
        fetchGiftCodes();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'AROW';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(res);
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#121420] via-[#1a1c2d] to-[#121420] border border-[#f5c443]/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#f5c443]/20 border border-[#f5c443]/40 rounded-full text-[#f5c443] text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 fill-[#f5c443]" />
                Promotion System
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">Gift Codes & Redemptions</h1>
            <p className="text-xs text-slate-400">
              Create and distribute instant reward gift codes for community giveaways and VIP users.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchGiftCodes}
              disabled={loading}
              className="px-4 py-2.5 bg-[#1f2338] hover:bg-[#282d47] border border-white/10 rounded-2xl text-xs font-bold text-slate-300 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                generateRandomCode();
                setShowModal(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-[#f5c443] to-amber-500 hover:from-[#e5b332] hover:to-amber-600 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Generate New Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121420] border border-[#23273c] rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-bold uppercase">Total Gift Codes</div>
          <div className="text-2xl font-black text-white mt-1">{stats.totalCodes}</div>
        </div>
        <div className="bg-[#121420] border border-[#23273c] rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-bold uppercase">Active Codes</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.activeCodes}</div>
        </div>
        <div className="bg-[#121420] border border-[#23273c] rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-bold uppercase">Total Claims</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">{stats.totalRedeemed}</div>
        </div>
        <div className="bg-[#121420] border border-[#23273c] rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-bold uppercase">Total Distributed</div>
          <div className="text-2xl font-black text-[#f5c443] mt-1">₹{stats.totalDistributed}</div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#121420] border border-[#23273c] rounded-3xl p-6 space-y-4">
        <h2 className="text-base font-black text-white">Active & Past Gift Codes</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#23273c] text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-[#0c0e18]">
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Title / Purpose</th>
                <th className="py-3.5 px-4">Reward</th>
                <th className="py-3.5 px-4">Claimed / Limit</th>
                <th className="py-3.5 px-4">VIP Req</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1e2e] text-xs">
              {giftCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No gift codes created yet. Click "Generate New Code" to create one.
                  </td>
                </tr>
              ) : (
                giftCodes.map((g) => (
                  <tr key={g.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#f5c443]">
                          {g.code}
                        </span>
                        <button
                          onClick={() => handleCopy(g.code, g.id)}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                          title="Copy Code"
                        >
                          {copiedId === g.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-semibold">{g.title}</td>

                    <td className="py-3.5 px-4 font-black text-emerald-400">
                      ₹{g.rewardAmount}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-white font-bold">{g.usedCount || 0}</span>
                      <span className="text-slate-500"> / {g.totalLimit === 0 ? '∞' : g.totalLimit}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      VIP {g.minVipLevel || 0}+
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          g.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteCode(g.id)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                        title="Delete code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121420] border border-[#23273c] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#23273c]">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#f5c443]" />
                <h3 className="text-base font-black text-white">Create Gift Code</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Code String</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VIPBONUS50"
                    className="flex-1 h-10 px-3 bg-[#0a0c14] border border-[#23273c] rounded-xl text-white font-mono font-bold focus:border-[#f5c443] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold"
                  >
                    Random
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Title / Description</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Telegram Giveaway Bonus"
                  className="w-full h-10 px-3 bg-[#0a0c14] border border-[#23273c] rounded-xl text-white focus:border-[#f5c443] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Reward (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0a0c14] border border-[#23273c] rounded-xl text-white font-mono font-bold focus:border-[#f5c443] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Total Limit (0=∞)</label>
                  <input
                    type="number"
                    min="0"
                    value={totalLimit}
                    onChange={(e) => setTotalLimit(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0a0c14] border border-[#23273c] rounded-xl text-white font-mono font-bold focus:border-[#f5c443] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Min VIP Level</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={minVipLevel}
                    onChange={(e) => setMinVipLevel(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0a0c14] border border-[#23273c] rounded-xl text-white font-mono font-bold focus:border-[#f5c443] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Expires At (Optional)</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0a0c14] border border-[#23273c] rounded-xl text-white font-mono focus:border-[#f5c443] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#23273c]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#f5c443] hover:bg-amber-400 text-black font-black rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
