import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Power, Save, Upload, Clock, CheckCircle2,
  AlertTriangle, Image as ImageIcon, History, ShieldAlert,
  Calendar, Eye, Sparkles, RefreshCw, Smartphone, Monitor, Check, Plus, Headphones
} from 'lucide-react';
import { MaintenanceConfig } from '../../types.js';
import { MaintenanceIllustration } from '../common/MaintenanceIllustration.js';

export const MaintenanceModeView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [title, setTitle] = useState('WEBSITE MAINTENANCE');
  const [message, setMessage] = useState('WE ARE CURRENTLY WORKING ON SOME UPDATES TO SERVE YOU BETTER');
  const [imageUrl, setImageUrl] = useState('/maintenance_arowclub_bg.jpg');
  const [startTime, setStartTime] = useState('06:16 PM');
  const [endTime, setEndTime] = useState('06:18 PM');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'fullscreen'>('mobile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetImages = [
    { label: '👑 Official ArowClub Operations Room (High-End)', url: '/maintenance_arowclub_bg.jpg' },
    { label: '🚀 Official Vector Maintenance Art', url: '/maintenance-illustration.svg' },
    { label: '⚙️ Live Server Tech Maintenance (GIF)', url: 'https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif' },
    { label: '💻 System Upgrade & Security (GIF)', url: 'https://media.giphy.com/media/qgQUggAC3Pfv687qPC/giphy.gif' },
    { label: '🌐 Cyber Matrix & Network Rack (GIF)', url: 'https://media.giphy.com/media/L1R1tvI9svkIWwpVYr/giphy.gif' },
  ];

  const fetchConfig = async () => {
    try {
      const data = await api.getAdminMaintenanceConfig();
      if (data?.config) {
        setConfig(data.config);
        setIsEnabled(Boolean(data.config.isEnabled ?? data.config.enabled));
        setTitle(data.config.title || 'Platform Maintenance in Progress');
        setMessage(data.config.message || 'We are currently performing scheduled server upgrades and optimizations. User gaming services will resume shortly. Thank you for your patience!');
        setImageUrl(data.config.imageUrl || data.config.bannerUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80');
        setStartTime(data.config.startTime || '06:16 PM');
        setEndTime(data.config.endTime || '06:18 PM');
      }
    } catch {
      // fallback defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
        showToast('Custom image loaded successfully! Click Save to apply.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSetCurrentStartTime = () => {
    const now = new Date();
    const formatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    setStartTime(formatted);
    showToast(`Start time set to ${formatted}`, 'info');
  };

  const handleAddMinutesToEndTime = (minutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const formatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    setEndTime(formatted);
    showToast(`Expected End time set to ${formatted} (+${minutes}m)`, 'info');
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await api.updateAdminMaintenanceConfig({
        enabled: isEnabled,
        isEnabled,
        title,
        message,
        imageUrl,
        bannerUrl: imageUrl,
        startTime,
        endTime,
        adminUsername: admin?.username || 'SuperAdmin',
      });
      showToast(`Maintenance mode settings saved! Mode is ${isEnabled ? 'ENABLED (ON - Users see maintenance screen)' : 'DISABLED (OFF - Platform open)'}`, 'success');
      fetchConfig();
    } catch (err: any) {
      showToast(err.message || 'Failed to save maintenance settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    try {
      await api.updateAdminMaintenanceConfig({
        enabled: nextState,
        isEnabled: nextState,
        title,
        message,
        imageUrl,
        bannerUrl: imageUrl,
        startTime,
        endTime,
        adminUsername: admin?.username || 'SuperAdmin',
      });
      showToast(`Maintenance mode is now ${nextState ? 'ENABLED (ON - Users will see maintenance screen)' : 'DISABLED (OFF - Platform open for users)'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update maintenance toggle', 'error');
    }
  };

  const mockHistory = [
    { date: 'Today', status: isEnabled ? 'Active (Live)' : 'Completed', actionBy: admin?.username || 'Super Admin', duration: `${startTime} - ${endTime}` },
    { date: '20 May, 04:30 AM', status: 'Resolved', actionBy: 'Super Admin', duration: '1 hour 30 mins' },
    { date: '15 May, 02:00 AM', status: 'Resolved', actionBy: 'Super Admin', duration: '45 mins' },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`p-3.5 rounded-2xl border ${isEnabled ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            <Power className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Maintenance Mode & User Screen Controller
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isEnabled
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {isEnabled ? '● LIVE / ACTIVATED' : '● DEACTIVATED / NORMAL'}
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              Control full-page maintenance wallpaper, custom banner image, start time, end time, and live user view.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggle}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              isEnabled
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            {isEnabled ? 'Turn OFF Maintenance' : 'Turn ON Maintenance'}
          </button>

          <button
            onClick={fetchConfig}
            className="p-2 rounded-xl bg-[#181820] border border-[#2e2e38] text-zinc-300 hover:text-white transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: CONFIGURATION FORM ================= */}
        <div className="lg:col-span-7 bg-[#121215] border border-[#26262e] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-[#24242c] pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Maintenance Announcement, Image & Time Settings
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Admin jo image aur time yahan set karega, wahi image poore page par aur card me live dikhegi.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5 text-xs">
            {/* Quick Status Toggle Box */}
            <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
              isEnabled
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-[#181820] border-[#2e2e38]'
            }`}>
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <span>Activate Maintenance Mode</span>
                  {isEnabled && <span className="text-red-400 font-bold text-xs">(Users Locked Out)</span>}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Jab ON hoga, users ko game ya wallet access nahi hoga aur full page background me ye image & time dikhega.
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Time Slot Controls: Start Time & End Time */}
            <div className="bg-[#16161d] p-4 rounded-2xl border border-[#26262e] space-y-4">
              <div className="flex items-center justify-between border-b border-[#24242c] pb-2">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Maintenance Timings (Admin Set Time)
                </span>
                <span className="text-[10px] text-zinc-400">Users will see exact timestamps</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Time Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Start Time (शुरू होने का समय):
                    </label>
                    <button
                      type="button"
                      onClick={handleSetCurrentStartTime}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" /> Set Now
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 06:16 PM"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#1c1c24] border border-[#2e2e38] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {['06:16 PM', '11:00 AM', '02:30 PM', '12:00 AM'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setStartTime(t)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition ${
                          startTime === t
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#121216] text-zinc-400 border-[#26262e] hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* End Time Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Expected Resumption (खत्म होने का समय):
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 06:18 PM"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#1c1c24] border border-[#2e2e38] rounded-xl px-3.5 py-2.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddMinutesToEndTime(2)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#121216] text-zinc-300 border border-[#26262e] hover:text-amber-300 font-mono"
                    >
                      +2m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMinutesToEndTime(15)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#121216] text-zinc-300 border border-[#26262e] hover:text-amber-300 font-mono"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMinutesToEndTime(30)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#121216] text-zinc-300 border border-[#26262e] hover:text-amber-300 font-mono"
                    >
                      +30m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMinutesToEndTime(60)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#121216] text-zinc-300 border border-[#26262e] hover:text-amber-300 font-mono"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMinutesToEndTime(120)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#121216] text-zinc-300 border border-[#26262e] hover:text-amber-300 font-mono"
                    >
                      +2h
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Image Upload & URL Selection */}
            <div className="bg-[#16161d] p-4 rounded-2xl border border-[#26262e] space-y-3">
              <div className="flex items-center justify-between border-b border-[#24242c] pb-2">
                <label className="text-zinc-200 font-bold flex items-center gap-1.5 text-xs">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  Maintenance Full-Page Background & Banner Image
                </label>
                <span className="text-[10px] text-amber-400 font-semibold">Admin Custom Image</span>
              </div>

              {/* Upload file button + URL Input */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter Image URL (https://...)"
                    className="flex-1 bg-[#1c1c24] border border-[#2e2e38] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                  
                  {/* File Upload Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                </div>

                {/* Preset Image Picks */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-zinc-400 font-medium">Or choose from high-res gaming & tech wallpapers:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {presetImages.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(p.url)}
                        className={`p-1.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          imageUrl === p.url
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                            : 'border-[#26262e] bg-[#181820] hover:border-zinc-500'
                        }`}
                      >
                        <div className="h-14 w-full rounded-lg overflow-hidden bg-black/40 relative">
                          <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                          {imageUrl === p.url && (
                            <div className="absolute top-1 right-1 bg-amber-500 text-black p-0.5 rounded-full">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-300 truncate">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-zinc-300 font-bold mb-1.5">Maintenance Screen Heading / Title:</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#181820] border border-[#2e2e38] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 font-bold"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-zinc-300 font-bold mb-1.5">Detailed Notice for Players (Hindi / English):</label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#181820] border border-[#2e2e38] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-[#24242c]">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Settings...' : 'Save Maintenance & Update User Screen'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ================= RIGHT COLUMN: LIVE USER SCREEN PREVIEW & AUDIT ================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Screen Live Preview Card */}
          <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#24242c] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                Live User Screen Preview (यही दिखेगा यूजर को)
              </h3>
              <div className="flex items-center gap-1 bg-[#181820] p-0.5 rounded-lg border border-[#2e2e38]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    previewMode === 'mobile' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('fullscreen')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    previewMode === 'fullscreen' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Full Page
                </button>
              </div>
            </div>

            {/* Simulated Display with Clean Full-Page Image */}
            <div className={`relative rounded-3xl overflow-hidden border-2 border-[#2b2b36] shadow-2xl bg-black ${
              previewMode === 'mobile' ? 'max-w-[340px] mx-auto min-h-[560px]' : 'w-full min-h-[500px]'
            } flex flex-col justify-between`}>
              {/* Full Background Poster Image */}
              <div className="absolute inset-0 z-0">
                <img
                  src={imageUrl || '/maintenance_arowclub_bg.jpg'}
                  alt="Maintenance Poster"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
              </div>

              {/* Top Floating Refresh Simulation */}
              <div className="relative z-10 p-3 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[#f5c443] flex items-center justify-center shadow-lg">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bottom Clean Floating Controls: ONLY Expected Open Time & Customer Support */}
              <div className="relative z-10 p-3.5 space-y-2.5">
                {/* Expected Opening Time */}
                <div className="w-full bg-black/85 backdrop-blur-md border border-[#f5c443]/40 rounded-xl p-2.5 shadow-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-[#f5c443]" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-[10px] font-bold text-zinc-300 uppercase">
                        Expected Opening Time
                      </div>
                      <div className="text-[9px] text-zinc-500 font-medium truncate">
                        Start: <span className="font-mono text-zinc-400">{startTime}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#181a24] border border-[#f5c443]/50 px-2.5 py-1 rounded-lg shrink-0">
                    <span className="font-mono font-black text-xs text-[#f5c443]">
                      {endTime}
                    </span>
                  </div>
                </div>

                {/* 24/7 VIP Customer Support Button */}
                <div className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#e5a01e] via-[#f5c443] to-[#ffd769] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg">
                  <Headphones className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>24/7 VIP Customer Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit History */}
          <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <History className="w-4 h-4 text-amber-400" />
              Maintenance History Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#24242c] text-[10px] text-zinc-400 uppercase">
                    <th className="pb-2">Session</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202028]">
                  {mockHistory.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 text-zinc-300">
                        <div className="font-medium text-[11px]">{item.date}</div>
                        <div className="text-[10px] text-zinc-400">{item.duration}</div>
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status.includes('Active')
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-zinc-400 font-mono text-[11px]">{item.actionBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
