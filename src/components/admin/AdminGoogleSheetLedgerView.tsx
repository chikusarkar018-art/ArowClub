import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, RefreshCw, Plus, Search, Filter,
  CheckCircle2, ArrowDownLeft, ArrowUpRight, Building2, Globe2,
  Trash2, Edit3, Check, X, Copy, ExternalLink, Sliders, ShieldCheck,
  Calendar, RotateCcw, AlertTriangle
} from 'lucide-react';
import { GoogleSheetDepositRow, GoogleSheetWithdrawalRow } from '../../types';
import { api } from '../../services/api';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminGoogleSheetLedgerView: React.FC<Props> = ({ showToast }) => {
  const [activeSheetTab, setActiveSheetTab] = useState<'deposits' | 'withdrawals' | 'date_wise' | 'summary' | 'webhook'>('deposits');
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<GoogleSheetDepositRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<GoogleSheetWithdrawalRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [stats, setStats] = useState<any>({
    totalApprovedDeposits: 0,
    totalApprovedWithdrawals: 0,
    netBalance: 0,
    totalDepositCount: 0,
    totalWithdrawalCount: 0,
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState('ALL');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  // Modals
  const [showAddDepositModal, setShowAddDepositModal] = useState(false);
  const [showAddWithdrawalModal, setShowAddWithdrawalModal] = useState(false);
  const [editingDepositRow, setEditingDepositRow] = useState<GoogleSheetDepositRow | null>(null);
  const [editingWithdrawalRow, setEditingWithdrawalRow] = useState<GoogleSheetWithdrawalRow | null>(null);
  const [newBankInput, setNewBankInput] = useState('');
  const [newPlatformInput, setNewPlatformInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // New deposit form
  const [newDepositForm, setNewDepositForm] = useState({
    tid: '',
    date: '',
    userId: '',
    amt: 1000,
    utr: '',
    accountDetails: 'SARKAR TRANSPORT',
    platform: 'AROWCLUB',
    bonus: 0,
  });

  // New withdrawal form
  const [newWithdrawalForm, setNewWithdrawalForm] = useState({
    tid: '',
    date: '',
    accountDetails: 'SARKAR TRANSPORT',
    utr: '',
    userId: '',
    amt: 500,
    status: 'DONE',
  });

  const fetchLedger = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await api.getGoogleSheetLedger();
      if (res?.success) {
        setDeposits(res.deposits || []);
        setWithdrawals(res.withdrawals || []);
        setBankAccounts(res.bankAccounts || []);
        setPlatforms(res.platforms || []);
        setWebhookUrl(res.webhookUrl || '');
        setStats(res.stats || {});
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load Google Sheet data', 'error');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleSyncExisting = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncExistingLedger();
      if (res?.success) {
        showToast(`Synced ${res.addedDeposits} deposits and ${res.addedWithdrawals} withdrawals into Sheet!`, 'success');
        fetchLedger(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetLedger = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetGoogleSheetLedger();
      if (res?.success) {
        showToast('पुरानी शीट बंद कर दी गई है! नया रिकॉर्ड CRN01D00000 से शुरू होगा।', 'success');
        setShowResetModal(false);
        fetchLedger(true);
      } else {
        showToast(res?.error || 'Reset failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reset ledger', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = editingDepositRow ? { ...editingDepositRow } : { ...newDepositForm };
      await api.saveGoogleSheetDeposit(payload);
      showToast('Deposit row saved to Google Sheet!', 'success');
      setShowAddDepositModal(false);
      setEditingDepositRow(null);
      fetchLedger(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to save deposit row', 'error');
    }
  };

  const handleDeleteDeposit = async (id: string) => {
    try {
      await api.deleteGoogleSheetDeposit(id);
      showToast('Deposit row deleted from sheet', 'info');
      fetchLedger(true);
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleSaveWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = editingWithdrawalRow ? { ...editingWithdrawalRow } : { ...newWithdrawalForm };
      await api.saveGoogleSheetWithdrawal(payload);
      showToast('Withdrawal row saved to Google Sheet!', 'success');
      setShowAddWithdrawalModal(false);
      setEditingWithdrawalRow(null);
      fetchLedger(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to save withdrawal row', 'error');
    }
  };

  const handleDeleteWithdrawal = async (id: string) => {
    try {
      await api.deleteGoogleSheetWithdrawal(id);
      showToast('Withdrawal row deleted from sheet', 'info');
      fetchLedger(true);
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleAddBank = async () => {
    const trimmed = newBankInput.trim().toUpperCase();
    if (!trimmed) return;
    if (bankAccounts.includes(trimmed)) {
      showToast('Bank already in list', 'info');
      return;
    }
    const updated = [...bankAccounts, trimmed];
    try {
      await api.updateGoogleSheetBanks(updated);
      setBankAccounts(updated);
      setNewBankInput('');
      showToast(`Added bank: ${trimmed}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update banks', 'error');
    }
  };

  const handleAddPlatform = async () => {
    const trimmed = newPlatformInput.trim().toUpperCase();
    if (!trimmed) return;
    if (platforms.includes(trimmed)) {
      showToast('Platform already in list', 'info');
      return;
    }
    const updated = [...platforms, trimmed];
    try {
      await api.updateGoogleSheetPlatforms(updated);
      setPlatforms(updated);
      setNewPlatformInput('');
      showToast(`Added platform: ${trimmed}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update platforms', 'error');
    }
  };

  const handleSaveWebhook = async () => {
    try {
      await api.saveGoogleSheetWebhook(webhookUrl);
      showToast('Google Sheet Webhook URL saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save webhook', 'error');
    }
  };

  // Export to CSV
  const exportToCsv = (type: 'deposits' | 'withdrawals') => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (type === 'deposits') {
      csvContent += 'TID,DATE,USER ID,AMT,UTR,ACCOUNT DETAILS,PLATFORM,BONUS,TOTAL,CUMULATIVE\n';
      deposits.forEach((r) => {
        csvContent += `"${r.tid}","${r.date}","${r.userId}",${r.amt},"${r.utr}","${r.accountDetails}","${r.platform}",${r.bonus},${r.total},${r.cumulative || ''}\n`;
      });
    } else {
      csvContent += 'TID,DATE,ACCOUNT DETAILS,UTR,USER ID,AMT,STATUS\n';
      withdrawals.forEach((r) => {
        csvContent += `"${r.tid}","${r.date}","${r.accountDetails}","${r.utr}","${r.userId}",${r.amt},"${r.status}"\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `google_sheet_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${type} spreadsheet CSV!`, 'success');
  };

  // Filtered deposits
  const filteredDeposits = deposits.filter((d) => {
    const matchSearch =
      !searchTerm ||
      d.tid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.utr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.accountDetails?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.platform?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBank = selectedBankFilter === 'ALL' || d.accountDetails === selectedBankFilter;
    const matchPlatform = selectedPlatformFilter === 'ALL' || d.platform === selectedPlatformFilter;
    const matchDate = !selectedDateFilter || d.date?.includes(selectedDateFilter);
    return matchSearch && matchBank && matchPlatform && matchDate;
  });

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchSearch =
      !searchTerm ||
      w.tid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.utr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.accountDetails?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBank = selectedBankFilter === 'ALL' || w.accountDetails === selectedBankFilter;
    const matchDate = !selectedDateFilter || w.date?.includes(selectedDateFilter);
    return matchSearch && matchBank && matchDate;
  });

  // Calculate totals
  const totalDepAmt = filteredDeposits.reduce((acc, r) => acc + Number(r.amt || 0), 0);
  const totalDepBonus = filteredDeposits.reduce((acc, r) => acc + Number(r.bonus || 0), 0);
  const totalDepSum = filteredDeposits.reduce((acc, r) => acc + Number(r.total || 0), 0);

  const totalWithAmt = filteredWithdrawals.reduce((acc, r) => acc + Math.abs(Number(r.amt || 0)), 0);

  // Date-wise calculation: group both deposits and withdrawals by date
  const allDates = Array.from(
    new Set([
      ...deposits.map((d) => d.date),
      ...withdrawals.map((w) => w.date),
    ])
  ).filter(Boolean);

  const dateWiseBreakdown = allDates
    .map((dStr) => {
      const dayDeps = deposits.filter((d) => d.date === dStr);
      const dayWiths = withdrawals.filter((w) => w.date === dStr);
      const depTotal = dayDeps.reduce((sum, d) => sum + Number(d.amt || 0), 0);
      const withTotal = dayWiths.reduce((sum, w) => sum + Math.abs(Number(w.amt || 0)), 0);
      const netDay = depTotal - withTotal;
      return {
        date: dStr,
        depositAmount: depTotal,
        depositCount: dayDeps.length,
        withdrawalAmount: withTotal,
        withdrawalCount: dayWiths.length,
        netBalance: netDay,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 pb-12">
      {/* Header with Google Sheets Branding */}
      <div className="bg-[#181820] border border-[#2b2b38] rounded-2xl p-4 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Google Sheet Financial Ledger
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Auto-Sync
                </span>
                <span className="bg-blue-500/20 text-blue-300 text-[11px] px-2 py-0.5 rounded-full font-semibold border border-blue-500/30">
                  Approved Transactions Only
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[11px] px-2 py-0.5 rounded-full font-mono font-bold border border-amber-500/30">
                  TID: CRN01D00000+
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Real-time synchronized Google Spreadsheet mirror. Only approved deposits and withdrawals appear here, mapped strictly to the designated Bank Account and Exchange.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Close previous ledger and start TID sequences from CRN01D00000"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Close & Start Fresh (CRN01D00000)</span>
            </button>
            <button
              onClick={handleSyncExisting}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#262632] hover:bg-[#323242] text-zinc-200 border border-[#3b3b4d] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              title="Sync any approved transactions from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Approved History'}</span>
            </button>
            <button
              onClick={() => exportToCsv(activeSheetTab === 'withdrawals' ? 'withdrawals' : 'deposits')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#262634]">
          <div className="bg-[#121218] border border-[#242432] rounded-xl p-3">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              Approved Deposits (Inflow)
            </span>
            <div className="text-lg font-mono font-black text-emerald-400 mt-1">
              ₹{Number(stats.totalApprovedDeposits || totalDepAmt).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-zinc-500">{deposits.length} approved entries</span>
          </div>

          <div className="bg-[#121218] border border-[#242432] rounded-xl p-3">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              Approved Withdrawals (Outflow)
            </span>
            <div className="text-lg font-mono font-black text-rose-400 mt-1">
              -₹{Number(stats.totalApprovedWithdrawals || totalWithAmt).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-zinc-500">{withdrawals.length} approved payouts</span>
          </div>

          <div className="bg-[#121218] border border-[#242432] rounded-xl p-3">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Net Bank Balance (Spread)
            </span>
            <div className={`text-lg font-mono font-black mt-1 ${((stats.totalApprovedDeposits || 0) - (stats.totalApprovedWithdrawals || 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{Number((stats.totalApprovedDeposits || 0) - (stats.totalApprovedWithdrawals || 0)).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-zinc-500">Net Ledger Surplus</span>
          </div>

          <div className="bg-[#121218] border border-[#242432] rounded-xl p-3">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Active Bank Accounts
            </span>
            <div className="text-lg font-mono font-black text-white mt-1">
              {bankAccounts.length} Banks
            </div>
            <span className="text-[10px] text-zinc-500 truncate block">
              {bankAccounts.slice(0, 2).join(', ')}{bankAccounts.length > 2 ? '...' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Google Sheet Tab Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-[#282836] bg-[#14141c] p-2 rounded-xl">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveSheetTab('deposits')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSheetTab === 'deposits'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e28]'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Deposit Sheet (Format 1)</span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px]">
              {deposits.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSheetTab('withdrawals')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSheetTab === 'withdrawals'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e28]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Withdrawal Sheet (Format 2)</span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px]">
              {withdrawals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSheetTab('date_wise')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSheetTab === 'date_wise'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e28]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Date-wise Breakdown (तारीख अनुसार दैनिक हिसाब)</span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px]">
              {dateWiseBreakdown.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSheetTab('summary')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSheetTab === 'summary'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e28]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bank & Exchange Breakdown</span>
          </button>

          <button
            onClick={() => setActiveSheetTab('webhook')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSheetTab === 'webhook'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1e1e28]'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Live Google Apps Script Sync</span>
          </button>
        </div>

        {/* Action Button for currently active tab */}
        {activeSheetTab === 'deposits' && (
          <button
            onClick={() => {
              const d = new Date();
              setNewDepositForm({
                tid: `CRN01D${Date.now().toString().slice(-5)}`,
                date: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
                userId: '',
                amt: 1000,
                utr: '',
                accountDetails: bankAccounts[0] || 'SARKAR TRANSPORT',
                platform: platforms[0] || 'AROWCLUB',
                bonus: 0,
              });
              setShowAddDepositModal(true);
            }}
            className="px-3 py-1.5 bg-[#252532] hover:bg-[#303040] text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Deposit Row</span>
          </button>
        )}

        {activeSheetTab === 'withdrawals' && (
          <button
            onClick={() => {
              const d = new Date();
              setNewWithdrawalForm({
                tid: `CRN01W${Date.now().toString().slice(-5)}`,
                date: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
                accountDetails: bankAccounts[0] || 'SARKAR TRANSPORT',
                utr: '62660' + Date.now().toString().slice(-7),
                userId: '',
                amt: 1000,
                status: 'DONE',
              });
              setShowAddWithdrawalModal(true);
            }}
            className="px-3 py-1.5 bg-[#252532] hover:bg-[#303040] text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Withdrawal Row</span>
          </button>
        )}
      </div>

      {/* Filter & Formula Bar */}
      {(activeSheetTab === 'deposits' || activeSheetTab === 'withdrawals') && (
        <div className="bg-[#161622] border border-[#262634] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search TID, User ID, UTR, Bank Account..."
                className="w-full bg-[#1e1e2b] border border-[#2e2e3f] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px]">Bank:</span>
              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="bg-[#1e1e2b] border border-[#2e2e3f] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-500 outline-none"
              >
                <option value="ALL">All Banks ({bankAccounts.length})</option>
                {bankAccounts.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {activeSheetTab === 'deposits' && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-[11px]">Platform:</span>
                <select
                  value={selectedPlatformFilter}
                  onChange={(e) => setSelectedPlatformFilter(e.target.value)}
                  className="bg-[#1e1e2b] border border-[#2e2e3f] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-emerald-500 outline-none"
                >
                  <option value="ALL">All Platforms ({platforms.length})</option>
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBankFilter('ALL');
                setSelectedPlatformFilter('ALL');
                setSelectedDateFilter('');
              }}
              className="text-zinc-400 hover:text-zinc-200 px-2 py-1 text-xs"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. DEPOSIT SHEET TAB (EXACT FORMAT FROM SCREENSHOT 1)    */}
      {/* Columns: TID | DATE | USER ID | AMT | UTR | ACCOUNT DETAILS | PLATFORM | BONUS | TOTAL | CUMULATIVE */}
      {/* ======================================================== */}
      {activeSheetTab === 'deposits' && (
        <div className="bg-[#121218] border border-[#242432] rounded-2xl overflow-hidden shadow-2xl">
          {/* Formula / Status Header */}
          <div className="bg-[#1a1a24] px-4 py-2 border-b border-[#292938] flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold bg-[#121218] px-2 py-0.5 rounded border border-[#292938]">fx</span>
              <span className="font-mono text-zinc-300">
                =SUM(D2:D{filteredDeposits.length + 1}) + SUM(H2:H{filteredDeposits.length + 1}) → Total Inflow: ₹{totalDepSum.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Showing {filteredDeposits.length} approved rows
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#191924] border-b border-[#2e2e40] text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center text-zinc-500 border-r border-[#262636]">#</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">TID</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">DATE</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">USER ID</th>
                  <th className="py-2.5 px-3 border-r border-[#262636] text-right">AMT</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">UTR</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">ACCOUNT DETAILS</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">PLATFORM</th>
                  <th className="py-2.5 px-3 border-r border-[#262636] text-right">BONUS</th>
                  <th className="py-2.5 px-3 border-r border-[#262636] text-right">TOTAL</th>
                  <th className="py-2.5 px-3 border-r border-[#262636] text-right">CUMULATIVE</th>
                  <th className="py-2.5 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2c] font-mono text-xs">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-zinc-500 font-sans">
                      No deposit records found in Google Sheet ledger matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-[#1a1a26] transition-colors group"
                    >
                      {/* Row number */}
                      <td className="py-2 px-3 text-center text-zinc-600 bg-[#161620] border-r border-[#222230] text-[10px]">
                        {idx + 1}
                      </td>

                      {/* TID */}
                      <td className="py-2 px-3 font-semibold text-emerald-400 border-r border-[#222230] whitespace-nowrap">
                        {row.tid}
                      </td>

                      {/* DATE */}
                      <td className="py-2 px-3 text-zinc-300 border-r border-[#222230] whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* USER ID */}
                      <td className="py-2 px-3 text-sky-400 font-bold border-r border-[#222230] whitespace-nowrap">
                        {row.userId}
                      </td>

                      {/* AMT */}
                      <td className="py-2 px-3 text-right font-black text-emerald-400 border-r border-[#222230]">
                        ₹{Number(row.amt).toLocaleString('en-IN')}
                      </td>

                      {/* UTR */}
                      <td className="py-2 px-3 text-zinc-300 border-r border-[#222230] whitespace-nowrap">
                        <span className="select-all">{row.utr}</span>
                      </td>

                      {/* ACCOUNT DETAILS */}
                      <td className="py-2 px-3 border-r border-[#222230] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1e2330] text-blue-300 border border-blue-500/20 text-[11px] font-sans font-bold">
                          <Building2 className="w-3 h-3 text-blue-400" />
                          {row.accountDetails || 'SARKAR TRANSPORT'}
                        </span>
                      </td>

                      {/* PLATFORM */}
                      <td className="py-2 px-3 border-r border-[#222230] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#282218] text-amber-300 border border-amber-500/20 text-[11px] font-sans font-bold">
                          <Globe2 className="w-3 h-3 text-amber-400" />
                          {row.platform || 'AROWCLUB'}
                        </span>
                      </td>

                      {/* BONUS */}
                      <td className="py-2 px-3 text-right text-zinc-400 border-r border-[#222230]">
                        {row.bonus ? `₹${row.bonus}` : '0'}
                      </td>

                      {/* TOTAL */}
                      <td className="py-2 px-3 text-right font-black text-white border-r border-[#222230]">
                        ₹{Number(row.total || (row.amt + (row.bonus || 0))).toLocaleString('en-IN')}
                      </td>

                      {/* CUMULATIVE */}
                      <td className="py-2 px-3 text-right text-zinc-400 border-r border-[#222230]">
                        {row.cumulative ? `₹${Number(row.cumulative).toLocaleString('en-IN')}` : '-'}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingDepositRow(row)}
                            className="p-1 hover:bg-[#282838] rounded text-zinc-400 hover:text-emerald-400 transition-colors"
                            title="Edit row"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeposit(row.id)}
                            className="p-1 hover:bg-[#282838] rounded text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Total Footer Row (Google Sheet style) */}
              {filteredDeposits.length > 0 && (
                <tfoot>
                  <tr className="bg-[#171724] border-t-2 border-[#36364a] text-xs font-bold">
                    <td colSpan={4} className="py-3 px-3 text-right text-zinc-300 font-sans border-r border-[#262636]">
                      TOTAL DEPOSITS ({filteredDeposits.length} rows):
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 border-r border-[#262636]">
                      ₹{totalDepAmt.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={3} className="py-3 px-3 border-r border-[#262636]" />
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-400 border-r border-[#262636]">
                      ₹{totalDepBonus.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-white border-r border-[#262636]">
                      ₹{totalDepSum.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. WITHDRAWAL SHEET TAB (EXACT FORMAT FROM SCREENSHOT 2)  */}
      {/* Columns: TID | DATE | ACCOUNT DETAILS | UTR | USER ID | AMT | STATUS */}
      {/* ======================================================== */}
      {activeSheetTab === 'withdrawals' && (
        <div className="bg-[#121218] border border-[#242432] rounded-2xl overflow-hidden shadow-2xl">
          {/* Formula / Status Header */}
          <div className="bg-[#1a1a24] px-4 py-2 border-b border-[#292938] flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-mono text-rose-400 font-bold bg-[#121218] px-2 py-0.5 rounded border border-[#292938]">fx</span>
              <span className="font-mono text-zinc-300">
                =SUM(F2:F{filteredWithdrawals.length + 1}) → Total Outflow: -₹{totalWithAmt.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Showing {filteredWithdrawals.length} approved payouts
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#191924] border-b border-[#2e2e40] text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center text-zinc-500 border-r border-[#262636]">#</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">TID</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">DATE</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">ACCOUNT DETAILS</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">UTR</th>
                  <th className="py-2.5 px-3 border-r border-[#262636]">USER ID</th>
                  <th className="py-2.5 px-3 border-r border-[#262636] text-right">AMT</th>
                  <th className="py-2.5 px-3 border-r border-[#262636] text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2c] font-mono text-xs">
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500 font-sans">
                      No withdrawal records found in Google Sheet ledger matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-[#1a1a26] transition-colors group"
                    >
                      {/* Row number */}
                      <td className="py-2 px-3 text-center text-zinc-600 bg-[#161620] border-r border-[#222230] text-[10px]">
                        {idx + 1}
                      </td>

                      {/* TID */}
                      <td className="py-2 px-3 font-semibold text-sky-400 border-r border-[#222230] whitespace-nowrap">
                        {row.tid}
                      </td>

                      {/* DATE */}
                      <td className="py-2 px-3 text-zinc-300 border-r border-[#222230] whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* ACCOUNT DETAILS */}
                      <td className="py-2 px-3 border-r border-[#222230] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1e2330] text-blue-300 border border-blue-500/20 text-[11px] font-sans font-bold">
                          <Building2 className="w-3 h-3 text-blue-400" />
                          {row.accountDetails || 'SARKAR TRANSPORT'}
                        </span>
                      </td>

                      {/* UTR */}
                      <td className="py-2 px-3 text-zinc-300 border-r border-[#222230] whitespace-nowrap">
                        <span className="select-all">{row.utr}</span>
                      </td>

                      {/* USER ID */}
                      <td className="py-2 px-3 text-sky-400 font-bold border-r border-[#222230] whitespace-nowrap">
                        {row.userId}
                      </td>

                      {/* AMT (Negative in red matching screenshot 2) */}
                      <td className="py-2 px-3 text-right font-black text-rose-400 border-r border-[#222230]">
                        {Number(row.amt) < 0 ? `-₹${Math.abs(Number(row.amt)).toLocaleString('en-IN')}` : `₹${Number(row.amt).toLocaleString('en-IN')}`}
                      </td>

                      {/* STATUS (Bright green DONE badge) */}
                      <td className="py-2 px-3 text-center border-r border-[#222230]">
                        <span className="inline-block px-2 py-0.5 rounded font-black text-[11px] bg-emerald-500 text-black tracking-wider shadow-sm">
                          {row.status || 'DONE'}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingWithdrawalRow(row)}
                            className="p-1 hover:bg-[#282838] rounded text-zinc-400 hover:text-emerald-400 transition-colors"
                            title="Edit row"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWithdrawal(row.id)}
                            className="p-1 hover:bg-[#282838] rounded text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Total Footer Row */}
              {filteredWithdrawals.length > 0 && (
                <tfoot>
                  <tr className="bg-[#171724] border-t-2 border-[#36364a] text-xs font-bold">
                    <td colSpan={6} className="py-3 px-3 text-right text-zinc-300 font-sans border-r border-[#262636]">
                      TOTAL WITHDRAWALS ({filteredWithdrawals.length} payouts):
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-400 border-r border-[#262636]">
                      -₹{totalWithAmt.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2.5 DATE-WISE BREAKDOWN TAB (तारीख अनुसार दैनिक हिसाब)    */}
      {/* ======================================================== */}
      {activeSheetTab === 'date_wise' && (
        <div className="bg-[#14141c] border border-[#262636] rounded-2xl p-4 md:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252535] pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Date-wise Financial Calculation (तारीख अनुसार दैनिक हिसाब)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Every date's approved deposit inflow, withdrawal outflow, and day balance calculated automatically.
              </p>
            </div>
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter('')}
                className="px-3 py-1.5 bg-[#252535] hover:bg-[#323246] text-zinc-200 text-xs rounded-lg flex items-center gap-1.5 self-start cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear Date Filter: {selectedDateFilter}</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#262636] text-zinc-400 font-bold bg-[#181824]">
                  <th className="py-3 px-3">DATE (तारीख)</th>
                  <th className="py-3 px-3 text-right">APPROVED DEPOSIT (इनफ्लो)</th>
                  <th className="py-3 px-3 text-center">DEPOSIT COUNT</th>
                  <th className="py-3 px-3 text-right">APPROVED WITHDRAWAL (आउटफ्लो)</th>
                  <th className="py-3 px-3 text-center">WITHDRAWAL COUNT</th>
                  <th className="py-3 px-3 text-right">NET DAY BALANCE (शुद्ध मुनाफा/बैलेंस)</th>
                  <th className="py-3 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20202e]">
                {dateWiseBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">
                      No transaction records found yet. All approved deposits and withdrawals will appear here date-wise.
                    </td>
                  </tr>
                ) : (
                  dateWiseBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-[#1a1a26] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {row.date}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        ₹{row.depositAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center text-zinc-300 font-mono">
                        {row.depositCount}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                        -₹{row.withdrawalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center text-zinc-300 font-mono">
                        {row.withdrawalCount}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-extrabold ${row.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.netBalance >= 0 ? `+₹${row.netBalance.toLocaleString('en-IN')}` : `-₹${Math.abs(row.netBalance).toLocaleString('en-IN')}`}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedDateFilter(row.date);
                            setActiveSheetTab('deposits');
                          }}
                          className="px-2.5 py-1 bg-[#222232] hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        >
                          View Entries
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SUMMARY & BANK RECONCILIATION TAB                     */}
      {/* ======================================================== */}
      {activeSheetTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Bank-wise Breakdown */}
          <div className="bg-[#161622] border border-[#272738] rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base">Bank Account Inflow & Outflow</h3>
              </div>
              <span className="text-xs text-zinc-400">Reconciled</span>
            </div>

            <div className="space-y-3">
              {bankAccounts.map((bank) => {
                const bankDeposits = deposits.filter((d) => d.accountDetails === bank);
                const bankWithdrawals = withdrawals.filter((w) => w.accountDetails === bank);
                const depSum = bankDeposits.reduce((s, d) => s + Number(d.amt || 0), 0);
                const withSum = bankWithdrawals.reduce((s, w) => s + Math.abs(Number(w.amt || 0)), 0);
                const net = depSum - withSum;

                return (
                  <div key={bank} className="bg-[#1b1b26] border border-[#2b2b3b] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{bank}</span>
                      <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${net >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        Net: ₹{net.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-[#121218] p-2 rounded-lg">
                        <span className="text-zinc-500 block text-[10px]">Total Received:</span>
                        <span className="text-emerald-400 font-bold">₹{depSum.toLocaleString('en-IN')}</span>
                        <span className="text-zinc-500 text-[10px] ml-1">({bankDeposits.length} tx)</span>
                      </div>
                      <div className="bg-[#121218] p-2 rounded-lg">
                        <span className="text-zinc-500 block text-[10px]">Total Paid Out:</span>
                        <span className="text-rose-400 font-bold">-₹{withSum.toLocaleString('en-IN')}</span>
                        <span className="text-zinc-500 text-[10px] ml-1">({bankWithdrawals.length} tx)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Bank input */}
            <div className="pt-2 border-t border-[#262636] flex items-center gap-2">
              <input
                type="text"
                value={newBankInput}
                onChange={(e) => setNewBankInput(e.target.value)}
                placeholder="Add new Bank Account name (e.g. AXIS BANK)..."
                className="flex-1 bg-[#1b1b26] border border-[#2e2e3f] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleAddBank}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add Bank
              </button>
            </div>
          </div>

          {/* Platform / Exchange Breakdown */}
          <div className="bg-[#161622] border border-[#272738] rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <Globe2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base">Exchange & Platform Breakdown</h3>
              </div>
              <span className="text-xs text-zinc-400">Total Volume</span>
            </div>

            <div className="space-y-3">
              {platforms.map((plat) => {
                const platDeposits = deposits.filter((d) => d.platform === plat);
                const sum = platDeposits.reduce((s, d) => s + Number(d.amt || 0), 0);
                const bonusSum = platDeposits.reduce((s, d) => s + Number(d.bonus || 0), 0);

                return (
                  <div key={plat} className="bg-[#1b1b26] border border-[#2b2b3b] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-sm">{plat}</span>
                      <span className="text-xs font-mono font-bold text-zinc-300">
                        {platDeposits.length} deposits
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-[#121218] p-2 rounded-lg">
                        <span className="text-zinc-500 block text-[10px]">Volume:</span>
                        <span className="text-emerald-400 font-bold">₹{sum.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-[#121218] p-2 rounded-lg">
                        <span className="text-zinc-500 block text-[10px]">Bonus Given:</span>
                        <span className="text-amber-400 font-bold">₹{bonusSum.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Platform input */}
            <div className="pt-2 border-t border-[#262636] flex items-center gap-2">
              <input
                type="text"
                value={newPlatformInput}
                onChange={(e) => setNewPlatformInput(e.target.value)}
                placeholder="Add new Exchange / Platform (e.g. SKY EXCH)..."
                className="flex-1 bg-[#1b1b26] border border-[#2e2e3f] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
              />
              <button
                onClick={handleAddPlatform}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add Platform
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. LIVE GOOGLE APPS SCRIPT WEBHOOK CONFIG                */}
      {/* ======================================================== */}
      {activeSheetTab === 'webhook' && (
        <div className="bg-[#161622] border border-[#272738] rounded-2xl p-6 space-y-6 shadow-xl max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Live Google Sheets Webhook Integration
              </h3>
              <p className="text-xs text-zinc-400">
                You can optionally link your own personal Google Sheet via Google Apps Script Webhook so every approved transaction directly writes a row into your Google Drive spreadsheet!
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 block">
              Google Apps Script Webhook URL (Optional):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-[#1c1c28] border border-[#2e2e42] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleSaveWebhook}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Save Webhook
              </button>
            </div>
          </div>

          {/* Quick Copy Script for Google Sheet */}
          <div className="bg-[#121218] border border-[#262636] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">
                Google Apps Script (paste into your Google Sheet → Extensions → Apps Script):
              </span>
              <button
                onClick={() => {
                  const script = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (data.type === 'deposit') {
    var sheet = ss.getSheetByName("Deposits") || ss.getActiveSheet();
    sheet.appendRow([data.tid, data.date, data.userId, data.amt, data.utr, data.accountDetails, data.platform, data.bonus, data.total]);
  } else if (data.type === 'withdrawal') {
    var sheet = ss.getSheetByName("Withdrawals") || ss.getActiveSheet();
    sheet.appendRow([data.tid, data.date, data.accountDetails, data.utr, data.userId, data.amt, data.status]);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}`;
                  navigator.clipboard.writeText(script);
                  showToast('Google Apps Script copied to clipboard!', 'success');
                }}
                className="px-2.5 py-1 bg-[#222230] hover:bg-[#2c2c3e] text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Script</span>
              </button>
            </div>
            <pre className="bg-[#0b0b10] p-3 rounded-lg text-[11px] text-zinc-400 font-mono overflow-x-auto">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (data.type === 'deposit') {
    var sheet = ss.getSheetByName("Deposits") || ss.getActiveSheet();
    sheet.appendRow([data.tid, data.date, data.userId, data.amt, data.utr, data.accountDetails, data.platform, data.bonus, data.total]);
  } else if (data.type === 'withdrawal') {
    var sheet = ss.getSheetByName("Withdrawals") || ss.getActiveSheet();
    sheet.appendRow([data.tid, data.date, data.accountDetails, data.utr, data.userId, data.amt, data.status]);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "success" }));
}`}
            </pre>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT DEPOSIT ROW MODAL                             */}
      {/* ======================================================== */}
      {(showAddDepositModal || editingDepositRow) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a24] border border-[#2f2f42] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#282838] pb-3">
              <h3 className="font-bold text-white text-base">
                {editingDepositRow ? 'Edit Deposit Row' : 'Add New Deposit Row'}
              </h3>
              <button
                onClick={() => {
                  setShowAddDepositModal(false);
                  setEditingDepositRow(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeposit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">TID</label>
                  <input
                    type="text"
                    value={editingDepositRow ? editingDepositRow.tid : newDepositForm.tid}
                    onChange={(e) =>
                      editingDepositRow
                        ? setEditingDepositRow({ ...editingDepositRow, tid: e.target.value })
                        : setNewDepositForm({ ...newDepositForm, tid: e.target.value })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Date (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={editingDepositRow ? editingDepositRow.date : newDepositForm.date}
                    onChange={(e) =>
                      editingDepositRow
                        ? setEditingDepositRow({ ...editingDepositRow, date: e.target.value })
                        : setNewDepositForm({ ...newDepositForm, date: e.target.value })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">User ID / Username</label>
                  <input
                    type="text"
                    value={editingDepositRow ? editingDepositRow.userId : newDepositForm.userId}
                    onChange={(e) =>
                      editingDepositRow
                        ? setEditingDepositRow({ ...editingDepositRow, userId: e.target.value })
                        : setNewDepositForm({ ...newDepositForm, userId: e.target.value })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Deposit Amt (₹)</label>
                  <input
                    type="number"
                    value={editingDepositRow ? editingDepositRow.amt : newDepositForm.amt}
                    onChange={(e) =>
                      editingDepositRow
                        ? setEditingDepositRow({ ...editingDepositRow, amt: Number(e.target.value) })
                        : setNewDepositForm({ ...newDepositForm, amt: Number(e.target.value) })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Bank UTR</label>
                <input
                  type="text"
                  value={editingDepositRow ? editingDepositRow.utr : newDepositForm.utr}
                  onChange={(e) =>
                    editingDepositRow
                      ? setEditingDepositRow({ ...editingDepositRow, utr: e.target.value })
                      : setNewDepositForm({ ...newDepositForm, utr: e.target.value })
                  }
                  className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Account Details (Bank)</label>
                  <select
                    value={editingDepositRow ? editingDepositRow.accountDetails : newDepositForm.accountDetails}
                    onChange={(e) =>
                      editingDepositRow
                        ? setEditingDepositRow({ ...editingDepositRow, accountDetails: e.target.value })
                        : setNewDepositForm({ ...newDepositForm, accountDetails: e.target.value })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Platform / Exchange</label>
                  <select
                    value={editingDepositRow ? editingDepositRow.platform : newDepositForm.platform}
                    onChange={(e) =>
                      editingDepositRow
                        ? setEditingDepositRow({ ...editingDepositRow, platform: e.target.value })
                        : setNewDepositForm({ ...newDepositForm, platform: e.target.value })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white"
                  >
                    {platforms.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Bonus (₹)</label>
                <input
                  type="number"
                  value={editingDepositRow ? editingDepositRow.bonus : newDepositForm.bonus}
                  onChange={(e) =>
                    editingDepositRow
                      ? setEditingDepositRow({ ...editingDepositRow, bonus: Number(e.target.value) })
                      : setNewDepositForm({ ...newDepositForm, bonus: Number(e.target.value) })
                  }
                  className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#282838] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDepositModal(false);
                    setEditingDepositRow(null);
                  }}
                  className="px-4 py-2 bg-[#262634] hover:bg-[#303040] text-zinc-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Save Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT WITHDRAWAL ROW MODAL                          */}
      {/* ======================================================== */}
      {(showAddWithdrawalModal || editingWithdrawalRow) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a24] border border-[#2f2f42] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#282838] pb-3">
              <h3 className="font-bold text-white text-base">
                {editingWithdrawalRow ? 'Edit Withdrawal Row' : 'Add New Withdrawal Row'}
              </h3>
              <button
                onClick={() => {
                  setShowAddWithdrawalModal(false);
                  setEditingWithdrawalRow(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWithdrawal} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">TID</label>
                  <input
                    type="text"
                    value={editingWithdrawalRow ? editingWithdrawalRow.tid : newWithdrawalForm.tid}
                    onChange={(e) =>
                      editingWithdrawalRow
                        ? setEditingWithdrawalRow({ ...editingWithdrawalRow, tid: e.target.value })
                        : setNewWithdrawalForm({ ...newWithdrawalForm, tid: e.target.value })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Date (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={editingWithdrawalRow ? editingWithdrawalRow.date : newWithdrawalForm.date}
                    onChange={(e) =>
                      editingWithdrawalRow
                        ? setEditingWithdrawalRow({ ...editingWithdrawalRow, date: e.target.value })
                        : setNewWithdrawalForm({ ...newWithdrawalForm, date: e.target.value })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Account Details (Bank)</label>
                <select
                  value={editingWithdrawalRow ? editingWithdrawalRow.accountDetails : newWithdrawalForm.accountDetails}
                  onChange={(e) =>
                    editingWithdrawalRow
                      ? setEditingWithdrawalRow({ ...editingWithdrawalRow, accountDetails: e.target.value })
                      : setNewWithdrawalForm({ ...newWithdrawalForm, accountDetails: e.target.value })
                  }
                  className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white"
                >
                  {bankAccounts.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Bank Reference / UTR</label>
                <input
                  type="text"
                  value={editingWithdrawalRow ? editingWithdrawalRow.utr : newWithdrawalForm.utr}
                  onChange={(e) =>
                    editingWithdrawalRow
                      ? setEditingWithdrawalRow({ ...editingWithdrawalRow, utr: e.target.value })
                      : setNewWithdrawalForm({ ...newWithdrawalForm, utr: e.target.value })
                  }
                  className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">User ID / Username</label>
                  <input
                    type="text"
                    value={editingWithdrawalRow ? editingWithdrawalRow.userId : newWithdrawalForm.userId}
                    onChange={(e) =>
                      editingWithdrawalRow
                        ? setEditingWithdrawalRow({ ...editingWithdrawalRow, userId: e.target.value })
                        : setNewWithdrawalForm({ ...newWithdrawalForm, userId: e.target.value })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Withdrawal Amount (₹)</label>
                  <input
                    type="number"
                    value={editingWithdrawalRow ? Math.abs(editingWithdrawalRow.amt) : newWithdrawalForm.amt}
                    onChange={(e) =>
                      editingWithdrawalRow
                        ? setEditingWithdrawalRow({ ...editingWithdrawalRow, amt: -Math.abs(Number(e.target.value)) })
                        : setNewWithdrawalForm({ ...newWithdrawalForm, amt: Number(e.target.value) })
                    }
                    className="w-full bg-[#121218] border border-[#2e2e3f] rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#282838] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddWithdrawalModal(false);
                    setEditingWithdrawalRow(null);
                  }}
                  className="px-4 py-2 bg-[#262634] hover:bg-[#303040] text-zinc-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Save Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181824] border border-[#2f2f45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-white text-lg">
                Close Old Sheet & Start Fresh?
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              क्या आप पुरानी सभी शीट एंट्रियों को बंद करके नया लेजर शुरू करना चाहते हैं?
              <br /><br />
              इसके बाद सारे नए डिपॉजिट <b>CRN01D00000</b> से और सारे नए विड्रॉल <b>CRN01W00000</b> से 5-डिजिट फॉर्मेट में क्रमबद्ध तरीके से शुरू होंगे।
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2a2a3c]">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#262636] hover:bg-[#323246] text-zinc-300 cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetLedger}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'Resetting...' : 'हाँ, बंद कर नया शुरू करें (CRN01D00000)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
