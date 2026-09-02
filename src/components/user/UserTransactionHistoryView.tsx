import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { WalletTransaction } from '../../types.js';
import { ChevronLeft, ChevronDown, Calendar, RefreshCw, Filter } from 'lucide-react';

interface UserTransactionHistoryViewProps {
  initialFilter?: 'all' | 'deposit' | 'withdrawal' | 'bet' | 'win' | string;
  onBack: () => void;
}

export const UserTransactionHistoryView: React.FC<UserTransactionHistoryViewProps> = ({ initialFilter = 'all', onBack }) => {
  const { user, showToast } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>(initialFilter || 'all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (initialFilter) {
      setTypeFilter(initialFilter);
    }
  }, [initialFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      if (user?.uid) {
        const res = await api.getUserTransactions(user.uid);
        if (res?.transactions) {
          setTransactions(res.transactions);
        }
      }
    } catch {
      // quiet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.uid]);

  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Bet', value: 'bet' },
    { label: 'Win', value: 'win' },
    { label: 'Deposit', value: 'deposit' },
    { label: 'Withdraw', value: 'withdrawal' },
    { label: 'Bonus', value: 'bonus' },
    { label: 'Commission', value: 'commission' },
  ];

  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (selectedDate && t.createdAt && !t.createdAt.startsWith(selectedDate)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#1b224d] text-white flex flex-col font-sans pb-16 select-none relative">
      {/* 2nd IMAGE: Header with Back Arrow and centered "Transaction history" */}
      <header className="px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 bg-[#121520]/98 backdrop-blur-xl border-b border-[#f5c443]/20 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="font-extrabold text-base text-white tracking-wide">
          Transaction history
        </h1>

        <button
          onClick={fetchTransactions}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* 2nd IMAGE: Two Dropdown Filters: [ All v ] [ Choose a date v ] */}
      <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-3 relative z-20">
        {/* Type Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTypeDropdown(!showTypeDropdown);
              setShowDatePicker(false);
            }}
            className="w-full h-10 px-3.5 bg-[#252e64] border border-[#364287] rounded-xl flex items-center justify-between text-xs font-bold text-zinc-200 hover:border-[#38bdf8] transition shadow-sm"
          >
            <span className="capitalize">
              {filterOptions.find((f) => f.value === typeFilter)?.label || 'All'}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </button>

          {showTypeDropdown && (
            <div className="absolute top-11 left-0 right-0 bg-[#252e64] border border-[#38bdf8]/40 rounded-xl shadow-2xl overflow-hidden divide-y divide-white/5 z-30 animate-fadeIn">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTypeFilter(opt.value);
                    setShowTypeDropdown(false);
                  }}
                  className={`w-full py-2.5 px-3.5 text-left text-xs font-bold transition flex items-center justify-between ${
                    typeFilter === opt.value
                      ? 'bg-[#38bdf8] text-[#0d0f17]'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <span>{opt.label}</span>
                  {typeFilter === opt.value && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowDatePicker(!showDatePicker);
              setShowTypeDropdown(false);
            }}
            className="w-full h-10 px-3.5 bg-[#252e64] border border-[#364287] rounded-xl flex items-center justify-between text-xs font-bold text-zinc-200 hover:border-[#38bdf8] transition shadow-sm"
          >
            <span className="truncate">
              {selectedDate ? selectedDate : 'Choose a date'}
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
          </button>

          {showDatePicker && (
            <div className="absolute top-11 right-0 w-72 bg-[#252e64] border border-[#38bdf8]/40 rounded-2xl shadow-2xl p-3.5 z-40 animate-fadeIn space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">Filter by Date</span>
                {selectedDate && (
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setShowDatePicker(false);
                    }}
                    className="text-[10px] text-rose-400 hover:underline font-bold"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    setSelectedDate(todayStr);
                    setShowDatePicker(false);
                  }}
                  className="py-1.5 px-2 bg-[#181f47] hover:bg-[#38bdf8] hover:text-[#0d0f17] text-zinc-300 rounded-lg text-[11px] font-bold transition text-center"
                >
                  Today
                </button>

                <button
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yestStr = yesterday.toISOString().slice(0, 10);
                    setSelectedDate(yestStr);
                    setShowDatePicker(false);
                  }}
                  className="py-1.5 px-2 bg-[#181f47] hover:bg-[#38bdf8] hover:text-[#0d0f17] text-zinc-300 rounded-lg text-[11px] font-bold transition text-center"
                >
                  Yesterday
                </button>

                <button
                  onClick={() => {
                    setSelectedDate('');
                    setShowDatePicker(false);
                  }}
                  className="py-1.5 px-2 bg-[#181f47] hover:bg-[#38bdf8] hover:text-[#0d0f17] text-zinc-300 rounded-lg text-[11px] font-bold transition text-center col-span-2"
                >
                  All Dates (Show All)
                </button>
              </div>

              {/* Custom Date Input */}
              <div className="space-y-1 pt-1 border-t border-white/10">
                <label className="text-[10px] text-zinc-400 font-bold block">Custom Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setShowDatePicker(false);
                  }}
                  className="w-full bg-[#181f47] border border-white/15 focus:border-[#38bdf8] rounded-xl p-2 text-xs text-white outline-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Body: List or Exact 2nd Image "No data" State */}
      <div className="flex-1 px-4 pt-4 max-w-md mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 text-xs gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#38bdf8]" />
            <span>Loading transaction records...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          /* 2nd IMAGE: Exact "No data" with Dark Paper Scroll Illustration */
          <div className="flex flex-col items-center justify-center pt-24 pb-20 space-y-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Ambient backdrop gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#2a346e]/40 to-transparent rounded-full blur-xl" />
              
              {/* Illustrated 3D Dark Scroll SVG matching 2nd Image */}
              <svg viewBox="0 0 160 160" className="w-32 h-32 relative z-10">
                {/* Background hill silhouette */}
                <ellipse cx="80" cy="115" rx="60" ry="18" fill="#141838" />
                <circle cx="45" cy="100" r="10" fill="#202752" />
                <circle cx="120" cy="102" r="8" fill="#202752" />
                <rect x="100" y="105" width="18" height="15" rx="3" fill="#202752" />
                
                {/* Curved rolled paper sheet */}
                <path
                  d="M 55 40 C 65 30, 95 30, 105 40 L 105 105 C 95 115, 65 115, 55 105 Z"
                  fill="#2e354a"
                />
                <path
                  d="M 55 40 C 65 50, 95 50, 105 40 C 95 30, 65 30, 55 40 Z"
                  fill="#3d4661"
                />
                <path
                  d="M 55 105 C 65 115, 95 115, 105 105 C 95 95, 65 95, 55 105 Z"
                  fill="#212739"
                />

                {/* Floating paper plane / cursor arrow */}
                <path
                  d="M 68 55 L 85 58 L 76 66 Z"
                  fill="#7885a6"
                  opacity="0.8"
                />
                <path
                  d="M 85 58 Q 100 65, 110 50"
                  stroke="#576385"
                  strokeDasharray="2,2"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>

            <span className="text-xs font-bold text-[#62709a] tracking-wide">
              No data
            </span>
          </div>
        ) : (
          /* Real Data List matching Reference Formats */
          <div className="space-y-3 pb-8">
            {filteredTransactions.map((tx, idx) => {
              const isDeposit = tx.type === 'deposit';
              const isWithdrawal = tx.type === 'withdrawal';
              const isPending = tx.status === 'pending';
              const isFailed = tx.status === 'rejected' || tx.status === 'failed';
              const isCompleted = tx.status === 'completed' || tx.status === 'approved' || (!tx.status && !isPending && !isFailed);

              const orderNo = tx.reference || (isDeposit ? `DP${new Date(tx.createdAt || Date.now()).getTime()}A${idx}` : `WD${new Date(tx.createdAt || Date.now()).getTime()}B${idx}`);
              const formattedTime = tx.createdAt ? tx.createdAt.replace('T', ' ').slice(0, 19) : new Date().toISOString().replace('T', ' ').slice(0, 19);

              return (
                <div
                  key={idx}
                  className="bg-[#141824] border border-[#f5c443]/15 hover:border-[#f5c443]/35 rounded-2xl p-4 shadow-lg transition space-y-2.5"
                >
                  {/* Top Bar: Pill Badge + Status */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                        isDeposit
                          ? 'bg-[#00d084] text-[#0d0f17]'
                          : isWithdrawal
                          ? 'bg-[#ff3b3b] text-white'
                          : 'bg-[#f5c443] text-[#0d0f17]'
                      }`}
                    >
                      {tx.type}
                    </span>

                    <span
                      className={`text-xs font-bold ${
                        isCompleted
                          ? 'text-[#00d084]'
                          : isPending
                          ? 'text-amber-400'
                          : 'text-rose-500'
                      }`}
                    >
                      {isCompleted ? 'Completed' : isPending ? 'Pending' : (isWithdrawal ? 'Rejected' : 'Failed')}
                    </span>
                  </div>

                  {/* Details Rows */}
                  <div className="space-y-1.5 text-xs">
                    {/* Amount / Balance */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">
                        {tx.type === 'win' ? 'Net Win Credited' : 'Amount'}
                      </span>
                      <span className={`font-black text-sm font-mono ${tx.type === 'win' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {tx.type === 'win' ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </div>

                    {/* If Win with GST Breakdown */}
                    {tx.type === 'win' && ((tx as any).gstAmount > 0 || (tx as any).gstPercent > 0) && (
                      <div className="p-2 rounded-xl bg-[#1b2133] border border-amber-500/20 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span>Gross Winning:</span>
                          <span className="font-mono font-bold text-white">
                            ₹{((tx as any).grossAmount || Math.abs(tx.amount) / (1 - ((tx as any).gstPercent || 2) / 100)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-rose-400 font-semibold">
                          <span>GST / Fee Cut ({(tx as any).gstPercent || 2}%):</span>
                          <span className="font-mono">
                            -₹{((tx as any).gstAmount || (Math.abs(tx.amount) * ((tx as any).gstPercent || 2) / (100 - ((tx as any).gstPercent || 2)))).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Type / Channel */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Type</span>
                      <span className="text-zinc-200 font-semibold uppercase">
                        {(tx as any).paymentMethod || (tx as any).channel || (isDeposit ? 'UPI' : isWithdrawal ? 'BANK CARD' : tx.type)}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Time</span>
                      <span className="text-zinc-300 font-mono text-[11px]">
                        {formattedTime}
                      </span>
                    </div>

                    {/* Order number with Copy button */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Order number</span>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-300">
                        <span className="truncate max-w-[170px]">{orderNo}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(orderNo);
                            showToast('Order number copied!', 'info');
                          }}
                          className="p-1 text-[#f5c443] hover:text-white transition active:scale-90"
                          title="Copy Order Number"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" strokeWidth="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" strokeWidth="2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Remarks / UTR if applicable */}
                    {(tx as any).utrReference && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">UTR / Ref No.</span>
                        <span className="text-[#fce08b] font-mono text-[11px] font-bold">{(tx as any).utrReference}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Remarks</span>
                      <span className="text-zinc-300 text-[11px] max-w-[200px] truncate text-right">
                        {tx.note || (isPending ? 'Pending Admin Approval' : isCompleted ? 'Approved & Credited' : isFailed ? 'Failed / Rejected' : '—')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
