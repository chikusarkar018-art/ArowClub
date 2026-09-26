import { db } from './db.js';
import { GameType, GamePeriod, ColorResult, BigSmallResult, Bet } from '../src/types.js';
import { saveUserPermanently, saveTransactionPermanently, saveBetPermanently } from './firebaseDb.js';

export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const str = String(timeStr).trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const cleanStr = str.replace(/[APM\s]/g, '');
  const parts = cleanStr.split(':').map(p => parseInt(p, 10));
  let hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function isSessionActiveForGameAndTime(session: any, gameType?: GameType): boolean {
  if (!session || session.status !== 'active') return false;
  if (gameType && session.targetGame && session.targetGame !== gameType) return false;
  try {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const curDay = String(now.getDate()).padStart(2, '0');
    const curDateStr = `${curYear}-${curMonth}-${curDay}`;

    const startDate = session.startDate || '2000-01-01';
    const endDate = session.endDate || '2099-12-31';

    if (curDateStr < startDate || curDateStr > endDate) return false;

    if (session.startTime && session.endTime) {
      const curMinutes = now.getHours() * 60 + now.getMinutes();
      const startMin = parseTimeToMinutes(session.startTime);
      const endMin = parseTimeToMinutes(session.endTime);

      if (startMin <= endMin) {
        if (curMinutes < startMin || curMinutes > endMin) return false;
      } else {
        if (curMinutes < startMin && curMinutes > endMin) return false;
      }
    }
    return true;
  } catch {
    return session.status === 'active';
  }
}

export class WingoGameEngine {
  private intervalTimer: NodeJS.Timeout | null = null;
  private preciseRolloverTimers: Map<GameType, NodeJS.Timeout> = new Map();
  private scheduledPeriodMap: Map<GameType, { periodId: string; endTime: number }> = new Map();
  private settledPeriodIds: Set<string> = new Set();
  private settlingPeriodIds: Set<string> = new Set();
  private lastTickBroadcastTime: number = 0;

  // Real-time synchronization event hooks
  public onPeriodSettled: ((data: { gameType: GameType; period: GamePeriod; nextPeriod: GamePeriod; history: GamePeriod[]; settledBets?: any[] }) => void) | null = null;
  public onTick: ((data: { serverTime: number; periods: Record<string, any> }) => void) | null = null;

  private periodCounters: Record<GameType, number> = {
    wingo_30s: 10500,
    wingo_1m: 10500,
    wingo_3m: 10500,
    wingo_5m: 10500,
  };

  constructor() {
    this.initAllPeriods();
    this.startEngine();
  }

  public getGameDuration(gameType: GameType): number {
    const setting = db.gameSettings.get(gameType);
    if (setting && setting.durationSeconds) return setting.durationSeconds;
    switch (gameType) {
      case 'wingo_30s': return 30;
      case 'wingo_1m': return 60;
      case 'wingo_3m': return 180;
      case 'wingo_5m': return 300;
      default: return 60;
    }
  }

  public getAlignedPeriodTimes(duration: number, now: number = Date.now(), offsetRounds: number = 0) {
    const currentEpochSec = Math.floor(now / 1000);
    const roundIndex = Math.floor(currentEpochSec / duration) + offsetRounds;
    const startTime = roundIndex * duration * 1000;
    const endTime = (roundIndex + 1) * duration * 1000;
    const lockTime = endTime - 5000;
    return { startTime, endTime, lockTime };
  }

  public generatePeriodId(gameType: GameType): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    // Extract the highest sequence number used across all sources
    let maxSeq = 10500;

    // 1. Check persistent counter
    if (db.periodCounters && typeof db.periodCounters[gameType] === 'number') {
      maxSeq = Math.max(maxSeq, db.periodCounters[gameType]);
    }

    // 2. Check current active period
    const current = db.currentPeriods.get(gameType);
    if (current?.periodId) {
      const parsed = parseInt(current.periodId.slice(8), 10);
      if (!isNaN(parsed) && parsed > 0) {
        maxSeq = Math.max(maxSeq, parsed);
      }
    }

    // 3. Check historical completed periods (history[0] is newest)
    const history = db.resultsHistory.get(gameType) || [];
    if (history.length > 0 && history[0]?.periodId) {
      const parsed = parseInt(history[0].periodId.slice(8), 10);
      if (!isNaN(parsed) && parsed > 0) {
        maxSeq = Math.max(maxSeq, parsed);
      }
    }

    // Increment strictly by 1 line-by-line
    const nextSeq = maxSeq + 1;
    if (!db.periodCounters) {
      db.periodCounters = {
        wingo_30s: 10500,
        wingo_1m: 10500,
        wingo_3m: 10500,
        wingo_5m: 10500,
      };
    }
    db.periodCounters[gameType] = nextSeq;
    db.saveToDisk();

    return `${dateStr}${String(nextSeq).padStart(5, '0')}`;
  }

  public ensureActivePeriod(gameType: GameType, now: number = Date.now()): GamePeriod {
    const duration = this.getGameDuration(gameType);
    let current = db.currentPeriods.get(gameType);

    // 1. If missing, completed, or missing endTime: generate fresh active round immediately
    if (!current || current.status === 'completed' || !current.endTime) {
      let aligned = this.getAlignedPeriodTimes(duration, now);
      if (aligned.endTime <= now) {
        aligned = this.getAlignedPeriodTimes(duration, now, 1);
      }
      current = {
        periodId: this.generatePeriodId(gameType),
        gameType,
        durationSeconds: duration,
        startTime: aligned.startTime,
        endTime: aligned.endTime,
        lockTime: aligned.lockTime,
        status: (aligned.endTime - now <= 5000) ? 'betting_locked' : 'betting_open',
        totalBetsCount: 0,
        totalBetAmount: 0,
        totalPotentialPayout: 0,
        manualResultNumber: null,
      };
      db.currentPeriods.set(gameType, current);
      return current;
    }

    // 2. If period time has elapsed (endTime <= now): settle it and advance to fresh nextPeriod
    if (current.endTime <= now) {
      this.settlePeriod(gameType, current);
      current = db.currentPeriods.get(gameType);

      // Verify nextPeriod is actually in the future, if not regenerate
      if (!current || current.status === 'completed' || current.endTime <= now) {
        let aligned = this.getAlignedPeriodTimes(duration, now);
        if (aligned.endTime <= now) {
          aligned = this.getAlignedPeriodTimes(duration, now, 1);
        }
        current = {
          periodId: this.generatePeriodId(gameType),
          gameType,
          durationSeconds: duration,
          startTime: aligned.startTime,
          endTime: aligned.endTime,
          lockTime: aligned.lockTime,
          status: (aligned.endTime - now <= 5000) ? 'betting_locked' : 'betting_open',
          totalBetsCount: 0,
          totalBetAmount: 0,
          totalPotentialPayout: 0,
          manualResultNumber: null,
        };
        db.currentPeriods.set(gameType, current);
      }
      this.schedulePreciseRollover(gameType, current);
      return current;
    }

    // 3. Update betting lock state if in final 5 seconds
    if (current.endTime - now <= 5000 && current.status === 'betting_open') {
      current.status = 'betting_locked';
    }

    this.schedulePreciseRollover(gameType, current);
    return current;
  }

  private schedulePreciseRollover(gameType: GameType, period: GamePeriod) {
    if (!period || !period.endTime || period.status === 'completed') return;
    const now = Date.now();
    const delay = period.endTime - now;

    // If target settlement time has arrived or passed, execute immediately with 0 delay
    if (delay <= 0) {
      const existing = this.preciseRolloverTimers.get(gameType);
      if (existing) clearTimeout(existing);
      this.preciseRolloverTimers.delete(gameType);
      this.scheduledPeriodMap.delete(gameType);
      this.settlePeriod(gameType, period);
      return;
    }

    // Guard: If an active timer is already armed for this exact period and target endTime, keep it without jitter
    const scheduled = this.scheduledPeriodMap.get(gameType);
    if (
      scheduled &&
      scheduled.periodId === period.periodId &&
      Math.abs(scheduled.endTime - period.endTime) < 100 &&
      this.preciseRolloverTimers.has(gameType)
    ) {
      return;
    }

    const existing = this.preciseRolloverTimers.get(gameType);
    if (existing) clearTimeout(existing);

    this.scheduledPeriodMap.set(gameType, { periodId: period.periodId, endTime: period.endTime });

    const timer = setTimeout(() => {
      this.preciseRolloverTimers.delete(gameType);
      this.scheduledPeriodMap.delete(gameType);
      this.settlePeriod(gameType, period);
    }, delay);
    this.preciseRolloverTimers.set(gameType, timer);
  }

  public initAllPeriods() {
    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];
    const now = Date.now();
    gameTypes.forEach(gt => {
      const p = this.ensureActivePeriod(gt, now);
      if (p) this.schedulePreciseRollover(gt, p);
    });
  }

  private startEngine() {
    // Ultra-fast 50ms pulse loop ensures zero-latency detection and immediate response
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 50);
  }

  public stopEngine() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    for (const timer of this.preciseRolloverTimers.values()) {
      clearTimeout(timer);
    }
    this.preciseRolloverTimers.clear();
    this.scheduledPeriodMap.clear();
  }

  private tick() {
    const now = Date.now();
    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];

    gameTypes.forEach(gt => {
      const setting = db.gameSettings.get(gt);
      if (setting && !setting.enabled) return;

      this.ensureActivePeriod(gt, now);
    });

    // Periodic clock broadcast every 1000ms for global synchronization
    if (this.onTick && now - this.lastTickBroadcastTime >= 1000) {
      this.lastTickBroadcastTime = now;
      const periodsObj: Record<string, any> = {};
      gameTypes.forEach(gt => {
        const p = this.ensureActivePeriod(gt, now);
        if (p) {
          const rem = Math.max(0, Math.floor((p.endTime - now) / 1000));
          periodsObj[gt] = {
            periodId: p.periodId,
            remainingSeconds: rem,
            isLocked: rem <= 5,
            endTime: p.endTime,
          };
        }
      });
      try {
        this.onTick({ serverTime: now, periods: periodsObj });
      } catch (err) {
        // quiet
      }
    }
  }

  public settlePeriod(gameType: GameType, period: GamePeriod, forceNumber?: number) {
    if (!period || !period.periodId) return;
    const periodKey = `${gameType}:${period.periodId}`;

    // STRICT IDEMPOTENCY GUARD: Never settle the exact same period twice
    if (period.status === 'completed' || this.settledPeriodIds.has(period.periodId) || this.settlingPeriodIds.has(periodKey)) {
      return;
    }
    this.settlingPeriodIds.add(periodKey);

    const now = Date.now();
    period.status = 'calculating';

    // ⚡ 1. Check if Prediction Session Priority Override is Active for this gameType and current time
    let predictionOverrideNum: number | null = null;
    const activeSessions = db.bigSmallSessions || [];
    const activePred = activeSessions.find(s => s.status === 'active' && isSessionActiveForGameAndTime(s, gameType));
    if (activePred && activePred.rounds) {
      const matchedRound = activePred.rounds.find((r: any) => r.targetPeriod === period.periodId);
      if (matchedRound) {
        const isWin = matchedRound.accuracy !== 'miss'; // default win
        const targetPred = matchedRound.prediction; // 'BIG' or 'SMALL'
        const targetColor = matchedRound.color; // 'GREEN' | 'RED' | 'VIOLET'
        
        let candidateNums: number[] = [];
        if (isWin) {
          if (targetPred === 'BIG') {
            if (targetColor === 'GREEN') candidateNums = [5, 7, 9];
            else if (targetColor === 'RED') candidateNums = [6, 8];
            else if (targetColor === 'VIOLET') candidateNums = [5];
            else candidateNums = [5, 6, 7, 8, 9];
          } else { // SMALL
            if (targetColor === 'GREEN') candidateNums = [1, 3];
            else if (targetColor === 'RED') candidateNums = [0, 2, 4];
            else if (targetColor === 'VIOLET') candidateNums = [0];
            else candidateNums = [0, 1, 2, 3, 4];
          }
          if (matchedRound.numbers) {
            const parsed = matchedRound.numbers.split(',').map((n: string) => parseInt(n.trim(), 10)).filter((n: number) => !isNaN(n) && n >= 0 && n <= 9);
            if (parsed.length > 0) candidateNums = parsed;
          }
        } else {
          // Miss -> Opposite prediction
          if (targetPred === 'BIG') candidateNums = [0, 1, 2, 3, 4];
          else candidateNums = [5, 6, 7, 8, 9];
        }

        if (candidateNums.length > 0) {
          const history = db.resultsHistory.get(gameType) || [];
          const prevNum = history[0]?.resultNumber;
          let pool = candidateNums;
          if (typeof prevNum === 'number' && candidateNums.length > 1) {
            const nonPrev = candidateNums.filter(n => n !== prevNum);
            if (nonPrev.length > 0) pool = nonPrev;
          }
          predictionOverrideNum = pool[Math.floor(Math.random() * pool.length)];
        }
      }
    }

    // Determine result number
    let resultNum: number;
    if (predictionOverrideNum !== null && predictionOverrideNum >= 0 && predictionOverrideNum <= 9) {
      // 100% Prediction Priority Override
      resultNum = predictionOverrideNum;
    } else if (forceNumber !== undefined && forceNumber >= 0 && forceNumber <= 9) {
      resultNum = forceNumber;
    } else if (period.manualResultNumber !== null && period.manualResultNumber !== undefined && period.manualResultNumber >= 0 && period.manualResultNumber <= 9) {
      resultNum = period.manualResultNumber;
    } else {
      const mode = (db.gameAutoModes && db.gameAutoModes[gameType]) || 'house_best';
      const sim = this.calculatePotentialPayouts(gameType, period.periodId);
      
      if (mode === 'house_best') {
        resultNum = sim.houseBest.number;
      } else if (mode === '75_percent') {
        resultNum = sim.target75.number;
      } else if (mode === '50_percent') {
        resultNum = sim.target50.number;
      } else if (mode === '25_percent') {
        resultNum = sim.target25.number;
      } else if (mode === '100_percent') {
        resultNum = sim.target100.number;
      } else if (mode === 'auto_rules') {
        // evaluate autoResultRules
        const totalBet = period.totalBetAmount || 0;
        let matchedMode = 'house_best';
        if (db.autoResultRules && Array.isArray(db.autoResultRules)) {
          for (const r of db.autoResultRules) {
            if (r.maxAmount === 'infinity' || totalBet <= Number(r.maxAmount)) {
              matchedMode = r.mode;
              break;
            }
          }
        }
        if (matchedMode === '50_percent') resultNum = sim.target50.number;
        else if (matchedMode === '75_percent') resultNum = sim.target75.number;
        else if (matchedMode === '25_percent') resultNum = sim.target25.number;
        else if (matchedMode === '100_percent') resultNum = sim.target100.number;
        else if (matchedMode === 'fair') {
          const hist = db.resultsHistory.get(gameType) || [];
          const prev = hist[0]?.resultNumber;
          const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => n !== prev);
          resultNum = pool[Math.floor(Math.random() * pool.length)];
        } else resultNum = sim.houseBest.number;
      } else if (mode === 'fair') {
        const hist = db.resultsHistory.get(gameType) || [];
        const prev = hist[0]?.resultNumber;
        const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => n !== prev);
        resultNum = pool[Math.floor(Math.random() * pool.length)];
      } else {
        resultNum = sim.houseBest.number;
      }
    }

    // Guarantee result diversity: ensure each round produces a distinct outcome unless explicitly forced by admin
    const recentHistory = db.resultsHistory.get(gameType) || [];
    const prevNum = recentHistory[0]?.resultNumber;
    const isManuallyForced = (forceNumber !== undefined && forceNumber >= 0 && forceNumber <= 9) ||
      (period.manualResultNumber !== null && period.manualResultNumber !== undefined && period.manualResultNumber >= 0 && period.manualResultNumber <= 9);

    if (!isManuallyForced && typeof prevNum === 'number' && resultNum === prevNum) {
      if (predictionOverrideNum !== null) {
        const isBig = prevNum >= 5;
        const catPool = (isBig ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4]).filter(n => n !== prevNum);
        if (catPool.length > 0) {
          resultNum = catPool[Math.floor(Math.random() * catPool.length)];
        }
      } else {
        const sim = this.calculatePotentialPayouts(gameType, period.periodId);
        const alternateOutcomes = [...sim.outcomes].filter(o => o.number !== prevNum);
        if (alternateOutcomes.length > 0) {
          alternateOutcomes.sort((a, b) => a.payout - b.payout);
          resultNum = alternateOutcomes[0].number;
        } else {
          resultNum = (prevNum + 1 + Math.floor(Math.random() * 8)) % 10;
        }
      }
    }

    // Determine Color
    let resultColor: ColorResult;
    if (resultNum === 0) {
      resultColor = 'red_violet';
    } else if (resultNum === 5) {
      resultColor = 'green_violet';
    } else if ([1, 3, 7, 9].includes(resultNum)) {
      resultColor = 'green';
    } else {
      resultColor = 'red';
    }

    // Determine Big/Small
    const resultBigSmall: BigSmallResult = resultNum >= 5 ? 'big' : 'small';

    period.resultNumber = resultNum;
    period.resultColor = resultColor;
    period.resultBigSmall = resultBigSmall;
    period.status = 'completed';
    period.completedAt = new Date().toISOString();

    // Settle all bets placed on this period
    const periodBets = db.bets.filter(b => b.periodId === period.periodId && b.gameType === gameType);

    const bgPersistTasks: Array<() => void> = [];

    periodBets.forEach(bet => {
      let isWin = false;
      let payoutRate = 0;

      if (bet.betType === 'number') {
        const chosenNum = parseInt(String(bet.selection), 10);
        if (chosenNum === resultNum) {
          isWin = true;
          payoutRate = 9;
        }
      } else if (bet.betType === 'big_small') {
        if (String(bet.selection).toLowerCase() === resultBigSmall) {
          isWin = true;
          payoutRate = 2;
        }
      } else if (bet.betType === 'color') {
        const selColor = String(bet.selection).toLowerCase();
        if (selColor === 'green') {
          if (resultNum === 5) {
            isWin = true;
            payoutRate = 1.5; // Green + Violet split
          } else if ([1, 3, 7, 9].includes(resultNum)) {
            isWin = true;
            payoutRate = 2;
          }
        } else if (selColor === 'red') {
          if (resultNum === 0) {
            isWin = true;
            payoutRate = 1.5; // Red + Violet split
          } else if ([2, 4, 6, 8].includes(resultNum)) {
            isWin = true;
            payoutRate = 2;
          }
        } else if (selColor === 'violet') {
          if (resultNum === 0 || resultNum === 5) {
            isWin = true;
            payoutRate = 4.5;
          }
        }
      }

      // Winning Tax / Platform Commission Cut % per game (Determined strictly by Admin settings)
      const gameCuts = db.bonusCommissionSettings?.gameWinningDeductions || {};
      const cutPercent = Number(gameCuts[gameType] !== undefined ? gameCuts[gameType] : (db.bonusCommissionSettings?.winningDeductionPercent ?? 0));

      if (isWin && payoutRate > 0) {
        bet.status = 'won';
        // Formula: Profit = Gross Win - Original Stake; Deduction = Profit * (cutPercent / 100); Net Payout = Gross Win - Deduction
        const grossWin = Number((bet.totalAmount * payoutRate).toFixed(2));
        const profit = Math.max(0, Number((grossWin - bet.totalAmount).toFixed(2)));
        const gstCutAmount = Number(((profit * cutPercent) / 100).toFixed(2));
        const netWinAmount = Number(Math.max(0, grossWin - gstCutAmount).toFixed(2));

        bet.winAmount = netWinAmount;
        bet.taxAmount = gstCutAmount;
        (bet as any).grossWinAmount = grossWin;
        (bet as any).profitAmount = profit;
        (bet as any).gstCutPercent = cutPercent;
        (bet as any).gstCutAmount = gstCutAmount;
        bet.resultNumber = resultNum;
        bet.resultColor = resultColor;
        bet.resultBigSmall = resultBigSmall;

        // Credit user wallet with net amount immediately in memory
        const user = db.getUser(bet.uid) || db.users.get(bet.uid);
        if (user) {
          const prevBal = user.walletBalance;
          user.walletBalance = Number((user.walletBalance + netWinAmount).toFixed(2));
          user.totalWin = Number((user.totalWin + netWinAmount).toFixed(2));
          user.vipExp += Math.floor(bet.totalAmount / 10);

          const winTx = {
            id: `TX-WIN-${Date.now()}-${bet.id}`,
            uid: user.uid,
            type: 'win' as const,
            amount: netWinAmount,
            grossAmount: grossWin,
            gstPercent: cutPercent,
            gstAmount: gstCutAmount,
            previousBalance: prevBal,
            newBalance: user.walletBalance,
            reference: `Period #${period.periodId} Win`,
            createdBy: 'system',
            note: `Win on ${bet.gameType} (${String(bet.selection).toUpperCase()}): Net ₹${netWinAmount.toFixed(2)}`,
            createdAt: new Date().toISOString(),
          };
          db.transactions.unshift(winTx as any);
          bgPersistTasks.push(() => {
            saveTransactionPermanently(winTx as any).catch(() => {});
          });

          // Rolling strictly calculated from eligible game P&L (Win: Net profit only, stake does NOT count)
          db.applySettledBetRolling(user, bet);

          // Check VIP rank up
          this.checkVipPromotion(user);

          bgPersistTasks.push(() => {
            saveUserPermanently(user).catch(() => {});
          });
        }
      } else {
        bet.status = 'lost';
        bet.winAmount = 0;
        bet.resultNumber = resultNum;
        bet.resultColor = resultColor;
        bet.resultBigSmall = resultBigSmall;

        const user = db.getUser(bet.uid) || db.users.get(bet.uid);
        if (user) {
          const loss = bet.totalAmount;
          user.totalLoss = Number(((user.totalLoss || 0) + loss).toFixed(2));
          user.vipExp += Math.floor(bet.totalAmount / 10);

          // Rolling strictly calculated from eligible game P&L (Loss: Lost stake amount)
          db.applySettledBetRolling(user, bet);

          this.checkVipPromotion(user);
          bgPersistTasks.push(() => {
            saveUserPermanently(user).catch(() => {});
          });
        }
      }
      bgPersistTasks.push(() => {
        saveBetPermanently(bet).catch(() => {});
      });
    });

    // Push into results history (keep latest 600 items for 50+ pages pagination)
    const history = db.resultsHistory.get(gameType) || [];
    history.unshift({ ...period });
    if (history.length > 600) history.pop();
    db.resultsHistory.set(gameType, history);

    // Create next period strictly aligned with the universal wall clock boundary
    const duration = this.getGameDuration(gameType);
    let aligned = this.getAlignedPeriodTimes(duration, now);
    if (aligned.endTime <= now) {
      aligned = this.getAlignedPeriodTimes(duration, now, 1);
    }

    const nextPeriod: GamePeriod = {
      periodId: this.generatePeriodId(gameType),
      gameType,
      durationSeconds: duration,
      startTime: aligned.startTime,
      endTime: aligned.endTime,
      lockTime: aligned.lockTime,
      status: (aligned.endTime - now <= 5000) ? 'betting_locked' : 'betting_open',
      totalBetsCount: 0,
      totalBetAmount: 0,
      totalPotentialPayout: 0,
      manualResultNumber: null,
    };

    db.currentPeriods.set(gameType, nextPeriod);
    this.schedulePreciseRollover(gameType, nextPeriod);

    // Finalize settlement locks and broadcast to all connected clients immediately
    this.settledPeriodIds.add(period.periodId);
    this.settlingPeriodIds.delete(periodKey);

    // ⚡ ZERO-LATENCY INSTANT BROADCAST (Target < 0.1ms)
    // Broadcast settled results and settled bets immediately before background disk I/O
    if (this.onPeriodSettled) {
      const updatedHistory = (db.resultsHistory.get(gameType) || []).slice(0, 500);
      try {
        this.onPeriodSettled({
          gameType,
          period: { ...period },
          nextPeriod: { ...nextPeriod },
          history: updatedHistory,
          settledBets: periodBets.map(b => ({
            id: b.id,
            uid: b.uid,
            gameType: b.gameType,
            periodId: b.periodId,
            betType: b.betType,
            selection: b.selection,
            unitAmount: b.unitAmount,
            multiplier: b.multiplier,
            totalAmount: b.totalAmount,
            status: b.status,
            winAmount: b.winAmount,
            taxAmount: b.taxAmount,
            grossWinAmount: (b as any).grossWinAmount,
            resultNumber: b.resultNumber,
            resultColor: b.resultColor,
            resultBigSmall: b.resultBigSmall,
            createdAt: b.createdAt,
          })),
        });
      } catch (e) {
        console.error('Error in onPeriodSettled broadcast:', e);
      }
    }

    // Save changes to disk and cloud asynchronously so it never blocks or delays real-time execution
    setImmediate(() => {
      try {
        bgPersistTasks.forEach(fn => {
          try { fn(); } catch (_) {}
        });
        db.saveToDisk();
      } catch (_) {}
    });
  }

  public calculatePotentialPayouts(gameType: GameType, periodId: string) {
    const periodBets = db.bets.filter(b => b.periodId === periodId && b.gameType === gameType && b.status === 'pending');
    const totalBetAmount = periodBets.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

    const outcomes: Array<{ number: number; payout: number; profitDiff: number; profit?: number; loss?: number }> = [];

    for (let num = 0; num <= 9; num++) {
      let totalPayoutForNum = 0;
      const isBig = num >= 5;
      const bigSmall = isBig ? 'big' : 'small';

      periodBets.forEach(bet => {
        const base = bet.totalAmount || bet.amountAfterTax || 0;
        if (bet.betType === 'number') {
          if (parseInt(String(bet.selection), 10) === num) {
            totalPayoutForNum += base * 9;
          }
        } else if (bet.betType === 'big_small') {
          if (String(bet.selection).toLowerCase() === bigSmall) {
            totalPayoutForNum += base * 2;
          }
        } else if (bet.betType === 'color') {
          const selColor = String(bet.selection).toLowerCase();
          if (selColor === 'green') {
            if (num === 5) totalPayoutForNum += base * 1.5;
            else if ([1, 3, 7, 9].includes(num)) totalPayoutForNum += base * 2;
          } else if (selColor === 'red') {
            if (num === 0) totalPayoutForNum += base * 1.5;
            else if ([2, 4, 6, 8].includes(num)) totalPayoutForNum += base * 2;
          } else if (selColor === 'violet') {
            if (num === 0 || num === 5) totalPayoutForNum += base * 4.5;
          }
        }
      });

      const profitDiff = Number((totalBetAmount - totalPayoutForNum).toFixed(2));
      const profit = Math.max(0, profitDiff);
      const loss = profitDiff < 0 ? Math.abs(profitDiff) : 0;
      outcomes.push({
        number: num,
        payout: Number(totalPayoutForNum.toFixed(2)),
        profitDiff,
        profit: Number(profit.toFixed(2)),
        loss: Number(loss.toFixed(2)),
      });
    }

    // Retrieve previous round result for variety
    const history = db.resultsHistory.get(gameType) || [];
    const prevNum = history[0]?.resultNumber;

    // If NO bets have been placed on this round yet (totalBetAmount === 0):
    // Produce varied, natural random distribution so result is never stuck on a single number
    if (totalBetAmount === 0) {
      let pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      if (typeof prevNum === 'number') {
        pool = pool.filter(n => n !== prevNum);
      }
      const randomNum = pool[Math.floor(Math.random() * pool.length)];
      const r1 = (randomNum + 1) % 10;
      const r2 = (randomNum + 3) % 10;
      const r3 = (randomNum + 7) % 10;
      const r4 = (randomNum + 9) % 10;
      return {
        totalBetAmount: 0,
        outcomes,
        houseBest: { number: randomNum, payout: 0, profitDiff: 0 },
        target75: { number: r1, payout: 0, profitDiff: 0 },
        target50: { number: r2, payout: 0, profitDiff: 0 },
        target25: { number: r3, payout: 0, profitDiff: 0 },
        target100: { number: r4, payout: 0, profitDiff: 0 },
      };
    }

    // Helper function to pick randomly among elements with the closest target value
    const pickClosestDeterministic = (targetVal: number) => {
      let minDiff = Infinity;
      outcomes.forEach(o => {
        const diff = Math.abs(o.payout - targetVal);
        if (diff < minDiff) minDiff = diff;
      });
      let candidates = outcomes.filter(o => Math.abs(o.payout - targetVal) <= minDiff + 0.001);
      if (typeof prevNum === 'number' && candidates.length > 1) {
        const nonPrev = candidates.filter(c => c.number !== prevNum);
        if (nonPrev.length > 0) candidates = nonPrev;
      }
      return candidates[Math.floor(Math.random() * candidates.length)] || outcomes[0];
    };

    // House Best = lowest payout to players (maximum company profit)
    // Randomize among tied minimum payout candidates to prevent always picking 0
    const minPayout = Math.min(...outcomes.map(o => o.payout));
    const houseBestCandidates = outcomes.filter(o => Math.abs(o.payout - minPayout) < 0.001);
    let filteredHouseBest = houseBestCandidates;
    if (typeof prevNum === 'number' && houseBestCandidates.length > 1) {
      const nonPrev = houseBestCandidates.filter(c => c.number !== prevNum);
      if (nonPrev.length > 0) filteredHouseBest = nonPrev;
    }
    const houseBest = filteredHouseBest[Math.floor(Math.random() * filteredHouseBest.length)] || outcomes[0];

    // Targets:
    // 75% profit target = closest to payout of 25% of pool
    const target75Payout = totalBetAmount * 0.25;
    const target75 = pickClosestDeterministic(target75Payout);

    // 50% profit target = closest to payout of 50% of pool
    const target50Payout = totalBetAmount * 0.50;
    const target50 = pickClosestDeterministic(target50Payout);

    // 25% profit target = closest to payout of 75% of pool
    const target25Payout = totalBetAmount * 0.75;
    const target25 = pickClosestDeterministic(target25Payout);

    // 100% win target = highest payout to players
    const maxPayout = Math.max(...outcomes.map(o => o.payout));
    const maxCandidates = outcomes.filter(o => Math.abs(o.payout - maxPayout) < 0.001);
    const target100 = maxCandidates[Math.floor(Math.random() * maxCandidates.length)] || houseBest;

    return {
      totalBetAmount,
      outcomes,
      houseBest,
      target75,
      target50,
      target25,
      target100,
    };
  }

  private checkVipPromotion(user: any) {
    for (let i = db.vipLevels.length - 1; i >= 0; i--) {
      const v = db.vipLevels[i];
      if (user.vipExp >= v.requiredExp && user.totalBet >= v.requiredTurnover) {
        if (user.vipLevel < v.level) {
          user.vipLevel = v.level;
          // Award VIP upgrade reward if any
          if (v.reward > 0) {
            user.walletBalance += v.reward;
            db.transactions.unshift({
              id: `TX-VIP-${Date.now()}`,
              uid: user.uid,
              type: 'bonus',
              amount: v.reward,
              previousBalance: user.walletBalance - v.reward,
              newBalance: user.walletBalance,
              reference: `VIP ${v.level} Upgrade Bonus`,
              createdBy: 'system',
              note: `Unlocked VIP Level ${v.level}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
        break;
      }
    }
  }

  public placeBet(uid: string, gameType: GameType, betType: any, selection: any, amount: number, multiplier: number = 1): { success: boolean; message: string; bet?: Bet } {
    const user = db.users.get(uid);
    if (!user) return { success: false, message: 'User not found' };
    if (user.status === 'blocked') return { success: false, message: 'Your account is blocked. Contact support.' };

    // Mandatory rule: User must deposit at least ₹100 before betting can be placed
    const betCheck = db.isBettingAllowedForUser(user);
    if (!betCheck.allowed) {
      return { success: false, message: betCheck.message || 'Deposit ₹100 or more to unlock betting' };
    }

    const totalAmount = amount * multiplier;
    if (totalAmount <= 0) return { success: false, message: 'Invalid bet amount' };
    if (user.walletBalance < totalAmount) return { success: false, message: 'Insufficient wallet balance. Please recharge.' };

    const currentPeriod = db.currentPeriods.get(gameType);
    if (!currentPeriod) return { success: false, message: 'Game period unavailable' };

    const now = Date.now();
    if (currentPeriod.status === 'betting_locked' || currentPeriod.endTime - now <= 5000) {
      return { success: false, message: 'Betting is currently locked for this round. Wait for next round!' };
    }

    const setting = db.gameSettings.get(gameType);
    if (setting) {
      if (!setting.enabled) return { success: false, message: 'This game is currently disabled by administrator' };
      if (totalAmount < setting.minBet) return { success: false, message: `Minimum bet is ₹${setting.minBet}` };
      if (totalAmount > setting.maxBet) return { success: false, message: `Maximum bet is ₹${setting.maxBet}` };
    }

    // Deduct balance
    const prevBalance = user.walletBalance;
    user.walletBalance = Number((user.walletBalance - totalAmount).toFixed(2));
    user.totalBet = Number((user.totalBet + totalAmount).toFixed(2));
    // Note: Rolling / Turnover is counted upon Profit / Loss settlement, not on placed stake.

    // Effective bet base amount is 100% of user stake (no upfront entry tax cut)
    const amountAfterTax = totalAmount;
    const taxAmount = 0;

    // Generate Order Number
    const orderNumber = `ORD${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    // Create bet record
    const bet: Bet = {
      id: `BET-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      orderNumber,
      periodId: currentPeriod.periodId,
      gameType,
      uid: user.uid,
      username: user.username,
      betType,
      selection,
      amount,
      multiplier,
      totalAmount,
      taxAmount,
      amountAfterTax,
      winAmount: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.bets.unshift(bet);

    // Update current period stats
    currentPeriod.totalBetsCount += 1;
    currentPeriod.totalBetAmount += totalAmount;
    currentPeriod.totalPotentialPayout += (betType === 'number' ? totalAmount * 9 : totalAmount * 2);

    // Add debit transaction
    const betTx = {
      id: `TX-BET-${Date.now()}`,
      uid: user.uid,
      type: 'bet',
      amount: -totalAmount,
      previousBalance: prevBalance,
      newBalance: user.walletBalance,
      reference: `Period #${currentPeriod.periodId} Bet`,
      createdBy: 'user',
      note: `Bet on ${String(selection).toUpperCase()} (${multiplier}x)`,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(betTx as any);
    saveTransactionPermanently(betTx).catch(() => {});
    saveBetPermanently(bet).catch(() => {});
    saveUserPermanently(user).catch(() => {});

    db.saveToDisk();

    return { success: true, message: 'Bet placed successfully!', bet };
  }
}

export const gameEngine = new WingoGameEngine();
