import { db } from './db.js';
import { saveUserPermanently, saveTransactionPermanently, saveBetPermanently } from './firebaseDb.js';

// ==========================================
// TYPES & DATA STRUCTURES FOR LIVE CASINO
// ==========================================

export interface PlayingCard {
  rank: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  suit: 'spades' | 'hearts' | 'clubs' | 'diamonds';
  symbol: string;
  value: number; // 2 - 14 (A=14)
  color: 'red' | 'black';
}

export interface HandEvaluation {
  type: 'TRIO' | 'PURE_SEQUENCE' | 'SEQUENCE' | 'COLOR' | 'PAIR' | 'HIGH_CARD';
  title: string;
  score: number;
  highCards: number[];
}

const SUITS: { suit: 'spades' | 'hearts' | 'clubs' | 'diamonds'; symbol: string; color: 'red' | 'black' }[] = [
  { suit: 'spades', symbol: '♠', color: 'black' },
  { suit: 'hearts', symbol: '♥', color: 'red' },
  { suit: 'clubs', symbol: '♣', color: 'black' },
  { suit: 'diamonds', symbol: '♦', color: 'red' },
];

const RANKS: { rank: string; value: number }[] = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
  { rank: 'A', value: 14 },
];

function generateShuffledDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({
        rank: r.rank,
        suit: s.suit,
        symbol: s.symbol,
        value: r.value,
        color: s.color,
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function evaluate3Cards(cards: PlayingCard[]): HandEvaluation {
  if (!cards || cards.length < 3) {
    return { type: 'HIGH_CARD', title: 'High Card', score: 0, highCards: [0, 0, 0] };
  }
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const v0 = sorted[0].value;
  const v1 = sorted[1].value;
  const v2 = sorted[2].value;
  const sameSuit = sorted[0].suit === sorted[1].suit && sorted[1].suit === sorted[2].suit;

  // 1. Trio / Trail
  if (v0 === v1 && v1 === v2) {
    const name = sorted[0].rank === 'A' ? 'Aces' : `${sorted[0].rank}s`;
    return { type: 'TRIO', title: `Trio of ${name}`, score: 6000000 + v0 * 10000, highCards: [v0, v1, v2] };
  }

  // Check Straight / Sequence
  let isSequence = false;
  let sequenceWeight = 0;
  if (v0 === 14 && v1 === 13 && v2 === 12) { // AKQ
    isSequence = true;
    sequenceWeight = 1000;
  } else if (v0 === 14 && v1 === 3 && v2 === 2) { // A23
    isSequence = true;
    sequenceWeight = 900;
  } else if (v0 - v1 === 1 && v1 - v2 === 1) { // Normal consecutive
    isSequence = true;
    sequenceWeight = v0 * 10;
  }

  // 2. Pure Sequence
  if (isSequence && sameSuit) {
    return { type: 'PURE_SEQUENCE', title: 'Pure Sequence (Straight Flush)', score: 5000000 + sequenceWeight * 100, highCards: [v0, v1, v2] };
  }

  // 3. Normal Sequence
  if (isSequence) {
    return { type: 'SEQUENCE', title: 'Sequence (Straight)', score: 4000000 + sequenceWeight * 100, highCards: [v0, v1, v2] };
  }

  // 4. Color / Flush
  if (sameSuit) {
    return { type: 'COLOR', title: 'Color (Flush)', score: 3000000 + v0 * 1000 + v1 * 50 + v2, highCards: [v0, v1, v2] };
  }

  // 5. Pair
  if (v0 === v1) {
    return { type: 'PAIR', title: `Pair of ${sorted[0].rank}s`, score: 2000000 + v0 * 1000 + v2, highCards: [v0, v1, v2] };
  }
  if (v1 === v2) {
    return { type: 'PAIR', title: `Pair of ${sorted[1].rank}s`, score: 2000000 + v1 * 1000 + v0, highCards: [v1, v2, v0] };
  }
  if (v0 === v2) {
    return { type: 'PAIR', title: `Pair of ${sorted[0].rank}s`, score: 2000000 + v0 * 1000 + v1, highCards: [v0, v2, v1] };
  }

  // 6. High Card
  return { type: 'HIGH_CARD', title: `High Card ${sorted[0].rank}`, score: 1000000 + v0 * 1000 + v1 * 50 + v2, highCards: [v0, v1, v2] };
}

// ==========================================
// LIVE CASINO CONTINUOUS RUNNING ENGINE
// ==========================================

export class LiveCasinoEngine {
  private timer: NodeJS.Timeout | null = null;

  // ---------------- AVIATOR STATE ----------------
  public aviator = {
    roundId: 28430870,
    phase: 'waiting' as 'waiting' | 'flying' | 'crashed',
    countdown: 5.0,
    currentMultiplier: 1.00,
    crashMultiplier: 2.15,
    phaseStartTime: Date.now(),
    flightDurationMs: 8000,
    history: [
      2.52, 1.72, 3.09, 2.04, 2.04, 1.48, 3.09, 8.52, 1.20, 1.28, 1.84, 1.18, 1.24, 2.06, 19.98, 1.07, 2.68, 1.09
    ] as number[],
    activeBets: new Map<string, {
      id: string;
      userId: string;
      panelNum: 1 | 2;
      amount: number;
      isAuto: boolean;
      autoCashOutAt: number;
      cashedOut: boolean;
      cashOutMultiplier: number;
      cashOutAmount: number;
    }>(),
    queuedBets: new Map<string, {
      userId: string;
      panelNum: 1 | 2;
      amount: number;
      isAuto: boolean;
      autoCashOutAt: number;
    }>(),
  };

  // ---------------- ROULETTE STATE ----------------
  public roulette = {
    roundId: 140020,
    settledRoundId: 0,
    phase: 'betting' as 'betting' | 'spinning' | 'result',
    countdown: 18,
    phaseStartTime: Date.now(),
    winningNumber: 17 as number | null,
    winningColor: 'black' as 'red' | 'black' | 'green' | null,
    history: [
      { roundId: 140019, number: 7, color: 'red' as const, timestamp: Date.now() - 30000 },
      { roundId: 140018, number: 20, color: 'black' as const, timestamp: Date.now() - 60000 },
      { roundId: 140017, number: 0, color: 'green' as const, timestamp: Date.now() - 90000 },
      { roundId: 140016, number: 32, color: 'red' as const, timestamp: Date.now() - 120000 },
      { roundId: 140015, number: 11, color: 'black' as const, timestamp: Date.now() - 150000 },
      { roundId: 140014, number: 26, color: 'black' as const, timestamp: Date.now() - 180000 },
      { roundId: 140013, number: 3, color: 'red' as const, timestamp: Date.now() - 210000 },
    ] as Array<{ roundId: number; number: number; color: 'red' | 'black' | 'green'; timestamp: number }>,
    activeBets: new Map<string, {
      id: string;
      userId: string;
      bets: Record<string, number>;
      totalAmount: number;
    }>(),
  };

  // ---------------- TEEN PATTI STATE ----------------
  public teenPatti = {
    roundId: '256488586',
    roundNumber: 256488586,
    phase: 'betting' as 'betting' | 'dealing' | 'result',
    countdown: 15,
    phaseStartTime: Date.now(),
    cardsA: [] as PlayingCard[],
    cardsB: [] as PlayingCard[],
    cardsRevealedA: [false, false, false],
    cardsRevealedB: [false, false, false],
    winner: null as 'A' | 'B' | 'TIE' | null,
    evaluationA: null as HandEvaluation | null,
    evaluationB: null as HandEvaluation | null,
    history: [
      { roundId: '256488585', winner: 'B' as const },
      { roundId: '256488584', winner: 'A' as const },
      { roundId: '256488583', winner: 'B' as const },
      { roundId: '256488582', winner: 'A' as const },
      { roundId: '256488581', winner: 'B' as const },
      { roundId: '256488580', winner: 'A' as const },
      { roundId: '256488579', winner: 'B' as const },
      { roundId: '256488578', winner: 'A' as const },
    ] as Array<{ roundId: string; winner: 'A' | 'B' | 'TIE' }>,
    activeBets: new Map<string, {
      id: string;
      userId: string;
      selection: 'A_BACK' | 'B_BACK' | 'A_PLUS' | 'B_PLUS';
      stake: number;
      odds: number;
    }>(),
  };

  // ---------------- SEVEN UP DOWN STATE ----------------
  public sevenUpDown = {
    roundId: 1056,
    phase: 'betting' as 'betting' | 'dealing' | 'result',
    countdown: 15,
    phaseStartTime: Date.now(),
    dice1: 3,
    dice2: 4,
    sum: 7,
    zone: 'seven' as 'down' | 'seven' | 'up',
    history: [
      { roundId: 1055, dice1: 4, dice2: 5, sum: 9, zone: 'up' as const, timestamp: Date.now() - 30000 },
      { roundId: 1054, dice1: 1, dice2: 3, sum: 4, zone: 'down' as const, timestamp: Date.now() - 60000 },
      { roundId: 1053, dice1: 3, dice2: 4, sum: 7, zone: 'seven' as const, timestamp: Date.now() - 90000 },
      { roundId: 1052, dice1: 6, dice2: 5, sum: 11, zone: 'up' as const, timestamp: Date.now() - 120000 },
      { roundId: 1051, dice1: 2, dice2: 2, sum: 4, zone: 'down' as const, timestamp: Date.now() - 150000 },
    ] as Array<{ roundId: number; dice1: number; dice2: number; sum: number; zone: 'down' | 'seven' | 'up'; timestamp: number }>,
    activeBets: new Map<string, {
      id: string;
      userId: string;
      bets: Record<'down' | 'seven' | 'up', number>;
      totalAmount: number;
    }>(),
  };

  constructor() {
    this.initInitialCards();
    this.startEngine();
  }

  private initInitialCards() {
    const deck = generateShuffledDeck();
    this.teenPatti.cardsA = [deck[0], deck[2], deck[4]];
    this.teenPatti.cardsB = [deck[1], deck[3], deck[5]];
  }

  public startEngine() {
    if (this.timer) clearInterval(this.timer);
    // Ticks every 100ms for silky smooth continuous real-time live gaming
    this.timer = setInterval(() => {
      this.tick();
    }, 100);
    console.log('[Live Casino Engine] Continuous 24/7 background game server started successfully!');
  }

  // =========================================================================
  // MAIN MASTER TICK LOOP - RUNS 24/7 CONTINUOUSLY WITHOUT WAITING FOR CLIENT
  // =========================================================================
  private tick() {
    const now = Date.now();
    this.tickAviator(now);
    this.tickRoulette(now);
    this.tickTeenPatti(now);
    this.tickSevenUpDown(now);
  }

  // -------------------------------------------------------------
  // 1. AVIATOR CONTINUOUS CYCLE
  // waiting (3s) -> flying (varies by crash point) -> crashed (1.6s) -> loop
  // -------------------------------------------------------------
  private tickAviator(now: number) {
    const elapsedMs = now - this.aviator.phaseStartTime;

    if (this.aviator.phase === 'waiting') {
      const remainingSec = Math.max(0, parseFloat(((3000 - elapsedMs) / 1000).toFixed(1)));
      this.aviator.countdown = remainingSec;
      this.aviator.currentMultiplier = 1.00;

      if (elapsedMs >= 3000) {
        // Transition to FLYING
        this.aviator.phase = 'flying';
        this.aviator.phaseStartTime = now;
        this.aviator.currentMultiplier = 1.00;

        // Determine crash point
        const controls = db.allGameControls?.aviator || { mode: 'house_best' };
        let nextCrash = 1.95;

        if (controls.mode === 'force_multiplier' && controls.forcedCrashMultiplier) {
          nextCrash = Number(controls.forcedCrashMultiplier);
        } else if (controls.mode === 'house_best') {
          // Calculate house best based on active bets
          let totalBetPool = 0;
          for (const bet of this.aviator.activeBets.values()) {
            totalBetPool += bet.amount;
          }
          if (totalBetPool > (controls.autoCrashPoolThreshold || 500)) {
            nextCrash = Number((1.00 + Math.random() * 0.22).toFixed(2));
          } else {
            const r = Math.random();
            if (r < 0.05) nextCrash = 1.00;
            else if (r < 0.4) nextCrash = Number((1.10 + Math.random() * 0.6).toFixed(2));
            else if (r < 0.8) nextCrash = Number((1.70 + Math.random() * 1.5).toFixed(2));
            else nextCrash = Number((3.00 + Math.random() * 4.0).toFixed(2));
          }
        } else {
          // 97% fair RTP distribution
          const rand = Math.random();
          if (rand < 0.03) nextCrash = 1.00;
          else {
            const mult = 0.97 / (1 - rand);
            nextCrash = Math.max(1.01, parseFloat(mult.toFixed(2)));
          }
        }

        this.aviator.crashMultiplier = nextCrash;
        // Exponential flight duration calculation: t = ln(mult) / 0.065 seconds (calm, slower ascent as requested)
        const flightSec = Math.max(0.6, Math.log(Math.max(1.01, nextCrash)) / 0.065);
        this.aviator.flightDurationMs = Math.floor(flightSec * 1000);

        // Move queued bets to active
        for (const [key, qb] of this.aviator.queuedBets.entries()) {
          this.aviator.activeBets.set(key, {
            id: `av-bet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: qb.userId,
            panelNum: qb.panelNum,
            amount: qb.amount,
            isAuto: qb.isAuto,
            autoCashOutAt: qb.autoCashOutAt,
            cashedOut: false,
            cashOutMultiplier: 0,
            cashOutAmount: 0,
          });
        }
        this.aviator.queuedBets.clear();
      }
    } else if (this.aviator.phase === 'flying') {
      const flightElapsedSec = elapsedMs / 1000;
      // Formula: multiplier = Math.exp(0.065 * t) (smooth, slower ascent)
      let mult = parseFloat(Math.exp(0.065 * flightElapsedSec).toFixed(2));
      if (mult < 1.00) mult = 1.00;

      this.aviator.currentMultiplier = mult;

      // Check auto cashout on active bets
      for (const bet of this.aviator.activeBets.values()) {
        if (!bet.cashedOut && bet.isAuto && bet.autoCashOutAt > 1.00 && mult >= bet.autoCashOutAt && mult <= this.aviator.crashMultiplier) {
          this.cashoutAviatorBet(bet.userId, bet.panelNum, bet.autoCashOutAt);
        }
      }

      // Check crash condition
      if (mult >= this.aviator.crashMultiplier || elapsedMs >= this.aviator.flightDurationMs) {
        // PLANE CRASHES!
        this.aviator.phase = 'crashed';
        this.aviator.phaseStartTime = now;
        this.aviator.currentMultiplier = this.aviator.crashMultiplier;

        // Settle uncashed bets as lost
        this.settleAviatorLosses(this.aviator.crashMultiplier);

        // Add to history
        this.aviator.history.unshift(this.aviator.crashMultiplier);
        if (this.aviator.history.length > 50) this.aviator.history.pop();
      }
    } else if (this.aviator.phase === 'crashed') {
      const remainingCrashSec = Math.max(0, parseFloat(((1600 - elapsedMs) / 1000).toFixed(1)));
      this.aviator.countdown = remainingCrashSec;

      if (elapsedMs >= 1600) {
        // Next round starts automatically!
        this.aviator.phase = 'waiting';
        this.aviator.phaseStartTime = now;
        this.aviator.roundId += 1;
        this.aviator.currentMultiplier = 1.00;
        this.aviator.activeBets.clear();
      }
    }
  }

  private settleAviatorLosses(finalMult: number) {
    for (const bet of this.aviator.activeBets.values()) {
      if (!bet.cashedOut) {
        const user = db.getUser(bet.userId);
        if (user) {
          const lossAmount = bet.amount;
          user.totalLoss = parseFloat(((user.totalLoss || 0) + lossAmount).toFixed(2));
          db.syncUserTurnover(user);

          const betRecord = {
            id: `BET-AV-${this.aviator.roundId}-${bet.id}`,
            uid: user.uid,
            gameType: 'aviator' as any,
            periodId: String(this.aviator.roundId),
            unitAmount: bet.amount,
            multiplier: 1,
            totalAmount: bet.amount,
            status: 'lost' as const,
            winAmount: 0,
            feeAmount: 0,
            finalResult: `${finalMult.toFixed(2)}x`,
            createdAt: new Date().toISOString(),
          };
          db.bets.unshift(betRecord as any);
          saveBetPermanently(betRecord as any).catch(() => {});
          saveUserPermanently(user).catch(() => {});
          db.saveToDisk();
        }
      }
    }
  }

  public cashoutAviatorBet(userId: string, panelNum: 1 | 2, forceMult?: number) {
    const key = `${userId}-${panelNum}`;
    const bet = this.aviator.activeBets.get(key);
    if (!bet || bet.cashedOut) return { success: false, message: 'No active bet or already cashed out' };

    if (this.aviator.phase !== 'flying') {
      return { success: false, message: 'Cannot cash out outside of flight phase' };
    }

    const mult = forceMult || this.aviator.currentMultiplier;
    if (mult > this.aviator.crashMultiplier) {
      return { success: false, message: 'Plane already crashed' };
    }

    const winAmount = parseFloat((bet.amount * mult).toFixed(2));
    bet.cashedOut = true;
    bet.cashOutMultiplier = mult;
    bet.cashOutAmount = winAmount;

    // Credit user balance
    const user = db.getUser(userId);
    if (user) {
      const prevBal = user.walletBalance;
      user.walletBalance = parseFloat((user.walletBalance + winAmount).toFixed(2));
      user.totalWin = parseFloat(((user.totalWin || 0) + winAmount).toFixed(2));
      db.syncUserTurnover(user);

      const txRecord = {
        id: `TX-AV-WIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        uid: user.uid,
        type: 'win' as const,
        amount: winAmount,
        previousBalance: prevBal,
        newBalance: user.walletBalance,
        reference: `Aviator Win #${this.aviator.roundId} (${mult.toFixed(2)}x)`,
        note: `Aviator Win at ${mult.toFixed(2)}x multiplier`,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
      };
      db.transactions.unshift(txRecord as any);
      saveTransactionPermanently(txRecord as any).catch(() => {});

      const betRecord = {
        id: `BET-AV-${this.aviator.roundId}-${bet.id}`,
        uid: user.uid,
        gameType: 'aviator' as any,
        periodId: String(this.aviator.roundId),
        unitAmount: bet.amount,
        multiplier: 1,
        totalAmount: bet.amount,
        status: 'won' as const,
        winAmount,
        feeAmount: 0,
        finalResult: `${mult.toFixed(2)}x`,
        createdAt: new Date().toISOString(),
      };
      db.bets.unshift(betRecord as any);
      saveBetPermanently(betRecord as any).catch(() => {});
      saveUserPermanently(user).catch(() => {});
      db.saveToDisk();
    }

    return { success: true, winAmount, multiplier: mult };
  }

  public pickRouletteWinningNumber(): { number: number; color: 'red' | 'black' | 'green' } {
    const controls = db.allGameControls?.roulette || { mode: 'auto_managed', targetWinRate: 0.48 };
    let winNum = 0;
    const redList = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const blackList = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    if (controls.mode === 'force_number' && controls.forcedNextNumber !== null && controls.forcedNextNumber !== undefined) {
      winNum = Number(controls.forcedNextNumber);
    } else if (controls.mode === 'force_color' && controls.forcedNextColor) {
      if (controls.forcedNextColor === 'red') winNum = redList[Math.floor(Math.random() * redList.length)];
      else if (controls.forcedNextColor === 'black') winNum = blackList[Math.floor(Math.random() * blackList.length)];
      else winNum = 0;
    } else if (controls.mode === 'auto_managed') {
      // Auto Manage: client wins & loses naturally with dynamic balance
      const activeBets = Array.from(this.roulette.activeBets.values());
      const playerWinningNums: number[] = [];
      for (let n = 0; n <= 36; n++) {
        let wouldWin = false;
        for (const b of activeBets) {
          if (b.bets) {
            if (b.bets[`num_${n}`]) wouldWin = true;
            else if (b.bets['red'] && redList.includes(n)) wouldWin = true;
            else if (b.bets['black'] && blackList.includes(n)) wouldWin = true;
            else if (b.bets['even'] && n > 0 && n % 2 === 0) wouldWin = true;
            else if (b.bets['odd'] && n > 0 && n % 2 === 1) wouldWin = true;
            else if (b.bets['low'] && n >= 1 && n <= 18) wouldWin = true;
            else if (b.bets['high'] && n >= 19 && n <= 36) wouldWin = true;
          }
        }
        if (wouldWin) playerWinningNums.push(n);
      }

      const targetWinRate = Number(controls.targetWinRate ?? 0.48);
      const shouldWin = activeBets.length > 0 && playerWinningNums.length > 0 && Math.random() < targetWinRate;
      if (shouldWin) {
        winNum = playerWinningNums[Math.floor(Math.random() * playerWinningNums.length)];
      } else {
        const losingNums = Array.from({ length: 37 }, (_, i) => i).filter(n => !playerWinningNums.includes(n));
        if (losingNums.length > 0) {
          winNum = losingNums[Math.floor(Math.random() * losingNums.length)];
        } else {
          winNum = Math.floor(Math.random() * 37);
        }
      }
    } else if (controls.mode === 'house_best') {
      // Minimum payout for house advantage
      let minPayout = Infinity;
      let bestNum = 0;
      const allNums = Array.from({ length: 37 }, (_, i) => i).sort(() => Math.random() - 0.5);
      const activeBets = Array.from(this.roulette.activeBets.values());
      for (const num of allNums) {
        let totalPayout = 0;
        for (const b of activeBets) {
          if (b.bets) {
            if (b.bets[`num_${num}`]) totalPayout += b.bets[`num_${num}`] * 36;
            if (b.bets['red'] && redList.includes(num)) totalPayout += b.bets['red'] * 2;
            if (b.bets['black'] && blackList.includes(num)) totalPayout += b.bets['black'] * 2;
            if (b.bets['even'] && num > 0 && num % 2 === 0) totalPayout += b.bets['even'] * 2;
            if (b.bets['odd'] && num > 0 && num % 2 === 1) totalPayout += b.bets['odd'] * 2;
          }
        }
        if (totalPayout < minPayout) {
          minPayout = totalPayout;
          bestNum = num;
        }
      }
      winNum = bestNum;
    } else {
      // Fair European roulette (0-36)
      winNum = Math.floor(Math.random() * 37);
    }

    let color: 'red' | 'black' | 'green' = 'black';
    if (winNum === 0) color = 'green';
    else if (redList.includes(winNum)) color = 'red';

    return { number: winNum, color };
  }

  public triggerRouletteFastSpin(): { success: boolean; winningNumber?: number; winningColor?: string; roundId?: number; message?: string } {
    if (this.roulette.phase === 'betting') {
      const outcome = this.pickRouletteWinningNumber();
      this.roulette.phase = 'spinning';
      this.roulette.phaseStartTime = Date.now();
      this.roulette.countdown = 7;
      this.roulette.winningNumber = outcome.number;
      this.roulette.winningColor = outcome.color;
      return { success: true, winningNumber: outcome.number, winningColor: outcome.color, roundId: this.roulette.roundId };
    }
    if (this.roulette.phase === 'spinning') {
      return { success: true, winningNumber: this.roulette.winningNumber ?? 0, winningColor: this.roulette.winningColor || 'red', roundId: this.roulette.roundId };
    }
    return { success: false, message: 'Round is completing, please wait for next spin' };
  }

  // -------------------------------------------------------------
  // 2. ROULETTE CONTINUOUS CYCLE
  // betting (18s) -> spinning (7s) -> result (5s) -> loop
  // -------------------------------------------------------------
  private tickRoulette(now: number) {
    const elapsedMs = now - this.roulette.phaseStartTime;

    if (this.roulette.phase === 'betting') {
      const remainingSec = Math.max(0, Math.ceil((18000 - elapsedMs) / 1000));
      this.roulette.countdown = remainingSec;

      if (elapsedMs >= 18000) {
        // Transition to SPINNING - Exactly once
        this.roulette.phase = 'spinning';
        this.roulette.phaseStartTime = now;
        this.roulette.countdown = 7;

        const outcome = this.pickRouletteWinningNumber();
        this.roulette.winningNumber = outcome.number;
        this.roulette.winningColor = outcome.color;
      }
    } else if (this.roulette.phase === 'spinning') {
      const remainingSec = Math.max(0, Math.ceil((7000 - elapsedMs) / 1000));
      this.roulette.countdown = remainingSec;

      if (elapsedMs >= 7000) {
        // Transition to RESULT & SETTLEMENT - Exactly once
        this.roulette.phase = 'result';
        this.roulette.phaseStartTime = now;
        this.roulette.countdown = 5;

        this.settleRouletteRound();

        // Add to history (only once per roundId)
        if (!this.roulette.history.some(h => h.roundId === this.roulette.roundId)) {
          this.roulette.history.unshift({
            roundId: this.roulette.roundId,
            number: this.roulette.winningNumber || 0,
            color: this.roulette.winningColor || 'green',
            timestamp: now,
          });
          if (this.roulette.history.length > 50) this.roulette.history.pop();
        }
      }
    } else if (this.roulette.phase === 'result') {
      const remainingSec = Math.max(0, Math.ceil((5000 - elapsedMs) / 1000));
      this.roulette.countdown = remainingSec;

      if (elapsedMs >= 5000) {
        // Next round starts automatically!
        this.roulette.phase = 'betting';
        this.roulette.phaseStartTime = now;
        this.roulette.roundId += 1;
        this.roulette.countdown = 18;
        this.roulette.winningNumber = null;
        this.roulette.winningColor = null;
        this.roulette.activeBets.clear();
      }
    }
  }

  private settleRouletteRound() {
    if (this.roulette.settledRoundId === this.roulette.roundId) {
      return;
    }
    this.roulette.settledRoundId = this.roulette.roundId;

    const winNum = this.roulette.winningNumber ?? 0;
    const redNums = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const isRed = redNums.includes(winNum);
    const isBlack = winNum > 0 && !isRed;
    const isEven = winNum > 0 && winNum % 2 === 0;
    const isOdd = winNum > 0 && winNum % 2 === 1;
    const isLow = winNum >= 1 && winNum <= 18;
    const isHigh = winNum >= 19 && winNum <= 36;
    const isDozen1 = winNum >= 1 && winNum <= 12;
    const isDozen2 = winNum >= 13 && winNum <= 24;
    const isDozen3 = winNum >= 25 && winNum <= 36;
    const isCol1 = winNum > 0 && winNum % 3 === 1;
    const isCol2 = winNum > 0 && winNum % 3 === 2;
    const isCol3 = winNum > 0 && winNum % 3 === 0;

    // Snapshot and clear active bets immediately to prevent duplicate settlement
    const betsToSettle = Array.from(this.roulette.activeBets.values());
    this.roulette.activeBets.clear();

    for (const betObj of betsToSettle) {
      const user = db.getUser(betObj.userId);
      if (!user) continue;

      let totalWin = 0;
      for (const [key, amt] of Object.entries(betObj.bets)) {
        if (!amt || amt <= 0) continue;
        if (key === `num_${winNum}`) {
          totalWin += amt * 36;
        } else if (key.startsWith('split_')) {
          const parts = key.replace('split_', '').split('_').map(Number);
          if (parts.includes(winNum)) totalWin += amt * 18;
        } else if (key.startsWith('street_')) {
          const parts = key.replace('street_', '').split('_').map(Number);
          const nums = parts.length === 1 ? [parts[0], parts[0] + 1, parts[0] + 2] : parts;
          if (nums.includes(winNum)) totalWin += amt * 12;
        } else if (key.startsWith('corner_')) {
          const parts = key.replace('corner_', '').split('_').map(Number);
          const nums = parts.length === 1 ? [parts[0], parts[0] + 1, parts[0] + 3, parts[0] + 4] : parts;
          if (nums.includes(winNum)) totalWin += amt * 9;
        } else if (key === 'five_basket' || key === 'basket') {
          if ([0, 1, 2, 3].includes(winNum)) totalWin += amt * 7;
        } else if (key.startsWith('line_')) {
          const start = parseInt(key.replace('line_', ''), 10);
          if (winNum >= start && winNum <= start + 5) totalWin += amt * 6;
        } else if (key === 'red' && isRed) {
          totalWin += amt * 2;
        } else if (key === 'black' && isBlack) {
          totalWin += amt * 2;
        } else if (key === 'even' && isEven) {
          totalWin += amt * 2;
        } else if (key === 'odd' && isOdd) {
          totalWin += amt * 2;
        } else if (key === 'low' && isLow) {
          totalWin += amt * 2;
        } else if (key === 'high' && isHigh) {
          totalWin += amt * 2;
        } else if ((key === 'dozen_1' || key === 'doz_1') && isDozen1) {
          totalWin += amt * 3;
        } else if ((key === 'dozen_2' || key === 'doz_2') && isDozen2) {
          totalWin += amt * 3;
        } else if ((key === 'dozen_3' || key === 'doz_3') && isDozen3) {
          totalWin += amt * 3;
        } else if (key === 'col_1' && isCol1) {
          totalWin += amt * 3;
        } else if (key === 'col_2' && isCol2) {
          totalWin += amt * 3;
        } else if (key === 'col_3' && isCol3) {
          totalWin += amt * 3;
        }
      }

      const status = totalWin > 0 ? 'won' : 'lost';
      const stake = betObj.totalAmount;
      if (totalWin > 0) {
        const prevBal = user.walletBalance;
        user.walletBalance = parseFloat((user.walletBalance + totalWin).toFixed(2));
        user.totalWin = parseFloat(((user.totalWin || 0) + totalWin).toFixed(2));

        const txRecord = {
          id: `TX-ROUL-WIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          uid: user.uid,
          type: 'win' as const,
          amount: totalWin,
          previousBalance: prevBal,
          newBalance: user.walletBalance,
          reference: `Roulette #${this.roulette.roundId} Win`,
          note: `Roulette Win on number ${winNum}`,
          status: 'completed' as const,
          createdAt: new Date().toISOString(),
        };
        db.transactions.unshift(txRecord as any);
        saveTransactionPermanently(txRecord as any).catch(() => {});
      } else {
        const loss = stake;
        user.totalLoss = parseFloat(((user.totalLoss || 0) + loss).toFixed(2));
      }

      const betRecord = {
        id: `BET-ROUL-${this.roulette.roundId}-${betObj.id}`,
        uid: user.uid,
        gameType: 'roulette' as any,
        periodId: String(this.roulette.roundId),
        unitAmount: betObj.totalAmount,
        multiplier: 1,
        totalAmount: betObj.totalAmount,
        status,
        winAmount: totalWin,
        feeAmount: 0,
        finalResult: `Number ${winNum}`,
        createdAt: new Date().toISOString(),
      };
      db.bets.unshift(betRecord as any);
      db.applySettledBetRolling(user, betRecord as any);
      saveBetPermanently(betRecord as any).catch(() => {});
      saveUserPermanently(user).catch(() => {});
      db.saveToDisk();
    }
  }

  // -------------------------------------------------------------
  // 3. TEEN PATTI CONTINUOUS CYCLE
  // betting (15s) -> dealing (5s) -> result (5s) -> loop
  // -------------------------------------------------------------
  private tickTeenPatti(now: number) {
    const elapsedMs = now - this.teenPatti.phaseStartTime;

    if (this.teenPatti.phase === 'betting') {
      const remainingSec = Math.max(0, Math.ceil((15000 - elapsedMs) / 1000));
      this.teenPatti.countdown = remainingSec;
      this.teenPatti.cardsRevealedA = [false, false, false];
      this.teenPatti.cardsRevealedB = [false, false, false];

      if (elapsedMs >= 15000) {
        // Transition to DEALING
        this.teenPatti.phase = 'dealing';
        this.teenPatti.phaseStartTime = now;
        this.teenPatti.countdown = 5;

        // Deal fresh cards from shuffled deck
        const controls = db.allGameControls?.teen_patti || { mode: 'auto_managed', targetWinRate: 0.48 };
        let deck = generateShuffledDeck();
        let cA = [deck[0], deck[2], deck[4]];
        let cB = [deck[1], deck[3], deck[5]];
        let evalA = evaluate3Cards(cA);
        let evalB = evaluate3Cards(cB);

        if (controls.mode === 'auto_managed' && this.teenPatti.activeBets.size > 0) {
          let betOnA = 0;
          let betOnB = 0;
          for (const b of this.teenPatti.activeBets.values()) {
            if (b.selection === 'A_BACK' || b.selection === 'A_PLUS') betOnA += b.stake;
            if (b.selection === 'B_BACK' || b.selection === 'B_PLUS') betOnB += b.stake;
          }
          const shouldPlayerWin = Math.random() < Number(controls.targetWinRate ?? 0.48);
          let targetWinner: 'A' | 'B' | null = null;
          if (betOnA > betOnB) {
            targetWinner = shouldPlayerWin ? 'A' : 'B';
          } else if (betOnB > betOnA) {
            targetWinner = shouldPlayerWin ? 'B' : 'A';
          }
          if (targetWinner) {
            let tries = 0;
            while (tries < 12 && ((targetWinner === 'A' && evalA.score <= evalB.score) || (targetWinner === 'B' && evalB.score <= evalA.score))) {
              deck = generateShuffledDeck();
              cA = [deck[0], deck[2], deck[4]];
              cB = [deck[1], deck[3], deck[5]];
              evalA = evaluate3Cards(cA);
              evalB = evaluate3Cards(cB);
              tries++;
            }
          }
        }

        this.teenPatti.cardsA = cA;
        this.teenPatti.cardsB = cB;
        this.teenPatti.evaluationA = evalA;
        this.teenPatti.evaluationB = evalB;

        if (evalA.score > evalB.score) {
          this.teenPatti.winner = 'A';
        } else if (evalB.score > evalA.score) {
          this.teenPatti.winner = 'B';
        } else {
          this.teenPatti.winner = 'TIE';
        }
      }
    } else if (this.teenPatti.phase === 'dealing') {
      const remainingSec = Math.max(0, Math.ceil((5000 - elapsedMs) / 1000));
      this.teenPatti.countdown = remainingSec;

      // Card flipping animation states based on elapsed sub-seconds
      if (elapsedMs > 1000) this.teenPatti.cardsRevealedA[0] = true;
      if (elapsedMs > 1800) this.teenPatti.cardsRevealedB[0] = true;
      if (elapsedMs > 2500) this.teenPatti.cardsRevealedA[1] = true;
      if (elapsedMs > 3200) this.teenPatti.cardsRevealedB[1] = true;
      if (elapsedMs > 3900) this.teenPatti.cardsRevealedA[2] = true;
      if (elapsedMs > 4600) this.teenPatti.cardsRevealedB[2] = true;

      if (elapsedMs >= 5000) {
        // Transition to RESULT & SETTLEMENT
        this.teenPatti.phase = 'result';
        this.teenPatti.phaseStartTime = now;
        this.teenPatti.countdown = 5;
        this.teenPatti.cardsRevealedA = [true, true, true];
        this.teenPatti.cardsRevealedB = [true, true, true];

        this.settleTeenPattiRound();

        // Add to history
        this.teenPatti.history.unshift({
          roundId: this.teenPatti.roundId,
          winner: this.teenPatti.winner || 'A',
        });
        if (this.teenPatti.history.length > 50) this.teenPatti.history.pop();
      }
    } else if (this.teenPatti.phase === 'result') {
      const remainingSec = Math.max(0, Math.ceil((5000 - elapsedMs) / 1000));
      this.teenPatti.countdown = remainingSec;

      if (elapsedMs >= 5000) {
        // Next round starts automatically!
        this.teenPatti.phase = 'betting';
        this.teenPatti.phaseStartTime = now;
        this.teenPatti.roundNumber += 1;
        this.teenPatti.roundId = String(this.teenPatti.roundNumber);
        this.teenPatti.countdown = 15;
        this.teenPatti.winner = null;
        this.teenPatti.evaluationA = null;
        this.teenPatti.evaluationB = null;
        this.teenPatti.activeBets.clear();
      }
    }
  }

  private settleTeenPattiRound() {
    const winner = this.teenPatti.winner;
    for (const bet of this.teenPatti.activeBets.values()) {
      const user = db.getUser(bet.userId);
      if (!user) continue;

      let won = false;
      let multiplier = bet.odds || 1.98;

      if (bet.selection === 'A_BACK' && winner === 'A') won = true;
      else if (bet.selection === 'B_BACK' && winner === 'B') won = true;
      else if (bet.selection === 'A_PLUS' && (winner === 'A' || this.teenPatti.evaluationA?.type !== 'HIGH_CARD')) {
        won = true;
        multiplier = 2.5;
      } else if (bet.selection === 'B_PLUS' && (winner === 'B' || this.teenPatti.evaluationB?.type !== 'HIGH_CARD')) {
        won = true;
        multiplier = 2.5;
      }

      const winAmount = won ? parseFloat((bet.stake * multiplier).toFixed(2)) : 0;
      const status = won ? 'won' : 'lost';
      const stake = bet.stake;

      if (won) {
        const prevBal = user.walletBalance;
        user.walletBalance = parseFloat((user.walletBalance + winAmount).toFixed(2));
        user.totalWin = parseFloat(((user.totalWin || 0) + winAmount).toFixed(2));
        db.syncUserTurnover(user);

        const txRecord = {
          id: `TX-TP-WIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          uid: user.uid,
          type: 'win' as const,
          amount: winAmount,
          previousBalance: prevBal,
          newBalance: user.walletBalance,
          reference: `Teen Patti Win (${bet.selection}) #${this.teenPatti.roundId}`,
          note: `Won ₹${winAmount} on Teen Patti`,
          status: 'completed' as const,
          createdAt: new Date().toISOString(),
        };
        db.transactions.unshift(txRecord as any);
        saveTransactionPermanently(txRecord as any).catch(() => {});
      } else {
        const loss = stake;
        user.totalLoss = parseFloat(((user.totalLoss || 0) + loss).toFixed(2));
        db.syncUserTurnover(user);
      }

      const betRecord = {
        id: `BET-TP-${this.teenPatti.roundId}-${bet.id}`,
        uid: user.uid,
        gameType: 'teen_patti' as any,
        periodId: this.teenPatti.roundId,
        unitAmount: bet.stake,
        multiplier: 1,
        totalAmount: bet.stake,
        status,
        winAmount,
        feeAmount: 0,
        finalResult: `Winner: ${winner}`,
        createdAt: new Date().toISOString(),
      };
      db.bets.unshift(betRecord as any);
      saveBetPermanently(betRecord as any).catch(() => {});
      saveUserPermanently(user).catch(() => {});
      db.saveToDisk();
    }
  }

  // -------------------------------------------------------------
  // 4. SEVEN UP DOWN CONTINUOUS CYCLE
  // betting (15s) -> dealing (5s) -> result (5s) -> loop
  // -------------------------------------------------------------
  private tickSevenUpDown(now: number) {
    const elapsedMs = now - this.sevenUpDown.phaseStartTime;

    if (this.sevenUpDown.phase === 'betting') {
      const remainingSec = Math.max(0, Math.ceil((15000 - elapsedMs) / 1000));
      this.sevenUpDown.countdown = remainingSec;

      if (elapsedMs >= 15000) {
        // Transition to DEALING / ROLLING
        this.sevenUpDown.phase = 'dealing';
        this.sevenUpDown.phaseStartTime = now;
        this.sevenUpDown.countdown = 5;

        // Roll 2 dice
        const controls = db.allGameControls?.seven_up_down || { mode: 'auto_managed', targetWinRate: 0.48 };
        let d1 = Math.floor(Math.random() * 6) + 1;
        let d2 = Math.floor(Math.random() * 6) + 1;
        let sum = d1 + d2;

        if (controls.mode === 'auto_managed' && this.sevenUpDown.activeBets.size > 0) {
          let betDown = 0;
          let betSeven = 0;
          let betUp = 0;
          for (const b of this.sevenUpDown.activeBets.values()) {
            betDown += b.bets?.down || 0;
            betSeven += b.bets?.seven || 0;
            betUp += b.bets?.up || 0;
          }
          const shouldPlayerWin = Math.random() < Number(controls.targetWinRate ?? 0.48);
          let targetZone: 'down' | 'seven' | 'up' | null = null;
          if (betDown >= betUp && betDown >= betSeven && betDown > 0) {
            targetZone = shouldPlayerWin ? 'down' : (Math.random() < 0.5 ? 'up' : 'seven');
          } else if (betUp >= betDown && betUp >= betSeven && betUp > 0) {
            targetZone = shouldPlayerWin ? 'up' : (Math.random() < 0.5 ? 'down' : 'seven');
          } else if (betSeven > 0) {
            targetZone = shouldPlayerWin ? 'seven' : (Math.random() < 0.5 ? 'down' : 'up');
          }
          if (targetZone) {
            let tries = 0;
            while (tries < 15) {
              const currentZone = sum < 7 ? 'down' : sum === 7 ? 'seven' : 'up';
              if (currentZone === targetZone) break;
              d1 = Math.floor(Math.random() * 6) + 1;
              d2 = Math.floor(Math.random() * 6) + 1;
              sum = d1 + d2;
              tries++;
            }
          }
        }

        this.sevenUpDown.dice1 = d1;
        this.sevenUpDown.dice2 = d2;
        this.sevenUpDown.sum = sum;

        if (sum < 7) this.sevenUpDown.zone = 'down';
        else if (sum === 7) this.sevenUpDown.zone = 'seven';
        else this.sevenUpDown.zone = 'up';
      }
    } else if (this.sevenUpDown.phase === 'dealing') {
      const remainingSec = Math.max(0, Math.ceil((5000 - elapsedMs) / 1000));
      this.sevenUpDown.countdown = remainingSec;

      if (elapsedMs >= 5000) {
        // Transition to RESULT & SETTLEMENT
        this.sevenUpDown.phase = 'result';
        this.sevenUpDown.phaseStartTime = now;
        this.sevenUpDown.countdown = 5;

        this.settleSevenUpDownRound();

        // Add to history
        this.sevenUpDown.history.unshift({
          roundId: this.sevenUpDown.roundId,
          dice1: this.sevenUpDown.dice1,
          dice2: this.sevenUpDown.dice2,
          sum: this.sevenUpDown.sum,
          zone: this.sevenUpDown.zone,
          timestamp: now,
        });
        if (this.sevenUpDown.history.length > 50) this.sevenUpDown.history.pop();
      }
    } else if (this.sevenUpDown.phase === 'result') {
      const remainingSec = Math.max(0, Math.ceil((5000 - elapsedMs) / 1000));
      this.sevenUpDown.countdown = remainingSec;

      if (elapsedMs >= 5000) {
        // Next round starts automatically!
        this.sevenUpDown.phase = 'betting';
        this.sevenUpDown.phaseStartTime = now;
        this.sevenUpDown.roundId += 1;
        this.sevenUpDown.countdown = 15;
        this.sevenUpDown.activeBets.clear();
      }
    }
  }

  private settleSevenUpDownRound() {
    const zone = this.sevenUpDown.zone;
    for (const betObj of this.sevenUpDown.activeBets.values()) {
      const user = db.getUser(betObj.userId);
      if (!user) continue;

      let totalWin = 0;
      for (const [z, amt] of Object.entries(betObj.bets)) {
        if (!amt || amt <= 0) continue;
        if (z === zone) {
          if (zone === 'seven') totalWin += amt * 5; // 5x payout for exact 7
          else totalWin += amt * 2; // 2x payout for 2-6 or 8-12
        }
      }

      const status = totalWin > 0 ? 'won' : 'lost';
      const stake = betObj.totalAmount;

      if (totalWin > 0) {
        const prevBal = user.walletBalance;
        user.walletBalance = parseFloat((user.walletBalance + totalWin).toFixed(2));
        user.totalWin = parseFloat(((user.totalWin || 0) + totalWin).toFixed(2));
        db.syncUserTurnover(user);

        const txRecord = {
          id: `TX-7UP-WIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          uid: user.uid,
          type: 'win' as const,
          amount: totalWin,
          previousBalance: prevBal,
          newBalance: user.walletBalance,
          reference: `7 Up Down Win (${zone.toUpperCase()} - Sum ${this.sevenUpDown.sum}) #${this.sevenUpDown.roundId}`,
          note: `Won ₹${totalWin} on 7 Up Down`,
          status: 'completed' as const,
          createdAt: new Date().toISOString(),
        };
        db.transactions.unshift(txRecord as any);
        saveTransactionPermanently(txRecord as any).catch(() => {});
      } else {
        const loss = stake;
        user.totalLoss = parseFloat(((user.totalLoss || 0) + loss).toFixed(2));
        db.syncUserTurnover(user);
      }

      const betRecord = {
        id: `BET-7UP-${this.sevenUpDown.roundId}-${betObj.id}`,
        uid: user.uid,
        gameType: 'seven_up_down' as any,
        periodId: String(this.sevenUpDown.roundId),
        unitAmount: betObj.totalAmount,
        multiplier: 1,
        totalAmount: betObj.totalAmount,
        status,
        winAmount: totalWin,
        feeAmount: 0,
        finalResult: `Sum: ${this.sevenUpDown.sum} (${zone.toUpperCase()})`,
        createdAt: new Date().toISOString(),
      };
      db.bets.unshift(betRecord as any);
      saveBetPermanently(betRecord as any).catch(() => {});
      saveUserPermanently(user).catch(() => {});
      db.saveToDisk();
    }
  }

  // ==========================================
  // PUBLIC API STATE SERIALIZERS
  // ==========================================

  public getAviatorState() {
    return {
      roundId: this.aviator.roundId,
      phase: this.aviator.phase,
      countdown: this.aviator.countdown,
      currentMultiplier: this.aviator.currentMultiplier,
      crashMultiplier: this.aviator.phase === 'crashed' ? this.aviator.crashMultiplier : null,
      history: this.aviator.history,
      phaseStartTime: this.aviator.phaseStartTime,
      serverTime: Date.now(),
    };
  }

  public getRouletteState() {
    return {
      roundId: this.roulette.roundId,
      phase: this.roulette.phase,
      countdown: this.roulette.countdown,
      winningNumber: this.roulette.phase !== 'betting' ? this.roulette.winningNumber : null,
      winningColor: this.roulette.phase !== 'betting' ? this.roulette.winningColor : null,
      history: this.roulette.history,
      serverTime: Date.now(),
    };
  }

  public getTeenPattiState() {
    return {
      roundId: this.teenPatti.roundId,
      roundNumber: this.teenPatti.roundNumber,
      phase: this.teenPatti.phase,
      countdown: this.teenPatti.countdown,
      cardsA: this.teenPatti.cardsA,
      cardsB: this.teenPatti.cardsB,
      cardsRevealedA: this.teenPatti.cardsRevealedA,
      cardsRevealedB: this.teenPatti.cardsRevealedB,
      winner: this.teenPatti.phase === 'result' ? this.teenPatti.winner : null,
      evaluationA: this.teenPatti.phase === 'result' ? this.teenPatti.evaluationA : null,
      evaluationB: this.teenPatti.phase === 'result' ? this.teenPatti.evaluationB : null,
      history: this.teenPatti.history,
      serverTime: Date.now(),
    };
  }

  public getSevenUpDownState() {
    return {
      roundId: this.sevenUpDown.roundId,
      phase: this.sevenUpDown.phase,
      countdown: this.sevenUpDown.countdown,
      dice1: this.sevenUpDown.phase !== 'betting' ? this.sevenUpDown.dice1 : null,
      dice2: this.sevenUpDown.phase !== 'betting' ? this.sevenUpDown.dice2 : null,
      sum: this.sevenUpDown.phase !== 'betting' ? this.sevenUpDown.sum : null,
      zone: this.sevenUpDown.phase !== 'betting' ? this.sevenUpDown.zone : null,
      history: this.sevenUpDown.history,
      serverTime: Date.now(),
    };
  }

  public getAllLiveStates() {
    return {
      serverTime: Date.now(),
      aviator: this.getAviatorState(),
      roulette: this.getRouletteState(),
      teenPatti: this.getTeenPattiState(),
      sevenUpDown: this.getSevenUpDownState(),
    };
  }
}

// Global live casino singleton instance running 24/7 on server startup
export const liveCasinoEngine = new LiveCasinoEngine();
