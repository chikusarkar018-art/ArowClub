import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { AdminUser, AdminActivityLog, PlatformSettings } from '../../types.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Shield, Settings, Users, History, Key, Plus, Lock,
  Save, AlertTriangle, CheckCircle2, XCircle, Search,
  Power, ShieldAlert, Send, Headphones, Globe, MessageSquare,
  Check, ExternalLink, Sparkles, PhoneCall, Radio, Cloud,
  Database, RefreshCw
} from 'lucide-react';

export const SystemManagementView: React.FC<{ defaultSubTab?: string }> = ({
  defaultSubTab = 'system_social',
}) => {
  const { admin, showToast } = useAuth();
  const [subTab, setSubTab] = useState(defaultSubTab);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<any>(null);

  // New Admin Staff Modal
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    email: '',
    role: 'operator' as any,
    password: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsRes, logsRes, settingsRes] = await Promise.all([
        api.getAdminStaffList(),
        api.getAdminActivityLogs(),
        api.getPlatformSettings(),
      ]);
      if (adminsRes?.admins) setAdmins(adminsRes.admins);
      if (logsRes?.logs) setLogs(logsRes.logs);
      if (settingsRes) setSettings(settingsRes);

      // Check cloud status
      fetch('/api/admin/cloud-status')
        .then(r => r.json())
        .then(d => setCloudStatus(d))
        .catch(() => {});
    } catch (err) {
      console.error('Failed to load system data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCloudSync = async () => {
    try {
      setSyncingCloud(true);
      const res = await fetch('/api/admin/cloud-sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('All user balances, records, and settings synced permanently to Firebase Cloud!', 'success');
      } else {
        showToast(data.error || 'Failed to sync to cloud', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Sync error', 'error');
    } finally {
      setSyncingCloud(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password) return;

    try {
      await api.createAdminStaff({ ...newAdmin, adminUsername: admin?.username || 'SuperAdmin' });
      showToast(`Admin staff account ${newAdmin.username} created successfully!`, 'success');
      setShowAddAdminModal(false);
      setNewAdmin({ username: '', email: '', role: 'operator', password: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create admin staff', 'error');
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSavingSettings(true);
      await api.updatePlatformSettings(settings, admin?.username || 'SuperAdmin');
      showToast('All Platform & Social links updated successfully! Synced across all user pages.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121215] border border-[#26262a] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">System, Social Links & Security Center</h2>
            <p className="text-xs text-[#a1a1aa]">Configure WhatsApp & Telegram channels, manage platform parameters, and inspect audit logs.</p>
          </div>
        </div>

        <div className="flex flex-wrap bg-[#0a0a0b] p-1 rounded-lg border border-[#26262a] gap-1 text-xs font-semibold">
          <button
            onClick={() => setSubTab('system_social')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              subTab === 'system_social' ? 'bg-[#d4af37] text-black font-bold shadow-md' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>WhatsApp & Telegram Links</span>
          </button>
          <button
            onClick={() => setSubTab('system_settings')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'system_settings' ? 'bg-[#d4af37] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Platform Settings
          </button>
          <button
            onClick={() => setSubTab('system_admins')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'system_admins' ? 'bg-[#d4af37] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Admin Staff ({admins.length})
          </button>
          <button
            onClick={() => setSubTab('system_activity_logs')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'system_activity_logs' ? 'bg-[#d4af37] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Audit Logs ({logs.length})
          </button>
        </div>
      </div>

      {/* 1. Dedicated Social Channels & Official Links Tab */}
      {subTab === 'system_social' && settings && (
        <form onSubmit={handleSavePlatformSettings} className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-950/40 via-[#121215] to-[#121524] border border-emerald-500/20 p-4 sm:p-6 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
                <Headphones className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Direct WhatsApp & Telegram Link Manager</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Synced
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                  यहाँ आप WhatsApp नंबर, डायरेक्ट चैट लिंक, WhatsApp ग्रुप, Telegram सपोर्ट हैंडल और Telegram चैनल लिंक सेट कर सकते हैं। यह लिंक तुरंत पूरे यूज़र एप्लिकेशन (24/7 Support modal, Header, Footer, Recharge help) में अपडेट हो जाएगा।
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp Settings Card */}
            <div className="bg-[#121215] border border-[#26262a] hover:border-emerald-500/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl transition">
              <div className="flex items-center justify-between border-b border-[#26262a] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366] font-bold">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">WhatsApp Support & Channel</h4>
                    <p className="text-[11px] text-[#a1a1aa]">Direct customer care & VIP discussion group</p>
                  </div>
                </div>

                {/* WhatsApp Enable/Disable Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isWhatsappActive ?? true}
                    onChange={e => setSettings({ ...settings, isWhatsappActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                </label>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#e0e0e0] mb-1">
                    WhatsApp Display Number / Title
                  </label>
                  <input
                    type="text"
                    value={settings.whatsappSupport || ''}
                    onChange={e => setSettings({ ...settings, whatsappSupport: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#25D366] font-mono"
                  />
                  <p className="text-[11px] text-[#71717a] mt-1">यूज़र को दिखने वाला कस्टमर केयर नंबर।</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#e0e0e0] mb-1">
                    Direct WhatsApp Click-to-Chat URL
                  </label>
                  <input
                    type="text"
                    value={settings.whatsappLink || ''}
                    onChange={e => setSettings({ ...settings, whatsappLink: e.target.value })}
                    placeholder="https://wa.me/919876543210"
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#25D366] font-mono"
                  />
                  <p className="text-[11px] text-[#71717a] mt-1">क्लिक करने पर खुलने वाला डायरेक्ट चैट लिंक (जैसे: https://wa.me/919876543210)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#e0e0e0] mb-1">
                    WhatsApp Official Group / Community Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.whatsappGroup || ''}
                    onChange={e => setSettings({ ...settings, whatsappGroup: e.target.value })}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#25D366] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Telegram Settings Card */}
            <div className="bg-[#121215] border border-[#26262a] hover:border-[#0088cc]/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl transition">
              <div className="flex items-center justify-between border-b border-[#26262a] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0088cc]/20 border border-[#0088cc]/40 flex items-center justify-center text-[#0088cc] font-bold">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Telegram Support & Channel</h4>
                    <p className="text-[11px] text-[#a1a1aa]">Direct VIP bot, support desk & predictions</p>
                  </div>
                </div>

                {/* Telegram Enable/Disable Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isTelegramActive ?? true}
                    onChange={e => setSettings({ ...settings, isTelegramActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0088cc]"></div>
                </label>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#e0e0e0] mb-1">
                    Telegram Support Handle / URL
                  </label>
                  <input
                    type="text"
                    value={settings.telegramSupport || ''}
                    onChange={e => setSettings({ ...settings, telegramSupport: e.target.value })}
                    placeholder="@ArowClubSupport or https://t.me/ArowClubSupport"
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#0088cc] font-mono"
                  />
                  <p className="text-[11px] text-[#71717a] mt-1">सपोर्ट यूज़रनेम या डायरेक्ट चैट लिंक।</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#e0e0e0] mb-1">
                    Official Telegram Channel / Prediction Group Link
                  </label>
                  <input
                    type="text"
                    value={settings.telegramChannel || ''}
                    onChange={e => setSettings({ ...settings, telegramChannel: e.target.value })}
                    placeholder="https://t.me/ArowClubOfficial"
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#0088cc] font-mono"
                  />
                  <p className="text-[11px] text-[#71717a] mt-1">ऑफ़िशियल विंगो प्रेडिक्शन और अनाउंस्मेंट्स चैनल लिंक।</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#e0e0e0] mb-1">
                    Support Helpline Title Text
                  </label>
                  <input
                    type="text"
                    value={settings.supportHelplineTitle || ''}
                    onChange={e => setSettings({ ...settings, supportHelplineTitle: e.target.value })}
                    placeholder="24/7 Official VIP Customer Care"
                    className="w-full px-3.5 py-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Support Banner & Announcement Text */}
          <div className="bg-[#121215] border border-[#26262a] rounded-2xl p-5 sm:p-6 space-y-3 shadow-xl">
            <label className="block text-xs font-semibold text-[#e0e0e0]">
              Support Notice / Banner Message (Shown inside User Support & Recharge Windows)
            </label>
            <textarea
              rows={2}
              value={settings.supportBannerText || ''}
              onChange={e => setSettings({ ...settings, supportBannerText: e.target.value })}
              placeholder="Contact our official verified WhatsApp and Telegram channels for instant 2-minute deposit approval and withdrawal help."
              className="w-full p-3.5 bg-[#0a0a0b] border border-[#26262a] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#121215] border border-[#26262a] rounded-xl">
            <div className="text-xs text-zinc-400">
              Changes take effect immediately across all active user sessions without app restart.
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-[#d4af37] hover:bg-[#c5a028] text-black font-black rounded-xl text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving Links...' : 'Save & Publish Social Links'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. Admin Staff Tab */}
      {subTab === 'system_admins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Registered Admin & Support Staff</h3>
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="px-3 py-1.5 bg-[#d4af37] hover:bg-[#c5a028] text-black font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Staff Account</span>
            </button>
          </div>

          <div className="bg-[#121215] border border-[#26262a] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1e] text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a]">
                  <tr>
                    <th className="py-3 px-4">Staff ID / Username</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role Permission</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26262a]">
                  {admins.map(a => (
                    <tr key={a.id} className="hover:bg-[#1a1a1e]/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{a.username}</div>
                        <div className="font-mono text-[11px] text-[#71717a]">ID: {a.id}</div>
                      </td>
                      <td className="py-3 px-4 text-[#e0e0e0]">{a.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#1a1a1e] border border-[#26262a] text-[#d4af37]">
                          {a.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#a1a1aa]">
                        {a.lastLogin ? new Date(a.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[11px] text-[#71717a] font-mono">Protected</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Admin Activity Logs Tab (Audit Trail) */}
      {subTab === 'system_activity_logs' && (
        <div className="bg-[#121215] border border-[#26262a] rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#26262a] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Security Audit Trail & Admin Activity Logs</h3>
              <p className="text-xs text-[#a1a1aa]">Every sensitive action (deposit approval, manual result lock, balance adjustment) is permanently logged.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1a1a1e] text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a]">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Admin Username</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Mandatory Reason & Audit Details</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262a]">
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-[#71717a]">No activity logs recorded yet</td></tr>
                ) : (
                  logs.map(l => (
                    <tr key={l.id} className="hover:bg-[#1a1a1e]/40">
                      <td className="py-3 px-4 font-mono text-[#71717a]">{l.id}</td>
                      <td className="py-3 px-4 font-bold text-white">{l.adminUsername}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37]">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#e0e0e0]">{l.target}</td>
                      <td className="py-3 px-4 text-[#e0e0e0] max-w-xs">{l.details}</td>
                      <td className="py-3 px-4 font-mono text-[#a1a1aa]">{l.ipAddress}</td>
                      <td className="py-3 px-4 text-right text-[#a1a1aa]">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Platform Settings Tab */}
      {subTab === 'system_settings' && settings && (
        <form onSubmit={handleSavePlatformSettings} className="bg-[#121215] border border-[#26262a] rounded-xl p-6 space-y-6 shadow-xl max-w-4xl">
          <h3 className="font-bold text-white text-base">Global Platform Configuration</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Platform Brand Name</label>
              <input
                type="text"
                required
                value={settings.siteName}
                onChange={e => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">WhatsApp Customer Care</label>
              <input
                type="text"
                value={settings.whatsappSupport || ''}
                onChange={e => setSettings({ ...settings, whatsappSupport: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Official Telegram Support URL</label>
              <input
                type="text"
                value={settings.telegramSupport || ''}
                onChange={e => setSettings({ ...settings, telegramSupport: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Official Telegram Channel URL</label>
              <input
                type="text"
                value={settings.telegramChannel || ''}
                onChange={e => setSettings({ ...settings, telegramChannel: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Merchant UPI ID (For Recharge QR)</label>
              <input
                type="text"
                required
                value={settings.merchantUpiId}
                onChange={e => setSettings({ ...settings, merchantUpiId: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Merchant Account Name</label>
              <input
                type="text"
                required
                value={settings.merchantName}
                onChange={e => setSettings({ ...settings, merchantName: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Minimum Deposit Amount (₹)</label>
              <input
                type="number"
                min="100"
                value={settings.minDeposit}
                onChange={e => setSettings({ ...settings, minDeposit: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Minimum Withdrawal Amount (₹)</label>
              <input
                type="number"
                min="100"
                value={settings.minWithdrawal}
                onChange={e => setSettings({ ...settings, minWithdrawal: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
            </div>

            <div className="p-3 bg-[#0a0a0b] border border-amber-500/20 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">Game Tax & Cut Settings</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">Configured Per-Game</span>
              </div>
              <p className="text-[11px] text-[#a1a1aa]">
                Winning deduction & GST cut % are managed individually per game in the dedicated <strong>Game Tax & Cut Settings</strong> section in the sidebar.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Deposit Turnover Multiplier (x)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={settings.depositTurnoverMultiplier ?? 1.0}
                onChange={e => setSettings({ ...settings, depositTurnoverMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white font-mono focus:border-[#d4af37]"
              />
              <p className="text-[11px] text-[#71717a] mt-0.5">Required betting turnover added per approved deposit (e.g. 1.0x = deposit amount).</p>
            </div>
          </div>

          {/* Firebase Cloud Firestore Persistence Status */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#121215] to-emerald-950/40 border border-blue-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">Firebase Cloud Permanent Database</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Connected & Auto-Synced
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    All user accounts, balances, bets, deposit & withdrawal history are permanently saved to Google Firebase Cloud.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualCloudSync}
                disabled={syncingCloud}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
                <span>{syncingCloud ? 'Syncing...' : 'Backup to Cloud Now'}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[11px]">
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <span className="text-zinc-400 block text-[10px]">Cloud Provider</span>
                <span className="font-bold text-white">Google Firestore</span>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <span className="text-zinc-400 block text-[10px]">Data Persistence</span>
                <span className="font-bold text-emerald-400">Permanent (No Loss)</span>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <span className="text-zinc-400 block text-[10px]">Re-publish Safety</span>
                <span className="font-bold text-white">100% Protected</span>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <span className="text-zinc-400 block text-[10px]">Sync Interval</span>
                <span className="font-bold text-blue-300">Real-time / Instant</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#26262a] flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-[#d4af37] hover:bg-[#c5a028] text-black font-bold rounded-lg text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save System Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal: Create Staff */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleCreateAdmin} className="bg-[#121215] border border-[#26262a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-[#d4af37]/20 text-[#d4af37]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Create Admin / Support Staff</h3>
                <p className="text-xs text-[#a1a1aa]">Assign administrative roles and panel permissions.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Username</label>
              <input
                type="text"
                required
                value={newAdmin.username}
                onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                placeholder="e.g. RahulSupport"
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Staff Email Address</label>
              <input
                type="email"
                required
                value={newAdmin.email}
                onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                placeholder="staff@arowclub.vip"
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Password</label>
              <input
                type="password"
                required
                value={newAdmin.password}
                onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">Role Permission Level</label>
              <select
                value={newAdmin.role}
                onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg text-xs text-white focus:border-[#d4af37]"
              >
                <option value="operator">Operator (View Only & Chat Support)</option>
                <option value="manager">Manager (Approve Deposits/Withdrawals)</option>
                <option value="admin">Administrator (Full Game Controls & Users)</option>
                <option value="super_admin">Super Administrator (Owner / Full Access)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26262a]">
              <button
                type="button"
                onClick={() => setShowAddAdminModal(false)}
                className="px-4 py-2 bg-[#1a1a1e] text-[#a1a1aa] rounded-lg text-xs font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#d4af37] text-black font-bold rounded-lg text-xs hover:bg-[#c5a028] shadow-lg"
              >
                Create Staff Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
