import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  BarChart3, Calendar, Filter, Download, Receipt,
  DollarSign, TrendingUp, Users, PieChart as PieIcon,
  ChevronRight, ArrowUpRight, RefreshCw, Loader2
} from 'lucide-react';

export const ReportsAnalyticsView: React.FC = () => {
  const { showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'bets' | 'financial' | 'users' | 'games'>('overview');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<{
    summary?: {
      totalBetAmount?: number;
      totalWinAmount?: number;
      netProfit?: number;
      totalDeposits?: number;
      totalWithdrawals?: number;
    };
    dailyBreakdown?: Array<{
      date: string;
      activePlayers: number;
      totalBets: number;
      betTurnover: number;
      winPayout: number;
      netProfit: number;
      depositAmount: number;
      withdrawalAmount: number;
    }>;
  }>({});
  const [activeUserCount, setActiveUserCount] = useState(0);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [repRes, statsRes] = await Promise.all([
        api.getAdminReports(activeTab, 'week'),
        api.getAdminStats(),
      ]);

      if (repRes) {
        setReportData(repRes);
      }
      if (statsRes?.totalUsers !== undefined) {
        setActiveUserCount(statsRes.totalUsers || 0);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  const totalBets = reportData.summary?.totalBetAmount || 0;
  const totalPayouts = reportData.summary?.totalWinAmount || 0;
  const netProfit = reportData.summary?.netProfit || 0;
  const totalDeposits = reportData.summary?.totalDeposits || 0;
  const totalWithdrawals = reportData.summary?.totalWithdrawals || 0;

  const dailyList = reportData.dailyBreakdown || [];

  return (
    <div className="space-y-6">
      {/* ================= TOP FILTER BAR ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Realtime System Audit</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181a2e] border border-[#2b304c] text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={() => showToast('Exporting analytics audit log', 'success')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5b50e6] text-white text-xs font-semibold transition shadow-sm hover:brightness-110"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1e202e] pb-3">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'bets', label: 'Bets Report' },
          { id: 'financial', label: 'Financial Report' },
          { id: 'users', label: 'User Report' },
          { id: 'games', label: 'Game Report' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/25'
                : 'bg-[#121422] border border-[#23273c] text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= 4 KPI SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bets */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Bet Volume</div>
            <div className="text-2xl font-bold text-white tracking-tight mt-0.5">₹ {totalBets.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 2: Total Payouts */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Payouts</div>
            <div className="text-2xl font-bold text-amber-400 tracking-tight mt-0.5">₹ {totalPayouts.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Net Gaming Profit</div>
            <div className={`text-2xl font-bold tracking-tight mt-0.5 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹ {netProfit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Card 4: Active Users */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Registered Users</div>
            <div className="text-2xl font-bold text-purple-400 tracking-tight mt-0.5">{activeUserCount.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* ================= 2 ANALYTICAL PANELS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Bets Overview */}
        <div className="lg:col-span-2 bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Daily Performance Breakdown (Last 7 Days)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Real turnover and win payout recorded by system ledger</p>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span>Loading metrics...</span>
              </div>
            ) : dailyList.length === 0 || totalBets === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                <span>No gameplay or betting turnover recorded yet.</span>
                <span className="text-[11px] text-slate-600 mt-1">Values will automatically calculate when rounds are played.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181a2e] text-slate-400 text-[11px] uppercase border-b border-[#23273c]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Bets</th>
                      <th className="py-2.5 px-3">Turnover</th>
                      <th className="py-2.5 px-3">Payout</th>
                      <th className="py-2.5 px-3 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e202e] text-slate-200">
                    {dailyList.map((d, i) => (
                      <tr key={i} className="hover:bg-white/5 transition">
                        <td className="py-2 px-3 font-mono text-[11px]">{d.date}</td>
                        <td className="py-2 px-3">{d.totalBets}</td>
                        <td className="py-2 px-3 font-mono">₹{d.betTurnover.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 font-mono text-amber-400">₹{d.winPayout.toLocaleString('en-IN')}</td>
                        <td className={`py-2 px-3 font-mono text-right font-bold ${d.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ₹{d.netProfit.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#1e202e] flex items-center justify-between text-xs text-slate-400">
            <span>Approved Deposits: <strong className="text-white font-mono">₹{totalDeposits.toLocaleString('en-IN')}</strong></span>
            <span>Completed Withdrawals: <strong className="text-white font-mono">₹{totalWithdrawals.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Panel 2: Financial Balance Summary */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-1">Financial Reconciliation</h3>
            <p className="text-xs text-slate-400 mb-4">Total cashflow audit status</p>

            <div className="space-y-4 my-2">
              <div className="p-3.5 rounded-xl bg-[#181a2e] border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Total Deposits</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">₹{totalDeposits.toLocaleString('en-IN')}</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#181a2e] border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Total Withdrawals</div>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">₹{totalWithdrawals.toLocaleString('en-IN')}</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <ArrowUpRight className="w-4 h-4 rotate-90" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#181a2e] border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Net Flow (Deposits - Withdrawals)</div>
                  <div className={`text-lg font-bold font-mono mt-0.5 ${totalDeposits - totalWithdrawals >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                    ₹{(totalDeposits - totalWithdrawals).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#181a2e]/60 border border-white/5 text-[11px] text-slate-400 text-center">
            Zero-Base Clean Ledger • Calculated live from verified transactions
          </div>
        </div>
      </div>
    </div>
  );
};
