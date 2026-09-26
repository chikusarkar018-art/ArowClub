import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { GameType, GamePeriod, Bet } from '../../types.js';
import { TimerView } from '../common/TimerView.js';
import { BallView } from '../common/BallView.js';
import { GAME_TYPE_LABELS, BALL_ASSETS } from '../../constants/assets.js';
import {
  Gamepad2, Clock, DollarSign, Layers, Users, TrendingUp,
  ShieldAlert, RefreshCw, BarChart2, Shield
} from 'lucide-react';

export const WingoGameDashboardView: React.FC<{ onNavigateToControl?: () => void }> = ({
  onNavigateToControl,
}) => {
  const [selectedGameType, setSelectedGameType] = useState<GameType>('wingo_30s');
  const [gameData, setGameData] = useState<{
    period: GamePeriod & { remainingSeconds: number; isLocked: boolean };
    bets: Bet[];
    stats: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLiveGame = async () => {
    try {
      const res = await api.getAdminLiveGame(selectedGameType);
      if (res?.period) {
        setGameData(res);
      }
    } catch (err) {
      console.error('Failed to fetch admin live game', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveGame();
    const interval = setInterval(fetchLiveGame, 1000); // 1s live poll
    return () => clearInterval(interval);
  }, [selectedGameType]);

  const gameTypes: { type: GameType; label: string; duration: string }[] = [
    { type: 'wingo_30s', label: 'Win Go 30s', duration: '30 sec' },
    { type: 'wingo_1m', label: 'Win Go 1Min', duration: '1 min' },
    { type: 'wingo_3m', label: 'Win Go 3Min', duration: '3 min' },
    { type: 'wingo_5m', label: 'Win Go 5Min', duration: '5 min' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Game Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] border border-[#26262a] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wide">Live Wingo Game Control Monitor</h2>
            <p className="text-xs text-[#71717a]">Real-time synchronized countdown, active bet pool volume, and potential payouts.</p>
          </div>
        </div>

        {/* 4 Game Buttons */}
        <div className="grid grid-cols-2 sm:flex bg-[#0a0a0b] p-1 rounded-lg border border-[#26262a] gap-1">
          {gameTypes.map(g => (
            <button
              key={g.type}
              onClick={() => setSelectedGameType(g.type)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center ${
                selectedGameType === g.type
                  ? 'bg-[#d4af37] text-black shadow-md'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#1a1a1e]'
              }`}
            >
              <span>{g.label}</span>
              <span className="text-[10px] opacity-75 font-normal">{g.duration}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Live Game Card */}
      {gameData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Round Status & Timer */}
          <div className="bg-[#121215] border border-[#26262a] rounded-xl p-5 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#d4af37] uppercase tracking-wider block">
                  {GAME_TYPE_LABELS[selectedGameType]}
                </span>
                <div className="font-mono text-base font-bold text-white mt-0.5">
                  Period #{gameData.period.periodId}
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  gameData.period.isLocked
                    ? 'bg-rose-950/60 text-rose-400 border-rose-800 animate-pulse'
                    : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                }`}
              >
                {gameData.period.isLocked ? 'Betting Locked (5s)' : 'Betting Open'}
              </div>
            </div>

            {/* Official Timer with Active/Inactive Timer Asset */}
            <div className="py-6 flex flex-col items-center justify-center bg-[#0a0a0b] border border-[#26262a] rounded-xl">
              <TimerView
                remainingSeconds={gameData.period.remainingSeconds}
                isLocked={gameData.period.isLocked}
                size="lg"
              />

              {gameData.period.manualResultNumber !== null && gameData.period.manualResultNumber !== undefined && (
                <div className="mt-4 px-3 py-1 bg-[#d4af37]/20 border border-[#d4af37]/40 rounded-lg text-[#d4af37] text-xs font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Manual Override Ball: #{gameData.period.manualResultNumber}</span>
                </div>
              )}
            </div>

            {/* Round Summary Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-lg">
                <div className="text-[#71717a] text-[10px]">Total Bets</div>
                <div className="font-bold text-white font-mono text-sm">{gameData.stats.totalBets}</div>
              </div>
              <div className="p-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-lg">
                <div className="text-[#71717a] text-[10px]">Total Pool</div>
                <div className="font-bold text-emerald-400 font-mono text-sm">₹{gameData.stats.totalAmount}</div>
              </div>
              <div className="p-2.5 bg-[#0a0a0b] border border-[#26262a] rounded-lg">
                <div className="text-[#71717a] text-[10px]">Max Payout</div>
                <div className="font-bold text-[#d4af37] font-mono text-sm">₹{gameData.period.totalPotentialPayout}</div>
              </div>
            </div>
          </div>

          {/* Center & Right: Live Pool Volume Breakdown on Colors, Big/Small, & Numbers 0-9 */}
          <div className="lg:col-span-2 bg-[#121215] border border-[#26262a] rounded-xl p-5 space-y-5">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#d4af37]" />
              <span>Live Betting Volume Distribution (Period #{gameData.period.periodId})</span>
            </h3>

            {/* Color Distribution */}
            <div>
              <div className="text-xs font-semibold text-[#a1a1aa] mb-2">Colors Breakdown</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-center">
                  <div className="text-xs font-bold text-emerald-400 uppercase">Green (1, 3, 7, 9, 5)</div>
                  <div className="text-base font-bold text-white font-mono mt-1">₹{gameData.stats.colorBets.green}</div>
                </div>
                <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg text-center">
                  <div className="text-xs font-bold text-purple-400 uppercase">Violet (0, 5)</div>
                  <div className="text-base font-bold text-white font-mono mt-1">₹{gameData.stats.colorBets.violet}</div>
                </div>
                <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-lg text-center">
                  <div className="text-xs font-bold text-rose-400 uppercase">Red (2, 4, 6, 8, 0)</div>
                  <div className="text-base font-bold text-white font-mono mt-1">₹{gameData.stats.colorBets.red}</div>
                </div>
              </div>
            </div>

            {/* Big / Small Distribution */}
            <div>
              <div className="text-xs font-semibold text-[#a1a1aa] mb-2">Size Breakdown</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#d4af37] uppercase">Big (5–9)</span>
                    <div className="text-[11px] text-[#71717a]">2x Payout</div>
                  </div>
                  <div className="text-base font-bold text-white font-mono">₹{gameData.stats.sizeBets.big}</div>
                </div>
                <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-400 uppercase">Small (0–4)</span>
                    <div className="text-[11px] text-[#71717a]">2x Payout</div>
                  </div>
                  <div className="text-base font-bold text-white font-mono">₹{gameData.stats.sizeBets.small}</div>
                </div>
              </div>
            </div>

            {/* Number Balls 0-9 Distribution using Exact Ball Assets */}
            <div>
              <div className="text-xs font-semibold text-[#a1a1aa] mb-2">0–9 Number Balls Distribution (9x Payout)</div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {gameData.stats.numberBets.map((item: any) => (
                  <div
                    key={item.number}
                    className="p-2 bg-[#0a0a0b] border border-[#26262a] rounded-lg flex flex-col items-center justify-center text-center space-y-1 hover:border-[#d4af37]/40 transition"
                  >
                    <BallView number={item.number} size="sm" />
                    <div className="font-mono text-[11px] font-bold text-emerald-400">
                      ₹{item.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Bets Stream in Current Period */}
      <div className="bg-[#121215] border border-[#26262a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-sm">Active Bets in Current Round ({gameData?.bets.length || 0})</h3>
          <span className="text-xs text-[#71717a]">Auto-refreshing live stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0a0b] text-[#71717a] uppercase tracking-wider font-semibold border-b border-[#26262a]">
              <tr>
                <th className="py-2.5 px-3">Bet ID</th>
                <th className="py-2.5 px-3">UID / Player</th>
                <th className="py-2.5 px-3">Selection</th>
                <th className="py-2.5 px-3">Unit Amount</th>
                <th className="py-2.5 px-3">Multiplier</th>
                <th className="py-2.5 px-3">Total Bet</th>
                <th className="py-2.5 px-3">Potential Win</th>
                <th className="py-2.5 px-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262a]">
              {!gameData?.bets || gameData.bets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#71717a]">
                    No bets placed yet in this round. Players are selecting numbers...
                  </td>
                </tr>
              ) : (
                gameData.bets.map(b => (
                  <tr key={b.id} className="hover:bg-[#1a1a1e]/50">
                    <td className="py-2.5 px-3 font-mono text-[#71717a]">{b.id}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-white font-bold">{b.username}</span>
                      <span className="font-mono text-[11px] text-[#d4af37] ml-1.5">(UID: {b.uid})</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {b.betType === 'number' ? (
                        <div className="flex items-center gap-1.5">
                          <BallView number={parseInt(String(b.selection), 10)} size="xs" />
                          <span className="font-bold text-white">Ball #{b.selection}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded uppercase font-bold text-[11px] bg-[#1a1a1e] text-white border border-[#26262a]">
                          {b.selection}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#a1a1aa]">₹{b.amount}</td>
                    <td className="py-2.5 px-3 font-mono text-[#d4af37] font-bold">{b.multiplier}x</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">₹{b.totalAmount}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#d4af37]">
                      ₹{b.betType === 'number' ? b.totalAmount * 9 : b.totalAmount * 2}
                    </td>
                    <td className="py-2.5 px-3 text-[#71717a]">{new Date(b.createdAt).toLocaleTimeString()}</td>
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
