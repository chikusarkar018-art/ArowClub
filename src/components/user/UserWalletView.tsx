import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { api } from '../../services/api.js';
import { WalletTransaction, BankAccount } from '../../types.js';
import {
  ChevronLeft, ArrowDownCircle, ArrowUpCircle, History,
  QrCode, Copy, Check, AlertCircle, ShieldCheck, CreditCard,
  Building, RefreshCw, Smartphone, Zap, Sparkles, X, PlusCircle, CheckCircle, CheckCircle2,
  Trash2, Lock, Eye, EyeOff, ShieldAlert, ChevronRight, HelpCircle, Info, ExternalLink
} from 'lucide-react';

interface UserWalletViewProps {
  initialTab?: 'wallet' | 'deposit' | 'withdraw' | 'history' | 'withdraw_history' | 'deposit_history';
  onBack: () => void;
  onOpenSupport?: () => void;
  onOpenGiftRedeem?: () => void;
}

export const UserWalletView: React.FC<UserWalletViewProps> = ({
  initialTab = 'deposit',
  onBack,
  onOpenSupport,
  onOpenGiftRedeem,
}) => {
  const { user, refreshUser, showToast } = useAuth();
  const { t, language } = useLanguage();

  const getInitialActiveTab = (): 'deposit' | 'withdraw' | 'history' => {
    if (initialTab === 'withdraw') return 'withdraw';
    if (initialTab === 'withdraw_history' || initialTab === 'deposit_history' || initialTab === 'history') return 'history';
    return 'deposit';
  };

  const getInitialTxFilter = (): 'all' | 'deposit' | 'withdrawal' => {
    if (initialTab === 'withdraw_history' || initialTab === 'withdraw') return 'withdrawal';
    if (initialTab === 'deposit_history' || initialTab === 'deposit') return 'deposit';
    return 'all';
  };

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>(getInitialActiveTab);
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'withdrawal'>(getInitialTxFilter);

  useEffect(() => {
    if (initialTab === 'withdraw') {
      setActiveTab('withdraw');
      setTxFilter('withdrawal');
    } else if (initialTab === 'deposit') {
      setActiveTab('deposit');
      setTxFilter('deposit');
    } else if (initialTab === 'withdraw_history') {
      setActiveTab('history');
      setTxFilter('withdrawal');
    } else if (initialTab === 'deposit_history') {
      setActiveTab('history');
      setTxFilter('deposit');
    } else if (initialTab === 'history') {
      setActiveTab('history');
    }
  }, [initialTab]);

  // ---------------- Deposit States ----------------
  const [selectedMethod, setSelectedMethod] = useState<string>('upi_qr');
  const [selectedChannel, setSelectedChannel] = useState<string>('Phonepe_QR');
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [customDeposit, setCustomDeposit] = useState<string>('500');
  const [loadedTiers, setLoadedTiers] = useState<any[]>([]);
  const [adminUpiDetails, setAdminUpiDetails] = useState<any>(null);
  const [adminBankDetails, setAdminBankDetails] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [utrReference, setUtrReference] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ---------------- Bank & Withdraw States ----------------
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(user?.bankAccounts || []);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [withdrawChannel, setWithdrawChannel] = useState<'bank' | 'upi'>('bank');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Bank View / Add / Delete Modals
  const [viewingBankDetails, setViewingBankDetails] = useState<BankAccount | null>(null);
  const [unmaskedBankIds, setUnmaskedBankIds] = useState<Record<string, boolean>>({});
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showDeleteBankModal, setShowDeleteBankModal] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePass, setShowDeletePass] = useState(false);
  const [deletingBank, setDeletingBank] = useState(false);

  // Add Bank Form States
  const [newHolderName, setNewHolderName] = useState('');
  const [newBankName, setNewBankName] = useState('State Bank of India');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newConfirmAccountNumber, setNewConfirmAccountNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');
  const [newUpiId, setNewUpiId] = useState('');
  const [addingBank, setAddingBank] = useState(false);

  // ---------------- Transactions History States ----------------
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [qrImgError, setQrImgError] = useState(false);

  const defaultUpiId = '8210764704@okbizaxis';
  const upiPayId = (adminUpiDetails?.upiId && adminUpiDetails.upiId.trim()) || defaultUpiId;
  const isUpiActive = Boolean(adminUpiDetails?.isEnabled !== false && upiPayId);
  const isBankActive = Boolean(adminBankDetails?.isEnabled && adminBankDetails?.accountNumber);
  const finalDepositAmt = Number(customDeposit) || depositAmount || 500;
  const formattedAmt = finalDepositAmt.toFixed(2);
  const payeeName = (adminUpiDetails?.payeeName && adminUpiDetails.payeeName.trim()) || 'Aadi Shakti';
  const orderRefId = `DP${user?.uid || '108429'}${Date.now().toString().slice(-6)}`;
  const upiTransactionNote = `Recharge_${user?.uid || 'Client'}_${orderRefId.slice(-4)}`;
  
  // Standard NPCI UPI URI format with strictly formatted amount (am=500.00 & am=500)
  // According to NPCI UPI spec: pa, pn, am, cu=INR, tn, tr
  const upiUriString = `upi://pay?pa=${encodeURIComponent(upiPayId)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(formattedAmt)}&cu=INR&tn=${encodeURIComponent(upiTransactionNote)}&tr=${encodeURIComponent(orderRefId)}`;
  
  const primaryQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(upiUriString)}`;
  const backupQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiUriString)}&size=300`;
  const qrCodeImg = isUpiActive ? (qrImgError ? backupQrUrl : primaryQrUrl) : '';

  const launchUpiApp = (appScheme: 'generic' | 'phonepe' | 'paytm' | 'gpay' | 'bhim' | 'cred') => {
    let url = upiUriString;
    const pa = encodeURIComponent(upiPayId);
    const pn = encodeURIComponent(payeeName);
    const am = encodeURIComponent(formattedAmt);
    const tn = encodeURIComponent(upiTransactionNote);
    const tr = encodeURIComponent(orderRefId);

    if (appScheme === 'phonepe') {
      url = `phonepe://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}`;
    } else if (appScheme === 'paytm') {
      url = `paytmmp://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}`;
    } else if (appScheme === 'gpay') {
      // Primary Tez intent scheme for Google Pay on Android and iOS
      url = `tez://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}`;
    } else if (appScheme === 'bhim') {
      url = `bhim://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}`;
    } else if (appScheme === 'cred') {
      url = `cred://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}`;
    }

    try {
      window.location.href = url;
    } catch {
      window.open(url, '_blank');
    }
  };

  // Fetch bank accounts from server
  const fetchBankAccounts = async () => {
    try {
      const res = await api.getBankAccounts();
      if (res?.bankAccounts) {
        setBankAccounts(res.bankAccounts);
        if (!selectedBankId && res.bankAccounts.length > 0) {
          setSelectedBankId(res.bankAccounts[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchPaymentDetails = async () => {
    try {
      const res = await api.getPublicPaymentDetails();
      if (res) {
        if (res.upi) setAdminUpiDetails(res.upi);
        if (res.bank) setAdminBankDetails(res.bank);
      }
    } catch {
      api.getPublicAdminBank().then((res) => {
        if (res?.upiDetails) setAdminUpiDetails(res.upiDetails);
        if (res?.bankDetails) setAdminBankDetails(res.bankDetails);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    fetchBankAccounts();
    fetchPaymentDetails();

    api.getDepositBonusTiers()
      .then(res => {
        if (res?.tiers && Array.isArray(res.tiers) && res.tiers.length > 0) {
          setLoadedTiers(res.tiers.filter((t: any) => t.isActive));
        }
      })
      .catch(() => {});
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    await fetchBankAccounts();
    await fetchPaymentDetails();
    try {
      const res = await api.getDepositBonusTiers();
      if (res?.tiers && Array.isArray(res.tiers) && res.tiers.length > 0) {
        setLoadedTiers(res.tiers.filter((t: any) => t.isActive));
      }
    } catch {}
    if (activeTab === 'history') {
      await fetchTransactions();
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  const fetchTransactions = async () => {
    setLoadingTxs(true);
    try {
      if (user?.uid) {
        const res = await api.getUserTransactions(user.uid);
        if (res?.transactions) {
          setTransactions(res.transactions);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingTxs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchTransactions();
    }
  }, [activeTab]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiPayId);
    setCopiedUpi(true);
    showToast(t('copied', 'Copied to clipboard'), 'info');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(String(finalDepositAmt));
    setCopiedAmount(true);
    showToast(`Amount ₹${finalDepositAmt} copied!`, 'info');
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // 9 preset chips matching exact screenshot
  const standardDepositPresets = [
    { label: '₹ 100', amount: 100 },
    { label: '₹ 200', amount: 200 },
    { label: '₹ 300', amount: 300 },
    { label: '₹ 500', amount: 500 },
    { label: '₹ 1K', amount: 1000 },
    { label: '₹ 1.5K', amount: 1500 },
    { label: '₹ 2K', amount: 2000 },
    { label: '₹ 3K', amount: 3000 },
    { label: '₹ 5K', amount: 5000 },
  ];

  const withdrawPresets = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000];

  // Exact payment methods matching screenshot
  const paymentMethodsList = [
    {
      id: 'upi_qr',
      label: 'UPI-QR',
      icon: Smartphone,
      badge: '+2%',
      type: 'qr' as const,
    },
    {
      id: 'upi_x_qr',
      label: 'UPI x QR',
      icon: QrCode,
      badge: '+2%',
      type: 'qr' as const,
    },
    {
      id: 'bank_card',
      label: 'Bank Card',
      icon: Building,
      badge: '+3%',
      type: 'bank' as const,
    },
    {
      id: 'paytm_qr',
      label: 'Paytm x QR',
      icon: CreditCard,
      badge: '+2%',
      type: 'qr' as const,
    },
    {
      id: 'usdt',
      label: 'USDT',
      icon: Sparkles,
      badge: '',
      type: 'crypto' as const,
    },
  ];

  // Dynamic Channel selections based on selected payment method
  const getChannelsForMethod = (methodId: string) => {
    if (methodId === 'bank_card' || methodId === 'bank_transfer') {
      return [
        {
          id: 'Bank_Transfer',
          name: 'Bank Transfer (IMPS)',
          balanceRange: 'Balance: 100 - 100K',
          badge: '+3%',
        },
        {
          id: 'NEFT_Direct',
          name: 'NetBanking / NEFT',
          balanceRange: 'Balance: 100 - 100K',
          badge: '+3%',
        },
      ];
    }
    if (methodId === 'usdt') {
      return [
        {
          id: 'USDT_TRC20',
          name: 'USDT-TRC20 Fast',
          balanceRange: 'Balance: 1000 - 1M',
          badge: '+5%',
        },
      ];
    }
    return [
      {
        id: 'Phonepe_QR',
        name: 'Phonepe_QR',
        balanceRange: 'Balance: 100 - 50K',
        badge: '+3%',
      },
      {
        id: 'Paytm_Fast',
        name: 'Paytm_Fast',
        balanceRange: 'Balance: 100 - 50K',
        badge: '+3%',
      },
      {
        id: 'GPay_QR',
        name: 'GPay_QR',
        balanceRange: 'Balance: 100 - 50K',
        badge: '+3%',
      },
    ];
  };

  const channelList = getChannelsForMethod(selectedMethod);

  const isBankPayment = selectedMethod === 'bank_card' || selectedMethod === 'bank_transfer' || selectedChannel.toLowerCase().includes('bank') || selectedChannel.toLowerCase().includes('neft') || selectedChannel.toLowerCase().includes('imps');

  // Deposit submit proof
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (finalDepositAmt < 100) {
      showToast(t('min_deposit_100', 'Minimum deposit amount is ₹100'), 'error');
      return;
    }

    const cleanUtr = utrReference.replace(/\D/g, '').trim();
    if (!cleanUtr || cleanUtr.length !== 12) {
      showToast(t('enter_valid_12digit_utr', 'Please enter a valid 12-digit UTR reference number (कृपया 12 अंकों का पूरा UTR नंबर दर्ज करें)'), 'error');
      return;
    }

    setSubmittingDeposit(true);
    try {
      const res = await api.submitDepositRequest({
        uid: user.uid,
        username: user.username,
        amount: finalDepositAmt,
        paymentMethod: isBankPayment ? 'Bank Transfer' : selectedChannel,
        utrNumber: cleanUtr,
        utrReference: cleanUtr,
        note: depositNote.trim() || undefined,
      });

      if (res.success) {
        showToast(t('deposit_submitted_success', '12-digit UTR verified & submitted! Credited in 2-5 minutes.'), 'success');
        setShowPaymentModal(false);
        setUtrReference('');
        setDepositNote('');
        await refreshUser();
        setActiveTab('history');
      } else {
        showToast(res.message || res.error || 'Failed to submit deposit', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit deposit', 'error');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Add Bank Beneficiary (Max 3)
  const handleAddBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bankAccounts.length >= 3) {
      showToast('Maximum 3 bank accounts allowed', 'error');
      return;
    }
    if (!newHolderName.trim()) {
      showToast('Please enter account holder name', 'error');
      return;
    }
    if (newAccountNumber.trim() !== newConfirmAccountNumber.trim()) {
      showToast('Account numbers do not match', 'error');
      return;
    }
    if (newAccountNumber.trim().length < 6) {
      showToast('Please enter a valid account number (min 6 digits)', 'error');
      return;
    }
    if (newIfsc.trim().length < 8) {
      showToast('Please enter a valid IFSC code (e.g. SBIN0001234)', 'error');
      return;
    }

    setAddingBank(true);
    try {
      const res = await api.addBankAccount({
        accountHolder: newHolderName.trim(),
        bankName: newBankName.trim(),
        accountNumber: newAccountNumber.trim(),
        ifsc: newIfsc.trim().toUpperCase(),
        upiId: newUpiId.trim() || undefined,
      });

      if (res.success) {
        showToast('Beneficiary bank account added successfully!', 'success');
        setBankAccounts(res.bankAccounts || []);
        setSelectedBankId(res.bankAccount?.id || '');
        setShowAddBankModal(false);
        setNewHolderName('');
        setNewAccountNumber('');
        setNewConfirmAccountNumber('');
        setNewIfsc('');
        setNewUpiId('');
        await refreshUser();
      } else {
        showToast(res.error || 'Failed to add bank account', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add bank account', 'error');
    } finally {
      setAddingBank(false);
    }
  };

  // Delete Bank Beneficiary with Password Verification
  const handleDeleteBankConfirm = async () => {
    if (!showDeleteBankModal) return;
    if (!deletePassword) {
      showToast('Please enter your account password to confirm deletion', 'error');
      return;
    }

    setDeletingBank(true);
    try {
      const res = await api.deleteBankAccount(showDeleteBankModal, deletePassword);
      if (res.success) {
        showToast('Beneficiary account removed', 'success');
        setBankAccounts(res.bankAccounts || []);
        setShowDeleteBankModal(null);
        setDeletePassword('');
        await refreshUser();
      } else {
        showToast(res.error || 'Incorrect password! Deletion blocked.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Incorrect password! Deletion blocked.', 'error');
    } finally {
      setDeletingBank(false);
    }
  };

  // Submit Withdrawal
  const handleWithdrawSubmit = async () => {
    if (!user) return;
    const amt = Number(withdrawAmount);
    if (!amt || amt < 100) {
      showToast(t('min_withdraw_100', 'Minimum withdrawal amount is ₹100'), 'error');
      return;
    }
    if (amt > user.walletBalance) {
      showToast(t('insufficient_balance', 'Insufficient wallet balance for withdrawal'), 'error');
      return;
    }
    if (remainingTurnover > 0) {
      showToast(`Please complete 1X rolling requirement first! Remaining: ₹${remainingTurnover.toFixed(2)} (Played: ₹${userCompletedTurnover.toFixed(2)} / Required: ₹${userRequiredTurnover.toFixed(2)})`, 'error');
      return;
    }

    const selectedBank = bankAccounts.find(b => b.id === selectedBankId) || bankAccounts[0];
    if (!selectedBank) {
      showToast(t('add_bank_first', 'Please add a beneficiary bank account first'), 'error');
      setShowAddBankModal(true);
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const res = await api.submitWithdrawalRequest({
        uid: user.uid,
        username: user.username,
        amount: amt,
        note: withdrawNote.trim() || undefined,
        bankUpiDetails: {
          bankName: selectedBank.bankName,
          accountNumber: selectedBank.accountNumber,
          accountHolder: selectedBank.accountHolder,
          ifsc: selectedBank.ifsc,
          upiId: selectedBank.upiId,
        },
      });

      if (res.success) {
        showToast(t('withdraw_submitted_success', 'Withdrawal request submitted! Processing within 2-24 hours.'), 'success');
        setWithdrawNote('');
        await refreshUser();
        setActiveTab('history');
      } else {
        showToast(res.message || 'Withdrawal failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Withdrawal request failed', 'error');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const userCompletedTurnover = Number(user?.completedTurnover ?? 0);
  const userRequiredTurnover = Number(user?.requiredTurnover ?? 0);
  const remainingTurnover = user?.remainingTurnover !== undefined
    ? Math.max(0, Number(user.remainingTurnover))
    : Math.max(0, userRequiredTurnover - userCompletedTurnover);
  const turnoverPercent = userRequiredTurnover > 0 
    ? Math.min(100, Math.max(0, Math.round(((userRequiredTurnover - remainingTurnover) / userRequiredTurnover) * 100))) 
    : 100;
  const isTurnoverComplete = remainingTurnover <= 0;

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white flex flex-col font-sans select-none pb-12">
      {/* Top Header */}
      <header className="px-4 py-3.5 flex items-center justify-between bg-[#0d0e15] border-b border-white/5 sticky top-0 z-20">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-lg font-black text-[#f3ba2f] tracking-wide">
          {activeTab === 'deposit'
            ? t('deposit', 'Deposit')
            : activeTab === 'withdraw'
            ? t('withdraw', 'Withdraw')
            : t('history', 'Transaction History')}
        </h1>

        <button
          onClick={() => {
            if (activeTab === 'withdraw') {
              setTxFilter('withdrawal');
            } else if (activeTab === 'deposit') {
              setTxFilter('deposit');
            }
            setActiveTab('history');
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-[#f3ba2f] transition ${
            activeTab === 'history' ? 'text-[#f3ba2f]' : ''
          }`}
          title="History"
        >
          <History className="w-5 h-5" />
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 px-4 pt-3.5 max-w-md mx-auto w-full space-y-4">
        {/* Switcher Tab Pill (Deposit / Withdraw / History) */}
        <div className="bg-[#12141f] border border-[#1f2233] p-1 rounded-xl flex items-center">
          <button
            onClick={() => {
              setActiveTab('deposit');
              setTxFilter('deposit');
            }}
            className={`w-1/2 py-2.5 rounded-lg text-xs font-black transition text-center ${
              activeTab === 'deposit'
                ? 'bg-gradient-to-r from-[#e5a93c] via-[#f0b034] to-[#e5a93c] text-black shadow-md'
                : 'text-zinc-400 hover:text-white font-bold'
            }`}
          >
            {t('deposit', 'Deposit')}
          </button>

          <button
            onClick={() => {
              setActiveTab('withdraw');
              setTxFilter('withdrawal');
            }}
            className={`w-1/2 py-2.5 rounded-lg text-xs font-black transition text-center ${
              activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-[#e5a93c] via-[#f0b034] to-[#e5a93c] text-black shadow-md'
                : 'text-zinc-400 hover:text-white font-bold'
            }`}
          >
            {t('withdraw', 'Withdraw')}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ============================= DEPOSIT VIEW ============================== */}
        {/* ========================================================================= */}
        {activeTab === 'deposit' && (
          <div className="space-y-4">
            {/* Balance Card */}
            <div className="bg-[#12141f] border border-[#1f2233] rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div>
                <div className="text-xs text-zinc-400 font-medium">{t('balance', 'Balance')}</div>
                <div className="text-2xl font-black text-[#f3ba2f] font-mono tracking-tight mt-1 flex items-baseline gap-1">
                  <span>₹</span>
                  <span>{(user?.walletBalance ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleRefresh}
                className={`w-9 h-9 rounded-full border border-[#f3ba2f]/30 flex items-center justify-center text-[#f3ba2f] bg-[#f3ba2f]/5 hover:bg-[#f3ba2f]/15 active:scale-95 transition ${
                  refreshing ? 'animate-spin' : ''
                }`}
                title="Refresh Balance"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Gift Code Claim Card */}
            {onOpenGiftRedeem && (
              <div 
                onClick={onOpenGiftRedeem}
                className="bg-gradient-to-r from-[#1b1e2e] via-[#241c10] to-[#1a1708] border border-[#f5c443]/35 hover:border-[#f5c443] rounded-2xl p-3.5 flex items-center justify-between shadow-md cursor-pointer transition active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f5c443] to-amber-500 flex items-center justify-center text-slate-950 shadow-md group-hover:scale-105 transition">
                    <Sparkles className="w-5 h-5 fill-slate-950" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>Redeem Gift Code</span>
                      <span className="px-1.5 py-0.2 bg-[#f5c443] text-black text-[9px] font-black rounded-md uppercase">Instant</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Have a promo or gift code? Claim cash directly</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#f5c443] group-hover:translate-x-0.5 transition" />
              </div>
            )}

            {/* Payment Method Section */}
            <div>
              <h3 className="text-xs font-bold text-zinc-100 mb-2.5">Payment method</h3>
              
              {/* Row 1: 3 Items */}
              <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                {paymentMethodsList.slice(0, 3).map((pm) => {
                  const isSelected = selectedMethod === pm.id;
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => {
                        setSelectedMethod(pm.id);
                        const chs = getChannelsForMethod(pm.id);
                        if (chs && chs.length > 0) {
                          setSelectedChannel(chs[0].id);
                        }
                      }}
                      className={`relative py-3.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-[#151827] border-[#f3ba2f] border-[1.5px] shadow-[0_0_12px_rgba(243,186,47,0.15)]'
                          : 'bg-[#12141f] border-[#1f2233] hover:border-zinc-600'
                      }`}
                    >
                      {pm.badge && (
                        <span className="absolute -top-1.5 -right-1 bg-[#ff1744] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                          {pm.badge}
                        </span>
                      )}
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#f3ba2f]' : 'text-zinc-300'}`} />
                      <span className="text-[11px] font-bold text-white whitespace-nowrap">{pm.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Row 2: 2 Items */}
              <div className="grid grid-cols-3 gap-2.5">
                {paymentMethodsList.slice(3, 5).map((pm) => {
                  const isSelected = selectedMethod === pm.id;
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => {
                        setSelectedMethod(pm.id);
                        const chs = getChannelsForMethod(pm.id);
                        if (chs && chs.length > 0) {
                          setSelectedChannel(chs[0].id);
                        }
                      }}
                      className={`relative py-3.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-[#151827] border-[#f3ba2f] border-[1.5px] shadow-[0_0_12px_rgba(243,186,47,0.15)]'
                          : 'bg-[#12141f] border-[#1f2233] hover:border-zinc-600'
                      }`}
                    >
                      {pm.badge && (
                        <span className="absolute -top-1.5 -right-1 bg-[#ff1744] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                          {pm.badge}
                        </span>
                      )}
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#f3ba2f]' : 'text-zinc-300'}`} />
                      <span className="text-[11px] font-bold text-white whitespace-nowrap">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Channel Section */}
            <div>
              <h3 className="text-xs font-bold text-zinc-100 mb-2.5">Select channel</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {channelList.map((ch) => {
                  const isSelected = selectedChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`p-3 rounded-xl border text-left transition relative ${
                        isSelected
                          ? 'bg-[#151827] border-[#f3ba2f] border-[1.5px] shadow-[0_0_12px_rgba(243,186,47,0.15)]'
                          : 'bg-[#12141f] border-[#1f2233] hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{ch.name}</span>
                        <span className="text-[10px] font-black text-[#ff1744]">{ch.badge}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-1">
                        {ch.balanceRange}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deposit Amount Section */}
            <div>
              <h3 className="text-xs font-bold text-zinc-100 mb-2.5">Deposit amount</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {standardDepositPresets.map((preset) => {
                  const isSelected = finalDepositAmt === preset.amount;
                  return (
                    <button
                      key={preset.amount}
                      onClick={() => {
                        setDepositAmount(preset.amount);
                        setCustomDeposit(String(preset.amount));
                      }}
                      className={`py-3 rounded-xl border text-center transition font-black text-xs ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#e5a93c] via-[#f0b034] to-[#e5a93c] text-black border-[#e5a93c] shadow-md'
                          : 'bg-[#12141f] text-zinc-200 border-[#1f2233] hover:border-zinc-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Input Field */}
            <div className="bg-[#12141f] border border-[#1f2233] focus-within:border-[#f3ba2f]/70 rounded-xl px-4 py-3 flex items-center justify-between transition">
              <span className="text-base font-black text-[#f3ba2f] mr-2">₹</span>
              <input
                type="number"
                value={customDeposit}
                onChange={(e) => {
                  setCustomDeposit(e.target.value);
                  setDepositAmount(Number(e.target.value) || 0);
                }}
                placeholder="Enter deposit amount"
                className="w-full bg-transparent text-white font-black text-sm outline-none font-mono"
              />
              {customDeposit && (
                <button
                  onClick={() => {
                    setCustomDeposit('');
                    setDepositAmount(0);
                  }}
                  className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center ml-2 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Recharge Instructions Box */}
            <div className="bg-[#12141f] border border-[#1f2233] rounded-2xl p-4 space-y-2.5 text-xs text-zinc-400">
              <div className="font-bold text-[#f3ba2f] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#f3ba2f]" />
                <span>Recharge instructions</span>
              </div>
              <div className="space-y-2 text-[11px] leading-relaxed text-zinc-300">
                <div className="flex items-start gap-2">
                  <span className="text-[#f3ba2f] text-xs font-bold leading-none mt-0.5">◆</span>
                  <span>If the transfer is not credited within 5 minutes, please contact Customer Support with your 12-digit UTR.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#f3ba2f] text-xs font-bold leading-none mt-0.5">◆</span>
                  <span>Do not save the UPI account; each recharge generates a unique order reference.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#f3ba2f] text-xs font-bold leading-none mt-0.5">◆</span>
                  <span>Minimum deposit amount is ₹100. Single transaction limit up to ₹50,000.</span>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="pt-1 space-y-2.5">
              <div className="text-center text-[11px] text-zinc-400">
                Recharge Method: <strong className="text-white font-bold">{selectedChannel}</strong>
              </div>

              <button
                onClick={() => {
                  if (finalDepositAmt < 100) {
                    showToast('Minimum deposit amount is ₹100', 'error');
                    return;
                  }
                  setShowPaymentModal(true);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#e5a93c] via-[#f0b034] to-[#e5a93c] text-[#0a0b10] font-black text-base rounded-full shadow-[0_0_25px_rgba(229,169,60,0.3)] hover:brightness-105 active:scale-98 transition flex items-center justify-center cursor-pointer"
              >
                Deposit
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ============================= WITHDRAW VIEW ============================= */}
        {/* ========================================================================= */}
        {activeTab === 'withdraw' && (
          <div className="space-y-4">
            {/* Balance & Turnover Card */}
            <div className="bg-gradient-to-br from-[#1c2438] via-[#161a2b] to-[#0f121d] border border-[#f5c443]/30 rounded-2xl p-4 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">{t('withdrawable_balance', 'Withdrawable Balance')}</div>
                  <div className="text-2xl font-black text-[#fce08b] font-mono mt-0.5">
                    ₹ {(user?.walletBalance ?? 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-[#f5c443] text-[#0d0f17] font-black px-2.5 py-1 rounded-full shadow-sm">
                    0% Fee
                  </span>
                  <div className="text-[10px] text-zinc-400 mt-1 font-mono">1X Rolling Policy</div>
                </div>
              </div>

              {/* Turnover Status Widget */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#f5c443]" />
                    <span>Game Rolling (1X Turnover)</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isTurnoverComplete
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isTurnoverComplete ? '✅ 100% Eligible to Withdraw' : `⏳ Rolling ${turnoverPercent}%`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isTurnoverComplete
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-[#f5c443] to-amber-500'
                    }`}
                    style={{ width: `${turnoverPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px]">
                  <div className="bg-black/20 p-1.5 rounded-lg border border-white/5">
                    <div className="text-[9px] text-zinc-400">Total Played</div>
                    <div className="font-mono font-bold text-white mt-0.5">₹{userCompletedTurnover.toFixed(2)}</div>
                  </div>
                  <div className="bg-black/20 p-1.5 rounded-lg border border-white/5">
                    <div className="text-[9px] text-zinc-400">Required 1X</div>
                    <div className="font-mono font-bold text-zinc-300 mt-0.5">₹{userRequiredTurnover.toFixed(2)}</div>
                  </div>
                  <div className="bg-black/20 p-1.5 rounded-lg border border-white/5">
                    <div className="text-[9px] text-zinc-400">Remaining</div>
                    <div className={`font-mono font-bold mt-0.5 ${remainingTurnover > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ₹{remainingTurnover.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Accounts Beneficiary List (Max 3 Limit) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[#f5c443]" />
                  <span>{t('bank_account', 'Bank Beneficiaries')} ({bankAccounts.length}/3)</span>
                </span>

                {bankAccounts.length < 3 ? (
                  <button
                    onClick={() => setShowAddBankModal(true)}
                    className="text-xs text-[#f5c443] font-bold hover:underline flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{t('add_account', '+ Add Bank')}</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
                    Max 3 Added
                  </span>
                )}
              </div>

              {/* Bank Card Selection */}
              {bankAccounts.length === 0 ? (
                <div
                  onClick={() => setShowAddBankModal(true)}
                  className="p-5 bg-[#141824] border border-dashed border-[#f5c443]/40 hover:border-[#f5c443] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer text-zinc-300 hover:text-white transition group py-6"
                >
                  <div className="w-10 h-10 rounded-full bg-[#f5c443]/15 flex items-center justify-center text-[#f5c443] group-hover:scale-110 transition">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#f5c443]">{t('add_account', 'Add Beneficiary Bank Account')}</span>
                  <span className="text-[11px] text-zinc-400">Add up to 3 bank accounts for fast, direct payouts</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bankAccounts.map((b) => {
                    const isSelected = selectedBankId === b.id || (!selectedBankId && bankAccounts[0]?.id === b.id);
                    const isUnmasked = !!unmaskedBankIds[b.id];
                    const displayAcc = isUnmasked ? b.accountNumber : (b.accountNumber ? `•••• •••• ${b.accountNumber.slice(-4)}` : '---');

                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBankId(b.id)}
                        className={`p-3.5 rounded-2xl border transition shadow-md cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#182035] border-[#f5c443] ring-1 ring-[#f5c443]'
                            : 'bg-[#141824] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center text-[#f5c443] shrink-0 mt-0.5">
                              <Building className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                                <span className="truncate">{b.bankName}</span>
                                {isSelected && (
                                  <span className="text-[9px] bg-[#f5c443] text-black font-black px-1.5 py-0.2 rounded">
                                    Selected
                                  </span>
                                )}
                              </div>
                              
                              {/* Account Holder */}
                              <div className="text-[11px] text-zinc-300 font-medium mt-0.5 truncate">
                                Holder: <span className="text-white font-bold">{b.accountHolder || (b as any).holderName || user?.username}</span>
                              </div>

                              {/* Account Number with Eye & Copy */}
                              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-200 mt-1">
                                <span className="text-zinc-400 font-sans text-[10px]">A/C:</span>
                                <span className="font-bold text-[#fce08b] select-all">{displayAcc}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUnmaskedBankIds(prev => ({ ...prev, [b.id]: !prev[b.id] }));
                                  }}
                                  className="p-1 text-zinc-400 hover:text-white transition"
                                  title={isUnmasked ? "Hide Account Number" : "Show Full Account Number"}
                                >
                                  {isUnmasked ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (b.accountNumber) {
                                      navigator.clipboard.writeText(b.accountNumber);
                                      showToast('Account Number copied!', 'info');
                                    }
                                  }}
                                  className="p-1 text-zinc-400 hover:text-amber-400 transition"
                                  title="Copy Account Number"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>

                              {/* IFSC Code with Copy */}
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                                <span>IFSC:</span>
                                <span className="font-bold text-emerald-400 select-all">{b.ifsc || (b as any).ifscCode || '---'}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const ifsc = b.ifsc || (b as any).ifscCode;
                                    if (ifsc) {
                                      navigator.clipboard.writeText(ifsc);
                                      showToast('IFSC Code copied!', 'info');
                                    }
                                  }}
                                  className="p-1 text-zinc-400 hover:text-emerald-400 transition"
                                  title="Copy IFSC Code"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: View Details & Delete */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingBankDetails(b);
                              }}
                              className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition flex items-center gap-1 text-[10px] font-bold border border-indigo-500/20"
                              title="View Complete Bank Details"
                            >
                              <Eye className="w-3 h-3 text-indigo-400" />
                              <span className="hidden sm:inline">Details</span>
                            </button>

                            {/* Delete Bank Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteBankModal(b.id);
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete Bank Beneficiary"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Withdrawal Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-200">{t('withdraw_amount', 'Withdrawal Amount')}</label>
                <span className="text-[11px] text-zinc-400">Min: ₹100 - Max: ₹50,000</span>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-base font-black text-[#f5c443]">₹</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full h-12 pl-8 pr-16 bg-[#141824] border border-[#f5c443]/30 rounded-xl text-base font-bold text-white focus:outline-none focus:border-[#f5c443] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(Math.floor(user?.walletBalance ?? 0)))}
                  className="absolute right-3 px-2.5 py-1 bg-[#f5c443] text-[#0d0f17] font-black text-xs rounded-lg hover:brightness-110 active:scale-95 transition"
                >
                  All
                </button>
              </div>

              {/* Quick Withdraw Amount Chips */}
              <div className="grid grid-cols-4 gap-1.5">
                {withdrawPresets.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWithdrawAmount(String(amt))}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition ${
                      Number(withdrawAmount) === amt
                        ? 'bg-[#f5c443] text-black border-[#f5c443]'
                        : 'bg-[#141824] text-zinc-300 border-white/10 hover:border-[#f5c443]/40'
                    }`}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Note / Remarks Field for Withdrawal */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                <span>Withdrawal Note / Remark (नोट)</span>
                <span className="text-[10px] text-zinc-500 font-normal">Visible in your history & admin</span>
              </label>
              <input
                type="text"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder="e.g. Urgent withdrawal / Personal account transfer"
                maxLength={100}
                className="w-full h-10 px-3 bg-[#141824] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f5c443] transition"
              />
            </div>

            {/* Withdrawal Rules Box */}
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 space-y-2 text-xs text-zinc-400">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#f5c443]" />
                <span>Withdrawal Rules & Information</span>
              </div>
              <ul className="space-y-1 text-[11px] list-disc list-inside leading-relaxed">
                <li>Withdrawal time: <strong>24/7 Available</strong>. Payout processed in 2 mins to 24 hours.</li>
                <li>Daily free withdrawals: <strong className="text-emerald-400">3 times per day</strong>.</li>
                <li>Ensure the beneficiary name matches your registered bank details.</li>
                <li>For any payout issues, reach out to 24/7 Customer Support.</li>
              </ul>
            </div>

            {/* Submit Withdraw Button */}
            <button
              onClick={handleWithdrawSubmit}
              disabled={submittingWithdraw || bankAccounts.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-[#f5c443] via-[#ffb703] to-[#d48b0c] text-[#0d0f17] font-black text-sm rounded-full shadow-[0_0_20px_rgba(245,196,67,0.4)] hover:brightness-110 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>
                {submittingWithdraw
                  ? 'Processing Withdrawal...'
                  : `${t('withdraw', 'Withdraw')} ₹${Number(withdrawAmount) || 0}`}
              </span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ============================= HISTORY VIEW ============================== */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-[#141824] p-1 rounded-xl border border-white/10">
                {(['all', 'deposit', 'withdrawal'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTxFilter(filter)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition ${
                      txFilter === filter
                        ? 'bg-[#f5c443] text-[#0d0f17]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchTransactions}
                className="text-xs text-[#f5c443] font-bold hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-3">
              {loadingTxs ? (
                <div className="text-center py-12 text-zinc-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#f5c443]" />
                  <span>Loading records...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-14 text-zinc-500 bg-[#141824] rounded-2xl border border-white/5 p-6">
                  <History className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                  <p className="font-bold text-zinc-400 text-xs">No transactions recorded yet</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Your deposits and withdrawals will appear here</p>
                </div>
              ) : (
                transactions
                  .filter((t) => txFilter === 'all' || t.type === txFilter)
                  .map((t, idx) => {
                    const isDeposit = t.type === 'deposit';
                    const isWithdrawal = t.type === 'withdrawal';
                    const isPending = t.status === 'pending';
                    const isFailed = t.status === 'rejected' || t.status === 'failed';
                    const isCompleted =
                      t.status === 'completed' ||
                      t.status === 'approved' ||
                      (!t.status && !isPending && !isFailed);
                    const orderNo =
                      t.reference ||
                      (isDeposit
                        ? `DP${new Date(t.createdAt || Date.now()).getTime()}A${idx}`
                        : `WD${new Date(t.createdAt || Date.now()).getTime()}B${idx}`);
                    const formattedTime = t.createdAt
                      ? t.createdAt.replace('T', ' ').slice(0, 19)
                      : new Date().toISOString().replace('T', ' ').slice(0, 19);

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-[#141824] rounded-2xl border border-[#f5c443]/15 shadow-md space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                              isDeposit
                                ? 'bg-[#00d084] text-[#0d0f17]'
                                : isWithdrawal
                                ? 'bg-[#ff3b3b] text-white'
                                : 'bg-[#f5c443] text-[#0d0f17]'
                            }`}
                          >
                            {t.type}
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
                            {isCompleted
                              ? 'Completed'
                              : isPending
                              ? 'Pending'
                              : isWithdrawal
                              ? 'Rejected'
                              : 'Failed'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Amount</span>
                            <span className="font-black text-amber-400 text-sm font-mono">
                              {isDeposit ? '+' : '-'}₹{Math.abs(t.amount).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Time</span>
                            <span className="text-zinc-300 font-mono text-[11px]">{formattedTime}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Order ID</span>
                            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-300">
                              <span className="truncate max-w-[170px]">{orderNo}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(orderNo);
                                  showToast('Order ID copied!', 'info');
                                }}
                                className="text-[#f5c443] hover:underline"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Transaction Notes Display */}
                          {(t.userNote || (t as any).note || (t as any).adminNote) && (
                            <div className="pt-1.5 border-t border-white/5 space-y-1">
                              {(t.userNote || (t as any).note) && (
                                <div className="text-[11px] text-amber-200/90 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20 flex items-start gap-1.5 leading-relaxed">
                                  <span className="text-amber-400 font-bold shrink-0">📝 Note:</span>
                                  <span className="break-all">{t.userNote || (t as any).note}</span>
                                </div>
                              )}
                              {(t as any).adminNote && (
                                <div className="text-[11px] text-emerald-300 bg-emerald-950/30 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 flex items-start gap-1.5 leading-relaxed">
                                  <span className="text-emerald-400 font-bold shrink-0">💬 Admin Remark:</span>
                                  <span className="break-all">{(t as any).adminNote}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ============= VIEW BANK DETAILS POPUP MODAL ============================= */}
      {/* ========================================================================= */}
      {viewingBankDetails && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-[#f5c443]/40 rounded-3xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#f5c443]">
                <Building className="w-5 h-5" />
                <h3 className="font-black text-sm">Bank Account Details</h3>
              </div>
              <button
                onClick={() => setViewingBankDetails(null)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#0d0f17] p-3.5 rounded-2xl border border-white/10">
              {/* Account Holder */}
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-400">Account Holder:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm">
                    {viewingBankDetails.accountHolder || (viewingBankDetails as any).holderName || user?.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingBankDetails.accountHolder || (viewingBankDetails as any).holderName || user?.username || '');
                      showToast('Holder Name copied!', 'info');
                    }}
                    className="text-zinc-500 hover:text-[#f5c443] transition p-1"
                    title="Copy Holder Name"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bank Name */}
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-400">Bank Name:</span>
                <span className="font-bold text-zinc-200">{viewingBankDetails.bankName}</span>
              </div>

              {/* Account Number */}
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-400">Account Number:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[#fce08b] text-sm select-all">
                    {viewingBankDetails.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingBankDetails.accountNumber);
                      showToast('Account Number copied!', 'info');
                    }}
                    className="text-zinc-500 hover:text-[#f5c443] transition p-1"
                    title="Copy Account Number"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* IFSC Code */}
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-400">IFSC Code:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-emerald-400 text-sm select-all">
                    {viewingBankDetails.ifsc || (viewingBankDetails as any).ifscCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingBankDetails.ifsc || (viewingBankDetails as any).ifscCode || '');
                      showToast('IFSC Code copied!', 'info');
                    }}
                    className="text-zinc-500 hover:text-emerald-400 transition p-1"
                    title="Copy IFSC Code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* UPI ID (Optional) */}
              {viewingBankDetails.upiId && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">UPI ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-cyan-400 text-sm select-all">
                      {viewingBankDetails.upiId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(viewingBankDetails.upiId || '');
                        showToast('UPI ID copied!', 'info');
                      }}
                      className="text-zinc-500 hover:text-cyan-400 transition p-1"
                      title="Copy UPI ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewingBankDetails(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= ADD BANK ACCOUNT MODAL (MAX 3) ================== */}
      {/* ========================================================================= */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-[#f5c443]/40 rounded-3xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#f5c443]">
                <Building className="w-5 h-5" />
                <h3 className="font-black text-sm">{t('add_account', 'Add Beneficiary Bank')}</h3>
              </div>
              <button
                onClick={() => setShowAddBankModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBankSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. State Bank of India, HDFC, ICICI"
                  className="w-full h-10 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">{t('account_holder', 'Account Holder Name')}</label>
                <input
                  type="text"
                  value={newHolderName}
                  onChange={(e) => setNewHolderName(e.target.value)}
                  placeholder="Enter recipient full name"
                  className="w-full h-10 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">{t('account_number', 'Account Number')}</label>
                <input
                  type="password"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  placeholder="Enter bank account number"
                  className="w-full h-10 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-white focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Confirm Account Number</label>
                <input
                  type="text"
                  value={newConfirmAccountNumber}
                  onChange={(e) => setNewConfirmAccountNumber(e.target.value)}
                  placeholder="Re-enter bank account number"
                  className="w-full h-10 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-white focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">{t('ifsc_code', 'IFSC Code (11 characters)')}</label>
                <input
                  type="text"
                  value={newIfsc}
                  onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                  className="w-full h-10 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-white focus:outline-none uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                  placeholder="e.g. name@okhdfcbank"
                  className="w-full h-10 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-white focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-zinc-300"
                >
                  {t('cancel', 'Cancel')}
                </button>

                <button
                  type="submit"
                  disabled={addingBank}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-black font-black shadow-md hover:brightness-110"
                >
                  {addingBank ? 'Saving...' : t('save', 'Save Bank')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ============= DELETE BANK BENEFICIARY PASSWORD CONFIRMATION MODAL ======== */}
      {/* ========================================================================= */}
      {showDeleteBankModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-rose-500/40 rounded-3xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black text-sm">Security Verification</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteBankModal(null);
                  setDeletePassword('');
                }}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              To delete this bank beneficiary account, please enter your account login password to confirm your identity.
            </p>

            <div className="space-y-2">
              <label className="block text-[11px] text-zinc-400">Account Login Password</label>
              <div className="relative">
                <input
                  type={showDeletePass ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 px-3.5 pr-10 bg-[#0d0f17] border border-white/15 focus:border-rose-500 rounded-xl text-xs text-white focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePass(!showDeletePass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showDeletePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteBankModal(null);
                  setDeletePassword('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-xs text-zinc-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteBankConfirm}
                disabled={deletingBank || !deletePassword}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-xs shadow-md"
              >
                {deletingBank ? 'Verifying...' : 'Delete Beneficiary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= PAYMENT QR & PROOF MODAL ======================== */}
      {/* ========================================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-[#f5c443]/40 rounded-3xl max-w-sm w-full p-5 text-white shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#f5c443]">
                {isBankPayment ? (
                  <Building className="w-5 h-5 text-[#f5c443]" />
                ) : (
                  <QrCode className="w-5 h-5 text-[#f5c443]" />
                )}
                <div>
                  <h3 className="font-black text-sm text-white">
                    {isBankPayment ? 'Bank Card Deposit' : 'Scan UPI QR to Pay'}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    {isBankPayment ? 'Direct IMPS / NEFT Transfer' : 'Instant UPI Payment'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Deposit Amount Banner */}
            <div className="bg-[#0d0f17] p-2.5 px-3.5 rounded-xl border border-[#f5c443]/25 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-medium">Recharge Amount:</span>
              <span className="text-base font-black text-[#f5c443] font-mono">
                ₹{finalDepositAmt.toLocaleString()}
              </span>
            </div>

            {/* CONDITION 1: QR PAYMENT ONLY (No Bank Details shown) */}
            {!isBankPayment && (
              <div className="space-y-3">
                {isUpiActive ? (
                  <>
                    {/* QR Code Container with Dynamic Auto-Amount Pre-fetch */}
                    <div className="p-3 bg-white rounded-2xl flex flex-col items-center justify-center mx-auto shadow-xl max-w-[240px] border-2 border-[#f5c443]/40 text-center relative overflow-hidden">
                      <div className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-[10px] py-1 px-2 rounded-lg mb-2 shadow-sm flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3 fill-black" />
                        <span>ऑटो अमाउंट QR • ₹{finalDepositAmt}</span>
                      </div>

                      <div 
                        onClick={() => launchUpiApp('generic')}
                        className="cursor-pointer group relative p-1 rounded-xl hover:bg-zinc-100 transition"
                        title="Click to Open in UPI App with Auto-filled Amount"
                      >
                        <img
                          src={qrCodeImg}
                          alt="UPI Dynamic QR Code"
                          onError={() => setQrImgError(true)}
                          className="w-44 h-44 object-contain rounded-lg shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition text-white text-[11px] font-bold gap-1 px-2">
                          <ExternalLink className="w-4 h-4 text-[#f5c443]" />
                          <span>Tap to Open UPI App</span>
                          <span className="text-[9px] text-[#fce08b]">Amount: ₹{finalDepositAmt}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-800 font-bold bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 shrink-0" />
                        <span>राशि ₹{finalDepositAmt} ऑटोमैटिक फेच होगी</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-medium mt-1 leading-tight">
                        PhonePe, Paytm, GPay में स्कैन करते ही ₹{finalDepositAmt} खुद भर जाएगा
                      </span>
                    </div>

                    {/* Direct 1-Tap UPI Apps (PhonePe / Paytm / GPay / BHIM / CRED) */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-zinc-300 text-center flex items-center justify-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#f5c443]" />
                        <span>Direct 1-Tap Pay (ऑटो अमाउंट खुलेगा)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => launchUpiApp('phonepe')}
                          className="py-2.5 px-2 rounded-xl bg-[#5f259f]/20 hover:bg-[#5f259f]/35 border border-[#5f259f]/50 flex flex-col items-center justify-center gap-1 transition active:scale-95 text-center group shadow-sm"
                        >
                          <span className="w-7 h-7 rounded-full bg-[#5f259f] text-white flex items-center justify-center font-bold text-[11px] shadow-sm">
                            पे
                          </span>
                          <span className="text-[11px] font-bold text-white group-hover:text-purple-300">PhonePe</span>
                          <span className="text-[9px] text-purple-300 font-bold font-mono">₹{finalDepositAmt}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => launchUpiApp('paytm')}
                          className="py-2.5 px-2 rounded-xl bg-[#00b9f1]/20 hover:bg-[#00b9f1]/35 border border-[#00b9f1]/50 flex flex-col items-center justify-center gap-1 transition active:scale-95 text-center group shadow-sm"
                        >
                          <span className="w-7 h-7 rounded-full bg-[#002970] text-[#00b9f1] border border-[#00b9f1]/50 flex items-center justify-center font-black text-[10px] shadow-sm">
                            Pay
                          </span>
                          <span className="text-[11px] font-bold text-white group-hover:text-cyan-300">Paytm</span>
                          <span className="text-[9px] text-cyan-300 font-bold font-mono">₹{finalDepositAmt}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => launchUpiApp('gpay')}
                          className="py-2.5 px-2 rounded-xl bg-[#4285f4]/20 hover:bg-[#4285f4]/35 border border-[#4285f4]/50 flex flex-col items-center justify-center gap-1 transition active:scale-95 text-center group shadow-sm"
                        >
                          <span className="w-7 h-7 rounded-full bg-white text-[#4285f4] flex items-center justify-center font-black text-[11px] shadow-sm">
                            G
                          </span>
                          <span className="text-[11px] font-bold text-white group-hover:text-blue-300">Google Pay</span>
                          <span className="text-[9px] text-blue-300 font-bold font-mono">₹{finalDepositAmt}</span>
                        </button>
                      </div>

                      {/* Second row of UPI quick launchers: BHIM & CRED */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => launchUpiApp('bhim')}
                          className="py-2 px-2.5 rounded-xl bg-[#0078d4]/15 hover:bg-[#0078d4]/25 border border-[#0078d4]/40 flex items-center justify-center gap-1.5 transition active:scale-95 text-center group shadow-sm"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#0078d4] text-white flex items-center justify-center font-black text-[9px]">
                            B
                          </span>
                          <span className="text-[11px] font-bold text-white group-hover:text-blue-200">BHIM UPI</span>
                          <span className="text-[9px] text-blue-300 font-mono font-bold ml-auto">₹{finalDepositAmt}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => launchUpiApp('cred')}
                          className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/20 flex items-center justify-center gap-1.5 transition active:scale-95 text-center group shadow-sm"
                        >
                          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-black text-[9px]">
                            C
                          </span>
                          <span className="text-[11px] font-bold text-white group-hover:text-zinc-200">CRED UPI</span>
                          <span className="text-[9px] text-amber-300 font-mono font-bold ml-auto">₹{finalDepositAmt}</span>
                        </button>
                      </div>

                      {/* Generic Any UPI App Button */}
                      <button
                        type="button"
                        onClick={() => launchUpiApp('generic')}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/25 via-emerald-500/25 to-amber-500/25 hover:from-amber-500/35 hover:to-emerald-500/35 border border-[#f5c443]/50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-98"
                      >
                        <QrCode className="w-4 h-4 text-[#f5c443]" />
                        <span>Open Any Installed UPI App (₹{finalDepositAmt})</span>
                      </button>
                    </div>

                    {/* Copy Details (UPI ID & Exact Amount) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* UPI ID Box */}
                      <div className="bg-[#0d0f17] p-2.5 px-3 rounded-xl border border-white/10 flex items-center justify-between">
                        <div className="overflow-hidden pr-2">
                          <div className="text-[10px] text-zinc-400">Official UPI ID</div>
                          <div className="font-mono text-[#fce08b] font-bold text-xs truncate">{upiPayId}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="shrink-0 px-2 py-1 rounded-lg bg-[#f5c443]/15 text-[#f5c443] font-bold text-xs hover:bg-[#f5c443]/30 flex items-center gap-1 transition active:scale-95"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUpi ? 'Copied' : 'Copy ID'}</span>
                        </button>
                      </div>

                      {/* Copy Amount Box */}
                      <div className="bg-[#0d0f17] p-2.5 px-3 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-zinc-400">Exact Deposit Amount</div>
                          <div className="font-mono text-emerald-400 font-bold text-xs">₹{finalDepositAmt}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyAmount}
                          className="shrink-0 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs hover:bg-emerald-500/30 flex items-center gap-1 transition active:scale-95"
                        >
                          {copiedAmount ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedAmount ? 'Copied' : 'Copy Amt'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#0d0f17] p-6 rounded-2xl border border-amber-500/30 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">No UPI payment method is currently available.</h4>
                    <p className="text-xs text-zinc-400">Please choose Bank Card / Transfer or check back in a few minutes.</p>
                  </div>
                )}
              </div>
            )}

            {/* CONDITION 2: BANK CARD / TRANSFER ONLY (No QR Code shown) */}
            {isBankPayment && (
              <div className="bg-[#0d0f17] p-3 rounded-2xl border border-white/10 space-y-2 text-xs">
                {isBankActive ? (
                  <>
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                      <span className="text-[11px] font-bold text-zinc-300">Receiving Bank Account</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                        Verified Bank
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      {/* Bank Name */}
                      <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                        <span className="text-zinc-400">Bank Name:</span>
                        <span className="font-bold text-white">
                          {adminBankDetails?.bankName}
                        </span>
                      </div>

                      {/* A/C Number */}
                      <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                        <span className="text-zinc-400">Account No:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#fce08b] text-xs">
                            {adminBankDetails?.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(adminBankDetails?.accountNumber || '');
                              setCopiedBank('acc');
                              showToast(t('copied', 'Account number copied!'), 'info');
                              setTimeout(() => setCopiedBank(null), 2000);
                            }}
                            className="px-2 py-0.5 rounded bg-[#f5c443]/15 text-[#f5c443] hover:bg-[#f5c443]/30 text-[10px] font-bold flex items-center gap-1"
                          >
                            {copiedBank === 'acc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBank === 'acc' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* IFSC Code */}
                      <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                        <span className="text-zinc-400">IFSC Code:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">
                            {adminBankDetails?.ifscCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(adminBankDetails?.ifscCode || '');
                              setCopiedBank('ifsc');
                              showToast(t('copied', 'IFSC code copied!'), 'info');
                              setTimeout(() => setCopiedBank(null), 2000);
                            }}
                            className="px-2 py-0.5 rounded bg-[#f5c443]/15 text-[#f5c443] hover:bg-[#f5c443]/30 text-[10px] font-bold flex items-center gap-1"
                          >
                            {copiedBank === 'ifsc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBank === 'ifsc' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Account Holder */}
                      <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                        <span className="text-zinc-400">Beneficiary:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-[11px] truncate max-w-[130px]">
                            {adminBankDetails?.accountHolderName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(adminBankDetails?.accountHolderName || '');
                              setCopiedBank('name');
                              showToast(t('copied', 'Holder name copied!'), 'info');
                              setTimeout(() => setCopiedBank(null), 2000);
                            }}
                            className="px-2 py-0.5 rounded bg-[#f5c443]/15 text-[#f5c443] hover:bg-[#f5c443]/30 text-[10px] font-bold flex items-center gap-1"
                          >
                            {copiedBank === 'name' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBank === 'name' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-400 pt-1 leading-relaxed">
                      Transfer ₹{finalDepositAmt} via IMPS/NEFT/NetBanking to the account above, then enter the 12-digit UTR below.
                    </p>
                  </>
                ) : (
                  <div className="p-5 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">No Bank transfer method is currently available.</h4>
                    <p className="text-xs text-zinc-400">Please choose UPI QR or check back in a few minutes.</p>
                  </div>
                )}
              </div>
            )}

            {/* 12-DIGIT UTR SUBMIT FORM */}
            {(isBankPayment ? isBankActive : isUpiActive) && (
              <form onSubmit={handleDepositSubmit} className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] text-zinc-200 font-bold">
                      Enter 12-digit UTR / Ref Number:
                    </label>
                    {utrReference.length === 12 ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Check className="w-3 h-3" /> 12/12 Digits (Valid)
                      </span>
                    ) : utrReference.length > 0 ? (
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {utrReference.length}/12 ({12 - utrReference.length} more)
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">
                        Exact 12 Digits Required
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={utrReference}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setUtrReference(val);
                    }}
                    placeholder="e.g. 412345678901 (12 digits)"
                    className={`w-full h-11 px-3.5 bg-[#0d0f17] border rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none transition tracking-wider ${
                      utrReference.length === 12
                        ? 'border-emerald-500 ring-1 ring-emerald-500/40 bg-emerald-950/10'
                        : 'border-white/15 focus:border-[#f5c443]'
                    }`}
                    required
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Copy the 12-digit transaction ID (UTR / Reference No.) from your payment confirmation screen and paste here.
                  </p>
                </div>

                {/* Deposit Note Input */}
                <div>
                  <label className="text-[11px] text-zinc-200 font-bold flex items-center justify-between mb-1">
                    <span>Note / Remarks (Optional - नोट):</span>
                  </label>
                  <input
                    type="text"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    placeholder="e.g. Recharge for game / Reference"
                    maxLength={100}
                    className="w-full h-10 px-3 bg-[#0d0f17] border border-white/15 focus:border-[#f5c443] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingDeposit || utrReference.length !== 12}
                  className="w-full py-3.5 bg-gradient-to-r from-[#f5c443] via-[#ffb703] to-[#d48b0c] text-[#0d0f17] font-black text-xs rounded-xl shadow-md hover:brightness-110 active:scale-98 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submittingDeposit
                    ? 'Submitting Proof...'
                    : utrReference.length !== 12
                    ? `Enter 12-digit UTR (${utrReference.length}/12)`
                    : `Submit Deposit Proof (₹${finalDepositAmt.toLocaleString()})`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
