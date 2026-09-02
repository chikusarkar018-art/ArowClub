import React, { useState } from 'react';
import {
  ShieldCheck, Zap, Award, Users, Download, Play, CheckCircle2,
  ArrowRight, PhoneCall, HelpCircle, Star, Sparkles, Flame,
  Globe, Lock, DollarSign, Gift, ChevronDown, ChevronUp, Copy, Check,
  ExternalLink, Smartphone, MessageCircle, RefreshCw
} from 'lucide-react';
import { UserLogo } from '../user/UserLogo.js';

interface OfficialPortalLandingProps {
  onNavigateRegister: (inviteCode?: string) => void;
  onNavigateLogin: () => void;
  onLaunchGame: (gameKey?: string) => void;
  defaultInviteCode?: string;
}

export const OfficialPortalLanding: React.FC<OfficialPortalLandingProps> = ({
  onNavigateRegister,
  onNavigateLogin,
  onLaunchGame,
  defaultInviteCode = '100001',
}) => {
  const [customInviteInput, setCustomInviteInput] = useState(defaultInviteCode);
  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Generate exact invitation link format requested: /#/register?invitationCode=XXXX
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://arowclub.com';
  const generatedLink = `${originUrl}/#/register?invitationCode=${customInviteInput.trim() || '100001'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `🔥 Join ArowClub (एरून क्लब) - India's #1 Official Gaming Platform!\n\n🎁 Get ₹500 Welcome Bonus + 100% First Deposit Match\n⚡ 30-Second Fast Win Go & Aviator Payouts\n💰 24/7 Instant Auto UPI & Bank Withdrawals\n\n👉 Register Now: ${generatedLink}\n🔑 Invitation Code: ${customInviteInput.trim() || '100001'}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const gamesCatalog = [
    {
      id: 'wingo',
      name: 'Win Go 30s / 1m',
      category: 'Color Prediction',
      desc: 'Predict Green, Violet, Red & Lucky Numbers with 9x multiplier payout.',
      badge: '🔥 Most Popular',
      color: 'from-amber-500/30 to-amber-900/40',
      borderColor: 'border-amber-500/40',
      payoutRate: '98.8% RTP',
      gameKey: 'game',
      icon: '🎨',
    },
    {
      id: 'aviator',
      name: 'Aviator Crash',
      category: 'Crash Multiplier',
      desc: 'Watch the lucky plane take off and cash out before it flies away. Up to 100x+!',
      badge: '⚡ High Multiplier',
      color: 'from-rose-500/30 to-rose-900/40',
      borderColor: 'border-rose-500/40',
      payoutRate: 'Up to 100x',
      gameKey: 'aviator',
      icon: '✈️',
    },
    {
      id: 'mines',
      name: 'Mines 5x5',
      category: 'Risk & Strategy',
      desc: 'Uncover gleaming diamonds and avoid hidden mines with instant cashout.',
      badge: '💎 Instant Cashout',
      color: 'from-emerald-500/30 to-emerald-900/40',
      borderColor: 'border-emerald-500/40',
      payoutRate: 'Custom Risk',
      gameKey: 'mines',
      icon: '💣',
    },
    {
      id: 'roulette',
      name: 'European Roulette',
      category: 'Live Wheel',
      desc: 'Spin the 37-number single zero wheel. Bet on Red/Black, Odd/Even or Straights.',
      badge: '🎯 36x Payout',
      color: 'from-blue-500/30 to-blue-900/40',
      borderColor: 'border-blue-500/40',
      payoutRate: '36:1 Max',
      gameKey: 'roulette',
      icon: '🎡',
    },
    {
      id: 'ludo',
      name: 'Ludo Quick & Classic',
      category: 'Board Gaming',
      desc: 'Roll the 3D dice and race all 4 tokens home against real players or smart AI.',
      badge: '🎲 2-4 Players',
      color: 'from-yellow-500/30 to-amber-900/40',
      borderColor: 'border-yellow-500/40',
      payoutRate: 'Skill Based',
      gameKey: 'ludo',
      icon: '🎲',
    },
    {
      id: 'teen_patti',
      name: 'Teen Patti Live',
      category: 'Card Poker',
      desc: "India's beloved 3-card poker. Play Trail, Pure Sequence and High Card rounds.",
      badge: '🃏 Royal Flush',
      color: 'from-purple-500/30 to-purple-900/40',
      borderColor: 'border-purple-500/40',
      payoutRate: '98.5% RTP',
      gameKey: 'teen_patti',
      icon: '♠️',
    },
    {
      id: 'seven_up_down',
      name: '7 Up 7 Down',
      category: 'Dice Prediction',
      desc: 'Predict whether the dual dice total is Under 7, Exactly 7 (5x), or Over 7.',
      badge: '⚡ Fast Rounds',
      color: 'from-cyan-500/30 to-cyan-900/40',
      borderColor: 'border-cyan-500/40',
      payoutRate: '5x on Lucky 7',
      gameKey: 'seven_up_down',
      icon: '🎲',
    },
    {
      id: 'chicken_road',
      name: 'Chicken Cross Road',
      category: 'Multiplier Trail',
      desc: 'Help the lucky chicken cross dangerous highway lanes for increasing rewards.',
      badge: '🐔 Multi-Step',
      color: 'from-orange-500/30 to-orange-900/40',
      borderColor: 'border-orange-500/40',
      payoutRate: 'Up to 50x',
      gameKey: 'chicken_road',
      icon: '🍗',
    },
    {
      id: 'plinko',
      name: 'Plinko 1000x',
      category: 'Physics Drop',
      desc: 'Drop the golden ball through the pin pyramid into high-value multiplier buckets.',
      badge: '💰 1000x Jackpot',
      color: 'from-pink-500/30 to-pink-900/40',
      borderColor: 'border-pink-500/40',
      payoutRate: '1000x Max',
      gameKey: 'plinko',
      icon: '⚡',
    },
    {
      id: 'chess',
      name: 'Speed Chess Stake',
      category: 'Mind Battle',
      desc: 'Challenge grandmasters or friends in rated speed chess with instant prize pools.',
      badge: '👑 PvP Arena',
      color: 'from-zinc-500/30 to-zinc-800/40',
      borderColor: 'border-zinc-500/40',
      payoutRate: 'PvP Winner',
      gameKey: 'chess',
      icon: '♟️',
    }
  ];

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: 'Instant 24/7 Auto Payouts',
      desc: 'Automated UPI & Bank IMPS withdrawals processed directly within 60 seconds with 0% payout charges.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Certified Fair & Provably Safe',
      desc: 'All game algorithms use cryptographically secure Random Number Generation (RNG) for 100% fair gameplay.'
    },
    {
      icon: <Gift className="w-6 h-6 text-rose-400" />,
      title: '100% First Deposit Bonus + ₹500 Gift',
      desc: 'Double your initial balance upon registration plus redeem daily mystery gift codes and recharge rewards.'
    },
    {
      icon: <Award className="w-6 h-6 text-yellow-400" />,
      title: 'Crown VIP Salary & Daily Rebate',
      desc: 'Unlock VIP levels 1 to 7 to receive daily check-in rewards, weekly bonuses, monthly salary and dedicated support.'
    },
    {
      icon: <Users className="w-6 h-6 text-blue-400" />,
      title: 'Multi-Tier Referral Commission',
      desc: 'Invite friends using your custom invitation link and earn lifetime recurring commissions on every bet.'
    },
    {
      icon: <PhoneCall className="w-6 h-6 text-cyan-400" />,
      title: '24/7 Hindi & English Support',
      desc: 'Round-the-clock customer assistance available via live online chat and dedicated Telegram official agents.'
    }
  ];

  const faqs = [
    {
      q: 'ArowClub (एरून क्लब) क्या है और यह कैसे काम करता है?',
      a: 'ArowClub भारत का सबसे भरोसेमंद और तेज़ ऑनलाइन गेमिंग और प्रिडिक्शन पोर्टल है। यहाँ आप Win Go (Color Prediction), Aviator Crash, Mines, Roulette, Ludo, Teen Patti और Chess जैसे कई रोमांचक गेम्स खेलकर रियल कैश जीत सकते हैं और तुरंत अपने बैंक खाते या UPI में निकाल सकते हैं।'
    },
    {
      q: 'ArowClub में नया अकाउंट कैसे रजिस्टर करें?',
      a: 'रजिस्टर करने के लिए ऊपर दिए गए "Register" बटन पर क्लिक करें या सीधे हमारे इनविटेशन लिंक का उपयोग करें। अपना 10 अंकों का मोबाइल नंबर डालें, एक सुरक्षित पासवर्ड सेट करें और इन्विटेशन कोड (जैसे 100001 या आपके एजेंट का कोड) दर्ज करके तुरंत अकाउंट बनाएं।'
    },
    {
      q: 'इन्विटेशन लिंक (Invitation Link) का क्या फॉर्मेट है?',
      a: `ArowClub का आधिकारिक रजिस्ट्रेशन लिंक इस फॉर्मेट में जनरेट होता है: ${originUrl}/#/register?invitationCode=YOUR_CODE. जब कोई नया यूजर इस लिंक पर क्लिक करेगा, तो इन्विटेशन कोड अपने-आप भर जाएगा और वह तुरंत रजिस्टर कर सकेगा।`
    },
    {
      q: 'न्यूनतम डिपॉजिट (Min Deposit) और विथड्रॉल (Min Withdrawal) कितना है?',
      a: 'ArowClub पर न्यूनतम डिपॉजिट मात्र ₹100 है (Google Pay, PhonePe, Paytm, BHIM UPI या Bank Transfer द्वारा)। न्यूनतम विथड्रॉल मात्र ₹110 है, जो 24 घंटे किसी भी समय 1 से 3 मिनट के अंदर सीधे आपके बैंक अकाउंट या UPI आईडी में आ जाता है।'
    },
    {
      q: 'क्या ArowClub सुरक्षित और निष्पक्ष (Fair) है?',
      a: 'जी हाँ, बिल्कुल। ArowClub 256-Bit SSL डेटा एन्क्रिप्शन और सर्टिफाइड RNG (Random Number Generator) तकनीक का इस्तेमाल करता है, जिससे हर राउंड का परिणाम 100% पारदर्शी, सुरक्षित और निष्पक्ष रहता है।'
    },
    {
      q: 'रेफरल और एजेंट कमीशन कैसे कमाए?',
      a: 'अपने इनविटेशन कोड या लिंक को अपने दोस्तों और सोशल मीडिया पर शेयर करें। जब आपके रेफ़र किए गए लोग गेम खेलते हैं, तो आपको उनके हर राउंड पर आजीवन ऑटोमैटिक टीम कमीशन मिलता है, जिसे आप तुरंत विथड्रॉ कर सकते हैं।'
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-amber-400 selection:text-black">
      {/* 1. TOP HEADER & NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#0d1017]/90 backdrop-blur-md border-b border-amber-500/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <UserLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#ffe484] via-[#f5c443] to-[#d48b0c]">
                  AROWCLUB
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> OFFICIAL
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden xs:block font-medium">
                एरून क्लब • Official Gaming Portal
              </p>
            </div>
          </div>

          {/* Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-zinc-300">
            <a href="#games" className="hover:text-amber-400 transition">Games</a>
            <a href="#link-generator" className="hover:text-amber-400 transition">Invite Link</a>
            <a href="#features" className="hover:text-amber-400 transition">Features</a>
            <a href="#how-to-join" className="hover:text-amber-400 transition">How to Play</a>
            <a href="#faq" className="hover:text-amber-400 transition">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={onNavigateLogin}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 font-bold text-xs sm:text-sm tracking-wide transition active:scale-95 shadow-sm"
            >
              Member Login
            </button>
            <button
              onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)}
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#ffe17d] via-[#f5c443] to-[#d48b0c] hover:brightness-110 text-black font-extrabold text-xs sm:text-sm tracking-wide transition active:scale-95 shadow-[0_0_20px_rgba(245,196,67,0.35)] flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>Register Free</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-amber-500/15">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold mb-6 shadow-inner animate-pulse">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>India&apos;s #1 Certified Gaming & Entertainment Platform (एरून क्लब)</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Play Win Go, Aviator & Casino Games on{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe484] via-[#f5c443] to-[#d48b0c] drop-shadow-lg">
              ArowClub Official
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Experience high-multiplier Color Prediction, Aviator Crash, Mines, Roulette and Ludo with instant 24/7 automated UPI withdrawals & 100% guaranteed fairness.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto">
            <button
              onClick={() => onLaunchGame()}
              className="flex-1 min-w-[200px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#ffe17d] via-[#f5c443] to-[#d48b0c] hover:brightness-110 text-black font-black text-base shadow-[0_0_25px_rgba(245,196,67,0.4)] flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>Play Now / WebApp</span>
            </button>
            <button
              onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)}
              className="flex-1 min-w-[200px] py-3.5 px-6 rounded-2xl bg-[#151926] border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold text-base flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
            >
              <Gift className="w-5 h-5 text-amber-400" />
              <span>Claim ₹500 Bonus</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-[#101420]/80 border border-amber-500/20 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">520,000+</div>
              <div className="text-xs text-zinc-400 font-semibold mt-1">Active Indian Players</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#101420]/80 border border-amber-500/20 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">₹ 18.5 Cr+</div>
              <div className="text-xs text-zinc-400 font-semibold mt-1">Total Winnings Paid</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#101420]/80 border border-amber-500/20 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">&lt; 60 Sec</div>
              <div className="text-xs text-zinc-400 font-semibold mt-1">Instant Auto Payouts</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#101420]/80 border border-amber-500/20 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">100% Fair</div>
              <div className="text-xs text-zinc-400 font-semibold mt-1">Certified RNG Standard</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INVITATION LINK GENERATOR & DIRECT LINK BOX */}
      <section id="link-generator" className="py-12 bg-[#0b0e17] border-b border-amber-500/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#141926] to-[#0d101a] border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Official Invite & Registration Link
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Generate / Open Registration Link
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  इस लिंक के द्वारा कोई भी यूजर सीधे आपके इन्विटेशन कोड के साथ ArowClub में रजिस्टर कर सकता है।
                </p>
              </div>

              {/* Invitation Code Customizer */}
              <div className="flex items-center gap-2 bg-[#090b12] px-3 py-2 rounded-xl border border-white/10">
                <span className="text-xs font-bold text-zinc-400">Invite Code:</span>
                <input
                  type="text"
                  value={customInviteInput}
                  onChange={(e) => setCustomInviteInput(e.target.value.replace(/\D/g, ''))}
                  className="w-24 bg-transparent font-mono font-bold text-sm text-amber-400 focus:outline-none"
                  placeholder="100001"
                />
              </div>
            </div>

            {/* Generated Link Display Box */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[#090b12] border border-amber-500/20 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 font-mono text-xs sm:text-sm text-amber-200 break-all select-all px-2 w-full text-left">
                {generatedLink}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-500/30 transition active:scale-95"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 hover:brightness-105"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Page</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LIVE GAMES SHOWCASE */}
      <section id="games" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
            ⭐ 100% Certified RNG Games
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Explore ArowClub Live Games
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Play high-speed color prediction, crash games, live dice, roulette and card games with real-time settlement and direct cash payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {gamesCatalog.map((game) => (
            <div
              key={game.id}
              className={`p-6 rounded-3xl bg-gradient-to-br ${game.color} border ${game.borderColor} hover:scale-[1.02] transition duration-300 flex flex-col justify-between shadow-xl relative overflow-hidden group`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{game.icon}</span>
                  <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-black/40 text-amber-300 border border-white/10">
                    {game.badge}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition">
                  {game.name}
                </h3>
                <div className="text-xs font-bold text-amber-400/80 mb-2">{game.category}</div>
                <p className="text-xs text-zinc-300 leading-relaxed mb-6">
                  {game.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-xs font-mono font-bold text-zinc-400">{game.payoutRate}</span>
                <button
                  onClick={() => onLaunchGame(game.gameKey)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition shadow-md"
                >
                  <span>Play Game</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. WHY CHOOSE AROWCLUB (FEATURES) */}
      <section id="features" className="py-16 sm:py-24 bg-[#0a0d14] border-t border-b border-amber-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Why ArowClub is India&apos;s #1 Choice
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Built with bank-grade security, instant automated settlement, and exclusive VIP privileges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-7 rounded-3xl bg-[#121622] border border-amber-500/20 hover:border-amber-500/40 transition shadow-lg"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#1a2030] flex items-center justify-center mb-5 border border-white/10">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-black text-white mb-2">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW TO JOIN & PLAY (3 EASY STEPS) */}
      <section id="how-to-join" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">
          Start Playing in 3 Simple Steps
        </h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto mb-12 sm:mb-16">
          Getting started on ArowClub takes less than 1 minute. Follow these 3 easy steps:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="p-8 rounded-3xl bg-[#111520] border border-amber-500/20 relative">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/20 text-amber-400 font-mono font-black text-xl flex items-center justify-center border border-amber-500/40">
              1
            </div>
            <h3 className="text-lg font-black text-white mb-2">Register Free</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Click &apos;Register&apos; and enter your mobile number with your invitation code to create your verified account.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#111520] border border-amber-500/20 relative">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/20 text-amber-400 font-mono font-black text-xl flex items-center justify-center border border-amber-500/40">
              2
            </div>
            <h3 className="text-lg font-black text-white mb-2">Instant UPI Deposit</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deposit ₹100 or more via PhonePe, Google Pay, Paytm, or QR Code. Enjoy a 100% Welcome Bonus instantly.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#111520] border border-amber-500/20 relative">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/20 text-amber-400 font-mono font-black text-xl flex items-center justify-center border border-amber-500/40">
              3
            </div>
            <h3 className="text-lg font-black text-white mb-2">Win & Withdraw 24/7</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Predict Win Go colors, cash out Aviator flights or play Mines. Withdraw your winnings directly to your bank in 60s!
            </p>
          </div>
        </div>

        <div className="mt-12">
          <button
            onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#ffe17d] via-[#f5c443] to-[#d48b0c] hover:brightness-110 text-black font-black text-base shadow-[0_0_25px_rgba(245,196,67,0.4)] transition active:scale-95 inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-black" />
            <span>Create Your Free Account Now</span>
          </button>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="py-16 sm:py-24 bg-[#090b12] border-t border-amber-500/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-2">
              <HelpCircle className="w-4 h-4" /> FAQ & Help Center
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Frequently Asked Questions (अक्सर पूछे जाने वाले सवाल)
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-[#121622] border border-amber-500/20 overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-white flex items-center justify-between gap-4 hover:text-amber-300 transition"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FOOTER & COMPLIANCE */}
      <footer className="py-12 bg-[#06080d] border-t border-amber-500/20 text-zinc-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div className="flex items-center gap-3">
              <UserLogo size="sm" />
              <div>
                <span className="font-black text-lg text-white">AROWCLUB</span>
                <p className="text-[11px] text-zinc-500">Official Gaming & Entertainment Portal</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-zinc-300 font-semibold text-xs">
              <button onClick={onNavigateLogin} className="hover:text-amber-400 transition">Login</button>
              <button onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)} className="hover:text-amber-400 transition">Register</button>
              <a href="#games" className="hover:text-amber-400 transition">All Games</a>
              <a href="#faq" className="hover:text-amber-400 transition">FAQ</a>
              <button onClick={() => onLaunchGame()} className="hover:text-amber-400 transition">Web App</button>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="text-[11px] text-zinc-500">
                © {new Date().getFullYear()} ArowClub (एरून क्लब). All Rights Reserved. 18+ Only. Play Responsibly.
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                ArowClub is an entertainment gaming portal. Users must be 18 years or older to participate.
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-400">
              <span className="px-2.5 py-1 rounded bg-zinc-800 border border-white/10">256-Bit SSL</span>
              <span className="px-2.5 py-1 rounded bg-zinc-800 border border-white/10">RNG Certified</span>
              <span className="px-2.5 py-1 rounded bg-zinc-800 border border-white/10">18+</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
