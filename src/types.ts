export type GameType = 'wingo_30s' | 'wingo_1m' | 'wingo_3m' | 'wingo_5m';

export type UserRole = 'user';
export type AdminRole = 'super_admin' | 'finance_admin' | 'game_admin' | 'support_admin' | 'viewer' | 'admin' | 'manager' | 'operator';

export type AdminTabType =
  | 'dashboard'
  | 'game_control'
  | 'game_winning_cut'
  | 'prediction_chat'
  | 'gift_codes'
  | 'game_management'
  | 'users_management'
  | 'vip_bonus_management'
  | 'user_details_view'
  | 'bets_management'
  | 'deposit_requests'
  | 'withdrawal_requests'
  | 'payment_methods'
  | 'transactions'
  | 'result_management'
  | 'reports_analytics'
  | 'referral_management'
  | 'notification'
  | 'banner_management'
  | 'support_links'
  | 'support_desk'
  | 'settings'
  | 'admin_management'
  | 'maintenance_mode';

// ==================== BIG / SMALL CHAT PREDICTION TYPES ====================
export interface BigSmallPredictionRound {
  round: number; // 1 to 10
  targetPeriod?: string; // e.g. "2026083113150"
  previousLastDigit?: number; // 0 to 9
  prediction: 'BIG' | 'SMALL'; // BIG (5-9) or SMALL (0-4)
  color?: 'GREEN' | 'RED' | 'VIOLET'; // Green, Red, Violet
  numbers?: string; // e.g. "5, 7, 9"
  message: string; // e.g. "Big chance", "Big confirmed"
  accuracy?: 'win' | 'miss'; // Win (Correct) or Miss (Wrong)
}

export interface BigSmallPredictionSession {
  id: string;
  sessionName: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm or hh:mm A
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm or hh:mm A
  targetGame?: string; // e.g. "wingo_30s" or "Win Go 30s"
  referenceStartingPeriod?: string; // e.g. "2026083113149"
  status: 'active' | 'inactive';
  totalRounds: number; // 10
  autoStart: boolean; // ON / OFF
  autoContinue: boolean; // ON / OFF
  rounds: BigSmallPredictionRound[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPredictionDisplay {
  lastPeriodNumber: string;
  targetPeriod?: string;
  lastDigit: number;
  prediction: 'BIG' | 'SMALL';
  color?: 'GREEN' | 'RED' | 'VIOLET';
  numbers?: string;
  predictionTime: string;
  sessionTime: string;
  sessionName?: string;
  round?: number;
  totalRounds?: number;
  message?: string;
  isActive: boolean;
  accuracyStats?: {
    correct: number;
    wrong: number;
  };
}

// ==================== GIFT CODE TYPES ====================
export interface GiftClaimRecord {
  userId: string;
  username: string;
  userPhone?: string;
  amount: number;
  claimedAt: string;
  ip?: string;
}

export interface GiftCode {
  id: string;
  code: string;
  title: string;
  rewardAmount: number;
  totalLimit: number; // 0 = unlimited
  usedCount: number;
  claimedUsers: GiftClaimRecord[];
  minVipLevel?: number;
  minTotalDeposit?: number;
  expiresAt?: string | null;
  status: 'active' | 'inactive' | 'expired' | 'exhausted';
  createdAt: string;
  createdBy?: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type?: 'maintenance' | 'offer' | 'promo' | 'system' | string;
  audience?: 'all_users' | 'active_users' | 'specific_user' | string;
  targetType?: 'all' | 'selected' | 'specific' | 'game';
  targetUid?: string;
  targetGame?: string;
  imageUrl?: string;
  scheduledTime?: string;
  status: 'sent' | 'scheduled' | 'draft' | string;
  sentAt?: string;
  createdAt: string;
  createdBy?: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl: string;
  buttonText?: string;
  buttonLink?: string;
  actionUrl?: string;
  isActive?: boolean;
  status?: 'active' | 'inactive';
  position: 'top' | 'middle' | 'bottom' | number | any;
  priority?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface SupportPlatformLink {
  id: string;
  platform: string;
  name?: string;
  link?: string;
  url?: string;
  icon?: string;
  iconKey?: string;
  isActive?: boolean;
  status?: 'active' | 'inactive';
  description?: string;
  copyText?: string;
  updatedAt?: string;
}

export interface MaintenanceConfig {
  isEnabled?: boolean;
  enabled?: boolean;
  title: string;
  message: string;
  imageUrl?: string;
  bannerUrl?: string;
  startTime?: string;
  endTime?: string;
  history?: {
    id: string;
    enabledBy: string;
    startTime: string;
    endTime?: string;
    reason: string;
  }[];
}

export interface AdminStaffUser {
  id: string;
  username: string;
  name?: string;
  email: string;
  role: 'super_admin' | 'finance_admin' | 'game_admin' | 'support_admin' | 'viewer' | 'admin' | 'manager' | 'operator';
  status: 'active' | 'inactive' | 'blocked';
  lastLogin?: string;
  createdAt?: string;
  password?: string;
}

export interface Transaction {
  id: string;
  userId?: string;
  uid?: string;
  type: string;
  amount: number;
  description?: string;
  status: string;
  createdAt: string;
  referenceId?: string;
  method?: string;
}

export interface AdminUserSummary {
  id: string;
  uid: string;
  username: string;
  phone: string;
  email?: string;
  walletBalance: number;
  totalDeposit: number;
  totalWithdrawal: number;
  totalBet: number;
  totalWin: number;
  status: UserStatus;
  registrationDate: string;
  lastLogin: string;
  requiredTurnover?: number;
  completedTurnover?: number;
  remainingTurnover?: number;
  rolloverProgress?: number;
  isRolloverCompleted?: boolean;
}

export interface GameCatalogItem {
  id: string;
  gameKey: string;
  name: string;
  category: 'prediction' | 'casino' | 'crash' | 'table' | 'instant';
  status: 'active' | 'inactive';
  minBet: number;
  maxBet: number;
  durationSeconds?: number;
  totalRoundsPlayed?: number;
  totalBetVolume?: number;
  rtp?: number;
  houseCutPercent?: number;
  isLive?: boolean;
}

export type UserStatus = 'active' | 'blocked';
export type AdminStatus = 'active' | 'blocked';

export interface BankAccount {
  id: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId?: string;
  isDefault?: boolean;
  addedAt?: string;
}

export interface User {
  id: string;
  uid: string;
  username: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  walletBalance: number;
  totalDeposit: number;
  totalWithdrawal: number;
  totalBet: number;
  totalWin: number;
  totalLoss: number;
  vipLevel: number;
  vipExp: number;
  referralCode: string;
  referredBy?: string;
  status: UserStatus;
  password?: string;
  currentTurnover?: number;
  requiredTurnover?: number;
  completedTurnover?: number;
  remainingTurnover?: number;
  registrationDate: string;
  lastLogin: string;
  lastLoginIp?: string;
  bankAccounts?: BankAccount[];
  activeSessionId?: string | null;
  activeSessionDevice?: string;
  activeSessionTime?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  permissions: {
    users: boolean;
    payments: boolean;
    games: boolean;
    resultControl: boolean;
    reports: boolean;
    promotions: boolean;
    system: boolean;
  };
  lastLogin: string;
  createdAt: string;
}

export type ColorResult = 'green' | 'red' | 'violet' | 'red_violet' | 'green_violet';
export type BigSmallResult = 'big' | 'small';

export interface GamePeriod {
  id?: string;
  periodId: string;
  gameType: GameType;
  durationSeconds: number;
  startTime: number;
  endTime: number;
  lockTime: number;
  status: 'betting_open' | 'betting_locked' | 'calculating' | 'completed';
  resultNumber?: number | null;
  resultColor?: ColorResult;
  resultBigSmall?: BigSmallResult;
  manualResultNumber?: number | null;
  totalBetsCount: number;
  totalBetAmount: number;
  totalPotentialPayout: number;
  completedAt?: string;
  isManual?: boolean;
  totalWinAmount?: number;
}

export type BetType = 'color' | 'number' | 'big_small';
export type BetSelection = string | number;

export interface Bet {
  id: string;
  orderNumber?: string;
  periodId: string;
  gameType: GameType;
  uid: string;
  username: string;
  betType: BetType;
  selection: BetSelection;
  amount: number;
  multiplier: number;
  totalAmount: number;
  amountAfterTax?: number;
  taxAmount?: number;
  winAmount: number;
  resultNumber?: number;
  resultColor?: ColorResult;
  resultBigSmall?: BigSmallResult;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  createdAt: string;
}

export interface PlatformSettings {
  siteName: string;
  logoUrl?: string;
  supportTelegram: string;
  supportWhatsapp: string;
  marqueeNotice: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  dailyWithdrawalLimit: number;
  winningTaxPercent: number;
  depositTurnoverMultiplier: number;
  upiId: string;
  qrCodeUrl: string;
}

export interface PaymentMethodItem {
  id: string;
  type: 'qr' | 'bank';
  name: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  minAmount: number;
  maxAmount: number;
  isActive: boolean;
  createdAt: string;
}

export interface WithdrawSettings {
  startTime?: string;
  endTime?: string;
  dailyLimitCount?: number;
  processingFeePercent?: number;
  minAmount: number;
  maxAmount: number;
  rollingRequirement?: number;
  customRequiredTurnover?: number;
  noticeMessage?: string;
  minBetTurnoverPercent?: number;
  withdrawStartTime?: string;
  withdrawEndTime?: string;
  instantPayoutEnabled?: boolean;
}

export interface AutoResultRule {
  id: string;
  maxAmount: number | 'infinity';
  mode: 'house_best' | '50_percent' | '75_percent' | '25_percent' | '100_percent' | 'fair';
}

export interface GameControlRow {
  gameType: GameType;
  name: string;
  periodId: string;
  remainingSeconds: number;
  formattedTime: string;
  playersCount: number;
  totalBetAmount: number;
  houseBest: { number: number; payout: number; profitDiff: number };
  target75: { number: number; payout: number; profitDiff: number };
  target50: { number: number; payout: number; profitDiff: number };
  target25: { number: number; payout: number; profitDiff: number };
  target100: { number: number; payout: number; profitDiff: number };
  autoMode: string;
  manualLockedNumber: number | null;
  isLocked: boolean;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  uid: string;
  username: string;
  sender: 'user' | 'admin' | 'system' | 'ai';
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  fileName?: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  uid: string;
  username: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCountByAdmin: number;
  unreadCountByUser: number;
  status: 'open' | 'closed';
  isAiHandled?: boolean;
  escalatedToAdmin?: boolean;
  messages: SupportMessage[];
  createdAt: string;
}

export interface BonusCommissionSettings {
  depositBonusPercent: number;
  winningDeductionPercent: number;
  firstDepositBonusPercent: number;
  gameWinningDeductions?: Record<string, number>;
}

export interface BonusTaskConfig {
  id: string;
  title: string;
  reward: number;
  badge: string;
  badgeColor?: string;
  desc: string;
  actionLabel?: string;
  targetType: 'deposit' | 'invite' | 'turnover' | 'vip' | 'rounds' | 'custom';
  targetValue: number;
  isActive: boolean;
}

export interface ActivityPromoConfig {
  id: string;
  title: string;
  rewardText: string;
  rewardValue?: number;
  tag: string;
  tagColor?: string;
  desc: string;
  rules: string;
  badge?: string;
  targetType?: 'checkin' | 'first_deposit' | 'streak' | 'cashback' | 'custom';
  extraSettings?: {
    dailyCheckinRewards?: number[];
    matchPercent?: number;
    minDeposit?: number;
    streakCount?: number;
    streakMinBet?: number;
    cashbackPercent?: number;
  };
  isActive: boolean;
}

export interface ReferralSystemSettings {
  signupBonus: number;
  referralInviteBonus: number;
  depositCommissionPercent: number;
}

export interface PlatformSettings {
  siteName: string;
  merchantUpiId?: string;
  merchantName?: string;
  whatsappSupport: string;
  whatsappLink?: string;
  whatsappGroup?: string;
  telegramSupport: string;
  telegramChannel?: string;
  supportHelplineTitle?: string;
  supportBannerText?: string;
  isWhatsappActive?: boolean;
  isTelegramActive?: boolean;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  dailyWithdrawalLimit: number;
  winningTaxPercent: number;
  depositTurnoverMultiplier: number;
  maintenanceMode: boolean;
}

export interface DepositRequest {
  id: string;
  uid: string;
  userId?: string;
  username: string;
  name?: string;
  amount: number;
  paymentMethod?: string;
  type?: string;
  utrReference?: string;
  utrNumber?: string;
  proofRef?: string;
  screenshotUrl?: string;
  userNote?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  adminNote?: string;
  processedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  uid: string;
  userId?: string;
  username: string;
  name?: string;
  amount: number;
  paymentMethod?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankUpiDetails?: {
    accountHolder: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
    mobile?: string;
  };
  userNote?: string;
  note?: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | string;
  adminNote?: string;
  processedBy?: string;
  createdAt: string;
  updatedAt?: string;
  requiredTurnover?: number;
  completedTurnover?: number;
  remainingTurnover?: number;
  rolloverProgress?: number;
  isRolloverCompleted?: boolean;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund' | 'bonus' | 'adjustment' | 'referral_commission' | 'referral_bonus';

export interface WalletTransaction {
  id: string;
  uid: string;
  type: TransactionType;
  amount: number;
  grossAmount?: number;
  gstPercent?: number;
  gstAmount?: number;
  status?: 'pending' | 'completed' | 'approved' | 'rejected' | 'failed';
  previousBalance: number;
  newBalance: number;
  reference: string;
  description?: string;
  gameType?: string;
  utrReference?: string;
  paymentMethod?: string;
  createdBy: string;
  userNote?: string;
  adminNote?: string;
  note?: string;
  createdAt: string;
}

export interface VIPLevel {
  level: number;
  name: string;
  requiredExp: number;
  requiredTurnover: number;
  reward: number;
  levelUpBonus?: number;
  monthlyReward: number;
  rebatePercentage: number;
  rebateRate?: number;
  dailyWithdrawalLimit?: number;
  benefits: string[];
  status: 'active' | 'inactive';
}

export interface ReferralRecord {
  uid: string;
  username: string;
  code?: string;
  referralCode?: string;
  referrerUid?: string;
  totalInvites?: number;
  referredCount?: number;
  teamTurnover: number;
  commissionEarned?: number;
  totalCommissionEarned?: number;
  directCommissionRate?: number;
  tier1Commission?: number;
  tier2Commission?: number;
  tier3Commission?: number;
  status?: string;
  date?: string;
  createdAt?: string;
}

export interface Promotion {
  id: string;
  title: string;
  imageUrl?: string;
  bannerUrl?: string;
  linkUrl?: string;
  description?: string;
  rewardAmount?: number;
  type?: 'bonus' | 'vip' | 'referral' | 'cashback' | 'banner';
  status: 'active' | 'inactive';
  startDate?: string;
  endDate?: string;
  displayOrder?: number;
}

export interface GameSetting {
  gameType: GameType;
  name: string;
  enabled: boolean;
  durationSeconds: number;
  bettingCloseSeconds: number;
  minBet: number;
  maxBet: number;
  maxPayoutMultiplier: number;
  availableNumbers: number[];
  availableColors: string[];
  availableBigSmall: boolean;
}

export interface GameSettings {
  minBetAmount: number;
  maxBetAmount: number;
  numberMultiplier: number;
  colorMultiplier: number;
  violetMultiplier: number;
  bigSmallMultiplier: number;
  dualColorMultiplier: number;
  feePercentage: number;
  resultMode: 'auto' | 'manual';
  countdown30s: number;
  countdown1m: number;
  countdown3m: number;
  countdown5m: number;
}

export interface AdminActivityLog {
  id: string;
  adminId?: string;
  adminUsername: string;
  action: string;
  target?: string;
  targetUid?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  ip?: string;
  timestamp?: string;
  createdAt?: string;
}

export interface DepositAmountBonusTier {
  id: string;
  amount: number;
  bonusAmount: number;
  bonusPercent: number;
  label?: string;
  isActive: boolean;
  minVipLevel?: number;
}

export interface MinesControlConfig {
  mode: 'house_best' | 'step_trap' | 'fair' | 'force_win' | 'custom_tiles';
  forcedTrapStep: number;
  autoTrapHighBetThreshold: number;
  forcedMineCoordinates: number[];
  houseRTP: number;
}

export interface RouletteControlConfig {
  mode: 'house_best' | 'force_number' | 'force_color' | 'fair' | 'force_win';
  forcedNextNumber: number | null;
  forcedNextColor: 'red' | 'black' | 'green' | null;
  houseRTP: number;
}

export interface AviatorControlConfig {
  mode: 'house_best' | 'force_multiplier' | 'fair';
  forcedCrashMultiplier: number | null;
  autoCrashPoolThreshold: number;
  houseRTP: number;
}

export interface ChickenRoadControlConfig {
  mode: 'house_best' | 'step_trap' | 'fair';
  forcedTrapStep: number;
  houseRTP: number;
}

export interface PlinkoControlConfig {
  mode: 'house_best' | 'fair';
  forcedSlotMultiplier: number;
  houseRTP: number;
}

export interface LudoControlConfig {
  isActive: boolean;
  maintenanceNotice: string;
  botDifficulty: 'easy' | 'medium' | 'hard';
  winTargetRTP: number;
}

export interface AllGamesControlSettings {
  mines: MinesControlConfig;
  roulette: RouletteControlConfig;
  aviator: AviatorControlConfig;
  chicken_road: ChickenRoadControlConfig;
  plinko: PlinkoControlConfig;
  ludo?: LudoControlConfig;
}

// Ludo Game Types
export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface LudoToken {
  id: string;
  color: PlayerColor;
  tokenIndex: number; // 0, 1, 2, 3
  step: number;       // -1 = Yard, 0..50 = Main Track, 51..56 = Home Column & Finish
  isHome: boolean;
}

export interface LudoPlayer {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  tokens: LudoToken[];
  isBot: boolean;
  score: number;
  lastDiceValue: number | null;
  hasRolledSix: boolean;
  lifelines: number;     // 3 default
  isEliminated: boolean;
}

export interface LudoGameState {
  roomId: string;
  players: LudoPlayer[];
  currentTurnColor: PlayerColor;
  diceValue: number | null;
  isRolling: boolean;
  canRoll: boolean;
  consecutiveSixes: number;
  status: 'waiting' | 'in_progress' | 'finished';
  winner: LudoPlayer | null;
  entryAmount: number;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  pendingDeposits: number;
  approvedDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalBets: number;
  totalBettingAmount: number;
  totalWinningAmount: number;
  todayTurnover: number;
  todayProfitLoss: number;
  todayNewUsers: number;
  activePeriodStats: {
    gameType: GameType;
    periodId: string;
    totalBets: number;
    totalAmount: number;
    remainingSeconds: number;
    isLocked: boolean;
  }[];
}
