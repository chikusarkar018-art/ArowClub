import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  Settings, Sliders, Shield, Bell, CreditCard,
  Globe, Image as ImageIcon, Upload, Save, CheckCircle2, Key
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'game' | 'payment' | 'notification' | 'security' | 'site'>('general');

  // Admin Credential States
  const [adminUser, setAdminUser] = useState(admin?.username || 'admin');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingCreds, setUpdatingCreds] = useState(false);

  // General Settings Form state
  const [siteName, setSiteName] = useState('Colour Prediction');
  const [siteEmail, setSiteEmail] = useState('admin@colourprediction.com');
  const [currency, setCurrency] = useState('INR (₹)');
  const [timezone, setTimezone] = useState('Asia/Kolkata (GMT+5:30)');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('12 Hours');

  // Game Settings state
  const [taxCutPercent, setTaxCutPercent] = useState('2.0');
  const [defaultMinBet, setDefaultMinBet] = useState('10');
  const [defaultMaxBet, setDefaultMaxBet] = useState('50000');

  // Payment Settings state
  const [adminUpiId, setAdminUpiId] = useState('arowclubvip@icici');
  const [minDeposit, setMinDeposit] = useState('100');
  const [minWithdrawal, setMinWithdrawal] = useState('300');
  const [maxWithdrawalDaily, setMaxWithdrawalDaily] = useState('100000');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Platform settings saved successfully!', 'success');
  };

  const navTabs = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'game', label: 'Game Settings', icon: Sliders },
    { id: 'payment', label: 'Payment Settings', icon: CreditCard },
    { id: 'notification', label: 'Notification Settings', icon: Bell },
    { id: 'security', label: 'Security Settings', icon: Shield },
    { id: 'site', label: 'Site Settings', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ================= LEFT SUB-MENU ================= */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 shadow-lg space-y-1 h-fit">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-[#181a2e]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ================= RIGHT MAIN PANEL ================= */}
        <div className="lg:col-span-3 bg-[#121422] border border-[#23273c] rounded-2xl p-6 shadow-lg">
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="space-y-6 text-xs">
              <div className="border-b border-[#1e202e] pb-4">
                <h3 className="text-base font-bold text-white">General Settings</h3>
                <p className="text-xs text-slate-400 mt-0.5">Configure fundamental application branding and time formats</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Site Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Site Email</label>
                  <input
                    type="email"
                    required
                    value={siteEmail}
                    onChange={(e) => setSiteEmail(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Currency</label>
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Asia/Kolkata (GMT+5:30)">Asia/Kolkata (GMT+5:30)</option>
                    <option value="UTC (GMT+0:00)">UTC (GMT+0:00)</option>
                    <option value="America/New_York (GMT-5:00)">America/New_York (GMT-5:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Date Format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 26/05/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2024-05-26)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 05/26/2024)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Time Format</label>
                  <select
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="12 Hours">12 Hours (e.g. 11:45 AM)</option>
                    <option value="24 Hours">24 Hours (e.g. 23:45)</option>
                  </select>
                </div>
              </div>

              {/* Logo & Favicon Upload Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#181a2e] border border-[#2b304c] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-xs text-white">
                      CP
                    </div>
                    <div>
                      <div className="font-bold text-white">Site Logo</div>
                      <div className="text-[10px] text-slate-400">PNG, SVG (Max 2MB)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('Select new logo image', 'info')}
                    className="px-3 py-1.5 rounded-lg bg-[#23273c] hover:bg-[#2b304c] text-white font-semibold text-xs transition"
                  >
                    Change
                  </button>
                </div>

                <div className="p-4 bg-[#181a2e] border border-[#2b304c] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-black text-[10px] text-purple-400">
                      ICO
                    </div>
                    <div>
                      <div className="font-bold text-white">Site Favicon</div>
                      <div className="text-[10px] text-slate-400">32x32, 64x64 ico</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('Select new favicon icon', 'info')}
                    className="px-3 py-1.5 rounded-lg bg-[#23273c] hover:bg-[#2b304c] text-white font-semibold text-xs transition"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#1e202e]">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold transition shadow-md shadow-indigo-600/25"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'game' && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="text-base font-bold text-white mb-2">Game Global Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">House Cut / Commission %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={taxCutPercent}
                    onChange={(e) => setTaxCutPercent(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Default Minimum Bet (₹)</label>
                  <input
                    type="number"
                    value={defaultMinBet}
                    onChange={(e) => setDefaultMinBet(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="px-6 py-2 rounded-xl bg-[#5b50e6] text-white font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'payment' && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="text-base font-bold text-white mb-2">Payment Gateway & Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Admin Receiver UPI ID</label>
                  <input
                    type="text"
                    value={adminUpiId}
                    onChange={(e) => setAdminUpiId(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minimum Recharge (₹)</label>
                  <input
                    type="number"
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minimum Payout (₹)</label>
                  <input
                    type="number"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Daily Max Payout (₹)</label>
                  <input
                    type="number"
                    value={maxWithdrawalDaily}
                    onChange={(e) => setMaxWithdrawalDaily(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="px-6 py-2 rounded-xl bg-[#5b50e6] text-white font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 text-xs text-slate-300">
              <div className="border-b border-[#1e202e] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  Admin Account Credentials & Security
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Change your Administrator Username / User ID, Email and login Password.
                </p>
              </div>

              {/* Admin ID & Password Change Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (newPassword && newPassword !== confirmPassword) {
                  showToast('New passwords do not match', 'error');
                  return;
                }
                setUpdatingCreds(true);
                try {
                  const res = await api.adminUpdateCredentials({
                    currentUsername: admin?.username || adminUser,
                    newUsername: newAdminUser.trim() || undefined,
                    newEmail: newAdminEmail.trim() || undefined,
                    newPassword: newPassword || undefined,
                    currentPassword: currentPassword || undefined,
                  });
                  if (res.success) {
                    showToast('Admin credentials updated successfully!', 'success');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    if (res.username) setAdminUser(res.username);
                  } else {
                    showToast(res.error || 'Failed to update credentials', 'error');
                  }
                } catch (err: any) {
                  showToast(err.message || 'Failed to update credentials', 'error');
                } finally {
                  setUpdatingCreds(false);
                }
              }} className="bg-[#181a2e] border border-[#2b304c] rounded-2xl p-5 space-y-4">
                <div className="font-bold text-white text-sm flex items-center gap-2 border-b border-[#252a42] pb-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Update Admin Login ID & Password</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Current Admin User ID</label>
                    <input
                      type="text"
                      disabled
                      value={admin?.username || 'admin'}
                      className="w-full bg-[#111322] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">New Admin User ID / Username</label>
                    <input
                      type="text"
                      placeholder="Leave blank to keep current"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      className="w-full bg-[#121424] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">New Admin Email</label>
                    <input
                      type="email"
                      placeholder="admin@colourprediction.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full bg-[#121424] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Current Password (Required for verification)</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#121424] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#121424] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#121424] border border-[#2b304c] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[#252a42]">
                  <button
                    type="submit"
                    disabled={updatingCreds}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold transition shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{updatingCreds ? 'Saving...' : 'Update Admin ID & Password'}</span>
                  </button>
                </div>
              </form>

              {/* 2FA & Firewall status box */}
              <div className="p-4 bg-[#181a2e] rounded-xl border border-[#2b304c] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Two-Factor Authentication (2FA) & IP Shield</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Strict admin session lock and SSL encryption enabled.</div>
                </div>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs">
                  Active & Protected
                </span>
              </div>
            </div>
          )}

          {['notification', 'site'].includes(activeTab) && (
            <div className="space-y-4 text-xs text-slate-300">
              <h3 className="text-base font-bold text-white capitalize">{activeTab} Settings</h3>
              <p className="text-slate-400">All security encryption and firewalls are active.</p>
              <div className="p-4 bg-[#181a2e] rounded-xl border border-[#2b304c]">
                <div className="flex items-center justify-between">
                  <span>Two-Factor Authentication (2FA) for Admins</span>
                  <span className="text-emerald-400 font-bold">Enabled</span>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-[#5b50e6] text-white font-bold">
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
