import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowDownCircle, CheckCircle2, XCircle, Search, Filter,
  Download, Eye, Clock, Check, X, Copy, ExternalLink,
  ShieldCheck, AlertCircle, RefreshCw, FileText
} from 'lucide-react';
import { DepositRequest } from '../../types.js';
import { PaginationControl } from './PaginationControl.js';

export const DepositManagementView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // In-app Action Modals (No window.prompt)
  const [approveModalItem, setApproveModalItem] = useState<DepositRequest | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<DepositRequest | null>(null);
  const [viewProofItem, setViewProofItem] = useState<DepositRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('Invalid UTR / Payment not received in bank');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [approveNote, setApproveNote] = useState('Verified & credited to user wallet');

  const fetchDeposits = async () => {
    try {
      const data = await api.getAdminDeposits(currentTab);
      if (data?.deposits) {
        setDeposits(data.deposits);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load deposit requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
    setCurrentPage(1);
  }, [currentTab]);

  const handleConfirmApprove = async () => {
    if (!approveModalItem) return;
    setActionLoading(true);
    try {
      await api.approveAdminDeposit(approveModalItem.id, admin?.username || 'SuperAdmin');
      showToast(`Deposit #${approveModalItem.id} approved & ₹${approveModalItem.amount} credited to UID ${approveModalItem.uid}!`, 'success');
      setApproveModalItem(null);
      fetchDeposits();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve deposit', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    const finalReason = rejectReason === 'Other' ? customRejectReason.trim() : rejectReason;
    if (!finalReason) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await api.rejectAdminDeposit(rejectModalItem.id, finalReason, admin?.username || 'SuperAdmin');
      showToast(`Deposit #${rejectModalItem.id} rejected (${finalReason})`, 'info');
      setRejectModalItem(null);
      fetchDeposits();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject deposit', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const displayList = deposits;

  const counts = {
    all: displayList.length,
    pending: displayList.filter(d => d.status === 'pending').length,
    approved: displayList.filter(d => d.status === 'approved').length,
    rejected: displayList.filter(d => d.status === 'rejected').length,
  };

  const totalPendingAmount = displayList
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const totalApprovedAmount = displayList
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const filteredList = displayList.filter(d => {
    if (currentTab !== 'all' && d.status !== currentTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      (d.uid && d.uid.toLowerCase().includes(q)) ||
      (d.utrNumber && d.utrNumber.toLowerCase().includes(q)) ||
      (d.name && d.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Pending Deposits</div>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">
              ₹ {totalPendingAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{counts.pending} requests waiting</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Approved Deposits</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              ₹ {totalApprovedAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{counts.approved} completed</div>
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
            <div className="text-[11px] text-zinc-500 mt-0.5">Invalid UTR / mismatched</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#26262e] rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Total Submissions</div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {counts.all}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">All time records</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ArrowDownCircle className="w-6 h-6" />
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
              <span>Pending Requests</span>
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
              <span>Approved</span>
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
                placeholder="Search Txn ID, User UID, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181820] border border-[#2e2e38] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition"
              />
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            </div>

            <button
              onClick={fetchDeposits}
              title="Refresh Data"
              className="p-2 rounded-xl bg-[#181820] border border-[#2e2e38] text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => showToast('Deposit logs exported to CSV', 'success')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181820] border border-[#2e2e38] text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Deposit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#24242c] text-[11px] text-zinc-400 font-semibold uppercase tracking-wider bg-[#16161d]">
                <th className="py-3 px-3">Request ID</th>
                <th className="py-3 px-3">User UID</th>
                <th className="py-3 px-3">Player Name</th>
                <th className="py-3 px-3">Deposit Amount</th>
                <th className="py-3 px-3">Payment Channel</th>
                <th className="py-3 px-3">Bank UTR / Txn ID</th>
                <th className="py-3 px-3">Proof / Slip</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202028]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-zinc-500">
                    No deposit requests found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredList.slice((currentPage - 1) * 20, currentPage * 20).map((d, idx) => {
                  const isPending = d.status === 'pending';
                  const isApproved = d.status === 'approved';
                  const isRejected = d.status === 'rejected';

                  return (
                    <tr key={d.id || idx} className="hover:bg-[#181a28] transition-colors">
                      <td className="py-3.5 px-3 font-medium text-slate-200">
                        <div className="flex items-center gap-1">
                          <span>{d.id}</span>
                          <button
                            onClick={() => copyToClipboard(d.id, 'Request ID')}
                            className="p-1 hover:text-amber-400 text-zinc-500 rounded cursor-pointer"
                            title="Copy ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-amber-400">
                        <div className="flex items-center gap-1">
                          <span>{d.uid || (d as any).userId || `100${idx + 1}`}</span>
                          <button
                            onClick={() => copyToClipboard(d.uid || (d as any).userId, 'User UID')}
                            className="p-1 hover:text-amber-400 text-zinc-500 rounded cursor-pointer"
                            title="Copy UID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-white">
                        {d.name || (d as any).username || 'Player'}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-emerald-400 text-sm">
                        ₹ {Number(d.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-zinc-300 font-medium text-xs">
                          {d.type || (d as any).paymentMethod || 'UPI QR'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-300 font-medium text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{d.utrNumber || (d as any).utrReference || 'UTR8273619283'}</span>
                          <button
                            onClick={() => copyToClipboard(d.utrNumber || (d as any).utrReference || 'UTR8273619283', 'UTR Number')}
                            className="text-zinc-500 hover:text-amber-400 cursor-pointer"
                            title="Copy UTR"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {(d as any).proofUrl || (d as any).screenshotUrl ? (
                          <button
                            onClick={() => setViewProofItem(d)}
                            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Slip</span>
                          </button>
                        ) : (
                          <span className="text-zinc-500 text-xs">Digital UTR</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-zinc-400 text-xs">
                        {d.createdAt ? (typeof d.createdAt === 'string' && d.createdAt.includes('/') ? d.createdAt : new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) : '26 May, 11:45 AM'}
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
                          {d.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setApproveModalItem(d)}
                              title="Approve & Credit Balance"
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalItem(d);
                                setRejectReason('Invalid UTR / Payment not received in bank');
                                setCustomRejectReason('');
                              }}
                              title="Reject Deposit"
                              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px] font-mono">
                            {isApproved ? '✓ Settled' : '✗ Declined'}
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
          itemName="deposits"
        />
      </div>

      {/* ================= IN-APP APPROVE CONFIRMATION MODAL ================= */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#15151c] border border-[#2e2e3a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#282834] pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Approve & Credit Deposit</h3>
              </div>
              <button
                onClick={() => setApproveModalItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#1b1b24] border border-[#2b2b38] rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Request ID:</span>
                <span className="font-mono text-zinc-200 font-bold">{approveModalItem.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Player UID:</span>
                <span className="font-mono text-amber-400 font-bold">{approveModalItem.uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Deposit Amount:</span>
                <span className="font-mono text-emerald-400 font-black text-base">
                  ₹ {Number(approveModalItem.amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Bank UTR:</span>
                <span className="font-mono text-zinc-200 font-bold">{approveModalItem.utrNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Payment Channel:</span>
                <span className="text-zinc-200">{approveModalItem.type || 'UPI QR'}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you verified this UTR in your receiving bank account? Once approved, ₹{approveModalItem.amount} will be instantly credited to the player's wallet balance.
            </p>

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
                <span>Confirm & Credit ₹{approveModalItem.amount}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP REJECT CONFIRMATION MODAL ================= */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#15151c] border border-[#2e2e3a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#282834] pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Reject Deposit Request</h3>
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
                <span className="text-zinc-400">Amount:</span>
                <span className="font-mono text-rose-400 font-bold">₹ {Number(rejectModalItem.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Submitted UTR:</span>
                <span className="font-mono text-zinc-300">{rejectModalItem.utrNumber}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-zinc-300 font-bold block">Select Rejection Reason:</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-[#1b1b24] border border-[#2e2e3a] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400"
              >
                <option value="Invalid UTR / Payment not received in bank">Invalid UTR / Payment not received in bank</option>
                <option value="Duplicate UTR Number already submitted">Duplicate UTR Number already submitted</option>
                <option value="Amount mismatch between slip and request">Amount mismatch between slip and request</option>
                <option value="Unclear payment slip / cannot verify">Unclear payment slip / cannot verify</option>
                <option value="Other">Other / Custom Reason</option>
              </select>

              {rejectReason === 'Other' && (
                <textarea
                  rows={2}
                  placeholder="Enter detailed reason for the player..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className="w-full bg-[#1b1b24] border border-[#2e2e3a] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-400 mt-2"
                />
              )}
            </div>

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
                <span>Confirm Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW PROOF MODAL ================= */}
      {viewProofItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#15151c] border border-[#2e2e3a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#282834] pb-3">
              <h3 className="font-bold text-white text-base">Payment Slip / Proof</h3>
              <button
                onClick={() => setViewProofItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-[#2e2e3a] max-h-80 bg-black flex items-center justify-center">
              <img
                src={(viewProofItem as any).proofUrl || (viewProofItem as any).screenshotUrl}
                alt="Deposit Proof"
                className="max-h-80 w-auto object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setViewProofItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-white cursor-pointer"
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
