import { db } from './db.js';
import { GameType, GamePeriod, ColorResult, BigSmallResult, Bet } from '../src/types.js';

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

  private initAllPeriods() {
    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];
    const now = Date.now();

    gameTypes.forEach(gt => {
      const duration = this.getGameDuration(gt);
      const aligned = this.getAlignedPeriodTimes(duration, now);

      const existing = db.currentPeriods.get(gt);
      // Check if existing period is valid, not completed, and already aligned to the exact boundary
      if (existing && existing.periodId && existing.endTime === aligned.endTime && existing.status !== 'completed') {
        return;
      }

      // If existing period expired while server was restarting, settle it cleanly
      if (existing && existing.periodId && existing.endTime <= now && existing.status !== 'completed') {
        this.settlePeriod(gt, existing);
        return;
      }

      const period: GamePeriod = {
        periodId: this.generatePeriodId(gt),
        gameType: gt,
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

      db.currentPeriods.set(gt, period);
    });
  }

  private startEngine() {
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stopEngine() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private tick() {
    const now = Date.now();
    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];

    gameTypes.forEach(gt => {
      const current = db.currentPeriods.get(gt);
      if (!current) return;

      const setting = db.gameSettings.get(gt);
      if (setting && !setting.enabled) return;

      const remainingMs = current.endTime - now;

      // Check lock state (final 5 seconds)
      if (remainingMs <= 5000 && current.status === 'betting_open') {
        current.status = 'betting_locked';
      }

      // Check completion
      if (remainingMs <= 0) {
        this.settlePeriod(gt, current);
      }
    });
  }

  public settlePeriod(gameType: GameType, period: GamePeriod, forceNumber?: number) {
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
          predictionOverrideNum = candidateNums[Math.floor(Math.random() * candidateNums.length)];
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
        else if (matchedMode === 'fair') resultNum = Math.floor(Math.random() * 10);
        else resultNum = sim.houseBest.number;
      } else if (mode === 'fair') {
        resultNum = Math.floor(Math.random() * 10);
      } else {
        resultNum = sim.houseBest.number;
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

        // Credit user wallet with net amount
        const user = db.users.get(bet.uid);
        if (user) {
          const prevBalance = user.walletBalance;
          user.walletBalance = Number((user.walletBalance + netWinAmount).toFixed(2));
          user.totalWin = Number((user.totalWin + netWinAmount).toFixed(2));
          user.vipExp += Math.floor(bet.totalAmount / 10);

          // Rolling / Turnover based on Profit & Loss:
          // If win gives profit (netWinAmount > bet.totalAmount), profit amount counts towards rolling.
          // If win is partial (netWinAmount < bet.totalAmount), loss amount counts towards rolling.
          const netOutcome = Number((netWinAmount - bet.totalAmount).toFixed(2));
          const rollingEarned = netOutcome >= 0 ? netOutcome : Math.abs(netOutcome);
          if (rollingEarned > 0) {
            user.completedTurnover = Number(((user.completedTurnover || 0) + rollingEarned).toFixed(2));
            user.currentTurnover = Number(((user.currentTurnover || 0) + rollingEarned).toFixed(2));
            user.remainingTurnover = Math.max(0, Number(((user.remainingTurnover ?? (user.requiredTurnover || 0)) - rollingEarned).toFixed(2)));
          }

          // Check VIP rank up
          this.checkVipPromotion(user);

          // Formulate clear GST transaction note
          const noteText = cutPercent > 0
            ? `Win ₹${grossWin.toFixed(2)} (GST ${cutPercent}% -₹${gstCutAmount.toFixed(2)} deducted) Net ₹${netWinAmount.toFixed(2)}`
            : `Win ₹${netWinAmount.toFixed(2)} on Win Go ${gameType} (${String(bet.selection).toUpperCase()})`;

          // Add transaction
          db.transactions.unshift({
            id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            uid: user.uid,
            type: 'win',
            amount: netWinAmount,
            grossAmount: grossWin,
            gstPercent: cutPercent,
            gstAmount: gstCutAmount,
            previousBalance: prevBalance,
            newBalance: user.walletBalance,
            reference: `Period #${period.periodId} Win`,
            createdBy: 'system',
            note: noteText,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        bet.status = 'lost';
        bet.winAmount = 0;
        bet.resultNumber = resultNum;
        bet.resultColor = resultColor;
        bet.resultBigSmall = resultBigSmall;

        const user = db.users.get(bet.uid);
        if (user) {
          const loss = bet.totalAmount;
          user.totalLoss = Number((user.totalLoss + loss).toFixed(2));
          user.vipExp += Math.floor(bet.totalAmount / 10);

          // Rolling / Turnover based on Loss:
          user.completedTurnover = Number(((user.completedTurnover || 0) + loss).toFixed(2));
          user.currentTurnover = Number(((user.currentTurnover || 0) + loss).toFixed(2));
          user.remainingTurnover = Math.max(0, Number(((user.remainingTurnover ?? (user.requiredTurnover || 0)) - loss).toFixed(2)));

          this.checkVipPromotion(user);
        }
      }
    });

    // Push into results history (keep latest 600 items for 50+ pages pagination)
    const history = db.resultsHistory.get(gameType) || [];
    history.unshift({ ...period });
    if (history.length > 600) history.pop();
    db.resultsHistory.set(gameType, history);

    // Save changes to disk
    db.saveToDisk();

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
  }

  public calculatePotentialPayouts(gameType: GameType, periodId: string) {
    const periodBets = db.bets.filter(b => b.periodId === periodId && b.gameType === gameType && b.status === 'pending');
    const totalBetAmount = periodBets.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

    const outcomes: Array<{ number: number; payout: number; profitDiff: number }> = [];

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
      outcomes.push({
        number: num,
        payout: Number(totalPayoutForNum.toFixed(2)),
        profitDiff,
      });
    }

    // If NO bets have been placed on this round yet (totalBetAmount === 0):
    // Produce varied, natural random distribution so result is never stuck on a single number
    if (totalBetAmount === 0) {
      const randomNum = Math.floor(Math.random() * 10);
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
      const candidates = outcomes.filter(o => Math.abs(o.payout - targetVal) <= minDiff + 0.001);
      return candidates[Math.floor(Math.random() * candidates.length)] || outcomes[0];
    };

    // House Best = lowest payout to players (maximum company profit)
    // Randomize among tied minimum payout candidates to prevent always picking 0
    const minPayout = Math.min(...outcomes.map(o => o.payout));
    const houseBestCandidates = outcomes.filter(o => Math.abs(o.payout - minPayout) < 0.001);
    const houseBest = houseBestCandidates[Math.floor(Math.random() * houseBestCandidates.length)] || outcomes[0];

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
    db.transactions.unshift({
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
    });

    // Check referral commission if user has referrer
    if (user.referredBy) {
      const referrer = db.users.get(user.referredBy);
      if (referrer) {
        const commission = Number((totalAmount * 0.006).toFixed(2)); // 0.6%
        if (commission > 0) {
          const refPrevBalance = referrer.walletBalance;
          referrer.walletBalance = Number((referrer.walletBalance + commission).toFixed(2));
          db.transactions.unshift({
            id: `TX-REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            uid: referrer.uid,
            type: 'referral_commission',
            amount: commission,
            previousBalance: refPrevBalance,
            newBalance: referrer.walletBalance,
            reference: `Bet Commission from UID ${user.uid}`,
            createdBy: 'system',
            note: `0.6% agent commission from sub-player bet`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    db.saveToDisk();

    return { success: true, message: 'Bet placed successfully!', bet };
  }
}

export const gameEngine = new WingoGameEngine();
