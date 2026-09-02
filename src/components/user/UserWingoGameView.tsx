import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { GameType, GamePeriod, Bet, BetType, BetSelection } from '../../types.js';
import { BALL_ASSETS, TIMER_ASSETS } from '../../constants/assets.js';
import { soundEngine } from '../../utils/audio.js';
import { UserLogo } from './UserLogo.js';
import { WatchIcon } from './WatchIcon.js';
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

  // Result Popups (Win & Loss)
  const [resultBet, setResultBet] = useState<{ bet: Bet; type: 'won' | 'lost' } | null>(null);
  const [resultPopupTimer, setResultPopupTimer] = useState<number>(3);
  const [autoCloseResults, setAutoCloseResults] = useState<boolean>(true);
  const knownSettledBets = useRef<Set<string>>(new Set());
  const lastBeepedSec = useRef<number | null>(null);

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
  const fetchGame = async () => {
    try {
      const res = await api.getLiveGame(selectedGameType);
      if (res?.period) {
        setPeriod(res.period);
        setHistory(res.history || []);

        // Sound trigger for final 5 seconds countdown
        const sec = res.period.remainingSeconds;
        if (sec !== undefined && sec >= 1 && sec <= 5) {
          if (lastBeepedSec.current !== sec) {
            lastBeepedSec.current = sec;
            soundEngine.playCountdownBeep(sec, isMuted);
          }
        } else if (sec > 5) {
          lastBeepedSec.current = null;
        }
      }
      if (user?.uid) {
        const betsRes = await api.getMyBets(user.uid, selectedGameType);
        if (betsRes?.bets) {
          // Strictly filter only WinGo bets for the current game type (exclude mines, aviator, chicken road, roulette, plinko)
          const wingoBetsOnly = (betsRes.bets as Bet[]).filter((b) => {
            const isMatchingWingo = b.gameType === selectedGameType;
            const isNonWingoPeriod = b.periodId && /^(MINES|AVIATOR|CHICKEN|PLINKO|ROULETTE)/i.test(b.periodId);
            return isMatchingWingo && !isNonWingoPeriod;
          });
          setMyBets(wingoBetsOnly);

          // Check for newly settled bets to trigger winning or loss popup
          wingoBetsOnly.forEach((b: Bet) => {
            if (b.status !== 'pending' && !knownSettledBets.current.has(b.id)) {
              knownSettledBets.current.add(b.id);
              const diffMs = Date.now() - new Date(b.createdAt).getTime();
              // Only trigger popup for recently resolved bets (within 45s)
              if (diffMs < 45000) {
                if (b.status === 'won') {
                  setResultBet({ bet: b, type: 'won' });
                  setResultPopupTimer(3);
                  soundEngine.playWinSound(isMuted);
                } else if (b.status === 'lost') {
                  setResultBet({ bet: b, type: 'lost' });
                  setResultPopupTimer(3);
                  soundEngine.playLossSound(isMuted);
                }
              }
            }
          });
        }
      }
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    fetchGame();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchGame();
    }, 1000);
    return () => {
      clearInterval(timer);
      soundEngine.stopAll();
    };
  }, [selectedGameType, user?.uid, isMuted]);

  // Result popup 3s auto countdown (if enabled)
  useEffect(() => {
    if (!resultBet || !autoCloseResults) return;
    const interval = setInterval(() => {
      setResultPopupTimer((prev) => {
        if (prev <= 1) {
          setResultBet(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resultBet, autoCloseResults]);

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

    setSubmittingBet(true);
    try {
      await api.placeBet({
        uid: user.uid,
        username: user.username,
        gameType: selectedGameType,
        periodId: period.periodId,
        betType,
        selection: selectedBet,
        amount: unitAmount,
        multiplier,
      });

      soundEngine.playClick(isMuted);
      showToast(`Bet placed on ${String(selectedBet).toUpperCase()} for ₹${totalAmount}!`, 'success');
      setShowBetSlip(false);
      refreshUser();
      fetchGame();
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

  const cd = formatCountdown(period?.remainingSeconds || 0);
  const isFinal5Seconds = (period?.remainingSeconds !== undefined && period.remainingSeconds <= 5 && period.remainingSeconds >= 0);

  const gameTypes = [
    { type: 'wingo_30s' as GameType, title: 'WinGo 30sec' },
    { type: 'wingo_1m' as GameType, title: 'WinGo 1 Min' },
    { type: 'wingo_3m' as GameType, title: 'WinGo 3 Min' },
    { type: 'wingo_5m' as GameType, title: 'WinGo 5 Min' },
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
      
      {/* 1st IMAGE: Header with Luxury ArowClub Branding (Fixed pinned top header, never moves, consistent dark luxury gold theme) */}
      <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between bg-[#0c0d12]/98 backdrop-blur-xl border-b border-[#f5c443]/25 shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Company Name ArowClub with Golden Emblem */}
          <div className="flex items-center">
            <UserLogo size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSupport}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-[#f5c443] transition"
            >
              <Headphones className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                showToast(!isMuted ? 'Sound muted' : 'Sound unmuted', 'info');
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                isMuted ? 'text-zinc-500 hover:text-zinc-300' : 'text-[#f5c443] hover:text-[#fce08b]'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 w-full shrink-0" />

      {/* Main Game Container - Pure White & Crisp Light Cards */}
      <div className="px-3.5 pt-2.5 max-w-md mx-auto w-full space-y-3">
        
        {/* Wallet Balance Card in Glossy Gold Card (3rd Image) */}
        <div
          className="rounded-2xl p-4 shadow-md text-center space-y-2 relative overflow-hidden border border-[#f5c443]/40"
          style={{
            backgroundImage: 'url(/assets/wingo_wallet_bg.svg)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="flex items-center justify-center gap-2 relative z-10">
            <span className="text-2xl font-black text-slate-950 tracking-tight drop-shadow-sm">
              ₹{(user?.walletBalance ?? 0).toFixed(2)}
            </span>
            <button
              onClick={handleRefreshBalance}
              className={`text-slate-800 hover:text-slate-950 transition ${refreshingBalance ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-900 font-black relative z-10">
            <span>👛</span>
            <span>Wallet balance</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 relative z-10">
            <button
              onClick={onNavigateWithdraw}
              className="py-2.5 rounded-full bg-[#eb4335] hover:bg-[#d93025] active:scale-95 text-white font-black text-sm shadow-md transition"
            >
              Withdraw
            </button>
            <button
              onClick={onNavigateDeposit}
              className="py-2.5 rounded-full bg-gradient-to-r from-[#22c55e] via-[#16a34a] to-[#15803d] hover:brightness-105 active:scale-95 text-white font-black text-sm shadow-[0_3px_12px_rgba(34,197,94,0.4)] border border-[#86efac]/40 transition"
            >
              Deposit
            </button>
          </div>
        </div>

        {/* Announcement Banner */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-xs text-slate-600 truncate whitespace-nowrap">
              Welcome to ArowClub! Official verified color lottery games with 24/7 fast withdrawals...
            </div>
          </div>
          <button
            onClick={onOpenHowToPlay}
            className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 shadow hover:brightness-110 active:scale-95"
          >
            <Flame className="w-3 h-3 text-white fill-white" />
            <span>Detail</span>
          </button>
        </div>

        {/* WinGo Timeframe Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {gameTypes.map((gt) => {
            const isActive = selectedGameType === gt.type;
            return (
              <button
                key={gt.type}
                onClick={() => setSelectedGameType(gt.type)}
                className={`py-2.5 px-1 rounded-xl flex flex-col items-center justify-center relative transition ${
                  isActive
                    ? 'bg-gradient-to-b from-[#fcd34d] via-[#f5c443] to-[#d97706] text-slate-950 font-black shadow-[0_4px_14px_rgba(245,196,67,0.45)] border border-[#fef08a]/60'
                    : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <WatchIcon active={isActive} className="w-7 h-7 mb-1" />
                <span className="text-[10px] font-black leading-tight text-center">{gt.title}</span>
              </button>
            );
          })}
        </div>

        {/* Ticket-Style Period & Digital Countdown Display (Exact Match to User Image with Subtle Top/Bottom Notches and Road-Style Center Dashed Line) */}
        <div className="relative min-h-[110px] w-full flex items-center justify-between px-4 sm:px-5 py-4 my-1">
          {/* Vector SVG Ticket Body with Subtle Inward Semicircle Cuts and Glowing Border */}
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

              {/* Main Ticket Shape with Subtle (Reduced Size) Top & Bottom Notch Cuts */}
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
                strokeWidth="3.5"
                strokeLinejoin="round"
              />

              {/* Center Road-like Vertical Dashed Perforation Line */}
              <line
                x1="300"
                y1="22"
                x2="300"
                y2="178"
                stroke="url(#roadLineGradDirect)"
                strokeWidth="5"
                strokeDasharray="10,7"
                strokeLinecap="round"
                opacity="0.95"
              />
            </svg>
          </div>

          {/* Dedicated Center Road-Divider Dashed Perforation Overlay for 100% Crisp Visibility */}
          <div className="absolute left-1/2 top-3 bottom-3 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-[3px] h-full border-r-[3px] border-dashed border-[#fff9c4] drop-shadow-[0_1px_2px_rgba(180,83,9,0.35)] opacity-90" />
          </div>

          {/* Left: How to play + Recent 5 balls */}
          <div className="space-y-1.5 flex-1 pr-4 relative z-10">
            <button
              onClick={onOpenHowToPlay}
              className="px-3 py-1 bg-black/15 hover:bg-black/25 text-slate-950 text-xs font-black rounded-full flex items-center gap-1 border border-black/10 transition shadow-sm"
            >
              <BookOpen className="w-3 h-3 text-amber-900" />
              <span>How to play</span>
            </button>

            <div className="text-xs font-black text-slate-950 tracking-tight">
              {gameTypes.find(g => g.type === selectedGameType)?.title}
            </div>

            {/* 5 recent balls */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {history.slice(0, 5).map((h, i) => {
                const num = h.resultNumber ?? 0;
                return (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] text-white shadow-sm"
                    style={{
                      backgroundImage: `url(${BALL_ASSETS[num as keyof typeof BALL_ASSETS] || BALL_ASSETS[0]})`,
                      backgroundSize: 'cover',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Spacer aligning with center perforation */}
          <div className="w-[1px] h-16 opacity-0" />

          {/* Right: Time remaining + Digital boxes + Period Number */}
          <div className="text-right pl-3 relative z-10">
            <div className="text-xs text-slate-950 font-black mb-1">Time remaining</div>
            
            {/* Digital boxes [0] [0] : [0] [3] in Black & Yellow */}
            <div className="flex items-center justify-end gap-1 mb-1">
              <span className="w-5 h-6 bg-[#121520] border border-[#f5c443]/40 rounded flex items-center justify-center font-mono font-black text-sm text-[#fce08b] shadow">
                {cd.m1}
              </span>
              <span className="w-5 h-6 bg-[#121520] border border-[#f5c443]/40 rounded flex items-center justify-center font-mono font-black text-sm text-[#fce08b] shadow">
                {cd.m2}
              </span>
              <span className="text-slate-950 font-black text-sm mx-0.5">:</span>
              <span className="w-5 h-6 bg-[#121520] border border-[#f5c443]/40 rounded flex items-center justify-center font-mono font-black text-sm text-[#fce08b] shadow">
                {cd.s1}
              </span>
              <span className="w-5 h-6 bg-[#121520] border border-[#f5c443]/40 rounded flex items-center justify-center font-mono font-black text-sm text-[#fce08b] shadow">
                {cd.s2}
              </span>
            </div>

            <div className="text-xs sm:text-sm font-mono font-black text-slate-950 tracking-wider">
              {period?.periodId || '---'}
            </div>
          </div>
        </div>

        {/* BETTING CONTROLS (Exact layout matching Tiranga / WinGo specification) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-sm space-y-3 relative overflow-hidden">
          
          {/* Color Betting Buttons - 2nd IMAGE: Asymmetric Distinct Curves */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Green: Rounded Left + Top-Right High Curve */}
            <button
              onClick={() => handleSelectOption('color', 'green')}
              disabled={isFinal5Seconds}
              className="py-3 px-2 rounded-l-lg rounded-tr-[1.35rem] rounded-br-sm font-bold text-xs text-white shadow-md active:scale-95 transition bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-40 flex items-center justify-center tracking-wide"
            >
              Green
            </button>

            {/* Violet: Uniform Rounded Rectangle */}
            <button
              onClick={() => handleSelectOption('color', 'violet')}
              disabled={isFinal5Seconds}
              className="py-3 px-2 rounded-lg font-bold text-xs text-white shadow-md active:scale-95 transition bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-40 flex items-center justify-center tracking-wide"
            >
              Violet
            </button>

            {/* Red: Top-Left High Curve + Rounded Right */}
            <button
              onClick={() => handleSelectOption('color', 'red')}
              disabled={isFinal5Seconds}
              className="py-3 px-2 rounded-tl-[1.35rem] rounded-bl-sm rounded-r-lg font-bold text-xs text-white shadow-md active:scale-95 transition bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-40 flex items-center justify-center tracking-wide"
            >
              Red
            </button>
          </div>

          {/* Number Balls - Softened Subdued Panel Container (0 to 9) */}
          <div className="relative bg-[#0f172a]/15 border border-slate-200/80 rounded-2xl p-3 shadow-inner">
            <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleSelectOption('number', num)}
                  disabled={isFinal5Seconds}
                  className="aspect-square rounded-full flex items-center justify-center shadow-md active:scale-90 transition disabled:opacity-40 hover:scale-105"
                  style={{
                    backgroundImage: `url(${BALL_ASSETS[num as keyof typeof BALL_ASSETS] || BALL_ASSETS[0]})`,
                    backgroundSize: 'cover',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Random & Multipliers Row */}
          <div className="pt-0.5 flex items-center justify-between gap-1.5 w-full">
            <button
              onClick={handleRandomSelect}
              disabled={isFinal5Seconds}
              className="px-3 py-1.5 rounded-lg border border-rose-400 text-rose-500 bg-rose-50 hover:bg-rose-100 font-bold text-xs active:scale-95 transition whitespace-nowrap disabled:opacity-40 shrink-0 shadow-sm"
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
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition text-center disabled:opacity-40 ${
                    multiplier === m
                      ? 'bg-amber-500 text-white font-black shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  X{m}
                </button>
              ))}
            </div>
          </div>

          {/* 3rd IMAGE: Big and Small Fully ATTACHED Continuous Capsule Bar */}
          <div className="pt-1">
            <div className="w-full h-11 rounded-full overflow-hidden flex shadow-md">
              {/* Left Half: Big */}
              <button
                onClick={() => handleSelectOption('big_small', 'big')}
                disabled={isFinal5Seconds}
                className="flex-1 h-full font-black text-sm text-white transition bg-[#df8a24] hover:bg-[#cf7c18] active:brightness-95 disabled:opacity-40 flex items-center justify-center tracking-wider"
              >
                Big
              </button>

              {/* Right Half: Small */}
              <button
                onClick={() => handleSelectOption('big_small', 'small')}
                disabled={isFinal5Seconds}
                className="flex-1 h-full font-black text-sm text-white transition bg-[#4285f4] hover:bg-[#3374e0] active:brightness-95 disabled:opacity-40 flex items-center justify-center tracking-wider"
              >
                Small
              </button>
            </div>
          </div>

          {/* UNIFORM LIGHT BLUR & YELLOW-BLACK 5s COUNTDOWN OVERLAY OVER ENTIRE BETTING CONTAINER */}
          {isFinal5Seconds && (
            <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] rounded-2xl flex items-center justify-center gap-3.5 z-30 pointer-events-none animate-fadeIn">
              <div className="w-24 h-36 rounded-2xl bg-gradient-to-b from-[#fde047] via-[#f5c443] to-[#d97706] border-2 border-[#fef08a] shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex items-center justify-center font-mono font-black text-7xl text-[#0d0f17]">
                0
              </div>
              <div className="w-24 h-36 rounded-2xl bg-gradient-to-b from-[#fde047] via-[#f5c443] to-[#d97706] border-2 border-[#fef08a] shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex items-center justify-center font-mono font-black text-7xl text-[#0d0f17] animate-pulse">
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
                            <div
                              className="w-6 h-6 rounded-full mx-auto flex items-center justify-center font-black text-xs text-white shadow-sm"
                              style={{
                                backgroundImage: `url(${BALL_ASSETS[num as keyof typeof BALL_ASSETS] || BALL_ASSETS[0]})`,
                                backgroundSize: 'cover',
                              }}
                            />
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
                                    <div
                                      className="chart-active-ball w-4 h-4 rounded-full mx-auto flex items-center justify-center shadow font-bold text-[9px] text-white z-20 relative"
                                      style={{
                                        backgroundImage: `url(${BALL_ASSETS[n as keyof typeof BALL_ASSETS] || BALL_ASSETS[0]})`,
                                        backgroundSize: 'cover',
                                      }}
                                    />
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
                <div className="bg-gradient-to-b from-[#ff8159] via-[#ff6854] to-[#fa4646] rounded-[28px] pt-12 pb-4 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 text-white relative overflow-hidden">
                  
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

                  {/* Bottom: 3 seconds auto close checkbox */}
                  <div className="flex items-center justify-start gap-2.5 px-4 pt-3 pb-1 text-xs text-white/95 font-medium">
                    <button
                      type="button"
                      onClick={() => setAutoCloseResults((prev) => !prev)}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition cursor-pointer ${
                        autoCloseResults ? 'bg-white/30 border-white text-white' : 'bg-transparent border-white/60 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span 
                      onClick={() => setAutoCloseResults((prev) => !prev)}
                      className="cursor-pointer select-none"
                    >
                      {autoCloseResults ? `${resultPopupTimer} seconds auto close` : '3 seconds auto close'}
                    </span>
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
                <div className="bg-gradient-to-b from-[#3a3f4d] via-[#2a2f3e] to-[#1c1f29] rounded-[28px] pt-12 pb-4 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-zinc-600/40 text-white relative overflow-hidden">
                  
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

                  {/* Bottom: 3 seconds auto close checkbox */}
                  <div className="flex items-center justify-start gap-2.5 px-4 pt-3 pb-1 text-xs text-zinc-300 font-medium">
                    <button
                      type="button"
                      onClick={() => setAutoCloseResults((prev) => !prev)}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition cursor-pointer ${
                        autoCloseResults ? 'bg-white/30 border-white text-white' : 'bg-transparent border-white/60 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span 
                      onClick={() => setAutoCloseResults((prev) => !prev)}
                      className="cursor-pointer select-none"
                    >
                      {autoCloseResults ? `${resultPopupTimer} seconds auto close` : '3 seconds auto close'}
                    </span>
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
