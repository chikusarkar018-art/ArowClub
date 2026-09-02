import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Users, ArrowDownCircle, ArrowUpCircle, Receipt, TrendingUp,
  ChevronRight, ChevronLeft, Bell, Sparkles, Gamepad2, ShieldCheck,
  CheckCircle2, XCircle, Clock, ExternalLink, Sliders, DollarSign,
  PlusCircle, Send, Headphones, Power, LogOut, FileText, ArrowRight,
  Calendar, RefreshCw, BarChart3, TrendingDown, Layers
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { admin, showToast, logoutAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'this_week' | 'today' | 'this_month'>('this_week');
  const [bannerIndex, setBannerIndex] = useState(0);

  // Top Date / Period Filter State
  const [periodType, setPeriodType] = useState<'today' | 'yesterday' | 'custom_date' | 'this_month' | 'last_month' | 'custom_month'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().split('T')[0].substring(0, 7));
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);

  // Quick Action Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [balanceUid, setBalanceUid] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('500');

  const fetchDashboardData = async () => {
    try {
      const [statsData, gamesData, depData, withData, resData, banData] = await Promise.allSettled([
        api.getAdminStats({
          periodType,
          date: selectedDate,
          month: selectedMonth,
        }),
        api.getAdminGamesCatalog(),
        api.getAdminDeposits('pending'),
        api.getAdminWithdrawals('pending'),
        api.getAdminResults('wingo_30s'),
        api.getAdminBanners(),
      ]);

      if (statsData.status === 'fulfilled' && statsData.value) {
        setStats(statsData.value);
      }
      if (gamesData.status === 'fulfilled' && gamesData.value?.games) {
        setGames(gamesData.value.games);
      }
      if (depData.status === 'fulfilled' && depData.value?.deposits) {
        setDeposits(depData.value.deposits.slice(0, 5));
      }
      if (withData.status === 'fulfilled' && withData.value?.withdrawals) {
        setWithdrawals(withData.value.withdrawals.slice(0, 5));
      }
      if (resData.status === 'fulfilled' && resData.value?.results) {
        setRecentResults(resData.value.results.slice(0, 5));
      }
      if (banData.status === 'fulfilled' && banData.value?.banners) {
        setBanners(banData.value.banners);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, [periodType, selectedDate, selectedMonth]);

  const handlePeriodChange = (type: 'today' | 'yesterday' | 'custom_date' | 'this_month' | 'last_month' | 'custom_month') => {
    setIsLoadingStats(true);
    setPeriodType(type);
    const now = new Date();
    if (type === 'today') {
      setSelectedDate(now.toISOString().split('T')[0]);
      setSelectedMonth(now.toISOString().split('T')[0].substring(0, 7));
    } else if (type === 'yesterday') {
      const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      setSelectedDate(yDate.toISOString().split('T')[0]);
      setSelectedMonth(yDate.toISOString().split('T')[0].substring(0, 7));
    } else if (type === 'this_month') {
      setSelectedMonth(now.toISOString().split('T')[0].substring(0, 7));
    } else if (type === 'last_month') {
      const lDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lMonth = `${lDate.getFullYear()}-${String(lDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(lMonth);
    }
  };

  const handleToggleGame = async (gameKey: string) => {
    try {
      await api.toggleAdminGameCatalog(gameKey, admin?.username || 'SuperAdmin');
      showToast(`Toggled game status`, 'success');
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle game', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPhone) {
      showToast('Username and phone number are required', 'error');
      return;
    }
    try {
      await api.registerUser(newUsername, newPhone, `${newUsername}@arowclub.pro`, '', newPassword);
      showToast(`User ${newUsername} registered successfully!`, 'success');
      setShowAddUserModal(false);
      setNewUsername('');
      setNewPhone('');
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceUid || !balanceAmount || Number(balanceAmount) <= 0) {
      showToast('Please enter valid user UID and positive amount', 'error');
      return;
    }
    try {
      await api.adjustUserBalance(balanceUid, Number(balanceAmount), 'credit', 'Admin Manual Top-Up via Quick Actions', admin?.username || 'SuperAdmin');
      showToast(`₹${balanceAmount} credited to UID ${balanceUid}`, 'success');
      setShowAddBalanceModal(false);
      setBalanceUid('');
      setBalanceAmount('500');
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add balance', 'error');
    }
  };

  const displayDeposits = deposits;
  const displayWithdrawals = withdrawals;

  const displayGames = games.length > 0 ? games : [
    { id: '1', gameKey: 'wingo_30s', name: 'Win Go 30s', status: 'active' },
    { id: '2', gameKey: 'wingo_1m', name: 'Win Go 1Min', status: 'active' },
    { id: '3', gameKey: 'wingo_3m', name: 'Win Go 3Min', status: 'active' },
    { id: '4', gameKey: 'wingo_5m', name: 'Win Go 5Min', status: 'active' },
    { id: '5', gameKey: 'mines', name: 'Mines', status: 'active' },
    { id: '6', gameKey: 'aviator', name: 'Aviator', status: 'active' },
  ];

  const displayResults = recentResults;
  const displayBanners = banners;

  // Daily Calculations from database stats
  const isMonthlyMode = periodType === 'this_month' || periodType === 'last_month' || periodType === 'custom_month';
  const dailyPnl = Number(stats?.daily?.pnl ?? 0);
  const dailyIsProfit = stats?.daily?.isProfit ?? (dailyPnl >= 0);
  
  // Monthly Calculations from database stats
  const monthlyPnl = Number(stats?.monthly?.pnl ?? 0);
  const monthlyIsProfit = stats?.monthly?.isProfit ?? (monthlyPnl >= 0);

  return (
    <div className="space-y-6">
      {/* ================= 0. TOP DATE FILTER & REPORT PERIOD SELECTOR ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Header Title & Dynamic Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-300">Report Period:</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300">
                  {isMonthlyMode ? (stats?.monthlyReportLabel || `Monthly Report: ${stats?.monthDisplay || 'August 2026'}`) : (stats?.reportForDateLabel || `Report For: ${stats?.dateDisplay || '27 Aug 2026'}`)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real-time database statistics strictly calculated for selected timeframe
              </p>
            </div>
          </div>

          {/* Period Filter Buttons and Pickers */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Quick Period Buttons */}
            <div className="inline-flex rounded-xl bg-[#181a2e] border border-[#2b304c] p-1 gap-1">
              <button
                type="button"
                onClick={() => handlePeriodChange('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  periodType === 'today'
                    ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('yesterday')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  periodType === 'yesterday'
                    ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('this_month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  periodType === 'this_month'
                    ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('last_month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  periodType === 'last_month'
                    ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Last Month
              </button>
            </div>

            {/* Custom Date Picker */}
            <div className="flex items-center gap-1.5 bg-[#181a2e] border border-[#2b304c] rounded-xl px-2.5 py-1">
              <span className="text-[11px] text-slate-400 font-medium">Custom Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setPeriodType('custom_date');
                  }
                }}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* Custom Month Picker */}
            <div className="flex items-center gap-1.5 bg-[#181a2e] border border-[#2b304c] rounded-xl px-2.5 py-1">
              <span className="text-[11px] text-slate-400 font-medium">Custom Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedMonth(e.target.value);
                    setPeriodType('custom_month');
                  }
                }}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => {
                setIsLoadingStats(true);
                fetchDashboardData();
              }}
              title="Refresh Stats"
              className="p-2 rounded-xl bg-[#181a2e] border border-[#2b304c] text-slate-300 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= 1. DAILY DASHBOARD CARDS (5 IN ONE ROW) ================= */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Daily Metrics Overview ({stats?.dateDisplay || selectedDate})
          </h3>
          <span className="text-[11px] text-indigo-400 font-medium">
            Database-driven live calculations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Users */}
          <div
            onClick={() => onNavigate('users_management')}
            className="bg-[#121422] border border-[#23273c] hover:border-indigo-500/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Total Users</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {(stats?.daily?.totalUsers ?? stats?.totalUsers ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <span>+{stats?.daily?.newUsersOnDate ?? 0} New {periodType === 'today' ? 'Today' : periodType === 'yesterday' ? 'Yesterday' : 'On Date'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Deposit */}
          <div
            onClick={() => onNavigate('deposit_requests')}
            className="bg-[#121422] border border-[#23273c] hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Total Deposit</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ArrowDownCircle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                ₹ {(stats?.daily?.depositAmount ?? stats?.todayDeposits ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-1.5">
                <span>{stats?.daily?.depositCount ?? stats?.todayDepositsCount ?? 0} Approved</span>
                {((stats?.daily?.pendingDepositCount ?? 0) > 0 || (stats?.pendingDeposits ?? 0) > 0) && (
                  <span className="text-amber-400 font-medium">
                    • {stats?.daily?.pendingDepositCount ?? stats?.pendingDeposits} Pending (₹{(stats?.daily?.pendingDepositAmount ?? 0).toLocaleString('en-IN')})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Total Withdrawal */}
          <div
            onClick={() => onNavigate('withdrawal_requests')}
            className="bg-[#121422] border border-[#23273c] hover:border-amber-500/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Total Withdrawal</span>
              <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400 tracking-tight">
                ₹ {(stats?.daily?.withdrawalAmount ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">
                {stats?.daily?.withdrawalCount ?? 0} Withdrawals
              </div>
            </div>
          </div>

          {/* Card 4: Profit & Loss (P&L) */}
          <div
            onClick={() => onNavigate('reports_analytics')}
            className="bg-[#121422] border border-[#23273c] hover:border-purple-500/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Profit & Loss (P&L)</span>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform ${
                dailyIsProfit 
                  ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-600/20 border-rose-500/30 text-rose-400'
              }`}>
                {dailyIsProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>
            <div>
              <div className={`text-2xl font-bold tracking-tight ${dailyIsProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dailyPnl > 0 ? `+₹ ${dailyPnl.toLocaleString('en-IN')}` : dailyPnl < 0 ? `-₹ ${Math.abs(dailyPnl).toLocaleString('en-IN')}` : '₹ 0'}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                <span>Deposit - Withdrawal</span>
              </div>
            </div>
          </div>

          {/* Card 5: Total Bets */}
          <div
            onClick={() => onNavigate('bets_management')}
            className="bg-[#121422] border border-[#23273c] hover:border-blue-500/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Total Bets</span>
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400 tracking-tight">
                {(stats?.daily?.betsCount ?? 0).toLocaleString('en-IN')} Bets
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-1">
                ₹ {(stats?.daily?.turnover ?? 0).toLocaleString('en-IN')} Turnover
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. MONTHLY OVERVIEW CARDS (5 IN ONE ROW) ================= */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Monthly Overview ({stats?.monthDisplay || selectedMonth})
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Aggregated monthly performance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Month Card 1: Monthly Registered Users */}
          <div
            onClick={() => onNavigate('users_management')}
            className="bg-[#121422] border border-[#23273c] hover:border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Monthly Registered Users</span>
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-white tracking-tight">
                {(stats?.monthly?.newUsersInMonth ?? 0).toLocaleString('en-IN')} New Users
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">
                {(stats?.monthly?.totalUsers ?? stats?.totalUsers ?? 0).toLocaleString('en-IN')} Total Platform Users
              </div>
            </div>
          </div>

          {/* Month Card 2: Monthly Total Deposit */}
          <div
            onClick={() => onNavigate('deposit_requests')}
            className="bg-[#121422] border border-[#23273c] hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Monthly Total Deposit</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ArrowDownCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-400 tracking-tight">
                ₹ {(stats?.monthly?.depositAmount ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">
                {(stats?.monthly?.depositCount ?? 0).toLocaleString('en-IN')} Deposits This Month
              </div>
            </div>
          </div>

          {/* Month Card 3: Monthly Total Withdrawal */}
          <div
            onClick={() => onNavigate('withdrawal_requests')}
            className="bg-[#121422] border border-[#23273c] hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Monthly Total Withdrawal</span>
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ArrowUpCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-400 tracking-tight">
                ₹ {(stats?.monthly?.withdrawalAmount ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">
                {(stats?.monthly?.withdrawalCount ?? 0).toLocaleString('en-IN')} Withdrawals This Month
              </div>
            </div>
          </div>

          {/* Month Card 4: Monthly Net P&L */}
          <div
            onClick={() => onNavigate('reports_analytics')}
            className="bg-[#121422] border border-[#23273c] hover:border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Monthly Net P&L</span>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                monthlyIsProfit 
                  ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-600/20 border-rose-500/30 text-rose-400'
              }`}>
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className={`text-xl font-bold tracking-tight ${monthlyIsProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {monthlyPnl > 0 ? `+₹ ${monthlyPnl.toLocaleString('en-IN')}` : monthlyPnl < 0 ? `-₹ ${Math.abs(monthlyPnl).toLocaleString('en-IN')}` : '₹ 0'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">
                Net Profit / Loss for {stats?.monthDisplay || 'Month'}
              </div>
            </div>
          </div>

          {/* Month Card 5: Monthly Game Turnover */}
          <div
            onClick={() => onNavigate('bets_management')}
            className="bg-[#121422] border border-[#23273c] hover:border-blue-500/40 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-lg group hover:bg-[#15172b]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-semibold">Monthly Game Turnover</span>
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-400 tracking-tight">
                ₹ {(stats?.monthly?.turnover ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">
                {(stats?.monthly?.betsCount ?? 0).toLocaleString('en-IN')} Total Bets Played
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. WELCOME TO ADMIN PANEL BANNER ================= */}
      <div className="bg-gradient-to-r from-[#291757] via-[#1c1a40] to-[#121422] border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Welcome to Admin Panel</h3>
            <p className="text-xs text-indigo-200/70 mt-0.5">
              Manage your platform efficiently and monitor real-time activities.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('notification')}
          className="z-10 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-semibold text-white transition flex items-center gap-1.5"
        >
          <span>View Announcements</span>
        </button>
      </div>

      {/* ================= 3. THREE-COLUMN MID SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Deposit Requests */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Deposit Requests</h3>
                {(stats?.pendingDeposits || displayDeposits.length) > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {stats?.pendingDeposits ?? displayDeposits.length}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold">
                    0
                  </span>
                )}
              </div>
              <button
                onClick={() => onNavigate('deposit_requests')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {displayDeposits.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-medium">
                  No pending deposit requests
                </div>
              ) : (
                displayDeposits.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between py-2 border-b border-[#1e202e] last:border-0 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{item.name || item.uid}</span>
                    </div>
                    <span className="font-bold text-emerald-400">
                      ₹ {Number(item.amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-400 text-[11px]">{item.type || 'UPI'}</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                      Pending
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Withdrawal Requests */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Withdrawal Requests</h3>
                {(stats?.pendingWithdrawals || displayWithdrawals.length) > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {stats?.pendingWithdrawals ?? displayWithdrawals.length}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold">
                    0
                  </span>
                )}
              </div>
              <button
                onClick={() => onNavigate('withdrawal_requests')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {displayWithdrawals.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-medium">
                  No pending withdrawal requests
                </div>
              ) : (
                displayWithdrawals.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between py-2 border-b border-[#1e202e] last:border-0 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{item.name || item.uid}</span>
                    </div>
                    <span className="font-bold text-amber-400">
                      ₹ {Number(item.amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-400 text-[11px] truncate max-w-[80px]">
                      {item.paymentMethod || 'Bank Transfer'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                      Pending
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Game Status Overview */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Game Status Overview</h3>
              <button
                onClick={() => onNavigate('game_management')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Manage All Games
              </button>
            </div>

            <div className="space-y-3">
              {displayGames.map((g) => {
                const isActive = g.status !== 'inactive';
                return (
                  <div
                    key={g.id || g.gameKey}
                    className="flex items-center justify-between py-1.5 border-b border-[#1e202e] last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Gamepad2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200">{g.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleGame(g.gameKey)}
                        className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isActive ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4. THREE-COLUMN LOWER SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Total Bets Overview (Line Chart) */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Total Bets Overview</h3>
              <select
                value={timeFilter}
                onChange={(e: any) => setTimeFilter(e.target.value)}
                className="bg-[#181a2e] border border-[#2b304c] text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
              >
                <option value="this_week">This Week</option>
                <option value="today">Today</option>
                <option value="this_month">This Month</option>
              </select>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-white">₹ {(stats?.totalBetVolume ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-xs font-bold text-emerald-400">{stats?.totalBets ?? 0} Bets</span>
            </div>

            {/* Custom SVG Graph matching screenshot */}
            <div className="h-44 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="betLineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Grid lines */}
                <line x1="40" y1="20" x2="390" y2="20" stroke="#1e202e" strokeDasharray="3 3" />
                <line x1="40" y1="60" x2="390" y2="60" stroke="#1e202e" strokeDasharray="3 3" />
                <line x1="40" y1="100" x2="390" y2="100" stroke="#1e202e" strokeDasharray="3 3" />
                <line x1="40" y1="140" x2="390" y2="140" stroke="#1e202e" />

                {/* Y-axis labels */}
                <text x="10" y="24" fill="#64748b" fontSize="10" fontFamily="sans-serif">4M</text>
                <text x="10" y="64" fill="#64748b" fontSize="10" fontFamily="sans-serif">3M</text>
                <text x="10" y="104" fill="#64748b" fontSize="10" fontFamily="sans-serif">2M</text>
                <text x="10" y="144" fill="#64748b" fontSize="10" fontFamily="sans-serif">1M</text>

                {/* Line area */}
                <path
                  d="M 60 120 Q 110 80 160 100 T 260 50 T 360 40 L 360 140 L 60 140 Z"
                  fill="url(#betLineGradient)"
                />
                {/* Main line */}
                <path
                  d="M 60 120 Q 110 80 160 100 T 260 50 T 360 40"
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Points */}
                <circle cx="60" cy="120" r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="110" cy="90" r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="160" cy="100" r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="210" cy="85" r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="260" cy="50" r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="310" cy="65" r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="360" cy="40" r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
              </svg>

              {/* X Axis days */}
              <div className="flex justify-between pl-10 pr-2 text-[10px] text-slate-500 font-semibold mt-1">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Recent Results */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Recent Results</h3>
              <button
                onClick={() => onNavigate('result_management')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              {displayResults.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-medium">
                  No recent game rounds recorded yet
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold">
                      <th className="pb-2 font-medium">Period</th>
                      <th className="pb-2 font-medium text-center">Number</th>
                      <th className="pb-2 font-medium text-center">Color</th>
                      <th className="pb-2 font-medium text-right">Result Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e202e]">
                    {displayResults.map((r: any, idx: number) => {
                      const color = r.color || (r.number % 2 === 0 ? 'red' : 'green');
                      return (
                        <tr key={idx} className="hover:bg-[#16182c]/40">
                          <td className="py-2 text-slate-300 font-mono text-[11px]">{r.id || r.periodId}</td>
                          <td className="py-2 text-center font-bold text-white font-mono">{r.number ?? 7}</td>
                          <td className="py-2 text-center">
                            <span
                              className={`inline-block w-3 h-3 rounded-full ${
                                color === 'green'
                                  ? 'bg-emerald-500'
                                  : color === 'red'
                                  ? 'bg-rose-500'
                                  : 'bg-purple-500'
                              }`}
                            />
                          </td>
                          <td className="py-2 text-right text-[11px] text-slate-400 font-mono">
                            {r.time || 'Just now'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Quick Actions (2x4 grid) */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-4">Quick Actions</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Action 1: Add User */}
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 transition group"
              >
                <PlusCircle className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white">Add User</span>
              </button>

              {/* Action 2: Send Notification */}
              <button
                onClick={() => onNavigate('notification')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 transition group"
              >
                <Send className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white">Send Notification</span>
              </button>

              {/* Action 3: Add Balance */}
              <button
                onClick={() => setShowAddBalanceModal(true)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 transition group"
              >
                <DollarSign className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white">Add Balance</span>
              </button>

              {/* Action 4: Game Settings */}
              <button
                onClick={() => onNavigate('settings')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 transition group"
              >
                <Sliders className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white">Game Settings</span>
              </button>

              {/* Action 5: View Reports */}
              <button
                onClick={() => onNavigate('reports_analytics')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 transition group"
              >
                <FileText className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white">View Reports</span>
              </button>

              {/* Action 6: Support Links */}
              <button
                onClick={() => onNavigate('support_links')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 transition group"
              >
                <Headphones className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white">Support Links</span>
              </button>

              {/* Action 7: Maintenance Mode */}
              <button
                onClick={() => onNavigate('maintenance_mode')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-400 transition group"
              >
                <Power className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white">Maintenance</span>
              </button>

              {/* Action 8: Logout */}
              <button
                onClick={() => logoutAdmin()}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 transition group"
              >
                <LogOut className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 5. BOTTOM SECTION: ACTIVE BANNERS ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Active Banners</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('banner_management')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Manage Banners
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={() => setBannerIndex(prev => (prev === 0 ? displayBanners.length - 1 : prev - 1))}
                className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setBannerIndex(prev => (prev === displayBanners.length - 1 ? 0 : prev + 1))}
                className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Banners Display Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayBanners.map((b, idx) => (
            <div
              key={b.id || idx}
              className={`relative overflow-hidden rounded-2xl border ${b.borderColor || 'border-indigo-500/30'} bg-gradient-to-br ${b.bgGradient || 'from-indigo-900/40 to-slate-900/60'} p-4 flex flex-col justify-between min-h-[140px] shadow-lg group hover:scale-[1.01] transition-transform`}
            >
              <div className="z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                  {b.title}
                </span>
                <h4 className={`text-base font-black ${b.textColor || 'text-amber-400'} mt-0.5 tracking-tight`}>
                  {b.subtitle || b.description}
                </h4>
              </div>

              <div className="z-10 mt-3 flex items-center justify-between">
                <button
                  onClick={() => onNavigate('banner_management')}
                  className="px-3 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider transition"
                >
                  {b.actionText || 'Edit Banner'}
                </button>
              </div>

              {/* Background image tint */}
              {b.img && (
                <img
                  src={b.img}
                  alt={b.title}
                  className="absolute right-0 bottom-0 w-28 h-28 object-cover opacity-20 group-hover:opacity-30 transition pointer-events-none"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ================= MODAL: QUICK ADD USER ================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-400" />
              Quick Add User Account
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Username / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Kumar"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK ADD BALANCE ================= */}
      {showAddBalanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Direct Balance Credit
            </h3>
            <form onSubmit={handleAddBalance} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">User UID or Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100001 or mobile"
                  value={balanceUid}
                  onChange={(e) => setBalanceUid(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Amount to Add (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 500"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBalanceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Credit Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
