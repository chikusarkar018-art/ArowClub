import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  ChevronLeft, Menu
} from 'lucide-react';
import {
  Difficulty, DifficultyConfig, DIFFICULTY_PRESETS,
  GameStatus, RoundHistoryItem
} from '../../types/chickenGame';
import { GameCanvas, GameCanvasHandle } from '../chicken/GameCanvas';
import { ControlPanel } from '../chicken/ControlPanel';
import { LossPopup } from '../chicken/LossPopup';
import { HowToPlayModal } from '../chicken/HowToPlayModal';
import { ChickenHistoryModal } from '../chicken/ChickenHistoryModal';
import { soundFx } from '../../utils/chickenSound';

interface UserChickenRoadGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
}

export const UserChickenRoadGameView: React.FC<UserChickenRoadGameViewProps> = ({
  onBack,
  onNavigateDeposit,
}) => {
  const { user, refreshUser, showToast } = useAuth();

  const [roundId, setRoundId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('arowclub_chicken_round_counter');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return 1001;
  });
  const [betAmount, setBetAmount] = useState<number>(20);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const currencySymbol = '₹';

  const [history, setHistory] = useState<RoundHistoryItem[]>([]);
  const [lastWinAmount, setLastWinAmount] = useState<number | undefined>(undefined);

  // Modals & Popups
  const [isLossPopupOpen, setIsLossPopupOpen] = useState(false);
  const [lossAmount, setLossAmount] = useState(0);
  const [restartCountdown, setRestartCountdown] = useState(3);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canvasRef = useRef<GameCanvasHandle>(null);
  const autoRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentConfig: DifficultyConfig = DIFFICULTY_PRESETS[difficulty];
  const currentMultiplier = currentStep === 0 ? 1 : currentConfig.multipliers[currentStep - 1];

  // Sync sound settings
  useEffect(() => {
    soundFx.enabled = soundEnabled;
  }, [soundEnabled]);

  const fireConfetti = () => {
    try {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    } catch {}
  };

  const clearRestartTimers = useCallback(() => {
    if (autoRestartTimerRef.current) {
      clearTimeout(autoRestartTimerRef.current);
      autoRestartTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const triggerRoundLoss = useCallback((lostBet: number, crashStepIndex: number) => {
    setCurrentStep(crashStepIndex);
    setGameStatus('crashed');
    soundFx.playCrash();
    setIsProcessing(false);

    // Record Bet to Backend History
    if (user) {
      api.recordGameBet({
        userId: user.id,
        gameType: 'chicken_road' as any,
        periodId: `${roundId}`,
        unitAmount: lostBet,
        multiplier: 1,
        totalAmount: lostBet,
        status: 'lost',
        winAmount: 0,
      });
    }

    const roundItem: RoundHistoryItem = {
      id: `${roundId}`,
      timestamp: Date.now(),
      bet: lostBet,
      difficulty,
      multiplier: 0,
      profit: -lostBet,
      status: 'lost',
      stepReached: Math.max(0, crashStepIndex - 1),
      totalLanes: currentConfig.lanesCount
    };
    setHistory((prev) => [roundItem, ...prev]);

    setRoundId((prev) => {
      const next = prev + 1;
      try { localStorage.setItem('arowclub_chicken_round_counter', String(next)); } catch {}
      return next;
    });

    setLossAmount(lostBet);
    setIsLossPopupOpen(true);
    setRestartCountdown(3);
    clearRestartTimers();

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setRestartCountdown(count);
      if (count <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    autoRestartTimerRef.current = setTimeout(() => {
      setIsLossPopupOpen(false);
      setCurrentStep(0);
      setGameStatus('idle');
      clearRestartTimers();
    }, 3000);
  }, [clearRestartTimers, currentConfig.lanesCount, difficulty, user]);

  const handleImmediateRestart = useCallback(() => {
    clearRestartTimers();
    setIsLossPopupOpen(false);
    setCurrentStep(0);
    setGameStatus('idle');
    setLossAmount(0);
  }, [clearRestartTimers]);

  // Main Hop / Start handler
  const handleGo = useCallback(async () => {
    if (isProcessing) return;

    // 1. If IDLE -> Start new round & deduct bet
    if (gameStatus !== 'playing') {
      const currentWallet = user?.walletBalance ?? 0;
      if (currentWallet < betAmount) {
        showToast(`Insufficient balance! Please recharge ₹${betAmount}`, 'error');
        onNavigateDeposit();
        return;
      }

      setIsProcessing(true);
      clearRestartTimers();
      setIsLossPopupOpen(false);

      try {
        if (user) {
          await api.updateWalletBalance(user.id, -betAmount, 'bet');
          refreshUser();
        }

        setGameStatus('playing');
        setCurrentStep(0);
        soundFx.playClick();
        setIsProcessing(false);
      } catch {
        showToast('Network error, please try again', 'error');
        setIsProcessing(false);
      }
      return;
    }

    // 2. If PLAYING -> Attempt to hop into next lane
    const nextStep = currentStep + 1;
    const maxLanes = currentConfig.lanesCount;

    if (nextStep > maxLanes) return;

    setIsProcessing(true);
    soundFx.playJump();

    // Check real-time physical car collision before barrier drops!
    const targetLaneIndex = currentStep; // 0-indexed lane index
    const hopEval = canvasRef.current?.evaluateHop(targetLaneIndex);
    const isCrash = hopEval ? hopEval.crashed : (Math.random() < currentConfig.crashChancePerStep);

    if (isCrash) {
      triggerRoundLoss(betAmount, nextStep);
      return;
    }

    // SUCCESSFUL HOP -> Lands on manhole, VIP barrier immediately drops, cars stop at barrier
    setCurrentStep(nextStep);
    const stepMult = currentConfig.multipliers[nextStep - 1] || 1;
    soundFx.playStepSuccess(stepMult);
    setIsProcessing(false);

    // If reached final lane (Finish line)
    if (nextStep === maxLanes) {
      const finalMult = currentConfig.multipliers[maxLanes - 1];
      const winVal = +(betAmount * finalMult).toFixed(2);

      setGameStatus('won_finish');
      setLastWinAmount(winVal);
      soundFx.playBigWin();
      fireConfetti();

      if (user) {
        try {
          await api.updateWalletBalance(user.id, winVal, 'win');
          api.recordGameBet({
            userId: user.id,
            gameType: 'chicken_road' as any,
            periodId: `${roundId}`,
            unitAmount: betAmount,
            multiplier: finalMult,
            totalAmount: betAmount,
            status: 'won',
            winAmount: winVal,
          });
          refreshUser();
        } catch {}
      }

      const roundItem: RoundHistoryItem = {
        id: `${roundId}`,
        timestamp: Date.now(),
        bet: betAmount,
        difficulty,
        multiplier: finalMult,
        profit: +(winVal - betAmount).toFixed(2),
        status: 'won',
        stepReached: maxLanes,
        totalLanes: maxLanes
      };
      setHistory((prev) => [roundItem, ...prev]);
      setRoundId((prev) => {
        const next = prev + 1;
        try { localStorage.setItem('arowclub_chicken_round_counter', String(next)); } catch {}
        return next;
      });
      showToast(`🏆 VIP JACKPOT! Won ₹${winVal} (${finalMult}x)`, 'success');
    }
  }, [
    isProcessing, gameStatus, user, betAmount, currentStep, currentConfig,
    clearRestartTimers, onNavigateDeposit, refreshUser, showToast, triggerRoundLoss, difficulty, roundId
  ]);

  // Cashout handler
  const handleCashOut = useCallback(async () => {
    if (gameStatus !== 'playing' || currentStep === 0 || isProcessing) return;

    setIsProcessing(true);
    const winMultiplier = currentConfig.multipliers[currentStep - 1];
    const winTotal = +(betAmount * winMultiplier).toFixed(2);

    setGameStatus('cashed_out');
    setLastWinAmount(winTotal);
    soundFx.playCashOut();
    fireConfetti();

    if (user) {
      try {
        await api.updateWalletBalance(user.id, winTotal, 'win');
        api.recordGameBet({
          userId: user.id,
          gameType: 'chicken_road' as any,
          periodId: `${roundId}`,
          unitAmount: betAmount,
          multiplier: winMultiplier,
          totalAmount: betAmount,
          status: 'won',
          winAmount: winTotal,
        });
        refreshUser();
      } catch {}
    }

    const roundItem: RoundHistoryItem = {
      id: `${roundId}`,
      timestamp: Date.now(),
      bet: betAmount,
      difficulty,
      multiplier: winMultiplier,
      profit: +(winTotal - betAmount).toFixed(2),
      status: 'won',
      stepReached: currentStep,
      totalLanes: currentConfig.lanesCount
    };
    setHistory((prev) => [roundItem, ...prev]);
    setRoundId((prev) => {
      const next = prev + 1;
      try { localStorage.setItem('arowclub_chicken_round_counter', String(next)); } catch {}
      return next;
    });

    showToast(`💰 Cashed Out ₹${winTotal} (${winMultiplier.toFixed(2)}x)!`, 'success');
    setIsProcessing(false);
  }, [
    gameStatus, currentStep, isProcessing, currentConfig, betAmount, user,
    refreshUser, showToast, difficulty
  ]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleGo();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleCashOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGo, handleCashOut]);

  useEffect(() => {
    return () => clearRestartTimers();
  }, [clearRestartTimers]);

  const walletBal = user?.walletBalance ?? 0;

  return (
    <div
      id="chicken-road-screen-root"
      className="min-h-screen bg-[#111217] text-zinc-100 flex flex-col items-center justify-start p-0 sm:p-4 font-sans select-none"
    >
      <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl bg-[#1c1d24] sm:rounded-3xl sm:border sm:border-[#2f313d] shadow-2xl flex flex-col justify-between overflow-hidden relative min-h-[100dvh] sm:min-h-0">
        
        {/* Modals */}
        <LossPopup
          isOpen={isLossPopupOpen}
          lostAmount={lossAmount}
          currencySymbol={currencySymbol}
          restartCountdown={restartCountdown}
          onRestartNow={handleImmediateRestart}
        />

        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

        <ChickenHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          history={history}
          currencySymbol={currencySymbol}
        />

        {/* 1. TOP HEADER: Matching Image 1 & 2 */}
        <header
          id="chicken-header-bar"
          className="flex items-center justify-between px-3.5 py-2.5 bg-[#17181f] border-b border-[#292a35] sticky top-0 z-40"
        >
          {/* Brand Logo: "CHICKEN [2] ROAD" */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
              title="Back to games"
            >
              <ChevronLeft className="w-5 h-5 text-amber-400" />
            </button>

            <div className="flex items-center gap-1">
              <span className="text-xl">🐔</span>
              <div className="flex items-center font-black tracking-tight text-white text-xs sm:text-sm">
                <span className="font-extrabold uppercase">CHICKEN</span>
                <span className="mx-1 px-1.5 py-0.2 bg-[#ef4444] text-white text-[10px] font-black rounded-md shadow">
                  2
                </span>
                <span className="font-extrabold uppercase">ROAD</span>
              </div>
            </div>
          </div>

          {/* User Live Balance Pill: `10 307.36 🪙` */}
          <div className="flex items-center gap-2">
            <div
              onClick={onNavigateDeposit}
              className="bg-[#242630] border border-[#373946] rounded-full px-3.5 py-1.5 flex items-center gap-2 shadow-inner cursor-pointer hover:border-amber-500/50 transition"
              title="Click to Deposit / Recharge"
            >
              <span className="font-mono font-black text-xs sm:text-sm text-white tracking-wide">
                {walletBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="w-4 h-4 rounded-full bg-[#f5c443] flex items-center justify-center text-[10px] font-black text-zinc-950 shadow">
                ₹
              </div>
            </div>

            {/* Menu / Rules Trigger */}
            <button
              onClick={() => setShowHowToPlay(true)}
              className="p-2 text-zinc-300 hover:text-white bg-[#242630] hover:bg-[#2e303d] rounded-xl border border-[#373946] transition active:scale-95 cursor-pointer shadow"
              title="Game Options / Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. GAME CANVAS ARENA */}
        <div className="flex-1 flex flex-col justify-center p-2.5 sm:p-3.5">
          <GameCanvas
            ref={canvasRef}
            currentStep={currentStep}
            config={currentConfig}
            gameStatus={gameStatus}
            currentMultiplier={currentMultiplier}
            betAmount={betAmount}
            currencySymbol={currencySymbol}
            onLaneClick={(laneIdx) => {
              if (laneIdx === currentStep) handleGo();
            }}
            winAmount={lastWinAmount}
            isDesktop={false}
          />
        </div>

        {/* 3. BOTTOM CONTROL PANEL (Fixed Height, 0 Layout Shift) */}
        <div className="p-2.5 sm:p-3.5 pt-0">
          <ControlPanel
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            balance={walletBal}
            difficulty={difficulty}
            setDifficulty={(diff) => {
              if (gameStatus !== 'playing') {
                setDifficulty(diff);
                setCurrentStep(0);
                soundFx.playClick();
              }
            }}
            gameStatus={gameStatus}
            currentStep={currentStep}
            currentMultiplier={currentMultiplier}
            maxLanes={currentConfig.lanesCount}
            onGo={handleGo}
            onCashOut={handleCashOut}
            currencySymbol={currencySymbol}
            isProcessing={isProcessing}
            isDesktop={false}
          />
        </div>

      </div>
    </div>
  );
};
