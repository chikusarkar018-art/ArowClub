import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Bell, Plus, Eye, Trash2, Send, CheckCircle2,
  Clock, Users, AlertCircle, X, Sparkles
} from 'lucide-react';
import { AdminNotification } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const NotificationView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'all' | 'sent' | 'scheduled' | 'draft'>('all');
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AdminNotification | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<'maintenance' | 'offer' | 'promo' | 'system'>('offer');
  const [formAudience, setFormAudience] = useState<'all_users' | 'active_users' | 'specific_user'>('all_users');

  const fetchNotifications = async () => {
    try {
      const data = await api.getAdminNotifications();
      if (data?.notifications) {
        setNotifications(data.notifications);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdminNotification({
        title: formTitle,
        message: formMessage,
        type: formType,
        audience: formAudience,
        status: 'sent',
        adminUsername: admin?.username || 'SuperAdmin',
      });
      showToast('Notification broadcasted successfully to players!', 'success');
      setShowSendModal(false);
      setFormTitle('');
      setFormMessage('');
      fetchNotifications();
    } catch (err: any) {
      showToast(err.message || 'Failed to send notification', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await api.deleteAdminNotification(id, admin?.username || 'SuperAdmin');
      showToast('Notification removed', 'info');
      fetchNotifications();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete notification', 'error');
    }
  };

  const displayList = notifications;

  const filteredList = displayList.filter(n => {
    if (currentTab === 'all') return true;
    return n.status === currentTab;
  });

  const counts = {
    all: displayList.length,
    sent: displayList.filter(n => n.status === 'sent').length,
    scheduled: displayList.filter(n => n.status === 'scheduled').length,
    draft: displayList.filter(n => n.status === 'draft').length,
  };

  return (
    <div className="space-y-6">
      {/* ================= HEADER ACTIONS & TABS ================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1e202e] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'sent', label: `Sent (${counts.sent})` },
            { id: 'scheduled', label: `Scheduled (${counts.scheduled})` },
            { id: 'draft', label: `Draft (${counts.draft})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentTab === tab.id
                  ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/25'
                  : 'bg-[#121422] border border-[#23273c] text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>+ Send New Notification</span>
        </button>
      </div>

      {/* ================= NOTIFICATIONS TABLE ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Title</th>
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Audience</th>
                <th className="pb-3 px-3">Time</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e202e]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-medium">
                    No notifications in this category
                  </td>
                </tr>
              ) : (
                filteredList.slice((currentPage - 1) * 20, currentPage * 20).map((n) => {
                const isSent = n.status === 'sent';
                return (
                  <tr key={n.id} className="hover:bg-[#16182c]/40 transition">
                    <td className="py-3.5 px-3 font-semibold text-white">
                      <div>{n.title || 'Untitled Notification'}</div>
                      <div className="text-[11px] text-slate-400 font-normal truncate max-w-sm">{n.message || ''}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-[#181a2e] border border-[#2b304c] text-slate-300 text-[10px] font-semibold">
                        {n.type || 'system'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 capitalize">
                      {n.audience ? String(n.audience).replace(/_/g, ' ') : 'All Users'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{n.createdAt || '-'}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSent
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {isSent ? 'Sent' : 'Scheduled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedNotif(n)}
                          className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="w-7 h-7 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-400 flex items-center justify-center transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar (20 rows per page) */}
        <PaginationControl
          currentPage={currentPage}
          totalItems={filteredList.length}
          pageSize={20}
          onPageChange={setCurrentPage}
          itemName="notifications"
        />
      </div>

      {/* ================= MODAL: SEND NOTIFICATION ================= */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                Broadcast Notification
              </h3>
              <button onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Weekend Deposit Bonus"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category / Type</label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white capitalize"
                  >
                    <option value="offer">Special Offer</option>
                    <option value="promo">Promo & Bonus</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="system">System Update</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Audience</label>
                  <select
                    value={formAudience}
                    onChange={(e: any) => setFormAudience(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white capitalize"
                  >
                    <option value="all_users">All Registered Players</option>
                    <option value="active_users">Active Users Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notification Message / Announcement</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write clear notification content that will show up on user dashboard..."
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#1e202e]">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold"
                >
                  Send Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW NOTIFICATION ================= */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">{selectedNotif.title}</h3>
            <p className="text-xs text-slate-300 mb-4 bg-[#181a2e] p-3 rounded-xl border border-[#2b304c] leading-relaxed">
              {selectedNotif.message}
            </p>
            <div className="text-[11px] text-slate-400 space-y-1 mb-4">
              <div>Type: <span className="text-white capitalize">{selectedNotif.type || 'system'}</span></div>
              <div>Audience: <span className="text-white capitalize">{selectedNotif.audience ? String(selectedNotif.audience).replace(/_/g, ' ') : 'All Users'}</span></div>
              <div>Broadcasted: <span className="text-white">{selectedNotif.createdAt || '-'}</span></div>
            </div>
            <button
              onClick={() => setSelectedNotif(null)}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
