import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Receipt, DollarSign, Trophy, TrendingDown, Search,
  Filter, Download, ChevronLeft, ChevronRight, Gamepad2,
  Calendar, RefreshCw
} from 'lucide-react';
import { Bet } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const BetManagementView: React.FC = () => {
  const { showToast } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchBets = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminBets(selectedGame === 'all' ? undefined : selectedGame, selectedStatus as any);
      if (data?.bets) {
        setBets(data.bets);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
    setCurrentPage(1);
  }, [selectedStatus, selectedGame]);

  const displayBets = bets.map((b) => ({
    id: b.id,
    roundId: b.periodId,
    uid: b.uid || '---',
    game: b.gameType === 'wingo_30s' ? 'Win Go 30s' : b.gameType === 'wingo_1m' ? 'Win Go 1M' : b.gameType === 'wingo_3m' ? 'Win Go 3M' : b.gameType === 'wingo_5m' ? 'Win Go 5M' : (b.gameType || 'Colour Prediction'),
    selection: b.betType === 'color' ? String(b.selection) : b.betType === 'big_small' ? String(b.selection) : `Number ${b.selection}`,
    amount: Number(b.totalAmount || b.amount || 0),
    result: b.status === 'won' ? String(b.selection) : '---',
    resultColor: b.selection === 'red' ? 'red' : 'green',
    status: b.status,
    winLoss: b.status === 'won' ? (Number(b.winAmount) || Number(b.amount || 0) * 2) : -Number(b.amount || 0),
  }));

  const totalBetsCount = displayBets.length;
  const totalBetAmount = displayBets.reduce((sum, b) => sum + b.amount, 0);
  const totalWinAmount = displayBets.filter(b => b.status === 'won').reduce((sum, b) => sum + (b.winLoss > 0 ? b.winLoss : 0), 0);
  const totalLossAmount = totalBetAmount - totalWinAmount;

  return (
    <div className="space-y-6">
      {/* ================= FILTERS TOP BAR ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Game dropdown */}
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="bg-[#181a2e] border border-[#2b304c] text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Games</option>
            <option value="wingo">Colour Prediction</option>
            <option value="roulette">Roulette</option>
            <option value="spin_win">Spin & Win</option>
            <option value="lucky7">Lucky 7</option>
            <option value="aviator">Aviator</option>
            <option value="andar_bahar">Andar Bahar</option>
          </select>

          {/* Date range picker */}
          <div className="flex items-center gap-2 bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input type="date" defaultValue="2024-05-26" className="bg-transparent text-white focus:outline-none" />
            <span>to</span>
            <input type="date" defaultValue="2024-05-26" className="bg-transparent text-white focus:outline-none" />
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by Round ID, User ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <button
            onClick={() => showToast('Exported bet logs to CSV', 'success')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181a2e] border border-[#2b304c] text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ================= TOP 4 SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bets */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Bets</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">{totalBetsCount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 2: Total Bet Amount */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Bet Amount</div>
            <div className="text-2xl font-bold text-purple-400 mt-0.5">₹ {totalBetAmount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 3: Total Win Amount */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Win Amount</div>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5">₹ {totalWinAmount.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Card 4: Total Loss Amount */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Loss Amount</div>
            <div className="text-2xl font-bold text-rose-400 mt-0.5">₹ {totalLossAmount.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* ================= BETS TABLE ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Round ID</th>
                <th className="pb-3 px-3">User ID</th>
                <th className="pb-3 px-3">Game</th>
                <th className="pb-3 px-3">Selection</th>
                <th className="pb-3 px-3">Amount</th>
                <th className="pb-3 px-3">Result</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Win/Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e202e]">
              {displayBets.slice((currentPage - 1) * 20, currentPage * 20).map((b, idx) => {
                const isWon = b.status === 'won';
                return (
                  <tr key={b.id || idx} className="hover:bg-[#181a28] transition-colors">
                    <td className="py-3.5 px-3 font-medium text-slate-300">{b.roundId}</td>
                    <td className="py-3.5 px-3 font-medium text-indigo-400">{b.uid}</td>
                    <td className="py-3.5 px-3 text-slate-300 font-medium">{b.game}</td>
                    <td className="py-3.5 px-3 font-semibold text-white capitalize">{b.selection}</td>
                    <td className="py-3.5 px-3 text-slate-200 font-semibold">₹ {b.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 flex items-center gap-1.5 pt-4">
                      <span className="text-slate-200 font-medium">{b.result}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          b.resultColor === 'green'
                            ? 'bg-emerald-500'
                            : b.resultColor === 'red'
                            ? 'bg-rose-500'
                            : 'bg-purple-500'
                        }`}
                      />
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          isWon
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isWon ? 'Won' : 'Lost'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold">
                      <span className={isWon ? 'text-emerald-400' : 'text-rose-400'}>
                        {isWon ? `+₹ ${b.winLoss.toLocaleString('en-IN')}` : `-₹ ${Math.abs(b.winLoss).toLocaleString('en-IN')}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar (20 rows per page) */}
        <PaginationControl
          currentPage={currentPage}
          totalItems={displayBets.length}
          pageSize={20}
          onPageChange={setCurrentPage}
          itemName="bets"
        />
      </div>
    </div>
  );
};
