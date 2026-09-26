import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Image as ImageIcon, Plus, Edit2, Trash2, CheckCircle2,
  XCircle, Upload, X, Sliders, Eye, Megaphone, Gift,
  Sparkles, Save, Check, ExternalLink, AlertCircle
} from 'lucide-react';
import { BannerItem, AnnouncementPopupConfig, FirstDepositBonusConfig, FirstDepositBonusTier } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const BannerManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'banners' | 'announcement' | 'first_deposit'>('banners');

  // ================= BANNERS STATE =================
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formPosition, setFormPosition] = useState<'top' | 'middle' | 'bottom'>('top');
  const [formPriority, setFormPriority] = useState(1);
  const [formActionUrl, setFormActionUrl] = useState('/recharge');

  // ================= ANNOUNCEMENT POPUP STATE =================
  const [announcement, setAnnouncement] = useState<AnnouncementPopupConfig>({
    isEnabled: false,
    title: 'ArowClub Official Announcement',
    message: 'Welcome to ArowClub! Enjoy instant 24/7 UPI & Bank withdrawals, fair games, and daily deposit bonuses.',
    imageUrl: '/banners/bonus_100.jpg',
    buttonText: 'Got It / Continue',
    actionUrl: '/recharge',
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // ================= FIRST DEPOSIT BONUS POPUP STATE =================
  const [firstDepositConfig, setFirstDepositConfig] = useState<FirstDepositBonusConfig>({
    isEnabled: true,
    title: 'Extra first deposit bonus',
    subtitle: 'Each account can only receive rewards once',
    tiers: [
      { id: 'tier-1000000', amount: 1000000, bonusAmount: 10000, isActive: true },
      { id: 'tier-50000', amount: 50000, bonusAmount: 588, isActive: true },
      { id: 'tier-10000', amount: 10000, bonusAmount: 288, isActive: true },
      { id: 'tier-5000', amount: 5000, bonusAmount: 188, isActive: true },
      { id: 'tier-1000', amount: 1000, bonusAmount: 58, isActive: true },
      { id: 'tier-500', amount: 500, bonusAmount: 28, isActive: true },
      { id: 'tier-100', amount: 100, bonusAmount: 10, isActive: true },
    ],
  });
  const [isSavingFirstDeposit, setIsSavingFirstDeposit] = useState(false);
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [newTierAmount, setNewTierAmount] = useState<number>(2000);
  const [newTierBonus, setNewTierBonus] = useState<number>(88);

  const fetchBanners = async () => {
    try {
      const data = await api.getAdminBanners();
      if (data?.banners) {
        setBanners(data.banners);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchPopups = async () => {
    try {
      const [annRes, fdbRes] = await Promise.all([
        api.getAnnouncementPopup().catch(() => null),
        api.getFirstDepositBonusConfig().catch(() => null),
      ]);
      if (annRes?.announcement) {
        setAnnouncement(annRes.announcement);
      }
      if (fdbRes?.config) {
        setFirstDepositConfig(fdbRes.config);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchPopups();
  }, []);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await api.updateAdminBanner(editingBanner.id, {
          title: formTitle,
          subtitle: formSubtitle,
          imageUrl: formImage || '/banners/bonus_100.jpg',
          position: formPosition,
          priority: Number(formPriority),
          actionUrl: formActionUrl,
          adminUsername: admin?.username || 'SuperAdmin',
        });
        showToast('Banner updated successfully!', 'success');
      } else {
        await api.createAdminBanner({
          title: formTitle,
          subtitle: formSubtitle,
          imageUrl: formImage || '/banners/bonus_100.jpg',
          position: formPosition,
          priority: Number(formPriority),
          actionUrl: formActionUrl,
          status: 'active',
          adminUsername: admin?.username || 'SuperAdmin',
        });
        showToast('New promotional banner created!', 'success');
      }
      setShowAddModal(false);
      setEditingBanner(null);
      fetchBanners();
    } catch (err: any) {
      showToast(err.message || 'Failed to save banner', 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      await api.deleteAdminBanner(id, admin?.username || 'SuperAdmin');
      showToast('Banner deleted', 'info');
      fetchBanners();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete banner', 'error');
    }
  };

  const openAddModal = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormImage('/banners/bonus_100.jpg');
    setFormPosition('top');
    setFormPriority(1);
    setFormActionUrl('/recharge');
    setShowAddModal(true);
  };

  const openEditModal = (b: BannerItem) => {
    setEditingBanner(b);
    setFormTitle(b.title);
    setFormSubtitle(b.subtitle || '');
    setFormImage(b.imageUrl);
    setFormPosition(b.position);
    setFormPriority(b.priority);
    setFormActionUrl(b.actionUrl || '/recharge');
    setShowAddModal(true);
  };

  // Save Announcement Configuration
  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      const res = await api.updateAdminAnnouncementPopup(announcement, admin?.username || 'SuperAdmin');
      if (res?.success) {
        showToast('Launch Announcement Popup settings saved successfully!', 'success');
      } else {
        showToast(res?.error || 'Failed to save announcement', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save announcement', 'error');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  // Save First Deposit Bonus Configuration
  const handleSaveFirstDepositConfig = async () => {
    setIsSavingFirstDeposit(true);
    try {
      const res = await api.updateAdminFirstDepositBonusConfig(firstDepositConfig, admin?.username || 'SuperAdmin');
      if (res?.success) {
        showToast('First Deposit Bonus Tiers & Popup saved successfully!', 'success');
      } else {
        showToast(res?.error || 'Failed to save config', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save first deposit bonus config', 'error');
    } finally {
      setIsSavingFirstDeposit(false);
    }
  };

  // Add new tier to first deposit config
  const handleAddNewTier = () => {
    if (!newTierAmount || newTierAmount <= 0) {
      showToast('Deposit amount must be greater than 0', 'error');
      return;
    }
    const newTier: FirstDepositBonusTier = {
      id: `tier-${newTierAmount}`,
      amount: Number(newTierAmount),
      bonusAmount: Number(newTierBonus || 0),
      label: `+₹${newTierBonus} Bonus`,
      isActive: true,
    };

    setFirstDepositConfig((prev) => {
      const filtered = prev.tiers.filter((t) => Number(t.amount) !== Number(newTierAmount));
      const updated = [...filtered, newTier];
      updated.sort((a, b) => Number(b.amount) - Number(a.amount));
      return { ...prev, tiers: updated };
    });

    setShowAddTierModal(false);
    showToast(`Tier ₹${newTierAmount} added! Click "Save Tiers Configuration" to publish.`, 'info');
  };

  const handleDeleteTier = (tierId: string) => {
    setFirstDepositConfig((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((t) => t.id !== tierId),
    }));
    showToast('Tier removed. Remember to click "Save Tiers Configuration" to save.', 'info');
  };

  const handleToggleTier = (tierId: string) => {
    setFirstDepositConfig((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => t.id === tierId ? { ...t, isActive: !t.isActive } : t),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#121422] border border-[#23273c] rounded-2xl">
        <button
          onClick={() => setActiveTab('banners')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'banners'
              ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Homepage Banners</span>
        </button>

        <button
          onClick={() => setActiveTab('announcement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer relative ${
            activeTab === 'announcement'
              ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-400" />
          <span>📢 Launch Announcement Popup</span>
          {announcement.isEnabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('first_deposit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer relative ${
            activeTab === 'first_deposit'
              ? 'bg-[#f5c443] text-black shadow-md shadow-amber-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>🎁 First Deposit Bonus Popup (Tiers)</span>
          {firstDepositConfig.isEnabled && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* ================= TAB 1: ALL HOMEPAGE BANNERS ================= */}
      {activeTab === 'banners' && (
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Homepage Banners</h3>
              <p className="text-xs text-slate-400 mt-0.5">Manage live homepage promotional carousels & sliders</p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Banner</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Banner</th>
                  <th className="pb-3 px-3">Title</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Position</th>
                  <th className="pb-3 px-3">Priority</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202e]">
                {banners.slice((currentPage - 1) * 20, currentPage * 20).map((b) => {
                  const isActive = b.status === 'active';
                  return (
                    <tr key={b.id} className="hover:bg-[#16182c]/40 transition">
                      <td className="py-3 px-3">
                        <div className="w-16 h-10 rounded-lg overflow-hidden border border-[#2b304c] bg-black/40">
                          <img
                            src={b.imageUrl}
                            alt={b.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        <div>{b.title}</div>
                        {b.subtitle && <div className="text-[11px] text-slate-400">{b.subtitle}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 capitalize">{b.position}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">#{b.priority}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBanner(b.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationControl
            currentPage={currentPage}
            totalItems={banners.length}
            pageSize={20}
            onPageChange={setCurrentPage}
            itemName="banners"
          />
        </div>
      )}

      {/* ================= TAB 2: LAUNCH ANNOUNCEMENT POPUP ================= */}
      {activeTab === 'announcement' && (
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#23273c]">
            <div>
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">App Launch Announcement Popup</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Show this promotional announcement modal when users open their ID. If active, it appears first; when dismissed, the First Deposit Bonus popup appears automatically.
              </p>
            </div>

            {/* Enable / Disable Switch */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${announcement.isEnabled ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {announcement.isEnabled ? 'Popup ACTIVE' : 'Popup DISABLED'}
              </span>
              <button
                type="button"
                onClick={() => setAnnouncement((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  announcement.isEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    announcement.isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Important Maintenance / VIP Carnival Notice"
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Announcement Banner Image URL
                </label>
                <input
                  type="url"
                  value={announcement.imageUrl || ''}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="e.g. /banners/bonus_100.jpg or https://..."
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setAnnouncement((prev) => ({ ...prev, imageUrl: '/banners/bonus_100.jpg' }))}
                    className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-zinc-300"
                  >
                    Preset 1 (Bonus 100)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnouncement((prev) => ({ ...prev, imageUrl: '/banners/vip_carnival.jpg' }))}
                    className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-zinc-300"
                  >
                    Preset 2 (VIP Carnival)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnouncement((prev) => ({ ...prev, imageUrl: '/banners/invite_earn.jpg' }))}
                    className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-zinc-300"
                  >
                    Preset 3 (Invite & Earn)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={announcement.buttonText || 'Got It / Continue'}
                    onChange={(e) => setAnnouncement((prev) => ({ ...prev, buttonText: e.target.value }))}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Action URL
                  </label>
                  <input
                    type="text"
                    value={announcement.actionUrl || '/recharge'}
                    onChange={(e) => setAnnouncement((prev) => ({ ...prev, actionUrl: e.target.value }))}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Announcement Message / Description
                </label>
                <textarea
                  rows={6}
                  value={announcement.message}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter full notice or offer details..."
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-xs text-white leading-relaxed resize-none"
                />
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-[#0a0b12] rounded-xl border border-white/10">
                <div className="text-[11px] font-bold text-amber-400 mb-1">Live Preview Snapshot:</div>
                <div className="flex items-center gap-3">
                  {announcement.imageUrl && (
                    <img
                      src={announcement.imageUrl}
                      alt="Preview"
                      className="w-16 h-12 rounded object-cover border border-white/10"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{announcement.title}</div>
                    <div className="text-[10px] text-zinc-400 line-clamp-2">{announcement.message}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[#23273c]">
            <button
              onClick={handleSaveAnnouncement}
              disabled={isSavingAnnouncement}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#f5c443] hover:brightness-105 active:scale-95 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingAnnouncement ? 'Saving...' : 'Save Announcement Popup'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 3: FIRST DEPOSIT BONUS POPUP & TIERS ================= */}
      {activeTab === 'first_deposit' && (
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#23273c]">
            <div>
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#f5c443]" />
                <h3 className="text-base font-bold text-white">First Deposit Bonus Popup (Golden/Yellow Modal)</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Customize the tiered first recharge bonus popup matching your screenshot. As clients deposit money, the progress fills up and unlocks the bonus claim button!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${firstDepositConfig.isEnabled ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {firstDepositConfig.isEnabled ? 'Popup ACTIVE' : 'Popup DISABLED'}
              </span>
              <button
                type="button"
                onClick={() => setFirstDepositConfig((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  firstDepositConfig.isEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    firstDepositConfig.isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Title & Subtitle Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Modal Header Title
              </label>
              <input
                type="text"
                value={firstDepositConfig.title}
                onChange={(e) => setFirstDepositConfig((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Modal Subtitle
              </label>
              <input
                type="text"
                value={firstDepositConfig.subtitle}
                onChange={(e) => setFirstDepositConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
                className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Tiers Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                Deposit Bonus Reward Tiers ({firstDepositConfig.tiers.length} Tiers)
              </h4>
              <button
                type="button"
                onClick={() => setShowAddTierModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Tier</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#23273c] bg-[#0c0d16]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider bg-[#141626]">
                    <th className="py-2.5 px-3">First Deposit Target</th>
                    <th className="py-2.5 px-3">Bonus Reward (₹)</th>
                    <th className="py-2.5 px-3">Client Subtitle</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e202e]">
                  {firstDepositConfig.tiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-[#16182c]/40 transition">
                      <td className="py-3 px-3 font-bold text-white font-mono">
                        ₹{Number(tier.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 font-black text-[#f5c443] font-mono">
                        + ₹{Number(tier.bonusAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 text-[11px]">
                        Deposit {tier.amount} for the first time and receive {tier.bonusAmount} bonus
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleTier(tier.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            tier.isActive !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}
                        >
                          {tier.isActive !== false ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTier(tier.id)}
                          className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                          title="Delete Tier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[#23273c]">
            <button
              onClick={handleSaveFirstDepositConfig}
              disabled={isSavingFirstDeposit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#f5c443] hover:brightness-105 active:scale-95 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingFirstDeposit ? 'Saving...' : 'Save Tiers Configuration'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal for adding new tier */}
      {showAddTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141624] border border-[#2b304c] rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4">Add First Deposit Bonus Tier</h3>
            
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Target Deposit Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={newTierAmount}
                  onChange={(e) => setNewTierAmount(Number(e.target.value))}
                  placeholder="e.g. 2000"
                  className="w-full bg-[#1a1c2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Bonus Reward Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={newTierBonus}
                  onChange={(e) => setNewTierBonus(Number(e.target.value))}
                  placeholder="e.g. 88"
                  className="w-full bg-[#1a1c2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddTierModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewTier}
                className="px-5 py-2 rounded-xl bg-[#f5c443] text-black text-xs font-black shadow"
              >
                Add Tier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ADD/EDIT PROMO BANNER ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-6 max-w-md w-full shadow-2xl text-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e202e]">
              <h3 className="font-bold text-white text-sm">
                {editingBanner ? 'Edit Banner' : 'Create New Promotional Banner'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Image URL / Background</label>
                <input
                  type="url"
                  required
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Display Position</label>
                  <select
                    value={formPosition}
                    onChange={(e: any) => setFormPosition(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white capitalize"
                  >
                    <option value="top">Top Carousel</option>
                    <option value="middle">Middle Banner</option>
                    <option value="bottom">Bottom Popup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority Order</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#1e202e]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
