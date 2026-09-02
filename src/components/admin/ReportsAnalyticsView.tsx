import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  BarChart3, Calendar, Filter, Download, Receipt,
  DollarSign, TrendingUp, Users, PieChart as PieIcon,
  ChevronRight, ArrowUpRight
} from 'lucide-react';

export const ReportsAnalyticsView: React.FC = () => {
  const { showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'bets' | 'financial' | 'users' | 'games'>('overview');

  const totalBets = 3214250;
  const totalPayouts = 2539710;
  const netProfit = 674540;
  const activeUsers = 11234;

  const gameBreakdown = [
    { name: 'Colour Prediction', percent: 45, color: '#6366f1', amount: '₹ 14,46,412' },
    { name: 'Roulette', percent: 20, color: '#10b981', amount: '₹ 6,42,850' },
    { name: 'Aviator', percent: 15, color: '#f59e0b', amount: '₹ 4,82,137' },
    { name: 'Spin & Win', percent: 12, color: '#ec4899', amount: '₹ 3,85,710' },
    { name: 'Others', percent: 8, color: '#8b5cf6', amount: '₹ 2,57,141' },
  ];

  return (
    <div className="space-y-6">
      {/* ================= TOP FILTER BAR ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <input type="date" defaultValue="2024-05-01" className="bg-transparent text-white focus:outline-none" />
          <span>to</span>
          <input type="date" defaultValue="2024-05-26" className="bg-transparent text-white focus:outline-none" />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => showToast('Exporting analytics PDF & Excel report', 'success')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181a2e] border border-[#2b304c] text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
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
            <div className="text-xs text-slate-400 font-medium">Total Bets</div>
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
            <div className="text-xs text-slate-400 font-medium">Net Profit</div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight mt-0.5">₹ {netProfit.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 4: Active Users */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Users</div>
            <div className="text-2xl font-bold text-purple-400 tracking-tight mt-0.5">{activeUsers.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* ================= 2 ANALYTICAL PANELS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Bets Overview (2 Columns wide) */}
        <div className="lg:col-span-2 bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Bets Turnover Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Weekly volume performance across all active games</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <ArrowUpRight className="w-3.5 h-3.5" /> +20.1% Growth
              </span>
            </div>
          </div>

          <div className="h-64 w-full relative pt-2">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGradientReport" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="40" y1="20" x2="490" y2="20" stroke="#1e202e" strokeDasharray="3 3" />
              <line x1="40" y1="70" x2="490" y2="70" stroke="#1e202e" strokeDasharray="3 3" />
              <line x1="40" y1="120" x2="490" y2="120" stroke="#1e202e" strokeDasharray="3 3" />
              <line x1="40" y1="170" x2="490" y2="170" stroke="#1e202e" />

              <text x="10" y="24" fill="#64748b" fontSize="10">5M</text>
              <text x="10" y="74" fill="#64748b" fontSize="10">3.5M</text>
              <text x="10" y="124" fill="#64748b" fontSize="10">2M</text>
              <text x="10" y="174" fill="#64748b" fontSize="10">500K</text>

              <path
                d="M 60 150 Q 120 110 180 130 T 300 70 T 420 50 L 480 30 L 480 170 L 60 170 Z"
                fill="url(#areaGradientReport)"
              />
              <path
                d="M 60 150 Q 120 110 180 130 T 300 70 T 420 50 L 480 30"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {[
                { cx: 60, cy: 150 },
                { cx: 120, cy: 120 },
                { cx: 180, cy: 130 },
                { cx: 240, cy: 95 },
                { cx: 300, cy: 70 },
                { cx: 360, cy: 80 },
                { cx: 420, cy: 50 },
                { cx: 480, cy: 30 },
              ].map((p, idx) => (
                <circle key={idx} cx={p.cx} cy={p.cy} r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
              ))}
            </svg>
            <div className="flex justify-between pl-10 pr-2 text-[10px] text-slate-500 font-semibold mt-2">
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

        {/* Panel 2: Bets by Game (Donut / Pie breakdown) */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-1">Bets by Game</h3>
            <p className="text-xs text-slate-400 mb-4">Volume share distribution</p>

            {/* Donut graphic */}
            <div className="flex justify-center my-3 relative">
              <svg className="w-36 h-36" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#23273c" strokeWidth="12" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="12"
                  strokeDasharray="107 238"
                  strokeDashoffset="0"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="47 238"
                  strokeDashoffset="-107"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray="35 238"
                  strokeDashoffset="-154"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="12"
                  strokeDasharray="28 238"
                  strokeDashoffset="-189"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black text-white">45%</span>
                <span className="text-[9px] text-slate-400">Colour Pred</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-2.5 mt-4">
              {gameBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{item.amount}</span>
                    <span className="text-slate-500 text-[10px]">({item.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
