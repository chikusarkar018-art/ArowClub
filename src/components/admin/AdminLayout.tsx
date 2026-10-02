import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  LayoutDashboard, Gamepad2, Users, Receipt, ArrowDownCircle,
  ArrowUpCircle, ArrowRightLeft, Trophy, BarChart3,
  Bell, Settings, ShieldCheck, Power, LogOut, Menu, X, Search,
  Maximize, RefreshCw, Sparkles, CheckCircle2, Radio,
  MessageSquare, Sliders, Crown, Gift, Building, Percent,
  FileSpreadsheet, SlidersHorizontal, Moon, ExternalLink
} from 'lucide-react';

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live counts from backend
  const [liveCounts, setLiveCounts] = useState({
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    openTickets: 0,
    escalatedTickets: 0,
    totalUsers: 7,
  });

  // Time ticker strictly matching screenshot format: "01 Oct 2026 04:17:17 pm"
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
      // Format: "01 Oct 2026 04:17:17 pm"
      const formatted = d.toLocaleString('en-GB', options).replace(',', '');
      setCurrentTime(formatted);
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
        setLiveCounts((prev) => ({
          ...prev,
          pendingDeposits: data.pendingDeposits ?? 0,
          pendingWithdrawals: data.pendingWithdrawals ?? 0,
          openTickets: data.openTickets ?? 0,
          escalatedTickets: data.escalatedTickets ?? 0,
          totalUsers: data.totalUsers ?? 7,
        }));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveCounts();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Admin data refreshed', 'success');
    }, 400);
  };

  // Nav menu items strictly matching screenshot order and labels
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'google_sheet_ledger',
      label: 'Google Sheet Ledger',
      icon: FileSpreadsheet,
    },
    {
      id: 'game_control',
      label: 'WinGo Result C...',
      fullLabel: 'WinGo Result Control',
      icon: Sliders,
      badge: 'RESULT SETTING',
      badgeType: 'yellow',
    },
    {
      id: 'house_bet_winning_control',
      label: 'House Bet...',
      fullLabel: 'House Bet & Win % Control',
      icon: SlidersHorizontal,
      badge: 'RESULT SETTING',
      badgeType: 'yellow',
      secondBadge: 'NEW',
      highlightBorder: true,
    },
    {
      id: 'prediction_chat',
      label: 'Big/Small Prediction Chat',
      icon: Radio,
    },
    {
      id: 'game_winning_cut',
      label: 'Game Tax & Cut Settings',
      icon: Percent,
    },
    {
      id: 'game_management',
      label: 'Game Management',
      icon: Gamepad2,
    },
    {
      id: 'users_management',
      label: 'Users Management',
      icon: Users,
    },
    {
      id: 'first_deposit_bonus_management',
      label: 'First Deposit Bon...',
      fullLabel: 'First Deposit Bonus',
      icon: Sparkles,
      badge: 'RESULT SETTING',
      badgeType: 'yellow',
      highlightBorder: true,
    },
    {
      id: 'vip_bonus_management',
      label: 'VIP & Bonus Control',
      icon: Crown,
    },
    {
      id: 'gift_codes',
      label: 'Gift Codes & Promo',
      icon: Gift,
    },
    {
      id: 'bets_management',
      label: 'Bets Management',
      icon: Receipt,
    },
    {
      id: 'deposit_requests',
      label: 'Deposit Requests',
      icon: ArrowDownCircle,
      countBadge: liveCounts.pendingDeposits > 0 ? liveCounts.pendingDeposits : undefined,
    },
    {
      id: 'withdrawal_requests',
      label: 'Withdrawal Requests',
      icon: ArrowUpCircle,
      countBadge: liveCounts.pendingWithdrawals > 0 ? liveCounts.pendingWithdrawals : undefined,
    },
    {
      id: 'payment_methods',
      label: 'Bank & UPI Settings',
      icon: Building,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: ArrowRightLeft,
    },
    {
      id: 'result_management',
      label: 'Result Management',
      icon: Trophy,
    },
    {
      id: 'reports_analytics',
      label: 'Reports & Analytics',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'Platform Settings',
      icon: Settings,
    },
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileSidebarOpen(false);
  };

  // Helper for Top Bar Title
  const getPageTitle = () => {
    const item = navItems.find((n) => n.id === currentTab);
    if (item) return item.fullLabel || item.label;
    if (currentTab === 'user_details_view') return 'User Details';
    if (currentTab === 'support_desk') return 'Live Support Desk';
    if (currentTab === 'maintenance_mode') return 'Maintenance Mode';
    return 'Dashboard';
  };

  const filteredNavItems = searchTerm.trim()
    ? navItems.filter((item) =>
        (item.fullLabel || item.label).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : navItems;

  return (
    <div className="min-h-screen bg-[#080a11] text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-[#5b50e6] selection:text-white">
      {/* =========================================================================
          1. FIXED LEFT SIDEBAR (Exact visual match to user screenshot)
      ========================================================================= */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 bg-[#0e111e] border-r border-[#1a1f33] flex-col h-screen sticky top-0 z-40 select-none">
        {/* Top: AROW CLUB Brand Logo */}
        <div className="p-4 sm:p-5 pb-3 flex items-center gap-3 border-b border-[#1a1f33]/60">
          {/* Gold Star / Bow Cross Icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600/30 to-yellow-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
            <span className="text-xl font-black">★</span>
          </div>
          <div>
            <div className="font-black text-base tracking-wider text-amber-400 uppercase drop-shadow-sm">
              AROW CLUB
            </div>
            <div className="text-[9px] font-bold tracking-widest text-amber-400/70 uppercase -mt-0.5">
              OFFICIAL PLATFORM
            </div>
          </div>
        </div>

        {/* Profile Card: SuperAdmin • Online (Exact match to screenshot) */}
        <div className="p-3 mx-3 mt-3 rounded-2xl bg-[#141829] border border-[#23273c] flex items-center gap-3 shadow-md">
          {/* SU Circle Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md ring-2 ring-indigo-500/30">
            SU
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate leading-tight">
              {admin?.username || 'SuperAdmin'}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
              <span>Super Admin</span>
              <span className="w-1 h-1 rounded-full bg-slate-500"></span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 custom-scrollbar">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentTab === item.id ||
              (item.id === 'users_management' && currentTab === 'user_details_view');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left group ${
                  isActive
                    ? 'bg-[#5b50e6] text-white shadow-lg shadow-indigo-600/30 font-bold'
                    : item.highlightBorder
                    ? 'bg-amber-400/5 border border-amber-400/80 text-amber-200 hover:bg-amber-400/10'
                    : 'text-slate-300 hover:text-white hover:bg-[#15192c]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : item.highlightBorder
                        ? 'text-amber-400'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {/* Right Badges (Exact to screenshot: Yellow "RESULT SETTING", Green "NEW") */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-[#f5c543] text-black tracking-tight leading-none uppercase shadow-sm">
                      {item.badge}
                    </span>
                  )}
                  {item.secondBadge && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-[#00c980] text-black tracking-tight leading-none uppercase shadow-sm">
                      {item.secondBadge}
                    </span>
                  )}
                  {item.countBadge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500 text-white animate-pulse">
                      {item.countBadge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom: Red Logout Button (Exact to screenshot) */}
        <div className="p-3 border-t border-[#1a1f33]/60 bg-[#0e111e]">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. MOBILE SLIDING SIDEBAR DRAWER (Small screens)
      ========================================================================= */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Container */}
          <div className="relative w-72 max-w-[85vw] bg-[#0e111e] border-r border-[#1a1f33] text-white flex flex-col z-50 shadow-2xl h-full">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-[#1a1f33]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black">
                  ★
                </div>
                <div className="font-black text-sm tracking-wider text-amber-400 uppercase">
                  AROW CLUB
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile badge in mobile */}
            <div className="p-3 mx-3 mt-3 rounded-xl bg-[#141829] border border-[#23273c] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                SU
              </div>
              <div className="text-xs font-bold text-white">SuperAdmin</div>
            </div>

            {/* Nav list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                      isActive
                        ? 'bg-[#5b50e6] text-white font-bold'
                        : item.highlightBorder
                        ? 'border border-amber-400/80 text-amber-200'
                        : 'text-slate-300 hover:bg-[#15192c]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-400 text-black">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <div className="p-3 border-t border-[#1a1f33]">
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  setShowLogoutModal(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. RIGHT MAIN CONTENT AREA + TOP HEADER BAR (Exact to screenshot)
      ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080a11]">
        {/* Top Header Bar */}
        <header className="bg-[#0e111e] border-b border-[#1a1f33] px-3 sm:px-6 h-16 flex items-center justify-between gap-3 sticky top-0 z-30 select-none">
          {/* Left: Mobile ☰ + Page Title (Dashboard) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[#141829] border border-[#23273c] text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          {/* Center: Search Bar ("Search here...") */}
          <div className="hidden md:flex items-center relative max-w-sm w-full mx-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search here..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#141829] border border-[#23273c] text-xs text-white placeholder-slate-400 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Action Icons & Live Clock + Game App Button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Dark Mode Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141829] border border-[#23273c] text-slate-300 text-xs font-semibold cursor-default">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dark Mode</span>
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-xl bg-[#141829] border border-[#23273c] text-slate-400 hover:text-white hover:border-slate-500 transition cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              onClick={() => handleNavClick('notification')}
              title="Notifications"
              className="p-2 rounded-xl bg-[#141829] border border-[#23273c] text-slate-400 hover:text-white hover:border-slate-500 transition cursor-pointer relative"
            >
              <Bell className="w-4 h-4" />
              {liveCounts.openTickets > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 animate-pulse" />
              )}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh Data"
              className="p-2 rounded-xl bg-[#141829] border border-[#23273c] text-slate-400 hover:text-white hover:border-slate-500 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Live Clock: 01 Oct 2026 04:17:17 pm • LIVE */}
            <div className="hidden xl:flex items-center gap-2 pl-1">
              <span className="font-mono text-xs text-slate-300 font-medium">
                {currentTime || '01 Oct 2026 04:17:17 pm'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Purple "Game App" Switch Button (Exact to screenshot) */}
            <button
              type="button"
              onClick={() => setActiveMode('user')}
              title="Switch to Game App"
              className="px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4f46e5] text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 active:scale-95 cursor-pointer ml-1"
            >
              <span>Game App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Content Body Container */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl text-white">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <LogOut className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">Confirm Logout?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to log out from the Arow Club Admin Panel?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logoutAdmin();
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-900/40"
              >
                Yes, Logout
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1c2035] hover:bg-[#252b47] text-slate-300 text-xs font-medium transition"
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
