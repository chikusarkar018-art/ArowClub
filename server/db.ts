import fs from 'node:fs';
import path from 'node:path';
import {
  User, AdminUser, GamePeriod, Bet, DepositRequest, WithdrawalRequest,
  WalletTransaction, VIPLevel, ReferralRecord, Promotion, GameSetting,
  AdminActivityLog, GameType, ColorResult, BigSmallResult,
  BigSmallPredictionSession, BigSmallPredictionRound, GiftCode,
  GoogleSheetDepositRow, GoogleSheetWithdrawalRow, ReferralDepositCommission
} from '../src/types.js';
import { 
  syncDataToFirestore, 
  loadDataFromFirestore, 
  queueFirestoreSync,
  saveUserPermanently,
  deleteUserPermanently,
  findUserInFirestore,
  saveTransactionPermanently,
  saveBetPermanently,
  saveDepositPermanently,
  saveWithdrawalPermanently,
  isUserPurged
} from './firebaseDb.js';

const STORAGE_FILE = path.join(process.cwd(), 'data_storage.json');

// Relational data store with automatic JSON disk persistence
export class WingoDatabase {
  users: Map<string, User> = new Map();
  adminUsers: Map<string, AdminUser> = new Map();
  gameSettings: Map<GameType, GameSetting> = new Map();
  currentPeriods: Map<GameType, GamePeriod> = new Map();
  resultsHistory: Map<GameType, GamePeriod[]> = new Map();
  bets: Bet[] = [];
  deposits: DepositRequest[] = [];
  withdrawals: WithdrawalRequest[] = [];
  transactions: WalletTransaction[] = [];
  vipLevels: VIPLevel[] = [];
  referrals: ReferralRecord[] = [];
  referralDepositCommissions: ReferralDepositCommission[] = [];
  promotions: Promotion[] = [];
  activityLogs: AdminActivityLog[] = [];
  
  bigSmallSessions: BigSmallPredictionSession[] = [
    {
      id: 'pred-session-1',
      sessionName: 'VIP WinGo Big/Small Forecast',
      startDate: '2026-08-01',
      startTime: '00:00',
      endDate: '2026-12-31',
      endTime: '23:59',
      status: 'active',
      totalRounds: 9,
      autoStart: true,
      autoContinue: true,
      rounds: [
        { round: 1, previousLastDigit: 5, prediction: 'BIG', message: 'Big chance' },
        { round: 2, previousLastDigit: 8, prediction: 'SMALL', message: 'Small chance' },
        { round: 3, previousLastDigit: 3, prediction: 'BIG', message: 'Big chance' },
        { round: 4, previousLastDigit: 1, prediction: 'BIG', message: 'Big chance' },
        { round: 5, previousLastDigit: 6, prediction: 'SMALL', message: 'Small chance' },
        { round: 6, previousLastDigit: 9, prediction: 'BIG', message: 'Big chance' },
        { round: 7, previousLastDigit: 2, prediction: 'SMALL', message: 'Small chance' },
        { round: 8, previousLastDigit: 7, prediction: 'BIG', message: 'Big chance' },
        { round: 9, previousLastDigit: 4, prediction: 'SMALL', message: 'Small chance' },
      ],
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    }
  ];

  giftCodes: GiftCode[] = [
    {
      id: 'gift-1',
      code: 'AROWVIP50',
      title: 'VIP Community Gift ₹50',
      rewardAmount: 50,
      totalLimit: 500,
      usedCount: 12,
      claimedUsers: [],
      minVipLevel: 0,
      minTotalDeposit: 0,
      expiresAt: '2026-12-31T23:59:59.000Z',
      status: 'active',
      createdAt: '2026-08-01T00:00:00.000Z',
      createdBy: 'SuperAdmin',
    },
    {
      id: 'gift-2',
      code: 'LUCKY100',
      title: 'Lucky Telegram Bonus ₹100',
      rewardAmount: 100,
      totalLimit: 200,
      usedCount: 28,
      claimedUsers: [],
      minVipLevel: 0,
      minTotalDeposit: 0,
      expiresAt: '2026-12-31T23:59:59.000Z',
      status: 'active',
      createdAt: '2026-08-01T00:00:00.000Z',
      createdBy: 'SuperAdmin',
    }
  ];
  
  periodCounters: Record<string, number> = {
    wingo_30s: 10500,
    wingo_1m: 10500,
    wingo_3m: 10500,
    wingo_5m: 10500,
  };

  // Google Sheet Ledger Data Structures (Synchronized on Admin Approval)
  googleSheetDeposits: GoogleSheetDepositRow[] = [];
  googleSheetWithdrawals: GoogleSheetWithdrawalRow[] = [];

  adminBankAccounts: string[] = ['SARKAR TRANSPORT', 'SARKAR TRA.', 'HDFC BANK', 'ICICI BANK', 'SBI BANK'];
  googleSheetPlatforms: string[] = ['AROWCLUB', 'SKY EXCH', 'RADHE EXCH', 'ARMANI'];
  googleSheetDepositSeq: number = 0;
  googleSheetWithdrawSeq: number = 0;
  googleSheetWebhookUrl: string = '';
  
  paymentMethods: any[] = [
    {
      id: 'pm-1',
      type: 'qr',
      name: 'Aadi Shakti',
      upiId: '8210764704@okbizaxis',
      minAmount: 100,
      maxAmount: 50000,
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'pm-2',
      type: 'qr',
      name: 'AANAND KUMAR',
      upiId: 'chikusarkar018-1@okhdfcbank',
      minAmount: 100,
      maxAmount: 50000,
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'pm-3',
      type: 'bank',
      name: 'HDFC Corporate Direct',
      bankName: 'HDFC Bank',
      accountNumber: '50200084729104',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'ArowClub Gaming Merchant Ltd',
      minAmount: 500,
      maxAmount: 100000,
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
    }
  ];

  withdrawSettings: any = {
    startTime: '00:00',
    endTime: '23:55',
    dailyLimitCount: 100,
    processingFeePercent: 0,
    minAmount: 110,
    maxAmount: 100000,
    rollingRequirement: 1,
    customRequiredTurnover: 0,
    noticeMessage: 'Withdrawals are processed instantly 24/7. Minimum withdrawal is ₹110. Please ensure your bank/UPI details are correct.',
  };

  autoResultRules: any[] = [
    { id: 'rule-1', maxAmount: 5000, mode: 'house_best' },
    { id: 'rule-2', maxAmount: 30000, mode: 'house_best' },
    { id: 'rule-3', maxAmount: 70000, mode: 'house_best' },
    { id: 'rule-4', maxAmount: 'infinity', mode: 'house_best' },
  ];

  gameAutoModes: Record<string, string> = {
    wingo_30s: '50_percent',
    wingo_1m: '50_percent',
    wingo_3m: 'house_best',
    wingo_5m: 'house_best',
  };

  depositAmountBonusTiers: any[] = [
    { id: 'tier-100', amount: 100, bonusAmount: 10, bonusPercent: 10, label: '+₹10 Bonus', isActive: true },
    { id: 'tier-500', amount: 500, bonusAmount: 25, bonusPercent: 5, label: '+₹25 Bonus', isActive: true },
    { id: 'tier-1000', amount: 1000, bonusAmount: 50, bonusPercent: 5, label: '+₹50 Bonus', isActive: true },
    { id: 'tier-2000', amount: 2000, bonusAmount: 80, bonusPercent: 4, label: '+₹80 Bonus', isActive: true },
    { id: 'tier-5000', amount: 5000, bonusAmount: 120, bonusPercent: 2.4, label: '+₹120 Bonus', isActive: true },
    { id: 'tier-10000', amount: 10000, bonusAmount: 150, bonusPercent: 1.5, label: '+₹150 Bonus', isActive: true },
    { id: 'tier-20000', amount: 20000, bonusAmount: 180, bonusPercent: 0.9, label: '+₹180 Bonus', isActive: true },
    { id: 'tier-50000', amount: 50000, bonusAmount: 199, bonusPercent: 0.4, label: '+₹199 Bonus', isActive: true },
  ];

  bonusTasksConfig: any[] = [
    {
      id: 'task-first-deposit',
      title: 'First Recharge ₹100+ Bonus',
      reward: 50,
      badge: 'POPULAR',
      badgeColor: 'bg-red-500',
      desc: 'Recharge ₹100 or more in your account and claim an instant ₹50 extra bonus.',
      actionLabel: 'Recharge & Claim',
      targetType: 'deposit',
      targetValue: 100,
      isActive: true,
    },
    {
      id: 'task-invite-friends',
      title: 'Invite 1 Friend Bonus',
      reward: 50,
      badge: 'UNLIMITED',
      badgeColor: 'bg-purple-500',
      desc: 'Share your referral code. When 1 friend registers and joins, claim your ₹50 reward.',
      actionLabel: 'Invite & Claim',
      targetType: 'invite',
      targetValue: 1,
      isActive: true,
    },
    {
      id: 'task-bet-challenge',
      title: '₹500 Game Turnover Challenge',
      reward: 30,
      badge: 'DAILY BONUS',
      badgeColor: 'bg-amber-500',
      desc: 'Place bets totaling ₹500 or more in WinGo, 7 Up Down, Aviator or Mines.',
      actionLabel: 'Play & Claim',
      targetType: 'turnover',
      targetValue: 500,
      isActive: true,
    },
    {
      id: 'task-vip-bonus',
      title: 'VIP 1 Loyalty Gift',
      reward: 70,
      badge: 'VIP REWARD',
      badgeColor: 'bg-blue-500',
      desc: 'Unlock VIP 1 status and claim your special ₹70 loyalty package.',
      actionLabel: 'VIP Claim',
      targetType: 'vip',
      targetValue: 1,
      isActive: true,
    },
    {
      id: 'task-rounds-challenge',
      title: '10 Rounds Master Challenge',
      reward: 40,
      badge: 'GAME TASK',
      badgeColor: 'bg-emerald-500',
      desc: 'Play 10 rounds across WinGo, Roulette, Mines or 7 Up Down to claim ₹40 bonus.',
      actionLabel: 'Play & Claim',
      targetType: 'rounds',
      targetValue: 10,
      isActive: true,
    },
  ];

  activityPromosConfig: any[] = [
    {
      id: 'act-daily-checkin',
      title: '7-Day Daily Check-In Bonus',
      rewardText: 'Up to ₹100 Daily',
      rewardValue: 100,
      tag: 'DAILY EVENT',
      tagColor: 'bg-emerald-500',
      desc: 'Log in daily and collect instant cash rewards directly into your gaming balance.',
      rules: 'Check in consecutive 7 days to collect progressive cash bonuses (₹5 to ₹100).',
      badge: 'HOT',
      targetType: 'checkin',
      extraSettings: {
        dailyCheckinRewards: [5, 10, 15, 25, 40, 60, 100],
      },
      isActive: true,
    },
    {
      id: 'act-first-deposit',
      title: 'First Deposit Match Bonus',
      rewardText: '+₹50 Extra Bonus',
      rewardValue: 50,
      tag: 'NEW PLAYERS',
      tagColor: 'bg-[#f5c443] text-black',
      desc: 'Deposit ₹100 or more on your first recharge and receive ₹50 extra bonus cash instantly.',
      rules: '1X turnover requirement on Win Go, 7 Up Down and Aviator.',
      badge: 'BEST OFFER',
      targetType: 'first_deposit',
      extraSettings: {
        matchBonus: 50,
        minDeposit: 100,
      },
      isActive: true,
    },
  ];

  allGameControls: any = {
    mines: {
      mode: 'auto_managed', // 'auto_managed' | 'house_best' | 'step_trap' | 'fair' | 'force_win'
      forcedTrapStep: 2,
      autoTrapHighBetThreshold: 100,
      forcedMineCoordinates: [2, 7, 12, 17, 22],
      houseRTP: 0.90,
      targetWinRate: 0.50, // 50% fair dynamic balance: client wins & loses naturally
    },
    roulette: {
      mode: 'auto_managed', // 'auto_managed' | 'house_best' | 'force_number' | 'force_color' | 'fair' | 'force_win'
      forcedNextNumber: null,
      forcedNextColor: null,
      houseRTP: 0.90,
      targetWinRate: 0.48, // 48% dynamic balance
    },
    aviator: {
      mode: 'house_best', // Excluded from auto-manage change as requested
      forcedCrashMultiplier: null,
      autoCrashPoolThreshold: 500,
      houseRTP: 0.92,
    },
    chicken_road: {
      mode: 'auto_managed', // 'auto_managed' | 'house_best' | 'fair'
      forcedTrapStep: 3,
      houseRTP: 0.90,
      targetWinRate: 0.52,
    },
    plinko: {
      mode: 'auto_managed',
      forcedSlotMultiplier: 0.2,
      houseRTP: 0.90,
      targetWinRate: 0.50,
    },
    seven_up_down: {
      mode: 'auto_managed',
      houseRTP: 0.90,
      targetWinRate: 0.48,
    },
    teen_patti: {
      mode: 'auto_managed',
      houseRTP: 0.90,
      targetWinRate: 0.48,
    },
    ludo: {
      mode: 'auto_managed',
      isActive: true,
      botDifficulty: 'medium',
      winTargetRTP: 0.90,
      targetWinRate: 0.50,
    },
    chess: {
      mode: 'auto_managed',
      botDifficulty: 'medium',
      targetWinRate: 0.50,
    },
  };

  announcementPopup: any = {
    isEnabled: false,
    title: 'ArowClub Official Announcement',
    message: 'Welcome to ArowClub! Enjoy instant 24/7 UPI & Bank withdrawals, fair games, and daily deposit bonuses.',
    imageUrl: '/banners/bonus_100.jpg',
    buttonText: 'Got It / Continue',
    actionUrl: '/recharge',
  };

  firstDepositBonusConfig: any = {
    isEnabled: true,
    title: 'Extra first deposit bonus',
    subtitle: 'Each account can only receive rewards once',
    tiers: [
      { id: 'tier-100', amount: 100, bonusAmount: 10, label: '+₹10.00', isActive: true },
      { id: 'tier-500', amount: 500, bonusAmount: 28, label: '+₹28.00', isActive: true },
      { id: 'tier-1000', amount: 1000, bonusAmount: 58, label: '+₹58.00', isActive: true },
      { id: 'tier-5000', amount: 5000, bonusAmount: 188, label: '+₹188.00', isActive: true },
      { id: 'tier-10000', amount: 10000, bonusAmount: 288, label: '+₹288.00', isActive: true },
      { id: 'tier-50000', amount: 50000, bonusAmount: 588, label: '+₹588.00', isActive: true },
      { id: 'tier-1000000', amount: 1000000, bonusAmount: 10000, label: '+₹10,000.00', isActive: true },
    ],
  };

  adminUpiDetails: any = {
    upiId: '8210764704@okbizaxis',
    payeeName: 'Aadi Shakti',
    bankName: 'Axis Bank',
    instructions: 'Scan QR or transfer directly to the UPI ID.',
    isEnabled: true,
  };

  adminBankDetails: any = {
    bankName: 'HDFC Bank',
    accountHolderName: 'ArowClub Official Enterprise',
    accountNumber: '50200084729104',
    ifscCode: 'HDFC0001234',
    branch: 'New Delhi Corporate Branch',
    upiId: '8210764704@okbizaxis',
    qrImageUrl: '',
    instructions: '1. Transfer exact amount using IMPS/NEFT/RTGS to the bank account.\n2. Copy the 12-digit UTR/Ref number.\n3. Paste UTR and submit for instant 1-minute recharge approval.',
    isEnabled: true,
  };

  vipTiers: any[] = [
    {
      level: 1,
      name: 'VIP1',
      tierCategory: 'Bronze',
      tierCategoryHindi: 'ब्रॉन्ज (Bronze)',
      requiredExp: 3000,
      levelUpReward: 60,
      safeIncomeRate: '0.1%',
      rebateRate: '0.6%',
      monthlyReward: 30,
      withdrawalLimit: 5,
    },
    {
      level: 2,
      name: 'VIP2',
      tierCategory: 'Silver',
      tierCategoryHindi: 'सिल्वर (Silver)',
      requiredExp: 10000,
      levelUpReward: 90,
      safeIncomeRate: '0.2%',
      rebateRate: '0.8%',
      monthlyReward: 45,
      withdrawalLimit: 8,
    },
    {
      level: 3,
      name: 'VIP3',
      tierCategory: 'Gold',
      tierCategoryHindi: 'गोल्डन (Gold)',
      requiredExp: 30000,
      levelUpReward: 120,
      safeIncomeRate: '0.3%',
      rebateRate: '1.0%',
      monthlyReward: 60,
      withdrawalLimit: 10,
    },
    {
      level: 4,
      name: 'VIP4',
      tierCategory: 'Platinum',
      tierCategoryHindi: 'प्लैटिनम (Platinum)',
      requiredExp: 80000,
      levelUpReward: 140,
      safeIncomeRate: '0.4%',
      rebateRate: '1.2%',
      monthlyReward: 70,
      withdrawalLimit: 15,
    },
    {
      level: 5,
      name: 'VIP5',
      tierCategory: 'Diamond',
      tierCategoryHindi: 'डायमंड (Diamond)',
      requiredExp: 200000,
      levelUpReward: 160,
      safeIncomeRate: '0.5%',
      rebateRate: '1.4%',
      monthlyReward: 80,
      withdrawalLimit: 20,
    },
    {
      level: 6,
      name: 'VIP6',
      tierCategory: 'Obsidian',
      tierCategoryHindi: 'ऑब्सीडियन (Obsidian)',
      requiredExp: 500000,
      levelUpReward: 180,
      safeIncomeRate: '0.6%',
      rebateRate: '1.6%',
      monthlyReward: 90,
      withdrawalLimit: 25,
    },
    {
      level: 7,
      name: 'VIP7',
      tierCategory: 'Supreme',
      tierCategoryHindi: 'सुप्रीम (Supreme)',
      requiredExp: 1200000,
      levelUpReward: 199,
      safeIncomeRate: '0.8%',
      rebateRate: '2.0%',
      monthlyReward: 100,
      withdrawalLimit: 50,
    },
    {
      level: 8,
      name: 'VIP8',
      tierCategory: 'Supreme',
      tierCategoryHindi: 'सुप्रीम 8 (Supreme 8)',
      requiredExp: 3000000,
      levelUpReward: 250,
      safeIncomeRate: '1.0%',
      rebateRate: '2.5%',
      monthlyReward: 150,
      withdrawalLimit: 100,
    },
    {
      level: 9,
      name: 'VIP9',
      tierCategory: 'Supreme',
      tierCategoryHindi: 'सुप्रीम 9 (Supreme 9)',
      requiredExp: 7000000,
      levelUpReward: 350,
      safeIncomeRate: '1.2%',
      rebateRate: '3.0%',
      monthlyReward: 200,
      withdrawalLimit: 200,
    },
    {
      level: 10,
      name: 'VIP10',
      tierCategory: 'Supreme',
      tierCategoryHindi: 'रॉयल लेजेंड (Royal Legend)',
      requiredExp: 15000000,
      levelUpReward: 500,
      safeIncomeRate: '1.5%',
      rebateRate: '4.0%',
      monthlyReward: 300,
      withdrawalLimit: 500,
    },
  ];

  bonusCommissionSettings: any = {
    depositBonusPercent: 10, // Extra 10% on every deposit
    winningDeductionPercent: 0, // Admin determined (default 0%)
    firstDepositBonusPercent: 10, // 10% on 1st deposit
    gameWinningDeductions: {
      seven_up_down: 0,
      wingo_30s: 0,
      wingo_1m: 0,
      wingo_3m: 0,
      wingo_5m: 0,
      mines: 0,
      aviator: 0,
      roulette: 0,
      chicken_road: 0,
      plinko: 0,
    },
  };

  referralSystemSettings: any = {
    signupBonus: 10,
    referralInviteBonus: 50,
    depositCommissionPercent: 10,
    history: [],
  };

  supportTickets: any[] = [
    {
      id: 't-108429',
      uid: '108429',
      username: 'PlayerLucky99',
      lastMessage: 'Mera withdrawal kab tak aayega?',
      lastMessageTime: '2026-08-24T08:30:00.000Z',
      unreadCountByAdmin: 1,
      unreadCountByUser: 0,
      status: 'open',
      createdAt: '2026-08-24T08:25:00.000Z',
      messages: [
        {
          id: 'm-1',
          ticketId: 't-108429',
          uid: '108429',
          username: 'PlayerLucky99',
          sender: 'user',
          message: 'Mera withdrawal kab tak aayega?',
          timestamp: '2026-08-24T08:25:00.000Z',
        },
        {
          id: 'm-2',
          ticketId: 't-108429',
          uid: '108429',
          username: 'System Bot',
          sender: 'system',
          message: 'Aapka message mil gaya hai. Hamari support team aapse 5 min me contact karegi. Kripya bane rahein.',
          timestamp: '2026-08-24T08:25:02.000Z',
        },
      ],
    },
    {
      id: 't-109552',
      uid: '109552',
      username: 'KingRohit',
      lastMessage: 'Deposit bonus credit nahi hua',
      lastMessageTime: '2026-08-23T15:40:00.000Z',
      unreadCountByAdmin: 0,
      unreadCountByUser: 0,
      status: 'open',
      createdAt: '2026-08-23T15:35:00.000Z',
      messages: [
        {
          id: 'm-3',
          ticketId: 't-109552',
          uid: '109552',
          username: 'KingRohit',
          sender: 'user',
          message: 'Deposit bonus credit nahi hua',
          timestamp: '2026-08-23T15:35:00.000Z',
        },
        {
          id: 'm-4',
          ticketId: 't-109552',
          uid: '109552',
          username: 'System Bot',
          sender: 'system',
          message: 'Aapka message mil gaya hai. Hamari support team aapse 5 min me contact karegi. Kripya bane rahein.',
          timestamp: '2026-08-23T15:35:02.000Z',
        },
        {
          id: 'm-5',
          ticketId: 't-109552',
          uid: '109552',
          username: 'SuperAdmin',
          sender: 'admin',
          message: 'Hello Rohit, aapka 5% deposit bonus manual check karke wallet me credit kar diya gaya hai. Thank you!',
          timestamp: '2026-08-23T15:40:00.000Z',
        },
      ],
    },
  ];

  gameCatalog: any[] = [
    {
      id: 'gc-wingo',
      gameKey: 'wingo',
      name: 'Win Go Colour Prediction',
      category: 'prediction',
      status: 'active',
      minBet: 10,
      maxBet: 50000,
      durationSeconds: 30,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 96.5,
      houseCutPercent: 0,
      isLive: true,
    },
    {
      id: 'gc-roulette',
      gameKey: 'roulette',
      name: 'European Roulette 36',
      category: 'casino',
      status: 'active',
      minBet: 50,
      maxBet: 20000,
      durationSeconds: 15,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 97.3,
      houseCutPercent: 0,
      isLive: true,
    },
    {
      id: 'gc-aviator',
      gameKey: 'aviator',
      name: 'Aviator Crash Multiplier',
      category: 'crash',
      status: 'active',
      minBet: 10,
      maxBet: 50000,
      durationSeconds: 20,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 97.0,
      houseCutPercent: 0,
      isLive: true,
    },
    {
      id: 'gc-mines',
      gameKey: 'mines',
      name: 'Mines 5x5 Matrix',
      category: 'instant',
      status: 'active',
      minBet: 10,
      maxBet: 20000,
      durationSeconds: 0,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 96.0,
      houseCutPercent: 0,
      isLive: true,
    },
    {
      id: 'gc-chicken',
      gameKey: 'chicken_road',
      name: 'Chicken Road Cross',
      category: 'instant',
      status: 'active',
      minBet: 10,
      maxBet: 15000,
      durationSeconds: 0,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 95.5,
      houseCutPercent: 0,
      isLive: true,
    },
    {
      id: 'gc-seven',
      gameKey: 'seven_up_down',
      name: '7 Up Down Live Dice',
      category: 'table',
      status: 'active',
      minBet: 10,
      maxBet: 30000,
      durationSeconds: 25,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 96.2,
      houseCutPercent: 0,
      isLive: true,
    },
    {
      id: 'gc-teenpatti',
      gameKey: 'teen_patti',
      name: 'Teen Patti Indian Poker',
      category: 'table',
      status: 'active',
      minBet: 20,
      maxBet: 25000,
      durationSeconds: 20,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 96.8,
      houseCutPercent: 0,
      isLive: true,
    },
    {
      id: 'gc-plinko',
      gameKey: 'plinko',
      name: 'Plinko Multiplier Drop',
      category: 'instant',
      status: 'active',
      minBet: 10,
      maxBet: 10000,
      durationSeconds: 0,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 96.0,
      houseCutPercent: 0,
      isLive: true,
    },
    {
      id: 'gc-ludo',
      gameKey: 'ludo',
      name: 'Ludo Battle Cash',
      category: 'table',
      status: 'active',
      minBet: 10,
      maxBet: 50000,
      durationSeconds: 0,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
      rtp: 96.0,
      houseCutPercent: 5.0,
      isLive: true,
    },
  ];

  banners: any[] = [
    {
      id: 'b-1',
      title: 'First Deposit 100% Bonus',
      description: 'Get 100% extra on your first recharge up to ₹5,000! Valid for all new users.',
      imageUrl: '/banners/bonus_100.jpg',
      buttonText: 'Claim Bonus',
      buttonLink: '/deposit',
      isActive: true,
      position: 1,
      tag: '100% BONUS',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'b-2',
      title: 'VIP Level Up Carnival',
      description: 'Play more, earn more, level up & win big with exclusive VIP rewards and 24/7 VIP support.',
      imageUrl: '/banners/vip_carnival.jpg',
      buttonText: 'Level Up Now',
      buttonLink: '/vip',
      isActive: true,
      position: 2,
      tag: 'VIP CARNIVAL',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'b-3',
      title: 'Invite Friends & Earn Referral Commission',
      description: 'Invite your friends to ArowClub and earn instant referral bonus on signup & deposit!',
      imageUrl: '/banners/invite_earn.jpg',
      buttonText: 'Invite Now',
      buttonLink: '/referral',
      isActive: true,
      position: 3,
      tag: 'REFERRAL BONUS',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  adminNotifications: any[] = [
    {
      id: 'notif-1',
      title: 'Welcome to ArowClub Official Gaming',
      message: 'Experience fast-settling Colour Prediction, Aviator, Mines and Live Dealer games with 24/7 instant withdrawals.',
      targetType: 'all',
      status: 'sent',
      sentAt: '2026-08-20T10:00:00.000Z',
      createdAt: '2026-08-20T10:00:00.000Z',
    },
    {
      id: 'notif-2',
      title: 'Weekly Mega Turnover Race Activated',
      message: 'Play Win Go 30s & Roulette to claim up to ₹10,000 extra cash prizes on the leaderboard.',
      targetType: 'all',
      status: 'sent',
      sentAt: '2026-08-24T12:00:00.000Z',
      createdAt: '2026-08-24T12:00:00.000Z',
    },
  ];

  supportPlatforms: any[] = [
    {
      id: 'sp-telegram',
      platform: 'telegram',
      name: 'Telegram Support VIP',
      link: 'https://t.me/ArowClubSupport',
      icon: 'Send',
      isActive: true,
      copyText: '@ArowClubSupport',
      updatedAt: '2026-08-25T00:00:00.000Z',
    },
    {
      id: 'sp-telegram-chan',
      platform: 'telegram',
      name: 'Official Telegram Channel',
      link: 'https://t.me/ArowClubOfficial',
      icon: 'Radio',
      isActive: true,
      copyText: '@ArowClubOfficial',
      updatedAt: '2026-08-25T00:00:00.000Z',
    },
    {
      id: 'sp-instagram',
      platform: 'instagram',
      name: 'Instagram Official',
      link: 'https://instagram.com/arowclub_official',
      icon: 'Instagram',
      isActive: true,
      copyText: '@arowclub_official',
      updatedAt: '2026-08-25T00:00:00.000Z',
    },
    {
      id: 'sp-email',
      platform: 'email',
      name: 'Support Email Assistance',
      link: 'mailto:support@arowclub.pro',
      icon: 'Mail',
      isActive: true,
      copyText: 'support@arowclub.pro',
      updatedAt: '2026-08-25T00:00:00.000Z',
    },
    {
      id: 'sp-chat',
      platform: 'chat',
      name: 'In-App Live Support Desk',
      link: '#support-desk',
      icon: 'Headphones',
      isActive: true,
      copyText: 'Instant Live Chat',
      updatedAt: '2026-08-25T00:00:00.000Z',
    },
  ];

  maintenanceConfig: any = {
    isEnabled: false,
    title: 'WEBSITE MAINTENANCE',
    message: 'WE ARE CURRENTLY WORKING ON SOME UPDATES TO SERVE YOU BETTER',
    imageUrl: '/maintenance_arowclub_bg.jpg',
    bannerUrl: '/maintenance_arowclub_bg.jpg',
    startTime: '06:16 PM',
    endTime: '06:18 PM',
    history: [
      {
        id: 'maint-log-1',
        enabledBy: 'SuperAdmin',
        startTime: '2026-08-10T02:00:00.000Z',
        endTime: '2026-08-10T02:45:00.000Z',
        reason: 'Scheduled database indexing & server performance patch',
      }
    ],
  };

  adminStaff: any[] = [
    {
      id: 'adm-01',
      username: 'SuperAdmin',
      name: 'Master System Admin',
      email: 'admin@arowclub.pro',
      role: 'super_admin',
      status: 'active',
      lastLogin: '2026-08-26T08:30:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'adm-02',
      username: 'FinanceAdmin',
      name: 'Priya Sharma (Finance)',
      email: 'finance@arowclub.pro',
      role: 'finance_admin',
      status: 'active',
      lastLogin: '2026-08-25T14:20:00.000Z',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
    {
      id: 'adm-03',
      username: 'GameAdmin',
      name: 'Rahul Verma (Gaming)',
      email: 'games@arowclub.pro',
      role: 'game_admin',
      status: 'active',
      lastLogin: '2026-08-24T18:10:00.000Z',
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'adm-04',
      username: 'SupportAgent',
      name: 'Aman Khan (Support Desk)',
      email: 'support@arowclub.pro',
      role: 'support_admin',
      status: 'active',
      lastLogin: '2026-08-25T21:05:00.000Z',
      createdAt: '2026-04-01T00:00:00.000Z',
    },
    {
      id: 'adm-05',
      username: 'AuditorUser',
      name: 'Rohan Gupta (Auditor)',
      email: 'audit@arowclub.pro',
      role: 'viewer',
      status: 'active',
      lastLogin: '2026-08-20T11:40:00.000Z',
      createdAt: '2026-05-01T00:00:00.000Z',
    },
  ];
  platformGameSettings: any = {
    minBetAmount: 10,
    maxBetAmount: 50000,
    numberMultiplier: 9,
    colorMultiplier: 2,
    violetMultiplier: 4.5,
    bigSmallMultiplier: 2,
    dualColorMultiplier: 1.5,
    feePercentage: 0,
    resultMode: 'auto' as const,
    countdown30s: 30,
    countdown1m: 60,
    countdown3m: 180,
    countdown5m: 300,
  };
  platformSettings: any = {
    siteName: 'ArowClub',
    merchantUpiId: 'arowclub.official@upi',
    merchantName: 'ArowClub Gaming Merchant',
    whatsappSupport: '',
    whatsappLink: '',
    whatsappGroup: '',
    telegramSupport: 'https://t.me/ArowClubSupport',
    telegramChannel: 'https://t.me/arowclub_official',
    supportHelplineTitle: '24/7 VIP Customer Support',
    supportBannerText: 'Need instant help with recharge, withdrawal or game rules? Contact our dedicated support team on Telegram or Live Chat 24/7.',
    isWhatsappActive: false,
    isTelegramActive: true,
    minDeposit: 100,
    maxDeposit: 50000,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    dailyWithdrawalLimit: 3,
    winningTaxPercent: 0,
    depositTurnoverMultiplier: 1.0,
    minDepositToBet: 100, // Mandatory rule: Minimum ₹100 deposit required before any betting
    maintenanceMode: false,
  };

  constructor() {
    this.seedInitialData();
    this.loadFromDisk();
  }

  public getUser(identifier?: string | null): User | undefined {
    if (!identifier) return undefined;
    const strId = String(identifier).trim();
    if (!strId) return undefined;

    // 1. Direct match by uid
    let user = this.users.get(strId);
    if (user) return user;

    // 2. If 'u-12345' format passed or stripped
    if (strId.startsWith('u-')) {
      const rawUid = strId.substring(2);
      user = this.users.get(rawUid);
      if (user) return user;
    }

    const cleanDigits = strId.replace(/\D/g, '');

    // 3. Scan values for exact uid, id, phone, or username
    for (const u of this.users.values()) {
      if (!u) continue;
      if (u.uid === strId || u.id === strId || u.id === `u-${strId}`) return u;
      if (u.phone) {
        if (u.phone === strId) return u;
        const uDigits = u.phone.replace(/\D/g, '');
        if (cleanDigits.length >= 10 && uDigits.length >= 10 && cleanDigits.slice(-10) === uDigits.slice(-10)) {
          return u;
        }
      }
      if (u.username && u.username.toLowerCase() === strId.toLowerCase()) return u;
      if (u.email && u.email.toLowerCase() === strId.toLowerCase()) return u;
    }
    return undefined;
  }

  public getAllUniqueUsers(): User[] {
    const userMap = new Map<string, User>();
    for (const u of this.users.values()) {
      if (u && (u.uid || u.id)) {
        const uidStr = String(u.uid || String(u.id).replace(/^u-/, ''));
        userMap.set(uidStr, u);
      }
    }
    return Array.from(userMap.values());
  }

  // Calculate real total lifetime deposit of a user
  public getUserTotalDeposit(identifierOrUser?: any): number {
    if (!identifierOrUser) return 0;
    const user: any = typeof identifierOrUser === 'object' ? identifierOrUser : this.getUser(String(identifierOrUser));
    if (!user) return 0;
    const recorded = Number(user.totalDeposit || 0);
    const approvedDeposits = (this.deposits || []).filter(
      (d: any) => (d.uid === user.uid || (user.phone && d.phone === user.phone) || d.userId === user.uid) && d.status === 'approved'
    );
    const fromDeposits = approvedDeposits.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
    return Math.max(recorded, fromDeposits);
  }

  // Synchronize and reconcile User Turnover, Bets, Wins, Losses, and 1X Rolling requirement
  public syncUserTurnover(identifierOrUser?: any): User | undefined {
    if (!identifierOrUser) return undefined;
    const user: any = typeof identifierOrUser === 'object' ? identifierOrUser : this.getUser(String(identifierOrUser));
    if (!user) return undefined;

    const rawUid = String(user.uid || user.id || '').replace(/^u-/, '');
    if (!rawUid) return user;

    // 1. Calculate actual bet sum from all recorded bets in db.bets
    const userBets = (this.bets || []).filter(
      (b: any) => String(b.uid || b.userId || '').replace(/^u-/, '') === rawUid
    );
    const sumFromBets = userBets.reduce(
      (sum: number, b: any) => sum + (Number(b.totalAmount) || Number(b.unitAmount) || Number(b.amount) || 0),
      0
    );

    // 2. Calculate actual bet sum from db.transactions (type === 'bet')
    const userBetTxs = (this.transactions || []).filter(
      (t: any) => String(t.uid || '').replace(/^u-/, '') === rawUid && t.type === 'bet'
    );
    const sumFromTxs = userBetTxs.reduce(
      (sum: number, t: any) => sum + Math.abs(Number(t.amount) || 0),
      0
    );

    // 3. Real Total Bet volume played by user
    const realTotalBet = parseFloat(Math.max(Number(user.totalBet || 0), sumFromBets, sumFromTxs).toFixed(2));
    user.totalBet = realTotalBet;

    // 4. Calculate total win payouts
    const sumWinBets = userBets
      .filter((b: any) => b.status === 'won' || (Number(b.winAmount) || 0) > 0)
      .reduce((sum: number, b: any) => sum + (Number(b.winAmount) || 0), 0);
    const userWinTxs = (this.transactions || []).filter(
      (t: any) => String(t.uid || '').replace(/^u-/, '') === rawUid && t.type === 'win'
    );
    const sumWinTxs = userWinTxs.reduce(
      (sum: number, t: any) => sum + Math.abs(Number(t.amount) || 0),
      0
    );
    const realTotalWin = parseFloat(Math.max(Number(user.totalWin || 0), sumWinBets, sumWinTxs).toFixed(2));
    user.totalWin = realTotalWin;

    // 5. Calculate total loss
    const sumLostBets = userBets
      .filter((b: any) => b.status === 'lost')
      .reduce((sum: number, b: any) => sum + (Number(b.totalAmount) || 0), 0);
    user.totalLoss = parseFloat(Math.max(Number(user.totalLoss || 0), sumLostBets).toFixed(2));

    // 6. ROLLING SYSTEM (STAKE does not count; ONLY settled eligible Game P&L counts)
    // Loss: Lost stake amount
    // Win: Net profit = max(0, winAmount - stake)
    // Push/refund: 0
    // Deduplicated by unique bet ID to prevent counting the same game twice
    const seenBetIds = new Set<string>();
    let totalEligiblePnlFromBets = 0;
    for (const b of userBets) {
      const bId = String(b.id || '');
      if (bId && seenBetIds.has(bId)) continue;
      if (bId) seenBetIds.add(bId);

      if (b.status === 'lost') {
        const lossAmt = Number(b.totalAmount || b.unitAmount || (b as any).amount || 0);
        totalEligiblePnlFromBets += lossAmt;
      } else if (b.status === 'won') {
        const stake = Number(b.totalAmount || b.unitAmount || (b as any).amount || 0);
        const win = Number(b.winAmount || 0);
        const netProfit = Math.max(0, win - stake);
        totalEligiblePnlFromBets += netProfit;
      }
    }

    const completedRolling = parseFloat(Math.max(Number(user.completedRolling || 0), totalEligiblePnlFromBets).toFixed(2));
    user.completedRolling = completedRolling;

    // Initialize requiredRolling if not set
    if (user.requiredRolling === undefined || user.requiredRolling === null) {
      user.requiredRolling = Number(user.requiredTurnover || 0);
    }
    const requiredRolling = Number(user.requiredRolling || 0);

    // Incomplete rolling carries forward automatically
    if (user.remainingRolling === undefined || user.remainingRolling === null) {
      user.remainingRolling = Math.max(0, parseFloat((requiredRolling - completedRolling).toFixed(2)));
    } else {
      user.remainingRolling = Math.max(0, parseFloat(Math.min(user.remainingRolling, Math.max(0, requiredRolling - completedRolling)).toFixed(2)));
    }

    // Mirror to turnover fields for backward compatibility
    user.completedTurnover = user.completedRolling;
    user.currentTurnover = user.completedRolling;
    user.requiredTurnover = user.requiredRolling;
    user.remainingTurnover = user.remainingRolling;

    return user;
  }

  // Apply settled game rolling strictly based on eligible P&L (Loss = stake lost, Win = net profit)
  public applySettledBetRolling(user: User, bet: Bet): number {
    if (!user || !bet) return 0;
    if ((bet as any).rollingCounted) return 0;
    (bet as any).rollingCounted = true;

    let eligiblePnl = 0;
    if (bet.status === 'lost') {
      eligiblePnl = Math.max(0, Number(bet.totalAmount || bet.unitAmount || (bet as any).amount || 0));
    } else if (bet.status === 'won') {
      const stake = Number(bet.totalAmount || bet.unitAmount || (bet as any).amount || 0);
      const win = Number(bet.winAmount || 0);
      eligiblePnl = Math.max(0, Number((win - stake).toFixed(2)));
    }
    (bet as any).rollingEligiblePnl = eligiblePnl;

    if (eligiblePnl > 0) {
      user.completedRolling = Number(((user.completedRolling || 0) + eligiblePnl).toFixed(2));
      user.remainingRolling = Math.max(0, Number(((user.remainingRolling || 0) - eligiblePnl).toFixed(2)));
      user.completedTurnover = user.completedRolling;
      user.currentTurnover = user.completedRolling;
      user.remainingTurnover = user.remainingRolling;
    }
    return eligiblePnl;
  }

  // Check if betting is allowed for user (respects minDepositToBet setting if configured > 0, defaults to 100)
  public isBettingAllowedForUser(identifierOrUser?: any): { allowed: boolean; message?: string; minDepositRequired: number; currentDeposit: number } {
    const rawSetting = this.platformSettings?.minDepositToBet;
    const minDepositRequired = (rawSetting !== undefined && rawSetting !== null) ? Number(rawSetting) : 100;
    if (!identifierOrUser) {
      return { allowed: false, message: 'User not found. Please log in.', minDepositRequired, currentDeposit: 0 };
    }
    const user: any = typeof identifierOrUser === 'object' ? identifierOrUser : this.getUser(String(identifierOrUser));
    if (!user) {
      return { allowed: false, message: 'User account not found. Please log in.', minDepositRequired, currentDeposit: 0 };
    }
    if (user.status === 'blocked') {
      return { allowed: false, message: 'Your account is blocked. Contact support.', minDepositRequired, currentDeposit: 0 };
    }

    const currentDeposit = this.getUserTotalDeposit(user);
    if (minDepositRequired > 0 && currentDeposit < minDepositRequired) {
      return {
        allowed: false,
        message: `बेट लगाने और गेम खेलने के लिए कम से कम ₹${minDepositRequired} का डिपॉजिट आवश्यक है। कृपया पहले ₹${minDepositRequired} या अधिक का रिचार्ज करें। (Deposit ₹${minDepositRequired}+ to unlock real betting)`,
        minDepositRequired,
        currentDeposit,
      };
    }
    return { allowed: true, minDepositRequired, currentDeposit };
  }

  // Asynchronous user lookup with instant fallback to permanent Cloud Firestore
  public async getUserAsync(identifier?: string | null): Promise<User | undefined> {
    const cached = this.getUser(identifier);
    if (cached) return cached;

    if (identifier) {
      try {
        const cloudUser = await findUserInFirestore(identifier);
        if (cloudUser && (cloudUser.uid || cloudUser.id)) {
          const uidStr = String(cloudUser.uid || String(cloudUser.id).replace(/^u-/, ''));
          this.users.set(uidStr, cloudUser as User);
          this.saveToDisk(false);
          return cloudUser as User;
        }
      } catch (err) {
        console.warn('Error in getUserAsync lookup:', err);
      }
    }
    return undefined;
  }

  // Save user permanently in memory, disk, and Firestore
  public async saveUser(user: User): Promise<void> {
    if (!user) return;
    const uidStr = String(user.uid || String(user.id).replace(/^u-/, ''));
    this.users.set(uidStr, user);
    this.saveToDisk(false);
    await saveUserPermanently(user);
  }

  // Delete user permanently (Admin action only)
  public async deleteUser(uid: string): Promise<void> {
    const uidStr = String(uid).replace(/^u-/, '');
    this.users.delete(uidStr);
    this.users.delete(`u-${uidStr}`);
    this.saveToDisk(false);
    await deleteUserPermanently(uidStr);
  }

  // Add an entry to Google Sheet Deposit Ledger upon Admin Approval
  public addGoogleSheetDeposit(deposit: any, accountDetails?: string, platform?: string, bonusAmount?: number) {
    const d = new Date();
    const dateFormatted = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const seq = this.googleSheetDepositSeq++;
    const tid = `CRN01D${String(seq).padStart(5, '0')}`;
    const amt = Number(deposit.amount || 0);
    const bonus = Number(bonusAmount || 0);
    const total = amt + bonus;

    const lastRow = this.googleSheetDeposits[this.googleSheetDeposits.length - 1];
    const prevCum = lastRow ? Number(lastRow.cumulative || lastRow.amt || 0) : 0;
    const cumulative = prevCum + amt;

    const targetAccount = accountDetails || deposit.receivingBankName || deposit.accountDetails || deposit.bankName || (this.adminUpiDetails?.bankName || this.adminUpiDetails?.payeeName) || 'SARKAR TRANSPORT';

    const row: GoogleSheetDepositRow = {
      id: `GSD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tid,
      date: dateFormatted,
      userId: deposit.username || deposit.uid,
      amt,
      utr: deposit.utrReference || deposit.utrNumber || 'N/A',
      accountDetails: targetAccount,
      platform: platform || 'AROWCLUB',
      bonus,
      total,
      cumulative,
      depositId: deposit.id,
      createdAt: new Date().toISOString(),
    };

    this.googleSheetDeposits.push(row);
    this.saveToDisk();
    return row;
  }

  // Add an entry to Google Sheet Withdrawal Ledger upon Admin Approval
  public addGoogleSheetWithdrawal(withdrawal: any, payoutRef?: string, accountDetails?: string) {
    const d = new Date();
    const dateFormatted = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const seq = this.googleSheetWithdrawSeq++;
    const tid = `CRN01W${String(seq).padStart(5, '0')}`;
    const amt = -Math.abs(Number(withdrawal.amount || 0));

    const row: GoogleSheetWithdrawalRow = {
      id: `GSW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tid,
      date: dateFormatted,
      accountDetails: accountDetails || 'SARKAR TRANSPORT',
      utr: payoutRef || withdrawal.adminNote || ('62660' + Date.now().toString().slice(-7)),
      userId: withdrawal.username || withdrawal.uid,
      amt,
      status: 'DONE',
      withdrawalId: withdrawal.id,
      createdAt: new Date().toISOString(),
    };

    this.googleSheetWithdrawals.push(row);
    this.saveToDisk();
    return row;
  }

  // Complete Global Data Reset (Starts everything fresh at ZERO)
  public resetAllSystemData() {
    this.deposits = [];
    this.withdrawals = [];
    this.transactions = [];
    this.bets = [];
    this.googleSheetDeposits = [];
    this.googleSheetWithdrawals = [];
    this.googleSheetDepositSeq = 0;
    this.googleSheetWithdrawSeq = 0;
    this.supportTickets = [];
    this.activityLogs = [];
    this.referralSystemSettings.history = [];

    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];
    gameTypes.forEach(gt => {
      this.resultsHistory.set(gt, []);
    });

    this.gameCatalog = this.gameCatalog.map(g => ({
      ...g,
      totalRoundsPlayed: 0,
      totalBetVolume: 0,
    }));

    for (const [uid, user] of this.users.entries()) {
      user.walletBalance = 0;
      user.totalDeposit = 0;
      user.totalWithdrawal = 0;
      user.totalBet = 0;
      user.totalWin = 0;
      user.winLossAmount = 0;
      user.requiredTurnover = 0;
      user.remainingTurnover = 0;
      user.completedTurnover = 0;
      user.referralEarnings = 0;
      user.claimedReferralEarnings = 0;
      user.invitedUsersCount = 0;
      user.rechargeCount = 0;
      user.withdrawalCount = 0;
      this.users.set(uid, user);
    }

    this.saveToDisk();
    return {
      success: true,
      message: 'All system transactions, bets, deposits, withdrawals, results, and balances have been reset to 0 for a brand new start!',
    };
  }

  // Reset/Start fresh Google Sheet Ledger starting from CRN01D00000 & CRN01W00000
  public resetGoogleSheetLedger() {
    this.googleSheetDepositSeq = 0;
    this.googleSheetWithdrawSeq = 0;
    this.googleSheetDeposits = [];
    this.googleSheetWithdrawals = [];
    this.saveToDisk();
    return {
      success: true,
      message: 'Google Sheet financial ledger reset successfully! All new entries will start from CRN01D00000 and CRN01W00000.',
    };
  }

  public saveToDisk(syncToCloud = true) {
    try {
      const uniqueUsers = this.getAllUniqueUsers();
      const data = {
        users: uniqueUsers,
        deposits: this.deposits,
        withdrawals: this.withdrawals,
        transactions: this.transactions,
        bets: this.bets.slice(0, 10000),
        platformSettings: this.platformSettings,
        platformGameSettings: this.platformGameSettings,
        promotions: this.promotions,
        referrals: this.referrals,
        paymentMethods: this.paymentMethods,
        adminUpiDetails: this.adminUpiDetails,
        adminBankDetails: this.adminBankDetails,
        withdrawSettings: this.withdrawSettings,
        autoResultRules: this.autoResultRules,
        gameAutoModes: this.gameAutoModes,
        bonusCommissionSettings: this.bonusCommissionSettings,
        depositAmountBonusTiers: this.depositAmountBonusTiers,
        bonusTasksConfig: this.bonusTasksConfig,
        activityPromosConfig: this.activityPromosConfig,
        allGameControls: this.allGameControls,
        announcementPopup: this.announcementPopup,
        firstDepositBonusConfig: this.firstDepositBonusConfig,
        referralSystemSettings: this.referralSystemSettings,
        supportTickets: this.supportTickets,
        gameCatalog: this.gameCatalog,
        banners: this.banners,
        adminNotifications: this.adminNotifications,
        supportPlatforms: this.supportPlatforms,
        maintenanceConfig: this.maintenanceConfig,
        adminStaff: this.adminStaff,
        bigSmallSessions: this.bigSmallSessions,
        giftCodes: this.giftCodes,
        referralDepositCommissions: this.referralDepositCommissions,
        googleSheetDeposits: this.googleSheetDeposits,
        googleSheetWithdrawals: this.googleSheetWithdrawals,
        adminBankAccounts: this.adminBankAccounts,
        googleSheetPlatforms: this.googleSheetPlatforms,
        googleSheetDepositSeq: this.googleSheetDepositSeq,
        googleSheetWithdrawSeq: this.googleSheetWithdrawSeq,
        googleSheetWebhookUrl: this.googleSheetWebhookUrl,
        activityLogs: this.activityLogs.slice(0, 500),
        periodCounters: this.periodCounters,
        resultsHistory: Array.from(this.resultsHistory.entries()),
        currentPeriods: Array.from(this.currentPeriods.entries()),
      };
      // Atomic write to prevent half-written/corrupted JSON
      const tempFile = `${STORAGE_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, STORAGE_FILE);

      if (syncToCloud) {
        queueFirestoreSync(this);
      }
    } catch (e) {
      console.error('Failed to save database to disk', e);
    }
  }

  public loadFromDisk() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        if (!raw || !raw.trim()) {
          console.warn('Storage file is empty. Initializing defaults.');
          this.saveToDisk();
          return;
        }

        let data: any;
        try {
          data = JSON.parse(raw);
        } catch (jsonErr) {
          console.error('Corrupted JSON detected in data_storage.json. Backing up and resetting.', jsonErr);
          try {
            fs.copyFileSync(STORAGE_FILE, `${STORAGE_FILE}.corrupt.${Date.now()}`);
          } catch (_) {}
          this.saveToDisk();
          return;
        }

        if (data.users && Array.isArray(data.users)) {
          data.users.forEach((u: User) => {
            if (u && (u.uid || u.id) && !isUserPurged(u)) {
              const uidStr = String(u.uid || String(u.id).replace(/^u-/, ''));
              if (!this.users.has(uidStr)) {
                this.users.set(uidStr, u);
              } else {
                const existing = this.users.get(uidStr)!;
                this.users.set(uidStr, { ...u, ...existing });
              }
            }
          });
        }
        if (data.deposits && Array.isArray(data.deposits)) {
          this.deposits = data.deposits.filter((d: any) => !isUserPurged({ uid: d.uid || d.userId, createdAt: d.createdAt }));
        }
        if (data.withdrawals && Array.isArray(data.withdrawals)) {
          this.withdrawals = data.withdrawals.filter((w: any) => !isUserPurged({ uid: w.uid || w.userId, createdAt: w.createdAt }));
        }
        if (data.transactions && Array.isArray(data.transactions)) {
          this.transactions = data.transactions.filter((t: any) => !isUserPurged({ uid: t.uid, createdAt: t.createdAt }));
        }
        if (data.bets && Array.isArray(data.bets)) {
          this.bets = data.bets.filter((b: any) => !isUserPurged({ uid: b.uid || b.userId, createdAt: b.createdAt }));
        }
        if (data.paymentMethods && Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0) {
          this.paymentMethods = data.paymentMethods;
        }
        if (data.adminUpiDetails) {
          this.adminUpiDetails = { ...this.adminUpiDetails, ...data.adminUpiDetails };
        }
        if (data.adminBankDetails) {
          this.adminBankDetails = { ...this.adminBankDetails, ...data.adminBankDetails };
        }
        if (data.withdrawSettings) {
          this.withdrawSettings = { ...this.withdrawSettings, ...data.withdrawSettings };
        }
        if (data.autoResultRules && Array.isArray(data.autoResultRules)) {
          this.autoResultRules = data.autoResultRules;
        }
        if (data.gameAutoModes) {
          this.gameAutoModes = { ...this.gameAutoModes, ...data.gameAutoModes };
        }
        if (data.bonusCommissionSettings) {
          this.bonusCommissionSettings = { ...this.bonusCommissionSettings, ...data.bonusCommissionSettings };
        }
        if (data.depositAmountBonusTiers && Array.isArray(data.depositAmountBonusTiers) && data.depositAmountBonusTiers.length > 0) {
          this.depositAmountBonusTiers = data.depositAmountBonusTiers.map((t: any) => ({
            ...t,
            bonusAmount: Math.min(199, Number(t.bonusAmount || 0)),
          }));
        }
        if (data.bonusTasksConfig && Array.isArray(data.bonusTasksConfig) && data.bonusTasksConfig.length > 0) {
          // If loaded tasks are old ₹500 tasks, use our updated reasonable under-200 tasks
          const hasOldHighRewards = data.bonusTasksConfig.some((t: any) => Number(t.reward || 0) >= 200);
          if (hasOldHighRewards) {
            // Keep default updated tasks
          } else {
            this.bonusTasksConfig = data.bonusTasksConfig.map((t: any) => ({
              ...t,
              reward: Math.min(199, Number(t.reward || 50)),
            }));
          }
        }
        if (data.activityPromosConfig && Array.isArray(data.activityPromosConfig) && data.activityPromosConfig.length > 0) {
          this.activityPromosConfig = data.activityPromosConfig
            .filter((a: any) => a.id !== 'act-streak-jackpot' && a.id !== 'act-daily-cashback')
            .map((a: any) => ({
              ...a,
              rewardValue: Math.min(199, Number(a.rewardValue || 50)),
            }));
        }
        if (data.allGameControls) {
          this.allGameControls = {
            mines: { ...this.allGameControls.mines, ...(data.allGameControls.mines || {}) },
            roulette: { ...this.allGameControls.roulette, ...(data.allGameControls.roulette || {}) },
            aviator: { ...this.allGameControls.aviator, ...(data.allGameControls.aviator || {}) },
            chicken_road: { ...this.allGameControls.chicken_road, ...(data.allGameControls.chicken_road || {}) },
            plinko: { ...this.allGameControls.plinko, ...(data.allGameControls.plinko || {}) },
            seven_up_down: { ...this.allGameControls.seven_up_down, ...(data.allGameControls.seven_up_down || {}) },
            teen_patti: { ...this.allGameControls.teen_patti, ...(data.allGameControls.teen_patti || {}) },
            ludo: { ...this.allGameControls.ludo, ...(data.allGameControls.ludo || {}) },
            chess: { ...this.allGameControls.chess, ...(data.allGameControls.chess || {}) },
          };
        }
        if (data.announcementPopup) {
          this.announcementPopup = { ...this.announcementPopup, ...data.announcementPopup };
        }
        if (data.firstDepositBonusConfig) {
          this.firstDepositBonusConfig = {
            ...this.firstDepositBonusConfig,
            ...data.firstDepositBonusConfig,
            tiers: Array.isArray(data.firstDepositBonusConfig.tiers) && data.firstDepositBonusConfig.tiers.length > 0
              ? data.firstDepositBonusConfig.tiers
              : this.firstDepositBonusConfig.tiers,
          };
        }
        if (data.referralSystemSettings) {
          this.referralSystemSettings = {
            ...this.referralSystemSettings,
            ...data.referralSystemSettings,
            signupBonus: 10,
          };
          if (data.referralSystemSettings.history && Array.isArray(data.referralSystemSettings.history)) {
            this.referralSystemSettings.history = data.referralSystemSettings.history;
          }
        }
        if (data.supportTickets && Array.isArray(data.supportTickets)) {
          this.supportTickets = data.supportTickets;
        }
        if (data.gameCatalog && Array.isArray(data.gameCatalog) && data.gameCatalog.length > 0) {
          this.gameCatalog = data.gameCatalog;
          if (!this.gameCatalog.some((g: any) => g.gameKey === 'ludo' || g.id === 'gc-ludo')) {
            this.gameCatalog.push({
              id: 'gc-ludo',
              gameKey: 'ludo',
              name: 'Ludo Battle Cash',
              category: 'table',
              status: 'active',
              minBet: 10,
              maxBet: 50000,
              durationSeconds: 0,
              totalRoundsPlayed: 450,
              totalBetVolume: 85000,
              rtp: 96.0,
              houseCutPercent: 5.0,
              isLive: true,
            });
          }
        }
        if (data.banners && Array.isArray(data.banners) && data.banners.length > 0) {
          this.banners = data.banners;
        }
        if (data.adminNotifications && Array.isArray(data.adminNotifications)) {
          this.adminNotifications = data.adminNotifications;
        }
        if (data.supportPlatforms && Array.isArray(data.supportPlatforms) && data.supportPlatforms.length > 0) {
          this.supportPlatforms = data.supportPlatforms;
        }
        if (data.maintenanceConfig) {
          this.maintenanceConfig = { ...this.maintenanceConfig, ...data.maintenanceConfig };
        }
        if (data.adminStaff && Array.isArray(data.adminStaff) && data.adminStaff.length > 0) {
          this.adminStaff = data.adminStaff;
        }
        if (data.bigSmallSessions && Array.isArray(data.bigSmallSessions) && data.bigSmallSessions.length > 0) {
          this.bigSmallSessions = data.bigSmallSessions;
        }
        if (data.giftCodes && Array.isArray(data.giftCodes) && data.giftCodes.length > 0) {
          this.giftCodes = data.giftCodes;
        }
        if (data.referralDepositCommissions && Array.isArray(data.referralDepositCommissions)) {
          this.referralDepositCommissions = data.referralDepositCommissions;
        }
        if (data.platformSettings) {
          this.platformSettings = { ...this.platformSettings, ...data.platformSettings };
          this.platformSettings.minDepositToBet = data.platformSettings.minDepositToBet !== undefined
            ? Number(data.platformSettings.minDepositToBet)
            : 100;
        }
        if (data.platformGameSettings) {
          this.platformGameSettings = { ...this.platformGameSettings, ...data.platformGameSettings };
        }
        if (data.googleSheetDeposits && Array.isArray(data.googleSheetDeposits) && data.googleSheetDeposits.length > 0) {
          this.googleSheetDeposits = data.googleSheetDeposits;
        }
        if (data.googleSheetWithdrawals && Array.isArray(data.googleSheetWithdrawals) && data.googleSheetWithdrawals.length > 0) {
          this.googleSheetWithdrawals = data.googleSheetWithdrawals;
        }
        if (data.adminBankAccounts && Array.isArray(data.adminBankAccounts) && data.adminBankAccounts.length > 0) {
          this.adminBankAccounts = data.adminBankAccounts;
        }
        if (data.googleSheetPlatforms && Array.isArray(data.googleSheetPlatforms) && data.googleSheetPlatforms.length > 0) {
          this.googleSheetPlatforms = data.googleSheetPlatforms;
        }
        if (data.googleSheetDepositSeq) {
          this.googleSheetDepositSeq = Number(data.googleSheetDepositSeq);
        }
        if (data.googleSheetWithdrawSeq) {
          this.googleSheetWithdrawSeq = Number(data.googleSheetWithdrawSeq);
        }
        if (data.googleSheetWebhookUrl !== undefined) {
          this.googleSheetWebhookUrl = String(data.googleSheetWebhookUrl);
        }
        if (data.periodCounters && typeof data.periodCounters === 'object') {
          this.periodCounters = { ...this.periodCounters, ...data.periodCounters };
        }
        if (data.resultsHistory && Array.isArray(data.resultsHistory) && data.resultsHistory.length > 0) {
          this.resultsHistory = new Map(data.resultsHistory);
        }
        if (data.currentPeriods && Array.isArray(data.currentPeriods) && data.currentPeriods.length > 0) {
          const now = Date.now();
          const validActivePeriods = new Map<GameType, GamePeriod>();
          for (const [gt, p] of data.currentPeriods) {
            if (p && typeof p.endTime === 'number' && p.endTime > now && p.status !== 'completed') {
              validActivePeriods.set(gt as GameType, p);
            }
          }
          if (validActivePeriods.size > 0) {
            this.currentPeriods = validActivePeriods;
          }
        }
        // Ensure all loaded users have strictly reconciled turnover, bet totals, and 1X rolling
        for (const user of this.users.values()) {
          this.syncUserTurnover(user);
        }
        // Ensure every game mode has at least 150 historical rounds for rich display
        this.seedHistoricalResults();
        console.log(`Database loaded successfully from disk. Total real users: ${this.users.size}`);
        this.saveToDisk();
      } else {
        this.seedHistoricalResults();
        this.saveToDisk();
      }
    } catch (e) {
      console.error('Error loading database from disk:', e);
      this.seedHistoricalResults();
    }
  }

  public recordTransaction(tx: any) {
    if (!tx) return;
    this.transactions.unshift(tx);
    saveTransactionPermanently(tx).catch(() => {});
    this.saveToDisk();
  }

  private seedInitialData() {
    // 1. Admin Users
    const admins: AdminUser[] = [
      {
        id: 'admin-01',
        username: 'SuperAdmin',
        email: 'admin@wingo.pro',
        role: 'super_admin',
        status: 'active',
        permissions: {
          users: true,
          payments: true,
          games: true,
          resultControl: true,
          reports: true,
          promotions: true,
          system: true,
        },
        lastLogin: new Date().toISOString(),
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'admin-02',
        username: 'ManagerRaj',
        email: 'manager@wingo.pro',
        role: 'manager',
        status: 'active',
        permissions: {
          users: true,
          payments: true,
          games: false,
          resultControl: false,
          reports: true,
          promotions: false,
          system: false,
        },
        lastLogin: new Date(Date.now() - 3600000).toISOString(),
        createdAt: '2026-01-15T00:00:00.000Z',
      },
      {
        id: 'admin-03',
        username: 'OperatorVikram',
        email: 'operator@wingo.pro',
        role: 'operator',
        status: 'active',
        permissions: {
          users: true,
          payments: false,
          games: true,
          resultControl: false,
          reports: false,
          promotions: false,
          system: false,
        },
        lastLogin: new Date(Date.now() - 7200000).toISOString(),
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ];
    admins.forEach(a => this.adminUsers.set(a.id, a));

    // 2. Initial Users - Users are persistent across restarts and retained permanently

    // 3. VIP Levels
    this.vipLevels = [
      { level: 0, name: 'VIP 0 - Newbie', requiredExp: 0, requiredTurnover: 0, reward: 0, monthlyReward: 0, rebatePercentage: 0.1, benefits: ['Standard support', 'Daily check-in'], status: 'active' },
      { level: 1, name: 'VIP 1 - Bronze', requiredExp: 300, requiredTurnover: 3000, reward: 10, monthlyReward: 20, rebatePercentage: 0.2, benefits: ['Priority withdrawal', '1% deposit bonus'], status: 'active' },
      { level: 2, name: 'VIP 2 - Silver', requiredExp: 800, requiredTurnover: 8000, reward: 30, monthlyReward: 50, rebatePercentage: 0.3, benefits: ['Fast track withdrawal', '2% deposit bonus'], status: 'active' },
      { level: 3, name: 'VIP 3 - Gold', requiredExp: 2000, requiredTurnover: 20000, reward: 80, monthlyReward: 120, rebatePercentage: 0.4, benefits: ['Exclusive promotions', 'Personal assistant'], status: 'active' },
      { level: 4, name: 'VIP 4 - Platinum', requiredExp: 5000, requiredTurnover: 50000, reward: 200, monthlyReward: 300, rebatePercentage: 0.5, benefits: ['Higher withdrawal limits', 'Birthday reward ₹500'], status: 'active' },
      { level: 5, name: 'VIP 5 - Diamond', requiredExp: 15000, requiredTurnover: 150000, reward: 600, monthlyReward: 800, rebatePercentage: 0.6, benefits: ['Dedicated VIP manager', 'Instant approvals'], status: 'active' },
      { level: 6, name: 'VIP 6 - Master', requiredExp: 40000, requiredTurnover: 400000, reward: 1500, monthlyReward: 2000, rebatePercentage: 0.75, benefits: ['Custom cashback rates', 'Luxury gift hampers'], status: 'active' },
      { level: 7, name: 'VIP 7 - Grandmaster', requiredExp: 100000, requiredTurnover: 1000000, reward: 4000, monthlyReward: 5000, rebatePercentage: 0.9, benefits: ['Unlimited instant withdrawal', 'VIP offline events'], status: 'active' },
    ];

    // 4. Game Settings
    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];
    const durations = { wingo_30s: 30, wingo_1m: 60, wingo_3m: 180, wingo_5m: 300 };
    const names = { wingo_30s: 'Win Go 30s', wingo_1m: 'Win Go 1Min', wingo_3m: 'Win Go 3Min', wingo_5m: 'Win Go 5Min' };

    gameTypes.forEach(gt => {
      this.gameSettings.set(gt, {
        gameType: gt,
        name: names[gt],
        enabled: true,
        durationSeconds: durations[gt],
        bettingCloseSeconds: 5,
        minBet: 1,
        maxBet: 50000,
        maxPayoutMultiplier: 9,
        availableNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        availableColors: ['green', 'red', 'violet'],
        availableBigSmall: true,
      });
      this.resultsHistory.set(gt, []);
    });

    // 5. Seed Historical Results
    this.seedHistoricalResults();

    // 6. Deposits & Withdrawals - Clean slate
    this.deposits = [];
    this.withdrawals = [];
    this.transactions = [];
    this.bets = [];
    this.supportTickets = [];

    // 8. Seed Promotions
    this.promotions = [
      {
        id: 'promo-01',
        title: 'First Deposit 100% Bonus',
        bannerUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
        description: 'Get 100% extra on your first recharge up to ₹5,000! Valid for all new users.',
        rewardAmount: 5000,
        type: 'bonus',
        status: 'active',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        displayOrder: 1,
      },
      {
        id: 'promo-02',
        title: 'VIP Level Up Carnival',
        bannerUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
        description: 'Level up your VIP tier and claim up to ₹1,00,000 in direct cash bonuses + daily rebates.',
        rewardAmount: 100000,
        type: 'vip',
        status: 'active',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        displayOrder: 2,
      },
      {
        id: 'promo-03',
        title: 'Invite Friends & Earn Referral Commission',
        bannerUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
        description: 'Earn instant referral bonuses and deposit commissions whenever your referred players join and recharge.',
        type: 'referral',
        status: 'active',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        displayOrder: 3,
      }
    ];

    // 9. Seed Activity Logs
    this.activityLogs = [
      {
        id: 'log-001',
        adminId: 'admin-01',
        adminUsername: 'SuperAdmin',
        action: 'Approve Deposit',
        targetUid: '108429',
        details: 'Approved ₹2,000 deposit with UTR 422384910283',
        previousValue: 'Status: Pending',
        newValue: 'Status: Approved',
        ip: '127.0.0.1',
        createdAt: '2026-08-22T08:35:00.000Z',
      },
      {
        id: 'log-002',
        adminId: 'admin-01',
        adminUsername: 'SuperAdmin',
        action: 'Approve Withdrawal',
        targetUid: '109552',
        details: 'Approved ₹3,500 withdrawal to Rohit Verma (HDFC)',
        previousValue: 'Status: Pending',
        newValue: 'Status: Approved',
        ip: '127.0.0.1',
        createdAt: '2026-08-22T09:12:00.000Z',
      },
      {
        id: 'log-003',
        adminId: 'admin-01',
        adminUsername: 'SuperAdmin',
        action: 'Block User',
        targetUid: '112890',
        details: 'Blocked suspicious multi-accounting user SuspiciousBot07',
        previousValue: 'Status: Active',
        newValue: 'Status: Blocked',
        ip: '127.0.0.1',
        createdAt: '2026-08-22T10:00:00.000Z',
      }
    ];
  }

  public seedHistoricalResults() {
    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];
    const durations: Record<GameType, number> = { wingo_30s: 30, wingo_1m: 60, wingo_3m: 180, wingo_5m: 300 };
    const now = Date.now();
    const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');

    gameTypes.forEach((gt) => {
      let current = this.resultsHistory.get(gt) || [];
      const duration = durations[gt];
      const baseSeq = (this.periodCounters && this.periodCounters[gt]) ? this.periodCounters[gt] : 10500;

      if (current.length < 150) {
        const needed = 150 - current.length;
        const newHistory: GamePeriod[] = [...current];
        const existingIds = new Set(current.map((p) => p.periodId));

        let startSeq = baseSeq - current.length - 1;
        if (startSeq < 1000) startSeq = 10000;

        for (let i = 0; i < needed; i++) {
          const targetSeq = startSeq - i;
          const pid = `${dateStr}${String(targetSeq).padStart(5, '0')}`;
          if (existingIds.has(pid)) continue;

          // Pseudo-random deterministic distribution for numbers 0-9
          const seed = (targetSeq * 9301 + 49297 + duration) % 233280;
          const num = Math.floor((seed / 233280) * 10);

          let color: ColorResult = 'red';
          if (num === 0) color = 'red_violet';
          else if (num === 5) color = 'green_violet';
          else if ([1, 3, 7, 9].includes(num)) color = 'green';
          else color = 'red';

          const bigSmall: BigSmallResult = num >= 5 ? 'big' : 'small';
          const roundEndTime = now - ((current.length + i + 1) * duration * 1000);
          const roundStartTime = roundEndTime - (duration * 1000);

          const simBetsCount = 14 + (targetSeq % 31);
          const simBetAmount = 2400 + (targetSeq % 23) * 650;
          const simPayout = Math.floor(simBetAmount * 0.88);

          newHistory.push({
            periodId: pid,
            gameType: gt,
            durationSeconds: duration,
            startTime: roundStartTime,
            endTime: roundEndTime,
            lockTime: roundEndTime - 5000,
            status: 'completed',
            resultNumber: num,
            resultColor: color,
            resultBigSmall: bigSmall,
            totalBetsCount: simBetsCount,
            totalBetAmount: simBetAmount,
            totalPotentialPayout: simPayout,
            completedAt: new Date(roundEndTime).toISOString(),
          });
          existingIds.add(pid);
        }

        // Sort descending by periodId (newest first)
        newHistory.sort((a, b) => b.periodId.localeCompare(a.periodId));
        this.resultsHistory.set(gt, newHistory);
      }
    });
  }

  getDashboardStats(filterDate?: string): any {
    const userMap = new Map<string, User>();
    for (const u of this.users.values()) {
      if (u && u.uid) {
        userMap.set(u.uid, u);
      }
    }
    const uniqueUsers = Array.from(userMap.values());
    const totalUsers = uniqueUsers.length;
    const activeUsers = uniqueUsers.filter(u => u.status === 'active').length;
    
    const targetDateStr = filterDate || new Date().toISOString().slice(0, 10);
    const targetMonthStr = targetDateStr.slice(0, 7);

    // Lifetime totals (user deposits + admin manual deposits + adjustments)
    let totalDeposits = 0;
    let pendingDeposits = 0;
    let approvedDeposits = 0;

    this.deposits.forEach(d => {
      if (d.status === 'approved') {
        totalDeposits += d.amount;
        approvedDeposits += d.amount;
      } else if (d.status === 'pending') {
        pendingDeposits += d.amount;
      }
    });

    (this.transactions || []).forEach(t => {
      if (t.type === 'adjustment' && t.amount > 0) {
        totalDeposits += t.amount;
        approvedDeposits += t.amount;
      }
    });

    let totalWithdrawals = 0;
    let pendingWithdrawals = 0;

    this.withdrawals.forEach(w => {
      if (w.status === 'approved' || w.status === 'completed') totalWithdrawals += w.amount;
      else if (w.status === 'pending') pendingWithdrawals += w.amount;
    });

    (this.transactions || []).forEach(t => {
      if (t.type === 'adjustment' && t.amount < 0) {
        totalWithdrawals += Math.abs(t.amount);
      }
    });

    let totalBets = this.bets.length;
    let totalBettingAmount = 0;
    let totalWinningAmount = 0;

    this.bets.forEach(b => {
      totalBettingAmount += b.totalAmount || 0;
      if (b.status === 'won') totalWinningAmount += b.winAmount || 0;
    });

    // Filter by selected date (Approved client deposits + Admin manual deposits + Manual credit adjustments)
    const approvedDepositsOnDate = this.deposits.filter(d => 
      d && d.status === 'approved' && ((d.createdAt || '').startsWith(targetDateStr) || (d.updatedAt || '').startsWith(targetDateStr))
    );
    const existingDepositIds = new Set(approvedDepositsOnDate.map(d => d.id));
    const manualCreditTxOnDate = (this.transactions || []).filter(t => 
      t && (t.createdAt || '').startsWith(targetDateStr) && (
        (t.type === 'adjustment' && Number(t.amount || 0) > 0) ||
        (t.type === 'deposit' && t.status === 'completed' && (!t.reference || !existingDepositIds.has(t.reference)))
      )
    );
    const selectedDateDeposits = approvedDepositsOnDate.reduce((sum, d) => sum + Number(d.amount || 0), 0) +
      manualCreditTxOnDate.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const approvedWithdrawalsOnDate = this.withdrawals.filter(w => 
      w && (w.status === 'approved' || w.status === 'completed') && ((w.createdAt || '').startsWith(targetDateStr) || (w.updatedAt || '').startsWith(targetDateStr))
    );
    const existingWithdrawalIds = new Set(approvedWithdrawalsOnDate.map(w => w.id));
    const manualDebitTxOnDate = (this.transactions || []).filter(t => 
      t && (t.createdAt || '').startsWith(targetDateStr) && (
        (t.type === 'adjustment' && Number(t.amount || 0) < 0) ||
        (t.type === 'withdrawal' && (t.status === 'approved' || t.status === 'completed') && (!t.reference || !existingWithdrawalIds.has(t.reference)))
      )
    );
    const selectedDateWithdrawals = approvedWithdrawalsOnDate.reduce((sum, w) => sum + Number(w.amount || 0), 0) +
      manualDebitTxOnDate.reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

    const selectedDateBets = this.bets
      .filter(b => (b.createdAt || '').startsWith(targetDateStr));

    const selectedDateBetAmount = selectedDateBets.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const selectedDateWinAmount = selectedDateBets.filter(b => b.status === 'won').reduce((sum, b) => sum + (b.winAmount || 0), 0);
    const selectedDateProfitLoss = selectedDateBetAmount - selectedDateWinAmount;

    // Monthly totals (current or selected month)
    const approvedDepositsInMonth = this.deposits.filter(d => 
      d && d.status === 'approved' && ((d.createdAt || '').startsWith(targetMonthStr) || (d.updatedAt || '').startsWith(targetMonthStr))
    );
    const existingDepositIdsMonth = new Set(approvedDepositsInMonth.map(d => d.id));
    const manualCreditTxInMonth = (this.transactions || []).filter(t => 
      t && (t.createdAt || '').startsWith(targetMonthStr) && (
        (t.type === 'adjustment' && Number(t.amount || 0) > 0) ||
        (t.type === 'deposit' && t.status === 'completed' && (!t.reference || !existingDepositIdsMonth.has(t.reference)))
      )
    );
    const monthlyDeposits = approvedDepositsInMonth.reduce((sum, d) => sum + Number(d.amount || 0), 0) +
      manualCreditTxInMonth.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const approvedWithdrawalsInMonth = this.withdrawals.filter(w => 
      w && (w.status === 'approved' || w.status === 'completed') && ((w.createdAt || '').startsWith(targetMonthStr) || (w.updatedAt || '').startsWith(targetMonthStr))
    );
    const existingWithdrawalIdsMonth = new Set(approvedWithdrawalsInMonth.map(w => w.id));
    const manualDebitTxInMonth = (this.transactions || []).filter(t => 
      t && (t.createdAt || '').startsWith(targetMonthStr) && (
        (t.type === 'adjustment' && Number(t.amount || 0) < 0) ||
        (t.type === 'withdrawal' && (t.status === 'approved' || t.status === 'completed') && (!t.reference || !existingWithdrawalIdsMonth.has(t.reference)))
      )
    );
    const monthlyWithdrawals = approvedWithdrawalsInMonth.reduce((sum, w) => sum + Number(w.amount || 0), 0) +
      manualDebitTxInMonth.reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

    const monthlyBets = this.bets.filter(b => (b.createdAt || '').startsWith(targetMonthStr));
    const monthlyBetAmount = monthlyBets.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const monthlyWinAmount = monthlyBets.filter(b => b.status === 'won').reduce((sum, b) => sum + (b.winAmount || 0), 0);
    const monthlyProfitLoss = monthlyBetAmount - monthlyWinAmount;

    const activePeriodStats = Array.from(this.currentPeriods.entries()).map(([gt, p]) => {
      const now = Date.now();
      const remainingMs = Math.max(0, p.endTime - now);
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      return {
        gameType: gt,
        periodId: p.periodId,
        totalBets: p.totalBetsCount,
        totalAmount: p.totalBetAmount,
        remainingSeconds,
        isLocked: remainingSeconds <= 5,
      };
    });

    const newUsersOnDate = uniqueUsers.filter(u => (u.registrationDate || '').startsWith(targetDateStr)).length;
    const newUsersInMonth = uniqueUsers.filter(u => (u.registrationDate || '').startsWith(targetMonthStr)).length;

    const dailyPnlAmount = selectedDateDeposits - selectedDateWithdrawals;
    const monthlyPnlAmount = monthlyDeposits - monthlyWithdrawals;

    const pendingDepositsOnDate = (this.deposits || []).filter(d => d && d.status === 'pending' && (d.createdAt || '').startsWith(targetDateStr));
    const dailyPendingDepositAmount = pendingDepositsOnDate.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const dailyPendingDepositCount = pendingDepositsOnDate.length;

    return {
      totalUsers,
      activeUsers,
      totalDeposits,
      pendingDeposits,
      approvedDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      totalBets,
      totalBettingAmount,
      totalWinningAmount,
      todayTurnover: selectedDateBetAmount,
      todayProfitLoss: selectedDateProfitLoss,
      todayDeposits: selectedDateDeposits,
      todayWithdrawals: selectedDateWithdrawals,
      monthlyDeposits,
      monthlyWithdrawals,
      monthlyProfitLoss,
      selectedDate: targetDateStr,
      todayNewUsers: newUsersOnDate,
      activePeriodStats,

      // 5 Daily Dashboard Cards
      daily: {
        totalUsers,
        newUsersOnDate,
        newUsersBadge: `+${newUsersOnDate} New Today`,
        depositAmount: selectedDateDeposits,
        depositCount: approvedDepositsOnDate.length + manualCreditTxOnDate.length,
        pendingDepositAmount: dailyPendingDepositAmount,
        pendingDepositCount: dailyPendingDepositCount,
        allDepositsAmount: selectedDateDeposits + dailyPendingDepositAmount,
        allDepositsCount: approvedDepositsOnDate.length + manualCreditTxOnDate.length + dailyPendingDepositCount,
        withdrawalAmount: selectedDateWithdrawals,
        withdrawalCount: approvedWithdrawalsOnDate.length + manualDebitTxOnDate.length,
        pnl: dailyPnlAmount,
        isProfit: dailyPnlAmount >= 0,
        betsCount: selectedDateBets.length,
        turnover: selectedDateBetAmount,
      },

      // 5 Monthly Overview Cards
      monthly: {
        newUsersInMonth,
        totalUsers,
        depositAmount: monthlyDeposits,
        depositCount: approvedDepositsInMonth.length + manualCreditTxInMonth.length,
        withdrawalAmount: monthlyWithdrawals,
        withdrawalCount: approvedWithdrawalsInMonth.length + manualDebitTxInMonth.length,
        pnl: monthlyPnlAmount,
        isProfit: monthlyPnlAmount >= 0,
        betsCount: monthlyBets.length,
        turnover: monthlyBetAmount,
      },
    };
  }
}

export const db = new WingoDatabase();
