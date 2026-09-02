import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { WalletTransaction } from '../../types.js';
import {
  ChevronLeft, ChevronDown, Calendar, RefreshCw,
  Trophy, Flame, Filter, Gamepad2, ArrowUpRight,
  Sparkles, Layers, DollarSign
} from 'lucide-react';

interface UserGameHistoryViewProps {
  onBack: () => void;
  initialGameFilter?: string;
}

interface GameOption {
  id: string;
  name: string;
  badge: string;
  icon: string;
}

const GAME_OPTIONS: GameOption[] = [
  { id: 'all', name: 'All Games', badge: 'ALL', icon: '🎮' },
  { id: 'ludo', name: 'Ludo Battle', badge: 'BOARD', icon: '🎲' },
  { id: 'seven_up_down', name: '7 Up 7 Down', badge: 'CASINO', icon: '🃏' },
  { id: 'wingo', name: 'Wingo Lottery', badge: 'LOTTERY', icon: '🎯' },
  { id: 'aviator', name: 'Aviator Crash', badge: 'CRASH', icon: '✈️' },
  { id: 'mines', name: 'Mines', badge: 'CASINO', icon: '💣' },
  { id: 'chicken_road', name: 'Chicken Road', badge: 'ARCADE', icon: '🐔' },
  { id: 'roulette', name: 'Roulette', badge: 'CASINO', icon: '🎡' },
  { id: 'plinko', name: 'Plinko', badge: 'CASINO', icon: '⚪' },
  { id: 'vortex', name: 'Vortex Cricket', badge: 'SPORTS', icon: '🏏' },
];

export const UserGameHistoryView: React.FC<UserGameHistoryViewProps> = ({
  onBack,
  initialGameFilter = 'all',
}) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>(initialGameFilter);
  const [statusFilter, setStatusFilter] = useState<'all' | 'win' | 'bet'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const fetchGameHistory = async () => {
    setLoading(true);
    try {
      if (user?.uid) {
        const [txRes, betsRes] = await Promise.allSettled([
          api.getUserTransactions(user.uid),
          api.getMyBets(user.uid, 'all'),
        ]);

        const txList: WalletTransaction[] = [];
        if (txRes.status === 'fulfilled' && txRes.value?.transactions) {
          const gameTxs = txRes.value.transactions.filter(
            (t) => t.type === 'bet' || t.type === 'win' || (t as any).gameType || (t as any).game
          );
          txList.push(...gameTxs);
        }

        // Merge any direct bets that might not have a standalone transaction
        if (betsRes.status === 'fulfilled' && betsRes.value?.bets) {
          const betItems = betsRes.value.bets;
          betItems.forEach((b: any) => {
            const existing = txList.find(t => t.reference?.includes(b.id) || t.id === b.id || (t.reference?.includes(b.periodId) && Math.abs(t.amount) === b.totalAmount));
            if (!existing) {
              txList.push({
                id: b.id || `BET-${b.periodId}`,
                uid: b.uid || user.uid,
                type: b.status === 'won' ? 'win' : 'bet',
                amount: b.status === 'won' ? (b.winAmount || b.totalAmount) : -b.totalAmount,
                gameType: b.gameType?.includes('ludo') ? 'ludo' : b.gameType,
                reference: `${b.periodId || ''} (${b.betType || ''} ${b.selection !== undefined ? b.selection : ''})`,
                note: `${b.status === 'won' ? 'Won' : 'Placed bet on'} ${b.gameType || 'game'} round ${b.periodId || ''}`,
                createdBy: 'system',
                createdAt: b.createdAt || new Date().toISOString(),
              } as any);
            }
          });
        }

        // Also load dedicated Ludo match records from local storage
        try {
          const localLudoRaw = localStorage.getItem(`ludo_history_${user.uid}`);
          if (localLudoRaw) {
            const localLudoList = JSON.parse(localLudoRaw);
            if (Array.isArray(localLudoList)) {
              localLudoList.forEach((item: any) => {
                const alreadyExists = txList.some((t) => t.id === item.id || t.reference?.includes(item.roomId));
                if (!alreadyExists) {
                  txList.push({
                    id: item.id || `LUDO-${item.roomId}`,
                    uid: user.uid,
                    type: item.status === 'won' ? 'win' : 'bet',
                    amount: item.status === 'won' ? (item.prizeWon || item.entryFee) : -item.entryFee,
                    gameType: 'ludo',
                    reference: `${item.roomId} (${item.status === 'quit' ? 'Quit Match' : item.rank === 1 ? '1st Rank 🥇' : `${item.rank}th Rank`})`,
                    note: item.status === 'quit'
                      ? `Forfeited/Quit Ludo Match ${item.roomId}`
                      : `Played Ludo 4-Player Battle - ${item.rank === 1 ? 'Winner' : `${item.rank}th Place`}`,
                    createdBy: 'system',
                    createdAt: item.date || new Date().toISOString(),
                  } as any);
                }
              });
            }
          }
        } catch {
          // ignore
        }

        // Sort descending by date
        txList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setTransactions(txList);
      }
    } catch (err) {
      console.error('Failed to fetch game history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameHistory();
  }, [user?.uid]);

  // Helper to detect game type from transaction description or gameType field
  const getTransactionGame = (t: WalletTransaction): string => {
    const gameType = t.gameType || (t as any).game || '';
    if (gameType) return gameType.toLowerCase();

    const desc = (t.description || t.note || t.reference || '').toLowerCase();
    if (desc.includes('ludo')) return 'ludo';
    if (desc.includes('7 up') || desc.includes('seven') || desc.includes('7up')) return 'seven_up_down';
    if (desc.includes('wingo') || desc.includes('lottery')) return 'wingo';
    if (desc.includes('aviator') || desc.includes('plane') || desc.includes('flight')) return 'aviator';
    if (desc.includes('mines') || desc.includes('mine')) return 'mines';
    if (desc.includes('chicken') || desc.includes('road')) return 'chicken_road';
    if (desc.includes('roulette')) return 'roulette';
    if (desc.includes('plinko')) return 'plinko';
    if (desc.includes('cricket') || desc.includes('vortex')) return 'vortex';
    return 'wingo'; // default
  };

  // Filter transactions
  const filteredList = transactions.filter((t) => {
    // 1. Game filter
    if (selectedGame !== 'all') {
      const g = getTransactionGame(t);
      if (g !== selectedGame) return false;
    }

    // 2. Status filter
    if (statusFilter !== 'all') {
      if (t.type !== statusFilter) return false;
    }

    // 3. Date filter
    if (selectedDate && t.createdAt && !t.createdAt.startsWith(selectedDate)) {
      return false;
    }

    return true;
  });

  // Calculate statistics
  const totalBetSum = filteredList
    .filter((t) => t.type === 'bet')
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const totalWonSum = filteredList
    .filter((t) => t.type === 'win')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netProfit = totalWonSum - totalBetSum;

  const currentGameMeta = GAME_OPTIONS.find((g) => g.id === selectedGame) || GAME_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#0b0e17] text-white flex flex-col font-sans pb-20 select-none relative">
      {/* 1. TOP HEADER */}
      <header className="px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 bg-[#121624]/98 backdrop-blur-xl border-b border-[#f5c443]/20 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-[#1a2033] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="text-center">
          <h1 className="font-extrabold text-base text-white tracking-wide flex items-center justify-center gap-1.5">
            <Gamepad2 className="w-4 h-4 text-[#f5c443]" />
            <span>Game History</span>
          </h1>
          <span className="text-[10px] text-zinc-400 font-mono">
            {currentGameMeta.name} Record
          </span>
        </div>

        <button
          onClick={fetchGameHistory}
          className="w-9 h-9 rounded-xl bg-[#1a2033] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
          title="Refresh History"
        >
          <RefreshCw className={`w-4 h-4 text-[#f5c443] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* 2. GAME SELECTOR & STATUS FILTERS */}
      <div className="px-4 pt-3.5 pb-2 space-y-2.5 relative z-20">
        {/* Horizontal Game Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GAME_OPTIONS.map((g) => {
            const isSelected = selectedGame === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGame(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#f5c443] to-[#d49c26] text-black font-black border-amber-300 shadow-md scale-102'
                    : 'bg-[#151928] text-zinc-300 border-white/10 hover:border-white/20'
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Filters: [ Status: All/Win/Bet ] & [ Date Picker ] */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
              }}
              className="w-full h-9 px-3 bg-[#151928] border border-white/10 rounded-xl flex items-center justify-between text-xs font-bold text-zinc-200 hover:border-[#f5c443]/50 transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#f5c443]" />
                <span className="capitalize">
                  {statusFilter === 'all' ? 'All Results' : statusFilter === 'win' ? 'Only Wins' : 'Only Bets'}
                </span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {showStatusDropdown && (
              <div className="absolute top-10 left-0 right-0 bg-[#171c2d] border border-[#f5c443]/40 rounded-xl shadow-2xl overflow-hidden divide-y divide-white/5 z-30 animate-fadeIn">
                {[
                  { label: 'All Results', value: 'all' },
                  { label: 'Won (Green)', value: 'win' },
                  { label: 'Placed Bets', value: 'bet' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value as any);
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full py-2 px-3 text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      statusFilter === opt.value
                        ? 'bg-[#f5c443] text-black font-black'
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {statusFilter === opt.value && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="relative">
            <div className="w-full h-9 px-3 bg-[#151928] border border-white/10 rounded-xl flex items-center justify-between text-xs font-bold text-zinc-200">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-zinc-300 truncate font-mono">
                  {selectedDate || 'Choose Date'}
                </span>
              </span>
              {selectedDate ? (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-xs text-rose-400 hover:text-rose-300 p-0.5 font-bold cursor-pointer"
                >
                  ✕
                </button>
              ) : (
                <input
                  type="date"
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUMMARY STATS CARDS */}
      <div className="px-4 py-2">
        <div className="bg-gradient-to-br from-[#1b2238] via-[#141829] to-[#0e1220] border border-[#f5c443]/30 rounded-2xl p-3.5 shadow-lg grid grid-cols-3 gap-2 text-center">
          {/* Total Played */}
          <div className="p-2 bg-black/30 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Total Bet</span>
            <span className="text-xs sm:text-sm font-black font-mono text-zinc-200 mt-0.5 block">
              ₹{totalBetSum.toFixed(2)}
            </span>
          </div>

          {/* Total Won */}
          <div className="p-2 bg-black/30 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Total Win</span>
            <span className="text-xs sm:text-sm font-black font-mono text-emerald-400 mt-0.5 block">
              ₹{totalWonSum.toFixed(2)}
            </span>
          </div>

          {/* Net Profit */}
          <div className="p-2 bg-black/30 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">Net P&L</span>
            <span
              className={`text-xs sm:text-sm font-black font-mono mt-0.5 block ${
                netProfit >= 0 ? 'text-[#f5c443]' : 'text-rose-400'
              }`}
            >
              {netProfit >= 0 ? `+₹${netProfit.toFixed(2)}` : `-₹${Math.abs(netProfit).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. HISTORY RECORDS LIST */}
      <div className="flex-1 px-4 py-2 space-y-2.5">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-[#f5c443] animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Loading game betting records...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-[#131726]/60 rounded-2xl border border-white/5 mx-auto p-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-2xl">
              📭
            </div>
            <div className="text-sm font-bold text-zinc-300">No Betting History Found</div>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              You have not placed any bets for {currentGameMeta.name} yet or no records match the selected filters.
            </p>
          </div>
        ) : (
          filteredList.map((item, idx) => {
            const isWin = item.type === 'win' || item.amount > 0;
            const gameId = getTransactionGame(item);
            const gameMeta = GAME_OPTIONS.find((g) => g.id === gameId) || GAME_OPTIONS[0];

            return (
              <div
                key={item.id || idx}
                className={`p-3.5 rounded-2xl border transition shadow-md flex items-center justify-between ${
                  isWin
                    ? 'bg-[#0f1d19] border-emerald-500/40 hover:border-emerald-400'
                    : 'bg-[#141828] border-white/10 hover:border-[#f5c443]/30'
                }`}
              >
                {/* Left details */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-base border shadow-sm ${
                      isWin
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-[#1c2236] border-white/10 text-zinc-400'
                    }`}
                  >
                    {isWin ? '🏆' : gameMeta.icon}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white capitalize">
                        {gameMeta.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                          isWin
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/10 text-zinc-400'
                        }`}
                      >
                        {isWin ? 'WIN' : 'BET PLACED'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                      {item.note || item.description || item.reference || `${isWin ? 'Winnings credited' : 'Round stake placed'}`}
                    </p>

                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })
                        : 'Just now'}
                    </div>
                  </div>
                </div>

                {/* Right Amount */}
                <div className="text-right font-mono">
                  <div
                    className={`text-sm sm:text-base font-black ${
                      isWin ? 'text-emerald-400' : 'text-zinc-200'
                    }`}
                  >
                    {isWin ? `+₹${item.amount.toFixed(2)}` : `-₹${Math.abs(item.amount).toFixed(2)}`}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {isWin ? 'Gross Payout' : 'Stake'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
