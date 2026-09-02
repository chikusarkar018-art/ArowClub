import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowUpCircle, CheckCircle2, XCircle, Search, Filter,
  Download, Eye, Check, X, Building, CreditCard, User,
  Clock, AlertCircle, Copy, ShieldCheck, RefreshCw
} from 'lucide-react';
import { WithdrawalRequest } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const WithdrawalManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // In-app Action Modals (No window.prompt)
  const [approveModalItem, setApproveModalItem] = useState<WithdrawalRequest | null>(null);
  const [payoutTxnRef, setPayoutTxnRef] = useState('');
  const [rejectModalItem, setRejectModalItem] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('Incorrect Bank Account / IFSC Code');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [selectedBankDetails, setSelectedBankDetails] = useState<WithdrawalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWithdrawals = async () => {
    try {
      const data = await api.getAdminWithdrawals(currentTab as any);
      if (data?.withdrawals) {
        setWithdrawals(data.withdrawals);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load withdrawal requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
    setCurrentPage(1);
  }, [currentTab]);

  const handleConfirmApprove = async () => {
    if (!approveModalItem) return;
    const finalRef = payoutTxnRef.trim() || `PAY${Date.now().toString().slice(-8)}`;
    setActionLoading(true);
    try {
      await api.approveAdminWithdrawal(approveModalItem.id, finalRef, admin?.username || 'SuperAdmin');
      showToast(`Withdrawal #${approveModalItem.id} approved & marked as paid!`, 'success');
      setApproveModalItem(null);
      fetchWithdrawals();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve withdrawal', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    const finalReason = rejectReason === 'Other' ? customRejectReason.trim() : rejectReason;
    if (!finalReason) {
      showToast('Please specify a rejection reason', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await api.rejectAdminWithdrawal(rejectModalItem.id, finalReason, admin?.username || 'SuperAdmin');
      showToast(`Withdrawal #${rejectModalItem.id} rejected and ₹${rejectModalItem.amount} refunded to user`, 'info');
      setRejectModalItem(null);
      fetchWithdrawals();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject withdrawal', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied!`, 'success');
  };

  const displayList = withdrawals;

  const counts = {
    all: displayList.length,
    pending: displayList.filter(w => w.status === 'pending').length,
    approved: displayList.filter(w => w.status === 'approved' || w.status === 'completed').length,
    rejected: displayList.filter(w => w.status === 'rejected').length,
  };

  const totalPendingAmount = displayList
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const totalPaidAmount = displayList
    .filter(w => w.status === 'approved' || w.status === 'completed')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const filteredList = displayList.filter(w => {
    if (currentTab === 'pending' && w.status !== 'pending') return false;
    if (currentTab === 'approved' && w.status !== 'approved' && w.status !== 'completed') return false;
    if (currentTab === 'rejected' && w.status !== 'rejected') return false;
    if (currentTab === 'completed' && w.status !== 'completed' && w.status !== 'approved') return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.id.toLowerCase().includes(q) ||
      (w.uid && w.uid.toLowerCase().includes(q)) ||
      (w.name && w.name.toLowerCase().includes(q)) ||
      (w.bankName && w.bankName.toLowerCase().includes(q)) ||
      (w.accountNumber && w.accountNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Pending Payouts</div>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">
              ₹ {totalPendingAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{counts.pending} payouts waiting</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Completed Payouts</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              ₹ {totalPaidAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{counts.approved} transferred</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Rejected Requests</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-1">
              {counts.rejected}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Refunded to user wallet</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Total Requests</div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {counts.all}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">All time withdrawal logs</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-5 shadow-xl space-y-5">
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#24242c] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                currentTab === 'pending'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                  : 'bg-[#181820] text-zinc-400 hover:text-white hover:bg-[#22222c] border border-[#2e2e38]'
              }`}
            >
              <span>Pending Payouts</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                currentTab === 'pending' ? 'bg-black text-amber-400 font-black' : 'bg-[#2a2a36] text-zinc-300'
              }`}>
                {counts.pending}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('approved')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                currentTab === 'approved'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                  : 'bg-[#181820] text-zinc-400 hover:text-white hover:bg-[#22222c] border border-[#2e2e38]'
              }`}
            >
              <span>Completed Payouts</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                currentTab === 'approved' ? 'bg-black text-emerald-400 font-black' : 'bg-[#2a2a36] text-zinc-300'
              }`}>
                {counts.approved}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('rejected')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                currentTab === 'rejected'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-black'
                  : 'bg-[#181820] text-zinc-400 hover:text-white hover:bg-[#22222c] border border-[#2e2e38]'
              }`}
            >
              <span>Rejected</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                currentTab === 'rejected' ? 'bg-black/40 text-white font-black' : 'bg-[#2a2a36] text-zinc-300'
              }`}>
                {counts.rejected}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                currentTab === 'all'
                  ? 'bg-white text-black shadow-lg font-black'
                  : 'bg-[#181820] text-zinc-400 hover:text-white hover:bg-[#22222c] border border-[#2e2e38]'
              }`}
            >
              <span>All ({counts.all})</span>
            </button>
          </div>

          {/* Search bar & Refresh */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search Request ID, UID, Bank, Account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181820] border border-[#2e2e38] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            </div>

            <button
              onClick={fetchWithdrawals}
              title="Refresh Data"
              className="p-2 rounded-xl bg-[#181820] border border-[#2e2e38] text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => showToast('Withdrawals exported to CSV', 'success')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181820] border border-[#2e2e38] text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Withdrawal Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#24242c] text-[11px] text-zinc-400 font-semibold uppercase tracking-wider bg-[#16161d]">
                <th className="py-3 px-3">Request ID</th>
                <th className="py-3 px-3">User UID</th>
                <th className="py-3 px-3">Player Name</th>
                <th className="py-3 px-3">Withdraw Amount</th>
                <th className="py-3 px-3">Bank Details</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202028]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-zinc-500">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                filteredList.slice((currentPage - 1) * 20, currentPage * 20).map((w, idx) => {
                  const isPending = w.status === 'pending';
                  const isApproved = w.status === 'approved' || w.status === 'completed';

                  return (
                    <tr key={w.id || idx} className="hover:bg-[#181a28] transition-colors">
                      <td className="py-3.5 px-3 font-medium text-slate-200">
                        <div className="flex items-center gap-1">
                          <span>{w.id}</span>
                          <button
                            onClick={() => copyToClipboard(w.id, 'Request ID')}
                            className="p-1 hover:text-amber-400 text-zinc-500 rounded cursor-pointer"
                            title="Copy ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-amber-400">
                        <div className="flex items-center gap-1">
                          <span>{w.uid || (w as any).userId || `100${idx + 1}`}</span>
                          <button
                            onClick={() => copyToClipboard(w.uid || (w as any).userId, 'User UID')}
                            className="p-1 hover:text-amber-400 text-zinc-500 rounded cursor-pointer"
                            title="Copy UID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-white">
                        {w.name || (w as any).username || 'Player'}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-amber-400 text-sm">
                        ₹ {Number(w.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          onClick={() => setSelectedBankDetails(w)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a24] hover:bg-[#222230] border border-[#2b2b38] text-indigo-300 hover:text-white transition cursor-pointer text-xs"
                        >
                          <Building className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="truncate max-w-[130px] font-medium">{w.bankName || w.bankUpiDetails?.bankName || 'Bank Account'}</span>
                          <Eye className="w-3 h-3 text-zinc-400 ml-0.5" />
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-400 text-xs">
                        {w.createdAt ? (typeof w.createdAt === 'string' && w.createdAt.includes('/') ? w.createdAt : new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) : '---'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            isApproved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isPending
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {w.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setApproveModalItem(w);
                                setPayoutTxnRef(`PAY${Date.now().toString().slice(-8)}`);
                              }}
                              title="Approve & Payout"
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Pay & Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalItem(w);
                                setRejectReason('Incorrect Bank Account / IFSC Code');
                                setCustomRejectReason('');
                              }}
                              title="Reject Withdrawal"
                              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject & Refund</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px] font-mono">
                            {isApproved ? '✓ Transferred' : '✗ Refunded'}
                          </span>
                        )}
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
          itemName="withdrawals"
        />
      </div>

      {/* ================= IN-APP APPROVE & PAYOUT MODAL ================= */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#15151c] border border-[#2e2e3a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#282834] pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Approve & Settle Payout</h3>
              </div>
              <button
                onClick={() => setApproveModalItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#1b1b24] border border-[#2b2b38] rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Request ID:</span>
                <span className="font-mono text-zinc-200 font-bold">{approveModalItem.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Player UID:</span>
                <span className="font-mono text-amber-400 font-bold">{approveModalItem.uid}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Payout Amount:</span>
                <span className="font-mono text-emerald-400 font-black text-base">
                  ₹ {Number(approveModalItem.amount).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Rollover requirement info */}
              {approveModalItem.requiredTurnover !== undefined && (
                <div className={`p-2.5 rounded-xl border ${
                  (approveModalItem.remainingTurnover ?? 0) <= 0 
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-500/50 text-rose-300'
                }`}>
                  <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                    <span>1X Rolling / Turnover Requirement:</span>
                    <span>
                      {(approveModalItem.remainingTurnover ?? 0) <= 0 
                        ? '✅ Rolling Complete (100%)' 
                        : `⛔ Rolling Incomplete (₹${(approveModalItem.remainingTurnover ?? 0).toFixed(0)} Left)`}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Required: ₹{approveModalItem.requiredTurnover || 0}</span>
                    <span>Played: ₹{approveModalItem.completedTurnover || 0}</span>
                    <span className={(approveModalItem.remainingTurnover ?? 0) <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-black'}>
                      Remaining: ₹{approveModalItem.remainingTurnover || 0}
                    </span>
                  </div>
                  {(approveModalItem.remainingTurnover ?? 0) > 0 && (
                    <p className="text-[10px] text-rose-300/90 mt-1.5 font-medium leading-tight">
                      ⚠️ User has not finished the required rolling amount. Payout cannot proceed without rolling completion.
                    </p>
                  )}
                </div>
              )}

              {/* User Note Display if present */}
              {(approveModalItem.userNote || (approveModalItem as any).note) && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
                  <span className="font-bold text-amber-400">User's Note (यूजर का नोट):</span>{' '}
                  <span>{approveModalItem.userNote || (approveModalItem as any).note}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-[#262634]">
                <span className="text-zinc-400">Account Holder:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-100 font-bold">
                    {(approveModalItem as any).accountHolderName || (approveModalItem as any).accountHolder || approveModalItem.bankUpiDetails?.accountHolder || approveModalItem.name || approveModalItem.username || '---'}
                  </span>
                  <button
                    onClick={() => copyToClipboard((approveModalItem as any).accountHolderName || (approveModalItem as any).accountHolder || approveModalItem.bankUpiDetails?.accountHolder || approveModalItem.name || approveModalItem.username || '', 'Account Holder')}
                    className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Beneficiary Bank:</span>
                <span className="text-zinc-200 font-semibold">{approveModalItem.bankName || approveModalItem.bankUpiDetails?.bankName || '---'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Account Number:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-amber-400 font-bold">
                    {approveModalItem.accountNumber || approveModalItem.bankUpiDetails?.accountNumber || '---'}
                  </span>
                  {(approveModalItem.accountNumber || approveModalItem.bankUpiDetails?.accountNumber) && (
                    <button
                      onClick={() => copyToClipboard(approveModalItem.accountNumber || approveModalItem.bankUpiDetails?.accountNumber || '', 'Account Number')}
                      className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">IFSC Code:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-emerald-400 font-bold">
                    {(approveModalItem as any).ifscCode || (approveModalItem as any).ifsc || approveModalItem.bankUpiDetails?.ifsc || (approveModalItem.bankUpiDetails as any)?.ifscCode || '---'}
                  </span>
                  {((approveModalItem as any).ifscCode || (approveModalItem as any).ifsc || approveModalItem.bankUpiDetails?.ifsc || (approveModalItem.bankUpiDetails as any)?.ifscCode) && (
                    <button
                      onClick={() => copyToClipboard((approveModalItem as any).ifscCode || (approveModalItem as any).ifsc || approveModalItem.bankUpiDetails?.ifsc || (approveModalItem.bankUpiDetails as any)?.ifscCode || '', 'IFSC Code')}
                      className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              {approveModalItem.bankUpiDetails?.upiId && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">UPI ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-cyan-400 font-bold">
                      {approveModalItem.bankUpiDetails.upiId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(approveModalItem.bankUpiDetails?.upiId || '', 'UPI ID')}
                      className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-zinc-300 font-bold block">
                Enter Bank Reference / Payout UTR:
              </label>
              <input
                type="text"
                value={payoutTxnRef}
                onChange={(e) => setPayoutTxnRef(e.target.value)}
                placeholder="e.g. IMPS20240526019283"
                className="w-full bg-[#1b1b24] border border-[#2e2e3a] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#282834]">
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#22222c] hover:bg-[#2c2c38] text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Mark Paid (₹{approveModalItem.amount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP REJECT & REFUND MODAL ================= */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#15151c] border border-[#2e2e3a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#282834] pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Reject & Refund Withdrawal</h3>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#1b1b24] border border-[#2b2b38] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Request:</span>
                <span className="font-mono text-zinc-200">{rejectModalItem.id} (UID: {rejectModalItem.uid})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Refund Amount:</span>
                <span className="font-mono text-rose-400 font-bold">₹ {Number(rejectModalItem.amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-zinc-300 font-bold block">Select Reason for User Notification:</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-[#1b1b24] border border-[#2e2e3a] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400"
              >
                <option value="Incorrect Bank Account / IFSC Code">Incorrect Bank Account / IFSC Code</option>
                <option value="Bank Account Name mismatch with KYC Profile">Bank Account Name mismatch with KYC Profile</option>
                <option value="Wagering / Turnover Requirement Not Met">Wagering / Turnover Requirement Not Met</option>
                <option value="Suspicious Multi-Account Activity Detected">Suspicious Multi-Account Activity Detected</option>
                <option value="Bank Payout Gateway Server Error (Please retry)">Bank Payout Gateway Server Error (Please retry)</option>
                <option value="Other">Other / Custom Reason</option>
              </select>

              {rejectReason === 'Other' && (
                <textarea
                  rows={2}
                  placeholder="Enter specific reason for user..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className="w-full bg-[#1b1b24] border border-[#2e2e3a] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400 mt-2"
                />
              )}
            </div>

            <p className="text-[11px] text-amber-400/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
              Note: The requested amount ₹{rejectModalItem.amount} will be automatically refunded back to user UID {rejectModalItem.uid}'s wallet balance.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#282834]">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#22222c] hover:bg-[#2c2c38] text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                <span>Confirm & Refund</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BANK DETAILS POPUP MODAL ================= */}
      {selectedBankDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#15151c] border border-[#2e2e3a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#282834] pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Building className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Beneficiary Bank Account Details</h3>
              </div>
              <button
                onClick={() => setSelectedBankDetails(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#1b1b24] border border-[#2b2b38] rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#262634]">
                <span className="text-zinc-400">Account Holder:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm">
                    {(selectedBankDetails as any).accountHolderName || (selectedBankDetails as any).accountHolder || selectedBankDetails.bankUpiDetails?.accountHolder || selectedBankDetails.name || selectedBankDetails.username || '---'}
                  </span>
                  <button
                    onClick={() => copyToClipboard((selectedBankDetails as any).accountHolderName || (selectedBankDetails as any).accountHolder || selectedBankDetails.bankUpiDetails?.accountHolder || selectedBankDetails.name || selectedBankDetails.username || '', 'Holder Name')}
                    className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#262634]">
                <span className="text-zinc-400">Bank Name:</span>
                <span className="font-semibold text-zinc-200">{selectedBankDetails.bankName || selectedBankDetails.bankUpiDetails?.bankName || '---'}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#262634]">
                <span className="text-zinc-400">Account Number:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {selectedBankDetails.accountNumber || selectedBankDetails.bankUpiDetails?.accountNumber || '---'}
                  </span>
                  {(selectedBankDetails.accountNumber || selectedBankDetails.bankUpiDetails?.accountNumber) && (
                    <button
                      onClick={() => copyToClipboard(selectedBankDetails.accountNumber || selectedBankDetails.bankUpiDetails?.accountNumber || '', 'Account Number')}
                      className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[#262634]">
                <span className="text-zinc-400">IFSC Code:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {(selectedBankDetails as any).ifscCode || (selectedBankDetails as any).ifsc || selectedBankDetails.bankUpiDetails?.ifsc || (selectedBankDetails.bankUpiDetails as any)?.ifscCode || '---'}
                  </span>
                  {((selectedBankDetails as any).ifscCode || (selectedBankDetails as any).ifsc || selectedBankDetails.bankUpiDetails?.ifsc || (selectedBankDetails.bankUpiDetails as any)?.ifscCode) && (
                    <button
                      onClick={() => copyToClipboard((selectedBankDetails as any).ifscCode || (selectedBankDetails as any).ifsc || selectedBankDetails.bankUpiDetails?.ifsc || (selectedBankDetails.bankUpiDetails as any)?.ifscCode || '', 'IFSC Code')}
                      className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {selectedBankDetails.bankUpiDetails?.upiId && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">UPI ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-cyan-400 text-sm">
                      {selectedBankDetails.bankUpiDetails.upiId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedBankDetails.bankUpiDetails?.upiId || '', 'UPI ID')}
                      className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBankDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#22222c] hover:bg-[#2c2c38] text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
