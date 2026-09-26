import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Gamepad2, Plus, Edit2, CheckCircle2, XCircle, Sliders,
  Sparkles, RefreshCw, AlertCircle, Trash2, X
} from 'lucide-react';
import { GameCatalogItem } from '../../types.js';

export const GameManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [games, setGames] = useState<GameCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState<GameCatalogItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formCategory, setFormCategory] = useState<'prediction' | 'casino' | 'crash' | 'table' | 'instant'>('prediction');
  const [formMinBet, setFormMinBet] = useState('10');
  const [formMaxBet, setFormMaxBet] = useState('50000');
  const [formRtp, setFormRtp] = useState('96.5');
  const [formCut, setFormCut] = useState('2.0');
  const [formOdds, setFormOdds] = useState('1:2');

  const fetchGames = async () => {
    try {
      const data = await api.getAdminGamesCatalog();
      if (data?.games) {
        setGames(data.games);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load game catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleToggle = async (gameKey: string) => {
    try {
      await api.toggleAdminGameCatalog(gameKey, admin?.username || 'SuperAdmin');
      showToast('Game status updated successfully', 'success');
      fetchGames();
    } catch (err: any) {
      showToast(err.message || 'Failed to update game status', 'error');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    try {
      await api.updateAdminGameCatalog(editingGame.gameKey, {
        minBet: Number(formMinBet),
        maxBet: Number(formMaxBet),
        rtp: Number(formRtp),
        houseCutPercent: Number(formCut),
        adminUsername: admin?.username || 'SuperAdmin',
      });
      showToast(`Settings updated for ${editingGame.name}`, 'success');
      setEditingGame(null);
      fetchGames();
    } catch (err: any) {
      showToast(err.message || 'Failed to update game', 'error');
    }
  };

  const openEditModal = (game: GameCatalogItem) => {
    setEditingGame(game);
    setFormMinBet(String(game.minBet || 10));
    setFormMaxBet(String(game.maxBet || 50000));
    setFormRtp(String(game.rtp || 96.5));
    setFormCut(String(game.houseCutPercent || 2.0));
  };

  const totalGames = games.length || 8;
  const activeGames = games.filter(g => g.status === 'active').length || 6;
  const inactiveGames = totalGames - activeGames;
  const totalPlayers = 12458;

  return (
    <div className="space-y-6">
      {/* ================= TOP 4 STAT CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Games */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Games</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">{totalGames}</div>
          </div>
        </div>

        {/* Card 2: Active Games */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Games</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{activeGames}</div>
          </div>
        </div>

        {/* Card 3: Inactive Games */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Inactive Games</div>
            <div className="text-2xl font-bold text-rose-400 font-mono mt-0.5">{inactiveGames}</div>
          </div>
        </div>

        {/* Card 4: Total Players */}
        <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Players</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">{totalPlayers.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* ================= ALL GAMES TABLE ================= */}
      <div className="bg-[#121422] border border-[#23273c] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm sm:text-base font-bold text-white">All Games</h3>
          <button
            onClick={() => {
              setEditingGame(games[0] || null);
              if (games[0]) openEditModal(games[0]);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Game</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e202e] text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Game Name</th>
                <th className="pb-3 px-3">Game Type</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Min Bet</th>
                <th className="pb-3 px-3">Max Bet</th>
                <th className="pb-3 px-3">Odds</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e202e]">
              {games.map((g) => {
                const isActive = g.status === 'active';
                return (
                  <tr key={g.id || g.gameKey} className="hover:bg-[#16182c]/40 transition">
                    <td className="py-3.5 px-3 font-semibold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      <span>{g.name}</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 capitalize">{g.category || 'Prediction'}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono">₹{g.minBet || 1}</td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono">₹{(g.maxBet || 10000).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono">1:2</td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => openEditModal(g)}
                          title="Edit Game Settings"
                          className="w-7 h-7 rounded-lg bg-[#181a2e] border border-[#2b304c] flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(g.gameKey)}
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= EDIT GAME MODAL ================= */}
      {editingGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#23273c] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Edit {editingGame.name}
              </h3>
              <button onClick={() => setEditingGame(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minimum Bet (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formMinBet}
                    onChange={(e) => setFormMinBet(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Maximum Bet (₹)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={formMaxBet}
                    onChange={(e) => setFormMaxBet(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target RTP %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="80"
                    max="99.9"
                    value={formRtp}
                    onChange={(e) => setFormRtp(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">House Edge Cut %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={formCut}
                    onChange={(e) => setFormCut(e.target.value)}
                    className="w-full bg-[#181a2e] border border-[#2b304c] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#1e202e]">
                <button
                  type="button"
                  onClick={() => setEditingGame(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42db] text-white font-bold"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
