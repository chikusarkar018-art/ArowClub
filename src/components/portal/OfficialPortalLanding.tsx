import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, Zap, Award, Users, Play, CheckCircle2,
  ArrowRight, PhoneCall, HelpCircle, Star, Sparkles, Flame,
  Globe, Lock, DollarSign, Gift, ChevronDown, ChevronUp, Copy, Check,
  ExternalLink, Smartphone, MessageCircle, RefreshCw, BookOpen,
  TrendingUp, Compass, Cpu, Layers, Trophy, AlertTriangle, Shield,
  QrCode, CreditCard, ChevronRight, Calculator, PieChart, Dice1
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
  const [selectedGameRuleModal, setSelectedGameRuleModal] = useState<string | null>(null);
  const [activeRuleTab, setActiveRuleTab] = useState<'wingo' | 'aviator' | 'mines' | 'roulette' | 'ludo' | 'teenpatti' | 'sevenup' | 'chicken' | 'plinko' | 'chess' | 'vip' | 'agency' | 'banking'>('wingo');
  
  // Interactive Calculator State
  const [calcGame, setCalcGame] = useState<'wingo' | 'aviator' | 'mines' | 'roulette'>('wingo');
  const [calcBetAmount, setCalcBetAmount] = useState<number>(500);
  const [calcOption, setCalcOption] = useState<string>('number'); // 'number', 'color', 'bigsmall', 'aviator2x', 'mines5'

  // Generate exact invitation link format requested: /#/register?invitationCode=XXXX
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://arowclub.com';
  const generatedLink = `${originUrl}/#/register?invitationCode=${customInviteInput.trim() || '100001'}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🔥 Join ArowClub (एरून क्लब) - India's #1 Official Gaming Platform!\n\n🎁 Get ₹500 Welcome Bonus + 100% First Deposit Match\n⚡ 30-Second Fast Win Go & Aviator Payouts\n💰 24/7 Instant Auto UPI & Bank Withdrawals\n\n👉 Register Now: ${generatedLink}\n🔑 Invitation Code: ${customInviteInput.trim() || '100001'}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const gamesCatalog = [
    {
      id: 'wingo',
      name: 'Win Go 30s / 1m / 3m',
      category: 'Color & Number Prediction',
      desc: 'Predict Green, Violet, Red & Lucky 0-9 Numbers with 9x multiplier payout. Fast 30-second cycles.',
      badge: '🔥 #1 Popular',
      color: 'from-amber-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-amber-500/50 hover:border-amber-400',
      payoutRate: '9X Number / 2X Color',
      gameKey: 'game',
      icon: '🎨',
      rtp: '98.8% RTP',
      minBet: '₹1',
      maxPayout: '₹5,00,000',
    },
    {
      id: 'aviator',
      name: 'Aviator Crash Xtreme',
      category: 'Provably Fair Multiplier',
      desc: 'Watch the golden lucky plane soar. Cash out before the crash to win up to 1000x your stake.',
      badge: '⚡ 1000x Max',
      color: 'from-rose-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-rose-500/50 hover:border-rose-400',
      payoutRate: 'Up to 1000x',
      gameKey: 'aviator',
      icon: '✈️',
      rtp: '99.0% RTP',
      minBet: '₹10',
      maxPayout: '₹10,00,000',
    },
    {
      id: 'mines',
      name: 'Mines 5x5 Diamond Grid',
      category: 'Strategic Risk & Reward',
      desc: 'Uncover gleaming diamonds on a 25-tile grid. Pick 1 to 24 mines and cash out whenever you want.',
      badge: '💎 Safe Cashout',
      color: 'from-emerald-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-emerald-500/50 hover:border-emerald-400',
      payoutRate: 'Dynamic Multiplier',
      gameKey: 'mines',
      icon: '💣',
      rtp: '98.5% RTP',
      minBet: '₹10',
      maxPayout: '₹2,50,000',
    },
    {
      id: 'roulette',
      name: 'European Roulette 3D',
      category: 'Live Wheel Casino',
      desc: 'Classic 37-pocket single zero roulette. Bet Straight, Split, Corner, Red/Black or Dozens.',
      badge: '🎯 36:1 Max',
      color: 'from-blue-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-blue-500/50 hover:border-blue-400',
      payoutRate: '36x Straight Up',
      gameKey: 'roulette',
      icon: '🎡',
      rtp: '97.3% RTP',
      minBet: '₹10',
      maxPayout: '₹5,00,000',
    },
    {
      id: 'ludo',
      name: 'Real Cash Ludo 2-4P',
      category: 'Board Gaming Arena',
      desc: 'Battle real players in Classic & Quick Ludo modes. 3D physics dice and instant cash prize pools.',
      badge: '🎲 Skill Match',
      color: 'from-yellow-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-yellow-500/50 hover:border-yellow-400',
      payoutRate: 'Winner Takes Pool',
      gameKey: 'ludo',
      icon: '🎲',
      rtp: 'Skill Based',
      minBet: '₹20',
      maxPayout: '₹50,000',
    },
    {
      id: 'teen_patti',
      name: 'Teen Patti Live 3-Card',
      category: 'Traditional Indian Poker',
      desc: "India's favorite 3-card card game. Play Blind or Chaal with Pure Sequence and Trail hands.",
      badge: '🃏 Royal Flush',
      color: 'from-purple-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-purple-500/50 hover:border-purple-400',
      payoutRate: 'Live Tables',
      gameKey: 'teen_patti',
      icon: '♠️',
      rtp: '98.2% RTP',
      minBet: '₹10',
      maxPayout: '₹2,00,000',
    },
    {
      id: 'seven_up_down',
      name: '7 Up 7 Down Dual Dice',
      category: 'High-Speed Dice',
      desc: 'Predict if the roll of 2 dice is Under 7, Exactly 7 (5x payout), or Over 7. Fast 15s rounds.',
      badge: '⚡ 5x Lucky 7',
      color: 'from-cyan-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-cyan-500/50 hover:border-cyan-400',
      payoutRate: '1.98x / 5x',
      gameKey: 'seven_up_down',
      icon: '🎲',
      rtp: '98.0% RTP',
      minBet: '₹10',
      maxPayout: '₹1,00,000',
    },
    {
      id: 'chicken_road',
      name: 'Chicken Cross Road',
      category: 'Multiplier Step Trail',
      desc: 'Guide the lucky golden chicken across hazardous lanes. Each successful step boosts your multiplier.',
      badge: '🐔 Step Multiplier',
      color: 'from-orange-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-orange-500/50 hover:border-orange-400',
      payoutRate: 'Up to 50x',
      gameKey: 'chicken_road',
      icon: '🍗',
      rtp: '98.4% RTP',
      minBet: '₹10',
      maxPayout: '₹1,50,000',
    },
    {
      id: 'plinko',
      name: 'Plinko 1000x Ball Drop',
      category: 'Physics Arcade',
      desc: 'Drop the golden sphere through the peg pyramid into high multiplier buckets on the edge.',
      badge: '💰 1000x Edge',
      color: 'from-pink-500/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-pink-500/50 hover:border-pink-400',
      payoutRate: 'Up to 1000x',
      gameKey: 'plinko',
      icon: '⚡',
      rtp: '98.9% RTP',
      minBet: '₹10',
      maxPayout: '₹5,00,000',
    },
    {
      id: 'chess',
      name: 'Speed Chess 1v1 Stake',
      category: 'Mind Strategy PvP',
      desc: 'Match against rated opponents or friends in 5-minute blitz chess matches for real stakes.',
      badge: '👑 FIDE Standard',
      color: 'from-zinc-400/20 via-[#181d2e] to-[#0c0f17]',
      borderColor: 'border-zinc-400/50 hover:border-zinc-300',
      payoutRate: 'PvP Winner Pool',
      gameKey: 'chess',
      icon: '♟️',
      rtp: '100% Skill',
      minBet: '₹20',
      maxPayout: '₹20,000',
    }
  ];

  // Comprehensive Game Rules & Platform Guide Data
  const gameRulesData = {
    wingo: {
      title: 'Win Go Color & Number Rules (विन गो नियम व गणना)',
      badge: '9X Number Payout',
      icon: '🎨',
      description: 'Win Go is a live prediction game running in 30s, 1m, 3m, and 5m intervals. A random winning number from 0 to 9 is determined at the end of each round.',
      rulesList: [
        'हर राउंड में 0 से 9 तक के कुल 10 नंबर होते हैं।',
        '0 = Red + Violet (लाल + बैंगनी) | 5 = Green + Violet (हरा + बैंगनी)',
        '1, 3, 7, 9 = Green (हरा) | 2, 4, 6, 8 = Red (लाल)',
        'Big (बड़ा) = 5, 6, 7, 8, 9 | Small (छोटा) = 0, 1, 2, 3, 4',
        'अंतिम 5 सेकंड में बेटिंग लॉक हो जाती है और परिणाम तुरंत घोषित होता है।'
      ],
      payoutTable: [
        { bet: 'Number (0-9)', rate: '9.00X', eg: '₹100 Bet -> ₹900 Win', desc: 'Exact matching number payout' },
        { bet: 'Green / Red', rate: '2.00X', eg: '₹100 Bet -> ₹200 Win', desc: 'Pure Color Win (1,3,7,9 or 2,4,6,8)' },
        { bet: 'Green/Red on 0 or 5', rate: '1.50X', eg: '₹100 Bet -> ₹150 Win', desc: 'Half-color Violet split result' },
        { bet: 'Violet (0 or 5)', rate: '4.50X', eg: '₹100 Bet -> ₹450 Win', desc: 'When 0 or 5 lands' },
        { bet: 'Big / Small', rate: '2.00X', eg: '₹100 Bet -> ₹200 Win', desc: '5-9 (Big) or 0-4 (Small)' }
      ]
    },
    aviator: {
      title: 'Aviator Crash Rules (एविएटर क्रैश नियम)',
      badge: '1000x High Multiplier',
      icon: '✈️',
      description: 'A provably fair cryptographic multiplier starts from 1.00x and climbs upwards. The user must Cash Out before the plane crashes away.',
      rulesList: [
        'विमान 1.00x से शुरू होकर 1000x+ तक ऊपर उड़ता है।',
        'विमान के उड़ने (Fly Away / Crash) से पहले "Cash Out" बटन दबाकर अपना विनिंग क्लेम करें।',
        'Auto Cash Out सेट करके आप मनचाहे मल्टीप्लायर (जैसे 2.00x, 5.00x) पर ऑटोमैटिक जीत हासिल कर सकते हैं।',
        'Dual Bet फीचर से एक ही राउंड में 2 अलग-अलग बेट्स लगाई जा सकती हैं (एक सेफ और एक हाई रिस्क)।',
        'हर राउंड का SHA-256 हैश सर्वर द्वारा पारदर्शी रूप से वेरीफाई किया जाता है।'
      ],
      payoutTable: [
        { bet: 'Cash Out at 1.50x', rate: '1.50X', eg: '₹500 Bet -> ₹750 Win', desc: 'Low Risk Safe Strategy' },
        { bet: 'Cash Out at 2.00x', rate: '2.00X', eg: '₹500 Bet -> ₹1,000 Win', desc: 'Standard 2X Doubling' },
        { bet: 'Cash Out at 10.00x', rate: '10.00X', eg: '₹100 Bet -> ₹1,000 Win', desc: 'High Multiplier Surge' },
        { bet: 'Cash Out at 100.00x', rate: '100.00X', eg: '₹50 Bet -> ₹5,000 Win', desc: 'Mega Sky Rocket Win' }
      ]
    },
    mines: {
      title: 'Mines 5x5 Grid Rules (माइन्स 5x5 गेम नियम)',
      badge: 'Diamond Cashout',
      icon: '💣',
      description: 'A 25-tile grid containing hidden Diamonds and Mines. Uncover gems to multiply your stake. Cash out at any step without hitting a mine.',
      rulesList: [
        '5x5 ग्रिड में कुल 25 टाइल्स होती हैं। आप 1 से 24 माइन्स चुन सकते हैं।',
        'जितने ज्यादा माइन्स चुनेंगे, हर डायमंड पर मल्टीप्लायर उतना ही ज्यादा बढ़ेगा।',
        'किसी भी समय 1 या अधिक डायमंड खोलने के बाद तुरंत "Cash Out" दबाकर पैसा निकाल सकते हैं।',
        'यदि माइन खुल जाता है तो राउंड समाप्त हो जाता है।'
      ],
      payoutTable: [
        { bet: '3 Mines (1 Gem)', rate: '1.12X', eg: '₹100 -> ₹112', desc: 'Low Risk' },
        { bet: '3 Mines (5 Gems)', rate: '2.25X', eg: '₹100 -> ₹225', desc: 'Balanced Growth' },
        { bet: '5 Mines (5 Gems)', rate: '4.80X', eg: '₹100 -> ₹480', desc: 'High Reward' },
        { bet: '10 Mines (3 Gems)', rate: '8.50X', eg: '₹100 -> ₹850', desc: 'Extreme Stakes' }
      ]
    },
    roulette: {
      title: 'European Roulette 3D Rules (यूरोपियन रूले नियम)',
      badge: '36:1 Max Odds',
      icon: '🎡',
      description: 'Single zero 37-number wheel (0 to 36). Place chips on numbers, colors, columns, or dozens for live spinning action.',
      rulesList: [
        'Straight Up (सिंगल नंबर 0-36): 36 गुना पेआउट (35:1 net)।',
        'Red / Black या Odd / Even: 2 गुना पेआउट (1:1 net)।',
        'Dozen (1-12, 13-24, 25-36) या Column: 3 गुना पेआउट (2:1 net)।',
        'Corner (4 नंबर): 9 गुना पेआउट | Split (2 नंबर): 18 गुना पेआउट।'
      ],
      payoutTable: [
        { bet: 'Straight Up (1 No.)', rate: '36.00X', eg: '₹100 -> ₹3,600', desc: 'Max Jackpot Payout' },
        { bet: 'Split (2 Nos.)', rate: '18.00X', eg: '₹100 -> ₹1,800', desc: 'Dual Number Hedge' },
        { bet: 'Corner (4 Nos.)', rate: '9.00X', eg: '₹100 -> ₹900', desc: 'Square 4 Numbers' },
        { bet: 'Red / Black', rate: '2.00X', eg: '₹500 -> ₹1,000', desc: '50/50 Chance' }
      ]
    },
    ludo: {
      title: 'Real Cash Ludo Rules (लूडो नियम व प्रतियोगिता)',
      badge: 'PvP Multiplayer',
      icon: '🎲',
      description: 'Classic & Quick 2 to 4 player Ludo matches with 3D rolling dice, competitive entry fees, and instant winner pot credits.',
      rulesList: [
        'पास पर 6 आने पर गोटी खुलती है और अतिरिक्त चाल मिलती है।',
        'विपक्षी की गोटी काटने पर या गोटी होम में पहुंचाने पर अतिरिक्त रोल मिलता है।',
        'स्टार (*) वाले खाने सुरक्षित होते हैं, जहाँ गोटियां नहीं कट सकतीं।',
        '2-प्लेयर मैच में जो पहले चारों गोटियां होम पहुंचाता है वह पूरा विनिंग पूल जीतता है (प्लेटफॉर्म शुल्क काटकर)।'
      ],
      payoutTable: [
        { bet: '2-Player Match (₹100 Stake)', rate: '1.90X', eg: 'Pool ₹200 -> Winner gets ₹190', desc: '1v1 Head to Head' },
        { bet: '4-Player Match (₹50 Stake)', rate: '3.80X', eg: 'Pool ₹200 -> 1st gets ₹150, 2nd ₹40', desc: '4-Player Arena' }
      ]
    },
    teenpatti: {
      title: 'Teen Patti 3-Card Poker Rules (तीन पत्ती नियम)',
      badge: 'Royal Hand Rank',
      icon: '♠️',
      description: '3-card Indian poker rankings: Trail (Trio) > Pure Sequence > Sequence > Color > Pair > High Card.',
      rulesList: [
        'Trail / Set (तीन समान पत्ते जैसे A-A-A, K-K-K) सबसे बड़ा हाथ है।',
        'Pure Sequence (एक ही रंग के क्रमबद्ध पत्ते जैसे A-K-Q of Hearts)।',
        'Sequence (सामान्य क्रमबद्ध पत्ते जैसे J-10-9)।',
        'Color / Flush (एक ही रंग के 3 पत्ते) > Pair (दो समान पत्ते) > High Card।'
      ],
      payoutTable: [
        { bet: 'Trail (Trio A-A-A)', rate: 'Top Hand', eg: 'Beat all sequences', desc: 'Undefeated Hand' },
        { bet: 'Pure Sequence', rate: '2nd Rank', eg: 'Straight Flush power', desc: 'Beats Regular Sequence' },
        { bet: 'Color / Pair', rate: 'Standard', eg: 'Chaal multiplier', desc: 'Tactical Show Win' }
      ]
    },
    sevenup: {
      title: '7 Up 7 Down Rules (7 अप 7 डाउन नियम)',
      badge: '5X on Lucky 7',
      icon: '🎲',
      description: 'Predict whether the sum of two 6-sided dice will be Down (2-6), Lucky Seven (7), or Up (8-12).',
      rulesList: [
        '2 से 6 (7 Down): 1.98X पेआउट।',
        '8 से 12 (7 Up): 1.98X पेआउट।',
        'सटीक 7 (Lucky 7): 5.00X पेआउट (बड़ा जैकपॉट)।'
      ],
      payoutTable: [
        { bet: '2-6 (7 Down)', rate: '1.98X', eg: '₹500 -> ₹990', desc: 'Low Sum' },
        { bet: 'Exact 7 (Lucky Seven)', rate: '5.00X', eg: '₹200 -> ₹1,000', desc: 'Jackpot Sum' },
        { bet: '8-12 (7 Up)', rate: '1.98X', eg: '₹500 -> ₹990', desc: 'High Sum' }
      ]
    },
    chicken: {
      title: 'Chicken Cross Road Rules (चिकन क्रॉस रोड नियम)',
      badge: 'Step Trail',
      icon: '🍗',
      description: 'Help the lucky golden chicken navigate busy traffic lanes. Each safe step multiplies your cash.',
      rulesList: [
        'प्रत्येक सुरक्षित लेन पार करने पर मल्टीप्लायर 1.20x से बढ़ते हुए 50x तक जाता है।',
        'कभी भी "Take Cash" दबाकर सुरक्षित रूप से अपनी जीत निकालें।',
        'गाड़ी से टकराने से पहले कैशआउट करना अनिवार्य है।'
      ],
      payoutTable: [
        { bet: 'Lane 1-3', rate: '1.50X - 2.50X', eg: '₹100 -> ₹250', desc: 'Easy Traffic' },
        { bet: 'Lane 4-7', rate: '3.80X - 12.0X', eg: '₹100 -> ₹1,200', desc: 'Highway Rush' },
        { bet: 'Lane 8-10', rate: '25.0X - 50.0X', eg: '₹100 -> ₹5,000', desc: 'Mega Destination' }
      ]
    },
    plinko: {
      title: 'Plinko 1000x Ball Drop Rules (प्लिंको नियम)',
      badge: '1000X Drop',
      icon: '⚡',
      description: 'Drop high-tension physics balls from the top of the pyramid. Center slots provide safe returns, while edges offer 1000x jackpots.',
      rulesList: [
        'Low, Medium, और High Risk मोड्स उपलब्ध हैं।',
        '8 से 16 पंक्तियाँ (Rows) चुनी जा सकती हैं।',
        'किनारे की सबसे बाहरी बाल्टी में गेंद जाने पर 1000x तक का बंपर पेआउट मिलता है।'
      ],
      payoutTable: [
        { bet: 'Center Slots', rate: '0.50X - 1.20X', eg: '₹100 -> ₹120', desc: 'High Frequency' },
        { bet: 'Middle Slots', rate: '2.00X - 9.00X', eg: '₹100 -> ₹900', desc: 'Medium Risk' },
        { bet: 'Edge Outer Slots', rate: '100X - 1000X', eg: '₹50 -> ₹50,000', desc: 'Extreme Jackpot' }
      ]
    },
    chess: {
      title: 'Speed Chess Rules & Elo Ranking (स्पीड चेस नियम)',
      badge: '100% Skill',
      icon: '♟️',
      description: 'Standard FIDE Blitz chess rules. 5 minutes on clock per player. Win by checkmate, resignation, or opponent timeout.',
      rulesList: [
        'आधिकारिक अंतरराष्ट्रीय FIDE नियम (Castling, En Passant, Pawn Promotion मान्य)।',
        'प्रत्येक खिलाड़ी के पास 5 मिनट का घड़ी समय होता है।',
        'समय समाप्त होने या चेकमेट होने पर विजेता को सम्पूर्ण स्टेक पूल प्रदान किया जाता है।'
      ],
      payoutTable: [
        { bet: '₹100 Match', rate: '₹190 Pot', eg: 'Winner Takes ₹190', desc: '1v1 Skill Match' },
        { bet: '₹500 Match', rate: '₹950 Pot', eg: 'Winner Takes ₹950', desc: 'Master Stakes' }
      ]
    },
    vip: {
      title: 'Crown VIP Level Privilege Matrix (VIP विशेषाधिकार व मासिक सैलरी)',
      badge: 'VIP 0 to VIP 10',
      icon: '👑',
      description: 'Play and earn VIP EXP to automatically level up. Unlock instant upgrade rewards, daily check-in perks, and guaranteed monthly salaries.',
      rulesList: [
        'हर ₹100 बेटिंग पर 1 VIP EXP पॉइंट मिलता है।',
        'VIP लेवल एक बार अनलॉक होने के बाद कभी डिमोट नहीं होता (Lifetime VIP Status)।',
        'VIP 1 से VIP 10 तक हर स्तर पर तत्काल अपग्रेड बोनस (₹60 से ₹50,000 तक) मिलता है।',
        'उच्च VIP सदस्यों को 0% विथड्रॉल फीस और 60 सेकंड प्रायोरिटी बैंक ट्रांसफर मिलता है।'
      ],
      payoutTable: [
        { bet: 'VIP 1', rate: '₹60 Level Bonus', eg: 'Daily ₹5 Check-in', desc: 'Entry Tier' },
        { bet: 'VIP 2', rate: '₹180 Level Bonus', eg: 'Weekly ₹50 Bonus', desc: 'Bronze Star' },
        { bet: 'VIP 3', rate: '₹680 Level Bonus', eg: 'Monthly ₹300 Salary', desc: 'Silver Crown' },
        { bet: 'VIP 5', rate: '₹3,800 Level Bonus', eg: 'Monthly ₹2,500 Salary', desc: 'Gold Crown' },
        { bet: 'VIP 7+', rate: '₹18,000 Level Bonus', eg: 'Monthly ₹15,000 Salary', desc: 'Diamond Royalty' }
      ]
    },
    agency: {
      title: '3-Level Agency Partner Commission (3-स्तरीय एजेंट कमीशन प्रणाली)',
      badge: 'Lifetime Passive Income',
      icon: '👥',
      description: 'Become an official ArowClub Agent Partner. Earn continuous automated commissions on every single bet placed by your invitees across 3 tiers.',
      rulesList: [
        'Tier 1 (Direct Referrals): 10% First Deposit Match + 0.6% Every Bet Commission।',
        'Tier 2 (Sub-Invitees): 0.3% Every Bet Commission।',
        'Tier 3 (Network Downline): 0.1% Every Bet Commission।',
        'कमीशन रात 12 बजे ऑटोमैटिक वॉलेट में क्रेडिट होता है जिसे कभी भी बिना किसी रोलिंग के निकाला जा सकता है।'
      ],
      payoutTable: [
        { bet: 'Tier 1 Direct', rate: '0.60% Bet Rebate', eg: '₹1,00,000 Team Bet = ₹600 Daily', desc: 'Direct Friends' },
        { bet: 'Tier 2 Sub-Team', rate: '0.30% Bet Rebate', eg: '₹5,00,000 Team Bet = ₹1,500 Daily', desc: 'Friends of Friends' },
        { bet: 'Tier 3 Network', rate: '0.10% Bet Rebate', eg: '₹10,00,000 Team Bet = ₹1,000 Daily', desc: 'Full Network' }
      ]
    },
    banking: {
      title: 'Deposit & Withdrawal Regulations (डिपॉजिट व विथड्रॉल नियम)',
      badge: '60s Auto UPI',
      icon: '💳',
      description: 'Fast, secure, automated Indian banking with 24/7 round-the-clock instant UPI and IMPS bank transfers.',
      rulesList: [
        'न्यूनतम डिपॉजिट (Min Deposit): मात्र ₹100 (Google Pay, PhonePe, Paytm, BHIM, QR)।',
        'न्यूनतम विथड्रॉल (Min Withdrawal): मात्र ₹110 | अधिकतम विथड्रॉल: ₹5,00,000 प्रति दिन।',
        '1X गेमिंग टर्नओवर (1X Rolling) पूरा होने के बाद 100% विथड्रॉल उपलब्ध।',
        'विथड्रॉल का समय: 1 से 3 मिनट (24 घंटे, 365 दिन सातों दिन खुला)।'
      ],
      payoutTable: [
        { bet: 'UPI Transfer', rate: 'Instant (60 Sec)', eg: 'Min ₹110 / Max ₹50,000', desc: 'PhonePe / GPay / Paytm' },
        { bet: 'IMPS Bank Transfer', rate: '1 - 3 Minutes', eg: 'Min ₹500 / Max ₹5,00,000', desc: 'Direct Account Credit' },
        { bet: 'Recharge Match', rate: '100% First Deposit', eg: 'Deposit ₹1,000 -> Get ₹2,000', desc: 'Instant Welcome Bonus' }
      ]
    }
  };

  // Calculator Result Computation
  const calculatedReturn = useMemo(() => {
    const amount = Number(calcBetAmount) || 0;
    if (amount <= 0) return { multiplier: '0X', gross: 0, profit: 0 };

    if (calcGame === 'wingo') {
      if (calcOption === 'number') {
        const gross = amount * 9;
        return { multiplier: '9.00X', gross, profit: gross - amount, formula: `${amount} × 9.00 = ₹${gross}` };
      }
      if (calcOption === 'violet') {
        const gross = amount * 4.5;
        return { multiplier: '4.50X', gross, profit: gross - amount, formula: `${amount} × 4.50 = ₹${gross}` };
      }
      const gross = amount * 2;
      return { multiplier: '2.00X', gross, profit: gross - amount, formula: `${amount} × 2.00 = ₹${gross}` };
    }

    if (calcGame === 'aviator') {
      let mult = 2.0;
      if (calcOption === 'aviator5x') mult = 5.0;
      if (calcOption === 'aviator10x') mult = 10.0;
      if (calcOption === 'aviator50x') mult = 50.0;
      const gross = amount * mult;
      return { multiplier: `${mult.toFixed(2)}X`, gross, profit: gross - amount, formula: `${amount} × ${mult} = ₹${gross}` };
    }

    if (calcGame === 'mines') {
      let mult = 2.25;
      if (calcOption === 'mines10') mult = 8.5;
      if (calcOption === 'minesSafe') mult = 1.35;
      const gross = amount * mult;
      return { multiplier: `${mult.toFixed(2)}X`, gross, profit: gross - amount, formula: `${amount} × ${mult} = ₹${gross}` };
    }

    if (calcGame === 'roulette') {
      if (calcOption === 'straight') {
        const gross = amount * 36;
        return { multiplier: '36.00X', gross, profit: gross - amount, formula: `${amount} × 36.00 = ₹${gross}` };
      }
      const gross = amount * 2;
      return { multiplier: '2.00X', gross, profit: gross - amount, formula: `${amount} × 2.00 = ₹${gross}` };
    }

    return { multiplier: '2.00X', gross: amount * 2, profit: amount, formula: `${amount} × 2 = ₹${amount * 2}` };
  }, [calcGame, calcBetAmount, calcOption]);

  const activeRuleData = gameRulesData[activeRuleTab];

  const features = [
    {
      icon: <Zap className="w-7 h-7 text-amber-400" />,
      title: 'Instant 60-Second Auto Payouts',
      hindi: '60 सेकंड में तुरंत ऑटोमैटिक विथड्रॉल',
      desc: 'Automated UPI & Bank IMPS withdrawals processed directly within 60 seconds with 0% payout charges, 24/7 round-the-clock.'
    },
    {
      icon: <ShieldCheck className="w-7 h-7 text-emerald-400" />,
      title: 'Certified Fair & Provably Safe',
      hindi: '100% निष्पक्ष व पारदर्शी RNG सिस्टम',
      desc: 'All game algorithms use cryptographically secure Random Number Generation (RNG SHA-256) for 100% fair, tamper-proof gameplay.'
    },
    {
      icon: <Gift className="w-7 h-7 text-rose-400" />,
      title: '100% Welcome Bonus + ₹500 Free',
      hindi: '100% फर्स्ट डिपॉजिट बोनस + ₹500 गिफ्ट',
      desc: 'Double your initial deposit balance upon registration plus redeem daily mystery gift codes, weekly cashback, and VIP rewards.'
    },
    {
      icon: <Award className="w-7 h-7 text-yellow-400" />,
      title: 'Crown VIP Salary & Daily Rebate',
      hindi: 'VIP मासिक सैलरी व दैनिक कैशबैक',
      desc: 'Unlock VIP levels 1 to 10 to receive lifetime status, daily check-in perks, weekly promotions, and guaranteed monthly salaries.'
    },
    {
      icon: <Users className="w-7 h-7 text-blue-400" />,
      title: '3-Tier Agency Referral Program',
      hindi: '3-स्तरीय एजेंट रेफरल कमीशन',
      desc: 'Invite friends using your custom invitation link and earn lifetime recurring commissions up to 0.6% on every single team bet.'
    },
    {
      icon: <PhoneCall className="w-7 h-7 text-cyan-400" />,
      title: '24/7 Dedicated Live Support',
      hindi: '24/7 हिन्दी व इंग्लिश ग्राहक सेवा',
      desc: 'Round-the-clock customer assistance available via live online chat and dedicated official Telegram customer managers.'
    }
  ];

  const faqs = [
    {
      q: 'ArowClub (एरून क्लब) क्या है और यह कैसे काम करता है?',
      a: 'ArowClub भारत का सबसे सुरक्षित, विश्वसनीय और आधुनिक ऑनलाइन प्रिडिक्शन व गेमिंग प्लेटफॉर्म है। यहाँ आप Win Go (30s / 1m Color Prediction), Aviator Crash, Mines, 3D Roulette, Real Cash Ludo, Teen Patti और Speed Chess जैसे 10+ रोमांचक गेम्स खेलकर रियल कैश जीत सकते हैं और 1 मिनट के अंदर सीधे अपने UPI या बैंक खाते में विथड्रॉ कर सकते हैं।'
    },
    {
      q: 'ArowClub में नया अकाउंट कैसे रजिस्टर करें?',
      a: 'रजिस्टर करने के लिए ऊपर दिए गए "Register Free" बटन पर क्लिक करें या सीधे हमारे इनविटेशन लिंक का उपयोग करें। अपना 10 अंकों का मोबाइल नंबर दर्ज करें, 6-16 अक्षरों का सुरक्षित पासवर्ड बनाएं और इन्विटेशन कोड (जैसे 100001) डालकर तुरंत अपना खाता सक्रिय करें।'
    },
    {
      q: 'इन्विटेशन लिंक (Invitation Link) का क्या फॉर्मेट है?',
      a: `ArowClub का आधिकारिक रजिस्ट्रेशन लिंक इस फॉर्मेट में जनरेट होता है: ${originUrl}/#/register?invitationCode=YOUR_CODE. जब कोई नया यूजर इस लिंक पर क्लिक करेगा, तो इन्विटेशन कोड अपने-आप भर जाएगा और वह बिना किसी त्रुटि के सीधे रजिस्टर कर सकेगा।`
    },
    {
      q: 'न्यूनतम डिपॉजिट (Min Deposit) और विथड्रॉल (Min Withdrawal) कितना है?',
      a: 'ArowClub पर न्यूनतम डिपॉजिट मात्र ₹100 है (Google Pay, PhonePe, Paytm, BHIM UPI या Bank Transfer द्वारा)। न्यूनतम विथड्रॉल मात्र ₹110 है, जो 24 घंटे किसी भी समय 60 सेकंड से 3 मिनट के अंदर सीधे आपके बैंक अकाउंट या UPI आईडी में क्रेडिट हो जाता है।'
    },
    {
      q: 'क्या ArowClub सुरक्षित और निष्पक्ष (Fair) है?',
      a: 'जी हाँ, बिल्कुल। ArowClub 256-Bit SSL बैंक-ग्रेड डेटा एन्क्रिप्शन और सर्टिफाइड RNG (Random Number Generator SHA-256) तकनीक का उपयोग करता है। गेम का कोई भी परिणाम पहले से तय या प्रभावित नहीं होता, जिससे हर राउंड 100% पारदर्शी और निष्पक्ष रहता है।'
    },
    {
      q: 'रेफरल और एजेंट कमीशन कैसे कमाए?',
      a: 'अपने इनविटेशन कोड या लिंक को अपने दोस्तों और सोशल मीडिया ग्रुप्स पर शेयर करें। जब आपके रेफ़र किए गए लोग गेम खेलते हैं, तो आपको उनके हर राउंड पर 3 स्तरों (Tier 1: 0.6%, Tier 2: 0.3%, Tier 3: 0.1%) तक आजीवन ऑटोमैटिक टीम कमीशन मिलता है, जिसे आप तुरंत विथड्रॉ कर सकते हैं।'
    },
    {
      q: 'गेम में 0 और 5 नंबर पर Violet आने पर क्या पेआउट मिलता है?',
      a: 'Win Go में 0 (Red + Violet) और 5 (Green + Violet) हाफ-कलर स्प्लिट नंबर होते हैं। यदि आप 0 या 5 नंबर पर सटीक बेट लगाते हैं तो 9 गुना मिलता है। यदि आप Violet पर बेट लगाते हैं तो 4.5 गुना मिलता है। यदि आपने Red या Green पर बेट लगाई और 0 या 5 आया तो 1.5 गुना पेआउट मिलता है।'
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-amber-400 selection:text-black overflow-x-hidden">
      {/* BACKGROUND 3D LIGHTING & MESH */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-gradient-to-br from-amber-500/15 via-yellow-600/5 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-bl from-rose-500/10 via-amber-600/5 to-transparent rounded-full blur-[160px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/10 via-emerald-600/5 to-transparent rounded-full blur-[160px]" />
      </div>

      {/* 1. TOP HEADER & NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#0a0d16]/90 backdrop-blur-xl border-b border-amber-500/25 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-yellow-300 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300" />
              <UserLogo size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#ffe484] via-[#f5c443] to-[#d48b0c] drop-shadow-[0_2px_10px_rgba(245,196,67,0.3)]">
                  AROWCLUB
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden xs:block font-medium">
                एरून क्लब • Official Gaming Portal (.com)
              </p>
            </div>
          </div>

          {/* Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-bold text-zinc-300">
            <a href="#games" className="hover:text-amber-400 transition flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Games
            </a>
            <a href="#rules-guide" className="hover:text-amber-400 transition flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" /> Rules & A-Z Guide
            </a>
            <a href="#calculator" className="hover:text-amber-400 transition flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-amber-400" /> Odds Calculator
            </a>
            <a href="#link-generator" className="hover:text-amber-400 transition">Invite Link</a>
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
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#ffe17d] via-[#f5c443] to-[#d48b0c] hover:brightness-110 text-black font-black text-xs sm:text-sm tracking-wide transition active:scale-95 shadow-[0_0_25px_rgba(245,196,67,0.4)] flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>Register Free</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. 3D HERO DISPLAY WITH METALLIC BADGES */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-amber-500/15 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Trust Floating Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-extrabold mb-8 shadow-[0_0_20px_rgba(245,196,67,0.2)] animate-pulse">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>India&apos;s #1 Certified Gaming & Entertainment Platform (एरून क्लब)</span>
          </div>

          {/* Main 3D Display Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-tight sm:leading-none">
            Next-Gen Win Go, Aviator & Casino on{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe484] via-[#f5c443] to-[#d48b0c] drop-shadow-[0_4px_25px_rgba(245,196,67,0.4)]">
              ArowClub Official
            </span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed">
            Experience lightning-fast 30s Color Prediction, Aviator Crash Xtreme, Mines 5x5, 3D European Roulette and Real Cash Ludo with instant 60-second automated UPI payouts and 100% Provably Fair cryptographic outcomes.
          </p>

          {/* Hero CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-5 max-w-2xl mx-auto">
            <button
              onClick={() => onLaunchGame()}
              className="flex-1 min-w-[220px] py-4 px-8 rounded-2xl bg-gradient-to-r from-[#ffe17d] via-[#f5c443] to-[#d48b0c] hover:brightness-110 text-black font-black text-base shadow-[0_0_35px_rgba(245,196,67,0.5)] flex items-center justify-center gap-2.5 transition active:scale-95 transform hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>Launch WebApp & Play</span>
            </button>
            <button
              onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)}
              className="flex-1 min-w-[220px] py-4 px-8 rounded-2xl bg-[#121624] border border-amber-500/50 text-amber-300 hover:bg-amber-500/10 font-bold text-base flex items-center justify-center gap-2.5 transition active:scale-95 shadow-xl hover:border-amber-400"
            >
              <Gift className="w-5 h-5 text-amber-400" />
              <span>Claim ₹500 Bonus + 100% Match</span>
            </button>
          </div>

          {/* 3D Glass Stats Bar */}
          <div className="mt-14 sm:mt-18 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto text-left">
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#151a2a] to-[#0c0f18] border border-amber-500/30 backdrop-blur-md shadow-xl hover:border-amber-400/50 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Members</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">1,820,000+</div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-1">● 14,280 Online Right Now</div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#151a2a] to-[#0c0f18] border border-amber-500/30 backdrop-blur-md shadow-xl hover:border-amber-400/50 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Daily Payouts</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">₹ 42.8 Cr+</div>
              <div className="text-[11px] text-zinc-400 font-semibold mt-1">100% Guaranteed Clear</div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#151a2a] to-[#0c0f18] border border-amber-500/30 backdrop-blur-md shadow-xl hover:border-amber-400/50 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Avg Payout Speed</span>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">&lt; 60 Sec</div>
              <div className="text-[11px] text-zinc-400 font-semibold mt-1">Auto UPI / Bank IMPS</div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#151a2a] to-[#0c0f18] border border-amber-500/30 backdrop-blur-md shadow-xl hover:border-amber-400/50 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Fairness Standard</span>
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">SHA-256</div>
              <div className="text-[11px] text-zinc-400 font-semibold mt-1">Provably Fair Certified</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC INVITATION LINK & QR GENERATOR */}
      <section id="link-generator" className="py-14 bg-[#0a0d16] border-b border-amber-500/20 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="p-7 sm:p-10 rounded-3xl bg-gradient-to-br from-[#151a2a] via-[#101422] to-[#0a0d16] border border-amber-500/40 shadow-[0_15px_50px_rgba(0,0,0,0.7)] relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold mb-2 border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" /> Official Invite & Registration Link System
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Share / Open Verified Registration Link
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  इस लिंक के द्वारा कोई भी यूजर सीधे आपके इन्विटेशन कोड के साथ ArowClub में रजिस्टर कर सकता है।
                </p>
              </div>

              {/* Invitation Code Customizer */}
              <div className="flex items-center gap-2.5 bg-[#090b12] px-4 py-3 rounded-2xl border border-amber-500/30 shadow-inner">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Invitation Code:</span>
                <input
                  type="text"
                  value={customInviteInput}
                  onChange={(e) => setCustomInviteInput(e.target.value.replace(/\D/g, ''))}
                  className="w-24 bg-transparent font-mono font-black text-base text-amber-400 focus:outline-none border-b border-amber-500/50 text-center"
                  placeholder="100001"
                />
              </div>
            </div>

            {/* Generated Link Display Box */}
            <div className="p-4 rounded-2xl bg-[#080a10] border border-amber-500/30 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 font-mono text-xs sm:text-sm text-amber-200 break-all select-all px-3 w-full text-left font-bold">
                {generatedLink}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-amber-500/40 transition active:scale-95 shadow-md"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Share</span>
                </button>
                <button
                  onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 hover:brightness-105 shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Register Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 3D INTERACTIVE GAMES SHOWCASE */}
      <section id="games" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
            ⭐ 100% Certified Provably Fair Games
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Explore 10+ Live ArowClub Games
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Click on any game card to launch immediately or review the full rules, odds calculation, and strategy guide.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gamesCatalog.map((game) => (
            <div
              key={game.id}
              className={`p-6 sm:p-7 rounded-3xl bg-gradient-to-br ${game.color} border ${game.borderColor} hover:scale-[1.02] transition duration-300 flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.6)] relative overflow-hidden group`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl filter drop-shadow-md">{game.icon}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/50 text-zinc-400 border border-white/10 font-mono">
                      {game.rtp}
                    </span>
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {game.badge}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition flex items-center gap-2">
                  {game.name}
                </h3>
                <div className="text-xs font-bold text-amber-400/90 mb-3">{game.category}</div>
                <p className="text-xs text-zinc-300 leading-relaxed mb-6">
                  {game.desc}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>Min: <strong className="text-white">{game.minBet}</strong></span>
                  <span>Payout: <strong className="text-amber-400">{game.payoutRate}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveRuleTab(game.id as any);
                      const el = document.getElementById('rules-guide');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Rules</span>
                  </button>
                  <button
                    onClick={() => onLaunchGame(game.gameKey)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition shadow-md"
                  >
                    <span>Play Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. COMPLETE A-Z RULES & REGULATIONS STATION (रूल्स व रेगुलेशन ए टू जेड) */}
      <section id="rules-guide" className="py-20 bg-[#090b14] border-t border-b border-amber-500/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
              📖 Official Knowledge Base & Rule Book
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              ArowClub Rules & Regulations (ए टू जेड नियम)
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Select any game or system below to view exact mathematical formulas, payout rates, winning odds, and detailed regulations.
            </p>
          </div>

          {/* Rule Category Selectors Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
            {[
              { key: 'wingo', label: '🎨 Win Go', badge: 'Color Prediction' },
              { key: 'aviator', label: '✈️ Aviator', badge: 'Crash 1000x' },
              { key: 'mines', label: '💣 Mines', badge: 'Diamond Grid' },
              { key: 'roulette', label: '🎡 Roulette', badge: 'European 36x' },
              { key: 'ludo', label: '🎲 Ludo', badge: 'PvP Cash' },
              { key: 'teenpatti', label: '♠️ Teen Patti', badge: 'Poker' },
              { key: 'sevenup', label: '🎲 7 Up Down', badge: 'Dice Sum' },
              { key: 'chicken', label: '🍗 Chicken Road', badge: 'Trail' },
              { key: 'plinko', label: '⚡ Plinko', badge: 'Pyramid' },
              { key: 'chess', label: '♟️ Speed Chess', badge: 'PvP Match' },
              { key: 'vip', label: '👑 VIP Privileges', badge: 'Salaries' },
              { key: 'agency', label: '👥 Agency Rebates', badge: '3-Tier' },
              { key: 'banking', label: '💳 Banking Rules', badge: 'Deposit/Withdraw' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveRuleTab(tab.key as any)}
                className={`px-4 py-2.5 rounded-2xl shrink-0 font-bold text-xs sm:text-sm transition flex items-center gap-2 border ${
                  activeRuleTab === tab.key
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,196,67,0.3)]'
                    : 'bg-[#121624] text-zinc-300 border-white/10 hover:border-amber-500/40 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Active Rule Details Card */}
          {activeRuleData && (
            <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-[#131726] to-[#0c0f18] border border-amber-500/30 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{activeRuleData.icon}</span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      {activeRuleData.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-2xl">
                    {activeRuleData.description}
                  </p>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold text-xs">
                  {activeRuleData.badge}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Rules List */}
                <div>
                  <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Core Rules & Regulations (प्रमुख नियम)
                  </h4>
                  <ul className="space-y-3">
                    {activeRuleData.rulesList.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#090b12] border border-white/5 text-xs sm:text-sm text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Payout & Odds Table */}
                <div>
                  <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Payout Table & Multipliers (पेआउट व दर)
                  </h4>
                  <div className="space-y-2.5">
                    {activeRuleData.payoutTable.map((p, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#090b12] border border-white/5 flex items-center justify-between text-xs sm:text-sm">
                        <div>
                          <div className="font-bold text-white">{p.bet}</div>
                          <div className="text-[11px] text-zinc-400">{p.desc}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-amber-400 font-mono">{p.rate}</div>
                          <div className="text-[10px] text-emerald-400 font-mono">{p.eg}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-zinc-400">
                  Ready to test your prediction skills on ArowClub? Play securely with 100% certified fairness.
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => onLaunchGame(activeRuleTab === 'vip' || activeRuleTab === 'agency' || activeRuleTab === 'banking' ? 'game' : activeRuleTab)}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-105"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Play This Game Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. 3D INTERACTIVE ODDS & WINNING CALCULATOR */}
      <section id="calculator" className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-7 sm:p-10 rounded-3xl bg-gradient-to-br from-[#151a2a] via-[#0f1320] to-[#090c14] border border-amber-500/30 shadow-2xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold mb-2">
              <Calculator className="w-3.5 h-3.5" /> Interactive Returns Calculator
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Calculate Your Potential Winnings
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Select any game and stake amount to instantly see the real-time gross returns, net profit, and payout multiplier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Controls */}
            <div className="space-y-5">
              {/* Game Selector */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Select Game:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'wingo', label: '🎨 Win Go' },
                    { key: 'aviator', label: '✈️ Aviator' },
                    { key: 'mines', label: '💣 Mines' },
                    { key: 'roulette', label: '🎡 Roulette' }
                  ].map((g) => (
                    <button
                      key={g.key}
                      onClick={() => setCalcGame(g.key as any)}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                        calcGame === g.key
                          ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                          : 'bg-[#090b12] text-zinc-300 border-white/10 hover:border-amber-500/30'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prediction Type Selector */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Bet Outcome Option:</label>
                {calcGame === 'wingo' && (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setCalcOption('number')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'number' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>Number (9X)</button>
                    <button onClick={() => setCalcOption('color')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'color' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>Red/Green (2X)</button>
                    <button onClick={() => setCalcOption('violet')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'violet' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>Violet (4.5X)</button>
                  </div>
                )}
                {calcGame === 'aviator' && (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setCalcOption('aviator2x')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'aviator2x' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>2.00X Cashout</button>
                    <button onClick={() => setCalcOption('aviator5x')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'aviator5x' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>5.00X Cashout</button>
                    <button onClick={() => setCalcOption('aviator10x')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'aviator10x' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>10.00X Sky High</button>
                  </div>
                )}
                {calcGame === 'mines' && (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setCalcOption('minesSafe')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'minesSafe' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>1 Gem (1.35X)</button>
                    <button onClick={() => setCalcOption('mines5')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'mines5' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>3 Gems (2.25X)</button>
                    <button onClick={() => setCalcOption('mines10')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'mines10' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>5 Gems (8.5X)</button>
                  </div>
                )}
                {calcGame === 'roulette' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setCalcOption('straight')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'straight' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>Straight Up (36X)</button>
                    <button onClick={() => setCalcOption('even')} className={`py-2 px-2 rounded-xl text-xs font-bold border ${calcOption === 'even' ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#090b12] text-zinc-300 border-white/10'}`}>Red / Black (2X)</button>
                  </div>
                )}
              </div>

              {/* Stake Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Stake Amount (₹):</label>
                  <span className="font-mono text-xs font-black text-amber-400">₹{calcBetAmount}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="10000"
                  step="50"
                  value={calcBetAmount}
                  onChange={(e) => setCalcBetAmount(Number(e.target.value))}
                  className="w-full accent-amber-400 bg-zinc-800 rounded-lg cursor-pointer h-2"
                />
                <div className="flex items-center gap-2 mt-3">
                  {[100, 500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCalcBetAmount(amt)}
                      className="flex-1 py-1.5 rounded-lg bg-[#090b12] hover:bg-amber-400/20 border border-white/10 text-[11px] font-mono font-bold text-zinc-300 hover:text-amber-300 transition"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Result Display Card */}
            <div className="p-6 rounded-3xl bg-[#080a10] border border-amber-500/40 shadow-xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Estimated Total Return</div>
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffe484] via-[#f5c443] to-[#d48b0c] font-mono my-2">
                ₹ {calculatedReturn.gross.toLocaleString('en-IN')}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-extrabold font-mono mb-4 border border-emerald-500/30">
                + ₹{calculatedReturn.profit.toLocaleString('en-IN')} Net Profit ({calculatedReturn.multiplier})
              </div>

              <div className="p-3 rounded-xl bg-[#111420] border border-white/5 text-xs font-mono text-zinc-400 mb-6">
                Formula: {calculatedReturn.formula}
              </div>

              <button
                onClick={() => onLaunchGame(calcGame === 'wingo' ? 'game' : calcGame)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-sm shadow-[0_0_20px_rgba(245,196,67,0.3)] hover:brightness-110 active:scale-95 transition"
              >
                Place This Bet on ArowClub
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. WHY CHOOSE AROWCLUB (FEATURES) */}
      <section id="features" className="py-20 bg-[#090b14] border-t border-b border-amber-500/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              Why ArowClub is India&apos;s #1 Choice
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Built with bank-grade security, instant automated settlement, and exclusive VIP privileges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-7 rounded-3xl bg-[#121624] border border-amber-500/20 hover:border-amber-500/40 transition shadow-xl group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#1a2032] flex items-center justify-center mb-5 border border-white/10 group-hover:scale-110 transition duration-300">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-black text-white mb-1">{feat.title}</h3>
                <div className="text-xs font-bold text-amber-400/90 mb-2">{feat.hindi}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. HOW TO JOIN & PLAY (3 EASY STEPS) */}
      <section id="how-to-join" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
          Start Playing in 3 Simple Steps
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mb-14">
          Getting started on ArowClub takes less than 1 minute. Follow these 3 easy steps:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="p-8 rounded-3xl bg-[#111522] border border-amber-500/25 relative shadow-xl">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/20 text-amber-400 font-mono font-black text-2xl flex items-center justify-center border border-amber-500/40">
              1
            </div>
            <h3 className="text-xl font-black text-white mb-2">Register Free</h3>
            <div className="text-xs font-bold text-amber-400 mb-2">मुफ्त खाता बनाएं</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Click &apos;Register&apos; and enter your mobile number with your invitation code to create your verified account.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#111522] border border-amber-500/25 relative shadow-xl">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/20 text-amber-400 font-mono font-black text-2xl flex items-center justify-center border border-amber-500/40">
              2
            </div>
            <h3 className="text-xl font-black text-white mb-2">Instant UPI Deposit</h3>
            <div className="text-xs font-bold text-amber-400 mb-2">तुरंत 100% बोनस रिचार्ज</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deposit ₹100 or more via PhonePe, Google Pay, Paytm, or QR Code. Enjoy a 100% Welcome Bonus instantly.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#111522] border border-amber-500/25 relative shadow-xl">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/20 text-amber-400 font-mono font-black text-2xl flex items-center justify-center border border-amber-500/40">
              3
            </div>
            <h3 className="text-xl font-black text-white mb-2">Win & Withdraw 24/7</h3>
            <div className="text-xs font-bold text-amber-400 mb-2">60 सेकंड में तुरंत विथड्रॉल</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Predict Win Go colors, cash out Aviator flights or play Mines. Withdraw your winnings directly to your bank in 60s!
            </p>
          </div>
        </div>

        <div className="mt-14">
          <button
            onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-[#ffe17d] via-[#f5c443] to-[#d48b0c] hover:brightness-110 text-black font-black text-base shadow-[0_0_30px_rgba(245,196,67,0.4)] transition active:scale-95 inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-black" />
            <span>Create Your Free Account Now</span>
          </button>
        </div>
      </section>

      {/* 9. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="py-20 bg-[#090b14] border-t border-amber-500/20 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold mb-2">
              <HelpCircle className="w-4 h-4" /> FAQ & Help Center
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              Frequently Asked Questions (अक्सर पूछे जाने वाले सवाल)
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-3xl bg-[#121624] border border-amber-500/25 overflow-hidden transition shadow-md"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-6 text-left font-bold text-white flex items-center justify-between gap-4 hover:text-amber-300 transition"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FOOTER & COMPLIANCE */}
      <footer className="py-14 bg-[#05070c] border-t border-amber-500/20 text-zinc-400 text-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-10 border-b border-white/10">
            <div className="flex items-center gap-3">
              <UserLogo size="sm" />
              <div>
                <span className="font-black text-lg text-white">AROWCLUB</span>
                <p className="text-[11px] text-zinc-500">Official Gaming & Entertainment Portal (.com)</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-zinc-300 font-bold text-xs">
              <button onClick={onNavigateLogin} className="hover:text-amber-400 transition">Member Login</button>
              <button onClick={() => onNavigateRegister(customInviteInput.trim() || defaultInviteCode)} className="hover:text-amber-400 transition">Register Free</button>
              <a href="#games" className="hover:text-amber-400 transition">Games</a>
              <a href="#rules-guide" className="hover:text-amber-400 transition">Rules A-Z</a>
              <a href="#calculator" className="hover:text-amber-400 transition">Odds Calculator</a>
              <a href="#faq" className="hover:text-amber-400 transition">FAQ</a>
              <button onClick={() => onLaunchGame()} className="hover:text-amber-400 transition">Web App</button>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="text-[11px] text-zinc-500">
                © {new Date().getFullYear()} ArowClub (एरून क्लब). All Rights Reserved. 18+ Only. Play Responsibly.
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                ArowClub is an entertainment gaming portal. Users must be 18 years or older to participate.
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-400">
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 text-emerald-400">256-Bit SSL</span>
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 text-amber-400">SHA-256 RNG</span>
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 text-rose-400">18+ Certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
