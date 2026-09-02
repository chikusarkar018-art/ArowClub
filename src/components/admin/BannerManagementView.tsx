import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Image as ImageIcon, Plus, Edit2, Trash2, CheckCircle2,
  XCircle, Upload, X, Sliders, Eye
} from 'lucide-react';
import { BannerItem } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const BannerManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
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

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await api.updateAdminBanner(editingBanner.id, {
          title: formTitle,
          subtitle: formSubtitle,
          imageUrl: formImage || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
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
          imageUrl: formImage || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
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
    setFormImage('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80');
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

  return (
    <div className="space-y-6">
      {/* ================= ALL BANNERS TABLE ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">All Banners</h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage live homepage promotional carousels</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
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
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 capitalize">{b.position}</td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono font-bold">{b.priority}</td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(b)}
                          className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBanner(b.id)}
                          className="w-7 h-7 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-400 flex items-center justify-center transition"
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

        {/* Dynamic Pagination Bar (20 rows per page) */}
        <PaginationControl
          currentPage={currentPage}
          totalItems={banners.length}
          pageSize={20}
          onPageChange={setCurrentPage}
          itemName="banners"
        />
      </div>

      {/* ================= MODAL: ADD / EDIT BANNER ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                {editingBanner ? 'Edit Banner' : 'Add New Promotional Banner'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Banner Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME BONUS"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subtitle / Offer</label>
                <input
                  type="text"
                  placeholder="e.g. GET UPTO ₹5,000"
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
