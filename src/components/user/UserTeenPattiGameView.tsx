import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { teenPattiAudio } from '../../utils/teenPattiAudio.js';
import {
  dealTeenPattiCards,
  compareHands,
  hasPlusBonus,
  evaluateTeenPattiHand,
} from '../../utils/teenPattiEngine.js';
import {
  PlayingCard,
  DemoRound,
  DemoBet,
  DemoBetSelection,
  RecentResultRecord,
} from '../../types/teenPatti.js';
import confetti from 'canvas-confetti';
import dealerIdleImg from '../../assets/images/teen_patti_dealer_idle_1787668229835.jpg';
import dealerDealingImg from '../../assets/images/teen_patti_dealer_dealing_1787668275439.jpg';
import {
  ArrowLeft,
  Wallet,
  Volume2,
  VolumeX,
  HelpCircle,
  History as HistoryIcon,
  RotateCcw,
  Sparkles,
  Trophy,
  Check,
  X,
  ShieldCheck,
  ChevronRight,
  Edit3,
  Lock,
  Eye,
  Info,
  Clock,
  Flame,
  Zap,
} from 'lucide-react';

interface UserTeenPattiGameViewProps {
  onBack: () => void;
  onNavigateDeposit?: () => void;
}

const STANDARD_CHIPS = [100, 500, 1000, 5000, 10000, 25000];

// LocalStorage Keys for Teen Patti state persistence
const STORAGE_DEMO_BETS = 'teenpatti_bets_v1';
const STORAGE_RECENT_RESULTS = 'teenpatti_recent_results_v1';
const STORAGE_ROUND_COUNTER = 'teenpatti_round_counter_v1';

export const UserTeenPattiGameView: React.FC<UserTeenPattiGameViewProps> = ({
  onBack,
  onNavigateDeposit,
}) => {
  const { user, refreshUser, showToast } = useAuth();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // 1. Audio State
  const [isMuted, setIsMuted] = useState(false);
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    teenPattiAudio.setMuted(next);
  };

  // 2. Bets & History Ledger
  const [demoBets, setDemoBets] = useState<DemoBet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DEMO_BETS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveDemoBets = (bets: DemoBet[]) => {
    setDemoBets(bets);
    try {
      localStorage.setItem(STORAGE_DEMO_BETS, JSON.stringify(bets));
    } catch {
      // ignore
    }
  };

  // 4. Recent Result Strip
  const [recentResults, setRecentResults] = useState<RecentResultRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECENT_RESULTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Default initial seeded history matching screenshot pattern (B, B, A, A, B...)
    return [
      { roundId: '256488570', winner: 'B' },
      { roundId: '256488571', winner: 'B' },
      { roundId: '256488572', winner: 'A' },
      { roundId: '256488573', winner: 'A' },
      { roundId: '256488574', winner: 'B' },
      { roundId: '256488575', winner: 'B' },
      { roundId: '256488576', winner: 'B' },
      { roundId: '256488577', winner: 'A' },
      { roundId: '256488578', winner: 'A' },
      { roundId: '256488579', winner: 'B' },
      { roundId: '256488580', winner: 'A' },
      { roundId: '256488581', winner: 'B' },
      { roundId: '256488582', winner: 'A' },
      { roundId: '256488583', winner: 'B' },
      { roundId: '256488584', winner: 'A' },
      { roundId: '256488585', winner: 'B' },
    ];
  });

  const saveRecentResults = (results: RecentResultRecord[]) => {
    setRecentResults(results);
    try {
      localStorage.setItem(STORAGE_RECENT_RESULTS, JSON.stringify(results));
    } catch {
      // ignore
    }
  };

  // 5. Active Live Game Round State
  const [round, setRound] = useState<DemoRound>(() => {
    const { cardsA, cardsB } = dealTeenPattiCards();
    let initialRoundNum = 256488586;
    try {
      const saved = localStorage.getItem(STORAGE_ROUND_COUNTER);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) initialRoundNum = parsed;
      }
    } catch {
      // ignore
    }
    return {
      id: String(initialRoundNum),
      roundNumber: initialRoundNum,
      state: 'BETTING_OPEN',
      countdown: 18,
      cardsA,
      cardsB,
      cardsRevealedA: [false, false, false],
      cardsRevealedB: [false, false, false],
      winner: null,
      settled: false,
      timestamp: new Date().toLocaleTimeString(),
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ROUND_COUNTER, String(round.roundNumber));
    } catch {
      // ignore
    }
  }, [round.roundNumber]);

  // 6. Betting Chips & Controls
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [customChipInput, setCustomChipInput] = useState('100');
  const [customChipValue, setCustomChipValue] = useState<number | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyTab, setHistoryTab] = useState<'pending' | 'settled'>('pending');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showResultDetailModal, setShowResultDetailModal] = useState<RecentResultRecord | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // Win Notification State for celebrating winning bets
  const [winNotification, setWinNotification] = useState<{
    roundId: string;
    winner: string;
    totalWin: number;
    netProfit: number;
    winningBets: {
      selectionLabel: string;
      stake: number;
      winAmount: number;
      odds: number;
    }[];
    winningHandTitle?: string;
  } | null>(null);

  // Previous round bets for Repeat feature
  const [lastRoundBets, setLastRoundBets] = useState<{ selection: DemoBetSelection; stake: number }[]>([]);

  // Show temporary toast message
  const toastTimeoutRef = useRef<any>(null);
  const setShowToastMsg = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  };

  // Live viewer count simulator
  const [viewerCount, setViewerCount] = useState(18);
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => Math.max(12, Math.min(36, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Filter current round's pending bets
  const currentRoundBets = useMemo(() => {
    return demoBets.filter((b) => b.roundId === round.id && b.status === 'PENDING');
  }, [demoBets, round.id]);

  const currentRoundTotalBet = useMemo(() => {
    return currentRoundBets.reduce((sum, b) => sum + b.stake, 0);
  }, [currentRoundBets]);

  // Stakes placed on specific selections for the active round
  const activeStakeOn = (selection: DemoBetSelection) => {
    return currentRoundBets
      .filter((b) => b.selection === selection)
      .reduce((sum, b) => sum + b.stake, 0);
  };

  // Settlement lock ref to prevent duplicate settlements
  const settlementLockRef = useRef<string | null>(null);

  // ----------------------------------------------------
  // MAIN REAL-TIME GAME LOOP & COUNTDOWN TIMER
  // ----------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setRound((prev) => {
        // COUNTDOWN DECREMENT
        if (prev.countdown > 0) {
          if (prev.state === 'BETTING_OPEN' && prev.countdown <= 5) {
            teenPattiAudio.playCountdownTick();
          }
          return { ...prev, countdown: prev.countdown - 1 };
        }

        // STATE TRANSITIONS WHEN COUNTDOWN HITS 0
        if (prev.state === 'BETTING_OPEN') {
          // Move to BETTING_CLOSED
          return {
            ...prev,
            state: 'BETTING_CLOSED',
            countdown: 2,
          };
        } else if (prev.state === 'BETTING_CLOSED') {
          // Move to DEALING
          teenPattiAudio.playCardDeal();
          return {
            ...prev,
            state: 'DEALING',
            countdown: 6,
            cardsRevealedA: [false, false, false],
            cardsRevealedB: [false, false, false],
          };
        } else if (prev.state === 'DEALING') {
          // Evaluate outcome and move to RESULT & SETTLEMENT
          const outcome = compareHands(prev.cardsA, prev.cardsB);
          return {
            ...prev,
            state: 'RESULT',
            countdown: 5,
            winner: outcome.winner,
            handA: outcome.handA,
            handB: outcome.handB,
            cardsRevealedA: [true, true, true],
            cardsRevealedB: [true, true, true],
          };
        } else if (prev.state === 'RESULT') {
          // Move to SETTLEMENT & NEW ROUND
          const nextRoundNumber = prev.roundNumber + 1;
          const nextRoundId = String(nextRoundNumber);
          const { cardsA, cardsB } = dealTeenPattiCards();

          // Clear any active win notification popup when new round begins
          setWinNotification(null);

          // Save current round bets for Repeat feature
          const currentBetsForRepeat = demoBets
            .filter((b) => b.roundId === prev.id)
            .map((b) => ({ selection: b.selection, stake: b.stake }));
          if (currentBetsForRepeat.length > 0) {
            setLastRoundBets(currentBetsForRepeat);
          }

          return {
            id: nextRoundId,
            roundNumber: nextRoundNumber,
            state: 'BETTING_OPEN',
            countdown: 18,
            cardsA,
            cardsB,
            cardsRevealedA: [false, false, false],
            cardsRevealedB: [false, false, false],
            winner: null,
            settled: false,
            timestamp: new Date().toLocaleTimeString(),
          };
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [demoBets]);

  // Card dealing animation sequence during DEALING state
  useEffect(() => {
    if (round.state === 'DEALING') {
      // Reveal cards step by step: A1 -> B1 -> A2 -> B2 -> A3 -> B3
      const t1 = setTimeout(() => {
        setRound((r) => ({ ...r, cardsRevealedA: [true, false, false] }));
        teenPattiAudio.playCardFlip();
      }, 700);

      const t2 = setTimeout(() => {
        setRound((r) => ({ ...r, cardsRevealedB: [true, false, false] }));
        teenPattiAudio.playCardFlip();
      }, 1400);

      const t3 = setTimeout(() => {
        setRound((r) => ({ ...r, cardsRevealedA: [true, true, false] }));
        teenPattiAudio.playCardFlip();
      }, 2100);

      const t4 = setTimeout(() => {
        setRound((r) => ({ ...r, cardsRevealedB: [true, true, false] }));
        teenPattiAudio.playCardFlip();
      }, 2800);

      const t5 = setTimeout(() => {
        setRound((r) => ({ ...r, cardsRevealedA: [true, true, true] }));
        teenPattiAudio.playCardFlip();
      }, 3500);

      const t6 = setTimeout(() => {
        setRound((r) => ({ ...r, cardsRevealedB: [true, true, true] }));
        teenPattiAudio.playCardFlip();
      }, 4200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        clearTimeout(t6);
      };
    }
  }, [round.state]);

  // ----------------------------------------------------
  // IDEMPOTENT SETTLEMENT LOGIC (Real Wallet Integration)
  // ----------------------------------------------------
  useEffect(() => {
    if (round.state === 'RESULT' && round.winner && !round.settled) {
      if (settlementLockRef.current === round.id) return;
      settlementLockRef.current = round.id;

      const runSettlement = async () => {
        // Calculate outcome
        const winner = round.winner;
        const handA = round.handA || evaluateTeenPattiHand(round.cardsA);
        const handB = round.handB || evaluateTeenPattiHand(round.cardsB);
        const aPlusWin = hasPlusBonus(handA);
        const bPlusWin = hasPlusBonus(handB);

        let totalWinningsCredit = 0;
        let userWonAny = false;
        const currentUser = userRef.current;

        // Update all pending bets for this round
        const updatedBets = demoBets.map((bet) => {
          if (bet.roundId !== round.id || bet.status !== 'PENDING') {
            return bet;
          }

          let isWin = false;
          let returnMultiplier = bet.odds;

          if (bet.selection === 'A_BACK' && winner === 'A') {
            isWin = true;
          } else if (bet.selection === 'B_BACK' && winner === 'B') {
            isWin = true;
          } else if (bet.selection === 'A_LAY' && winner !== 'A') {
            isWin = true;
          } else if (bet.selection === 'B_LAY' && winner !== 'B') {
            isWin = true;
          } else if (bet.selection === 'A_PLUS' && aPlusWin) {
            isWin = true;
          } else if (bet.selection === 'B_PLUS' && bPlusWin) {
            isWin = true;
          }

          if (isWin) {
            userWonAny = true;
            const winAmount = Math.round(bet.stake * returnMultiplier);
            totalWinningsCredit += winAmount;

            // Credit winnings to real user account & record bet
            if (currentUser?.uid) {
              api
                .updateWalletBalance(
                  currentUser.uid,
                  winAmount,
                  'win',
                  `Teen Patti Round #${round.id} WON - ${bet.selectionLabel} @ ${bet.odds}x (Payout: ₹${winAmount})`,
                  'teen_patti'
                )
                .catch((e) => console.error('Failed to credit win:', e));

              api
                .recordGameBet({
                  userId: currentUser.uid,
                  gameType: 'teen_patti' as any,
                  periodId: `${round.id}`,
                  unitAmount: bet.stake,
                  multiplier: bet.odds,
                  totalAmount: bet.stake,
                  status: 'won',
                  winAmount,
                })
                .catch((e) => console.error('Failed to record won bet:', e));
            }

            return {
              ...bet,
              status: 'WON' as const,
              result: 'WON' as const,
              winAmount,
              netReturn: winAmount - bet.stake,
              settledAt: new Date().toLocaleTimeString(),
            };
          } else {
            // Record lost bet in backend (stake already deducted at placement)
            if (currentUser?.uid) {
              api
                .recordGameBet({
                  userId: currentUser.uid,
                  gameType: 'teen_patti' as any,
                  periodId: `${round.id}`,
                  unitAmount: bet.stake,
                  multiplier: bet.odds,
                  totalAmount: bet.stake,
                  status: 'lost',
                  winAmount: 0,
                })
                .catch((e) => console.error('Failed to record lost bet:', e));
            }

            return {
              ...bet,
              status: 'LOST' as const,
              result: 'LOST' as const,
              winAmount: 0,
              netReturn: -bet.stake,
              settledAt: new Date().toLocaleTimeString(),
            };
          }
        });

        // Save updated bets
        saveDemoBets(updatedBets);

        // Refresh user balance if any bets were processed
        if (currentUser?.uid) {
          refreshUser();
        }

        // Add to recent results strip
        const newRecent: RecentResultRecord = {
          roundId: round.id,
          winner,
          handA: handA.title,
          handB: handB.title,
        };
        saveRecentResults([newRecent, ...recentResults.slice(0, 39)]);

        // Confetti & celebratory audio & Rich Win Notification Modal
        if (userWonAny && totalWinningsCredit > 0) {
          teenPattiAudio.playWin();
          confetti({
            particleCount: 75,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#ffffff'],
          });

          // Filter all bets won in this round
          const wonBetsList = updatedBets
            .filter((b) => b.roundId === round.id && b.status === 'WON')
            .map((b) => ({
              selectionLabel: b.selectionLabel,
              stake: b.stake,
              winAmount: b.winAmount || Math.round(b.stake * b.odds),
              odds: b.odds,
            }));

          const totalWinningStakes = wonBetsList.reduce((acc, b) => acc + b.stake, 0);

          setWinNotification({
            roundId: round.id,
            winner,
            totalWin: totalWinningsCredit,
            netProfit: totalWinningsCredit - totalWinningStakes,
            winningBets: wonBetsList,
            winningHandTitle: winner === 'A' ? handA.title : winner === 'B' ? handB.title : 'Tie',
          });

          setShowToastMsg(`🎉 WON ₹${totalWinningsCredit.toLocaleString()} credited to your ID balance!`);
        }

        // Mark round settled
        setRound((r) => ({ ...r, settled: true }));
      };

      runSettlement();
    }
  }, [round.state, round.winner, round.settled, round.id, demoBets, recentResults]);

  // ----------------------------------------------------
  // BETTING ACTIONS (REAL WALLET INTEGRATION)
  // ----------------------------------------------------
  const handlePlaceDemoBet = async (selection: DemoBetSelection, odds: number, label: string) => {
    // Check if Lay button is clicked (Locked)
    if (selection === 'A_LAY' || selection === 'B_LAY') {
      setShowToastMsg('🔒 Lay betting is currently locked. Only Back (1.98) & Plus (4.50) are active!');
      return;
    }

    if (round.state !== 'BETTING_OPEN') {
      setShowToastMsg('⏳ Betting is currently closed for this round!');
      return;
    }

    const stake = customChipValue || selectedChip;

    if (stake <= 0) {
      setShowToastMsg('Please select a valid bet amount!');
      return;
    }

    const currentBalance = userRef.current?.walletBalance ?? 0;
    if (currentBalance < stake) {
      setShowToastMsg(`⚠️ Insufficient balance (₹${currentBalance.toLocaleString()}) in your ID! Please recharge to place bet.`);
      return;
    }

    // Deduct stake from Real User ID Wallet immediately
    const currentUser = userRef.current;
    if (currentUser?.uid) {
      try {
        await api.updateWalletBalance(
          currentUser.uid,
          -stake,
          'bet',
          `Teen Patti Bet - Round #${round.id} (${label} - Stake: ₹${stake})`,
          'teen_patti'
        );
        refreshUser();
      } catch (err: any) {
        console.error('Failed to deduct bet from wallet:', err);
        setShowToastMsg(err?.message || 'Failed to place bet. Check balance.');
        return;
      }
    }

    teenPattiAudio.playBetPlaced();

    const newBet: DemoBet = {
      id: 'tb_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      roundId: round.id,
      roundNumber: round.roundNumber,
      userId: currentUser?.phone || currentUser?.username || 'User',
      selection,
      selectionLabel: label,
      stake,
      odds,
      status: 'PENDING',
      createdAt: new Date().toLocaleTimeString(),
    };

    saveDemoBets([newBet, ...demoBets]);
    setShowToastMsg(`✓ Placed ₹${stake} on ${label} (ID balance updated)`);
  };

  // Undo unconfirmed / latest bet from current round (Refunds stake to user wallet)
  const handleUndoBet = async () => {
    if (round.state !== 'BETTING_OPEN') {
      setShowToastMsg('Cannot undo after betting is closed');
      return;
    }

    // Find the latest pending bet in this round
    const latestPendingIdx = demoBets.findIndex(
      (b) => b.roundId === round.id && b.status === 'PENDING'
    );

    if (latestPendingIdx === -1) {
      setShowToastMsg('No pending bets to undo in this round');
      return;
    }

    const betToUndo = demoBets[latestPendingIdx];
    const currentUser = userRef.current;

    // Refund stake to Real User ID Wallet
    if (currentUser?.uid) {
      try {
        await api.updateWalletBalance(
          currentUser.uid,
          betToUndo.stake,
          'refund',
          `Teen Patti Bet Undo/Refund - Round #${round.id} (${betToUndo.selectionLabel} - ₹${betToUndo.stake})`,
          'teen_patti'
        );
        refreshUser();
      } catch (err) {
        console.error('Failed to refund undo bet:', err);
      }
    }

    teenPattiAudio.playUndo();

    const updated = [...demoBets];
    updated.splice(latestPendingIdx, 1);
    saveDemoBets(updated);
    setShowToastMsg(`↩ Refunded ₹${betToUndo.stake} for ${betToUndo.selectionLabel}`);
  };

  // Repeat previous round bets (excluding locked Lay bets)
  const handleRepeatBets = async () => {
    if (round.state !== 'BETTING_OPEN') {
      setShowToastMsg('Cannot place bets now');
      return;
    }

    // Filter out any locked Lay selections from previous round
    const validRepeatBets = lastRoundBets.filter(
      (b) => b.selection !== 'A_LAY' && b.selection !== 'B_LAY'
    );

    if (validRepeatBets.length === 0) {
      setShowToastMsg('No previous valid bets to repeat');
      return;
    }

    const totalRepeatStake = validRepeatBets.reduce((sum, b) => sum + b.stake, 0);
    const currentBalance = userRef.current?.walletBalance ?? 0;

    if (currentBalance < totalRepeatStake) {
      setShowToastMsg(`⚠️ Insufficient balance (₹${currentBalance.toLocaleString()}) to repeat previous bets`);
      return;
    }

    const currentUser = userRef.current;
    if (currentUser?.uid) {
      try {
        await api.updateWalletBalance(
          currentUser.uid,
          -totalRepeatStake,
          'bet',
          `Teen Patti Repeat Bets - Round #${round.id} (${validRepeatBets.length} bets - ₹${totalRepeatStake})`,
          'teen_patti'
        );
        refreshUser();
      } catch (err: any) {
        console.error('Failed to deduct repeat bets from wallet:', err);
        setShowToastMsg(err?.message || 'Failed to place repeat bets');
        return;
      }
    }

    teenPattiAudio.playBetPlaced();

    const newBets: DemoBet[] = validRepeatBets.map((b) => {
      let label = 'Player A Back';
      let odds = 1.98;
      if (b.selection === 'B_BACK') {
        label = 'Player B Back';
        odds = 1.98;
      } else if (b.selection === 'A_PLUS') {
        label = 'A-plus (4.5x)';
        odds = 4.5;
      } else if (b.selection === 'B_PLUS') {
        label = 'B-plus (4.5x)';
        odds = 4.5;
      }

      return {
        id: 'tb_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        roundId: round.id,
        roundNumber: round.roundNumber,
        userId: currentUser?.phone || currentUser?.username || 'User',
        selection: b.selection,
        selectionLabel: label,
        stake: b.stake,
        odds,
        status: 'PENDING',
        createdAt: new Date().toLocaleTimeString(),
      };
    });

    saveDemoBets([...newBets, ...demoBets]);
    setShowToastMsg(`✓ Repeated ${validRepeatBets.length} bets (₹${totalRepeatStake} deducted from ID)`);
  };

  // Custom Chip Apply Handler
  const handleApplyCustomChip = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(customChipInput, 10);
    if (isNaN(val) || val <= 0) {
      setShowToastMsg('Enter a valid amount');
      return;
    }
    setCustomChipValue(val);
    setSelectedChip(val);
    setShowCustomModal(false);
    teenPattiAudio.playChip();
    setShowToastMsg(`Custom bet chip set to ₹${val.toLocaleString()}`);
  };

  // ----------------------------------------------------
  // HELPER: RENDER CARD BOX WITH NATURAL 3D FLIP
  // ----------------------------------------------------
  const renderCard = (card: PlayingCard, isRevealed: boolean, index: number) => {
    return (
      <div
        key={index}
        className={`relative w-[34px] h-[48px] min-[360px]:w-[38px] min-[360px]:h-[54px] min-[400px]:w-[42px] min-[400px]:h-[60px] sm:w-[48px] sm:h-[68px] md:w-[56px] md:h-[80px] rounded-md sm:rounded-lg select-none transition-all duration-500 transform-gpu perspective-1000 shrink-0 ${
          isRevealed ? 'rotate-y-180 scale-100' : 'scale-95'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* CARD BACK (Classic Casino Pattern Matching Reference) */}
        <div
          className={`absolute inset-0 rounded-md sm:rounded-lg border border-white/30 shadow-md bg-gradient-to-br from-blue-900 via-indigo-950 to-blue-950 flex items-center justify-center overflow-hidden backface-hidden ${
            isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Geometric Casino Diamond Mesh Background */}
          <div className="absolute inset-0.5 rounded border border-blue-400/40 bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:4px_4px] opacity-70" />
          <div className="w-4 h-4 min-[360px]:w-5 min-[360px]:h-5 rounded-full border border-amber-400/60 bg-black/40 flex items-center justify-center shadow-inner">
            <span className="text-[8px] min-[360px]:text-[9px] font-black text-amber-400 font-serif">♠</span>
          </div>
        </div>

        {/* CARD FRONT (Crisp Rank & Suit with Shadows) */}
        <div
          className={`absolute inset-0 rounded-md sm:rounded-lg border border-zinc-300 shadow-md bg-white flex flex-col justify-between p-0.5 min-[360px]:p-1 select-none backface-hidden ${
            !isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Top Rank + Suit */}
          <div className="flex items-center justify-between leading-none">
            <span
              className={`font-black text-[9px] min-[360px]:text-[11px] sm:text-xs font-mono ${
                card.color === 'red' ? 'text-red-600' : 'text-zinc-950'
              }`}
            >
              {card.rank}
            </span>
            <span
              className={`text-[8px] min-[360px]:text-[10px] sm:text-xs font-black ${
                card.color === 'red' ? 'text-red-600' : 'text-zinc-950'
              }`}
            >
              {card.symbol}
            </span>
          </div>

          {/* Large Center Suit Symbol */}
          <div className="text-center my-auto leading-none">
            <span
              className={`text-xs min-[360px]:text-sm min-[400px]:text-base sm:text-xl font-black ${
                card.color === 'red' ? 'text-red-600' : 'text-zinc-950'
              }`}
            >
              {card.symbol}
            </span>
          </div>

          {/* Bottom Inverted Rank + Suit */}
          <div className="flex items-center justify-between leading-none rotate-180">
            <span
              className={`font-black text-[9px] min-[360px]:text-[11px] sm:text-xs font-mono ${
                card.color === 'red' ? 'text-red-600' : 'text-zinc-950'
              }`}
            >
              {card.rank}
            </span>
            <span
              className={`text-[8px] min-[360px]:text-[10px] sm:text-xs font-black ${
                card.color === 'red' ? 'text-red-600' : 'text-zinc-950'
              }`}
            >
              {card.symbol}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070913] text-white flex flex-col select-none relative overflow-x-hidden font-sans pb-28">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP BAR (Mobile-First Header)                     */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-[#0c0e1a]/95 backdrop-blur-md border-b border-[#232942] px-3 py-2 flex items-center justify-between shadow-lg">
        {/* Left: Back & Game Info */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-[#161a2e] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition"
            title="Back to Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs sm:text-sm tracking-wide text-white">
                Teen Patti
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-red-600/90 text-white font-mono text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
              <span>#{round.id}</span>
              <span className="text-zinc-500">•</span>
              <span className="flex items-center gap-0.5 text-zinc-300">
                <Eye className="w-3 h-3 text-cyan-400" />
                {viewerCount}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Circular Timer Badge */}
        <div className="flex items-center gap-1.5">
          <div className="relative w-9 h-9 rounded-full flex items-center justify-center bg-[#13172c] border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <span
              className={`font-mono font-black text-xs ${
                round.state === 'BETTING_OPEN'
                  ? 'text-emerald-400'
                  : round.state === 'BETTING_CLOSED'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            >
              {round.countdown}s
            </span>
          </div>
        </div>

        {/* Right: Sound, User Wallet Balance & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Real Wallet Balance Badge */}
          <div
            onClick={onNavigateDeposit}
            className="bg-[#141829] border border-amber-500/40 hover:border-amber-400 rounded-xl px-2.5 py-1 text-right flex items-center gap-1.5 transition cursor-pointer shadow-inner"
            title="Wallet Balance (Click to Deposit)"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="flex flex-col text-right">
              <span className="text-[8px] text-amber-400/90 font-bold uppercase tracking-wider leading-none">
                Wallet
              </span>
              <span className="font-mono font-black text-xs sm:text-sm text-white leading-tight">
                ₹{(user?.walletBalance ?? 0).toLocaleString()}
              </span>
            </div>
            {onNavigateDeposit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateDeposit();
                }}
                className="w-4 h-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-black text-[10px] shadow"
                title="Deposit / Recharge"
              >
                +
              </button>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="w-8 h-8 rounded-xl bg-[#161a2e] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Rules / Help */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="w-8 h-8 rounded-xl bg-[#161a2e] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition"
            title="Hand Rankings & Rules"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </header>

      {/* Floating Notification Toast */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#121526]/95 border border-amber-400/60 text-amber-300 font-bold text-xs px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. LIVE DEALER & CASINO TABLE VIDEO STAGE            */}
      {/* ---------------------------------------------------- */}
      <div className="relative w-full aspect-[16/9] max-h-[360px] bg-black overflow-hidden border-b border-[#232942]">
        {/* Real Live Dealer Studio Background Image (Idle vs Dealing) */}
        <img
          src={round.state === 'DEALING' ? dealerDealingImg : dealerIdleImg}
          alt="Live Dealer Teen Patti"
          className="w-full h-full object-cover object-center transition-all duration-700 filter brightness-95"
        />

        {/* Ambient Dark Velvet Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070913] via-transparent to-black/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />

        {/* Top-left: Watermark Live Broadcast Info */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-white/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-black text-white font-mono uppercase tracking-wider">
            STUDIO 1 • LIVE
          </span>
        </div>

        {/* Top-right: User Code tag (as seen in screenshot `i12an77`) */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-white/10 text-[10px] font-mono text-zinc-300 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
          <span>{user?.phone ? `user_${user.phone.slice(-4)}` : 'i12an77'}</span>
        </div>

        {/* Center-Top: Big Status Banner */}
        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
          <div
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wider uppercase shadow-2xl backdrop-blur-md border ${
              round.state === 'BETTING_OPEN'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-400/60 animate-pulse'
                : round.state === 'BETTING_CLOSED'
                ? 'bg-red-950/80 text-red-300 border-red-500/60'
                : round.state === 'DEALING'
                ? 'bg-blue-950/80 text-blue-300 border-blue-400/60'
                : 'bg-amber-950/90 text-amber-300 border-amber-400 scale-105 transition-transform'
            }`}
          >
            {round.state === 'BETTING_OPEN' && `Place your bets (${round.countdown}s)`}
            {round.state === 'BETTING_CLOSED' && 'Betting Closed'}
            {round.state === 'DEALING' && 'Dealer dealing cards...'}
            {round.state === 'RESULT' &&
              (round.winner === 'TIE'
                ? 'TIE / DRAW'
                : `🏆 WINNER: PLAYER ${round.winner}!`)}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* CENTER CARDS ON FELT (Player A & Player B)           */}
        {/* ---------------------------------------------------- */}
        <div className="absolute bottom-1.5 sm:bottom-2.5 inset-x-0 w-full px-1.5 min-[360px]:px-2.5 sm:px-6 flex items-end justify-between gap-1.5 min-[360px]:gap-2 sm:gap-4">
          {/* Player A Box */}
          <div className={`flex-1 max-w-[48.5%] min-w-0 flex flex-col items-center bg-black/75 backdrop-blur-md p-1 min-[360px]:p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all duration-300 shadow-2xl overflow-hidden ${
            round.state === 'RESULT' && round.winner === 'A'
              ? 'border-amber-400 ring-2 ring-amber-400/50 bg-blue-950/80 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
              : 'border-blue-500/40'
          }`}>
            <div className="flex items-center gap-1 mb-0.5 sm:mb-1 w-full justify-center">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-400 shrink-0" />
              <span className="font-black text-[11px] min-[360px]:text-xs sm:text-sm text-blue-300 uppercase tracking-wide truncate">
                Player A
              </span>
              {round.state === 'RESULT' && round.winner === 'A' && (
                <span className="text-[8px] sm:text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded-full ml-1 shrink-0 animate-bounce">
                  WON
                </span>
              )}
            </div>
            {/* 3 Cards */}
            <div className="flex items-center justify-center gap-0.5 min-[360px]:gap-1 sm:gap-1.5 w-full">
              {round.cardsA.map((card, i) =>
                renderCard(card, round.cardsRevealedA[i], i)
              )}
            </div>
            {/* Hand evaluation title if revealed */}
            {round.cardsRevealedA[2] && (
              <div className="mt-0.5 sm:mt-1 text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-bold text-amber-300 font-mono tracking-tight text-center truncate max-w-full px-1">
                {round.handA?.title || evaluateTeenPattiHand(round.cardsA).title}
              </div>
            )}
          </div>

          {/* Player B Box */}
          <div className={`flex-1 max-w-[48.5%] min-w-0 flex flex-col items-center bg-black/75 backdrop-blur-md p-1 min-[360px]:p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all duration-300 shadow-2xl overflow-hidden ${
            round.state === 'RESULT' && round.winner === 'B'
              ? 'border-amber-400 ring-2 ring-amber-400/50 bg-red-950/80 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
              : 'border-red-500/40'
          }`}>
            <div className="flex items-center gap-1 mb-0.5 sm:mb-1 w-full justify-center">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400 shrink-0" />
              <span className="font-black text-[11px] min-[360px]:text-xs sm:text-sm text-red-300 uppercase tracking-wide truncate">
                Player B
              </span>
              {round.state === 'RESULT' && round.winner === 'B' && (
                <span className="text-[8px] sm:text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded-full ml-1 shrink-0 animate-bounce">
                  WON
                </span>
              )}
            </div>
            {/* 3 Cards */}
            <div className="flex items-center justify-center gap-0.5 min-[360px]:gap-1 sm:gap-1.5 w-full">
              {round.cardsB.map((card, i) =>
                renderCard(card, round.cardsRevealedB[i], i)
              )}
            </div>
            {/* Hand evaluation title if revealed */}
            {round.cardsRevealedB[2] && (
              <div className="mt-0.5 sm:mt-1 text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-bold text-amber-300 font-mono tracking-tight text-center truncate max-w-full px-1">
                {round.handB?.title || evaluateTeenPattiHand(round.cardsB).title}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. BETTING / DEMO ACTION AREA (Matching Screenshot)   */}
      {/* ---------------------------------------------------- */}
      <div className="p-3 sm:p-4 max-w-3xl mx-auto w-full space-y-3">
        
        {/* Main Grid: Player A (Back & Lay) vs Player B (Back & Lay) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          
          {/* PLAYER A COLUMN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs sm:text-sm font-black text-blue-400 tracking-wide">
                Player A
              </span>
              {activeStakeOn('A_BACK') > 0 && (
                <span className="text-[10px] bg-blue-500/30 text-blue-300 border border-blue-400/40 px-2 py-0.2 rounded-full font-mono font-bold">
                  Stake: ₹{activeStakeOn('A_BACK')}
                </span>
              )}
            </div>

            {/* Back & Lay Buttons Row */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Back Button (Blue) */}
              <button
                type="button"
                onClick={() => handlePlaceDemoBet('A_BACK', 1.98, 'Player A Back')}
                disabled={round.state !== 'BETTING_OPEN'}
                className={`relative h-14 sm:h-16 rounded-xl sm:rounded-2xl transition active:scale-95 flex flex-col items-center justify-center p-1 shadow-lg border cursor-pointer ${
                  round.state === 'BETTING_OPEN'
                    ? 'bg-[#1e60d5] hover:bg-[#256cf0] border-blue-400 text-white shadow-[0_4px_14px_rgba(30,96,213,0.4)]'
                    : 'bg-[#1e60d5]/60 border-blue-600/40 text-zinc-300 opacity-80 cursor-not-allowed'
                }`}
              >
                <span className="text-base sm:text-lg font-black tracking-wide leading-none">
                  Back
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-blue-200 mt-1">
                  1.98
                </span>
                {activeStakeOn('A_BACK') > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black font-mono font-black text-[9px] px-1.5 py-0.2 rounded-full shadow">
                    ₹{activeStakeOn('A_BACK')}
                  </span>
                )}
              </button>

              {/* Lay Button (Red / Locked style) */}
              <button
                type="button"
                onClick={() => handlePlaceDemoBet('A_LAY', 1.98, 'Player A Lay')}
                className="relative h-14 sm:h-16 rounded-xl sm:rounded-2xl transition active:scale-95 flex flex-col items-center justify-center p-1 shadow-lg border bg-[#7a1c1c]/50 border-red-800/60 text-zinc-300 opacity-75 cursor-not-allowed"
                title="Lay betting is locked on this table"
              >
                <div className="flex items-center gap-1">
                  <span className="text-base sm:text-lg font-black tracking-wide leading-none">
                    Lay
                  </span>
                  <Lock className="w-3.5 h-3.5 text-red-300" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-red-300 mt-1 flex items-center gap-0.5">
                  1.98 <span className="text-[8px] font-sans bg-red-950/80 px-1 rounded border border-red-500/30">Locked</span>
                </span>
                {activeStakeOn('A_LAY') > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black font-mono font-black text-[9px] px-1.5 py-0.2 rounded-full shadow">
                    ₹{activeStakeOn('A_LAY')}
                  </span>
                )}
              </button>
            </div>

            {/* A-plus Side Bet (Silver/Grey Metallic) */}
            <button
              type="button"
              onClick={() => handlePlaceDemoBet('A_PLUS', 4.5, 'A-plus (4.5x)')}
              disabled={round.state !== 'BETTING_OPEN'}
              className={`w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl transition active:scale-95 flex items-center justify-between px-4 shadow-md border cursor-pointer ${
                round.state === 'BETTING_OPEN'
                  ? 'bg-gradient-to-r from-[#3c4155] via-[#4f556e] to-[#3c4155] hover:brightness-110 border-white/20 text-white'
                  : 'bg-[#2a2e3d] border-white/10 text-zinc-400 opacity-75 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm tracking-wide">
                  A-plus
                </span>
                <span className="text-[9px] text-zinc-300 bg-black/40 px-1.5 py-0.2 rounded">
                  Pair+
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeStakeOn('A_PLUS') > 0 && (
                  <span className="bg-amber-400 text-black font-mono font-black text-[9px] px-1.5 py-0.2 rounded-full">
                    ₹{activeStakeOn('A_PLUS')}
                  </span>
                )}
                <span className="font-mono font-black text-xs text-amber-300">
                  4.50
                </span>
              </div>
            </button>
          </div>

          {/* PLAYER B COLUMN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs sm:text-sm font-black text-red-400 tracking-wide">
                Player B
              </span>
              {activeStakeOn('B_BACK') > 0 && (
                <span className="text-[10px] bg-red-500/30 text-red-300 border border-red-400/40 px-2 py-0.2 rounded-full font-mono font-bold">
                  Stake: ₹{activeStakeOn('B_BACK')}
                </span>
              )}
            </div>

            {/* Back & Lay Buttons Row */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Back Button (Blue) */}
              <button
                type="button"
                onClick={() => handlePlaceDemoBet('B_BACK', 1.98, 'Player B Back')}
                disabled={round.state !== 'BETTING_OPEN'}
                className={`relative h-14 sm:h-16 rounded-xl sm:rounded-2xl transition active:scale-95 flex flex-col items-center justify-center p-1 shadow-lg border cursor-pointer ${
                  round.state === 'BETTING_OPEN'
                    ? 'bg-[#1e60d5] hover:bg-[#256cf0] border-blue-400 text-white shadow-[0_4px_14px_rgba(30,96,213,0.4)]'
                    : 'bg-[#1e60d5]/60 border-blue-600/40 text-zinc-300 opacity-80 cursor-not-allowed'
                }`}
              >
                <span className="text-base sm:text-lg font-black tracking-wide leading-none">
                  Back
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-blue-200 mt-1">
                  1.98
                </span>
                {activeStakeOn('B_BACK') > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black font-mono font-black text-[9px] px-1.5 py-0.2 rounded-full shadow">
                    ₹{activeStakeOn('B_BACK')}
                  </span>
                )}
              </button>

              {/* Lay Button (Red / Locked style) */}
              <button
                type="button"
                onClick={() => handlePlaceDemoBet('B_LAY', 1.98, 'Player B Lay')}
                className="relative h-14 sm:h-16 rounded-xl sm:rounded-2xl transition active:scale-95 flex flex-col items-center justify-center p-1 shadow-lg border bg-[#7a1c1c]/50 border-red-800/60 text-zinc-300 opacity-75 cursor-not-allowed"
                title="Lay betting is locked on this table"
              >
                <div className="flex items-center gap-1">
                  <span className="text-base sm:text-lg font-black tracking-wide leading-none">
                    Lay
                  </span>
                  <Lock className="w-3.5 h-3.5 text-red-300" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-red-300 mt-1 flex items-center gap-0.5">
                  1.98 <span className="text-[8px] font-sans bg-red-950/80 px-1 rounded border border-red-500/30">Locked</span>
                </span>
                {activeStakeOn('B_LAY') > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black font-mono font-black text-[9px] px-1.5 py-0.2 rounded-full shadow">
                    ₹{activeStakeOn('B_LAY')}
                  </span>
                )}
              </button>
            </div>

            {/* B-plus Side Bet (Silver/Grey Metallic) */}
            <button
              type="button"
              onClick={() => handlePlaceDemoBet('B_PLUS', 4.5, 'B-plus (4.5x)')}
              disabled={round.state !== 'BETTING_OPEN'}
              className={`w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl transition active:scale-95 flex items-center justify-between px-4 shadow-md border cursor-pointer ${
                round.state === 'BETTING_OPEN'
                  ? 'bg-gradient-to-r from-[#3c4155] via-[#4f556e] to-[#3c4155] hover:brightness-110 border-white/20 text-white'
                  : 'bg-[#2a2e3d] border-white/10 text-zinc-400 opacity-75 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm tracking-wide">
                  B-plus
                </span>
                <span className="text-[9px] text-zinc-300 bg-black/40 px-1.5 py-0.2 rounded">
                  Pair+
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeStakeOn('B_PLUS') > 0 && (
                  <span className="bg-amber-400 text-black font-mono font-black text-[9px] px-1.5 py-0.2 rounded-full">
                    ₹{activeStakeOn('B_PLUS')}
                  </span>
                )}
                <span className="font-mono font-black text-xs text-amber-300">
                  4.50
                </span>
              </div>
            </button>
          </div>

        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. STICKY BOTTOM ACTION CONTROLS & CHIPS BAR         */}
      {/* ---------------------------------------------------- */}
      <div className="fixed bottom-7 left-0 right-0 z-40 bg-[#090b16]/95 backdrop-blur-md border-t border-[#232942] py-2 px-3 sm:px-6 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          
          {/* Left Info: Total Bet & Real User Balance */}
          <div className="flex flex-col text-left shrink-0">
            <div className="text-[10px] text-zinc-400 font-mono">
              Round Bet: <span className="text-amber-400 font-black">₹{currentRoundTotalBet}</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Balance: <span className="text-white font-bold">₹{(user?.walletBalance ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Center Actions: Undo, Chips Selector Carousel, Repeat */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1">
            {/* Undo Button */}
            <button
              type="button"
              onClick={handleUndoBet}
              className="flex flex-col items-center justify-center text-zinc-400 hover:text-white px-2 py-1 rounded-xl hover:bg-white/5 active:scale-95 transition"
              title="Undo Bet"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[9px] font-bold">Undo</span>
            </button>

            {/* Standard Chip Buttons */}
            {STANDARD_CHIPS.map((chip) => {
              const isSelected = (customChipValue === null && selectedChip === chip) || customChipValue === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setCustomChipValue(null);
                    setSelectedChip(chip);
                    teenPattiAudio.playChip();
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-mono font-black text-[10px] sm:text-xs transition active:scale-95 shrink-0 flex items-center justify-center border shadow-md cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black border-white ring-2 ring-amber-400 scale-110'
                      : 'bg-[#181c2e] text-zinc-200 border-white/10 hover:bg-[#252a42]'
                  }`}
                >
                  {chip >= 1000 ? `${chip / 1000}k` : chip}
                </button>
              );
            })}

            {/* Custom Chip Option */}
            <button
              type="button"
              onClick={() => {
                setCustomChipInput(String(customChipValue || selectedChip || 100));
                setShowCustomModal(true);
              }}
              className="h-9 px-2.5 rounded-full bg-[#1b2033] hover:bg-[#28304c] text-amber-400 border border-amber-500/40 text-[10px] font-black flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Custom</span>
            </button>

            {/* Repeat Button */}
            <button
              type="button"
              onClick={handleRepeatBets}
              className="flex flex-col items-center justify-center text-zinc-400 hover:text-white px-2 py-1 rounded-xl hover:bg-white/5 active:scale-95 transition"
              title="Repeat Last Bet"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[9px] font-bold">Repeat</span>
            </button>
          </div>

          {/* Right: Drawer Button for Bet History */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#181c2e] hover:bg-[#252a42] border border-white/10 text-zinc-300 hover:text-white flex items-center gap-1 text-[10px] font-bold transition active:scale-95 cursor-pointer"
            >
              <HistoryIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">History</span>
              {currentRoundBets.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center">
                  {currentRoundBets.length}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Bet Limits Footer Note */}
        <div className="text-center text-[9px] text-zinc-500 font-mono mt-0.5">
          Teen Patti One Day • Stake Limits: ₹100 - ₹2,00,000
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. RECENT RESULTS STRIP (Matching Screenshot Bottom) */}
      {/* ---------------------------------------------------- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#060810] border-t border-[#1e2338] h-7 flex items-center px-2 overflow-x-auto scrollbar-none gap-1">
        {recentResults.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setShowResultDetailModal(item)}
            className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-mono font-black text-[9px] text-white transition active:scale-90 ${
              item.winner === 'A'
                ? 'bg-blue-600 border border-blue-400'
                : item.winner === 'B'
                ? 'bg-red-600 border border-red-400'
                : 'bg-amber-500 border border-yellow-300 text-black'
            }`}
            title={`Round #${item.roundId}: ${item.winner}`}
          >
            {item.winner}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 6. MODAL: BET HISTORY & PENDING BETS DRAWER          */}
      {/* ---------------------------------------------------- */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-0 sm:p-4">
          <div className="bg-[#101424] border border-white/10 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">Bet History</h3>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: Pending vs Settled */}
            <div className="grid grid-cols-2 p-2 bg-[#0a0c16] border-b border-white/10 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setHistoryTab('pending')}
                className={`py-2 rounded-xl transition ${
                  historyTab === 'pending'
                    ? 'bg-amber-400 text-black font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pending Bets ({demoBets.filter((b) => b.status === 'PENDING').length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('settled')}
                className={`py-2 rounded-xl transition ${
                  historyTab === 'settled'
                    ? 'bg-amber-400 text-black font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Settled History ({demoBets.filter((b) => b.status !== 'PENDING').length})
              </button>
            </div>

            {/* Bet Records List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {historyTab === 'pending' ? (
                demoBets.filter((b) => b.status === 'PENDING').length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs">
                    No pending bets for the current round.
                  </div>
                ) : (
                  demoBets
                    .filter((b) => b.status === 'PENDING')
                    .map((bet) => (
                      <div
                        key={bet.id}
                        className="bg-[#171b2d] border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">
                              {bet.selectionLabel}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono text-[9px] font-bold">
                              @{bet.odds}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            Round #{bet.roundId} • {bet.createdAt}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-black text-xs text-white">
                            ₹{bet.stake}
                          </div>
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase animate-pulse">
                            PENDING
                          </span>
                        </div>
                      </div>
                    ))
                )
              ) : demoBets.filter((b) => b.status !== 'PENDING').length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs">
                  No completed bet transactions yet.
                </div>
              ) : (
                demoBets
                  .filter((b) => b.status !== 'PENDING')
                  .map((bet) => (
                    <div
                      key={bet.id}
                      className="bg-[#171b2d] border border-white/10 rounded-2xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">
                            {bet.selectionLabel}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-mono text-[9px] font-bold">
                            @{bet.odds}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          Round #{bet.roundId} • {bet.createdAt}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-zinc-300">
                          Stake: ₹{bet.stake}
                        </div>
                        {bet.status === 'WON' ? (
                          <div className="font-mono font-black text-xs text-emerald-400">
                            +₹{bet.winAmount} (WIN)
                          </div>
                        ) : (
                          <div className="font-mono font-black text-xs text-red-400">
                            -₹{bet.stake} (LOSS)
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-[#0a0c16] border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
              <span>Wallet Balance: <strong className="text-white font-mono">₹{(user?.walletBalance ?? 0).toLocaleString()}</strong></span>
              {onNavigateDeposit && (
                <button
                  type="button"
                  onClick={() => {
                    setShowHistoryDrawer(false);
                    onNavigateDeposit();
                  }}
                  className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Deposit Funds
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. MODAL: HAND RANKINGS & RULES GUIDE                */}
      {/* ---------------------------------------------------- */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121628] border border-amber-500/40 rounded-3xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">Teen Patti Rules & Hierarchy</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hand Rankings (1 to 6) */}
            <div className="space-y-2 text-xs">
              <div className="bg-[#181d33] p-2.5 rounded-xl border border-amber-400/30">
                <div className="flex items-center justify-between font-black text-amber-300 mb-0.5">
                  <span>1. Trio / Trail (3 of a Kind)</span>
                  <span className="font-mono text-[10px] bg-amber-400/20 px-1.5 py-0.2 rounded">Highest</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  Three cards of the same rank. AAA is highest, 222 is lowest.
                </p>
              </div>

              <div className="bg-[#181d33] p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between font-black text-white mb-0.5">
                  <span>2. Pure Sequence (Straight Flush)</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  Three consecutive cards of the same suit. AKQ &gt; A23 &gt; KQJ ... 432.
                </p>
              </div>

              <div className="bg-[#181d33] p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between font-black text-white mb-0.5">
                  <span>3. Sequence (Straight)</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  Three consecutive cards of mixed suits. AKQ &gt; A23 &gt; KQJ ... 432.
                </p>
              </div>

              <div className="bg-[#181d33] p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between font-black text-white mb-0.5">
                  <span>4. Color / Flush</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  Three cards of the same suit not in sequence.
                </p>
              </div>

              <div className="bg-[#181d33] p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between font-black text-white mb-0.5">
                  <span>5. Pair (2 of a Kind)</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  Two cards of the same rank. AA &gt; KK ... 22.
                </p>
              </div>

              <div className="bg-[#181d33] p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between font-black text-white mb-0.5">
                  <span>6. High Card</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  Highest card compares first, then 2nd, then 3rd.
                </p>
              </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-[#0b0e1a] p-3 rounded-2xl border border-white/10 text-xs space-y-1.5">
              <div className="font-black text-amber-400">Payout Table</div>
              <div className="flex justify-between text-zinc-300">
                <span>Player A Back / Player B Back</span>
                <span className="font-mono font-bold text-white">1.98x</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>A-plus / B-plus (Pair or better)</span>
                <span className="font-mono font-bold text-amber-400">4.50x</span>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 bg-amber-400 text-black font-black text-xs rounded-xl shadow transition hover:bg-amber-300"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. MODAL: CUSTOM STAKE AMOUNT KEYPAD                 */}
      {/* ---------------------------------------------------- */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#121628] border border-amber-500/50 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-white">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black">Set Custom Demo Stake</h3>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyCustomChip} className="space-y-3">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-amber-400 text-xl font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={customChipInput}
                  onChange={(e) => setCustomChipInput(e.target.value)}
                  placeholder="Enter stake"
                  autoFocus
                  className="w-full h-12 pl-9 pr-4 bg-[#090b14] border-2 border-amber-400/60 rounded-2xl text-white font-mono font-black text-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {[100, 500, 1000, 2000, 5000, 10000, 25000, 50000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const curr = parseInt(customChipInput || '0', 10);
                      setCustomChipInput(String((isNaN(curr) ? 0 : curr) + preset));
                    }}
                    className="py-1.5 rounded-xl bg-[#1c2236] hover:bg-[#28314e] text-xs font-mono font-bold text-zinc-200 border border-white/10"
                  >
                    +{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCustomChipValue(null);
                    setSelectedChip(100);
                    setShowCustomModal(false);
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-[#1c2236] text-zinc-400 font-bold text-xs"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black text-xs uppercase tracking-wider shadow-lg"
                >
                  Apply ₹{customChipInput || '100'} Chip
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 9. MODAL: RECENT RESULT DETAIL BREAKDOWN             */}
      {/* ---------------------------------------------------- */}
      {showResultDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121628] border border-white/10 rounded-3xl p-5 max-w-xs w-full space-y-3 shadow-2xl text-center">
            <h3 className="font-black text-sm text-white">
              Round #{showResultDetailModal.roundId} Outcome
            </h3>
            <div
              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center font-mono font-black text-2xl text-white shadow-xl ${
                showResultDetailModal.winner === 'A'
                  ? 'bg-blue-600 border-2 border-blue-400'
                  : showResultDetailModal.winner === 'B'
                  ? 'bg-red-600 border-2 border-red-400'
                  : 'bg-amber-500 border-2 border-yellow-300 text-black'
              }`}
            >
              {showResultDetailModal.winner}
            </div>
            <div className="text-xs text-zinc-300 font-mono">
              Winner: Player {showResultDetailModal.winner}
            </div>
            {showResultDetailModal.handA && (
              <div className="text-[11px] text-zinc-400 text-left bg-black/40 p-2 rounded-xl">
                <div>Player A: <strong className="text-blue-300">{showResultDetailModal.handA}</strong></div>
                <div>Player B: <strong className="text-red-300">{showResultDetailModal.handB}</strong></div>
              </div>
            )}
            <button
              onClick={() => setShowResultDetailModal(null)}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 10. MODAL: WIN NOTIFICATION CELEBRATION (Rich Popup) */}
      {/* ---------------------------------------------------- */}
      {winNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative bg-gradient-to-b from-[#181f3b] via-[#101428] to-[#0a0d1a] border-2 border-amber-400 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-[0_0_50px_rgba(251,191,36,0.35)] text-center animate-scaleUp">
            
            {/* Close Cross */}
            <button
              onClick={() => setWinNotification(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Trophy Icon with Particle Rings */}
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg border-2 border-amber-200">
                <Trophy className="w-8 h-8 sm:w-9 sm:h-9 text-zinc-950" />
              </div>
            </div>

            {/* Header Titles */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                CONGRATULATIONS!
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                YOU WON!
              </h3>
              <p className="text-zinc-400 text-xs font-mono mt-0.5">
                Round #{winNotification.roundId} • Winner: Player {winNotification.winner}
              </p>
            </div>

            {/* Big Winnings Amount Card */}
            <div className="bg-black/60 border border-amber-400/40 rounded-2xl p-3 sm:p-4 shadow-inner">
              <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                Total Payout Added
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 mt-1">
                +₹{winNotification.totalWin.toLocaleString()}
              </div>
              {winNotification.netProfit > 0 && (
                <div className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5">
                  Net Profit: +₹{winNotification.netProfit.toLocaleString()}
                </div>
              )}
            </div>

            {/* Winning Bets Details List */}
            <div className="bg-[#141829] border border-white/10 rounded-2xl p-2.5 space-y-1.5 text-left max-h-32 overflow-y-auto">
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex justify-between px-1">
                <span>Winning Bet</span>
                <span>Payout</span>
              </div>
              {winNotification.winningBets.map((wb, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-black/40 px-2 py-1.5 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-bold text-white truncate max-w-[130px]">{wb.selectionLabel}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">(@{wb.odds}x)</span>
                  </div>
                  <div className="font-mono font-black text-emerald-400 shrink-0">
                    +₹{wb.winAmount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Winning Hand Note */}
            {winNotification.winningHandTitle && (
              <div className="text-xs text-amber-300/90 font-mono bg-amber-500/10 border border-amber-500/20 py-1.5 px-3 rounded-xl truncate">
                🏆 Winning Hand: <strong className="text-white">{winNotification.winningHandTitle}</strong>
              </div>
            )}

            {/* Action Buttons */}
            <button
              type="button"
              onClick={() => setWinNotification(null)}
              className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-zinc-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition active:scale-95 cursor-pointer"
            >
              Collect & Continue
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
