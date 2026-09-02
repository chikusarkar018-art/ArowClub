import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { sevenUpDownAudio } from '../../utils/sevenUpDownAudio.js';
import confetti from 'canvas-confetti';
import { LiveCasinoSevenTable } from './LiveCasinoSevenTable.js';
import {
  ArrowLeft, Wallet, Volume2, VolumeX,
  HelpCircle, History as HistoryIcon,
  RotateCcw, Sparkles, Trophy, Check,
  X, ShieldCheck, ChevronRight, Layers, Flame,
  Edit3, Plus, ArrowUpRight
} from 'lucide-react';

interface UserSevenUpDownGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
  onNavigateHistory?: () => void;
}

// Card definitions: A(1) to K(13)
export interface PlayingCard {
  rank: string;
  suit: 'spades' | 'hearts' | 'clubs' | 'diamonds';
  suitSymbol: string;
  value: number; // 1 to 13
  color: 'red' | 'black';
  isEven: boolean;
  group: 'A23' | '456' | '7' | '8910' | 'JQK';
  zone: 'down' | 'seven' | 'up';
}

const SUITS: { suit: 'spades' | 'hearts' | 'clubs' | 'diamonds'; symbol: string; color: 'red' | 'black' }[] = [
  { suit: 'spades', symbol: '♠', color: 'black' },
  { suit: 'hearts', symbol: '♥', color: 'red' },
  { suit: 'clubs', symbol: '♣', color: 'black' },
  { suit: 'diamonds', symbol: '♦', color: 'red' },
];

const RANKS = [
  { rank: 'A', value: 1, isEven: false, group: 'A23', zone: 'down' },
  { rank: '2', value: 2, isEven: true, group: 'A23', zone: 'down' },
  { rank: '3', value: 3, isEven: false, group: 'A23', zone: 'down' },
  { rank: '4', value: 4, isEven: true, group: '456', zone: 'down' },
  { rank: '5', value: 5, isEven: false, group: '456', zone: 'down' },
  { rank: '6', value: 6, isEven: true, group: '456', zone: 'down' },
  { rank: '7', value: 7, isEven: false, group: '7', zone: 'seven' },
  { rank: '8', value: 8, isEven: true, group: '8910', zone: 'up' },
  { rank: '9', value: 9, isEven: false, group: '8910', zone: 'up' },
  { rank: '10', value: 10, isEven: true, group: '8910', zone: 'up' },
  { rank: 'J', value: 11, isEven: false, group: 'JQK', zone: 'up' },
  { rank: 'Q', value: 12, isEven: true, group: 'JQK', zone: 'up' },
  { rank: 'K', value: 13, isEven: false, group: 'JQK', zone: 'up' },
] as const;

// Generate full 52 cards deck
const FULL_DECK: PlayingCard[] = [];
SUITS.forEach(s => {
  RANKS.forEach(r => {
    FULL_DECK.push({
      rank: r.rank,
      suit: s.suit,
      suitSymbol: s.symbol,
      value: r.value,
      color: s.color,
      isEven: r.isEven,
      group: r.group as any,
      zone: r.zone as any,
    });
  });
});

const STANDARD_CHIPS = [10, 50, 100, 500, 1000, 5000];

type GamePhase = 'betting' | 'dealing' | 'result';

interface BetHistoryRecord {
  roundId: string;
  timestamp: string;
  card1: PlayingCard;
  card2: PlayingCard;
  sum: number;
  zone: 'down' | 'seven' | 'up';
  betsPlaced: { label: string; amount: number; rate: number }[];
  totalBet: number;
  won: boolean;
  totalWinning: number;
}

export const UserSevenUpDownGameView: React.FC<UserSevenUpDownGameViewProps> = ({
  onBack,
  onNavigateDeposit,
  onNavigateHistory,
}) => {
  const { user, refreshUser, showToast } = useAuth();

  // Audio mute state
  const [isMuted, setIsMuted] = useState(false);

  // Game Phases: 'betting' (20s) -> 'dealing' (6s) -> 'result' (5s)
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [countdown, setCountdown] = useState(20);
  const [roundNumber, setRoundNumber] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('arowclub_7updown_round_counter');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return 1055;
  });

  // Dealing Animation Sub-Steps (0: idle, 1: deal card 1, 2: deal card 2, 3: flip card 1, 4: flip card 2, 5: result ready)
  const [dealingStep, setDealingStep] = useState<number>(0);

  // Digital clock overlay
  const [clockTime, setClockTime] = useState('09:22:20');

  // Active user bets mapped by betKey -> amount
  const [bets, setBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const [selectedChip, setSelectedChip] = useState<number>(100);

  // Custom Chip Amount Modal & State
  const [showCustomChipModal, setShowCustomChipModal] = useState(false);
  const [customChipInput, setCustomChipInput] = useState('250');
  const [customChipValue, setCustomChipValue] = useState<number | null>(null);

  // Dealt Cards in the current round
  const [card1, setCard1] = useState<PlayingCard | null>(null);
  const [card2, setCard2] = useState<PlayingCard | null>(null);
  const [totalResult, setTotalResult] = useState<{
    sum: number;
    zone: 'down' | 'seven' | 'up';
    card1: PlayingCard;
    card2: PlayingCard;
  } | null>(null);

  // History road strip
  const [history, setHistory] = useState<{ zone: 'down' | 'seven' | 'up'; rank: string; symbol: string; color: string }[]>([
    { zone: 'down', rank: '4', symbol: '♦', color: 'red' },
    { zone: 'up', rank: '9', symbol: '♠', color: 'black' },
    { zone: 'down', rank: '2', symbol: '♣', color: 'black' },
    { zone: 'down', rank: '6', symbol: '♥', color: 'red' },
    { zone: 'up', rank: 'K', symbol: '♠', color: 'black' },
    { zone: 'seven', rank: '7', symbol: '♦', color: 'red' },
    { zone: 'down', rank: '5', symbol: '♣', color: 'black' },
    { zone: 'up', rank: 'J', symbol: '♥', color: 'red' },
    { zone: 'down', rank: '3', symbol: '♠', color: 'black' },
    { zone: 'up', rank: '8', symbol: '♦', color: 'red' },
  ]);

  // Dedicated Bet History Modal
  const [showBetHistoryModal, setShowBetHistoryModal] = useState(false);
  const [betHistoryRecords, setBetHistoryRecords] = useState<BetHistoryRecord[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Refs to eliminate stale closure bugs during timers & animations
  const betsRef = useRef<Record<string, number>>({});
  const roundNumberRef = useRef<number>(roundNumber);
  const userRef = useRef(user);
  const phaseRef = useRef<GamePhase>(phase);

  useEffect(() => {
    betsRef.current = bets;
  }, [bets]);

  useEffect(() => {
    roundNumberRef.current = roundNumber;
    try {
      localStorage.setItem('arowclub_7updown_round_counter', String(roundNumber));
    } catch {
      // ignore
    }
  }, [roundNumber]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Load persistent bet history from localStorage and API on mount / user change
  useEffect(() => {
    if (user?.uid) {
      try {
        const localKey = `arowclub_7updown_history_${user.uid}`;
        const saved = localStorage.getItem(localKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBetHistoryRecords(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load local 7up history', e);
      }
    }
  }, [user?.uid]);

  // Win popup announcement
  const [winAnnouncement, setWinAnnouncement] = useState<{
    won: boolean;
    grossWin: number;
    message: string;
  } | null>(null);

  // Keep digital clock live
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync mute
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sevenUpDownAudio.setMuted(next);
  };

  // Main Game Loop Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === 'betting') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Transition to dealing phase
            setPhase('dealing');
            setCountdown(6);
            handleStartDealing();
            return 0;
          }
          if (prev <= 5) {
            sevenUpDownAudio.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'dealing') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setPhase('result');
            setCountdown(5);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'result') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // New round starts
            startNewRound();
            return 20;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [phase]);

  // Start new round
  const startNewRound = () => {
    setPhase('betting');
    setCountdown(20);
    setRoundNumber((prev) => prev + 1);
    setCard1(null);
    setCard2(null);
    setTotalResult(null);
    setDealingStep(0);
    setWinAnnouncement(null);
    setBets({});
    sevenUpDownAudio.playStartChime();
  };

  // Trigger Dealing Phase
  const handleStartDealing = async () => {
    // 1. Pick 2 random cards from deck
    const deckShuffled = [...FULL_DECK].sort(() => Math.random() - 0.5);
    const cardOne = deckShuffled[0];
    const cardTwo = deckShuffled[1];

    // Compute sum & zone: e.g. 4 + 3 = 7
    const sum = cardOne.value + cardTwo.value;
    let zone: 'down' | 'seven' | 'up' = 'seven';
    if (sum < 7) {
      zone = 'down';
    } else if (sum > 7) {
      zone = 'up';
    } else {
      zone = 'seven';
    }

    // 2. Deduct placed bets from wallet using live refs (never stale)
    const activeBets = { ...betsRef.current };
    const activeUser = userRef.current;
    const currentRound = roundNumberRef.current;
    const totalBetAmount = Object.values(activeBets).reduce((a, b) => a + b, 0);
    const currentBetsSnapshot = { ...activeBets };

    if (totalBetAmount > 0 && activeUser) {
      setLastBets({ ...activeBets });
      try {
        await api.updateWalletBalance(
          activeUser.uid,
          -totalBetAmount,
          'bet',
          `Bet placed on 7 Up Down Round #${currentRound} (Stake: ₹${totalBetAmount})`,
          'seven_up_down'
        );
        refreshUser();
      } catch (err) {
        console.error('Failed to deduct bet:', err);
      }
    }

    // 3. Step 1 (at 300ms): Slide Card 1 onto table
    setTimeout(() => {
      setDealingStep(1);
      setCard1(cardOne);
      sevenUpDownAudio.playCardDeal();
      setTimeout(() => sevenUpDownAudio.playCardPlace(), 400);
    }, 300);

    // 4. Step 2 (at 1500ms): Slide Card 2 onto table
    setTimeout(() => {
      setDealingStep(2);
      setCard2(cardTwo);
      sevenUpDownAudio.playCardDeal();
      setTimeout(() => sevenUpDownAudio.playCardPlace(), 400);
    }, 1500);

    // 5. Step 3 (at 2700ms): Card 1 Flips 3D
    setTimeout(() => {
      setDealingStep(3);
      sevenUpDownAudio.playCardFlip();
    }, 2700);

    // 6. Step 4 (at 3500ms): Card 2 Flips 3D
    setTimeout(() => {
      setDealingStep(4);
      sevenUpDownAudio.playCardFlip();
    }, 3500);

    // 7. Step 5 (at 4300ms): Both cards revealed -> Total calculated & Result declared
    setTimeout(() => {
      setDealingStep(5);
      const res = { sum, zone, card1: cardOne, card2: cardTwo };
      setTotalResult(res);

      // Add to history road strip
      setHistory((prev) => [
        {
          zone,
          rank: `${sum}`,
          symbol: cardOne.suitSymbol,
          color: cardOne.color,
        },
        ...prev.slice(0, 19),
      ]);

      // Evaluate Winnings according to exact rates
      evaluateRoundResults(cardOne, cardTwo, sum, zone, totalBetAmount, currentBetsSnapshot, currentRound, activeUser);
    }, 4300);
  };

  // Evaluate all active bets and credit winnings based on rate
  const evaluateRoundResults = async (
    c1: PlayingCard,
    c2: PlayingCard,
    sum: number,
    zone: 'down' | 'seven' | 'up',
    totalBet: number,
    betsSnapshot: Record<string, number>,
    roundNum: number,
    currentUser: any
  ) => {
    let grossWinning = 0;
    const winningBetsDetail: string[] = [];
    const recordedBetsList: { label: string; amount: number; rate: number }[] = [];

    // Helper multiplier checker: e.g. ₹100 on 7 Up @ 1.98 rate => ₹198 credited
    const checkBet = (key: string, rate: number, isWin: boolean, label: string) => {
      const amount = betsSnapshot[key] || 0;
      if (amount > 0) {
        recordedBetsList.push({ label, amount, rate });
        const win = isWin ? amount * rate : 0;
        if (isWin) {
          grossWinning += win;
          winningBetsDetail.push(`${label} (₹${amount} × ${rate} = ₹${win.toFixed(2)})`);
        }

        // Record individual bet on the backend database
        if (currentUser?.uid) {
          api.recordGameBet({
            userId: currentUser.uid,
            gameType: 'seven_up_down' as any,
            periodId: `${roundNum}`,
            unitAmount: amount,
            multiplier: rate,
            totalAmount: amount,
            status: isWin ? 'won' : 'lost',
            winAmount: isWin ? win : 0,
          }).catch(e => console.error('Error recording 7up bet:', e));
        }
      }
    };

    // 1. 7 UP DOWN
    checkBet('zone_down', 1.98, zone === 'down', '7 Down');
    checkBet('zone_seven', 12.0, zone === 'seven', 'Exact 7');
    checkBet('zone_up', 1.98, zone === 'up', '7 Up');

    // 2. ODD - EVEN (Total sum)
    checkBet('oe_even', 2.10, sum % 2 === 0, 'Even Number');
    checkBet('oe_odd', 1.80, sum % 2 !== 0, 'Odd Number');

    // 3. COLOR
    checkBet('color_red', 1.98, c1.color === 'red' || c2.color === 'red', 'Red Color');
    checkBet('color_black', 1.98, c1.color === 'black' || c2.color === 'black', 'Black Color');

    // 4. SUIT
    checkBet('suit_spades', 3.75, c1.suit === 'spades' || c2.suit === 'spades', 'Spades ♠');
    checkBet('suit_hearts', 3.75, c1.suit === 'hearts' || c2.suit === 'hearts', 'Hearts ♥');
    checkBet('suit_clubs', 3.75, c1.suit === 'clubs' || c2.suit === 'clubs', 'Clubs ♣');
    checkBet('suit_diamonds', 3.75, c1.suit === 'diamonds' || c2.suit === 'diamonds', 'Diamonds ♦');

    // 5. 3 CARD GROUP
    checkBet('grp_A23', 4.0, c1.group === 'A23' || c2.group === 'A23', 'Group A-2-3');
    checkBet('grp_456', 4.0, c1.group === '456' || c2.group === '456', 'Group 4-5-6');
    checkBet('grp_8910', 4.0, c1.group === '8910' || c2.group === '8910', 'Group 8-9-10');
    checkBet('grp_JQK', 4.0, c1.group === 'JQK' || c2.group === 'JQK', 'Group J-Q-K');

    // 6. EXACT CARD RANK (A to K)
    checkBet(`card_${c1.rank}`, 13.0, true, `Exact Card ${c1.rank}`);
    if (c2.rank !== c1.rank) {
      checkBet(`card_${c2.rank}`, 13.0, true, `Exact Card ${c2.rank}`);
    }

    if (totalBet > 0) {
      if (grossWinning > 0) {
        // Credit FULL winning rate amount directly to account
        if (currentUser?.uid) {
          try {
            await api.updateWalletBalance(
              currentUser.uid,
              grossWinning,
              'win',
              `Win 7 Up Down #${roundNum} (${c1.rank}${c1.suitSymbol} + ${c2.rank}${c2.suitSymbol} = ${sum}) Payout: ₹${grossWinning.toFixed(2)}`,
              'seven_up_down'
            );
            refreshUser();
          } catch (err) {
            console.error('Win credit error:', err);
          }
        }

        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
        sevenUpDownAudio.playWin();

        setWinAnnouncement({
          won: true,
          grossWin: grossWinning,
          message: winningBetsDetail.join(' · '),
        });
      } else {
        setWinAnnouncement({
          won: false,
          grossWin: 0,
          message: `Dealt ${c1.rank}${c1.suitSymbol} + ${c2.rank}${c2.suitSymbol} = ${sum} (${zone.toUpperCase()}). Better luck next round!`,
        });
      }

      // Record in dedicated bet history state and localStorage permanently
      const newRecord: BetHistoryRecord = {
        roundId: `${roundNum}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        card1: c1,
        card2: c2,
        sum,
        zone,
        betsPlaced: recordedBetsList,
        totalBet,
        won: grossWinning > 0,
        totalWinning: grossWinning,
      };

      setBetHistoryRecords((prev) => {
        const updated = [newRecord, ...prev];
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`arowclub_7updown_history_${currentUser.uid}`, JSON.stringify(updated.slice(0, 100)));
          } catch (e) {
            // ignore
          }
        }
        return updated;
      });
    }
  };

  // Place bet on a spot
  const handlePlaceBet = (betKey: string) => {
    if (phase !== 'betting') {
      showToast('Betting is currently closed for this round!', 'error');
      return;
    }

    const currentTotal = Object.values(bets).reduce((a, b) => a + b, 0);
    const userBalance = user?.walletBalance || 0;

    if (currentTotal + selectedChip > userBalance) {
      showToast('Insufficient wallet balance! Please recharge.', 'error');
      return;
    }

    sevenUpDownAudio.playChip();
    setBets((prev) => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChip,
    }));
  };

  // Double all active bets
  const handleDoubleBets = () => {
    if (phase !== 'betting') return;
    const currentTotal = Object.values(bets).reduce((a, b) => a + b, 0);
    if (currentTotal * 2 > (user?.walletBalance || 0)) {
      showToast('Insufficient wallet balance to double bets!', 'error');
      return;
    }
    sevenUpDownAudio.playChip();
    setBets((prev) => {
      const updated: Record<string, number> = {};
      Object.entries(prev).forEach(([k, v]) => {
        updated[k] = v * 2;
      });
      return updated;
    });
  };

  // Repeat last bets
  const handleRepeatBets = () => {
    if (phase !== 'betting') return;
    const lastTotal = Object.values(lastBets).reduce((a, b) => a + b, 0);
    if (lastTotal === 0) {
      showToast('No previous bets to repeat!', 'error');
      return;
    }
    if (lastTotal > (user?.walletBalance || 0)) {
      showToast('Insufficient wallet balance to repeat bets!', 'error');
      return;
    }
    sevenUpDownAudio.playChip();
    setBets({ ...lastBets });
  };

  // Clear all bets
  const handleClearBets = () => {
    if (phase !== 'betting') return;
    setBets({});
  };

  // Set Custom Chip Value
  const handleApplyCustomChip = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customChipInput, 10);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid chip amount', 'error');
      return;
    }
    setCustomChipValue(val);
    setSelectedChip(val);
    setShowCustomChipModal(false);
    showToast(`Custom chip set to ₹${val}`, 'success');
  };

  const totalCurrentBet = Object.values(bets).reduce((a, b) => a + b, 0);

  // Odds Row Component matching the Bookmaker / Back & Lay layout
  const renderExchangeRow = (
    label: string,
    backOdds: number,
    betKey: string,
    badge?: string
  ) => {
    const betAmount = bets[betKey] || 0;

    return (
      <div key={betKey} className="grid grid-cols-12 items-center bg-[#11131a] hover:bg-[#181c26] border-b border-[#212534] transition">
        {/* Market Label */}
        <div
          onClick={() => handlePlaceBet(betKey)}
          className="col-span-5 sm:col-span-6 px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">{label}</span>
            {badge && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-mono">
                {badge}
              </span>
            )}
          </div>
          {betAmount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-mono font-black text-[11px] shadow-sm animate-bounce">
              ₹{betAmount}
            </span>
          )}
        </div>

        {/* BACK Button (Light Blue Box) */}
        <div className="col-span-4 sm:col-span-3 p-1">
          <button
            type="button"
            onClick={() => handlePlaceBet(betKey)}
            disabled={phase !== 'betting'}
            className="w-full py-2 rounded-lg bg-[#84c8f5] hover:bg-[#9ad3f8] active:scale-95 text-black font-black font-mono text-xs sm:text-sm transition flex flex-col items-center justify-center shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <span>{backOdds.toFixed(2)}</span>
          </button>
        </div>

        {/* LAY Button (Pink Locked Box) */}
        <div className="col-span-3 sm:col-span-3 p-1">
          <button
            type="button"
            disabled
            className="w-full py-2 rounded-lg bg-[#f8b8cf]/90 text-black font-black text-xs transition flex items-center justify-center opacity-80 cursor-not-allowed"
            title="Lay betting locked"
          >
            <span className="text-sm">🔒</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-white flex flex-col font-sans select-none pb-28">
      {/* 1. TOP HEADER BAR */}
      <div className="bg-[#0b0d13] border-b border-[#232738] px-3 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#151824] hover:bg-[#1f2334] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
            title="Go Back"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 1. Amount / User Balance */}
          <button
            onClick={onNavigateDeposit}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1b2030] to-[#252c42] border border-amber-500/30 hover:border-amber-400 flex items-center gap-2 transition cursor-pointer shadow-sm"
            title="Wallet Balance & Deposit"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-black font-mono text-amber-300">
              ₹{(user?.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="w-4 h-4 rounded-full bg-amber-500 text-black font-black text-[10px] flex items-center justify-center">
              +
            </span>
          </button>

          {/* 2. How to Play (Rules Icon) */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="w-9 h-9 rounded-xl bg-[#151824] hover:bg-[#1f2334] border border-white/10 flex items-center justify-center text-amber-400 hover:text-amber-300 transition cursor-pointer"
            title="How to Play"
            aria-label="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* 3. Bet History Icon */}
          <button
            onClick={() => setShowBetHistoryModal(true)}
            className="w-9 h-9 rounded-xl bg-[#151824] hover:bg-[#1f2334] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-[#f5c443] transition cursor-pointer active:scale-95"
            title="Bet History"
            aria-label="Bet History"
          >
            <HistoryIcon className="w-4 h-4" />
          </button>

          {/* 4. Music / Sound Mute Icon */}
          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-xl bg-[#151824] hover:bg-[#1f2334] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
            title={isMuted ? "Unmute Music/Sound" : "Mute Music/Sound"}
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. REALISTIC LIVE CASINO DEALER & TABLE DISPLAY AREA */}
      <LiveCasinoSevenTable
        phase={phase}
        dealingStep={dealingStep}
        countdown={countdown}
        roundNumber={roundNumber}
        clockTime={clockTime}
        card1={card1}
        card2={card2}
        totalResult={totalResult}
        history={history}
        bets={bets}
        onPlaceBet={handlePlaceBet}
      />

      {/* WIN / RESULT BANNER POPUP */}
      {winAnnouncement && (
        <div
          className={`mx-3 sm:mx-auto max-w-4xl my-3 p-4 rounded-3xl border flex items-center justify-between shadow-2xl animate-fadeIn ${
            winAnnouncement.won
              ? 'bg-emerald-950/85 border-emerald-500/60 text-white'
              : 'bg-[#151722] border-white/10 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${winAnnouncement.won ? 'bg-emerald-500 text-black' : 'bg-white/10 text-zinc-400'}`}>
              {winAnnouncement.won ? <Trophy className="w-6 h-6" /> : <Flame className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-2">
                <span>{winAnnouncement.won ? '🎉 CONGRATULATIONS! YOU WON!' : 'Round Completed'}</span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">{winAnnouncement.message}</p>
            </div>
          </div>

          {winAnnouncement.won && (
            <div className="text-right font-mono">
              <div className="text-xs text-emerald-400 font-bold">Winning Credited:</div>
              <div className="text-xl font-black text-emerald-300">
                +₹{winAnnouncement.grossWin.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. BETTING EXCHANGE ODDS BOARD */}
      <div className="max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {/* Table Sub-header with Min / Max Limits */}
        <div className="bg-[#0f1118] border border-[#232738] rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-400 font-mono font-bold">
            <span>MIN: 10</span>
            <span>|</span>
            <span>MAX: 100,000</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-black uppercase">
            <span className="text-[#84c8f5]">BACK (WIN ODDS)</span>
            <span className="text-[#f8b8cf]">LAY (LOCKED)</span>
          </div>
        </div>

        {/* 1. 7 UP DOWN MAIN SECTION */}
        <div className="bg-[#0c0e14] border border-[#232738] rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-[#161a26] px-4 py-2 text-xs font-black text-[#f5c443] tracking-wider uppercase border-b border-[#232738] flex items-center justify-between">
            <span>7 UP DOWN</span>
            <span className="text-[10px] text-zinc-400">Standard Payout</span>
          </div>
          <div className="divide-y divide-[#212534]">
            {renderExchangeRow('7 Down (A to 6)', 1.98, 'zone_down', 'Low Cards')}
            {renderExchangeRow('Seven (7)', 12.00, 'zone_seven', '12x Exact')}
            {renderExchangeRow('7 Up (8 to K)', 1.98, 'zone_up', 'High Cards')}
          </div>
        </div>

        {/* 2. ODD - EVEN SECTION */}
        <div className="bg-[#0c0e14] border border-[#232738] rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-[#161a26] px-4 py-2 text-xs font-black text-[#f5c443] tracking-wider uppercase border-b border-[#232738]">
            ODD - EVEN
          </div>
          <div className="divide-y divide-[#212534]">
            {renderExchangeRow('Even (2, 4, 6, 8, 10, Q)', 2.10, 'oe_even')}
            {renderExchangeRow('Odd (A, 3, 5, 7, 9, J, K)', 1.80, 'oe_odd')}
          </div>
        </div>

        {/* 3. COLOR SECTION */}
        <div className="bg-[#0c0e14] border border-[#232738] rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-[#161a26] px-4 py-2 text-xs font-black text-[#f5c443] tracking-wider uppercase border-b border-[#232738]">
            COLOR
          </div>
          <div className="divide-y divide-[#212534]">
            {renderExchangeRow('Red (♥, ♦)', 1.98, 'color_red')}
            {renderExchangeRow('Black (♠, ♣)', 1.98, 'color_black')}
          </div>
        </div>

        {/* 4. SUIT SECTION */}
        <div className="bg-[#0c0e14] border border-[#232738] rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-[#161a26] px-4 py-2 text-xs font-black text-[#f5c443] tracking-wider uppercase border-b border-[#232738]">
            SUIT (3.75X RETURN)
          </div>
          <div className="divide-y divide-[#212534]">
            {renderExchangeRow('Spades (♠)', 3.75, 'suit_spades')}
            {renderExchangeRow('Hearts (♥)', 3.75, 'suit_hearts')}
            {renderExchangeRow('Clubs (♣)', 3.75, 'suit_clubs')}
            {renderExchangeRow('Diamonds (♦)', 3.75, 'suit_diamonds')}
          </div>
        </div>

        {/* 5. 3 CARD GROUP SECTION */}
        <div className="bg-[#0c0e14] border border-[#232738] rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-[#161a26] px-4 py-2 text-xs font-black text-[#f5c443] tracking-wider uppercase border-b border-[#232738]">
            3 CARD GROUP (4.00X RETURN)
          </div>
          <div className="divide-y divide-[#212534]">
            {renderExchangeRow('A 2 3', 4.00, 'grp_A23')}
            {renderExchangeRow('4 5 6', 4.00, 'grp_456')}
            {renderExchangeRow('8 9 10', 4.00, 'grp_8910')}
            {renderExchangeRow('J Q K', 4.00, 'grp_JQK')}
          </div>
        </div>

        {/* 6. EXACT CARD RANK (A to K) */}
        <div className="bg-[#0c0e14] border border-[#232738] rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-[#161a26] px-4 py-2 text-xs font-black text-[#f5c443] tracking-wider uppercase border-b border-[#232738]">
            CARD (EXACT RANK A TO K - 13X RETURN)
          </div>
          <div className="divide-y divide-[#212534]">
            {['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map((rank) =>
              renderExchangeRow(`Card ${rank}`, 13.00, `card_${rank}`)
            )}
          </div>
        </div>
      </div>

      {/* 4. STICKY BOTTOM CHIP SELECTOR & ACTIONS BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e15]/95 backdrop-blur-md border-t border-[#232738] py-2.5 px-3 sm:px-8 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Chip Value Selectors with Custom Option */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* Standard Chips */}
            {STANDARD_CHIPS.map((val) => {
              const isSelected = selectedChip === val && (!customChipValue || customChipValue !== val);
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setSelectedChip(val);
                    sevenUpDownAudio.playChip();
                  }}
                  className={`px-3 py-2 rounded-2xl font-mono font-black text-xs transition cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-amber-400 text-black border-amber-300 ring-2 ring-amber-400 scale-105 shadow-md'
                      : 'bg-[#181b28] text-zinc-300 border-white/10 hover:bg-[#22273a]'
                  }`}
                >
                  ₹{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              );
            })}

            {/* Custom Active Chip */}
            {customChipValue && (
              <button
                type="button"
                onClick={() => {
                  setSelectedChip(customChipValue);
                  sevenUpDownAudio.playChip();
                }}
                className={`px-3 py-2 rounded-2xl font-mono font-black text-xs transition cursor-pointer shrink-0 border flex items-center gap-1 ${
                  selectedChip === customChipValue
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black border-yellow-200 ring-2 ring-amber-400 scale-105 shadow-lg'
                    : 'bg-[#231b12] text-amber-300 border-amber-400/60 hover:bg-[#322617]'
                }`}
              >
                <span className="text-[10px]">✨</span>
                <span>₹{customChipValue}</span>
              </button>
            )}

            {/* Edit / Set Custom Amount Button */}
            <button
              type="button"
              onClick={() => {
                setCustomChipInput(String(customChipValue || selectedChip || 100));
                setShowCustomChipModal(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#2a1d08] to-[#1f170b] hover:brightness-125 text-amber-400 border border-amber-500/60 font-black text-xs flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer shadow-sm"
              title="Set Custom Bet Amount"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
              <span>Custom Amount</span>
            </button>
          </div>

          {/* Actions: Total Bet, 2X, Repeat, Clear */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-[#12141e] border border-white/10 font-mono">
              <span className="text-[10px] text-zinc-400 uppercase mr-1">Total Bet:</span>
              <strong className="text-amber-300 text-sm">₹{totalCurrentBet}</strong>
            </div>

            <button
              onClick={handleDoubleBets}
              disabled={totalCurrentBet === 0 || phase !== 'betting'}
              className="px-3 py-2 rounded-xl bg-[#1d2232] hover:bg-[#283046] border border-white/10 text-zinc-200 font-bold transition disabled:opacity-40 cursor-pointer"
            >
              2X Double
            </button>

            <button
              onClick={handleRepeatBets}
              disabled={phase !== 'betting'}
              className="px-3 py-2 rounded-xl bg-[#1d2232] hover:bg-[#283046] border border-white/10 text-zinc-200 font-bold transition disabled:opacity-40 cursor-pointer"
            >
              Repeat
            </button>

            <button
              onClick={handleClearBets}
              disabled={totalCurrentBet === 0 || phase !== 'betting'}
              className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold transition disabled:opacity-40 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* 5. CUSTOM AMOUNT INPUT MODAL (Full Keypad & Quick Presets) */}
      {showCustomChipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#121524] border border-amber-500/50 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.8)] text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Custom Bet Stake (₹)</h3>
                  <p className="text-[10px] text-zinc-400">Set any custom amount to bet on any card</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomChipModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Display */}
            <div className="space-y-1.5">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-amber-400 text-xl font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customChipInput}
                  onChange={(e) => setCustomChipInput(e.target.value)}
                  placeholder="Enter amount"
                  autoFocus
                  className="w-full h-13 pl-9 pr-10 bg-[#090b12] border-2 border-amber-400/60 rounded-2xl text-white font-mono font-black text-2xl focus:outline-none focus:border-amber-400 shadow-inner"
                />
                {customChipInput && (
                  <button
                    type="button"
                    onClick={() => setCustomChipInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 px-1 font-mono">
                <span>Available Balance: ₹{user?.walletBalance || 0}</span>
                <button
                  type="button"
                  onClick={() => setCustomChipInput(String(Math.max(1, Math.floor(user?.walletBalance || 100))))}
                  className="text-amber-400 font-bold hover:underline"
                >
                  Max Balance
                </button>
              </div>
            </div>

            {/* Quick Presets Grid (+10, +50, +100, +250, +500, +1000, +2000, +5000) */}
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 50, 100, 250, 500, 1000, 2000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const curr = parseInt(customChipInput || '0', 10);
                    setCustomChipInput(String((isNaN(curr) ? 0 : curr) + preset));
                  }}
                  className="py-2 rounded-xl bg-[#1c2236] hover:bg-[#28314e] active:scale-95 border border-white/10 text-[11px] font-mono font-bold text-zinc-200 transition cursor-pointer"
                >
                  +{preset >= 1000 ? `${preset / 1000}k` : preset}
                </button>
              ))}
            </div>

            {/* Quick Multipliers (1/2, 2X, 5X, 10X) */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const curr = parseInt(customChipInput || '0', 10);
                  if (curr > 1) setCustomChipInput(String(Math.max(1, Math.floor(curr / 2))));
                }}
                className="py-1.5 rounded-lg bg-[#161a29] hover:bg-[#21273d] text-zinc-300 font-mono text-[10px] font-bold border border-white/5"
              >
                1/2
              </button>
              <button
                type="button"
                onClick={() => {
                  const curr = parseInt(customChipInput || '100', 10);
                  setCustomChipInput(String((curr || 100) * 2));
                }}
                className="py-1.5 rounded-lg bg-[#161a29] hover:bg-[#21273d] text-zinc-300 font-mono text-[10px] font-bold border border-white/5"
              >
                2X
              </button>
              <button
                type="button"
                onClick={() => {
                  const curr = parseInt(customChipInput || '100', 10);
                  setCustomChipInput(String((curr || 100) * 5));
                }}
                className="py-1.5 rounded-lg bg-[#161a29] hover:bg-[#21273d] text-zinc-300 font-mono text-[10px] font-bold border border-white/5"
              >
                5X
              </button>
              <button
                type="button"
                onClick={() => {
                  const curr = parseInt(customChipInput || '100', 10);
                  setCustomChipInput(String((curr || 100) * 10));
                }}
                className="py-1.5 rounded-lg bg-[#161a29] hover:bg-[#21273d] text-amber-400 font-mono text-[10px] font-black border border-amber-500/30"
              >
                10X
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCustomChipValue(null);
                  setSelectedChip(100);
                  setShowCustomChipModal(false);
                  showToast('Reset to default ₹100 chip', 'info');
                }}
                className="py-3 px-3 rounded-2xl bg-[#1c2236] hover:bg-[#28314e] text-zinc-400 font-bold text-xs transition"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={(e) => handleApplyCustomChip(e)}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-98 text-black font-black text-xs uppercase tracking-wide transition shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Set ₹{customChipInput || '100'} Custom Bet</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. DEDICATED 7 UP 7 DOWN MY BET HISTORY MODAL */}
      {showBetHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121626] border border-[#f5c443]/40 rounded-3xl max-w-lg w-full p-5 text-white shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f5c443]/20 flex items-center justify-center text-[#f5c443]">
                  <HistoryIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">7 Up 7 Down Bet History</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">My Recent Rounds</span>
                </div>
              </div>
              <button
                onClick={() => setShowBetHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs">
              {betHistoryRecords.length === 0 ? (
                <div className="py-12 text-center space-y-2 bg-[#0a0d17] rounded-2xl border border-white/5 p-6">
                  <div className="text-3xl">🃏</div>
                  <div className="text-sm font-bold text-zinc-300">No bets recorded in this session yet</div>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    Place your bets on 7 Down, Exact 7, 7 Up, Colors, or Cards to see round-by-round ledger history here.
                  </p>
                </div>
              ) : (
                betHistoryRecords.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition shadow-sm ${
                      rec.won
                        ? 'bg-[#0e211b] border-emerald-500/50'
                        : 'bg-[#161a29] border-white/10'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-300 font-mono">{rec.roundId}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{rec.timestamp}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase font-mono ${
                          rec.won
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {rec.won ? '★ WON' : 'LOST'}
                      </span>
                    </div>

                    {/* Result Dealt */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-300 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-400">Cards:</span>
                        <span className="font-mono font-black text-white">
                          {rec.card1.rank}{rec.card1.suitSymbol} + {rec.card2.rank}{rec.card2.suitSymbol} = {rec.sum}
                        </span>
                        <span className="text-[10px] text-amber-400 font-bold uppercase">
                          ({rec.zone === 'seven' ? 'EXACT 7' : rec.zone === 'up' ? '7 UP' : '7 DOWN'})
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-zinc-400 block">Total Stake</span>
                        <span className="font-bold text-white">₹{rec.totalBet}</span>
                      </div>
                    </div>

                    {/* Placed markets */}
                    <div className="bg-black/30 rounded-xl p-2 space-y-1 text-[10px] font-mono">
                      {rec.betsPlaced.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-center justify-between text-zinc-300">
                          <span>• {b.label}</span>
                          <span>₹{b.amount} @ {b.rate}x</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer Winning Credited */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/10">
                      <span className="text-[10px] text-zinc-400">Account Payout:</span>
                      <span
                        className={`text-sm font-black font-mono ${
                          rec.won ? 'text-emerald-400' : 'text-zinc-400'
                        }`}
                      >
                        {rec.won ? `+₹${rec.totalWinning.toFixed(2)} Credited` : '₹0.00'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowBetHistoryModal(false)}
              className="w-full py-3 rounded-2xl bg-[#1c2236] hover:bg-[#28314e] text-zinc-200 font-bold text-xs transition mt-2 cursor-pointer"
            >
              Close History
            </button>
          </div>
        </div>
      )}

      {/* 7. RULES / HOW TO PLAY MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#10131e] border border-[#2b3149] rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-white">7 Up 7 Down Rules</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                <strong>7 Up 7 Down</strong> is a fast-paced live casino card game where two cards are dealt face-down by the live dealer, then flipped to determine the round total.
              </p>
              
              <div className="p-3 bg-[#171c2b] rounded-2xl space-y-1.5 border border-white/5 font-mono">
                <div className="text-amber-300 font-bold">Outcome Categories:</div>
                <div>• 7 Down = Total sum less than 7 (A to 6) ➔ 1.98x</div>
                <div>• Exact 7 = Total sum exactly 7 ➔ 12.00x Payout!</div>
                <div>• 7 Up = Total sum greater than 7 (8 to K / High) ➔ 1.98x</div>
              </div>

              <div className="p-3 bg-[#171c2b] rounded-2xl space-y-1.5 border border-white/5 font-mono">
                <div className="text-amber-300 font-bold">Payout Multipliers:</div>
                <div>• 7 Down (A to 6) ➔ 1.98x (₹100 bet ➔ ₹198 win)</div>
                <div>• Exact 7 ➔ 12.00x (₹100 bet ➔ ₹1,200 win)</div>
                <div>• 7 Up (8 to K) ➔ 1.98x (₹100 bet ➔ ₹198 win)</div>
                <div>• Even Number ➔ 2.10x | Odd Number ➔ 1.80x</div>
                <div>• Red / Black ➔ 1.98x</div>
                <div>• Suit (♠, ♥, ♣, ♦) ➔ 3.75x</div>
                <div>• 3 Card Group (A23, 456, 8910, JQK) ➔ 4.00x</div>
                <div>• Exact Card Rank (A to K) ➔ 13.00x</div>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition"
            >
              Got It / Play Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
