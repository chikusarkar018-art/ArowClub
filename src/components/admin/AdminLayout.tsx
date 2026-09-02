import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { api } from '../../services/api.js';
import {
  LayoutDashboard, Gamepad2, Users, Receipt, ArrowDownCircle,
  ArrowUpCircle, ArrowRightLeft, Trophy, BarChart3, Share2,
  Bell, Image as ImageIcon, Headphones, Settings, ShieldCheck,
  Power, LogOut, Menu, X, Search, Maximize, RefreshCw, ChevronDown,
  Sparkles, CheckCircle2, PhoneCall, Send, Radio, Mail, MessageSquare,
  Sliders, Crown, CreditCard, Gift, Building, Percent, Moon, Sun
} from 'lucide-react';
import { AdminTabType } from '../../types.js';
import { UserLogo } from '../user/UserLogo.js';

interface AdminLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  setCurrentTab,
  children,
}) => {
  const { admin, logoutAdmin, setActiveMode, showToast } = useAuth();
  const { themeMode, setThemeMode, toggleTheme, isLight } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  // Live counts
  const [liveCounts, setLiveCounts] = useState({
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    openTickets: 0,
    escalatedTickets: 0,
    totalEscalatedTickets: 0,
    activeBannersCount: 0,
    totalUsers: 0,
    isMaintenanceMode: false,
  });

  // Time ticker
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setCurrentTime(d.toLocaleString('en-GB', options).replace(',', ''));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real-time live counts
  const fetchLiveCounts = async () => {
    try {
      const data = await api.getAdminLiveCounts().catch(() => null);
      if (data) {
        setLiveCounts(prev => ({
          ...prev,
          pendingDeposits: data.pendingDeposits ?? 0,
          pendingWithdrawals: data.pendingWithdrawals ?? 0,
          openTickets: data.openTickets ?? 0,
          escalatedTickets: data.escalatedTickets ?? data.totalEscalatedTickets ?? 0,
          totalEscalatedTickets: data.totalEscalatedTickets ?? 0,
          totalUsers: data.totalUsers ?? 0,
          isMaintenanceMode: data.isMaintenanceMode ?? false,
        }));
        setMaintenanceEnabled(Boolean(data.isMaintenanceMode));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleToggleMaintenance = async (newState: boolean) => {
    try {
      setTogglingMaintenance(true);
      setMaintenanceEnabled(newState);
      await api.toggleAdminMaintenance(newState, 'Toggled from admin sidebar', admin?.username || 'SuperAdmin');
      showToast(`Maintenance mode turned ${newState ? 'ON' : 'OFF'}`, 'success');
      fetchLiveCounts();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle maintenance mode', 'error');
      setMaintenanceEnabled(!newState);
    } finally {
      setTogglingMaintenance(false);
    }
  };

  // Sidebar navigation items
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'game_control',
      label: 'Game Control',
      icon: Sliders,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-500 text-black font-black',
    },
    {
      id: 'prediction_chat',
      label: 'Big/Small Prediction Chat',
      icon: Radio,
      badge: 'NEW',
      badgeColor: 'bg-[#f5c443] text-black font-black animate-pulse',
    },
    {
      id: 'game_winning_cut',
      label: 'Game Tax & Cut Settings',
      icon: Percent,
      badge: 'TAX',
      badgeColor: 'bg-amber-500 text-black font-black',
    },
    {
      id: 'game_management',
      label: 'Game Management',
      icon: Gamepad2,
      badge: null,
    },
    {
      id: 'users_management',
      label: 'Users Management',
      icon: Users,
      badge: null,
    },
    {
      id: 'vip_bonus_management',
      label: 'VIP & Bonus Control',
      icon: Crown,
      badge: null,
    },
    {
      id: 'gift_codes',
      label: 'Gift Codes & Promo',
      icon: Gift,
      badge: null,
    },
    {
      id: 'bets_management',
      label: 'Bets Management',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'deposit_requests',
      label: 'Deposit Requests',
      icon: ArrowDownCircle,
      badge: liveCounts.pendingDeposits > 0 ? liveCounts.pendingDeposits : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'withdrawal_requests',
      label: 'Withdrawal Requests',
      icon: ArrowUpCircle,
      badge: liveCounts.pendingWithdrawals > 0 ? liveCounts.pendingWithdrawals : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'payment_methods',
      label: 'Bank & UPI Settings',
      icon: Building,
      badge: null,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: ArrowRightLeft,
      badge: null,
    },
    {
      id: 'result_management',
      label: 'Result Management',
      icon: Trophy,
      badge: null,
    },
    {
      id: 'reports_analytics',
      label: 'Report & Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'referral_management',
      label: 'Referral Management',
      icon: Share2,
      badge: null,
    },
    {
      id: 'notification',
      label: 'Notification',
      icon: Bell,
      badge: null,
    },
    {
      id: 'banner_management',
      label: 'Banner Management',
      icon: ImageIcon,
      badge: null,
    },
    {
      id: 'support_links',
      label: 'Support Links',
      icon: Headphones,
      badge: null,
    },
    {
      id: 'support_desk',
      label: 'Live Support Chat',
      icon: MessageSquare,
      badge: liveCounts.escalatedTickets > 0 
        ? `${liveCounts.escalatedTickets} LIVE` 
        : (liveCounts.openTickets > 0 ? liveCounts.openTickets : null),
      badgeColor: liveCounts.escalatedTickets > 0 
        ? 'bg-rose-600 text-white font-black animate-pulse shadow-md' 
        : 'bg-amber-500 text-black font-bold',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
    {
      id: 'admin_management',
      label: 'Admin Management',
      icon: ShieldCheck,
      badge: null,
    },
  ];

  // Helper title for current tab
  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Dashboard';
      case 'game_control': return 'Game Control Center';
      case 'game_winning_cut': return 'Game Tax & Cut Settings';
      case 'game_management': return 'Game Management';
      case 'users_management': return 'Users Management';
      case 'vip_bonus_management': return 'VIP & Bonus Management';
      case 'user_details_view': return 'User Profile Details';
      case 'bets_management': return 'Bets Management';
      case 'deposit_requests': return 'Deposit Requests';
      case 'withdrawal_requests': return 'Withdrawal Requests';
      case 'payment_methods': return 'Admin Bank & Payment Gateway Settings';
      case 'transactions': return 'Transactions Ledger';
      case 'result_management': return 'Result Management';
      case 'reports_analytics': return 'Report & Analytics';
      case 'referral_management': return 'Referral Management';
      case 'notification': return 'Notification Center';
      case 'banner_management': return 'Banner Management';
      case 'support_links': return 'Support Links Management';
      case 'support_desk': return 'Live Support Desk Tickets';
      case 'settings': return 'Platform Settings';
      case 'admin_management': return 'Admin Staff Management';
      case 'maintenance_mode': return 'Maintenance Mode';
      case 'logout_screen': return 'Logout';
      default: return 'Dashboard';
    }
  };

  return (
    <div className={`min-h-screen admin-layout-root ${isLight ? 'bg-[#f1f5f9] text-[#0f172a]' : 'bg-[#0b0c10] text-[#e2e8f0]'} flex flex-col font-sans selection:bg-[#6366f1] selection:text-white`}>
      {/* Main Container */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* ================= DESKTOP & MOBILE SIDEBAR ================= */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0d0e15] border-r border-[#1e202e] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo Area */}
          <div className="h-16 px-4 border-b border-[#1e202e] flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
              <UserLogo size="sm" showSubtitle={true} />
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Admin Profile Pill */}
          <div className="p-4 border-b border-[#1e202e]/80">
            <div className="flex items-center gap-3 bg-[#131522] border border-[#23273c] p-2.5 rounded-xl">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-500/30">
                  {admin?.username ? admin.username.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#131522] rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate">{admin?.username || 'Admin'}</h4>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-400 capitalize">
                    {admin?.role ? admin.role.replace('_', ' ') : 'Super Admin'}
                  </span>
                  <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Menu List */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id || (item.id === 'users_management' && currentTab === 'user_details_view');
              return (
                <button
                  key={item.id}
                  id={`admin-nav-${item.id}`}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-[#5b50e6] text-white shadow-lg shadow-[#5b50e6]/25 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#151726]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-700 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Maintenance Mode Item with direct switch */}
            <div
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                currentTab === 'maintenance_mode'
                  ? 'bg-[#5b50e6] text-white shadow-lg shadow-[#5b50e6]/25 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#151726]'
              }`}
            >
              <div
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => {
                  setCurrentTab('maintenance_mode');
                  setMobileMenuOpen(false);
                }}
              >
                <Power className={`w-4 h-4 flex-shrink-0 ${currentTab === 'maintenance_mode' ? 'text-white' : 'text-slate-400'}`} />
                <span>Maintenance Mode</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={maintenanceEnabled}
                disabled={togglingMaintenance}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMaintenance(!maintenanceEnabled);
                }}
                className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  maintenanceEnabled ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    maintenanceEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Bottom Logout Button */}
          <div className="p-3 border-t border-[#1e202e]">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600/80 to-rose-700/80 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold transition shadow-md shadow-red-950/40"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          />
        )}

        {/* ================= MAIN CONTENT AREA ================= */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0 overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="h-16 bg-[#0d0e15]/90 backdrop-blur-md border-b border-[#1e202e] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
            <div className="flex items-center gap-3">
              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg bg-[#151726] border border-[#262a42] text-slate-300 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>

              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                {getTabTitle()}
              </h2>
            </div>

            {/* Right Top Header Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Global search */}
              <div className="relative hidden md:block w-48 lg:w-64">
                <input
                  type="text"
                  placeholder="Search here..."
                  className="w-full bg-[#131522] border border-[#23273c] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>

              {/* Live Escalated Chat Alert Pill */}
              {liveCounts.escalatedTickets > 0 && (
                <button
                  onClick={() => setCurrentTab('support_desk')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-600/20 border border-rose-500/80 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-black animate-pulse shadow-lg transition"
                  title="Clients requesting live admin response"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                  <span>{liveCounts.escalatedTickets} Live Request{liveCounts.escalatedTickets > 1 ? 's' : ''}</span>
                </button>
              )}

              {/* Theme Mode Switcher Pill */}
              <div className="relative">
                <div className="flex items-center rounded-xl bg-[#131522] border border-[#23273c] hover:border-indigo-500 overflow-hidden transition">
                  <button
                    onClick={() => {
                      const next = themeMode === 'light' ? 'dark' : 'light';
                      setThemeMode(next);
                      showToast(`Switched to ${next === 'light' ? 'Light' : 'Dark'} Mode`, 'info');
                    }}
                    title={`Click to switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                  >
                    {themeMode === 'light' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden md:inline text-[11px] font-bold text-amber-300">Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden md:inline text-[11px] font-bold text-purple-300">Dark</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                    title="Theme options"
                    className="px-1.5 py-1.5 border-l border-[#23273c] text-slate-400 hover:text-white transition"
                  >
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </button>
                </div>

                {showThemeDropdown && (
                  <div className="absolute right-0 mt-2 w-44 bg-[#121422] border border-[#23273c] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => {
                        setThemeMode('light');
                        setShowThemeDropdown(false);
                        showToast('Switched to Light Mode', 'info');
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition ${
                        themeMode === 'light' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-[#1a1e32]'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Light Mode</span>
                    </button>
                    <button
                      onClick={() => {
                        setThemeMode('dark');
                        setShowThemeDropdown(false);
                        showToast('Switched to Dark Mode', 'info');
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition ${
                        themeMode === 'dark' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'text-slate-300 hover:bg-[#1a1e32]'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Dark Mode</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Fullscreen icon */}
              <button
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                className="w-8 h-8 rounded-xl bg-[#131522] border border-[#23273c] flex items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500/50 transition"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>

              {/* Notification bell with count */}
              <button
                onClick={() => setCurrentTab('notification')}
                title="Notifications"
                className="relative w-8 h-8 rounded-xl bg-[#131522] border border-[#23273c] flex items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500/50 transition"
              >
                <Bell className="w-3.5 h-3.5" />
                {liveCounts.openTickets > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0d0e15]">
                    {liveCounts.openTickets}
                  </span>
                )}
              </button>

              {/* Refresh icon */}
              <button
                onClick={() => {
                  fetchLiveCounts();
                  showToast('Dashboard data refreshed', 'success');
                }}
                title="Refresh Data"
                className="w-8 h-8 rounded-xl bg-[#131522] border border-[#23273c] flex items-center justify-center text-slate-400 hover:text-white hover:border-indigo-500/50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Live Time & Date Display */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#1e202e]">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-200 font-mono">
                    {currentTime || '26 May 2024 11:45:30 AM'}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 tracking-wide uppercase">Live</span>
                </div>
              </div>

              {/* Switch to User Gaming Panel */}
              <button
                onClick={() => setActiveMode('user')}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:brightness-110 shadow-md transition"
              >
                <span>Game App</span>
              </button>
            </div>
          </header>

          {/* Page Body View */}
          <main className="flex-1 p-4 sm:p-6 bg-[#0b0c10]">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>

          {/* Footer Bar matching screenshot */}
          <footer className="py-4 px-6 border-t border-[#1e202e] bg-[#0d0e15] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              © 2024 Colour Prediction. All rights reserved.
            </div>
            <div className="font-mono text-[11px]">
              Version 1.0.0
            </div>
          </footer>
        </div>
      </div>

      {/* ================= SCREEN 16: LOGOUT MODAL ================= */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Green Checkmark Circle */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Logged Out Successfully!</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              You have been logged out of the admin panel. All your sessions and activities have been securely saved. Thank you!
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logoutAdmin();
                }}
                className="px-6 py-2.5 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25"
              >
                Go to Login Page
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1a1d2e] border border-[#2b304c] text-slate-300 hover:text-white text-xs font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
