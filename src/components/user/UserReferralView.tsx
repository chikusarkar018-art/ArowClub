import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  ChevronLeft, Users, Copy, Check, Share2, DollarSign,
  Award, Layers, ChevronRight, FileText, HelpCircle,
  Headphones, Percent, Sparkles, Filter, X, ArrowUpRight,
  ShieldCheck, RefreshCw, Trophy
} from 'lucide-react';

interface UserReferralViewProps {
  onBack: () => void;
  onOpenSupport?: () => void;
  onNavigateDeposit?: () => void;
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className={className}>
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.83a8.188 8.188 0 0 1-5.82 2.41c-1.47 0-2.9-.39-4.16-1.14l-.3-.18-3.1 1.82.83-3.02-.19-.31A8.2 8.2 0 0 1 3.8 11.91c0-4.54 3.7-8.24 8.25-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.23.9 2.42 1.02 2.59.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
  </svg>
);

const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

export const UserReferralView: React.FC<UserReferralViewProps> = ({
  onBack,
  onOpenSupport,
  onNavigateDeposit,
}) => {
  const { user, showToast, refreshUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Active sub-modal states
  const [activeModal, setActiveModal] = useState<
    'none' | 'subordinates' | 'commission' | 'rules' | 'rebate' | 'link'
  >('none');

  const fetchAgencyData = async () => {
    try {
      setLoading(true);
      const res = await api.getReferralInfo();
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load agency data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencyData();
  }, [user?.uid]);

  const referralCode = (data?.referralCode ? String(data.referralCode).replace(/\D/g, '') : '') || 
    (user?.referralCode ? String(user.referralCode).replace(/\D/g, '') : '') || 
    (user?.uid ? String(user.uid).replace(/\D/g, '') : '100001');
  const referralLink = `${window.location.origin}/#/register?invitationCode=${referralCode}`;

  const shareText = `🔥 Join me on ArowClub & Win Big!\n\n🎁 Exclusive Welcome Bonus & Daily Rewards\n⚡ Instant 30s Win Go & 7 Up 7 Down\n💰 Fast Withdrawals to Bank & UPI\n\n👉 Register here: ${referralLink}\n🔑 Invitation Code: ${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showToast('Invitation Code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    showToast('Invitation Link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`🔥 Join ArowClub with my invitation code ${referralCode} & claim exclusive bonuses!`)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ArowClub VIP Invitation',
          text: shareText,
          url: referralLink,
        });
      } catch (e) {
        console.log('Share canceled or failed', e);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleClaimCommission = async () => {
    if ((data?.availableToClaim || 0) <= 0) {
      showToast('No claimable commission available yet.', 'error');
      return;
    }
    try {
      setClaiming(true);
      const res = await api.claimReferralCommission();
      if (res?.success) {
        showToast(res.message || 'Commission claimed successfully!', 'success');
        refreshUser();
        fetchAgencyData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to claim commission', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const yesterdayComm = data?.yesterdayCommission ?? 0;
  const direct = data?.direct || {
    registeredCount: 0,
    depositNumber: 0,
    depositAmount: 0,
    firstDepositNumber: 0,
    turnover: 0,
    users: [],
  };
  const team = data?.team || {
    registeredCount: 0,
    depositNumber: 0,
    depositAmount: 0,
    firstDepositNumber: 0,
    turnover: 0,
    users: [],
  };

  const thisWeekComm = data?.thisWeekCommission ?? 0;
  const totalComm = data?.totalCommissionEarned ?? 0;
  const availableClaim = data?.availableToClaim ?? 0;
  const directSubCount = direct.registeredCount || 0;
  const totalTeamCount = directSubCount + (team.registeredCount || 0);

  return (
    <div className="min-h-screen bg-[#07080e] text-white flex flex-col font-sans pb-28 select-none">
      
      {/* 1. Header (Agency + Filter Icon) */}
      <header className="px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 bg-[#0c0e17] border-b border-[#222738] shadow-md">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="font-extrabold text-base text-white tracking-wide">
          Agency
        </h1>

        <button
          onClick={() => setActiveModal('rules')}
          className="w-8 h-8 rounded-xl bg-[#161a28] border border-white/10 flex items-center justify-center text-[#f5c443] hover:text-yellow-300 active:scale-95 transition cursor-pointer"
          title="Invitation Rules & Filter"
        >
          <Filter className="w-4 h-4" />
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 px-3.5 pt-3 max-w-md mx-auto w-full space-y-3.5">
        
        {/* 2. Top Big Commission Card (Yellow/Black Luxury Look) */}
        <div className="bg-gradient-to-b from-[#131726] via-[#101320] to-[#0a0c14] border border-[#f5c443]/30 rounded-3xl p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
          
          {/* Subtle Golden Glow effect */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#f5c443]/15 blur-2xl rounded-full pointer-events-none" />

          {/* Big Commission Amount */}
          <div className="text-4xl sm:text-5xl font-black text-[#f5c443] font-mono tracking-tight drop-shadow-[0_2px_10px_rgba(245,196,67,0.3)]">
            ₹{yesterdayComm.toFixed(2)}
          </div>

          {/* Yesterday's total commission Pill */}
          <div className="mt-2.5 inline-flex items-center justify-center">
            <span className="px-4 py-1.5 rounded-full bg-[#1e243b] border border-[#f5c443]/40 text-[#f5c443] text-xs font-bold tracking-wide shadow-sm">
              Yesterday&apos;s total commission
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-[11px] text-zinc-400 font-medium mt-2">
            Upgrade the level to increase commission income
          </p>

          {/* Available to Claim Bar if any */}
          {availableClaim > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between bg-[#191e32]/60 p-2.5 rounded-2xl">
              <div className="text-left">
                <div className="text-[10px] text-zinc-400 font-medium">Unsettled Commission</div>
                <div className="text-sm font-black text-emerald-400 font-mono">₹{availableClaim.toFixed(2)}</div>
              </div>
              <button
                onClick={handleClaimCommission}
                disabled={claiming}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-95 text-black font-black text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {claiming ? 'Claiming...' : 'Claim to Wallet'}
              </button>
            </div>
          )}
        </div>

        {/* 3. Subordinates Comparison Table (Direct subordinates vs Team subordinates) */}
        <div className="bg-[#0f121d] border border-[#23293e] rounded-3xl overflow-hidden shadow-xl">
          <div className="grid grid-cols-2 divide-x divide-[#23293e]">
            
            {/* Direct subordinates column */}
            <div className="p-3.5 space-y-3">
              <div className="text-center pb-2 border-b border-[#23293e]">
                <h3 className="text-xs font-black text-white">Direct subordinates</h3>
              </div>

              {/* Stat 1: Number of register */}
              <div className="text-center">
                <div className="text-base font-black text-[#f5c443] font-mono">
                  {direct.registeredCount || 0}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Number of register</div>
              </div>

              {/* Stat 2: Deposit number */}
              <div className="text-center">
                <div className="text-base font-black text-[#f5c443] font-mono">
                  {direct.depositNumber || 0}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Deposit number</div>
              </div>

              {/* Stat 3: Deposit amount */}
              <div className="text-center">
                <div className="text-base font-black text-[#f5c443] font-mono">
                  ₹{direct.depositAmount || 0}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Deposit amount</div>
              </div>

              {/* Stat 4: Number of people making first deposit */}
              <div className="text-center">
                <div className="text-base font-black text-[#f5c443] font-mono">
                  {direct.firstDepositNumber || 0}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  Number of people making first deposit
                </div>
              </div>
            </div>

            {/* Team subordinates column */}
            <div className="p-3.5 space-y-3">
              <div className="text-center pb-2 border-b border-[#23293e]">
                <h3 className="text-xs font-black text-white">Team subordinates</h3>
              </div>

              {/* Stat 1: Number of register */}
              <div className="text-center">
                <div className="text-base font-black text-[#f5c443] font-mono">
                  {team.registeredCount || 0}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Number of register</div>
              </div>

              {/* Stat 2: Deposit number */}
              <div className="text-center">
                <div className="text-base font-black text-[#f5c443] font-mono">
                  {team.depositNumber || 0}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Deposit number</div>
              </div>

              {/* Stat 3: Deposit amount */}
              <div className="text-center">
                <div className="text-base font-black text-[#f5c443] font-mono">
                  ₹{team.depositAmount || 0}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Deposit amount</div>
              </div>

              {/* Stat 4: Number of people making first deposit */}
              <div className="text-center">
                <div className="text-base font-black text-[#f5c443] font-mono">
                  {team.firstDepositNumber || 0}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  Number of people making first deposit
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 4. Prominent INVITATION LINK Button & Quick Social Share Bar */}
        <div className="space-y-2">
          <button
            onClick={() => setActiveModal('link')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d99b26] via-[#f5c443] to-[#fbbf24] hover:brightness-110 active:scale-98 text-black font-black text-sm tracking-wider uppercase shadow-[0_6px_20px_rgba(245,196,67,0.35)] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-5 h-5 stroke-[2.5]" />
            <span>INVITATION LINK</span>
          </button>

          {/* Quick Direct Share on WhatsApp & Telegram */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              title="Share directly on WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleShareTelegram}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:brightness-110 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              title="Share directly on Telegram"
            >
              <TelegramIcon className="w-4 h-4 text-white" />
              <span>Telegram</span>
            </button>
          </div>
        </div>

        {/* 5. Copy Invitation Code Row */}
        <div className="bg-[#10131f] border border-[#23293e] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1a2035] border border-white/10 flex items-center justify-center text-[#f5c443] shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-200">Copy invitation code</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-[#f5c443] tracking-wider">
              {referralCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg bg-[#1a2035] hover:bg-[#252c48] text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              title="Copy code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
            </button>
          </div>
        </div>

        {/* 6. List Menu Items with Icons & Right Chevrons */}
        <div className="bg-[#0f121d] border border-[#23293e] rounded-3xl divide-y divide-[#1e2335] shadow-xl overflow-hidden">
          
          {/* Subordinate data */}
          <button
            onClick={() => setActiveModal('subordinates')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#151928] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#191e32] flex items-center justify-center text-blue-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Subordinate data</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Commission detail */}
          <button
            onClick={() => setActiveModal('commission')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#151928] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#262013] flex items-center justify-center text-[#f5c443] shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Commission detail</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Invitation rules */}
          <button
            onClick={() => setActiveModal('rules')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#151928] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#231a32] flex items-center justify-center text-purple-400 shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Invitation rules</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Agent line customer service */}
          <button
            onClick={() => {
              if (onOpenSupport) onOpenSupport();
              else showToast('Opening VIP Agent Support...', 'info');
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#151928] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#132422] flex items-center justify-center text-emerald-400 shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Agent line customer service</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Rebate ratio */}
          <button
            onClick={() => setActiveModal('rebate')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#151928] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2b1f1a] flex items-center justify-center text-amber-500 shrink-0">
                <Percent className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Rebate ratio</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

        </div>

        {/* 7. Bottom Summary Card (Promotion data) */}
        <div className="bg-[#0f121d] border border-[#23293e] rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1e2335]">
            <div className="w-5 h-5 rounded-md bg-[#f5c443]/20 flex items-center justify-center text-[#f5c443]">
              <Trophy className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-black text-white">Promotion data</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            {/* Top Left: This Week */}
            <div className="bg-[#141724] p-3 rounded-2xl border border-white/5">
              <div className="text-base font-black text-white font-mono">
                ₹{thisWeekComm.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">This Week</div>
            </div>

            {/* Top Right: Total commission */}
            <div className="bg-[#141724] p-3 rounded-2xl border border-white/5">
              <div className="text-base font-black text-[#f5c443] font-mono">
                ₹{totalComm.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Total commission</div>
            </div>

            {/* Bottom Left: Direct Subordinate */}
            <div className="bg-[#141724] p-3 rounded-2xl border border-white/5">
              <div className="text-base font-black text-white font-mono">
                {directSubCount}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Direct Subordinate</div>
            </div>

            {/* Bottom Right: Total number of subordinates in the team */}
            <div className="bg-[#141724] p-3 rounded-2xl border border-white/5">
              <div className="text-base font-black text-white font-mono">
                {totalTeamCount}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                Total number of subordinates in the team
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ===================== MODALS ===================== */}

      {/* Modal 1: Invitation Link & QR Share */}
      {activeModal === 'link' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#f5c443]/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-sm text-[#f5c443] flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                <span>Share Invitation Link</span>
              </h3>
              <button
                onClick={() => setActiveModal('none')}
                className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Social Share Buttons: WhatsApp & Telegram */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-zinc-300">Quick Share to Social Apps:</div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleShareWhatsApp}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] hover:brightness-110 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(37,211,102,0.4)] transition cursor-pointer"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={handleShareTelegram}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-br from-[#2AABEE] to-[#229ED9] hover:brightness-110 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(42,171,238,0.4)] transition cursor-pointer"
                >
                  <TelegramIcon className="w-5 h-5" />
                  <span>Telegram</span>
                </button>
              </div>

              {/* Native App Share Button */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#1c2236] hover:bg-[#252c46] border border-white/10 active:scale-95 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[#f5c443]" />
                  <span>More Sharing Options (Other Apps)</span>
                </button>
              )}
            </div>

            {/* Invitation URL Box */}
            <div className="p-3 bg-[#0a0c14] border border-[#23293e] rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-semibold">
                <span>Invitation URL:</span>
                <span className="text-[#f5c443] font-bold">Auto-bind subordinate</span>
              </div>
              <div className="text-xs font-mono text-[#f5c443] break-all bg-[#151928] p-2.5 rounded-xl border border-white/5 select-all">
                {referralLink}
              </div>
            </div>

            {/* Copy Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="py-3 px-2 bg-gradient-to-r from-[#d99b26] to-[#f5c443] hover:brightness-110 active:scale-95 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={handleCopyCode}
                className="py-3 px-2 bg-[#1b2034] hover:bg-[#252c48] active:scale-95 text-white font-bold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="text-[10px] text-center text-zinc-400 leading-normal bg-[#0e111c] p-2.5 rounded-xl border border-white/5">
              💡 Friends registering via your <strong>WhatsApp / Telegram</strong> link will automatically earn you lifetime commission on every bet!
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Subordinate Data */}
      {activeModal === 'subordinates' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#23293e] rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl text-white overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#151928]">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Subordinate Data Records</span>
              </h3>
              <button
                onClick={() => setActiveModal('none')}
                className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
              <div className="text-[11px] font-bold text-[#f5c443] flex items-center justify-between">
                <span>Direct Subordinates ({direct.users?.length || 0})</span>
                <span>Team Subordinates ({team.users?.length || 0})</span>
              </div>

              {(!direct.users || direct.users.length === 0) && (!team.users || team.users.length === 0) ? (
                <div className="py-12 text-center text-zinc-500 space-y-2">
                  <Users className="w-10 h-10 mx-auto opacity-30 text-zinc-400" />
                  <p>No subordinate registered under your link yet.</p>
                  <button
                    onClick={() => setActiveModal('link')}
                    className="px-4 py-2 bg-[#f5c443] text-black font-black rounded-xl text-xs"
                  >
                    Share Invitation Link Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {direct.users?.map((u: any, i: number) => (
                    <div key={i} className="p-2.5 bg-[#171b2b] rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{u.username || `User #${u.uid}`}</span>
                          <span className="px-1.5 py-0.2 text-[9px] bg-blue-500/20 text-blue-400 rounded">Direct</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">UID: #{u.uid}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-[#f5c443] font-bold">Turnover: ₹{u.totalBet || 0}</div>
                        <div className="text-[9px] text-zinc-500">{new Date(u.date || Date.now()).toLocaleDateString('en-IN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Commission Detail */}
      {activeModal === 'commission' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#23293e] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-sm text-[#f5c443] flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Commission Breakdown</span>
              </h3>
              <button
                onClick={() => setActiveModal('none')}
                className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-[#151928] rounded-2xl flex justify-between items-center">
                <span className="text-zinc-400">Direct Subordinate Turnover:</span>
                <span className="font-mono font-bold text-white">₹{direct.turnover || 0}</span>
              </div>
              <div className="p-3 bg-[#151928] rounded-2xl flex justify-between items-center">
                <span className="text-zinc-400">Direct Commission Rate:</span>
                <span className="font-mono font-bold text-[#f5c443]">0.60%</span>
              </div>
              <div className="p-3 bg-[#151928] rounded-2xl flex justify-between items-center">
                <span className="text-zinc-400">Team Subordinate Turnover:</span>
                <span className="font-mono font-bold text-white">₹{team.turnover || 0}</span>
              </div>
              <div className="p-3 bg-[#151928] rounded-2xl flex justify-between items-center">
                <span className="text-zinc-400">Team Commission Rate:</span>
                <span className="font-mono font-bold text-[#f5c443]">0.30%</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0c14] border border-[#f5c443]/30 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-400">Available to Claim:</div>
                <div className="text-base font-mono font-black text-emerald-400">₹{availableClaim.toFixed(2)}</div>
              </div>
              <button
                onClick={handleClaimCommission}
                disabled={claiming || availableClaim <= 0}
                className="px-4 py-2 bg-gradient-to-r from-[#d99b26] to-[#f5c443] text-black font-black text-xs rounded-xl shadow transition disabled:opacity-40"
              >
                {claiming ? 'Processing...' : 'Transfer to Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Invitation Rules */}
      {activeModal === 'rules' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#23293e] rounded-3xl max-w-md w-full p-5 space-y-3.5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-sm text-[#f5c443] flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                <span>Agency Promotion Rules</span>
              </h3>
              <button
                onClick={() => setActiveModal('none')}
                className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <p>
                <strong>1. Multi-Tier Commission:</strong> When your friends register through your invitation link or enter your invitation code, they become your direct subordinates (Tier 1).
              </p>
              <p>
                <strong>2. Subordinate Turnover Rebate:</strong> Whenever your subordinates place bets on any game (WinGo, 7 Up Down, Aviator, Mines, etc.), commission is automatically calculated and added to your Agency account.
              </p>
              <p>
                <strong>3. Instant Wallet Settlement:</strong> Commission can be transferred directly to your wallet balance anytime with 1-click and used for playing or withdrawal without restrictions.
              </p>
              <p>
                <strong>4. Permanent Downline:</strong> Once a player registers under your invitation link, they remain permanently attached to your team.
              </p>
            </div>

            <button
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-[#1a2034] text-white font-bold text-xs rounded-xl"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Modal 5: Rebate Ratio */}
      {activeModal === 'rebate' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#23293e] rounded-3xl max-w-md w-full p-5 space-y-3.5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-sm text-[#f5c443] flex items-center gap-2">
                <Percent className="w-4 h-4" />
                <span>Agency Rebate Ratio Table</span>
              </h3>
              <button
                onClick={() => setActiveModal('none')}
                className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-4 text-[10px] font-black text-[#f5c443] uppercase pb-1 border-b border-white/10 text-center">
                <span className="text-left">Game Type</span>
                <span>Tier 1 (Direct)</span>
                <span>Tier 2 (Team)</span>
                <span>Tier 3</span>
              </div>

              {[
                { game: 'WinGo Lottery', t1: '0.60%', t2: '0.30%', t3: '0.15%' },
                { game: '7 Up & Down', t1: '0.60%', t2: '0.30%', t3: '0.15%' },
                { game: 'Aviator Crash', t1: '0.50%', t2: '0.25%', t3: '0.10%' },
                { game: 'Mines & Mini', t1: '0.50%', t2: '0.25%', t3: '0.10%' },
                { game: 'Roulette / Live', t1: '0.40%', t2: '0.20%', t3: '0.10%' },
                { game: 'Cricket / Sports', t1: '0.40%', t2: '0.20%', t3: '0.10%' },
              ].map((r, idx) => (
                <div key={idx} className="grid grid-cols-4 py-2 px-1 bg-[#151928] rounded-xl text-center items-center font-mono text-[11px]">
                  <span className="text-left font-sans font-bold text-white text-[11px]">{r.game}</span>
                  <span className="text-emerald-400 font-bold">{r.t1}</span>
                  <span className="text-[#f5c443]">{r.t2}</span>
                  <span className="text-cyan-400">{r.t3}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-[#f5c443] text-black font-black text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
