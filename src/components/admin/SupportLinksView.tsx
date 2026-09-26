import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Headphones, Plus, Edit2, Trash2, Copy, Check,
  ExternalLink, MessageSquare, Send, Mail, Globe, X
} from 'lucide-react';
import { SupportPlatformLink } from '../../types.js';

export const SupportLinksView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [links, setLinks] = useState<SupportPlatformLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<SupportPlatformLink | null>(null);

  // Form
  const [formPlatform, setFormPlatform] = useState('WhatsApp Support');
  const [formIconKey, setFormIconKey] = useState('whatsapp');
  const [formUrl, setFormUrl] = useState('https://wa.me/919876543210');
  const [formDescription, setFormDescription] = useState('Official 24/7 VIP Support');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      const data = await api.getAdminSupportLinks();
      if (data?.links) {
        setLinks(data.links);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLink) {
        await api.updateAdminSupportLink(editingLink.id, {
          platform: formPlatform,
          iconKey: formIconKey,
          url: formUrl,
          description: formDescription,
          adminUsername: admin?.username || 'SuperAdmin',
        });
        showToast('Support link updated!', 'success');
      } else {
        await api.createAdminSupportLink({
          platform: formPlatform,
          iconKey: formIconKey,
          url: formUrl,
          description: formDescription,
          status: 'active',
          adminUsername: admin?.username || 'SuperAdmin',
        });
        showToast('New support link added!', 'success');
      }
      setShowModal(false);
      setEditingLink(null);
      fetchLinks();
    } catch (err: any) {
      showToast(err.message || 'Failed to save support link', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this support channel?')) return;
    try {
      await api.deleteAdminSupportLink(id, admin?.username || 'SuperAdmin');
      showToast('Support link deleted', 'info');
      fetchLinks();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete support link', 'error');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Link copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAdd = () => {
    setEditingLink(null);
    setFormPlatform('WhatsApp VIP Support');
    setFormIconKey('whatsapp');
    setFormUrl('https://wa.me/919876543210');
    setFormDescription('24/7 Deposit & Payout Help');
    setShowModal(true);
  };

  const openEdit = (l: SupportPlatformLink) => {
    setEditingLink(l);
    setFormPlatform(l.platform || l.name || 'WhatsApp Support');
    setFormIconKey(l.iconKey || l.icon || 'whatsapp');
    setFormUrl(l.url || l.link || '');
    setFormDescription(l.description || l.copyText || '');
    setShowModal(true);
  };

  const getPlatformIcon = (iconKey?: string) => {
    const key = (iconKey || '').toLowerCase();
    switch (key) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'telegram':
        return <Send className="w-4 h-4 text-sky-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-amber-400" />;
      case 'livechat':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      default:
        return <Headphones className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= ALL SUPPORT LINKS TABLE ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">All Support Links</h3>
            <p className="text-xs text-slate-400 mt-0.5">Direct player customer support channels & social links</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Link</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Platform</th>
                <th className="pb-3 px-3">Icon</th>
                <th className="pb-3 px-3">Link</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e202e]">
              {links.map((l) => {
                const isActive = l.status === 'active' || l.isActive === true;
                const platformName = l.platform || l.name || 'Support Channel';
                const platformUrl = l.url || l.link || '#';
                const platformDesc = l.description || l.copyText || '';
                const platformIconKey = l.iconKey || l.icon || 'whatsapp';

                return (
                  <tr key={l.id} className="hover:bg-[#16182c]/40 transition">
                    <td className="py-3.5 px-3 font-semibold text-white">
                      <div>{platformName}</div>
                      {platformDesc && <div className="text-[11px] text-slate-400">{platformDesc}</div>}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center">
                        {getPlatformIcon(platformIconKey)}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-indigo-400 font-mono text-[11px]">
                      <a href={platformUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        <span className="truncate max-w-[240px]">{platformUrl}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="py-3.5 px-3">
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
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCopy(l.id, platformUrl)}
                          title="Copy Link URL"
                          className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          {copiedId === l.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => openEdit(l)}
                          title="Edit Link"
                          className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          title="Delete Link"
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
      </div>

      {/* ================= MODAL: ADD / EDIT LINK ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-400" />
                {editingLink ? 'Edit Support Link' : 'Add Support Channel'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Platform Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WhatsApp VIP Support"
                  value={formPlatform}
                  onChange={(e) => setFormPlatform(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Platform Icon</label>
                  <select
                    value={formIconKey}
                    onChange={(e) => setFormIconKey(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white capitalize"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="email">Email</option>
                    <option value="livechat">Live Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Badge / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. 24/7 Active"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Direct Link URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://wa.me/919876543210 or https://t.me/..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#1e202e]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
