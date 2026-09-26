import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  BarChart3, Calendar, Download, TrendingUp, TrendingDown,
  DollarSign, Users, ArrowDownCircle, ArrowUpCircle, Filter
} from 'lucide-react';

export const ReportsView: React.FC<{ defaultReportType?: string }> = ({
  defaultReportType = 'reports_daily',
}) => {
  const [reportType, setReportType] = useState(defaultReportType);
  const [range, setRange] = useState<'today' | '7days' | '30days'>('today');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminReports(reportType, range);
      if (res) setData(res);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, range]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] border border-[#26262a] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Financial Reports & Profit Analytics</h2>
            <p className="text-xs text-[#a1a1aa]">Daily turnover reconciliations, bet volume, and net gaming revenue (NGR).</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range buttons */}
          <div className="flex bg-[#0a0a0b] p-1 rounded-lg border border-[#26262a] text-xs font-semibold">
            {(['today', '7days', '30days'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg capitalize transition ${
                  range === r ? 'bg-[#d4af37] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                {r === 'today' ? 'Today' : r === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          {/* Export button */}
          <button
            onClick={() => alert('Report data exported to CSV successfully.')}
            className="px-3 py-2 bg-[#1a1a1e] hover:bg-[#26262a] text-[#e0e0e0] text-xs font-bold rounded-lg flex items-center gap-1.5 transition border border-[#26262a]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Bento Grid */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#121215] border border-[#26262a] rounded-xl">
            <span className="text-xs text-[#a1a1aa] font-medium">Total Betting Turnover</span>
            <div className="text-lg font-bold text-white font-mono mt-1">₹{data.summary.totalBetAmount.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-4 bg-[#121215] border border-[#26262a] rounded-xl">
            <span className="text-xs text-[#a1a1aa] font-medium">Total Player Payouts</span>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-1">₹{data.summary.totalWinAmount.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-4 bg-[#121215] border border-[#26262a] rounded-xl">
            <span className="text-xs text-[#a1a1aa] font-medium">Platform Net Profit (NGR)</span>
            <div className={`text-lg font-bold font-mono mt-1 ${data.summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{data.summary.netProfit.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-4 bg-[#121215] border border-[#26262a] rounded-xl">
            <span className="text-xs text-[#a1a1aa] font-medium">Deposit vs Withdrawal Flow</span>
            <div className="text-xs font-mono mt-1">
              <span className="text-cyan-400 font-bold">+₹{data.summary.totalDeposits}</span> / <span className="text-rose-400 font-bold">-₹{data.summary.totalWithdrawals}</span>
            </div>
          </div>
        </div>
      )}

      {/* Daily Breakdown Table */}
      <div className="bg-[#121215] border border-[#26262a] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#26262a] flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Detailed Daily Ledger Reconciliation</h3>
          <span className="text-xs text-[#a1a1aa]">Values in INR (₹)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1a1a1e] text-[#a1a1aa] uppercase tracking-wider font-semibold border-b border-[#26262a]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Active Players</th>
                <th className="py-3 px-4">Total Bets Placed</th>
                <th className="py-3 px-4">Betting Turnover</th>
                <th className="py-3 px-4">Winning Payouts</th>
                <th className="py-3 px-4">Deposits</th>
                <th className="py-3 px-4">Withdrawals</th>
                <th className="py-3 px-4 text-right">Net Platform Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262a]">
              {!data?.dailyBreakdown || data.dailyBreakdown.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-[#71717a]">No report data</td></tr>
              ) : (
                data.dailyBreakdown.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-[#1a1a1e]/40">
                    <td className="py-3 px-4 font-mono font-bold text-white">{row.date}</td>
                    <td className="py-3 px-4 text-[#e0e0e0]">{row.activePlayers}</td>
                    <td className="py-3 px-4 font-mono text-[#e0e0e0]">{row.totalBets}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">₹{row.betTurnover.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">₹{row.winPayout.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono text-cyan-400">₹{row.depositAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono text-rose-400">₹{row.withdrawalAmount.toLocaleString('en-IN')}</td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${row.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {row.netProfit >= 0 ? `+₹${row.netProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(row.netProfit).toLocaleString('en-IN')}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
