import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { GameType, GamePeriod, Bet, BetType, BetSelection } from '../../types.js';
import { BALL_ASSETS, TIMER_ASSETS } from '../../constants/assets.js';
import { soundEngine } from '../../utils/audio.js';
import { UserLogo } from './UserLogo.js';
import { WatchIcon } from './WatchIcon.js';
import { WingoBall } from './WingoBall.js';
import {
  ChevronLeft, RefreshCw, Volume2, VolumeX, Headphones, BookOpen,
  ChevronRight, ChevronDown, ChevronUp, Flame, Copy, X, Trophy, Frown, Check, Sparkles, Zap
} from 'lucide-react';

interface UserWingoGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
  onNavigateWithdraw: () => void;
  onOpenSupport: () => void;
  onOpenHowToPlay: () => void;
}

export const UserWingoGameView: React.FC<UserWingoGameViewProps> = ({
  onBack,
  onNavigateDeposit,
  onNavigateWithdraw,
  onOpenSupport,
  onOpenHowToPlay,
}) => {
  const { user, refreshUser, showToast } = useAuth();
  const [selectedGameType, setSelectedGameType] = useState<GameType>('wingo_30s');

  // Game & Period State
  const [period, setPeriod] = useState<any>(null);
  const [history, setHistory] = useState<GamePeriod[]>([]);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  // Tabs: 'game_history' | 'chart' | 'my_bets'
  const [bottomTab, setBottomTab] = useState<'game_history' | 'chart' | 'my_bets'>('game_history');
  const [currentPage, setCurrentPage] = useState(1);
  const [myBetsPage, setMyBetsPage] = useState(1);
  const rowsPerPage = 10;

  // Bet Dialog State
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [betType, setBetType] = useState<BetType>('number');
  const [selectedBet, setSelectedBet] = useState<BetSelection | null>(null);
  const [unitAmount, setUnitAmount] = useState<number>(1);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [submittingBet, setSubmittingBet] = useState(false);

  // Accordion Expand State for My History items (replacing popup modal with smooth inline slide-down)
  const [expandedBetIds, setExpandedBetIds] = useState<Set<string>>(new Set());

  const toggleBetExpand = (betId: string) => {
    setExpandedBetIds((prev) => {
      const next = new Set(prev);
      if (next.has(betId)) {
        next.delete(betId);
      } else {
        next.add(betId);
      }
      return next;
    });
  };

  // Order Details Modal (fallback)
  const [selectedOrder, setSelectedOrder] = useState<Bet | null>(null);

  // Result Popups (Win & Loss) - Auto-closes in 3 seconds as requested
  const [resultBet, setResultBet] = useState<{ bet: Bet; type: 'won' | 'lost' } | null>(null);

  // Auto-close WinGo winning/result modal after exactly 3 seconds
  useEffect(() => {
    if (!resultBet) return;
    const timer = setTimeout(() => {
      setResultBet(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [resultBet]);
  const knownSettledBets = useRef<Set<string>>(new Set());
  const settledPeriodsShownPopup = useRef<Set<string>>(new Set());
  const expiredHandledPeriodId = useRef<string>('');
  const myBetsRef = useRef<Bet[]>([]);
  const lastBeepedSec = useRef<number | null>(null);
  const lastKnownPeriodId = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchedTime = useRef<number>(0);
  const periodRef = useRef<any>(null);
  const selectedGameTypeRef = useRef<GameType>(selectedGameType);
  const periodsMapRef = useRef<Record<string, any>>({});
  const historyMapRef = useRef<Record<string, GamePeriod[]>>({});

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const refreshUserRef = useRef(refreshUser);
  useEffect(() => { refreshUserRef.current = refreshUser; }, [refreshUser]);

  useEffect(() => {
    myBetsRef.current = myBets;
  }, [myBets]);

  useEffect(() => {
    selectedGameTypeRef.current = selectedGameType;
  }, [selectedGameType]);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  // Safe setter that guarantees monotonic period progression and prevents stale responses from causing blinks
  const safeSetPeriod = useCallback((nextPeriod: any) => {
    if (!nextPeriod || !nextPeriod.periodId) return;
    setPeriod((currentPeriod: any) => {
      if (!currentPeriod || !currentPeriod.periodId) {
        return nextPeriod;
      }
      // Never allow a stale/older periodId to overwrite the newer active round
      if (String(nextPeriod.periodId) < String(currentPeriod.periodId)) {
        return currentPeriod;
      }
      return nextPeriod;
    });
  }, []);

  const safeSetPeriodRef = useRef(safeSetPeriod);
  useEffect(() => { safeSetPeriodRef.current = safeSetPeriod; }, [safeSetPeriod]);

  // High-precision server clock offset (calibrated via NTP round-trip time)
  const serverClockOffsetRef = useRef<number>(0);

  // High-precision clock ticker for smooth, zero-delay countdown (50ms ultra-pulse)
  const [localNow, setLocalNow] = useState<number>(Date.now());
  useEffect(() => {
    const clock = setInterval(() => {
      setLocalNow(Date.now());
    }, 50);
    return () => clearInterval(clock);
  }, []);

  // Chart Container & Line
  const chartTableRef = useRef<HTMLTableElement>(null);
  const [lineCoords, setLineCoords] = useState<{ x: number; y: number }[]>([]);

  // Prevent background scroll when bet slip is open
  useEffect(() => {
    if (showBetSlip) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showBetSlip]);

  // Fetch live game data
  const fetchGame = async (targetGameType: GameType = selectedGameTypeRef.current, force: boolean = false) => {
    // Avoid double fetch unless forced or in-flight request is stalled for > 2000ms
    if (!force && isFetchingRef.current && Date.now() - lastFetchedTime.current < 2000) return;
    isFetchingRef.current = true;
    const reqStart = Date.now();
    lastFetchedTime.current = reqStart;
    try {
      const res = await api.getLiveGame(targetGameType);
      const reqEnd = Date.now();
      // Calibrate server clock offset with network RTT adjustment for flawless multi-device sync
      if (res?.serverTime) {
        const rtt = Math.max(0, reqEnd - reqStart);
        const estimatedServerNow = res.serverTime + Math.round(rtt / 2);
        serverClockOffsetRef.current = estimatedServerNow - reqEnd;
      }

      if (res?.period) {
        periodsMapRef.current[targetGameType] = res.period;
        if (Array.isArray(res.history)) {
          historyMapRef.current[targetGameType] = res.history;
        }

        if (targetGameType === selectedGameTypeRef.current) {
          if (lastKnownPeriodId.current && res.period.periodId !== lastKnownPeriodId.current) {
            refreshUserRef.current();
          }
          lastKnownPeriodId.current = res.period.periodId;
          safeSetPeriodRef.current(res.period);
          if (res.history) {
            setHistory(res.history);
          }

          // Sound trigger for final 5 seconds countdown using synchronized server clock
          const syncedNow = Date.now() + serverClockOffsetRef.current;
          const sec = res.period.endTime
            ? Math.max(0, Math.floor((res.period.endTime - syncedNow) / 1000))
            : (res.period.remainingSeconds ?? 0);
          if (sec >= 1 && sec <= 5) {
            if (lastBeepedSec.current !== sec) {
              lastBeepedSec.current = sec;
              soundEngine.playCountdownBeep(sec, isMutedRef.current);
            }
          } else if (sec > 5) {
            lastBeepedSec.current = null;
          }
        }
      }

      const activeUid = userRef.current?.uid || (userRef.current ? String(userRef.current.id).replace(/^u-/, '') : '');
      if (activeUid) {
        const betsRes = await api.getMyBets(activeUid, targetGameType);
        if (betsRes?.bets && targetGameType === selectedGameTypeRef.current) {
          // Strictly filter only WinGo bets for the current game type (exclude mines, aviator, chicken road, roulette, plinko)
          const wingoBetsOnly = (betsRes.bets as Bet[]).filter((b) => {
            const isMatchingWingo = b.gameType === targetGameType;
            const isNonWingoPeriod = b.periodId && /^(MINES|AVIATOR|CHICKEN|PLINKO|ROULETTE)/i.test(b.periodId);
            return isMatchingWingo && !isNonWingoPeriod;
          });
          setMyBets(wingoBetsOnly);

          // Group recently settled bets by periodId to show combined winning modal
          const newlySettledByPeriod: Record<string, Bet[]> = {};
          wingoBetsOnly.forEach((b: Bet) => {
            if (b.status !== 'pending' && !knownSettledBets.current.has(b.id)) {
              knownSettledBets.current.add(b.id);
              const diffMs = Date.now() - new Date(b.createdAt).getTime();
              // Only trigger popup for recently resolved bets (within 45s)
              if (diffMs < 45000) {
                if (!newlySettledByPeriod[b.periodId]) {
                  newlySettledByPeriod[b.periodId] = [];
                }
                newlySettledByPeriod[b.periodId].push(b);
              }
            }
          });

          // Show combined popup for each period
          Object.entries(newlySettledByPeriod).forEach(([pId, periodBetsList]) => {
            if (settledPeriodsShownPopup.current.has(pId)) return;
            settledPeriodsShownPopup.current.add(pId);
            const winning = periodBetsList.filter(b => b.status === 'won');
            if (winning.length > 0) {
              const totalWin = winning.reduce((acc, b) => acc + (b.winAmount || 0), 0);
              const combined = { ...winning[0], winAmount: totalWin };
              setResultBet({ bet: combined, type: 'won' });
              soundEngine.playWinSound(isMutedRef.current);
            } else if (periodBetsList.length > 0) {
              setResultBet({ bet: periodBetsList[0], type: 'lost' });
              soundEngine.playLossSound(isMutedRef.current);
            }
          });
        }
      }
    } catch {
      // quiet
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchGame(selectedGameType);
  }, [selectedGameType, user?.uid]);

  // ⚡ INSTANT COUNTDOWN EXPIRY TRIGGER (0.0001 sec)
  // The exact millisecond effectiveRemainingSec hits 0 (syncedNow >= period.endTime), trigger instant check
  useEffect(() => {
    if (!period || !period.endTime) return;
    const syncedNow = localNow + serverClockOffsetRef.current;
    if (syncedNow >= period.endTime) {
      if (expiredHandledPeriodId.current !== period.periodId) {
        expiredHandledPeriodId.current = period.periodId;
        fetchGame(selectedGameTypeRef.current, true);
      }
    }
  }, [localNow, period]);

  // Clean fallback timer for synchronization (checks every 400ms when expired)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const curPeriod = periodRef.current;
      const syncedNow = Date.now() + serverClockOffsetRef.current;
      const remainingMs = curPeriod?.endTime ? (curPeriod.endTime - syncedNow) : 0;
      // If period has elapsed and not yet advanced, immediately query server
      if (remainingMs <= 0) {
        fetchGame(selectedGameTypeRef.current, true);
      }
    }, 400);

    return () => {
      clearInterval(timer);
      soundEngine.stopAll();
    };
  }, []);

  // Real-Time Global Instant Synchronizer via Server-Sent Events (SSE)
  // Ensures ALL users receive Wingo results and clock updates at the exact same millisecond (target <= 0.0001 sec)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/game/events');

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if ((data.type === 'sync_clock' || data.type === 'connected') && data.serverTime) {
            serverClockOffsetRef.current = data.serverTime - Date.now();
            if (data.periods) {
              Object.keys(data.periods).forEach(gt => {
                periodsMapRef.current[gt] = data.periods[gt];
              });
              const currentP = data.periods[selectedGameTypeRef.current];
              if (currentP) {
                safeSetPeriodRef.current(currentP);
              }
            }
          } else if (data.type === 'period_settled') {
            // Update cached state for this gameType
            if (data.nextPeriod) {
              periodsMapRef.current[data.gameType] = data.nextPeriod;
            }
            const newHistItem: any = {
              periodId: data.periodId,
              gameType: data.gameType,
              resultNumber: data.resultNumber,
              resultColor: data.resultColor,
              resultBigSmall: data.resultBigSmall,
              status: 'completed',
              completedAt: data.completedAt || new Date().toISOString(),
              durationSeconds: data.nextPeriod?.durationSeconds || 60,
              startTime: 0,
              endTime: 0,
              lockTime: 0,
              totalBetsCount: 0,
              totalBetAmount: 0,
              totalPotentialPayout: 0,
              manualResultNumber: null,
            };

            let baseHistory: any[] = [];
            if (Array.isArray(data.history) && data.history.length > 0) {
              baseHistory = data.history;
            } else {
              baseHistory = [newHistItem, ...(historyMapRef.current[data.gameType] || [])];
            }

            // Guarantee new result is at the top without duplicates
            if (baseHistory.length === 0 || baseHistory[0]?.periodId !== data.periodId) {
              baseHistory = [newHistItem, ...baseHistory.filter((h: any) => h?.periodId !== data.periodId)];
            }

            const seenIds = new Set<string>();
            const dedupedHistory = baseHistory.filter((h: any) => {
              if (!h || !h.periodId || seenIds.has(h.periodId)) return false;
              seenIds.add(h.periodId);
              return true;
            });

            historyMapRef.current[data.gameType] = dedupedHistory;

            // ⚡ Target <= 0.0001 sec instant update for the active game view
            if (data.gameType === selectedGameTypeRef.current) {
              // 1. Immediately update history (balls, results, charts) in 0.0001 sec
              setHistory(dedupedHistory);

              // 2. Immediately advance to next period
              if (data.nextPeriod) {
                safeSetPeriodRef.current(data.nextPeriod);
                lastKnownPeriodId.current = data.nextPeriod.periodId;
              }

              // 3. ⚡ ZERO-LATENCY INSTANT WINNING POPUP TRIGGER (0.0001 sec)
              // Synchronously resolve user bets from SSE settledBets or client memory with 0 HTTP delay
              const currentUid = userRef.current?.uid || (userRef.current ? String(userRef.current.id).replace(/^u-/, '') : '');

              const serverSettledBets = Array.isArray(data.settledBets)
                ? data.settledBets.filter((b: any) => {
                    if (!currentUid) return true;
                    const bUid = String(b.uid || b.userId || '').replace(/^u-/, '');
                    return bUid === currentUid || b.uid === userRef.current?.uid;
                  })
                : [];

              // Resolve all user bets placed for this period immediately in memory
              const matchingBets = myBetsRef.current.filter((b) => b.periodId === data.periodId);
              let resolvedForPeriod: Bet[] = [];

              if (serverSettledBets.length > 0) {
                resolvedForPeriod = serverSettledBets;
                setMyBets((prev) => {
                  const updated = prev.map((b) => {
                    const match = serverSettledBets.find((ib: any) => ib.id === b.id);
                    return match ? { ...b, ...match } : b;
                  });
                  serverSettledBets.forEach((ib: any) => {
                    if (!updated.some((b) => b.id === ib.id)) {
                      updated.unshift(ib);
                    }
                  });
                  return updated;
                });
              } else if (matchingBets.length > 0) {
                const resNum = data.resultNumber;
                const resColor = data.resultColor;
                const resBigSmall = data.resultBigSmall;

                resolvedForPeriod = matchingBets.map((b) => {
                  if (b.status !== 'pending') return b;
                  let isWin = false;
                  let grossWin = 0;
                  const base = b.totalAmount || (b.unitAmount * b.multiplier) || 0;

                  if (b.betType === 'number') {
                    if (parseInt(String(b.selection), 10) === resNum) {
                      isWin = true;
                      grossWin = base * 9;
                    }
                  } else if (b.betType === 'big_small') {
                    if (String(b.selection).toLowerCase() === String(resBigSmall).toLowerCase()) {
                      isWin = true;
                      grossWin = base * 2;
                    }
                  } else if (b.betType === 'color') {
                    const selColor = String(b.selection).toLowerCase();
                    if (selColor === 'green') {
                      if (resNum === 5) { isWin = true; grossWin = base * 1.5; }
                      else if ([1, 3, 7, 9].includes(resNum)) { isWin = true; grossWin = base * 2; }
                    } else if (selColor === 'red') {
                      if (resNum === 0) { isWin = true; grossWin = base * 1.5; }
                      else if ([2, 4, 6, 8].includes(resNum)) { isWin = true; grossWin = base * 2; }
                    } else if (selColor === 'violet') {
                      if (resNum === 0 || resNum === 5) { isWin = true; grossWin = base * 4.5; }
                    }
                  }

                  const profit = Math.max(0, grossWin - base);
                  const cutAmount = Number(((profit * 5) / 100).toFixed(2));
                  const netWin = isWin ? Math.max(0, grossWin - cutAmount) : 0;

                  return {
                    ...b,
                    status: (isWin ? 'won' : 'lost') as any,
                    winAmount: netWin,
                    resultNumber: resNum,
                    resultColor: resColor,
                    resultBigSmall: resBigSmall,
                  };
                });

                setMyBets((prev) =>
                  prev.map((b) => {
                    const found = resolvedForPeriod.find((rb) => rb.id === b.id);
                    return found ? found : b;
                  })
                );
              }

              // ⚡ TRIGGER WINNING OR LOSS POPUP IN 0.0001 SEC
              if (resolvedForPeriod.length > 0 && !settledPeriodsShownPopup.current.has(data.periodId)) {
                settledPeriodsShownPopup.current.add(data.periodId);
                resolvedForPeriod.forEach(b => knownSettledBets.current.add(b.id));

                const winningBets = resolvedForPeriod.filter((b) => b.status === 'won');
                if (winningBets.length > 0) {
                  const totalWin = winningBets.reduce((sum, b) => sum + (b.winAmount || 0), 0);
                  const primary = winningBets[0];
                  const combined = { ...primary, winAmount: totalWin };
                  setResultBet({ bet: combined, type: 'won' });
                  soundEngine.playWinSound(isMutedRef.current);
                } else {
                  setResultBet({ bet: resolvedForPeriod[0], type: 'lost' });
                  soundEngine.playLossSound(isMutedRef.current);
                }
              }

              // Refresh user wallet in background
              refreshUserRef.current();
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        // EventSource will automatically retry; regular fallback polling handles intervals
      };
    } catch {
      // quiet fallback
    }

    return () => {
      if (es) {
        es.close();
      }
    };
  }, []);

  // Recalculate Chart connected red line coordinates
  useEffect(() => {
    if (bottomTab !== 'chart') return;
    const timeout = setTimeout(() => {
      if (!chartTableRef.current) return;
      const balls = chartTableRef.current.querySelectorAll('.chart-active-ball');
      const tableRect = chartTableRef.current.getBoundingClientRect();
      const coords: { x: number; y: number }[] = [];

      balls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        coords.push({
          x: rect.left - tableRect.left + rect.width / 2,
          y: rect.top - tableRect.top + rect.height / 2,
        });
      });
      setLineCoords(coords);
    }, 120);

    return () => clearTimeout(timeout);
  }, [bottomTab, history, currentPage]);

  const handleRefreshBalance = async () => {
    setRefreshingBalance(true);
    await refreshUser();
    setTimeout(() => setRefreshingBalance(false), 500);
  };

  // Open Bet Slip
  const handleSelectOption = (type: BetType, selection: BetSelection) => {
    if (period?.isLocked || (period?.remainingSeconds !== undefined && period.remainingSeconds <= 5)) {
      showToast('Betting is locked for the final 5 seconds!', 'error');
      return;
    }
    soundEngine.playClick(isMuted);
    setBetType(type);
    setSelectedBet(selection);
    setUnitAmount(1);
    setMultiplier(1);
    setShowBetSlip(true);
  };

  // Random Selection
  const handleRandomSelect = () => {
    if (period?.isLocked || (period?.remainingSeconds !== undefined && period.remainingSeconds <= 5)) return;
    soundEngine.playClick(isMuted);
    const randomNum = Math.floor(Math.random() * 10);
    handleSelectOption('number', randomNum);
  };

  // Submit Bet
  const handleConfirmBet = async () => {
    if (!user) {
      showToast('Please log in to place bets', 'error');
      return;
    }
    if (selectedBet === null || selectedBet === undefined) return;
    if (period?.isLocked || (period?.remainingSeconds !== undefined && period.remainingSeconds <= 5)) {
      showToast('Betting closed for current period', 'error');
      setShowBetSlip(false);
      return;
    }

    const totalAmount = unitAmount * multiplier;
    if (user.walletBalance < totalAmount) {
      showToast('Insufficient wallet balance. Please recharge.', 'error');
      return;
    }

    const totalDeposit = Number(user.totalDeposit || 0);
    if (totalDeposit < 100) {
      setShowBetSlip(false);
      window.dispatchEvent(new CustomEvent('open-deposit-required', {
        detail: { minRequired: 100, currentDeposit: totalDeposit }
      }));
      return;
    }

    setSubmittingBet(true);
    try {
      const res: any = await api.placeBet({
        uid: user.uid,
        username: user.username,
        gameType: selectedGameType,
        periodId: period.periodId,
        betType,
        selection: selectedBet,
        amount: unitAmount,
        multiplier,
      });

      if (res?.bet) {
        setMyBets((prev) => [res.bet, ...prev.filter((b) => b.id !== res.bet.id)]);
      }

      soundEngine.playClick(isMuted);
      showToast(`Bet placed on ${String(selectedBet).toUpperCase()} for ₹${totalAmount}!`, 'success');
      setShowBetSlip(false);
      refreshUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to place bet', 'error');
    } finally {
      setSubmittingBet(false);
    }
  };

  // Format digital countdown string
  const formatCountdown = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const mStr = String(mins).padStart(2, '0');
    const sStr = String(secs).padStart(2, '0');
    return {
      m1: mStr[0],
      m2: mStr[1],
      s1: sStr[0],
      s2: sStr[1],
      totalSecs: seconds,
    };
  };

  // Effective remaining seconds derived with high-precision timestamp synchronized to server clock
  const effectiveRemainingSec = useMemo(() => {
    if (!period) return 0;
    const syncedNow = localNow + serverClockOffsetRef.current;
    if (period.endTime) {
      return Math.max(0, Math.floor((period.endTime - syncedNow) / 1000));
    }
    return period.remainingSeconds ?? 0;
  }, [period, localNow]);

  const cd = formatCountdown(effectiveRemainingSec);
  const isFinal5Seconds = Boolean(effectiveRemainingSec <= 5 && effectiveRemainingSec > 0);

  const gameTypes = [
    { type: 'wingo_30s' as GameType, title: 'Win Go 30s', sub: '30s' },
    { type: 'wingo_1m' as GameType, title: 'Win Go 1Min', sub: '1Min' },
    { type: 'wingo_3m' as GameType, title: 'Win Go 3Min', sub: '3Min' },
    { type: 'wingo_5m' as GameType, title: 'Win Go 5Min', sub: '5Min' },
  ];

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return history.slice(start, start + rowsPerPage);
  }, [history, currentPage]);

  const totalPages = Math.min(50, Math.max(1, Math.ceil(history.length / rowsPerPage)));

  const totalMyBetsPages = Math.max(1, Math.ceil(myBets.length / rowsPerPage));
  const paginatedMyBets = useMemo(() => {
    const start = (myBetsPage - 1) * rowsPerPage;
    return myBets.slice(start, start + rowsPerPage);
  }, [myBets, myBetsPage]);

  // Chart statistics calculation
  const chartStats = useMemo(() => {
    const list = history.slice(0, 100);
    const total = list.length || 1;
    const freq: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const missing: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const maxConsecutive: Record<number, number> = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 };

    for (let n = 0; n <= 9; n++) {
      let firstSeen = false;
      let countMiss = 0;
      let consecutive = 0;
      let maxCon = 1;

      list.forEach((item) => {
        if (item.resultNumber === n) {
          freq[n]++;
          firstSeen = true;
          consecutive++;
          if (consecutive > maxCon) maxCon = consecutive;
        } else {
          consecutive = 0;
          if (!firstSeen) countMiss++;
        }
      });
      missing[n] = countMiss;
      maxConsecutive[n] = maxCon;
    }

    const avgMissing: Record<number, number> = {};
    for (let n = 0; n <= 9; n++) {
      avgMissing[n] = freq[n] > 0 ? Math.round(total / freq[n]) : total;
    }

    return { freq, missing, avgMissing, maxConsecutive };
  }, [history]);

  // Color theme & style for Bet Slip Top Ribbon (Image 2: 50% diagonal split for 0 and 5)
  const getBetColorTheme = () => {
    if (selectedBet === 0 || selectedBet === '0') {
      return {
        bgStyle: { background: 'linear-gradient(to top right, #9333ea 50%, #ef4444 50%)' },
        bgClass: '',
        text: 'text-[#9333ea]',
        label: 'Select 0',
      };
    }
    if (selectedBet === 5 || selectedBet === '5') {
      return {
        bgStyle: { background: 'linear-gradient(to top right, #9333ea 50%, #16a34a 50%)' },
        bgClass: '',
        text: 'text-[#16a34a]',
        label: 'Select 5',
      };
    }
    if (selectedBet === 'green' || selectedBet === 1 || selectedBet === 3 || selectedBet === 7 || selectedBet === 9) {
      return {
        bgStyle: { background: '#22c55e' },
        bgClass: 'bg-[#22c55e]',
        text: 'text-[#22c55e]',
        label: `Select ${String(selectedBet)}`,
      };
    }
    if (selectedBet === 'red' || selectedBet === 2 || selectedBet === 4 || selectedBet === 6 || selectedBet === 8) {
      return {
        bgStyle: { background: '#ef4444' },
        bgClass: 'bg-[#ef4444]',
        text: 'text-[#ef4444]',
        label: `Select ${String(selectedBet)}`,
      };
    }
    if (selectedBet === 'violet') {
      return {
        bgStyle: { background: '#9333ea' },
        bgClass: 'bg-[#9333ea]',
        text: 'text-[#9333ea]',
        label: 'Select Violet',
      };
    }
    if (selectedBet === 'big') {
      return {
        bgStyle: { background: '#df8a24' },
        bgClass: 'bg-[#df8a24]',
        text: 'text-[#df8a24]',
        label: 'Select Big',
      };
    }
    return {
      bgStyle: { background: '#3b82f6' },
      bgClass: 'bg-[#3b82f6]',
      text: 'text-[#3b82f6]',
      label: `Select ${String(selectedBet)}`,
    };
  };

  // Render colorful badge for Bet selection (Image 1: My History and Details)
  const renderSelectionBadge = (selection: BetSelection, size: 'sm' | 'md' | 'lg' = 'md') => {
    const isNumber = typeof selection === 'number' || (!isNaN(Number(selection)) && selection !== '' && selection !== null && selection !== undefined && selection !== 'big' && selection !== 'small' && selection !== 'green' && selection !== 'red' && selection !== 'violet');
    const num = isNumber ? Number(selection) : null;
    const is0 = num === 0 || selection === '0';
    const is5 = num === 5 || selection === '5';
    const isGreenNum = num !== null && [1, 3, 7, 9].includes(num);
    const isRedNum = num !== null && [2, 4, 6, 8].includes(num);
    const isGreen = selection === 'green' || isGreenNum;
    const isRed = selection === 'red' || isRedNum;
    const isViolet = selection === 'violet';
    const isBig = selection === 'big' || selection === 'Big';
    const isSmall = selection === 'small' || selection === 'Small';

    const sizeClasses = size === 'sm' 
      ? 'w-7 h-7 text-xs rounded-lg' 
      : size === 'lg' 
      ? 'w-12 h-12 text-base rounded-2xl'
      : 'w-11 h-11 text-sm rounded-xl';

    // 0 has diagonal 50% split (Violet bottom-left, Red top-right)
    if (is0) {
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center font-black text-white shadow-sm shrink-0 border border-white/20`}
          style={{
            background: 'linear-gradient(to top right, #9333ea 50%, #ef4444 50%)',
          }}
        >
          0
        </div>
      );
    }

    // 5 has diagonal 50% split (Violet bottom-left, Green top-right)
    if (is5) {
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center font-black text-white shadow-sm shrink-0 border border-white/20`}
          style={{
            background: 'linear-gradient(to top right, #9333ea 50%, #16a34a 50%)',
          }}
        >
          5
        </div>
      );
    }

    if (isNumber && num !== null) {
      const bgColor = isGreenNum ? 'bg-[#16a34a]' : 'bg-[#ef4444]';
      return (
        <div className={`${sizeClasses} ${bgColor} flex items-center justify-center font-black text-white shadow-sm shrink-0`}>
          {num}
        </div>
      );
    }

    if (isGreen) {
      return (
        <div className={`${sizeClasses} bg-[#16a34a] flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-[11px]`}>
          Green
        </div>
      );
    }

    if (isRed) {
      return (
        <div className={`${sizeClasses} bg-[#ef4444] flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-[11px]`}>
          Red
        </div>
      );
    }

    if (isViolet) {
      return (
        <div className={`${sizeClasses} bg-[#9333ea] flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-[11px]`}>
          Violet
        </div>
      );
    }

    if (isBig) {
      return (
        <div className={`${sizeClasses} bg-[#df8a24] flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-[11px]`}>
          Big
        </div>
      );
    }

    if (isSmall) {
      return (
        <div className={`${sizeClasses} bg-[#3b82f6] flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-[11px]`}>
          Small
        </div>
      );
    }

    return (
      <div className={`${sizeClasses} bg-slate-200 text-slate-700 flex items-center justify-center font-bold shadow-sm shrink-0 text-xs`}>
        {String(selection)}
      </div>
    );
  };

  // Render Result badges for numbers
  const renderResultBadges = (num: number) => {
    const isBig = num >= 5;
    const is0 = num === 0;
    const is5 = num === 5;
    const isGreen = [1, 3, 7, 9].includes(num);
    const isRed = [2, 4, 6, 8].includes(num);

    return (
      <div className="flex items-center gap-1.5 font-bold text-xs">
        <span className="font-mono text-slate-900 font-black px-1 text-sm">{num}</span>
        {is0 && (
          <>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-[#ef4444]">Red</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-[#9333ea]">Violet</span>
          </>
        )}
        {is5 && (
          <>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-[#16a34a]">Green</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-[#9333ea]">Violet</span>
          </>
        )}
        {isGreen && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-[#16a34a]">Green</span>}
        {isRed && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-[#ef4444]">Red</span>}
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${isBig ? 'bg-[#df8a24]' : 'bg-[#3b82f6]'}`}>
          {isBig ? 'Big' : 'Small'}
        </span>
      </div>
    );
  };

  const betTheme = getBetColorTheme();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f4f6fb] text-slate-900 flex flex-col font-sans pb-24 select-none relative">
      
      {/* 1st IMAGE: Header with Luxury Branding (Fixed pinned top header) */}
      <header className="fixed top-0 left-0 right-0 z-40 px-3 py-2 flex items-center justify-between bg-[#0c0d12]/98 backdrop-blur-xl border-b border-[#f5c443]/25 shadow-md">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Company Name ArowClub with Golden Emblem */}
          <div className="flex items-center">
            <UserLogo size="sm" />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenSupport}
              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-300 hover:text-[#f5c443] transition"
            >
              <Headphones className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                showToast(!isMuted ? 'Sound muted' : 'Sound unmuted', 'info');
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                isMuted ? 'text-zinc-500 hover:text-zinc-300' : 'text-[#f5c443] hover:text-[#fce08b]'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-11 w-full shrink-0" />

      {/* Main Game Container - Compact & Crisp Layout Matching Reference */}
      <div className="px-3 pt-2 max-w-md mx-auto w-full space-y-2">
        
        {/* Wallet Balance Card - Sleek Golden Theme Matching Reference */}
        <div
          className="rounded-xl px-3.5 py-2.5 shadow-sm text-center space-y-1.5 relative overflow-hidden border border-[#f5c443]/50"
          style={{
            backgroundImage: 'url(/assets/wingo_wallet_bg.svg)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="flex items-center justify-center gap-1.5 relative z-10">
            <span className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight drop-shadow-xs">
              ₹{(user?.walletBalance ?? 0).toFixed(2)}
            </span>
            <button
              onClick={handleRefreshBalance}
              className={`text-slate-800 hover:text-slate-950 transition p-1 ${refreshingBalance ? 'animate-spin' : ''}`}
              title="Refresh Balance"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-900 font-extrabold relative z-10">
            <span>👛</span>
            <span>Wallet balance</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-0.5 relative z-10">
            <button
              onClick={onNavigateWithdraw}
              className="py-1.5 px-3 rounded-full bg-[#1e2230] hover:bg-[#2c3245] active:scale-95 text-white font-black text-xs shadow transition border border-white/10"
            >
              Withdraw
            </button>
            <button
              onClick={onNavigateDeposit}
              className="py-1.5 px-3 rounded-full bg-gradient-to-r from-[#22c55e] via-[#16a34a] to-[#15803d] hover:brightness-105 active:scale-95 text-white font-black text-xs shadow transition border border-[#86efac]/40"
            >
              Deposit
            </button>
          </div>
        </div>

        {/* Announcement Banner */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-hidden flex-1">
            <Volume2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div className="text-[11px] text-slate-600 truncate whitespace-nowrap">
              Welcome to ArowClub! Official verified color lottery games with 24/7 fast withdrawals...
            </div>
          </div>
          <button
            onClick={onOpenHowToPlay}
            className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 shadow hover:brightness-105 active:scale-95"
          >
            <Flame className="w-2.5 h-2.5 text-white fill-white" />
            <span>Detail</span>
          </button>
        </div>

        {/* WinGo Timeframe Tabs (Compact, High-Visual Hierarchy) */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
          {gameTypes.map((gt) => {
            const isActive = selectedGameType === gt.type;
            return (
              <button
                key={gt.type}
                onClick={() => {
                  if (selectedGameType !== gt.type) {
                    setSelectedGameType(gt.type);
                    if (periodsMapRef.current[gt.type]) {
                      setPeriod(periodsMapRef.current[gt.type]);
                    }
                    if (historyMapRef.current[gt.type]) {
                      setHistory(historyMapRef.current[gt.type]);
                    }
                  }
                }}
                className={`py-1.5 px-0.5 rounded-lg flex flex-col items-center justify-center relative transition active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#ffea79] via-[#f5c443] to-[#d97706] text-amber-950 font-black shadow-[0_2px_8px_rgba(245,196,67,0.4)] border border-[#fef08a]'
                    : 'bg-[#f4f6fa] hover:bg-slate-100 text-slate-600 font-semibold border border-slate-200/50'
                }`}
              >
                <WatchIcon active={isActive} className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-extrabold uppercase leading-none opacity-85">Win Go</span>
                <span className="text-[11px] font-black leading-tight mt-0.5">{gt.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Ticket-Style Period & Digital Countdown Display */}
        <div className="relative min-h-[92px] w-full flex items-center justify-between px-3 sm:px-4 py-2 my-0.5">
          {/* Vector SVG Ticket Body */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <svg
              viewBox="0 0 600 200"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="ticketGradDirect" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFEA00" />
                  <stop offset="25%" stopColor="#FFD600" />
                  <stop offset="70%" stopColor="#FFB300" />
                  <stop offset="100%" stopColor="#FF8F00" />
                </linearGradient>
                <linearGradient id="ticketBorderDirect" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFF8D" />
                  <stop offset="50%" stopColor="#FFE082" />
                  <stop offset="100%" stopColor="#FFA000" />
                </linearGradient>
                <linearGradient id="roadLineGradDirect" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFDE7" />
                  <stop offset="50%" stopColor="#FFF59D" />
                  <stop offset="100%" stopColor="#FFE082" />
                </linearGradient>
              </defs>

              <path
                d="
                  M 24,4
                  H 288
                  A 12,12 0 0,0 312,4
                  H 576
                  A 20,20 0 0,1 596,24
                  V 176
                  A 20,20 0 0,1 576,196
                  H 312
                  A 12,12 0 0,0 288,196
                  H 24
                  A 20,20 0 0,1 4,176
                  V 24
                  A 20,20 0 0,1 24,4
                  Z
                "
                fill="url(#ticketGradDirect)"
                stroke="url(#ticketBorderDirect)"
                strokeWidth="3"
                strokeLinejoin="round"
              />

              <line
                x1="300"
                y1="18"
                x2="300"
                y2="182"
                stroke="url(#roadLineGradDirect)"
                strokeWidth="4"
                strokeDasharray="8,6"
                strokeLinecap="round"
                opacity="0.95"
              />
            </svg>
          </div>

          {/* Center Road Divider Dashed Overlay */}
          <div className="absolute left-1/2 top-2.5 bottom-2.5 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-[2px] h-full border-r-[2px] border-dashed border-[#fff9c4] drop-shadow-[0_1px_2px_rgba(180,83,9,0.35)] opacity-90" />
          </div>

          {/* Left: How to play + Recent 5 balls */}
          <div className="space-y-1 flex-1 pr-3 relative z-10">
            <button
              onClick={onOpenHowToPlay}
              className="px-2.5 py-0.5 bg-black/15 hover:bg-black/25 text-slate-950 text-[10px] font-black rounded-full inline-flex items-center gap-1 border border-black/10 transition shadow-xs"
            >
              <BookOpen className="w-2.5 h-2.5 text-amber-900" />
              <span>How to play</span>
            </button>

            <div className="text-xs font-black text-slate-950 tracking-tight">
              {gameTypes.find(g => g.type === selectedGameType)?.title}
            </div>

            {/* 5 recent balls with authentic 3D sphere gradient and numbers */}
            <div className="flex items-center gap-1 pt-0.5">
              {history.slice(0, 5).map((h, i) => (
                <WingoBall key={i} number={h.resultNumber ?? 0} size={20} />
              ))}
            </div>
          </div>

          {/* Right: Time remaining + Digital boxes + Period Number */}
          <div className="text-right pl-2 relative z-10">
            <div className="text-[10px] text-slate-950 font-black mb-0.5">Time remaining</div>
            
            {/* Digital countdown boxes */}
            <div className="flex items-center justify-end gap-1 mb-1">
              <span className="w-5 h-6 bg-[#121520] border border-[#f5c443]/40 rounded flex items-center justify-center font-mono font-black text-xs text-[#fce08b] shadow-xs">
                {cd.m1}
              </span>
              <span className="w-5 h-6 bg-[#121520] border border-[#f5c443]/40 rounded flex items-center justify-center font-mono font-black text-xs text-[#fce08b] shadow-xs">
                {cd.m2}
              </span>
              <span className="text-slate-950 font-black text-xs mx-0.5">:</span>
              <span className="w-5 h-6 bg-[#121520] border border-[#f5c443]/40 rounded flex items-center justify-center font-mono font-black text-xs text-[#fce08b] shadow-xs">
                {cd.s1}
              </span>
              <span className="w-5 h-6 bg-[#121520] border border-[#f5c443]/40 rounded flex items-center justify-center font-mono font-black text-xs text-[#fce08b] shadow-xs">
                {cd.s2}
              </span>
            </div>

            <div className="text-[11px] font-mono font-black text-slate-950 tracking-wider">
              {period?.periodId || '---'}
            </div>
          </div>
        </div>

        {/* BETTING CONTROLS */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-xs space-y-2 relative overflow-hidden">
          
          {/* Color Betting Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {/* Green: Rounded Left + Top-Right High Curve */}
            <button
              onClick={() => handleSelectOption('color', 'green')}
              disabled={isFinal5Seconds}
              className="py-2 px-2 rounded-l-lg rounded-tr-[1.2rem] rounded-br-xs font-bold text-xs text-white shadow-sm active:scale-95 transition bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-40 flex items-center justify-center tracking-wide"
            >
              Green
            </button>

            {/* Violet: Uniform Rounded Rectangle */}
            <button
              onClick={() => handleSelectOption('color', 'violet')}
              disabled={isFinal5Seconds}
              className="py-2 px-2 rounded-lg font-bold text-xs text-white shadow-sm active:scale-95 transition bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-40 flex items-center justify-center tracking-wide"
            >
              Violet
            </button>

            {/* Red: Top-Left High Curve + Rounded Right */}
            <button
              onClick={() => handleSelectOption('color', 'red')}
              disabled={isFinal5Seconds}
              className="py-2 px-2 rounded-tl-[1.2rem] rounded-bl-xs rounded-r-lg font-bold text-xs text-white shadow-sm active:scale-95 transition bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-40 flex items-center justify-center tracking-wide"
            >
              Red
            </button>
          </div>

          {/* Number Balls - Softened Container (0 to 9 in 2 rows of 5) */}
          <div className="relative bg-[#0f172a]/5 border border-slate-200/70 rounded-xl p-2 shadow-inner">
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5 place-items-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <WingoBall
                  key={num}
                  number={num}
                  size={40}
                  onClick={() => handleSelectOption('number', num)}
                  disabled={isFinal5Seconds}
                />
              ))}
            </div>
          </div>

          {/* Random & Multipliers Row */}
          <div className="flex items-center justify-between gap-1.5 w-full">
            <button
              onClick={handleRandomSelect}
              disabled={isFinal5Seconds}
              className="px-2.5 py-1 rounded-lg border border-rose-400 text-rose-500 bg-rose-50 hover:bg-rose-100 font-bold text-xs active:scale-95 transition whitespace-nowrap disabled:opacity-40 shrink-0 shadow-2xs"
            >
              Random
            </button>

            <div className="flex items-center gap-1 flex-1 justify-between">
              {[1, 5, 10, 20, 50, 100].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMultiplier(m);
                    showToast(`Multiplier set to X${m}`, 'info');
                  }}
                  disabled={isFinal5Seconds}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition text-center disabled:opacity-40 ${
                    multiplier === m
                      ? 'bg-amber-500 text-white font-black shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  X{m}
                </button>
              ))}
            </div>
          </div>

          {/* Big and Small Fully ATTACHED Continuous Capsule Bar */}
          <div>
            <div className="w-full h-9 rounded-full overflow-hidden flex shadow-sm">
              {/* Left Half: Big */}
              <button
                onClick={() => handleSelectOption('big_small', 'big')}
                disabled={isFinal5Seconds}
                className="flex-1 h-full font-black text-xs text-white transition bg-[#df8a24] hover:bg-[#cf7c18] active:brightness-95 disabled:opacity-40 flex items-center justify-center tracking-wider"
              >
                Big
              </button>

              {/* Right Half: Small */}
              <button
                onClick={() => handleSelectOption('big_small', 'small')}
                disabled={isFinal5Seconds}
                className="flex-1 h-full font-black text-xs text-white transition bg-[#3b82f6] hover:bg-[#2563eb] active:brightness-95 disabled:opacity-40 flex items-center justify-center tracking-wider"
              >
                Small
              </button>
            </div>
          </div>

          {/* 5s COUNTDOWN OVERLAY OVER ENTIRE BETTING CONTAINER */}
          {isFinal5Seconds && (
            <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] rounded-xl flex items-center justify-center gap-3 z-30 pointer-events-none animate-fadeIn">
              <div className="w-20 h-28 rounded-xl bg-gradient-to-b from-[#fde047] via-[#f5c443] to-[#d97706] border-2 border-[#fef08a] shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex items-center justify-center font-mono font-black text-6xl text-[#0d0f17]">
                0
              </div>
              <div className="w-20 h-28 rounded-xl bg-gradient-to-b from-[#fde047] via-[#f5c443] to-[#d97706] border-2 border-[#fef08a] shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex items-center justify-center font-mono font-black text-6xl text-[#0d0f17] animate-pulse">
                {cd.s2}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM TABS */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-3 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            <button
              onClick={() => setBottomTab('game_history')}
              className={`py-2 text-xs font-medium rounded-lg transition ${
                bottomTab === 'game_history'
                  ? 'bg-[#00d57e] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Game history
            </button>
            <button
              onClick={() => setBottomTab('chart')}
              className={`py-2 text-xs font-medium rounded-lg transition ${
                bottomTab === 'chart'
                  ? 'bg-[#00d57e] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setBottomTab('my_bets')}
              className={`py-2 text-xs font-medium rounded-lg transition ${
                bottomTab === 'my_bets'
                  ? 'bg-[#00d57e] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My history
            </button>
          </div>

          {/* 1. Game History Tab */}
          {bottomTab === 'game_history' && (
            <div className="space-y-2">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-2 text-center">Number</th>
                      <th className="py-2.5 px-2 text-center">Big/Small</th>
                      <th className="py-2.5 px-3 text-right">Color</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                    {paginatedHistory.map((h, idx) => {
                      const num = h.resultNumber ?? 0;
                      const isBig = num >= 5;
                      const isGreen = [1, 3, 7, 9].includes(num);
                      const isViolet = num === 0 || num === 5;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {h.periodId}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <WingoBall number={num} size={22} className="mx-auto" />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                isBig ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {isBig ? 'Big' : 'Small'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isViolet ? (
                                <>
                                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                  <span className={`w-2.5 h-2.5 rounded-full ${num === 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                </>
                              ) : isGreen ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="pt-3 pb-1 flex items-center justify-center gap-3 text-xs font-bold text-slate-700">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#2f97ff] hover:text-white transition disabled:opacity-30"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-800 font-mono tracking-wider shadow-sm flex items-center gap-1">
                  <span className="text-amber-600 font-black">{currentPage}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-600">{totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg bg-[#2f97ff] flex items-center justify-center text-white hover:brightness-110 transition disabled:opacity-30 shadow-sm"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {/* 2. Chart Tab in Crisp White */}
          {bottomTab === 'chart' && (
            <div className="space-y-2">
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3">
                <div className="text-xs font-black text-slate-800">
                  Statistic (last 100 Periods)
                </div>

                {/* Stat Box */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-slate-500 font-bold border-b border-slate-200 pb-1.5">
                    <span>Winning Numbers</span>
                    <div className="flex gap-1.5 font-mono">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span key={n} className="w-4 text-center text-rose-500 font-bold">{n}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Missing</span>
                    <div className="flex gap-1.5 font-mono">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span key={n} className="w-4 text-center text-slate-500">{chartStats.missing[n]}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Avg missing</span>
                    <div className="flex gap-1.5 font-mono">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span key={n} className="w-4 text-center text-slate-500">{chartStats.avgMissing[n]}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Frequency</span>
                    <div className="flex gap-1.5 font-mono">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span key={n} className="w-4 text-center text-emerald-600 font-bold">{chartStats.freq[n]}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Max consecutive</span>
                    <div className="flex gap-1.5 font-mono">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span key={n} className="w-4 text-center text-amber-600 font-bold">{chartStats.maxConsecutive[n]}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trend Table with Connected SVG Polyline */}
                <div className="relative overflow-x-hidden w-full">
                  <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full">
                    {lineCoords.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={lineCoords.map(c => `${c.x},${c.y}`).join(' ')}
                      />
                    )}
                  </svg>

                  <table ref={chartTableRef} className="w-full text-xs text-left table-fixed">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-1 text-[10px] w-24 text-left">Period</th>
                        <th className="py-2 px-0.5 text-center text-[10px]" colSpan={10}>Number</th>
                        <th className="py-2 px-1 text-center text-[10px] w-8">B/S</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {paginatedHistory.map((h, idx) => {
                        const winNum = h.resultNumber ?? 0;
                        const isBig = winNum >= 5;

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-1.5 px-1 text-[9px] text-slate-700 font-semibold truncate">
                              {h.periodId}
                            </td>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                              const isWinner = winNum === n;
                              return (
                                <td key={n} className="py-1.5 px-0 text-center">
                                  {isWinner ? (
                                    <WingoBall number={n} size={16} className="chart-active-ball mx-auto z-20 relative" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border border-slate-200 mx-auto text-[8px] text-slate-400 flex items-center justify-center">
                                      {n}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-1 text-center">
                              <span className={`w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] font-black ${isBig ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                {isBig ? 'B' : 'S'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Bar */}
              <div className="pt-3 pb-1 flex items-center justify-center gap-3 text-xs font-bold text-slate-700">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#2f97ff] hover:text-white transition disabled:opacity-30"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-800 font-mono tracking-wider shadow-sm flex items-center gap-1">
                  <span className="text-amber-600 font-black">{currentPage}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-600">{totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg bg-[#2f97ff] flex items-center justify-center text-white hover:brightness-110 transition disabled:opacity-30 shadow-sm"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 3. My History Tab (WinGo Only) with Exact Match to Image 1 */}
          {bottomTab === 'my_bets' && (
            <div className="space-y-3">
              {/* Top Detail Header Pill */}
              <div className="flex items-center justify-end px-1">
                <div className="border border-[#00d57e]/80 text-[#00d57e] bg-white text-xs px-3.5 py-1 rounded-full flex items-center gap-1 font-medium shadow-2xs">
                  <span>Detail</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>

              {myBets.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs shadow-sm">
                  No betting history recorded for {gameTypes.find(g => g.type === selectedGameType)?.title}
                </div>
              ) : (
                <>
                  {paginatedMyBets.map((bet) => {
                    const isWon = bet.status === 'won';
                    const isPending = bet.status === 'pending';
                    const isExpanded = expandedBetIds.has(bet.id);
                    const totalAmt = Number(bet.totalAmount || 0);
                    const taxAmt = Number((bet as any).taxAmount || (totalAmt * 0.02));
                    const amtAfterTax = Number((bet as any).amountAfterTax || (totalAmt - taxAmt));

                    return (
                      <div
                        key={bet.id}
                        className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs transition overflow-hidden"
                      >
                        {/* Row Header: Clickable to toggle slide-down accordion */}
                        <div
                          onClick={() => toggleBetExpand(bet.id)}
                          className="flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {/* Selection Badge with exact color / 50% diagonal split */}
                            {renderSelectionBadge(bet.selection, 'md')}

                            <div className="min-w-0 flex-1 pr-2">
                              <div className="text-sm font-medium text-slate-800 flex items-center gap-1">
                                <span className="truncate">{bet.periodId}</span>
                                <span className="shrink-0 text-slate-700 text-xs">
                                  {isExpanded ? '▴' : '▾'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 font-normal mt-0.5">
                                {bet.createdAt ? bet.createdAt.slice(0, 19).replace('T', ' ') : '---'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                            <span
                              className={`text-xs px-3 py-0.5 rounded-lg font-normal border ${
                                isWon
                                  ? 'border-emerald-400 text-emerald-600 bg-white'
                                  : isPending
                                  ? 'border-amber-300 text-amber-600 bg-white'
                                  : 'border-rose-300 text-rose-500 bg-white'
                              }`}
                            >
                              {isWon ? 'Succeed' : isPending ? 'Pending' : 'Failed'}
                            </span>
                            <div
                              className={`text-sm font-normal ${
                                isWon ? 'text-emerald-600' : isPending ? 'text-slate-600' : 'text-rose-500'
                              }`}
                            >
                              {isWon
                                ? `+₹${Number(bet.winAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : isPending
                                ? `₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `-₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </div>
                          </div>
                        </div>

                        {/* SLIDE DOWN DETAILS ACCORDION (Exact Match to Image 1 with subtle row tints) */}
                        {isExpanded && (
                          <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2.5 animate-fadeIn text-xs">
                            <div className="font-semibold text-slate-900 text-sm">Details</div>

                            {/* Order number Box */}
                            <div className="space-y-1">
                              <div className="text-xs text-slate-400 font-normal">Order number</div>
                              <div className="bg-[#eceff5] rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                                <span className="text-slate-700 text-xs font-normal truncate select-all">
                                  {bet.orderNumber || bet.id}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(bet.orderNumber || bet.id);
                                    showToast('Order number copied', 'info');
                                  }}
                                  className="p-1 text-slate-600 hover:text-slate-900 shrink-0 active:scale-95 transition"
                                  title="Copy Order Number"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Field list with subtle background tint on every row (Image 1 style) */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Period</span>
                                <span className="text-slate-800 font-normal">{bet.periodId}</span>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Purchase amount</span>
                                <span className="text-slate-800 font-normal">
                                  ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Quantity</span>
                                <span className="text-slate-800 font-normal">{bet.multiplier || 1}</span>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Amount after tax</span>
                                <span className="text-rose-500 font-normal">
                                  ₹{amtAfterTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Tax</span>
                                <span className="text-slate-700 font-normal">
                                  ₹{taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Result</span>
                                <div className="flex items-center gap-1.5">
                                  {bet.resultNumber !== undefined ? (
                                    renderResultBadges(bet.resultNumber)
                                  ) : (
                                    <span className="text-amber-600 font-normal">Pending</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Select</span>
                                <div className="flex items-center gap-2">
                                  {renderSelectionBadge(bet.selection, 'sm')}
                                  <span className="text-slate-800 font-normal capitalize">{String(bet.selection)}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Status</span>
                                <span
                                  className={`font-normal ${
                                    isWon ? 'text-emerald-600' : isPending ? 'text-amber-600' : 'text-rose-500'
                                  }`}
                                >
                                  {isWon ? 'Succeed' : isPending ? 'Pending' : 'Failed'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Win/Loss</span>
                                <span
                                  className={`font-normal ${
                                    isWon ? 'text-emerald-600' : isPending ? 'text-slate-600' : 'text-rose-500'
                                  }`}
                                >
                                  {isWon
                                    ? `+₹${Number(bet.winAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : isPending
                                    ? '₹0.00'
                                    : `-₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between px-3 py-2 bg-[#f4f6fb] rounded-xl">
                                <span className="text-slate-500 font-normal">Order time</span>
                                <span className="text-slate-700 font-normal">
                                  {bet.createdAt ? bet.createdAt.slice(0, 19).replace('T', ' ') : '---'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* My History Pagination Bar */}
                  {totalMyBetsPages > 1 && (
                    <div className="pt-3 pb-1 flex items-center justify-center gap-3 text-xs font-bold text-slate-700">
                      <button
                        onClick={() => setMyBetsPage(p => Math.max(1, p - 1))}
                        disabled={myBetsPage === 1}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#2f97ff] hover:text-white transition disabled:opacity-30"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-800 font-mono tracking-wider shadow-sm flex items-center gap-1">
                        <span className="text-amber-600 font-black">{myBetsPage}</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-600">{totalMyBetsPages}</span>
                      </div>
                      <button
                        onClick={() => setMyBetsPage(p => Math.min(totalMyBetsPages, p + 1))}
                        disabled={myBetsPage === totalMyBetsPages}
                        className="w-8 h-8 rounded-lg bg-[#2f97ff] flex items-center justify-center text-white hover:brightness-110 transition disabled:opacity-30 shadow-sm"
                        title="Next Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3rd IMAGE: BET PLACEMENT BOTTOM SHEET in Clean Crisp White Theme */}
      {showBetSlip && selectedBet !== null && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBetSlip(false);
          }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
        >
          <div className="bg-white rounded-t-[32px] max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-slate-200 animate-slideUp">
            
            {/* Top Ribbon Header (Image 2: 50% Diagonal split for 0 and 5) */}
            <div 
              style={betTheme.bgStyle}
              className="pt-3.5 pb-4 px-4 shrink-0 text-white text-center space-y-1 relative shadow-md"
            >
              <div className="text-xs font-bold text-white/95 drop-shadow-sm">
                {gameTypes.find(g => g.type === selectedGameType)?.title}
              </div>
              <div className="inline-block px-5 py-1 bg-white rounded-lg shadow-sm">
                <span className={`text-xs font-black capitalize ${betTheme.text}`}>
                  {betTheme.label}
                </span>
              </div>
            </div>

            {/* Sheet Body with scroll if needed */}
            <div className="p-4 space-y-4 bg-white overflow-y-auto flex-1">
              
              {/* Balance Row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Balance</span>
                <div className="flex gap-2">
                  {[1, 10, 100, 1000].map((amt) => {
                    const isActive = unitAmount === amt;
                    return (
                      <button
                        key={amt}
                        onClick={() => setUnitAmount(amt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          isActive
                            ? 'bg-[#22c55e] text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity [-] [ 1 ] [+] */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMultiplier(m => Math.max(1, m - 1))}
                    className="w-8 h-8 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-base flex items-center justify-center active:scale-95 shadow"
                  >
                    -
                  </button>
                  <div className="w-16 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center font-mono font-bold text-xs text-slate-800">
                    {multiplier}
                  </div>
                  <button
                    onClick={() => setMultiplier(m => m + 1)}
                    className="w-8 h-8 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-base flex items-center justify-center active:scale-95 shadow"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Multipliers [X1] [X5] [X10] [X20] [X50] [X100] */}
              <div className="flex items-center justify-between gap-1.5">
                {[1, 5, 10, 20, 50, 100].map((m) => {
                  const isActive = multiplier === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMultiplier(m)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold font-mono transition ${
                        isActive
                          ? 'bg-[#22c55e] text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      X{m}
                    </button>
                  );
                })}
              </div>

              {/* Checkbox: I agree 《Pre-sale rules》 */}
              <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                <div
                  onClick={() => setAgreeTerms(!agreeTerms)}
                  className={`w-4 h-4 rounded-full flex items-center justify-center cursor-pointer transition ${
                    agreeTerms ? 'bg-[#38bdf8] text-white' : 'border border-slate-400'
                  }`}
                >
                  {agreeTerms && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>I agree <span className="text-rose-500">《Pre-sale rules》</span></span>
              </div>
            </div>

            {/* Bottom Actions: Cancel (left) | Total amount ₹X.XX (right) */}
            <div className="shrink-0 flex items-center border-t border-slate-200 bg-slate-50 pb-5 sm:pb-0">
              <button
                onClick={() => setShowBetSlip(false)}
                className="w-1/3 py-4 bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBet}
                disabled={submittingBet || !agreeTerms}
                className="w-2/3 py-4 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:brightness-110 text-white font-black text-xs transition text-center disabled:opacity-50 shadow-md flex items-center justify-center gap-1"
              >
                {submittingBet ? 'Processing...' : `Total amount ₹${(unitAmount * multiplier).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINNING & LOSS POPUP MODAL (1:1 Design - Matching Screenshot Exactly) */}
      {resultBet && (
        <div 
          onClick={() => setResultBet(null)}
          className="fixed inset-0 z-[110] bg-black/55 flex flex-col items-center justify-center p-4 animate-fadeIn select-none overflow-y-auto"
        >
          {/* Top celebratory confetti for WIN */}
          {resultBet.type === 'won' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
              {/* Confetti ribbons & flakes */}
              <div className="absolute top-[8%] left-[12%] w-3 h-6 bg-[#ff4757] rotate-45 rounded-sm animate-bounce opacity-90" />
              <div className="absolute top-[14%] right-[16%] w-2.5 h-5 bg-[#ffa502] -rotate-12 rounded-sm opacity-90" />
              <div className="absolute top-[22%] left-[8%] w-4 h-2 bg-[#2ed573] rotate-12 rounded-sm opacity-90" />
              <div className="absolute top-[18%] right-[10%] w-3 h-5 bg-[#1e90ff] 45 rounded-sm opacity-90" />
              <div className="absolute top-[28%] left-[20%] w-2.5 h-2.5 bg-[#ff6b81] rounded-full opacity-80" />
              <div className="absolute top-[25%] right-[22%] w-3 h-3 bg-[#e056fd] rotate-45 opacity-90" />
              <div className="absolute top-[10%] left-[30%] w-2 h-4 bg-[#f9ca24] -rotate-45 rounded-sm opacity-90" />
              <div className="absolute top-[12%] right-[32%] w-3.5 h-2 bg-[#ff793f] rotate-12 rounded-sm opacity-90" />
              <div className="absolute top-[32%] left-[15%] w-2 h-5 bg-[#686de0] -rotate-12 rounded-sm opacity-80" />
              <div className="absolute top-[34%] right-[12%] w-3 h-3 bg-[#ffbe76] rounded-full opacity-90" />
              <div className="absolute top-[40%] left-[10%] w-3 h-2 bg-[#badc58] rotate-45 rounded-sm opacity-80" />
              <div className="absolute top-[38%] right-[8%] w-2.5 h-4.5 bg-[#ff5252] 30 rounded-sm opacity-90" />
            </div>
          )}

          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[320px] sm:max-w-[340px] w-full mx-auto z-10 flex flex-col items-center"
          >
            {resultBet.type === 'won' ? (
              /* EXACT 1:1 WINNING CARD */
              <div className="relative w-full pt-14">
                {/* Top Winged Ribbon & Golden Medallion Header */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none w-full">
                  <div className="relative flex items-center justify-center">
                    {/* Golden Feathered Wings & Curved Ribbon SVG */}
                    <svg viewBox="0 0 280 120" className="w-72 h-32 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
                      <defs>
                        <linearGradient id="goldWingLeft" x1="100%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="40%" stopColor="#fde68a" />
                          <stop offset="80%" stopColor="#fef08a" />
                          <stop offset="100%" stopColor="#fffbeb" />
                        </linearGradient>
                        <linearGradient id="goldWingRight" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="40%" stopColor="#fde68a" />
                          <stop offset="80%" stopColor="#fef08a" />
                          <stop offset="100%" stopColor="#fffbeb" />
                        </linearGradient>
                        <linearGradient id="goldRibbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#fde68a" />
                          <stop offset="40%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                        <linearGradient id="goldMedalOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fffbeb" />
                          <stop offset="30%" stopColor="#fef08a" />
                          <stop offset="70%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                        <linearGradient id="goldMedalInner" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="40%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                      </defs>

                      {/* Left Wings */}
                      <path d="M 120 60 C 95 30, 60 20, 25 38 C 50 48, 75 52, 98 70 Z" fill="url(#goldWingLeft)" />
                      <path d="M 125 65 C 105 42, 75 35, 45 52 C 68 60, 90 66, 108 78 Z" fill="url(#goldWingLeft)" opacity="0.9" />
                      <path d="M 130 70 C 112 55, 90 50, 65 65 C 85 72, 105 76, 120 84 Z" fill="url(#goldWingLeft)" opacity="0.8" />

                      {/* Right Wings */}
                      <path d="M 160 60 C 185 30, 220 20, 255 38 C 230 48, 205 52, 182 70 Z" fill="url(#goldWingRight)" />
                      <path d="M 155 65 C 175 42, 205 35, 235 52 C 212 60, 190 66, 172 78 Z" fill="url(#goldWingRight)" opacity="0.9" />
                      <path d="M 150 70 C 168 55, 190 50, 215 65 C 195 72, 175 76, 160 84 Z" fill="url(#goldWingRight)" opacity="0.8" />

                      {/* Golden Ribbon Wrap */}
                      <path d="M 50 82 Q 95 62, 140 64 Q 185 62, 230 82 Q 195 102, 140 98 Q 85 102, 50 82 Z" fill="url(#goldRibbonGrad)" stroke="#fde68a" strokeWidth="1" />
                      <path d="M 50 82 L 32 94 L 48 106 L 62 90 Z" fill="#b45309" />
                      <path d="M 230 82 L 248 94 L 232 106 L 218 90 Z" fill="#b45309" />

                      {/* Golden Circular Medal */}
                      <circle cx="140" cy="52" r="34" fill="url(#goldMedalOuter)" stroke="#fff" strokeWidth="2.5" />
                      <circle cx="140" cy="52" r="28" fill="url(#goldMedalInner)" stroke="#fef08a" strokeWidth="1.5" />
                      <circle cx="140" cy="52" r="23" fill="#f59e0b" />
                    </svg>

                    {/* Rocket Icon in Medal Center */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                        <path d="M12 2.5s4 4.5 4 9.5c0 2-.8 3.8-2 5l1.5 3.5-3.5-1.5-3.5 1.5 1.5-3.5c-1.2-1.2-2-3-2-5 0-5 4-9.5 4-9.5z" />
                        <path d="M12 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="#f59e0b" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Main Orange-Coral Gradient Card */}
                <div className="bg-gradient-to-b from-[#ff8159] via-[#ff6854] to-[#fa4646] rounded-[28px] pt-12 pb-5 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 text-white relative overflow-hidden">
                  
                  {/* Top-Right Direct Close Icon */}
                  <button
                    type="button"
                    onClick={() => setResultBet(null)}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white cursor-pointer z-40 transition active:scale-95"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Congratulations Header */}
                  <div className="text-center pt-2 pb-2">
                    <h2 className="text-2xl sm:text-[26px] font-black tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      Congratulations
                    </h2>
                  </div>

                  {/* Lottery results row */}
                  <div className="flex items-center justify-center gap-1.5 pt-1 pb-3 flex-wrap">
                    <span className="text-xs font-semibold text-white/90 mr-1">
                      Lottery results
                    </span>
                    {/* Result color badge (Supports split color like Green Violet) */}
                    {resultBet.bet.resultNumber === 5 ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black text-white bg-gradient-to-r from-[#10b981] to-[#a855f7] shadow-sm">
                        Green Violet
                      </span>
                    ) : resultBet.bet.resultNumber === 0 ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black text-white bg-gradient-to-r from-[#ef4444] to-[#a855f7] shadow-sm">
                        Red Violet
                      </span>
                    ) : (
                      <span
                        className={`px-3 py-0.5 rounded-lg text-xs font-black text-white capitalize shadow-sm ${
                          resultBet.bet.resultColor === 'red'
                            ? 'bg-[#ef4444]'
                            : resultBet.bet.resultColor === 'violet'
                            ? 'bg-[#a855f7]'
                            : 'bg-[#10b981]'
                        }`}
                      >
                        {resultBet.bet.resultColor || 'Green'}
                      </span>
                    )}

                    {/* Result Number */}
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black text-white bg-black/20 border border-white/20 shadow-sm">
                      {resultBet.bet.resultNumber ?? 0}
                    </span>

                    {/* Big / Small */}
                    <span className="text-xs font-bold text-white px-1">
                      {(resultBet.bet.resultNumber ?? 0) >= 5 ? 'Big' : 'Small'}
                    </span>
                  </div>

                  {/* ATM Dispenser Slot & White Voucher Paper */}
                  <div className="pt-1 pb-2">
                    {/* Dark Inset Dispenser Slot */}
                    <div className="w-[90%] mx-auto h-6 bg-[#b23725] rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)] relative z-20 border border-[#8f2718]" />

                    {/* White Curled Paper Receipt */}
                    <div className="w-[84%] mx-auto bg-white rounded-b-2xl shadow-[0_12px_28px_rgba(0,0,0,0.25)] pt-4 pb-3 px-3 text-center relative z-10 -mt-3 border-t border-transparent">
                      <div className="text-xs font-extrabold text-[#ff4c4c] tracking-wider uppercase">
                        Bonus
                      </div>
                      <div className="text-3xl sm:text-[34px] font-black font-mono text-[#ff3838] tracking-tight py-1">
                        ₹{resultBet.bet.winAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-zinc-600 font-medium">
                        Period: {gameTypes.find(g => g.type === resultBet.bet.gameType)?.title || 'WinGo 1 Min'}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono font-medium tracking-wide">
                        {resultBet.bet.periodId}
                      </div>
                    </div>
                  </div>

                  {/* Action button inside card */}
                  <div className="pt-3 flex flex-col items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setResultBet(null)}
                      className="px-8 py-2.5 rounded-full bg-white/25 hover:bg-white/35 border border-white/40 text-white font-black text-xs shadow-lg transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Collect & Continue (3s)</span>
                    </button>
                    <span className="text-[10px] text-white/80 font-medium">Auto-closing in 3 seconds...</span>
                  </div>
                </div>
              </div>
            ) : (
              /* EXACT 1:1 BLACK & WHITE / MONOCHROME LOSS CARD */
              <div className="relative w-full pt-14">
                {/* Top Winged Ribbon Emblem (Silver / Monochrome) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none w-full">
                  <div className="relative flex items-center justify-center">
                    {/* Silver Ribbon Wings SVG */}
                    <svg viewBox="0 0 280 120" className="w-72 h-32 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                      <defs>
                        <linearGradient id="silverWingLeft" x1="100%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#52525b" />
                          <stop offset="40%" stopColor="#a1a1aa" />
                          <stop offset="80%" stopColor="#e4e4e7" />
                          <stop offset="100%" stopColor="#f4f4f5" />
                        </linearGradient>
                        <linearGradient id="silverWingRight" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#52525b" />
                          <stop offset="40%" stopColor="#a1a1aa" />
                          <stop offset="80%" stopColor="#e4e4e7" />
                          <stop offset="100%" stopColor="#f4f4f5" />
                        </linearGradient>
                        <linearGradient id="silverRibbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#e4e4e7" />
                          <stop offset="40%" stopColor="#a1a1aa" />
                          <stop offset="100%" stopColor="#3f3f46" />
                        </linearGradient>
                        <linearGradient id="silverMedalOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="30%" stopColor="#e4e4e7" />
                          <stop offset="70%" stopColor="#a1a1aa" />
                          <stop offset="100%" stopColor="#52525b" />
                        </linearGradient>
                        <linearGradient id="silverMedalInner" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#f4f4f5" />
                          <stop offset="40%" stopColor="#a1a1aa" />
                          <stop offset="100%" stopColor="#52525b" />
                        </linearGradient>
                      </defs>

                      {/* Left Wings */}
                      <path d="M 120 60 C 95 30, 60 20, 25 38 C 50 48, 75 52, 98 70 Z" fill="url(#silverWingLeft)" />
                      <path d="M 125 65 C 105 42, 75 35, 45 52 C 68 60, 90 66, 108 78 Z" fill="url(#silverWingLeft)" opacity="0.9" />
                      <path d="M 130 70 C 112 55, 90 50, 65 65 C 85 72, 105 76, 120 84 Z" fill="url(#silverWingLeft)" opacity="0.8" />

                      {/* Right Wings */}
                      <path d="M 160 60 C 185 30, 220 20, 255 38 C 230 48, 205 52, 182 70 Z" fill="url(#silverWingRight)" />
                      <path d="M 155 65 C 175 42, 205 35, 235 52 C 212 60, 190 66, 172 78 Z" fill="url(#silverWingRight)" opacity="0.9" />
                      <path d="M 150 70 C 168 55, 190 50, 215 65 C 195 72, 175 76, 160 84 Z" fill="url(#silverWingRight)" opacity="0.8" />

                      {/* Silver Ribbon Wrap */}
                      <path d="M 50 82 Q 95 62, 140 64 Q 185 62, 230 82 Q 195 102, 140 98 Q 85 102, 50 82 Z" fill="url(#silverRibbonGrad)" stroke="#e4e4e7" strokeWidth="1" />
                      <path d="M 50 82 L 32 94 L 48 106 L 62 90 Z" fill="#3f3f46" />
                      <path d="M 230 82 L 248 94 L 232 106 L 218 90 Z" fill="#3f3f46" />

                      {/* Silver Circular Medal */}
                      <circle cx="140" cy="52" r="34" fill="url(#silverMedalOuter)" stroke="#fff" strokeWidth="2.5" />
                      <circle cx="140" cy="52" r="28" fill="url(#silverMedalInner)" stroke="#e4e4e7" strokeWidth="1.5" />
                      <circle cx="140" cy="52" r="23" fill="#52525b" />
                    </svg>

                    {/* Rocket / Frown Icon in Medal Center */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center text-zinc-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-zinc-100">
                        <path d="M12 2.5s4 4.5 4 9.5c0 2-.8 3.8-2 5l1.5 3.5-3.5-1.5-3.5 1.5 1.5-3.5c-1.2-1.2-2-3-2-5 0-5 4-9.5 4-9.5z" />
                        <path d="M12 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="#3f3f46" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Main Charcoal/Slate Gradient Card */}
                <div className="bg-gradient-to-b from-[#3a3f4d] via-[#2a2f3e] to-[#1c1f29] rounded-[28px] pt-12 pb-5 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-zinc-600/40 text-white relative overflow-hidden">
                  
                  {/* Top-Right Direct Close Icon */}
                  <button
                    type="button"
                    onClick={() => setResultBet(null)}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white cursor-pointer z-40 transition active:scale-95"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Better Luck Next Time Header */}
                  <div className="text-center pt-2 pb-2">
                    <h2 className="text-xl sm:text-[22px] font-black tracking-wide text-zinc-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      Better Luck Next Time
                    </h2>
                  </div>

                  {/* Lottery results row */}
                  <div className="flex items-center justify-center gap-1.5 pt-1 pb-3 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-400 mr-1">
                      Lottery results
                    </span>
                    <span className="px-3 py-0.5 rounded-lg text-xs font-black text-zinc-100 bg-zinc-700 border border-zinc-500/30 capitalize shadow-sm">
                      {resultBet.bet.resultColor || 'Green'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black text-zinc-100 bg-zinc-800 border border-zinc-500/30 shadow-sm">
                      {resultBet.bet.resultNumber ?? 0}
                    </span>
                    <span className="text-xs font-bold text-zinc-300 px-1">
                      {(resultBet.bet.resultNumber ?? 0) >= 5 ? 'Big' : 'Small'}
                    </span>
                  </div>

                  {/* Inset Slot & White/Light Gray Voucher Paper */}
                  <div className="pt-1 pb-2">
                    {/* Dark Charcoal Inset Slot */}
                    <div className="w-[90%] mx-auto h-6 bg-[#12151c] rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.8)] relative z-20 border border-zinc-700" />

                    {/* White/Light Gray Paper Receipt */}
                    <div className="w-[84%] mx-auto bg-white rounded-b-2xl shadow-[0_12px_28px_rgba(0,0,0,0.3)] pt-4 pb-3 px-3 text-center relative z-10 -mt-3 border-t border-transparent">
                      <div className="text-xs font-extrabold text-zinc-600 tracking-wider uppercase">
                        Loss Amount
                      </div>
                      <div className="text-3xl sm:text-[34px] font-black font-mono text-zinc-900 tracking-tight py-1">
                        -₹{resultBet.bet.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-zinc-600 font-medium">
                        Period: {gameTypes.find(g => g.type === resultBet.bet.gameType)?.title || 'WinGo 1 Min'}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono font-medium tracking-wide">
                        {resultBet.bet.periodId}
                      </div>
                    </div>
                  </div>

                  {/* Action button inside card */}
                  <div className="pt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setResultBet(null)}
                      className="px-8 py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-zinc-500/40 text-zinc-100 font-black text-xs shadow-lg transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <span>Close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Close Button Below the Card */}
            <button
              onClick={() => setResultBet(null)}
              aria-label="Close popup"
              className="mt-5 w-11 h-11 rounded-full border-2 border-white flex items-center justify-center text-white hover:scale-105 active:scale-95 transition shadow-[0_4px_16px_rgba(0,0,0,0.5)] bg-black/30 cursor-pointer"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* BET DETAILS MODAL in Yellow & Black theme */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121520] border border-[#f5c443]/30 rounded-3xl max-w-sm w-full p-5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f5c443]/20">
              <h3 className="font-black text-base text-[#f5c443]">Bet Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Order number</span>
                <div className="flex items-center gap-1 font-mono text-zinc-200">
                  <span>{selectedOrder.orderNumber || selectedOrder.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedOrder.orderNumber || selectedOrder.id);
                      showToast('Order number copied', 'info');
                    }}
                    className="text-[#f5c443]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Period</span>
                <span className="font-mono text-white font-bold">{selectedOrder.periodId}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Purchase amount</span>
                <span className="font-mono text-white font-bold">₹ {selectedOrder.totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Quantity</span>
                <span className="font-mono text-zinc-200">{selectedOrder.multiplier || 1}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Bet Amount / Stake</span>
                <span className="font-mono text-white font-bold">
                  ₹ {selectedOrder.totalAmount.toFixed(2)}
                </span>
              </div>

              {((selectedOrder as any).gstCutAmount > 0 || (selectedOrder.taxAmount && selectedOrder.taxAmount > 0)) && selectedOrder.status === 'won' && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Winning Tax Cut ({(selectedOrder as any).gstCutPercent || 0}%)</span>
                  <span className="font-mono text-rose-400 font-bold">
                    -₹ {Number((selectedOrder as any).gstCutAmount || selectedOrder.taxAmount || 0).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Result</span>
                <span className="font-mono text-white font-bold">
                  {selectedOrder.resultNumber !== undefined ? `${selectedOrder.resultNumber} (${(selectedOrder.resultNumber >= 5 ? 'Big' : 'Small')})` : 'Pending'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Select</span>
                <span className="font-bold text-[#f5c443] uppercase">{String(selectedOrder.selection)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Status</span>
                <span className={`font-bold ${selectedOrder.status === 'won' ? 'text-emerald-400' : selectedOrder.status === 'pending' ? 'text-amber-400' : 'text-rose-400'}`}>
                  {selectedOrder.status === 'won' ? 'Succeed' : selectedOrder.status === 'pending' ? 'Pending' : 'Failed'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Win / Lose</span>
                <span className={`font-black font-mono ${selectedOrder.status === 'won' ? 'text-emerald-400' : selectedOrder.status === 'pending' ? 'text-zinc-400' : 'text-rose-400'}`}>
                  {selectedOrder.status === 'won' ? `+₹${selectedOrder.winAmount.toFixed(2)}` : selectedOrder.status === 'pending' ? '₹0.00' : `-₹${selectedOrder.totalAmount.toFixed(2)}`}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full py-3 bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-[#0d0f17] font-black text-xs rounded-xl shadow hover:brightness-105 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
