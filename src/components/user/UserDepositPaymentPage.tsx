import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  ArrowLeft, QrCode, Building, Copy, Check, ExternalLink,
  ShieldCheck, AlertCircle, Sparkles, Smartphone, CheckCircle2,
  HelpCircle, ChevronDown, ChevronUp, Lock, RefreshCw, Headphones
} from 'lucide-react';

interface UserDepositPaymentPageProps {
  amount: number;
  paymentMethod: string;
  channelId?: string;
  adminUpiDetails?: any;
  adminBankDetails?: any;
  onBack: () => void;
  onSuccess: (depositData: any) => void;
  onOpenSupport?: () => void;
}

export const UserDepositPaymentPage: React.FC<UserDepositPaymentPageProps> = ({
  amount,
  paymentMethod,
  channelId = 'Phonepe_QR',
  adminUpiDetails,
  adminBankDetails,
  onBack,
  onSuccess,
  onOpenSupport,
}) => {
  const { user, showToast, refreshUser } = useAuth();

  const [utrReference, setUtrReference] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [qrImgError, setQrImgError] = useState(false);
  const [showUtrHelp, setShowUtrHelp] = useState(false);

  const defaultUpiId = '8210764704@okbizaxis';
  const upiPayId = (adminUpiDetails?.upiId && adminUpiDetails.upiId.trim()) || defaultUpiId;
  const isUpiActive = Boolean(adminUpiDetails?.isEnabled !== false && upiPayId);
  const isBankActive = Boolean(adminBankDetails?.isEnabled && adminBankDetails?.accountNumber);

  const isBankPayment = paymentMethod === 'bank_card' || channelId?.toLowerCase().includes('bank');
  const finalDepositAmt = Number(amount) || 500;
  const formattedAmt = finalDepositAmt.toFixed(2);
  const payeeName = (adminUpiDetails?.payeeName && adminUpiDetails.payeeName.trim()) || 'Aadi Shakti';
  const [orderRefId] = useState(() => `DP${user?.uid || '108429'}${Date.now().toString().slice(-6)}`);
  const upiTransactionNote = `Recharge_${user?.uid || 'Client'}_${orderRefId.slice(-4)}`;

  // NPCI Standard UPI Intent URIs
  const rawUpiParams = `pa=${encodeURIComponent(upiPayId)}&pn=${encodeURIComponent(payeeName)}&am=${formattedAmt}&cu=INR&tn=${encodeURIComponent(upiTransactionNote)}`;
  const genericUpiUri = `upi://pay?${rawUpiParams}`;
  const qrCodeImg = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(genericUpiUri)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiPayId);
    setCopiedUpi(true);
    showToast('UPI ID copied to clipboard!', 'info');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(String(finalDepositAmt));
    setCopiedAmount(true);
    showToast(`Amount ₹${finalDepositAmt} copied!`, 'info');
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const launchUpiApp = (appType: 'phonepe' | 'paytm' | 'gpay' | 'bhim' | 'cred' | 'generic') => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const paramString = `pa=${encodeURIComponent(upiPayId)}&pn=${encodeURIComponent(payeeName)}&am=${formattedAmt}&cu=INR&tn=${encodeURIComponent(upiTransactionNote)}`;

    let targetUrl = `upi://pay?${paramString}`;
    if (appType === 'phonepe') {
      targetUrl = `phonepe://upi/pay?${paramString}`;
    } else if (appType === 'paytm') {
      targetUrl = `paytmmp://pay?${paramString}`;
    } else if (appType === 'gpay') {
      targetUrl = `tez://upi/pay?${paramString}`;
    } else if (appType === 'bhim') {
      targetUrl = `bhim://upi/pay?${paramString}`;
    } else if (appType === 'cred') {
      targetUrl = `cred://upi/pay?${paramString}`;
    }

    if (isMobile) {
      window.location.href = targetUrl;
    } else {
      try {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.location.href = targetUrl;
      }
    }
  };

  const handlePasteUtr = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const clean = text.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
        setUtrReference(clean);
        showToast('UTR pasted from clipboard!', 'info');
      }
    } catch {
      showToast('Please type your 12-digit UTR manually', 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrReference.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();

    if (!cleanUtr || cleanUtr.length < 8 || cleanUtr.length > 24) {
      showToast('Please enter a valid 12-digit UTR or Transaction Reference number.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await api.submitDeposit({
        uid: user?.uid,
        username: user?.username,
        amount: finalDepositAmt,
        paymentMethod: isBankPayment ? 'Bank Transfer' : 'UPI QR',
        utrReference: cleanUtr,
        note: depositNote.trim() || undefined,
      });

      if (res && (res.success || res.deposit)) {
        showToast('Deposit request submitted! Verification takes 1-3 minutes.', 'success');
        refreshUser();
        onSuccess(res.deposit || res);
      } else {
        showToast(res?.error || 'Failed to submit deposit request. Please try again.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit deposit. Please check your network and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] text-white flex flex-col pb-16">
      {/* Top Fixed Header */}
      <div className="sticky top-0 z-40 bg-[#121522]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm font-black text-white flex items-center justify-center gap-1.5">
            <span className="text-[#f5c443]">Deposit Payment</span>
          </h1>
          <p className="text-[10px] text-zinc-400">Complete payment & enter UTR</p>
        </div>

        {onOpenSupport ? (
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f5c443]/15 text-[#f5c443] hover:bg-[#f5c443]/25 text-xs font-bold transition cursor-pointer"
            title="Customer Support"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Support</span>
          </button>
        ) : (
          <div className="w-14" />
        )}
      </div>

      <div className="max-w-md w-full mx-auto px-4 py-4 space-y-4">
        {/* Order Summary Card */}
        <div className="bg-gradient-to-r from-[#181d2e] via-[#1b2238] to-[#181d2e] border border-[#f5c443]/40 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-zinc-300 font-medium">Order: <span className="font-mono text-zinc-200">{orderRefId}</span></span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
              Pending UTR
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1 border-t border-white/10">
            <span className="text-xs text-zinc-400 font-semibold">Payable Amount:</span>
            <div className="text-2xl sm:text-3xl font-black text-[#f5c443] font-mono tracking-tight flex items-baseline gap-1">
              <span className="text-base text-amber-400 font-sans">₹</span>
              <span>{finalDepositAmt.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* CONDITION 1: UPI QR CODE & 1-TAP APPS */}
        {!isBankPayment && (
          <div className="space-y-4">
            {isUpiActive ? (
              <>
                {/* Dynamic QR Code Card */}
                <div className="bg-[#141828] border border-white/10 rounded-2xl p-4 flex flex-col items-center shadow-lg">
                  <div className="w-full bg-gradient-to-r from-amber-500 via-[#f5c443] to-amber-500 text-black font-black text-xs py-1 px-3 rounded-lg mb-3 shadow-sm flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 fill-black" />
                    <span>ऑटो अमाउंट QR • ₹{finalDepositAmt}</span>
                  </div>

                  {/* QR Image */}
                  <div
                    onClick={() => launchUpiApp('generic')}
                    className="p-3 bg-white rounded-2xl shadow-2xl border-2 border-[#f5c443]/50 cursor-pointer group relative transition hover:scale-[1.01]"
                    title="Tap to open UPI app"
                  >
                    {!qrImgError ? (
                      <img
                        src={qrCodeImg}
                        alt="Dynamic UPI QR"
                        onError={() => setQrImgError(true)}
                        className="w-52 h-52 object-contain rounded-xl"
                      />
                    ) : (
                      <div className="w-52 h-52 flex flex-col items-center justify-center text-zinc-700 p-2 text-center">
                        <QrCode className="w-12 h-12 text-zinc-400 mb-1" />
                        <span className="text-[11px] font-bold">Scan with any UPI App</span>
                        <span className="text-[9px] text-zinc-500 mt-1 font-mono">{upiPayId}</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition text-white text-xs font-bold gap-1 px-2">
                      <ExternalLink className="w-5 h-5 text-[#f5c443]" />
                      <span>Tap to Open UPI App</span>
                      <span className="text-[10px] text-amber-300 font-mono">Amount: ₹{finalDepositAmt}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-800/80 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>राशि ₹{finalDepositAmt} खुद भर जाएगी (Auto-filled)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 text-center mt-1.5">
                    PhonePe, Paytm, Google Pay, BHIM से स्कैन करें
                  </p>
                </div>

                {/* Direct 1-Tap UPI Launch Buttons */}
                <div className="bg-[#141828] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-lg">
                  <div className="text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#f5c443]" />
                    <span>Direct 1-Tap Pay (ऑटो अमाउंट खुलेगा)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => launchUpiApp('phonepe')}
                      className="py-2.5 px-2 rounded-xl bg-[#5f259f]/25 hover:bg-[#5f259f]/40 border border-[#5f259f]/50 flex flex-col items-center justify-center gap-1 transition active:scale-95 text-center cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-full bg-[#5f259f] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        पे
                      </span>
                      <span className="text-xs font-bold text-white">PhonePe</span>
                      <span className="text-[10px] text-purple-300 font-mono font-bold">₹{finalDepositAmt}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => launchUpiApp('paytm')}
                      className="py-2.5 px-2 rounded-xl bg-[#00b9f1]/20 hover:bg-[#00b9f1]/35 border border-[#00b9f1]/50 flex flex-col items-center justify-center gap-1 transition active:scale-95 text-center cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-full bg-[#002970] text-[#00b9f1] border border-[#00b9f1]/50 flex items-center justify-center font-black text-[11px] shadow-sm">
                        Pay
                      </span>
                      <span className="text-xs font-bold text-white">Paytm</span>
                      <span className="text-[10px] text-cyan-300 font-mono font-bold">₹{finalDepositAmt}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => launchUpiApp('gpay')}
                      className="py-2.5 px-2 rounded-xl bg-[#4285f4]/20 hover:bg-[#4285f4]/35 border border-[#4285f4]/50 flex flex-col items-center justify-center gap-1 transition active:scale-95 text-center cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-full bg-white text-[#4285f4] flex items-center justify-center font-black text-xs shadow-sm">
                        G
                      </span>
                      <span className="text-xs font-bold text-white">Google Pay</span>
                      <span className="text-[10px] text-blue-300 font-mono font-bold">₹{finalDepositAmt}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => launchUpiApp('bhim')}
                      className="py-2 px-3 rounded-xl bg-[#0078d4]/15 hover:bg-[#0078d4]/25 border border-[#0078d4]/40 flex items-center justify-between transition active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#0078d4] text-white flex items-center justify-center font-black text-[10px]">
                          B
                        </span>
                        <span className="text-xs font-bold text-white">BHIM UPI</span>
                      </div>
                      <span className="text-[10px] text-blue-300 font-mono font-bold">₹{finalDepositAmt}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => launchUpiApp('cred')}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/20 flex items-center justify-between transition active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-black text-[10px]">
                          C
                        </span>
                        <span className="text-xs font-bold text-white">CRED UPI</span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono font-bold">₹{finalDepositAmt}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => launchUpiApp('generic')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-[#f5c443]/40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-[#f5c443]" />
                    <span>Open Any Installed UPI App (₹{finalDepositAmt})</span>
                  </button>
                </div>

                {/* Copy Details Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-[#141828] p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="overflow-hidden pr-2">
                      <div className="text-[10px] text-zinc-400">Official UPI ID</div>
                      <div className="font-mono text-[#fce08b] font-bold text-xs truncate">{upiPayId}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#f5c443]/15 text-[#f5c443] font-bold text-xs hover:bg-[#f5c443]/30 flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="bg-[#141828] p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400">Exact Deposit Amount</div>
                      <div className="font-mono text-emerald-400 font-bold text-xs">₹{finalDepositAmt}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs hover:bg-emerald-500/30 flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-[#141828] p-6 rounded-2xl border border-amber-500/30 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">No UPI payment method is currently active.</h4>
                <p className="text-xs text-zinc-400">Please choose Bank Card / Transfer or contact support.</p>
              </div>
            )}
          </div>
        )}

        {/* CONDITION 2: BANK CARD / IMPS TRANSFER */}
        {isBankPayment && (
          <div className="bg-[#141828] p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#f5c443]">
                <Building className="w-4 h-4" />
                <span className="text-xs font-bold text-white">Receiving Bank Account</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Verified Account
              </span>
            </div>

            {isBankActive ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl">
                  <span className="text-zinc-400">Bank Name:</span>
                  <span className="font-bold text-white">{adminBankDetails?.bankName}</span>
                </div>

                <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl">
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
                        showToast('Account number copied!', 'info');
                        setTimeout(() => setCopiedBank(null), 2000);
                      }}
                      className="px-2 py-1 rounded bg-[#f5c443]/15 text-[#f5c443] hover:bg-[#f5c443]/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedBank === 'acc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBank === 'acc' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl">
                  <span className="text-zinc-400">IFSC Code:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {adminBankDetails?.ifscCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(adminBankDetails?.ifscCode || '');
                        setCopiedBank('ifsc');
                        showToast('IFSC copied!', 'info');
                        setTimeout(() => setCopiedBank(null), 2000);
                      }}
                      className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedBank === 'ifsc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBank === 'ifsc' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {adminBankDetails?.holderName && (
                  <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl">
                    <span className="text-zinc-400">Beneficiary:</span>
                    <span className="font-bold text-white">{adminBankDetails.holderName}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-zinc-400">
                Bank transfer details currently updating. Please use UPI QR.
              </div>
            )}
          </div>
        )}

        {/* 12-DIGIT UTR SUBMISSION FORM */}
        <form onSubmit={handleSubmit} className="bg-[#141828] border border-[#f5c443]/35 rounded-2xl p-4 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <label className="text-xs font-black text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f5c443]" />
              <span>Enter 12-digit UTR Number</span>
            </label>
            <button
              type="button"
              onClick={() => setShowUtrHelp(!showUtrHelp)}
              className="text-[10px] text-amber-300 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Where is UTR?</span>
              {showUtrHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible UTR Help Box */}
          {showUtrHelp && (
            <div className="bg-[#0b0e17] border border-amber-500/25 rounded-xl p-3 text-[11px] space-y-1.5 text-zinc-300">
              <div className="font-bold text-amber-300">Where to find 12-digit UTR?</div>
              <p>• <strong>PhonePe:</strong> In transaction details, see <strong>UTR: 12 digits</strong></p>
              <p>• <strong>Google Pay:</strong> See <strong>UPI Transaction ID: 12 digits</strong></p>
              <p>• <strong>Paytm:</strong> See <strong>UPI Ref No.: 12 digits</strong></p>
            </div>
          )}

          {/* UTR Input Field */}
          <div className="relative">
            <input
              type="text"
              required
              value={utrReference}
              onChange={(e) => setUtrReference(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
              placeholder="e.g. 425689123456"
              maxLength={24}
              className="w-full bg-[#0b0e17] border border-white/15 focus:border-[#f5c443] rounded-xl px-3.5 py-3 pr-20 text-sm text-white font-mono font-bold placeholder:text-zinc-600 outline-none transition"
            />
            <button
              type="button"
              onClick={handlePasteUtr}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-[#f5c443]/20 hover:bg-[#f5c443]/30 text-[#f5c443] text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Paste
            </button>
          </div>

          {/* Optional Note */}
          <input
            type="text"
            value={depositNote}
            onChange={(e) => setDepositNote(e.target.value)}
            placeholder="Optional note / Sender name"
            maxLength={60}
            className="w-full bg-[#0b0e17] border border-white/10 focus:border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none"
          />

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={submitting || !utrReference.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#e5a93c] via-[#f0b034] to-[#e5a93c] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 text-black font-black text-sm shadow-[0_0_20px_rgba(240,176,52,0.3)] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Verifying & Submitting...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-black stroke-[3]" />
                <span>Submit 12-Digit UTR / यूटीआर सबमिट करें</span>
              </>
            )}
          </button>
        </form>

        {/* 4-Step Instructions Card */}
        <div className="bg-[#141828] border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="font-bold text-[#f5c443] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#f5c443]" />
            <span>4-Step Payment Process</span>
          </div>

          <div className="space-y-2 text-[11px] text-zinc-300">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#f5c443]/20 text-[#f5c443] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Scan QR code or click PhonePe/Paytm/GPay above.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#f5c443]/20 text-[#f5c443] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Complete payment of exact <strong>₹{finalDepositAmt}</strong>.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#f5c443]/20 text-[#f5c443] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Copy the 12-digit UTR or Transaction Ref number from receipt.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#f5c443]/20 text-[#f5c443] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>Paste in the box above and click Submit. Wallet updates in 1-3 minutes.</span>
            </div>
          </div>
        </div>

        {/* 100% Security Guarantee Badge */}
        <div className="text-center py-2 flex items-center justify-center gap-1.5 text-zinc-500 text-[11px]">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>100% Secure & Encrypted Instant Settlement</span>
        </div>
      </div>
    </div>
  );
};
