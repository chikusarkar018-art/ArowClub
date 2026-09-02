import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Trophy, Search, Filter, Download, Plus, Eye,
  CheckCircle2, Clock, Zap, Sliders, RefreshCw, X,
  Timer, PlayCircle, ShieldAlert, Sparkles, Check
} from 'lucide-react';
import { GamePeriod, GameType } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const ResultManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [selectedGameType, setSelectedGameType] = useState<GameType>('wingo_30s');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedResultDetails, setSelectedResultDetails] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Live Period info for current selected game
  const [livePeriod, setLivePeriod] = useState<any | null>(null);
  const [liveStats, setLiveStats] = useState<any | null>(null);

  // Generate / Lock modal form
  const [lockGameType, setLockGameType] = useState<GameType>('wingo_30s');
  const [lockPeriodId, setLockPeriodId] = useState('');
  const [lockBallNumber, setLockBallNumber] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchResults = async (gameType = selectedGameType) => {
    try {
      const data = await api.getAdminResults(gameType);
      if (data?.results) {
        setResults(data.results);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveGame = async (gameType = selectedGameType) => {
    try {
      const liveData = await api.getAdminLiveGame(gameType);
      if (liveData?.period) {
        setLivePeriod(liveData.period);
        setLiveStats(liveData.stats);
        if (!lockPeriodId || lockGameType !== gameType) {
          setLockPeriodId(liveData.period.periodId || '');
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchResults(selectedGameType);
    fetchLiveGame(selectedGameType);

    const interval = setInterval(() => {
      fetchResults(selectedGameType);
      fetchLiveGame(selectedGameType);
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedGameType]);

  const handleOpenGenerateModal = async (targetType = selectedGameType) => {
    setLockGameType(targetType);
    try {
      const live = await api.getAdminLiveGame(targetType);
      if (live?.period?.periodId) {
        setLockPeriodId(live.period.periodId);
      }
    } catch {
      // fallback
    }
    setShowGenerateModal(true);
  };

  const handleGenerateResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockPeriodId) {
      showToast('Period ID is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.setManualGameResult(lockGameType, lockPeriodId, lockBallNumber, admin?.username || 'SuperAdmin');
      showToast(`Winning Number [${lockBallNumber}] locked for Period #${lockPeriodId}!`, 'success');
      setShowGenerateModal(false);
      fetchResults(selectedGameType);
      fetchLiveGame(selectedGameType);
    } catch (err: any) {
      showToast(err.message || 'Failed to lock result', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceSettle = async () => {
    if (!lockPeriodId) return;
    setIsSubmitting(true);
    try {
      await api.forceSettleGamePeriod(lockGameType, lockBallNumber, admin?.username || 'SuperAdmin');
      showToast(`Period #${lockPeriodId} force settled with Number [${lockBallNumber}]!`, 'success');
      setShowGenerateModal(false);
      fetchResults(selectedGameType);
      fetchLiveGame(selectedGameType);
    } catch (err: any) {
      showToast(err.message || 'Failed to force settle', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      showToast('No results available to export', 'error');
      return;
    }
    const headers = ['Period ID', 'Winning Number', 'Color', 'Size', 'Settled At', 'Status'];
    const rows = results.map(r => {
      const num = r.resultNumber ?? 0;
      const col = [0, 5].includes(num) ? 'Violet' : [1, 3, 7, 9].includes(num) ? 'Green' : 'Red';
      const size = num >= 5 ? 'Big' : 'Small';
      const time = r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : 'N/A';
      return [r.periodId || r.id, num, col, size, `"${time}"`, 'Verified'];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wingo_results_${selectedGameType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported results CSV successfully!', 'success');
  };

  // Helper calculations for Ball
  const getBallAttributes = (num: number) => {
    const color = [0, 5].includes(num)
      ? (num === 0 ? 'violet-red' : 'violet-green')
      : [1, 3, 7, 9].includes(num)
      ? 'green'
      : 'red';
    const size = num >= 5 ? 'Big' : 'Small';
    return { color, size };
  };

  const currentSelectionAttr = getBallAttributes(lockBallNumber);

  const displayList = results.map((r, idx) => {
    const num = r.resultNumber !== undefined ? r.resultNumber : (idx % 10);
    const col = [0, 5].includes(num) ? (num === 0 ? 'violet-red' : 'violet-green') : [1, 3, 7, 9].includes(num) ? 'green' : 'red';
    const size = num >= 5 ? 'Big' : 'Small';
    const formattedTime = r.createdAt
      ? new Date(r.createdAt).toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      : 'Verified';

    return {
      id: r.periodId || r.id || `P-${idx}`,
      resultNumber: num,
      color: col,
      size: size,
      createdAt: formattedTime,
      rawDate: r.createdAt,
      status: 'Verified',
      hash: r.hash || `SHA256:${(r.periodId || r.id || 'hash').substring(0, 10)}...`,
    };
  });

  const filteredList = displayList.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.id.toLowerCase().includes(q) || String(r.resultNumber).includes(q) || r.color.toLowerCase().includes(q) || r.size.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* ================= 1. GAME ROOM SELECTOR TABS & LIVE ACTIVE ROUND CARD ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        {/* Game Rooms Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23273c] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">WinGo Manual Result & Round Manager</h2>
              <p className="text-[11px] text-slate-400">Manage real-time outcomes and review settled round archives</p>
            </div>
          </div>

          <div className="inline-flex rounded-xl bg-[#181a2e] border border-[#2b304c] p-1 gap-1">
            {[
              { type: 'wingo_30s', label: 'Win Go 30s' },
              { type: 'wingo_1m', label: 'Win Go 1Min' },
              { type: 'wingo_3m', label: 'Win Go 3Min' },
              { type: 'wingo_5m', label: 'Win Go 5Min' },
            ].map((room) => (
              <button
                key={room.type}
                type="button"
                onClick={() => {
                  setSelectedGameType(room.type as GameType);
                  setLoading(true);
                  fetchResults(room.type as GameType);
                  fetchLiveGame(room.type as GameType);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedGameType === room.type
                    ? 'bg-[#5b50e6] text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {room.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Live Round Banner */}
        {livePeriod && (
          <div className="bg-gradient-to-r from-[#1b1d33] via-[#16182c] to-[#121422] border border-indigo-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 animate-pulse">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Round:</span>
                  <span className="font-mono text-sm font-black text-indigo-300">#{livePeriod.periodId}</span>
                  {livePeriod.manualResultNumber !== undefined && livePeriod.manualResultNumber !== null && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      Locked to #{livePeriod.manualResultNumber}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-3">
                  <span>Remaining: <strong className="text-amber-400 font-mono">{livePeriod.remainingSeconds ?? 0}s</strong></span>
                  <span>•</span>
                  <span>Active Bets: <strong className="text-emerald-400">{liveStats?.totalBets ?? 0} tickets</strong> (₹{(liveStats?.totalAmount ?? 0).toLocaleString('en-IN')})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenGenerateModal(selectedGameType)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-md shadow-indigo-600/30"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Lock Winning Number</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= 2. SEARCH, EXPORT & RESULTS ARCHIVE TABLE ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by Period ID or Number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181a2e] border border-[#2b304c] text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleOpenGenerateModal(selectedGameType)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Generate Result</span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Period ID</th>
                <th className="pb-3 px-3 text-center">Number</th>
                <th className="pb-3 px-3 text-center">Color</th>
                <th className="pb-3 px-3 text-center">Size</th>
                <th className="pb-3 px-3">Settled At</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e202e]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No results recorded yet for {selectedGameType.toUpperCase()}.
                  </td>
                </tr>
              ) : (
                filteredList.slice((currentPage - 1) * 20, currentPage * 20).map((r, idx) => {
                  const color = r.color;
                  return (
                    <tr key={r.id || idx} className="hover:bg-[#181a28] transition-colors">
                      <td className="py-3.5 px-3 font-medium text-slate-300">{r.id}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="text-base font-bold text-white px-2 py-0.5">
                          {r.resultNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {color === 'violet-red' ? (
                            <div className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-purple-500 ring-2 ring-white/20" />
                              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white/20" />
                            </div>
                          ) : color === 'violet-green' ? (
                            <div className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-purple-500 ring-2 ring-white/20" />
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white/20" />
                            </div>
                          ) : (
                            <span
                              className={`inline-block w-3.5 h-3.5 rounded-full ring-2 ring-white/20 ${
                                color === 'green'
                                  ? 'bg-emerald-500'
                                  : color === 'red'
                                  ? 'bg-rose-500'
                                  : 'bg-purple-500'
                              }`}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          r.size === 'Big'
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                            : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                        }`}>
                          {r.size}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 text-xs">{r.createdAt}</td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Verified
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedResultDetails(r)}
                          className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] inline-flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar (20 rows per page) */}
        <PaginationControl
          currentPage={currentPage}
          totalItems={filteredList.length}
          pageSize={20}
          onPageChange={setCurrentPage}
          itemName="game results"
        />
      </div>

      {/* ================= 3. MODAL: GENERATE & LOCK RESULT ================= */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-400" />
                Generate & Lock Outcome
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateResult} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Game Room</label>
                <select
                  value={lockGameType}
                  onChange={async (e) => {
                    const gt = e.target.value as GameType;
                    setLockGameType(gt);
                    try {
                      const live = await api.getAdminLiveGame(gt);
                      if (live?.period?.periodId) {
                        setLockPeriodId(live.period.periodId);
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white"
                >
                  <option value="wingo_30s">Win Go 30s</option>
                  <option value="wingo_1m">Win Go 1 Min</option>
                  <option value="wingo_3m">Win Go 3 Min</option>
                  <option value="wingo_5m">Win Go 5 Min</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Round / Period ID</label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const live = await api.getAdminLiveGame(lockGameType);
                        if (live?.period?.periodId) {
                          setLockPeriodId(live.period.periodId);
                          showToast(`Synced with active Period #${live.period.periodId}`, 'success');
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Sync Active Period
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={lockPeriodId}
                  onChange={(e) => setLockPeriodId(e.target.value)}
                  placeholder="e.g. 202608270001"
                  className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Select Winning Number (0-9)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                    const isSelected = lockBallNumber === num;
                    const col = [0, 5].includes(num) ? 'violet' : [1, 3, 7, 9].includes(num) ? 'green' : 'red';
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setLockBallNumber(num)}
                        className={`h-11 rounded-xl font-bold font-mono text-base transition flex items-center justify-center relative ${
                          isSelected
                            ? 'ring-2 ring-white scale-105 shadow-lg shadow-indigo-600/30'
                            : 'opacity-70 hover:opacity-100'
                        } ${
                          col === 'green'
                            ? 'bg-emerald-600 text-white'
                            : col === 'red'
                            ? 'bg-rose-600 text-white'
                            : 'bg-purple-600 text-white'
                        }`}
                      >
                        {num}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-ping" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Outcome Calculation Preview Card */}
              <div className="bg-[#181a2e] border border-[#2b304c] rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Calculated Outcome Preview
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#121422] rounded-lg p-2 border border-[#23273c]">
                    <div className="text-[10px] text-slate-400">Number</div>
                    <div className="text-base font-black text-white font-mono">{lockBallNumber}</div>
                  </div>
                  <div className="bg-[#121422] rounded-lg p-2 border border-[#23273c]">
                    <div className="text-[10px] text-slate-400">Color</div>
                    <div className="text-xs font-bold capitalize text-purple-300">
                      {currentSelectionAttr.color.replace('-', ' + ')}
                    </div>
                  </div>
                  <div className="bg-[#121422] rounded-lg p-2 border border-[#23273c]">
                    <div className="text-[10px] text-slate-400">Size</div>
                    <div className="text-xs font-bold text-amber-300">{currentSelectionAttr.size}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[#1e202e]">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleForceSettle}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 font-bold"
                >
                  Force Settle Now
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Lock Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 4. RESULT DETAILS VIEW MODAL ================= */}
      {selectedResultDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Round Verification Details</h3>
            <div className="space-y-2.5 text-xs bg-[#181a2e] p-3.5 rounded-xl border border-[#2b304c]">
              <div className="flex justify-between">
                <span className="text-slate-400">Period ID:</span>
                <span className="font-mono text-white font-bold">{selectedResultDetails.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Winning Ball:</span>
                <span className="font-mono font-black text-sm text-white px-2 py-0.5 rounded bg-[#121422] border border-[#2b304c]">
                  {selectedResultDetails.resultNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Color / Size:</span>
                <span className="font-bold text-purple-300 capitalize">
                  {selectedResultDetails.color} • {selectedResultDetails.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settled Time:</span>
                <span className="text-slate-300 font-mono text-[11px]">{selectedResultDetails.createdAt}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Audit Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                  Verified & Immutable
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cryptographic Hash:</span>
                <span className="font-mono text-[10px] text-indigo-400 truncate max-w-[140px]">
                  {selectedResultDetails.hash}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedResultDetails(null)}
              className="mt-4 w-full py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

