import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { rouletteAudio } from '../../utils/rouletteAudio.js';
import { CasinoChip } from './CasinoChip.js';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, Wallet, BarChart2, Volume2, VolumeX,
  ChevronRight, X, Sparkles, Flame, TrendingUp,
  Clock, HelpCircle, History as HistoryIcon, Layers, ShieldCheck
} from 'lucide-react';

interface UserRouletteGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
}

// European Roulette Wheel Numbers Sequence in clockwise order
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000];

// Simulated multiplayer player names for live casino atmosphere
const BOT_NAMES = [
  'Rahul K.', 'Vikram S.', 'Amit P.', 'Priya M.', 'Deepak R.', 'Arjun B.',
  'Sanjay N.', 'Kavita D.', 'Rohan J.', 'Neha G.', 'Sunil V.', 'Ananya T.'
];

type GamePhase = 'betting' | 'spinning' | 'result';
type ActiveSubView = 'board' | 'inside_special' | 'history' | 'payouts';

interface DroppedChip {
  id: string;
  value: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  isUser: boolean;
}

interface RoundRecord {
  gameId: string;
  timestamp: string;
  winningNumber: number;
  isRed: boolean;
  isBlack: boolean;
  isGreen: boolean;
  userBetAmount: number;
  userWonAmount: number;
  netProfit: number;
}

// 12 Standard Roulette Bets & Payouts Reference (Exact match with user reference)
export const ROULETTE_PAYOUT_RULES = [
  { id: 1, title: 'Single number bet ("straight up")', payout: '35 to 1', multiplier: 36, desc: 'Bet on any individual number (0-36)' },
  { id: 2, title: 'Double number bet ("split")', payout: '17 to 1', multiplier: 18, desc: 'Bet on two adjoining numbers' },
  { id: 3, title: 'Three number bet ("street")', payout: '11 to 1', multiplier: 12, desc: 'Bet on a row of three numbers (e.g. 1-2-3)' },
  { id: 4, title: 'Four number bet ("corner bet")', payout: '8 to 1', multiplier: 9, desc: 'Bet on four numbers at a corner intersection' },
  { id: 5, title: 'Five number bet ("basket / top line")', payout: '6 to 1', multiplier: 7, desc: 'Specific bet covering 0, 1, 2, 3' },
  { id: 6, title: 'Six number bets ("line / six line")', payout: '5 to 1', multiplier: 6, desc: 'Bet on two adjacent rows (e.g. 7-12)' },
  { id: 7, title: 'Twelve numbers or dozens (1st, 2nd, 3rd dozen)', payout: '2 to 1', multiplier: 3, desc: '1-12, 13-24, or 25-36' },
  { id: 8, title: 'Column bet (12 numbers in a row)', payout: '2 to 1', multiplier: 3, desc: 'Top, Middle, or Bottom horizontal line of 12' },
  { id: 9, title: '18 numbers (1-18 / Low)', payout: '1 to 1 (Even money)', multiplier: 2, desc: 'Numbers from 1 to 18' },
  { id: 10, title: '18 numbers (19-36 / High)', payout: '1 to 1 (Even money)', multiplier: 2, desc: 'Numbers from 19 to 36' },
  { id: 11, title: 'Red or black', payout: '1 to 1 (Even money)', multiplier: 2, desc: 'All red numbers or all black numbers' },
  { id: 12, title: 'Odd or even', payout: '1 to 1 (Even money)', multiplier: 2, desc: 'All odd or even numbers (0 loses)' },
];

// Helper to evaluate any bet key against a winning number
export function evaluateBetResult(betKey: string, winningNum: number): { won: boolean; multiplier: number; label: string; payoutRatio: string } {
  // 1. Single Straight Up (pays 35 to 1 -> 36x return)
  if (betKey.startsWith('num_')) {
    const num = parseInt(betKey.replace('num_', ''), 10);
    const won = winningNum === num;
    return { won, multiplier: 36, label: `Single #${num}`, payoutRatio: '35 to 1' };
  }

  // 2. Double Split (pays 17 to 1 -> 18x return)
  if (betKey.startsWith('split_')) {
    const nums = betKey.replace('split_', '').split('_').map(Number);
    const won = nums.includes(winningNum);
    return { won, multiplier: 18, label: `Split (${nums.join(', ')})`, payoutRatio: '17 to 1' };
  }

  // 3. Three Number Street (pays 11 to 1 -> 12x return)
  if (betKey.startsWith('street_')) {
    const parts = betKey.replace('street_', '').split('_').map(Number);
    let nums: number[] = [];
    if (parts.length === 1) {
      const start = parts[0];
      nums = [start, start + 1, start + 2];
    } else {
      nums = parts;
    }
    const won = nums.includes(winningNum);
    return { won, multiplier: 12, label: `Street (${nums.join('-')})`, payoutRatio: '11 to 1' };
  }

  // 4. Four Number Corner (pays 8 to 1 -> 9x return)
  if (betKey.startsWith('corner_')) {
    const parts = betKey.replace('corner_', '').split('_').map(Number);
    let nums: number[] = [];
    if (parts.length === 1) {
      const topLeft = parts[0];
      nums = [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
    } else {
      nums = parts;
    }
    const won = nums.includes(winningNum);
    return { won, multiplier: 9, label: `Corner (${nums.join(', ')})`, payoutRatio: '8 to 1' };
  }

  // 5. Five Number Basket (pays 6 to 1 -> 7x return)
  if (betKey === 'five_basket' || betKey === 'basket') {
    const won = [0, 1, 2, 3].includes(winningNum);
    return { won, multiplier: 7, label: 'Five / Basket (0,1,2,3)', payoutRatio: '6 to 1' };
  }

  // 6. Six Number Line (pays 5 to 1 -> 6x return)
  if (betKey.startsWith('line_')) {
    const start = parseInt(betKey.replace('line_', ''), 10);
    const nums = [start, start + 1, start + 2, start + 3, start + 4, start + 5];
    const won = nums.includes(winningNum);
    return { won, multiplier: 6, label: `Six Line (${start}-${start + 5})`, payoutRatio: '5 to 1' };
  }

  // 7. Dozens (pays 2 to 1 -> 3x return)
  if (betKey === 'doz_1') {
    const won = winningNum >= 1 && winningNum <= 12;
    return { won, multiplier: 3, label: '1st 12 (1-12)', payoutRatio: '2 to 1' };
  }
  if (betKey === 'doz_2') {
    const won = winningNum >= 13 && winningNum <= 24;
    return { won, multiplier: 3, label: '2nd 12 (13-24)', payoutRatio: '2 to 1' };
  }
  if (betKey === 'doz_3') {
    const won = winningNum >= 25 && winningNum <= 36;
    return { won, multiplier: 3, label: '3rd 12 (25-36)', payoutRatio: '2 to 1' };
  }

  // 8. Columns (pays 2 to 1 -> 3x return)
  if (betKey === 'col_1') {
    const won = winningNum > 0 && winningNum % 3 === 1;
    return { won, multiplier: 3, label: 'Column 1 (2 to 1)', payoutRatio: '2 to 1' };
  }
  if (betKey === 'col_2') {
    const won = winningNum > 0 && winningNum % 3 === 2;
    return { won, multiplier: 3, label: 'Column 2 (2 to 1)', payoutRatio: '2 to 1' };
  }
  if (betKey === 'col_3') {
    const won = winningNum > 0 && winningNum % 3 === 0;
    return { won, multiplier: 3, label: 'Column 3 (2 to 1)', payoutRatio: '2 to 1' };
  }

  // 9. 18 Numbers Low 1-18 (pays 1 to 1 -> 2x return)
  if (betKey === 'low') {
    const won = winningNum >= 1 && winningNum <= 18;
    return { won, multiplier: 2, label: '1 to 18 (Low)', payoutRatio: '1 to 1' };
  }

  // 10. 18 Numbers High 19-36 (pays 1 to 1 -> 2x return)
  if (betKey === 'high') {
    const won = winningNum >= 19 && winningNum <= 36;
    return { won, multiplier: 2, label: '19 to 36 (High)', payoutRatio: '1 to 1' };
  }

  // 11. Red or Black (pays 1 to 1 -> 2x return)
  if (betKey === 'red') {
    const won = RED_NUMBERS.includes(winningNum);
    return { won, multiplier: 2, label: 'Red', payoutRatio: '1 to 1' };
  }
  if (betKey === 'black') {
    const won = BLACK_NUMBERS.includes(winningNum);
    return { won, multiplier: 2, label: 'Black', payoutRatio: '1 to 1' };
  }

  // 12. Odd or Even (pays 1 to 1 -> 2x return)
  if (betKey === 'even') {
    const won = winningNum > 0 && winningNum % 2 === 0;
    return { won, multiplier: 2, label: 'Even', payoutRatio: '1 to 1' };
  }
  if (betKey === 'odd') {
    const won = winningNum > 0 && winningNum % 2 !== 0;
    return { won, multiplier: 2, label: 'Odd', payoutRatio: '1 to 1' };
  }

  return { won: false, multiplier: 0, label: betKey, payoutRatio: '0' };
}

function drawRouletteWheel(
  canvas: HTMLCanvasElement,
  wheelRotation: number,
  ballAngle: number,
  ballRadiusOffset: number,
  gamePhase: GamePhase,
  winningNumber: number | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 6;

  ctx.clearRect(0, 0, width, height);

  // Outer Rim
  const outerRimGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.85, centerX, centerY, radius);
  outerRimGrad.addColorStop(0, '#0c1322');
  outerRimGrad.addColorStop(0.6, '#0f172a');
  outerRimGrad.addColorStop(1, '#050811');
  ctx.fillStyle = outerRimGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#eab308';
  ctx.stroke();

  // Studs
  const studsCount = 28;
  for (let s = 0; s < studsCount; s++) {
    const studAngle = (s * Math.PI * 2) / studsCount;
    const studX = centerX + Math.cos(studAngle) * (radius * 0.94);
    const studY = centerY + Math.sin(studAngle) * (radius * 0.94);
    ctx.beginPath();
    ctx.arc(studX, studY, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();
  }

  // Ball Track
  const trackRadius = radius * 0.87;
  ctx.beginPath();
  ctx.arc(centerX, centerY, trackRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rotating Wheel
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((wheelRotation * Math.PI) / 180);

  const pocketAngle = (Math.PI * 2) / 37;
  const innerRadius = radius * 0.44;
  const outerRadius = radius * 0.85;

  WHEEL_NUMBERS.forEach((num, i) => {
    const angleStart = i * pocketAngle;
    const angleEnd = angleStart + pocketAngle;

    ctx.beginPath();
    ctx.moveTo(Math.cos(angleStart) * innerRadius, Math.sin(angleStart) * innerRadius);
    ctx.arc(0, 0, outerRadius, angleStart, angleEnd);
    ctx.lineTo(Math.cos(angleEnd) * innerRadius, Math.sin(angleEnd) * innerRadius);
    ctx.arc(0, 0, innerRadius, angleEnd, angleStart, true);
    ctx.closePath();

    const isWinPocket = winningNumber !== null && num === winningNumber && (gamePhase === 'result' || gamePhase === 'betting');
    if (isWinPocket) {
      ctx.fillStyle = '#fde047';
    } else if (num === 0) {
      ctx.fillStyle = '#059669';
    } else if (RED_NUMBERS.includes(num)) {
      ctx.fillStyle = '#dc2626';
    } else {
      ctx.fillStyle = '#18181b';
    }
    ctx.fill();

    ctx.strokeStyle = isWinPocket ? '#ffffff' : '#fbbf24';
    ctx.lineWidth = isWinPocket ? 2 : 1;
    ctx.stroke();

    ctx.save();
    const midAngle = angleStart + pocketAngle / 2;
    ctx.rotate(midAngle);
    ctx.translate((innerRadius + outerRadius) / 2, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = isWinPocket ? '#000000' : '#ffffff';
    ctx.font = isWinPocket ? '900 9.5px sans-serif' : '900 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), 0, 0);
    ctx.restore();
  });

  const spokeInner = innerRadius * 0.35;
  for (let i = 0; i < 37; i++) {
    const angle = i * pocketAngle;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * spokeInner, Math.sin(angle) * spokeInner);
    ctx.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(234, 179, 8, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius * 0.7);
  centerGrad.addColorStop(0, '#fef08a');
  centerGrad.addColorStop(0.4, '#eab308');
  centerGrad.addColorStop(0.8, '#a16207');
  centerGrad.addColorStop(1, '#451a03');

  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  for (let arm = 0; arm < 4; arm++) {
    const armAngle = (arm * Math.PI) / 2;
    ctx.save();
    ctx.rotate(armAngle);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(innerRadius * 0.42, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  if (gamePhase === 'spinning' || gamePhase === 'result' || winningNumber !== null) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((ballAngle * Math.PI) / 180);

    const curBallTrackRadius = radius * ballRadiusOffset;
    const ballGrad = ctx.createRadialGradient(curBallTrackRadius - 1.5, -1.5, 1, curBallTrackRadius, 0, 5);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.6, '#f4f4f5');
    ballGrad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = ballGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(curBallTrackRadius, 0, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export const UserRouletteGameView: React.FC<UserRouletteGameViewProps> = ({
  onBack,
  onNavigateDeposit,
}) => {
  const { user, refreshUser, showToast } = useAuth();

  // Audio mute state
  const [isMuted, setIsMuted] = useState(false);

  // Active view navigation
  const [activeSubView, setActiveSubView] = useState<ActiveSubView>('board');
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // Round / Game Cycle State
  const [gameId, setGameId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('arowclub_roulette_game_counter');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return String(parsed);
      }
    } catch {}
    return '1001';
  });
  const [gamePhase, setGamePhase] = useState<GamePhase>('betting');
  const [roundTimer, setRoundTimer] = useState<number>(20); // 20 Seconds Countdown
  const [onlinePlayersCount] = useState<number>(() => 1420 + Math.floor(Math.random() * 160));
  const [, setTablePool] = useState<number>(24500);

  // Wheel animation states
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [ballAngle, setBallAngle] = useState<number>(0);
  const [ballRadiusOffset, setBallRadiusOffset] = useState<number>(0.92);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);

  const wheelRotationRef = useRef<number>(0);
  const ballAngleRef = useRef<number>(0);

  useEffect(() => {
    wheelRotationRef.current = wheelRotation;
  }, [wheelRotation]);

  useEffect(() => {
    ballAngleRef.current = ballAngle;
  }, [ballAngle]);

  // Chips & Betting State
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [userBets, setUserBets] = useState<Record<string, number>>({});
  
  // Visual Dropped Chips per Cell
  const [droppedChipsMap, setDroppedChipsMap] = useState<Record<string, DroppedChip[]>>({});
  
  // Live winner ticker announcement
  const [winnerTicker, setWinnerTicker] = useState<string | null>(null);

  // History & Statistics records
  const [history, setHistory] = useState<number[]>([17, 33, 4, 21, 0, 7, 28, 12, 35, 3, 26, 14, 9, 2]);
  const [roundHistoryRecords, setRoundHistoryRecords] = useState<RoundRecord[]>([]);

  const [winBanner, setWinBanner] = useState<{ amount: number; number: number; breakdown: string[] } | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const spinStartTimeRef = useRef<number>(0);
  const ballRadiusOffsetRef = useRef<number>(0.645);
  const spinWatchdogRef = useRef<any>(null);
  const spinTargetAngleRef = useRef<{ wheelStart: number; wheelEnd: number; ballStart: number; ballEnd: number; pocketIdx: number }>({
    wheelStart: 0,
    wheelEnd: 0,
    ballStart: 0,
    ballEnd: 0,
    pocketIdx: 0,
  });

  // Keep mute state in sync
  useEffect(() => {
    rouletteAudio.setMuted(isMuted);
  }, [isMuted]);

  // Total User Bet
  const totalUserBet = Object.values(userBets).reduce((sum, v) => sum + v, 0);

  // Drop a physical chip on a cell (User or Bot)
  const placeChipOnBoard = useCallback((betKey: string, chipVal: number, isUserBet: boolean) => {
    const newChip: DroppedChip = {
      id: Math.random().toString(36).substring(2, 9),
      value: chipVal,
      offsetX: (Math.random() - 0.5) * 8,
      offsetY: (Math.random() - 0.5) * 6,
      rotation: Math.floor(Math.random() * 360),
      isUser: isUserBet,
    };

    setDroppedChipsMap((prev) => {
      const existing = prev[betKey] || [];
      return {
        ...prev,
        [betKey]: [...existing.slice(-4), newChip],
      };
    });

    if (isUserBet) {
      rouletteAudio.playChip();
      setUserBets((prev) => ({
        ...prev,
        [betKey]: (prev[betKey] || 0) + chipVal,
      }));
    } else {
      rouletteAudio.playMultiplayerChip();
    }
  }, []);

  // User Place Bet Handler
  const handleUserPlaceBet = (betKey: string) => {
    if (gamePhase !== 'betting') {
      showToast('Bets are closed for this round! Please wait for the next spin.', 'info');
      return;
    }

    const totalDeposit = Number(user?.totalDeposit || 0);
    if (totalDeposit < 100) {
      window.dispatchEvent(new CustomEvent('open-deposit-required', {
        detail: { minRequired: 100, currentDeposit: totalDeposit }
      }));
      return;
    }

    const currentTotal = Object.values(userBets).reduce((sum, v) => sum + v, 0);
    const balance = user?.walletBalance ?? 0;

    if (currentTotal + selectedChip > balance) {
      showToast('Insufficient wallet balance to place bet. Please recharge!', 'error');
      return;
    }

    placeChipOnBoard(betKey, selectedChip, true);
    setTablePool((p) => p + selectedChip);

    // Register bet with server live casino engine
    const userUid = user?.uid || String(user?.id || '').replace(/^u-/, '');
    if (userUid) {
      api.placeRouletteLiveBet(userUid, { [betKey]: selectedChip })
        .then((res: any) => {
          if (res && res.success) {
            refreshUser();
          } else if (res && res.error) {
            showToast(res.error, 'error');
          }
        })
        .catch((err) => {
          showToast(err?.message || 'Failed to place bet', 'error');
        });
    }
  };

  // ==========================================
  // CONTINUOUS 24/7 SERVER-AUTHORITATIVE LIVE ROULETTE SYNCHRONIZATION
  // ==========================================
  const lastProcessedRoundRef = useRef<number>(0);
  const lastSpunRoundRef = useRef<number>(-1);
  const lastSettledRoundRef = useRef<number>(-1);
  const spunRoundsRef = useRef<Set<number>>(new Set());
  const settledRoundsRef = useRef<Set<number>>(new Set());
  const isSpinningRef = useRef<boolean>(false);
  const gamePhaseRef = useRef<GamePhase>(gamePhase);
  const tickIntervalRef = useRef<any>(null);

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  // Clean unmount handler
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      if (spinWatchdogRef.current) clearTimeout(spinWatchdogRef.current);
    };
  }, []);

  const startRouletteSpin = useCallback((winningNum: number, roundNum?: number) => {
    if (isSpinningRef.current && (performance.now() - spinStartTimeRef.current < 7000)) return;
    isSpinningRef.current = true;

    if (roundNum !== undefined && roundNum > 0) {
      spunRoundsRef.current.add(roundNum);
      lastSpunRoundRef.current = roundNum;
    }

    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    if (spinWatchdogRef.current) clearTimeout(spinWatchdogRef.current);

    rouletteAudio.playBetsClosed();
    setWinBanner(null);
    setWinningNumber(null);

    const targetPocketIndex = Math.max(0, WHEEL_NUMBERS.indexOf(winningNum));
    const anglePerPocket = 360 / 37;
    const pocketCenterOffset = (targetPocketIndex + 0.5) * anglePerPocket;

    const currentWheel = (wheelRotationRef.current || 0) % 360;
    const currentBall = (ballAngleRef.current || 0) % 360;

    const extraWheelSpins = 4 * 360;
    const targetWheelEnd = currentWheel + extraWheelSpins + (Math.random() * 20);

    const finalPocketWorldAngle = targetWheelEnd + pocketCenterOffset;
    const extraBallSpins = 7 * 360;
    let targetBallEnd = finalPocketWorldAngle - extraBallSpins;
    while (targetBallEnd > currentBall) {
      targetBallEnd -= 360;
    }

    spinStartTimeRef.current = performance.now();
    spinTargetAngleRef.current = {
      wheelStart: currentWheel,
      wheelEnd: targetWheelEnd,
      ballStart: currentBall,
      ballEnd: targetBallEnd,
      pocketIdx: targetPocketIndex,
    };

    rouletteAudio.playBallRoll();
    tickIntervalRef.current = setInterval(() => {
      rouletteAudio.playWheelTick();
    }, 110);

    const spinDuration = 6000; // 6 seconds realistic smooth spin

    const animateSpin = (now: number) => {
      const elapsed = now - spinStartTimeRef.current;
      const progress = Math.min(1, elapsed / spinDuration);

      const easeOutWheel = 1 - Math.pow(1 - progress, 3);
      const curWheel = spinTargetAngleRef.current.wheelStart + (spinTargetAngleRef.current.wheelEnd - spinTargetAngleRef.current.wheelStart) * easeOutWheel;
      wheelRotationRef.current = curWheel;

      const easeOutBall = 1 - Math.pow(1 - progress, 2.5);
      const curBall = spinTargetAngleRef.current.ballStart + (spinTargetAngleRef.current.ballEnd - spinTargetAngleRef.current.ballStart) * easeOutBall;
      ballAngleRef.current = curBall;

      let radiusOffset = 0.645;
      if (progress < 0.60) {
        radiusOffset = 0.88;
      } else if (progress < 0.92) {
        const innerProgress = (progress - 0.60) / 0.32;
        const easeDrop = Math.sin((innerProgress * Math.PI) / 2);
        radiusOffset = 0.88 - easeDrop * (0.88 - 0.645);
      }
      ballRadiusOffsetRef.current = radiusOffset;

      // Draw directly on canvas for smooth 60 FPS animation
      if (canvasRef.current) {
        drawRouletteWheel(canvasRef.current, curWheel, curBall, radiusOffset, 'spinning', null);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateSpin);
      } else {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        rouletteAudio.playPocketDrop();
        const finalBallAngle = spinTargetAngleRef.current.wheelEnd + pocketCenterOffset;
        wheelRotationRef.current = spinTargetAngleRef.current.wheelEnd;
        ballAngleRef.current = finalBallAngle;
        ballRadiusOffsetRef.current = 0.645;

        setWheelRotation(spinTargetAngleRef.current.wheelEnd);
        setBallAngle(finalBallAngle);
        setBallRadiusOffset(0.645);
        setWinningNumber(winningNum);
        setGamePhase('result');
        isSpinningRef.current = false;

        if (canvasRef.current) {
          drawRouletteWheel(canvasRef.current, spinTargetAngleRef.current.wheelEnd, finalBallAngle, 0.645, 'result', winningNum);
        }
      }
    };

    // Safety watchdog: ensure state resets even if tab was backgrounded
    spinWatchdogRef.current = setTimeout(() => {
      if (isSpinningRef.current) {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        rouletteAudio.playPocketDrop();
        setWinningNumber(winningNum);
        setGamePhase('result');
        isSpinningRef.current = false;
        if (canvasRef.current) {
          drawRouletteWheel(canvasRef.current, spinTargetAngleRef.current.wheelEnd, spinTargetAngleRef.current.wheelEnd + pocketCenterOffset, 0.645, 'result', winningNum);
        }
      }
    }, 7200);

    animFrameRef.current = requestAnimationFrame(animateSpin);
  }, []);

  const handleFastSpinNow = async () => {
    if (isSpinningRef.current && (performance.now() - spinStartTimeRef.current < 7000)) return;
    try {
      showToast('Spinning the wheel now!', 'info');
      const res = await api.triggerRouletteFastSpin();
      const currentRoundId = (res && res.roundId) || Number(gameId) || 0;
      if (currentRoundId > 0 && spunRoundsRef.current.has(currentRoundId)) return;
      if (currentRoundId > 0) {
        spunRoundsRef.current.add(currentRoundId);
        lastSpunRoundRef.current = currentRoundId;
      }

      const winNum = (res && res.success && typeof res.winningNumber === 'number')
        ? res.winningNumber
        : Math.floor(Math.random() * 37);
      setGamePhase('spinning');
      startRouletteSpin(winNum, currentRoundId);
    } catch {
      const fallbackRound = Number(gameId) || 0;
      if (fallbackRound > 0 && spunRoundsRef.current.has(fallbackRound)) return;
      if (fallbackRound > 0) {
        spunRoundsRef.current.add(fallbackRound);
        lastSpunRoundRef.current = fallbackRound;
      }
      const fallbackNum = Math.floor(Math.random() * 37);
      setGamePhase('spinning');
      startRouletteSpin(fallbackNum, fallbackRound);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const syncRoulette = async () => {
      try {
        const res = await api.getRouletteLiveState();
        if (!isMounted || !res || !res.success) return;

        const serverRound = res.roundId;
        const serverPhase = res.phase;

        setRoundTimer(res.countdown);

        if (Array.isArray(res.history) && res.history.length > 0) {
          setHistory(res.history.map(h => h.number));
        }

        // Detect new round
        if (serverRound !== lastProcessedRoundRef.current) {
          lastProcessedRoundRef.current = serverRound;
          setGameId(String(serverRound));

          if (serverPhase === 'betting') {
            setUserBets({});
            setDroppedChipsMap({});
            setWinBanner(null);
            setWinningNumber(null);
            isSpinningRef.current = false;
            setGamePhase('betting');
          }
        }

        if (serverPhase === 'betting') {
          if (gamePhaseRef.current !== 'betting') {
            setGamePhase('betting');
            isSpinningRef.current = false;
          }
          if (res.countdown <= 4 && res.countdown > 1) {
            rouletteAudio.playCountdownBeep(false);
          } else if (res.countdown === 2) {
            rouletteAudio.playCountdownBeep(true);
          }
        } else if (serverPhase === 'spinning') {
          // Strictly single spin per round: ensure no double spin ever occurs
          if (!isSpinningRef.current && !spunRoundsRef.current.has(serverRound)) {
            spunRoundsRef.current.add(serverRound);
            lastSpunRoundRef.current = serverRound;
            setGamePhase('spinning');
            const winNum = typeof res.winningNumber === 'number' ? res.winningNumber : 0;
            startRouletteSpin(winNum, serverRound);
          }
        } else if (serverPhase === 'result') {
          if (!isSpinningRef.current) {
            if (gamePhaseRef.current !== 'result') {
              setGamePhase('result');
              if (typeof res.winningNumber === 'number') {
                setWinningNumber(res.winningNumber);
              }
            }
          }
        }
      } catch {
        // tolerate network glitch
      }
    };

    syncRoulette();
    const interval = setInterval(syncRoulette, 400);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [startRouletteSpin]);

  // Load user's actual roulette game history from server
  useEffect(() => {
    const userUid = user?.uid || String(user?.id || '').replace(/^u-/, '');
    if (!userUid) return;
    api.getMyBets(userUid, 'roulette').then((res: any) => {
      if (res && Array.isArray(res.bets) && res.bets.length > 0) {
        const loadedRecords: RoundRecord[] = res.bets.map((b: any) => {
          const numMatch = (b.finalResult || '').match(/\d+/);
          const winNum = numMatch ? parseInt(numMatch[0], 10) : 0;
          const isRed = RED_NUMBERS.includes(winNum);
          const isBlack = BLACK_NUMBERS.includes(winNum);
          const isGreen = winNum === 0;
          return {
            gameId: String(b.periodId || b.id),
            timestamp: b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier',
            winningNumber: winNum,
            isRed,
            isBlack,
            isGreen,
            userBetAmount: Number(b.totalAmount || 0),
            userWonAmount: Number(b.winAmount || 0),
            netProfit: b.status === 'won' ? Number((b.winAmount - b.totalAmount).toFixed(2)) : -Number(b.totalAmount || 0),
          };
        });
        setRoundHistoryRecords(prev => {
          const existingIds = new Set(prev.map(r => String(r.gameId)));
          const toAdd = loadedRecords.filter(r => !existingIds.has(String(r.gameId)));
          return [...prev, ...toAdd].slice(0, 50);
        });
      }
    }).catch(() => {});
  }, [user?.uid]);

  // =========================================================
  // EXACT SETTLEMENT LOGIC (According to Reference Bets & Payouts)
  // Strictly single result & single settlement per round
  // =========================================================
  useEffect(() => {
    if (gamePhase !== 'result' || winningNumber === null) return;
    const currentRoundNum = Number(gameId);
    if (!currentRoundNum || settledRoundsRef.current.has(currentRoundNum)) return;
    settledRoundsRef.current.add(currentRoundNum);
    lastSettledRoundRef.current = currentRoundNum;

    // Add to history strip (no duplicate latest entry)
    setHistory((prev) => {
      if (prev[0] === winningNumber) return prev;
      return [winningNumber, ...prev.slice(0, 19)];
    });

    let totalWon = 0;
    const winningBreakdown: string[] = [];

    // Calculate payouts across all user bets using the standard rules
    for (const [key, betAmt] of Object.entries(userBets)) {
      if (betAmt > 0) {
        const result = evaluateBetResult(key, winningNumber);
        if (result.won) {
          const payout = betAmt * result.multiplier;
          totalWon += payout;
          winningBreakdown.push(`${result.label} (Paid ${result.payoutRatio}): +₹${payout.toLocaleString()}`);
        }
      }
    }

    const netProfit = totalWon - totalUserBet;
    const isRed = RED_NUMBERS.includes(winningNumber);
    const isBlack = BLACK_NUMBERS.includes(winningNumber);
    const isGreen = winningNumber === 0;

    // Only record round in history list if user actually placed bets this round
    if (totalUserBet > 0) {
      const newRecord: RoundRecord = {
        gameId: String(currentRoundNum),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        winningNumber,
        isRed,
        isBlack,
        isGreen,
        userBetAmount: totalUserBet,
        userWonAmount: totalWon,
        netProfit,
      };

      setRoundHistoryRecords((prev) => {
        if (prev.some(r => String(r.gameId) === String(currentRoundNum))) return prev;
        return [newRecord, ...prev.slice(0, 49)];
      });
    }

    if (totalUserBet > 0 && user) {
      // Authoritative settlement is performed on the server (liveCasinoEngine.settleRouletteRound)
      // Refresh user to instantly sync new wallet balance and updated rolling
      refreshUser();
    }

    // Process user payout if won
    if (totalWon > 0) {
      rouletteAudio.playWin();
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.55 },
      });
      setWinBanner({ amount: totalWon, number: winningNumber, breakdown: winningBreakdown });
    }

    // Simulated other winners announcement
    const randomWinnerName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const randomWinVal = (Math.floor(Math.random() * 15) + 2) * 500;
    setWinnerTicker(`🎉 ${randomWinnerName} won ₹${randomWinVal.toLocaleString()} on #${winningNumber}!`);
  }, [gamePhase, winningNumber, gameId, totalUserBet, userBets, user, refreshUser]);

  // ==========================================
  // STATIONARY WHEEL RENDERING (NO MOVEMENT DURING COUNTDOWN)
  // The wheel stays completely still until the countdown ends
  // ==========================================
  useEffect(() => {
    if (!isSpinningRef.current && canvasRef.current) {
      drawRouletteWheel(
        canvasRef.current,
        wheelRotationRef.current,
        ballAngleRef.current,
        ballRadiusOffsetRef.current,
        gamePhaseRef.current,
        winningNumber
      );
    }
  }, [gamePhase, winningNumber]);

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col font-sans select-none pb-12">
      
      {/* 1. Top Navigation Bar */}
      <header className="px-3.5 py-2.5 flex items-center justify-between bg-[#0e131f]/95 backdrop-blur-md border-b border-amber-500/20 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1 text-zinc-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-amber-400 tracking-wider flex items-center gap-1.5">
              <span>EUROPEAN ROULETTE</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
              <span>#{gameId}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {onlinePlayersCount} Live
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rules / Payout Reference Button */}
          <button
            onClick={() => setShowPayoutModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#181f33] border border-amber-400/40 text-amber-300 text-[11px] font-bold shadow hover:bg-amber-400/10 transition active:scale-95"
            title="Bets & Payouts Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Payouts</span>
          </button>

          {/* Wallet Balance Pill */}
          <div
            onClick={onNavigateDeposit}
            className="flex items-center gap-1.5 bg-[#161c2c] border border-amber-400/50 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md cursor-pointer active:scale-95 hover:border-amber-400 transition"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>₹{(user?.walletBalance ?? 0).toFixed(2)}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-zinc-400 hover:text-amber-400 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Game Interface */}
      <div className="px-2.5 pt-2 max-w-md mx-auto w-full space-y-2 flex-1 flex flex-col justify-between">
        
        {/* 2. Top Phase Status Banner & 20s Countdown */}
        <div className="flex items-center justify-between bg-[#101524] border border-white/10 rounded-xl px-3 py-1.5 shadow-md">
          <div className="flex items-center gap-2">
            {gamePhase === 'betting' ? (
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${roundTimer <= 5 ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                <span className="text-xs font-extrabold text-white uppercase tracking-wide">
                  {roundTimer <= 5 ? 'Closing Soon' : 'Place Your Bets'}
                </span>
              </div>
            ) : gamePhase === 'spinning' ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-extrabold text-rose-300 uppercase tracking-wide">
                  Bets Closed • Spinning...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                  Winning: #{winningNumber} {winningNumber === 0 ? 'GREEN' : RED_NUMBERS.includes(winningNumber!) ? 'RED' : 'BLACK'}
                </span>
              </div>
            )}
          </div>

          {/* 20 Seconds Countdown Display */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Time:</div>
            <div
              className={`px-2.5 py-0.5 rounded-lg font-black font-mono text-sm border ${
                gamePhase === 'betting'
                  ? roundTimer <= 5
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              00:{roundTimer.toString().padStart(2, '0')}
            </div>

            {/* Stats button */}
            <button
              onClick={() => setShowStatsModal(true)}
              className="w-7 h-7 rounded-lg bg-[#181f33] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-amber-400 shadow transition active:scale-95"
              title="Statistics"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Luxury European Roulette Wheel */}
        <div className="relative flex items-center justify-center py-0.5">
          <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full p-1.5 bg-gradient-to-b from-[#111827] via-[#090d16] to-[#04060a] border-2 border-amber-500/50 shadow-[0_0_30px_rgba(0,0,0,0.95),inset_0_0_15px_rgba(234,179,8,0.15)] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={210}
              height={210}
              className="rounded-full"
            />
            <div className="absolute w-11 h-11 rounded-full bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#854d0e] border-2 border-[#713f12] shadow-xl flex flex-col items-center justify-center pointer-events-none z-20">
              {winningNumber !== null ? (
                <div className="flex flex-col items-center justify-center leading-none text-center">
                  <span className="text-[6.5px] font-black text-black uppercase tracking-wider">RESULT</span>
                  <span className="text-sm font-black font-mono text-black leading-tight">
                    {winningNumber}
                  </span>
                </div>
              ) : (
                <span className="text-xs">👑</span>
              )}
            </div>
          </div>

          {/* Win Celebration Banner Popup */}
          {winBanner && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="bg-black/95 border-2 border-amber-400 px-5 py-3 rounded-2xl shadow-[0_0_35px_rgba(234,179,8,0.7)] text-center backdrop-blur-md animate-bounce max-w-[280px]">
                <div className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider">
                  WINNING BALL #{winBanner.number}
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  +₹{winBanner.amount.toFixed(2)}
                </div>
                {winBanner.breakdown.length > 0 && (
                  <div className="text-[10px] text-zinc-300 font-medium mt-1 space-y-0.5 max-h-16 overflow-y-auto">
                    {winBanner.breakdown.map((item, idx) => (
                      <div key={idx}>{item}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Winners Ticker */}
        {winnerTicker && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1 text-center text-[10px] font-bold text-amber-300 truncate shadow-sm">
            {winnerTicker}
          </div>
        )}

        {/* Active Bet Summary Banner */}
        {totalUserBet > 0 && (
          <div className="bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 flex items-center justify-between text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <div className="text-[11px] font-black text-amber-300">
                  YOUR ACTIVE BET: ₹{totalUserBet.toFixed(2)}
                </div>
                <div className="text-[9.5px] text-zinc-300">
                  {Object.keys(userBets).length} spots placed ({Object.entries(userBets).slice(0, 3).map(([k, v]) => `${k.replace('num_', '#')}: ₹${v}`).join(', ')}{Object.keys(userBets).length > 3 ? '...' : ''})
                </div>
              </div>
            </div>
            {gamePhase === 'betting' && (
              <button
                type="button"
                onClick={handleFastSpinNow}
                disabled={isSpinningRef.current}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-black rounded-lg uppercase tracking-wider shadow active:scale-95 transition"
              >
                Spin Now
              </button>
            )}
          </div>
        )}

        {/* Sub-Navigation Tabs: [Main Table] | [Inside/Special Bets] | [History Log] */}
        <div className="flex items-center gap-1 bg-[#101524] p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveSubView('board')}
            className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition ${
              activeSubView === 'board'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Table Bets
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('inside_special')}
            className={`flex-1 py-1.5 text-[11px] font-black rounded-lg flex items-center justify-center gap-1 transition ${
              activeSubView === 'inside_special'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Street & Line</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('history')}
            className={`flex-1 py-1.5 text-[11px] font-black rounded-lg flex items-center justify-center gap-1 transition ${
              activeSubView === 'history'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HistoryIcon className="w-3 h-3" />
            <span>History Log</span>
          </button>
        </div>

        {/* 4. MAIN BETTING BOARD VIEW */}
        {activeSubView === 'board' && (
          <div className="w-full bg-[#090c14] border border-[#1f2638] rounded-xl p-1 shadow-2xl space-y-1 animate-fade-in">
            {/* Main 3x12 Grid + Zero + 2 to 1 Columns */}
            <div className="flex gap-0.5 w-full">
              {/* Green 0 Box on Left */}
              <button
                type="button"
                onClick={() => handleUserPlaceBet('num_0')}
                disabled={gamePhase !== 'betting'}
                className={`w-7 sm:w-8 shrink-0 bg-[#047857] hover:bg-[#059669] text-white font-black text-xs sm:text-sm rounded-l flex flex-col items-center justify-center relative transition active:scale-95 border border-emerald-500/40 ${
                  winningNumber === 0 ? 'ring-4 ring-amber-400 z-20 animate-pulse bg-emerald-400 text-black' : ''
                } ${userBets['num_0'] ? 'ring-2 ring-amber-300' : ''}`}
              >
                <span>0</span>
                {droppedChipsMap['num_0'] && droppedChipsMap['num_0'].length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {droppedChipsMap['num_0'].map((chip) => (
                      <CasinoChip
                        key={chip.id}
                        value={chip.value}
                        size="mini"
                        isUser={chip.isUser}
                        className="absolute"
                        style={{
                          transform: `translate(${chip.offsetX}px, ${chip.offsetY}px) rotate(${chip.rotation}deg)`,
                        }}
                      />
                    ))}
                  </div>
                )}
                {userBets['num_0'] && (
                  <div className="absolute -top-1 -right-1 bg-amber-400 text-black font-black text-[7.5px] px-1 rounded-full border border-black shadow z-30">
                    ₹{userBets['num_0']}
                  </div>
                )}
              </button>

              {/* 36 Numbers Grid in 3 rows */}
              <div className="flex-1 min-w-0 grid grid-rows-3 gap-0.5">
                {/* Row 3: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36 */}
                <div className="grid grid-cols-12 gap-0.5">
                  {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map((num) => {
                    const isRed = RED_NUMBERS.includes(num);
                    const betKey = `num_${num}`;
                    const isWinner = winningNumber === num;
                    const chips = droppedChipsMap[betKey] || [];
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleUserPlaceBet(betKey)}
                        disabled={gamePhase !== 'betting'}
                        className={`h-6 sm:h-7 text-[10px] sm:text-xs font-bold flex items-center justify-center relative transition active:scale-95 ${
                          isWinner
                            ? 'ring-4 ring-amber-400 z-20 animate-pulse bg-white text-black font-black'
                            : isRed
                            ? 'bg-[#991b1b] text-white hover:bg-red-700'
                            : 'bg-[#18181b] text-white hover:bg-zinc-800'
                        } ${userBets[betKey] ? 'ring-2 ring-amber-300 z-10' : ''}`}
                      >
                        <span>{num}</span>
                        {chips.length > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {chips.map((chip) => (
                              <CasinoChip
                                key={chip.id}
                                value={chip.value}
                                size="mini"
                                isUser={chip.isUser}
                                className="absolute"
                                style={{
                                  transform: `translate(${chip.offsetX}px, ${chip.offsetY}px) rotate(${chip.rotation}deg)`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                        {userBets[betKey] && (
                          <div className="absolute -top-1 -right-1 bg-amber-400 text-black font-black text-[7px] px-0.5 rounded-full border border-black shadow z-30">
                            {userBets[betKey]}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Row 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 */}
                <div className="grid grid-cols-12 gap-0.5">
                  {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map((num) => {
                    const isRed = RED_NUMBERS.includes(num);
                    const betKey = `num_${num}`;
                    const isWinner = winningNumber === num;
                    const chips = droppedChipsMap[betKey] || [];
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleUserPlaceBet(betKey)}
                        disabled={gamePhase !== 'betting'}
                        className={`h-6 sm:h-7 text-[10px] sm:text-xs font-bold flex items-center justify-center relative transition active:scale-95 ${
                          isWinner
                            ? 'ring-4 ring-amber-400 z-20 animate-pulse bg-white text-black font-black'
                            : isRed
                            ? 'bg-[#991b1b] text-white hover:bg-red-700'
                            : 'bg-[#18181b] text-white hover:bg-zinc-800'
                        } ${userBets[betKey] ? 'ring-2 ring-amber-300 z-10' : ''}`}
                      >
                        <span>{num}</span>
                        {chips.length > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {chips.map((chip) => (
                              <CasinoChip
                                key={chip.id}
                                value={chip.value}
                                size="mini"
                                isUser={chip.isUser}
                                className="absolute"
                                style={{
                                  transform: `translate(${chip.offsetX}px, ${chip.offsetY}px) rotate(${chip.rotation}deg)`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                        {userBets[betKey] && (
                          <div className="absolute -top-1 -right-1 bg-amber-400 text-black font-black text-[7px] px-0.5 rounded-full border border-black shadow z-30">
                            {userBets[betKey]}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Row 1: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34 */}
                <div className="grid grid-cols-12 gap-0.5">
                  {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map((num) => {
                    const isRed = RED_NUMBERS.includes(num);
                    const betKey = `num_${num}`;
                    const isWinner = winningNumber === num;
                    const chips = droppedChipsMap[betKey] || [];
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleUserPlaceBet(betKey)}
                        disabled={gamePhase !== 'betting'}
                        className={`h-6 sm:h-7 text-[10px] sm:text-xs font-bold flex items-center justify-center relative transition active:scale-95 ${
                          isWinner
                            ? 'ring-4 ring-amber-400 z-20 animate-pulse bg-white text-black font-black'
                            : isRed
                            ? 'bg-[#991b1b] text-white hover:bg-red-700'
                            : 'bg-[#18181b] text-white hover:bg-zinc-800'
                        } ${userBets[betKey] ? 'ring-2 ring-amber-300 z-10' : ''}`}
                      >
                        <span>{num}</span>
                        {chips.length > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {chips.map((chip) => (
                              <CasinoChip
                                key={chip.id}
                                value={chip.value}
                                size="mini"
                                isUser={chip.isUser}
                                className="absolute"
                                style={{
                                  transform: `translate(${chip.offsetX}px, ${chip.offsetY}px) rotate(${chip.rotation}deg)`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                        {userBets[betKey] && (
                          <div className="absolute -top-1 -right-1 bg-amber-400 text-black font-black text-[7px] px-0.5 rounded-full border border-black shadow z-30">
                            {userBets[betKey]}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2 TO 1 Column Bets on Right (Pays 2 to 1) */}
              <div className="w-8 sm:w-9 shrink-0 grid grid-rows-3 gap-0.5">
                {['col_3', 'col_2', 'col_1'].map((colKey) => {
                  const chips = droppedChipsMap[colKey] || [];
                  return (
                    <button
                      key={colKey}
                      type="button"
                      onClick={() => handleUserPlaceBet(colKey)}
                      disabled={gamePhase !== 'betting'}
                      className={`h-6 sm:h-7 bg-[#131826] hover:bg-[#1f273d] text-[8px] sm:text-[9px] font-bold text-zinc-300 rounded-r flex items-center justify-center relative border border-white/5 ${
                        userBets[colKey] ? 'ring-2 ring-amber-300' : ''
                      }`}
                    >
                      <span>2TO1</span>
                      {chips.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {chips.map((chip) => (
                            <CasinoChip
                              key={chip.id}
                              value={chip.value}
                              size="mini"
                              isUser={chip.isUser}
                              className="absolute"
                              style={{
                                transform: `translate(${chip.offsetX}px, ${chip.offsetY}px) rotate(${chip.rotation}deg)`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {userBets[colKey] && (
                        <div className="absolute -top-1 -right-1 bg-amber-400 text-black font-black text-[7px] px-0.5 rounded-full border border-black shadow z-30">
                          {userBets[colKey]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dozen Rows: 1ST 12 | 2ND 12 | 3RD 12 (Pays 2 to 1) */}
            <div className="grid grid-cols-3 gap-0.5">
              {[
                { key: 'doz_1', label: '1ST 12 (1-12)' },
                { key: 'doz_2', label: '2ND 12 (13-24)' },
                { key: 'doz_3', label: '3RD 12 (25-36)' },
              ].map(({ key, label }) => {
                const chips = droppedChipsMap[key] || [];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleUserPlaceBet(key)}
                    disabled={gamePhase !== 'betting'}
                    className={`py-1.5 bg-[#131826] hover:bg-[#1e253b] text-[9.5px] font-black text-zinc-200 uppercase tracking-wider relative border border-white/5 rounded-sm ${
                      userBets[key] ? 'ring-2 ring-amber-300' : ''
                    }`}
                  >
                    <span>{label}</span>
                    {chips.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {chips.map((chip) => (
                          <CasinoChip
                            key={chip.id}
                            value={chip.value}
                            size="mini"
                            isUser={chip.isUser}
                            className="absolute"
                            style={{
                              transform: `translate(${chip.offsetX}px, ${chip.offsetY}px) rotate(${chip.rotation}deg)`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {userBets[key] && (
                      <div className="absolute -top-1 -right-1 bg-amber-400 text-black font-black text-[7.5px] px-1 rounded-full border border-black shadow z-30">
                        ₹{userBets[key]}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Outside Bets Row: 1 TO 18 | EVEN | RED DIAMOND | BLACK DIAMOND | ODD | 19 TO 36 (Pays 1 to 1 Even Money) */}
            <div className="grid grid-cols-6 gap-0.5">
              {[
                { key: 'low', label: '1 TO 18', type: 'text' },
                { key: 'even', label: 'EVEN', type: 'text' },
                { key: 'red', label: '', type: 'red_diamond' },
                { key: 'black', label: '', type: 'black_diamond' },
                { key: 'odd', label: 'ODD', type: 'text' },
                { key: 'high', label: '19 TO 36', type: 'text' },
              ].map(({ key, label, type }) => {
                const chips = droppedChipsMap[key] || [];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleUserPlaceBet(key)}
                    disabled={gamePhase !== 'betting'}
                    className={`py-1.5 bg-[#131826] hover:bg-[#1e253b] flex items-center justify-center relative border border-white/5 rounded-sm ${
                      userBets[key] ? 'ring-2 ring-amber-300' : ''
                    }`}
                  >
                    {type === 'text' && (
                      <span className="text-[9px] font-black text-zinc-200">{label}</span>
                    )}
                    {type === 'red_diamond' && (
                      <span className="w-3.5 h-3.5 bg-[#dc2626] rotate-45 inline-block shadow-sm" />
                    )}
                    {type === 'black_diamond' && (
                      <span className="w-3.5 h-3.5 bg-[#18181b] border border-zinc-700 rotate-45 inline-block shadow-sm" />
                    )}

                    {chips.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {chips.map((chip) => (
                          <CasinoChip
                            key={chip.id}
                            value={chip.value}
                            size="mini"
                            isUser={chip.isUser}
                            className="absolute"
                            style={{
                              transform: `translate(${chip.offsetX}px, ${chip.offsetY}px) rotate(${chip.rotation}deg)`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {userBets[key] && (
                      <div className="absolute -top-1 -right-1 bg-amber-400 text-black font-black text-[7.5px] px-1 rounded-full border border-black shadow z-30">
                        ₹{userBets[key]}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4B. INSIDE & SPECIAL BETS (Street, Line, Basket/Corner) */}
        {activeSubView === 'inside_special' && (
          <div className="w-full bg-[#090c14] border border-[#1f2638] rounded-xl p-3 shadow-2xl space-y-3 animate-fade-in">
            {/* Basket / Five Number Bet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span>Five / Basket Bet (Pays 6 to 1)</span>
                <span className="text-amber-400 text-[10px]">Covers: 0, 1, 2, 3</span>
              </div>
              <button
                type="button"
                onClick={() => handleUserPlaceBet('five_basket')}
                disabled={gamePhase !== 'betting'}
                className={`w-full py-2 px-3 rounded-lg bg-[#141b2c] border border-amber-400/30 flex items-center justify-between transition active:scale-98 ${
                  userBets['five_basket'] ? 'ring-2 ring-amber-300' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-[9px] font-black flex items-center justify-center">0</span>
                  <span className="text-xs font-bold text-zinc-100">0 - 1 - 2 - 3</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-extrabold">6:1 Payout</span>
                  {userBets['five_basket'] && (
                    <span className="bg-amber-400 text-black font-black text-[10px] px-1.5 py-0.5 rounded-full shadow">
                      ₹{userBets['five_basket']}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Street Bets (Row of 3, Pays 11 to 1) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span>Street Bets (Pays 11 to 1)</span>
                <span className="text-amber-400 text-[10px]">3 Consecutive Numbers</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'street_1', label: '1 - 2 - 3' },
                  { key: 'street_4', label: '4 - 5 - 6' },
                  { key: 'street_7', label: '7 - 8 - 9' },
                  { key: 'street_10', label: '10 - 11 - 12' },
                  { key: 'street_13', label: '13 - 14 - 15' },
                  { key: 'street_16', label: '16 - 17 - 18' },
                  { key: 'street_19', label: '19 - 20 - 21' },
                  { key: 'street_22', label: '22 - 23 - 24' },
                  { key: 'street_25', label: '25 - 26 - 27' },
                  { key: 'street_28', label: '28 - 29 - 30' },
                  { key: 'street_31', label: '31 - 32 - 33' },
                  { key: 'street_34', label: '34 - 35 - 36' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleUserPlaceBet(key)}
                    disabled={gamePhase !== 'betting'}
                    className={`py-1.5 px-2 rounded-lg bg-[#141b2c] border border-white/10 flex items-center justify-between text-[10px] font-bold text-zinc-200 hover:bg-[#1f2840] transition active:scale-95 ${
                      userBets[key] ? 'ring-2 ring-amber-300 bg-amber-950/40' : ''
                    }`}
                  >
                    <span>{label}</span>
                    {userBets[key] ? (
                      <span className="bg-amber-400 text-black font-black text-[8px] px-1 rounded-full">
                        ₹{userBets[key]}
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[8px]">11:1</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Six Line Bets (2 Rows / 6 Numbers, Pays 5 to 1) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span>Six Line Bets (Pays 5 to 1)</span>
                <span className="text-amber-400 text-[10px]">6 Numbers in Double Street</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'line_1', label: 'Line (1 - 6)' },
                  { key: 'line_7', label: 'Line (7 - 12)' },
                  { key: 'line_13', label: 'Line (13 - 18)' },
                  { key: 'line_19', label: 'Line (19 - 24)' },
                  { key: 'line_25', label: 'Line (25 - 30)' },
                  { key: 'line_31', label: 'Line (31 - 36)' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleUserPlaceBet(key)}
                    disabled={gamePhase !== 'betting'}
                    className={`py-1.5 px-2.5 rounded-lg bg-[#141b2c] border border-white/10 flex items-center justify-between text-[10px] font-bold text-zinc-200 hover:bg-[#1f2840] transition active:scale-95 ${
                      userBets[key] ? 'ring-2 ring-amber-300 bg-amber-950/40' : ''
                    }`}
                  >
                    <span>{label}</span>
                    {userBets[key] ? (
                      <span className="bg-amber-400 text-black font-black text-[8px] px-1 rounded-full">
                        ₹{userBets[key]}
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[8px]">5:1</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4C. DEDICATED HISTORY LOG VIEW */}
        {activeSubView === 'history' && (
          <div className="w-full bg-[#090c14] border border-[#1f2638] rounded-xl p-3 shadow-2xl space-y-2.5 max-h-72 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <HistoryIcon className="w-3.5 h-3.5" />
                <span>Rounds & My Bet History</span>
              </span>
              <span className="text-[10px] text-zinc-400">Past Rounds</span>
            </div>

            <div className="space-y-1.5">
              {roundHistoryRecords.map((rec, idx) => {
                const bgClass = rec.isGreen ? 'bg-[#059669]' : rec.isRed ? 'bg-[#dc2626]' : 'bg-[#18181b] border border-zinc-600';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#121727] border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${bgClass} text-white font-black text-xs flex items-center justify-center shadow-md`}>
                        {rec.winningNumber}
                      </div>
                      <div>
                        <div className="font-mono text-[11px] text-zinc-300 font-bold">
                          Round #{rec.gameId}
                        </div>
                        <div className="text-[9px] text-zinc-400">
                          {rec.isGreen ? 'Green (0)' : rec.isRed ? 'Red' : 'Black'} • {rec.timestamp}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {rec.userBetAmount > 0 ? (
                        <div>
                          <div className={`font-mono font-black text-xs ${rec.netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {rec.netProfit > 0 ? `+₹${rec.netProfit.toLocaleString()}` : `-₹${rec.userBetAmount.toLocaleString()}`}
                          </div>
                          <div className="text-[9px] text-zinc-400">
                            Bet: ₹{rec.userBetAmount} {rec.userWonAmount > 0 ? `(Won ₹${rec.userWonAmount})` : '(No Win)'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-500 italic">No Bet Placed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Authentic 3D Chips Selector Row */}
        <div className="flex items-center justify-between px-1 bg-[#101524] p-1.5 rounded-xl border border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {CHIP_VALUES.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setSelectedChip(val);
                  rouletteAudio.playChip();
                }}
                className={`transition transform active:scale-95 relative ${
                  selectedChip === val
                    ? 'scale-115 -translate-y-1 ring-2 ring-amber-400 rounded-full'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                <CasinoChip value={val} size="md" />
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const nextIndex = (CHIP_VALUES.indexOf(selectedChip) + 1) % CHIP_VALUES.length;
              setSelectedChip(CHIP_VALUES[nextIndex]);
              rouletteAudio.playChip();
            }}
            className="w-8 h-8 rounded-full bg-[#181d2c] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white shrink-0 ml-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 6. Clean Total Bet & Action Controls */}
        <div className="flex items-center justify-between bg-[#0e1320] border border-white/10 rounded-xl px-3 py-2 shadow-md gap-2">
          <div className="shrink-0">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Current Bet</div>
            <div className="text-sm font-black text-amber-400 font-mono mt-0.5">
              ₹{totalUserBet.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalUserBet > 0 && gamePhase === 'betting' && (
              <button
                type="button"
                onClick={() => {
                  setUserBets({});
                  setDroppedChipsMap({});
                  showToast('Bets cleared for this round', 'info');
                }}
                className="px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition active:scale-95"
              >
                Clear
              </button>
            )}

            {/* Real-time automated round status badge (Automatic Spin on Timer) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141b2c] border border-amber-400/30 text-xs font-bold select-none">
              {gamePhase === 'betting' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="text-zinc-300">Auto Spin in <span className="font-mono text-amber-400 font-black">{roundTimer}s</span></span>
                </>
              ) : gamePhase === 'spinning' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-300 font-black tracking-wide">Wheel Spinning...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-black">Winning Pocket #{winningNumber ?? 0}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/10">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold hidden sm:inline">
                Chip:
              </span>
              <CasinoChip value={selectedChip} size="sm" />
            </div>
          </div>
        </div>

        {/* 7. Bottom Winning History Strip */}
        <div className="flex items-center gap-2 bg-[#0e1320] border border-white/10 rounded-xl p-2 overflow-x-auto">
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 shrink-0 pr-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>History</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {history.map((num, i) => {
              const isRed = RED_NUMBERS.includes(num);
              const isGreen = num === 0;
              const bgClass = isGreen ? 'bg-[#059669]' : isRed ? 'bg-[#dc2626]' : 'bg-[#18181b] border border-zinc-700';

              return (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full ${bgClass} text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-md ${
                    i === 0 ? 'ring-2 ring-amber-400 scale-110' : ''
                  }`}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 8. ROULETTE BETS & PAYOUTS REFERENCE MODAL (Exact match with reference chart) */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101422] border border-amber-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base text-amber-400 tracking-wide">
                  Roulette Bets & Payouts
                </h3>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {ROULETTE_PAYOUT_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className="p-2.5 rounded-xl bg-[#171d30] border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] flex items-center justify-center shrink-0 font-black">
                        {rule.id}
                      </span>
                      <span className="truncate">{rule.title}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 pl-5.5">{rule.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/40 text-amber-300 font-black font-mono text-[11px]">
                      {rule.payout}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPayoutModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs shadow-md active:scale-98 transition"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* 9. Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121624] border border-amber-500/30 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-base text-amber-400 flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                <span>Roulette Statistics</span>
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-[#181e30] rounded-xl border border-red-500/30">
                <div className="text-red-400 font-extrabold text-lg">48.6%</div>
                <div className="text-[10px] text-zinc-400 mt-1 font-bold">RED</div>
              </div>
              <div className="p-3 bg-[#181e30] rounded-xl border border-zinc-600/30">
                <div className="text-zinc-200 font-extrabold text-lg">48.6%</div>
                <div className="text-[10px] text-zinc-400 mt-1 font-bold">BLACK</div>
              </div>
              <div className="p-3 bg-[#181e30] rounded-xl border border-emerald-500/30">
                <div className="text-emerald-400 font-extrabold text-lg">2.8%</div>
                <div className="text-[10px] text-zinc-400 mt-1 font-bold">ZERO (0)</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Hot Numbers (High Frequency)</span>
              </div>
              <div className="flex gap-2">
                {[17, 33, 7, 21, 0].map((n) => (
                  <div key={n} className="w-8 h-8 rounded-full bg-red-600/80 border border-red-400 flex items-center justify-center font-bold text-xs shadow">
                    {n}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>Cold Numbers</span>
              </div>
              <div className="flex gap-2">
                {[4, 11, 28, 35, 2].map((n) => (
                  <div key={n} className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center font-bold text-xs shadow">
                    {n}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowStatsModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs shadow-md active:scale-98 transition"
            >
              Back To Game
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
