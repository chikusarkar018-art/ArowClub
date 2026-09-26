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
  const [referralTreeData, setReferralTreeData] = useState<any>(null);
  const [inspectedAffiliate, setInspectedAffiliate] = useState<any | null>(null);
  const [referralActiveTab, setReferralActiveTab] = useState<'affiliates' | 'tree' | 'history'>('affiliates');
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
      const [bannerRes, vipRes, refRes, treeRes] = await Promise.all([
        api.getAdminBanners(),
        api.getAdminVipLevels(),
        api.getAdminReferrals(),
        api.getAdminReferralTree(),
      ]);
      if (bannerRes?.banners) setBanners(bannerRes.banners);
      if (vipRes?.vipLevels) setVipLevels(vipRes.vipLevels);
      if (refRes?.referrals) setReferrals(refRes.referrals);
      if (treeRes) setReferralTreeData(treeRes);
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
          {/* Rules Overview Cards */}
          <div className="bg-[#121215] border border-[#26262a] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#d4af37]" />
                <span>Multi-Level Referral & Subordinate Commission Rules</span>
              </h3>
              <div className="flex gap-1.5 bg-[#0a0a0b] p-1 rounded-lg border border-[#26262a] text-xs">
                <button
                  type="button"
                  onClick={() => setReferralActiveTab('affiliates')}
                  className={`px-3 py-1 rounded font-bold transition ${
                    referralActiveTab === 'affiliates' ? 'bg-[#d4af37] text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Affiliates
                </button>
                <button
                  type="button"
                  onClick={() => setReferralActiveTab('tree')}
                  className={`px-3 py-1 rounded font-bold transition ${
                    referralActiveTab === 'tree' ? 'bg-[#d4af37] text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Hierarchy Tree
                </button>
                <button
                  type="button"
                  onClick={() => setReferralActiveTab('history')}
                  className={`px-3 py-1 rounded font-bold transition ${
                    referralActiveTab === 'history' ? 'bg-[#d4af37] text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Commission History
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#d4af37]">Direct Referral (Level 1) - First</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">1st Deposit</span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">5.0%</div>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  Direct referrer gets 5% commission on referred friend's FIRST successful deposit.
                </p>
              </div>

              <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#d4af37]">Direct Referral (Level 1) - Next</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-1.5 py-0.5 rounded">Re-deposits</span>
                </div>
                <div className="text-2xl font-bold font-mono text-blue-400">2.0%</div>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  Direct referrer gets 2% commission on all subsequent successful deposits of referred user.
                </p>
              </div>

              <div className="p-4 bg-[#0a0a0b] border border-[#26262a] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#d4af37]">Team Subordinate (Level 2)</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-400 font-bold px-1.5 py-0.5 rounded">2nd Level</span>
                </div>
                <div className="text-2xl font-bold font-mono text-purple-400">1.0%</div>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  Original referrer gets 1% commission on deposits of users invited by their direct referrals.
                </p>
              </div>
            </div>
          </div>

          {/* TAB 1: Affiliates List */}
          {referralActiveTab === 'affiliates' && (
            <div className="bg-[#121215] border border-[#26262a] rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#26262a] flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Affiliate Partners & Commission Breakdown</h3>
                <span className="text-xs text-zinc-400">{referrals.length} registered users</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1a1a1e] text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a]">
                    <tr>
                      <th className="py-3 px-4">Affiliate</th>
                      <th className="py-3 px-4">Referral Code</th>
                      <th className="py-3 px-4">L1 Direct</th>
                      <th className="py-3 px-4">L2 Team</th>
                      <th className="py-3 px-4">L1 Comm (5% / 2%)</th>
                      <th className="py-3 px-4">L2 Comm (1%)</th>
                      <th className="py-3 px-4">Total Earned</th>
                      <th className="py-3 px-4 text-center">Tree View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26262a]">
                    {referrals.map(r => (
                      <tr key={r.uid} className="hover:bg-[#1a1a1e]/40">
                        <td className="py-3 px-4">
                          <div className="font-mono text-[#d4af37] font-bold">UID {r.uid}</div>
                          <div className="text-zinc-300 text-[11px]">{r.username}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-300">{r.code}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{r.level1Count ?? r.totalInvites ?? 0} members</div>
                          <div className="text-[10px] text-zinc-400">₹{(r.level1DepositVolume ?? 0).toLocaleString('en-IN')} dep</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-purple-300">{r.level2Count ?? 0} members</div>
                          <div className="text-[10px] text-zinc-400">₹{(r.level2DepositVolume ?? 0).toLocaleString('en-IN')} dep</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                          ₹{(r.level1Commission ?? 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono text-purple-400 font-bold">
                          ₹{(r.level2Commission ?? 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#fce08b] text-sm">
                          ₹{(r.commissionEarned ?? 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setInspectedAffiliate(r)}
                            className="px-2.5 py-1 bg-[#26262a] hover:bg-[#d4af37] hover:text-black text-zinc-200 rounded font-bold transition text-[11px]"
                          >
                            Inspect Tree
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Hierarchy Tree View */}
          {referralActiveTab === 'tree' && (
            <div className="space-y-4">
              <div className="bg-[#121215] border border-[#26262a] rounded-xl p-4 shadow-xl">
                <h3 className="font-bold text-white text-sm mb-3">Referral Tree Explorer (Active Networks)</h3>
                {!referralTreeData?.tree || referralTreeData.tree.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    No active referral network structures recorded yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {referralTreeData.tree.map((aff: any) => (
                      <div key={aff.uid} className="bg-[#0a0a0b] border border-[#26262a] rounded-xl p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#26262a] gap-2">
                          <div>
                            <span className="font-mono text-[#d4af37] font-bold text-sm">UID {aff.uid}</span>
                            <span className="text-white font-medium ml-2">{aff.username}</span>
                            <span className="text-zinc-400 text-xs ml-2 font-mono">Code: {aff.referralCode}</span>
                          </div>
                          <div className="text-xs font-mono text-emerald-400 font-bold">
                            Total Commission: ₹{aff.totalCommission.toFixed(2)}
                          </div>
                        </div>

                        {/* Level 1 Members */}
                        <div className="space-y-1.5 pl-3 border-l-2 border-emerald-500/40">
                          <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                            <span>Level 1 Direct Referrals ({aff.level1.count} members)</span>
                            <span className="font-mono">Earned: ₹{aff.level1.commissionEarned.toFixed(2)}</span>
                          </div>
                          {aff.level1.members.length === 0 ? (
                            <div className="text-[11px] text-zinc-500 italic">No direct members yet</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                              {aff.level1.members.map((m: any) => (
                                <div key={m.uid} className="p-2 bg-[#141417] rounded-lg border border-[#26262a] text-[11px]">
                                  <div className="text-white font-bold">{m.username || `UID ${m.uid}`}</div>
                                  <div className="text-zinc-400 font-mono">UID: {m.uid} • Dep: ₹{m.totalDeposit}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Level 2 Members */}
                        <div className="space-y-1.5 pl-3 border-l-2 border-purple-500/40">
                          <div className="text-xs font-bold text-purple-400 flex items-center justify-between">
                            <span>Level 2 Team Subordinates ({aff.level2.count} members)</span>
                            <span className="font-mono">Earned: ₹{aff.level2.commissionEarned.toFixed(2)}</span>
                          </div>
                          {aff.level2.members.length === 0 ? (
                            <div className="text-[11px] text-zinc-500 italic">No team subordinates yet</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                              {aff.level2.members.map((m: any) => (
                                <div key={m.uid} className="p-2 bg-[#141417] rounded-lg border border-[#26262a] text-[11px]">
                                  <div className="text-white font-bold">{m.username || `UID ${m.uid}`}</div>
                                  <div className="text-zinc-400 font-mono">UID: {m.uid} • Via: UID {m.referredBy}</div>
                                  <div className="text-purple-300 font-mono">Dep: ₹{m.totalDeposit}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Commission History Log */}
          {referralActiveTab === 'history' && (
            <div className="bg-[#121215] border border-[#26262a] rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#26262a] flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Deposit Referral Commission Transaction History</h3>
                <span className="text-xs text-zinc-400">{referralTreeData?.commissionHistory?.length || 0} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1a1a1e] text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a]">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Referrer (Receiver)</th>
                      <th className="py-3 px-4">Depositor (Member)</th>
                      <th className="py-3 px-4">Deposit Amt</th>
                      <th className="py-3 px-4">Tier / Level</th>
                      <th className="py-3 px-4">Commission %</th>
                      <th className="py-3 px-4">Commission Payout</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26262a]">
                    {(!referralTreeData?.commissionHistory || referralTreeData.commissionHistory.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-500">
                          No commission transactions logged yet. Commission will appear here upon approved deposits.
                        </td>
                      </tr>
                    ) : (
                      referralTreeData.commissionHistory.map((rec: any) => (
                        <tr key={rec.id} className="hover:bg-[#1a1a1e]/40">
                          <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                            {rec.createdAt ? rec.createdAt.replace('T', ' ').slice(0, 19) : rec.date}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#d4af37]">
                            UID {rec.referrerUid}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-white">UID {rec.depositorUid}</span>
                            {rec.depositorUsername && <span className="text-zinc-400 text-[11px] block">{rec.depositorUsername}</span>}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            ₹{Number(rec.depositAmount || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.level === 1
                                ? (rec.isFirstDeposit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400')
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {rec.level === 1 ? (rec.isFirstDeposit ? 'Level 1 (1st Dep)' : 'Level 1 (Re-dep)') : 'Level 2 (Team)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#e0e0e0]">
                            {rec.commissionPercent}%
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                            +₹{Number(rec.commissionAmount || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              {rec.status || 'claimable'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal: Inspect Affiliate Tree */}
          {inspectedAffiliate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
              <div className="bg-[#121215] border border-[#26262a] rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#26262a]">
                  <div>
                    <h3 className="font-bold text-white text-base">Affiliate Network Details</h3>
                    <p className="text-xs text-zinc-400">UID: <strong className="text-[#d4af37] font-mono">{inspectedAffiliate.uid}</strong> • Username: {inspectedAffiliate.username}</p>
                  </div>
                  <button
                    onClick={() => setInspectedAffiliate(null)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-[#0a0a0b] rounded-lg border border-[#26262a]">
                    <div className="text-[10px] text-zinc-400">Direct Level 1</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{inspectedAffiliate.level1Count ?? 0}</div>
                  </div>
                  <div className="p-3 bg-[#0a0a0b] rounded-lg border border-[#26262a]">
                    <div className="text-[10px] text-zinc-400">Team Level 2</div>
                    <div className="text-base font-bold text-purple-400 mt-0.5">{inspectedAffiliate.level2Count ?? 0}</div>
                  </div>
                  <div className="p-3 bg-[#0a0a0b] rounded-lg border border-[#26262a]">
                    <div className="text-[10px] text-zinc-400">L1 Commission</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5 font-mono">₹{(inspectedAffiliate.level1Commission ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-[#0a0a0b] rounded-lg border border-[#26262a]">
                    <div className="text-[10px] text-zinc-400">L2 Commission</div>
                    <div className="text-base font-bold text-purple-400 mt-0.5 font-mono">₹{(inspectedAffiliate.level2Commission ?? 0).toFixed(2)}</div>
                  </div>
                </div>

                {/* Subordinate lists */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-emerald-400">Level 1 Direct Subordinates:</div>
                  {(!inspectedAffiliate.directSubordinates || inspectedAffiliate.directSubordinates.length === 0) ? (
                    <div className="text-xs text-zinc-500 italic p-3 bg-[#0a0a0b] rounded-lg">No direct subordinates</div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {inspectedAffiliate.directSubordinates.map((s: any) => (
                        <div key={s.uid} className="flex items-center justify-between p-2 bg-[#0a0a0b] rounded-lg border border-[#26262a] text-xs">
                          <div>
                            <span className="font-mono text-[#d4af37] font-bold">UID {s.uid}</span>
                            <span className="text-zinc-300 ml-2">{s.username}</span>
                          </div>
                          <div className="font-mono text-zinc-300">Dep: ₹{s.totalDeposit}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs font-bold text-purple-400 pt-2">Level 2 Team Subordinates:</div>
                  {(!inspectedAffiliate.teamSubordinates || inspectedAffiliate.teamSubordinates.length === 0) ? (
                    <div className="text-xs text-zinc-500 italic p-3 bg-[#0a0a0b] rounded-lg">No team subordinates</div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {inspectedAffiliate.teamSubordinates.map((s: any) => (
                        <div key={s.uid} className="flex items-center justify-between p-2 bg-[#0a0a0b] rounded-lg border border-[#26262a] text-xs">
                          <div>
                            <span className="font-mono text-purple-300 font-bold">UID {s.uid}</span>
                            <span className="text-zinc-300 ml-2">{s.username}</span>
                            <span className="text-zinc-500 text-[10px] ml-2 font-mono">(via {s.referredBy})</span>
                          </div>
                          <div className="font-mono text-zinc-300">Dep: ₹{s.totalDeposit}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#26262a] flex justify-end">
                  <button
                    onClick={() => setInspectedAffiliate(null)}
                    className="px-4 py-2 bg-[#26262a] hover:bg-[#36363c] text-white rounded-lg text-xs font-bold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
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
