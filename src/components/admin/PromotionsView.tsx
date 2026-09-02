import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Gift, Crown, Share2, Image, Plus, Trash2, Check,
  Edit2, AlertCircle, Save, Sparkles, Upload, FileImage, X
} from 'lucide-react';

export const PromotionsView: React.FC<{ defaultSubTab?: string }> = ({ defaultSubTab = 'promotions_bonus' }) => {
  const { admin, showToast } = useAuth();
  const [subTab, setSubTab] = useState(defaultSubTab);
  const [banners, setBanners] = useState<any[]>([]);
  const [vipLevels, setVipLevels] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Banner Form (Supports Image File Upload & URL)
  const [newBanner, setNewBanner] = useState({ title: '', imageUrl: '', linkUrl: '' });
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [bannerUploadType, setBannerUploadType] = useState<'upload' | 'url'>('upload');

  // VIP Edit Modal
  const [editingVip, setEditingVip] = useState<any | null>(null);
  const [isSavingVip, setIsSavingVip] = useState(false);

  // Referral Settings
  const [referralSettings, setReferralSettings] = useState({
    tier1Commission: 0.6,
    tier2Commission: 0.3,
    tier3Commission: 0.1,
    minWithdrawalCommission: 100,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bannerRes, vipRes, refRes] = await Promise.all([
        api.getAdminBanners(),
        api.getAdminVipLevels(),
        api.getAdminReferrals(),
      ]);
      if (bannerRes?.banners) setBanners(bannerRes.banners);
      if (vipRes?.vipLevels) setVipLevels(vipRes.vipLevels);
      if (refRes?.referrals) setReferrals(refRes.referrals);
    } catch (err) {
      console.error('Failed to load promo data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (defaultSubTab) {
      setSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanner.title || !newBanner.imageUrl) return;

    try {
      await api.createBanner(newBanner, admin?.username || 'SuperAdmin');
      showToast('New promotional banner added successfully!', 'success');
      setShowAddBannerModal(false);
      setNewBanner({ title: '', imageUrl: '', linkUrl: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add banner', 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await api.deleteBanner(id, admin?.username || 'SuperAdmin');
      showToast('Banner deleted', 'info');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] border border-[#26262a] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Promotions, VIP & Referral Management</h2>
            <p className="text-xs text-[#a1a1aa]">Manage promotional slider banners, VIP tier reward structures, and affiliate tiers.</p>
          </div>
        </div>

        <div className="flex bg-[#0a0a0b] p-1 rounded-lg border border-[#26262a] gap-1 text-xs font-semibold">
          <button
            onClick={() => setSubTab('promotions_bonus')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'promotions_bonus' ? 'bg-[#d4af37] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Banners & Bonus
          </button>
          <button
            onClick={() => setSubTab('promotions_vip')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'promotions_vip' ? 'bg-[#d4af37] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            VIP Levels
          </button>
          <button
            onClick={() => setSubTab('promotions_referrals')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'promotions_referrals' ? 'bg-[#d4af37] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Referral System
          </button>
        </div>
      </div>

      {/* 1. Banners SubTab */}
      {subTab === 'promotions_bonus' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Active Promotional Carousel Banners</h3>
            <button
              onClick={() => setShowAddBannerModal(true)}
              className="px-3 py-1.5 bg-[#d4af37] hover:bg-[#c5a028] text-black font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Banner</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map(b => (
              <div key={b.id} className="bg-[#121215] border border-[#26262a] rounded-xl overflow-hidden shadow-lg group">
                <div className="h-36 bg-[#0a0a0b] relative overflow-hidden flex items-center justify-center">
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5">
                  <h4 className="font-bold text-white text-xs">{b.title}</h4>
                  <p className="text-[11px] text-[#a1a1aa] truncate mt-0.5">{b.linkUrl || 'Direct Action'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. VIP Levels SubTab */}
      {subTab === 'promotions_vip' && (
        <div className="bg-[#121215] border border-[#26262a] rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#26262a] flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#d4af37]" />
              <span>VIP Tier Level Rewards & EXP Requirements</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1a1a1e] text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a]">
                <tr>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Required Betting EXP</th>
                  <th className="py-3 px-4">Level-Up Bonus</th>
                  <th className="py-3 px-4">Monthly Reward</th>
                  <th className="py-3 px-4">Rebate Commission</th>
                  <th className="py-3 px-4">Daily Free Withdrawals</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262a]">
                {vipLevels.map(v => (
                  <tr key={v.level} className="hover:bg-[#1a1a1e]/40">
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] font-bold">
                        VIP {v.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ₹{v.requiredExp.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                      ₹{v.levelUpBonus}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400">
                      ₹{v.monthlyReward}
                    </td>
                    <td className="py-3 px-4 text-[#d4af37] font-bold">
                      {v.rebateRate}%
                    </td>
                    <td className="py-3 px-4 text-[#e0e0e0]">
                      {v.dailyWithdrawalLimit} times / day
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setEditingVip({ ...v })}
                        className="px-2.5 py-1 bg-[#26262a] hover:bg-[#d4af37] hover:text-black text-white font-bold rounded-md text-xs flex items-center gap-1 ml-auto transition"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Referral Management SubTab */}
      {subTab === 'promotions_referrals' && (
        <div className="space-y-6">
          <div className="bg-[#121215] border border-[#26262a] rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Multi-Level Affiliate Commission Tier Distribution</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-lg space-y-2">
                <span className="text-xs font-bold text-[#d4af37]">Tier 1 Direct Referrals</span>
                <div className="text-xl font-bold font-mono text-emerald-400">0.6%</div>
                <p className="text-[11px] text-[#a1a1aa]">Applied on total betting turnover of direct referred friends.</p>
              </div>

              <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-lg space-y-2">
                <span className="text-xs font-bold text-[#d4af37]">Tier 2 Sub-Referrals</span>
                <div className="text-xl font-bold font-mono text-emerald-400">0.3%</div>
                <p className="text-[11px] text-[#a1a1aa]">Applied on 2nd-level member network betting volume.</p>
              </div>

              <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-lg space-y-2">
                <span className="text-xs font-bold text-[#d4af37]">Tier 3 Indirect Referrals</span>
                <div className="text-xl font-bold font-mono text-emerald-400">0.1%</div>
                <p className="text-[11px] text-[#a1a1aa]">Applied on 3rd-level member network betting volume.</p>
              </div>
            </div>
          </div>

          {/* Referral Ledger */}
          <div className="bg-[#121215] border border-[#26262a] rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#26262a]">
              <h3 className="font-bold text-white text-sm">Top Referring Affiliates</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1e] text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a]">
                  <tr>
                    <th className="py-3 px-4">Affiliate UID</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Referral Code</th>
                    <th className="py-3 px-4">Total Invites</th>
                    <th className="py-3 px-4">Network Turnover</th>
                    <th className="py-3 px-4">Earned Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26262a]">
                  {referrals.map(r => (
                    <tr key={r.uid} className="hover:bg-[#1a1a1e]/40">
                      <td className="py-3 px-4 font-mono text-[#d4af37] font-bold">{r.uid}</td>
                      <td className="py-3 px-4 text-white font-medium">{r.username}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#e0e0e0]">{r.code}</td>
                      <td className="py-3 px-4 font-bold text-white">{r.totalInvites} players</td>
                      <td className="py-3 px-4 font-mono text-[#e0e0e0]">₹{r.teamTurnover.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">₹{r.commissionEarned.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit VIP Level */}
      {editingVip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSavingVip(true);
              try {
                const updatedList = vipLevels.map(v => v.level === editingVip.level ? editingVip : v);
                await api.updateAdminVipLevels(updatedList, admin?.username || 'SuperAdmin');
                setVipLevels(updatedList);
                showToast(`VIP ${editingVip.level} parameters updated successfully!`, 'success');
                setEditingVip(null);
              } catch (err: any) {
                showToast(err.message || 'Failed to update VIP level', 'error');
              } finally {
                setIsSavingVip(false);
              }
            }}
            className="bg-[#121215] border border-[#26262a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#d4af37]/20 text-[#d4af37]">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit VIP {editingVip.level} Tier</h3>
                  <p className="text-xs text-[#a1a1aa]">Configure rewards and threshold for this level</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingVip(null)}
                className="p-1.5 rounded-lg bg-[#1a1a1e] text-[#a1a1aa] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Required EXP (Betting Turnover in ₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingVip.requiredExp}
                  onChange={e => setEditingVip({ ...editingVip, requiredExp: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Level-Up Cash Bonus (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingVip.levelUpBonus}
                  onChange={e => setEditingVip({ ...editingVip, levelUpBonus: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Monthly Reward (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingVip.monthlyReward}
                  onChange={e => setEditingVip({ ...editingVip, monthlyReward: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Rebate Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={editingVip.rebateRate}
                    onChange={e => setEditingVip({ ...editingVip, rebateRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Daily Withdrawals</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={editingVip.dailyWithdrawalLimit}
                    onChange={e => setEditingVip({ ...editingVip, dailyWithdrawalLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26262a]">
              <button
                type="button"
                onClick={() => setEditingVip(null)}
                className="px-4 py-2 bg-[#1a1a1e] text-[#a1a1aa] rounded-lg text-xs font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingVip}
                className="px-5 py-2 bg-[#d4af37] hover:bg-[#c5a028] text-black font-bold rounded-lg text-xs transition shadow-md flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingVip ? 'Saving...' : 'Save VIP Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Banner (File Upload & URL) */}
      {showAddBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleAddBanner} className="bg-[#121215] border border-[#26262a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-[#d4af37]/20 text-[#d4af37]">
                  <Image className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Add New Carousel Banner</h3>
                  <p className="text-xs text-[#a1a1aa]">Displayed on user panel main lobby slider.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBannerModal(false)}
                className="p-1.5 rounded-lg bg-[#1a1a1e] text-[#a1a1aa] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Banner Title</label>
              <input
                type="text"
                required
                placeholder="e.g. VIP Mega Cashback 10%"
                value={newBanner.title}
                onChange={e => setNewBanner({ ...newBanner, title: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            {/* Upload Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Banner Image Source</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setBannerUploadType('upload')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    bannerUploadType === 'upload'
                      ? 'bg-[#d4af37] text-black'
                      : 'bg-[#1a1a1e] text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBannerUploadType('url')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    bannerUploadType === 'url'
                      ? 'bg-[#d4af37] text-black'
                      : 'bg-[#1a1a1e] text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  <FileImage className="w-3.5 h-3.5" />
                  <span>Image URL</span>
                </button>
              </div>

              {bannerUploadType === 'upload' ? (
                <div className="space-y-2">
                  <label className="border-2 border-dashed border-[#26262a] hover:border-[#d4af37] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-[#0a0a0b] transition group">
                    <Upload className="w-7 h-7 text-[#a1a1aa] group-hover:text-[#d4af37] mb-1 transition" />
                    <span className="text-xs font-bold text-white group-hover:text-[#d4af37]">
                      {newBanner.imageUrl ? 'Image Selected (Click to change)' : 'Click to select banner image from device'}
                    </span>
                    <span className="text-[10px] text-[#71717a] mt-0.5">PNG, JPG, WEBP, GIF up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (loadEvt) => {
                            if (loadEvt.target?.result) {
                              setNewBanner({ ...newBanner, imageUrl: String(loadEvt.target.result) });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {newBanner.imageUrl && (
                    <div className="relative rounded-lg overflow-hidden h-24 border border-[#26262a]">
                      <img src={newBanner.imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={newBanner.imageUrl}
                  onChange={e => setNewBanner({ ...newBanner, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Action Link URL (Optional)</label>
              <input
                type="text"
                placeholder="#/recharge or internal path"
                value={newBanner.linkUrl}
                onChange={e => setNewBanner({ ...newBanner, linkUrl: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26262a]">
              <button
                type="button"
                onClick={() => setShowAddBannerModal(false)}
                className="px-4 py-2 bg-[#1a1a1e] text-[#a1a1aa] rounded-lg text-xs font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newBanner.imageUrl}
                className="px-4 py-2 bg-[#d4af37] hover:bg-[#c5a028] disabled:opacity-50 text-black font-bold rounded-lg text-xs transition shadow-md"
              >
                Add Banner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
