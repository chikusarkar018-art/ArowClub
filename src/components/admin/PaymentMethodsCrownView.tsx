import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  CreditCard, Plus, Trash2, Edit2, CheckCircle2, AlertTriangle,
  QrCode, Building, RefreshCw, Landmark, Save, ShieldAlert,
  Search, Users, Smartphone, Eye, ExternalLink, Check, Copy, X
} from 'lucide-react';
import { PaymentMethodItem } from '../../types.js';

export const PaymentMethodsCrownView: React.FC = () => {
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState<'upi' | 'bank' | 'gateways' | 'users'>('upi');
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null);

  // Custom Delete Confirm Dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'admin_upi' | 'admin_bank' | 'payment_method' | 'user_bank';
    id?: string;
    name?: string;
    uid?: string;
  } | null>(null);

  // Section A: Admin UPI Payment Details state
  const [adminUpi, setAdminUpi] = useState({
    upiId: '8210764704@okbizaxis',
    payeeName: 'Aadi Shakti',
    instructions: 'Scan QR or pay directly via any UPI app (GPay, PhonePe, Paytm, BHIM).',
    isEnabled: true,
  });
  const [savingUpi, setSavingUpi] = useState(false);

  // Section B: Admin Bank Receiving Account state
  const [adminBank, setAdminBank] = useState({
    bankName: 'HDFC Bank',
    accountHolderName: 'ArowClub Official Enterprise',
    accountNumber: '50200084729104',
    ifscCode: 'HDFC0001234',
    branch: 'New Delhi Corporate Branch',
    instructions: 'Transfer exact amount using IMPS/NEFT/RTGS to the official bank account.',
    isEnabled: true,
  });
  const [savingBank, setSavingBank] = useState(false);

  // Add / Edit Custom Method Form State
  const [form, setForm] = useState({
    type: 'qr' as 'qr' | 'bank' | 'upi',
    name: '',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    minAmount: 100,
    maxAmount: 50000,
    isActive: true,
  });

  // User Bank Accounts Search & Delete
  const [userSearch, setUserSearch] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [methodsRes, upiRes, bankRes] = await Promise.allSettled([
        api.getAdminPaymentMethods(),
        api.getAdminUpiDetails(),
        api.getAdminBankDetails(),
      ]);

      if (methodsRes.status === 'fulfilled' && methodsRes.value?.paymentMethods) {
        setMethods(methodsRes.value.paymentMethods);
      }
      if (upiRes.status === 'fulfilled' && upiRes.value?.upiDetails) {
        setAdminUpi((prev) => ({ ...prev, ...upiRes.value.upiDetails }));
      }
      if (bankRes.status === 'fulfilled' && bankRes.value?.bankDetails) {
        setAdminBank((prev) => ({ ...prev, ...bankRes.value.bankDetails }));
      }
    } catch (err: any) {
      console.error('Failed to load payment settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async () => {
    setSearchingUsers(true);
    try {
      const res = await api.getAdminUsers(userSearch);
      if (res?.users) {
        setUsersList(res.users.filter((u: any) => Array.isArray(u.bankAccounts) && u.bankAccounts.length > 0));
      }
    } catch (err: any) {
      setErrorMsg('Failed to search user bank accounts');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    fetchData();
    handleSearchUsers();
  }, []);

  // ----------------- Save / Delete Section A: UPI PAYMENT -----------------
  const handleSaveAdminUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUpi(true);
    try {
      const res = await api.updateAdminUpiDetails(adminUpi, admin?.username || 'SuperAdmin');
      if (res?.success) {
        setAdminUpi((prev) => ({ ...prev, ...res.upiDetails }));
        setSuccessMsg('UPI payment details saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update UPI details');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSavingUpi(false);
    }
  };

  const executeDeleteAdminUpi = async () => {
    setSavingUpi(true);
    setDeleteConfirm(null);
    try {
      const res = await api.deleteAdminUpiDetails(admin?.username || 'SuperAdmin');
      if (res?.success) {
        setAdminUpi({
          upiId: '',
          payeeName: '',
          instructions: '',
          isEnabled: false,
        });
        setSuccessMsg('UPI payment method deleted and cleared from user deposit page!');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete UPI details');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSavingUpi(false);
    }
  };

  // ----------------- Save / Delete Section B: BANK DETAILS -----------------
  const handleSaveAdminBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      const res = await api.updateAdminBankDetails(adminBank, admin?.username || 'SuperAdmin');
      if (res?.success) {
        setAdminBank((prev) => ({ ...prev, ...res.bankDetails }));
        setSuccessMsg('Official Bank account details saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update bank details');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSavingBank(false);
    }
  };

  const executeDeleteAdminBank = async () => {
    setSavingBank(true);
    setDeleteConfirm(null);
    try {
      const res = await api.deleteAdminBankDetails(admin?.username || 'SuperAdmin');
      if (res?.success) {
        setAdminBank({
          bankName: '',
          accountHolderName: '',
          accountNumber: '',
          ifscCode: '',
          branch: '',
          instructions: '',
          isEnabled: false,
        });
        setSuccessMsg('Official Bank details deleted and cleared from user deposit page!');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete bank details');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSavingBank(false);
    }
  };

  // ----------------- Custom Payment Gateways Methods -----------------
  const handleCreateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createAdminPaymentMethod(form, admin?.username);
      if (res?.success) {
        setSuccessMsg(`Payment Method "${form.name}" added successfully!`);
        setShowAddModal(false);
        setForm({
          type: 'qr',
          name: '',
          upiId: '',
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          accountHolderName: '',
          minAmount: 100,
          maxAmount: 50000,
          isActive: true,
        });
        fetchData();
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create payment method');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (method: PaymentMethodItem) => {
    setEditingMethod(method);
    setForm({
      type: method.type,
      name: method.name,
      upiId: method.upiId || '',
      bankName: method.bankName || '',
      accountNumber: method.accountNumber || '',
      ifscCode: method.ifscCode || '',
      accountHolderName: method.accountHolderName || '',
      minAmount: method.minAmount,
      maxAmount: method.maxAmount,
      isActive: method.isActive !== false,
    });
  };

  const handleUpdateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;
    setSaving(true);
    try {
      const res = await api.updateAdminPaymentMethod(editingMethod.id, form, admin?.username);
      if (res?.success) {
        setSuccessMsg(`Payment Method "${form.name}" updated successfully!`);
        setEditingMethod(null);
        fetchData();
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update payment method');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteMethod = async (id: string, name: string) => {
    setDeleteConfirm(null);
    try {
      const res = await api.deleteAdminPaymentMethod(id, admin?.username);
      if (res?.success) {
        setSuccessMsg(`Payment method "${name}" removed successfully!`);
        fetchData();
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove payment method');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const executeDeleteUserBank = async (uid: string, bankId: string) => {
    setDeleteConfirm(null);
    try {
      const res = await api.deleteAdminUserBankAccount(uid, bankId, admin?.username || 'SuperAdmin');
      if (res?.success) {
        setSuccessMsg('User bank account deleted successfully!');
        handleSearchUsers();
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user bank account');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const liveUpiQrPreview = adminUpi.upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=${encodeURIComponent(adminUpi.upiId)}&pn=${encodeURIComponent(adminUpi.payeeName || 'ArowClub')}&cu=INR`
    : '';

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Toast feedback */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[#10b981] text-black font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-50 bg-rose-600 text-white font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-rose-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                {deleteConfirm.type === 'admin_upi' ? 'Confirm UPI ID Deletion' : deleteConfirm.type === 'admin_bank' ? 'Confirm Bank Deletion' : 'Confirm Deletion'}
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {deleteConfirm.type === 'admin_upi' && (
                <>Are you sure you want to <strong>delete & clear the UPI ID</strong>? Deposit players will no longer see this UPI or QR code on the deposit page until you configure a new one.</>
              )}
              {deleteConfirm.type === 'admin_bank' && (
                <>Are you sure you want to <strong>delete & clear the official admin receiving bank account</strong>? Deposit players will not see these bank details until updated.</>
              )}
              {deleteConfirm.type === 'payment_method' && (
                <>Are you sure you want to delete payment method <strong>"{deleteConfirm.name}"</strong>?</>
              )}
              {deleteConfirm.type === 'user_bank' && (
                <>Are you sure you want to remove bank account <strong>"{deleteConfirm.name}"</strong> from user UID <strong>{deleteConfirm.uid}</strong>?</>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#26262a]">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'admin_upi') executeDeleteAdminUpi();
                  else if (deleteConfirm.type === 'admin_bank') executeDeleteAdminBank();
                  else if (deleteConfirm.type === 'payment_method' && deleteConfirm.id) executeDeleteMethod(deleteConfirm.id, deleteConfirm.name || '');
                  else if (deleteConfirm.type === 'user_bank' && deleteConfirm.uid && deleteConfirm.id) executeDeleteUserBank(deleteConfirm.uid, deleteConfirm.id);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
              >
                Yes, Delete Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#121215] border border-[#26262a] rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#f59e0b]">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Deposit Payment Settings & Gateways
              </h1>
              <p className="text-xs text-zinc-400">
                Manage independent UPI payment, official receiving bank account, extra gateways, and player accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-[#1a1a1e] border border-[#26262a] text-xs font-semibold text-zinc-300 hover:border-amber-500/40 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#1f1f24] overflow-x-auto">
          <button
            onClick={() => setActiveTab('upi')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'upi'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#26262a]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>A) UPI Payment</span>
            {adminUpi.isEnabled && adminUpi.upiId ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-zinc-600 ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'bank'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#26262a]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>B) Bank Details</span>
            {adminBank.isEnabled && adminBank.accountNumber ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-zinc-600 ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('gateways')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'gateways'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#26262a]'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Extra Gateways ({methods.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#26262a]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Bank Beneficiaries</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: UPI PAYMENT (Add / Edit / Delete / Enable / Disable) */}
      {/* ========================================================================= */}
      {(activeTab === 'upi' || activeTab === 'gateways') && (
        <div className="bg-[#121215] border border-[#2a2415] rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262a] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#f59e0b]">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">
                    Section A: UPI Payment Settings
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-[#f59e0b] border border-amber-500/30">
                    DIRECT UPI & QR
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure the official UPI ID. The deposit page generates dynamic QR codes using this exact ID.
                </p>
              </div>
            </div>

            {/* Toggle Enable/Disable */}
            <div className="flex items-center gap-3 bg-[#0a0a0c] px-4 py-2 rounded-xl border border-[#26262a]">
              <span className="text-xs font-bold text-zinc-300">UPI Status:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminUpi.isEnabled}
                  onChange={(e) => setAdminUpi({ ...adminUpi, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className={`ml-2 text-xs font-black ${adminUpi.isEnabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {adminUpi.isEnabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form */}
            <form onSubmit={handleSaveAdminUpi} className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5 flex items-center justify-between">
                    <span>Official UPI ID / VPA *</span>
                    <span className="text-[10px] text-zinc-500">Format: name@bank</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUpi.upiId}
                    onChange={(e) => setAdminUpi({ ...adminUpi, upiId: e.target.value.trim() })}
                    className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono font-bold focus:border-[#f59e0b] focus:outline-none shadow-inner"
                    placeholder="e.g. 8210764704@okbizaxis"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    Payee Name / Merchant Name
                  </label>
                  <input
                    type="text"
                    value={adminUpi.payeeName}
                    onChange={(e) => setAdminUpi({ ...adminUpi, payeeName: e.target.value })}
                    className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:border-[#f59e0b] focus:outline-none"
                    placeholder="e.g. Aadi Shakti / ArowClub"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  UPI Instructions for Players
                </label>
                <textarea
                  rows={2}
                  value={adminUpi.instructions}
                  onChange={(e) => setAdminUpi({ ...adminUpi, instructions: e.target.value })}
                  className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl p-3 text-xs text-zinc-300 focus:border-[#f59e0b] focus:outline-none"
                  placeholder="e.g. Scan QR or pay directly via GPay, PhonePe, Paytm, BHIM."
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#26262a]">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ type: 'admin_upi' })}
                  disabled={savingUpi || !adminUpi.upiId}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete / Clear UPI</span>
                </button>

                <button
                  type="submit"
                  disabled={savingUpi}
                  className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingUpi ? 'Saving UPI...' : 'Save UPI Payment Settings'}</span>
                </button>
              </div>
            </form>

            {/* Right 1 Col: Live Dynamic QR Preview */}
            <div className="bg-[#0a0a0d] border border-[#26262a] rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Live Dynamic UPI QR Preview</span>
              </div>

              {adminUpi.upiId && adminUpi.isEnabled ? (
                <div className="bg-white p-3 rounded-xl shadow-lg">
                  <img
                    src={liveUpiQrPreview}
                    alt="UPI QR Preview"
                    className="w-36 h-36 object-contain"
                  />
                  <div className="text-[10px] text-zinc-800 font-mono font-bold mt-1 max-w-[150px] truncate">
                    {adminUpi.upiId}
                  </div>
                </div>
              ) : (
                <div className="w-36 h-36 rounded-xl border border-dashed border-zinc-700 flex flex-col items-center justify-center p-3 text-zinc-500 text-[11px]">
                  <span>No active UPI configured</span>
                </div>
              )}

              <p className="text-[10px] text-zinc-400 leading-tight">
                {adminUpi.isEnabled && adminUpi.upiId
                  ? 'Players scan this QR in deposit modal with automatic amount'
                  : 'Disabled: User will see "No UPI payment method is currently available."'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: BANK DETAILS (Add / Edit / Delete / Enable / Disable) */}
      {/* ========================================================================= */}
      {(activeTab === 'bank' || activeTab === 'gateways') && (
        <div className="bg-[#121215] border border-[#2a2415] rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262a] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">
                    Section B: Bank Details Settings
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    IMPS / NEFT / RTGS
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure official bank account for direct bank transfer deposits.
                </p>
              </div>
            </div>

            {/* Toggle Enable/Disable */}
            <div className="flex items-center gap-3 bg-[#0a0a0c] px-4 py-2 rounded-xl border border-[#26262a]">
              <span className="text-xs font-bold text-zinc-300">Bank Status:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminBank.isEnabled}
                  onChange={(e) => setAdminBank({ ...adminBank, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className={`ml-2 text-xs font-black ${adminBank.isEnabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {adminBank.isEnabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          <form onSubmit={handleSaveAdminBank} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  Bank Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminBank.bankName}
                  onChange={(e) => setAdminBank({ ...adminBank, bankName: e.target.value })}
                  className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:border-[#f59e0b] focus:outline-none"
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminBank.accountHolderName}
                  onChange={(e) => setAdminBank({ ...adminBank, accountHolderName: e.target.value })}
                  className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:border-[#f59e0b] focus:outline-none"
                  placeholder="Name as registered with bank"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={adminBank.accountNumber}
                  onChange={(e) => setAdminBank({ ...adminBank, accountNumber: e.target.value.trim() })}
                  className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono font-bold focus:border-[#f59e0b] focus:outline-none"
                  placeholder="e.g. 50200084729104"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  required
                  value={adminBank.ifscCode}
                  onChange={(e) => setAdminBank({ ...adminBank, ifscCode: e.target.value.toUpperCase().trim() })}
                  className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold uppercase focus:border-[#f59e0b] focus:outline-none"
                  placeholder="e.g. HDFC0001234"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  Branch Name (Optional)
                </label>
                <input
                  type="text"
                  value={adminBank.branch}
                  onChange={(e) => setAdminBank({ ...adminBank, branch: e.target.value })}
                  className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 font-semibold focus:border-[#f59e0b] focus:outline-none"
                  placeholder="e.g. New Delhi Corporate Branch"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                Deposit Instructions for Players
              </label>
              <textarea
                rows={2}
                value={adminBank.instructions}
                onChange={(e) => setAdminBank({ ...adminBank, instructions: e.target.value })}
                className="w-full bg-[#09090b] border border-[#2e2e34] rounded-xl p-3 text-xs text-zinc-300 focus:border-[#f59e0b] focus:outline-none"
                placeholder="1. Transfer exact amount using IMPS/NEFT/RTGS. 2. Submit 12-digit UTR for approval."
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#26262a]">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ type: 'admin_bank' })}
                disabled={savingBank || (!adminBank.bankName && !adminBank.accountNumber)}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete / Clear Bank</span>
              </button>

              <button
                type="submit"
                disabled={savingBank}
                className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingBank ? 'Saving Bank...' : 'Save Bank Details'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: ADDITIONAL PAYMENT GATEWAYS (Custom Methods List) */}
      {/* ========================================================================= */}
      {(activeTab === 'gateways') && (
        <div className="space-y-4 pt-4 border-t border-[#26262a]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Custom Payment Gateways & Methods ({methods.length})</span>
              </h3>
              <p className="text-xs text-zinc-400">Additional channels and backup payment gateways</p>
            </div>

            <button
              onClick={() => {
                setForm({
                  type: 'qr',
                  name: '',
                  upiId: '',
                  bankName: '',
                  accountNumber: '',
                  ifscCode: '',
                  accountHolderName: '',
                  minAmount: 100,
                  maxAmount: 50000,
                  isActive: true,
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Gateway
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {methods.map((pm) => (
              <div
                key={pm.id}
                className={`bg-[#121215] border rounded-2xl p-5 shadow-lg relative flex flex-col justify-between transition-all ${
                  pm.isActive ? 'border-[#26262a] hover:border-amber-500/40' : 'border-rose-500/30 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#f59e0b]">
                        {pm.type === 'qr' ? <QrCode className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{pm.name}</h3>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1a1a1e] border border-[#2e2e34] text-zinc-400">
                          {pm.type}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        pm.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {pm.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs bg-[#18181c] border border-[#26262a] rounded-xl p-3.5 my-3">
                    {pm.upiId && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">UPI ID:</span>
                        <span className="font-mono text-[#f59e0b] font-semibold">{pm.upiId}</span>
                      </div>
                    )}
                    {pm.bankName && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Bank:</span>
                        <span className="font-medium text-white">{pm.bankName}</span>
                      </div>
                    )}
                    {pm.accountNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">A/C Number:</span>
                        <span className="font-mono text-white font-semibold">{pm.accountNumber}</span>
                      </div>
                    )}
                    {pm.ifscCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">IFSC:</span>
                        <span className="font-mono text-zinc-300 font-semibold">{pm.ifscCode}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-[#2a2a30] text-[11px]">
                      <span className="text-zinc-500">Limits:</span>
                      <span className="text-zinc-300 font-mono">
                        ₹{pm.minAmount.toLocaleString()} - ₹{pm.maxAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#1f1f23]">
                  <span className="text-[10px] text-zinc-500">
                    {new Date(pm.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(pm)}
                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#f59e0b] border border-amber-500/30 transition-colors"
                      title="Edit Gateway"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'payment_method', id: pm.id, name: pm.name })}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                      title="Delete Method"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: USER BANK BENEFICIARIES (Manage & Delete User Bank Accounts) */}
      {/* ========================================================================= */}
      {(activeTab === 'users') && (
        <div className="bg-[#121215] border border-[#26262a] rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262a] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#f59e0b]" />
                <span>User Bank Beneficiaries (For Withdrawals)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Delete user-bound bank accounts or beneficiaries if requested or duplicate
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search UID / Phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                  className="bg-[#09090b] border border-[#26262a] rounded-xl px-3 py-1.5 pr-8 text-xs text-white focus:outline-none focus:border-[#f59e0b] w-48"
                />
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                onClick={handleSearchUsers}
                disabled={searchingUsers}
                className="bg-[#1a1a1e] hover:bg-[#26262a] text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
              >
                {searchingUsers ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {usersList.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              No user bank accounts found matching query.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#26262a] text-zinc-400 font-bold">
                    <th className="py-2.5 px-3">USER UID</th>
                    <th className="py-2.5 px-3">HOLDER NAME</th>
                    <th className="py-2.5 px-3">BANK NAME</th>
                    <th className="py-2.5 px-3">ACCOUNT NUMBER</th>
                    <th className="py-2.5 px-3">IFSC CODE</th>
                    <th className="py-2.5 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#201d14]">
                  {usersList.flatMap((u) =>
                    (u.bankAccounts || []).map((b: any) => (
                      <tr key={`${u.uid}-${b.id}`} className="hover:bg-[#18181c]">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {u.uid} ({u.username})
                        </td>
                        <td className="py-3 px-3 font-medium text-zinc-200">
                          {b.accountHolder || b.holderName || b.name || u.username}
                        </td>
                        <td className="py-3 px-3 text-zinc-300 font-semibold">
                          {b.bankName || '---'}
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-200 font-bold">
                          {b.accountNumber || '---'}
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-400">
                          {b.ifsc || b.ifscCode || '---'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'user_bank',
                                uid: u.uid,
                                id: b.id,
                                name: `${b.bankName} (${b.accountNumber})`,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Bank</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Gateway Modal */}
      {(showAddModal || editingMethod) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-[#26262a] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {editingMethod ? (
                  <>
                    <Edit2 className="w-5 h-5 text-[#f59e0b]" />
                    <span>Edit Payment Gateway</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-[#f59e0b]" />
                    <span>Add Extra Payment Method</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMethod(null);
                }}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={editingMethod ? handleUpdateMethod : handleCreateMethod}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Fast UPI QR 1"
                    className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="qr">UPI QR Code</option>
                    <option value="upi">UPI ID</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {(form.type === 'qr' || form.type === 'upi') && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    UPI ID / VPA *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    placeholder="e.g. merchant@okhdfcbank"
                    className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {form.type === 'bank' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        placeholder="e.g. State Bank of India"
                        className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">
                        A/C Number
                      </label>
                      <input
                        type="text"
                        value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                        placeholder="Account number"
                        className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={form.ifscCode}
                        onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. SBIN0001234"
                        className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">
                        Account Holder
                      </label>
                      <input
                        type="text"
                        value={form.accountHolderName}
                        onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                        placeholder="Holder name"
                        className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Min Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={form.minAmount}
                    onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })}
                    className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Max Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={form.maxAmount}
                    onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })}
                    className="w-full bg-[#1c1c21] border border-[#2e2e34] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="methodIsActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[#f59e0b] rounded"
                />
                <label htmlFor="methodIsActive" className="text-xs font-bold text-zinc-300 cursor-pointer">
                  Gateway is Active for Deposits
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#26262a]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMethod(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-[#1f1f24] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingMethod ? 'Update Gateway' : 'Add Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
