import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { plinkoAudio } from '../../utils/plinkoAudio.js';
import confetti from 'canvas-confetti';
import {
  ChevronDown, HelpCircle, RotateCcw, Volume2, VolumeX,
  Plus, Minus, ArrowLeft, Menu, Coins, History
} from 'lucide-react';

interface UserPlinkoGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
}

interface ActiveBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  bet: number;
  colorType: 'green' | 'yellow' | 'red';
  settled: boolean;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
  hitTimer: number;
}

// Multiplier configurations matching exact mobile screenshots for 12, 14, and 16 pins
const PIN_CONFIGS: Record<number, {
  slots: number;
  green: number[];
  yellow: number[];
  red: number[];
}> = {
  12: {
    slots: 13,
    green: [11, 3.2, 1.6, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.6, 3.2, 11],
    yellow: [25, 8, 3.1, 1.7, 1.2, 0.7, 0.3, 0.7, 1.2, 1.7, 3.1, 8, 25],
    red: [141, 25, 8.1, 2.3, 0.7, 0.2, 0, 0.2, 0.7, 2.3, 8.1, 25, 141],
  },
  14: {
    slots: 15,
    green: [18, 3.2, 1.6, 1.3, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.3, 1.6, 3.2, 18],
    yellow: [55, 12, 5.6, 3.2, 1.6, 1, 0.7, 0.2, 0.7, 1, 1.6, 3.2, 5.6, 12, 55],
    red: [353, 49, 14, 5.3, 2.1, 0.5, 0.2, 0, 0.2, 0.5, 2.1, 5.3, 14, 49, 353],
  },
  16: {
    slots: 17,
    green: [35, 7.7, 2.5, 1.6, 1.3, 1.2, 1.1, 1, 0.4, 1, 1.1, 1.2, 1.3, 1.6, 2.5, 7.7, 35],
    yellow: [118, 61, 12, 4.5, 2.3, 1.2, 1, 0.7, 0.2, 0.7, 1, 1.2, 2.3, 4.5, 12, 61, 118],
    red: [555, 122, 26, 8.5, 3.5, 2, 0.5, 0.2, 0, 0.2, 0.5, 2, 3.5, 8.5, 26, 122, 555],
  },
};

// Responsive Board Dimensions Calculator - Large, high-visibility layout
const getBoardDimensions = (pins: number) => {
  const width = 380;
  if (pins === 12) {
    return {
      width,
      height: 290,
      pinGap: 24.5,
      rowGap: 21.5,
      startY: 12,
      pegRadius: 3.6,
      ballRadius: 5.5,
      slots: 13,
    };
  } else if (pins === 16) {
    return {
      width,
      height: 345,
      pinGap: 19.8,
      rowGap: 19.2,
      startY: 10,
      pegRadius: 3.0,
      ballRadius: 4.5,
      slots: 17,
    };
  } else {
    // Default Pins 14
    return {
      width,
      height: 320,
      pinGap: 21.8,
      rowGap: 20.2,
      startY: 10,
      pegRadius: 3.3,
      ballRadius: 5.0,
      slots: 15,
    };
  }
};

export const UserPlinkoGameView: React.FC<UserPlinkoGameViewProps> = ({
  onBack,
  onNavigateDeposit,
}) => {
  const { user, refreshUser, showToast } = useAuth();

  // Sound Settings
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Pin Configuration: 12, 14, 16
  const [pinCount, setPinCount] = useState<number>(14);
  const [showPinsDropdown, setShowPinsDropdown] = useState<boolean>(false);

  // Betting & Settings
  const [betAmount, setBetAmount] = useState<number>(10);
  const [selectedColor, setSelectedColor] = useState<'green' | 'yellow' | 'red'>('yellow');
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showChipsPreset, setShowChipsPreset] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [recentDrops, setRecentDrops] = useState<Array<{ id: number; color: string; mult: number; amount: number }>>([]);

  // Highlight effect for hit slots
  const [highlightedSlot, setHighlightedSlot] = useState<{ color: 'green' | 'yellow' | 'red'; index: number } | null>(null);

  // Win Toast Float Overlay
  const [winToast, setWinToast] = useState<{ mult: number; amount: number; color: string } | null>(null);

  // Canvas & Physics references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<ActiveBall[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const autoPlayIntervalRef = useRef<any>(null);

  // Sync Audio Mute
  useEffect(() => {
    plinkoAudio.setMuted(isMuted);
  }, [isMuted]);

  // Current Board Dimensions & Multipliers
  const dims = getBoardDimensions(pinCount);
  const currentConfig = PIN_CONFIGS[pinCount] || PIN_CONFIGS[14];

  // Initialize Pins Grid dynamically based on selected pinCount (12, 14, or 16 rows)
  const initPegs = (pins: number) => {
    const board = getBoardDimensions(pins);
    const { width, pinGap, rowGap, startY, pegRadius } = board;
    const centerX = width / 2;
    const pegs: Peg[] = [];

    for (let r = 0; r < pins; r++) {
      const pinsInRow = r + 3; // Top row: 3 pins, bottom row: pins + 2 pins
      const y = startY + r * rowGap;
      for (let c = 0; c < pinsInRow; c++) {
        const x = centerX + (c - (pinsInRow - 1) / 2) * pinGap;
        pegs.push({
          x,
          y,
          radius: pegRadius,
          hitTimer: 0,
        });
      }
    }
    pegsRef.current = pegs;
  };

  // Re-initialize pegs whenever pinCount changes
  useEffect(() => {
    initPegs(pinCount);
    ballsRef.current = [];
    setHighlightedSlot(null);
  }, [pinCount]);

  // Drop a Single Plinko Ball for a specific Color mode
  const handleDropBall = (colorType: 'green' | 'yellow' | 'red') => {
    setSelectedColor(colorType);
    const balance = user?.walletBalance ?? 0;

    if (betAmount <= 0) {
      showToast('Please enter a valid bet amount', 'error');
      return;
    }

    if (betAmount > balance) {
      showToast('Insufficient wallet balance to drop ball', 'error');
      if (isAutoPlay) setIsAutoPlay(false);
      return;
    }

    // Deduct bet amount immediately per ball
    if (user) {
      try {
        api.updateWalletBalance(user.uid, -betAmount, 'bet', `Plinko ${colorType.toUpperCase()} Ball (${pinCount} Pins)`);
        refreshUser();
      } catch (err) {
        console.error('Wallet deduction error:', err);
      }
    }

    plinkoAudio.playDropLaunch();

    // Drop exactly from top center within funnel entrance
    const currentDims = getBoardDimensions(pinCount);
    const centerX = currentDims.width / 2;
    const newBall: ActiveBall = {
      id: Date.now() + Math.random(),
      x: centerX + (Math.random() * (currentDims.pinGap * 0.5) - currentDims.pinGap * 0.25),
      y: Math.max(0, currentDims.startY - 10),
      vx: (Math.random() - 0.5) * 0.35,
      vy: 1.3,
      radius: currentDims.ballRadius,
      bet: betAmount,
      colorType,
      settled: false,
    };

    ballsRef.current.push(newBall);
  };

  // Auto-play Continuous Drop
  useEffect(() => {
    if (isAutoPlay) {
      handleDropBall(selectedColor);
      autoPlayIntervalRef.current = setInterval(() => {
        handleDropBall(selectedColor);
      }, 650);
    } else {
      if (autoPlayIntervalRef.current) clearInterval(autoPlayIntervalRef.current);
    }
    return () => {
      if (autoPlayIntervalRef.current) clearInterval(autoPlayIntervalRef.current);
    };
  }, [isAutoPlay, selectedColor, betAmount, pinCount]);

  // Main 60FPS Physics Simulation & Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    initPegs(pinCount);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const boardDims = getBoardDimensions(pinCount);
      const { width, height, pinGap, rowGap, startY, slots } = boardDims;
      const centerX = width / 2;
      const bottomY = startY + (pinCount - 1) * rowGap;

      // Exact mathematical multiplier slot dimensions & boundaries
      const totalSlotWidth = slots * pinGap;
      const leftSlotEdge = centerX - totalSlotWidth / 2;
      const rightSlotEdge = centerX + totalSlotWidth / 2;

      // Top funnel entrance (around top 3 pins)
      const topEntranceLeft = centerX - pinGap * 1.25;
      const topEntranceRight = centerX + pinGap * 1.25;
      const topBoundaryY = Math.max(2, startY - 6);
      const bottomBoundaryY = bottomY + rowGap * 0.45;
      const outerMarginX = 8;

      // 1. Draw Left & Right Dashed Triangle Boundaries (Mathematically aligned to bottom slots)
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;

      // Left Funnel Enclosure (Connects top entrance precisely to outer-left of Slot 0)
      ctx.beginPath();
      ctx.moveTo(outerMarginX, topBoundaryY);
      ctx.lineTo(topEntranceLeft, topBoundaryY);
      ctx.lineTo(leftSlotEdge, bottomBoundaryY);
      ctx.lineTo(outerMarginX, bottomBoundaryY);
      ctx.closePath();
      ctx.stroke();

      // Right Funnel Enclosure (Connects top entrance precisely to outer-right of Slot N-1)
      ctx.beginPath();
      ctx.moveTo(width - outerMarginX, topBoundaryY);
      ctx.lineTo(topEntranceRight, topBoundaryY);
      ctx.lineTo(rightSlotEdge, bottomBoundaryY);
      ctx.lineTo(width - outerMarginX, bottomBoundaryY);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // 2. Draw Pins
      pegsRef.current.forEach((peg) => {
        ctx.save();
        if (peg.hitTimer > 0) {
          peg.hitTimer -= 1;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.35)';
          ctx.shadowBlur = 2;
          ctx.fillStyle = '#f8fafc';
        }
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Update & Draw Active Falling Balls
      const gravity = 0.23;
      const restitution = 0.52; // realistic elastic bounce
      const landY = bottomBoundaryY;

      ballsRef.current.forEach((ball) => {
        if (ball.settled) return;

        // Apply Gravity
        ball.vy += gravity;
        // Subtle natural centering pull to ensure house edge distribution
        const distFromCenter = ball.x - centerX;
        ball.vx -= distFromCenter * 0.0006;

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Funnel boundary collisions (Prevent ball from ever going outside the numbered multiplier slots)
        if (ball.y >= topBoundaryY && ball.y <= bottomBoundaryY + 12) {
          const progress = Math.max(0, Math.min(1, (ball.y - topBoundaryY) / (bottomBoundaryY - topBoundaryY)));
          const currentLeftLimit = topEntranceLeft + progress * (leftSlotEdge - topEntranceLeft);
          const currentRightLimit = topEntranceRight + progress * (rightSlotEdge - topEntranceRight);

          if (ball.x - ball.radius < currentLeftLimit) {
            ball.x = currentLeftLimit + ball.radius;
            ball.vx = Math.abs(ball.vx) * restitution + 0.35;
            plinkoAudio.playPegHit();
          } else if (ball.x + ball.radius > currentRightLimit) {
            ball.x = currentRightLimit - ball.radius;
            ball.vx = -Math.abs(ball.vx) * restitution - 0.35;
            plinkoAudio.playPegHit();
          }
        } else {
          // Outside funnel height
          if (ball.x - ball.radius < outerMarginX) {
            ball.x = outerMarginX + ball.radius;
            ball.vx = Math.abs(ball.vx) * restitution + 0.3;
          } else if (ball.x + ball.radius > width - outerMarginX) {
            ball.x = width - outerMarginX - ball.radius;
            ball.vx = -Math.abs(ball.vx) * restitution - 0.3;
          }
        }

        // Peg Collisions
        pegsRef.current.forEach((peg) => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = ball.radius + peg.radius;

          if (dist < minDist) {
            const angle = Math.atan2(dy, dx);
            ball.x = peg.x + Math.cos(angle) * minDist;
            ball.y = peg.y + Math.sin(angle) * minDist;

            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            const dot = ball.vx * normalX + ball.vy * normalY;

            ball.vx = (ball.vx - 2 * dot * normalX) * restitution + (Math.random() - 0.5) * 0.35;
            ball.vy = (ball.vy - 2 * dot * normalY) * restitution + 0.08;

            peg.hitTimer = 7;
            plinkoAudio.playPegHit();
          }
        });

        // Landed at bottom slot
        if (ball.y >= landY && !ball.settled) {
          ball.settled = true;

          // Exact mathematical slot index within [0, slots - 1]:
          const rawIndex = Math.floor((ball.x - leftSlotEdge) / pinGap);
          const slotIndex = Math.max(0, Math.min(slots - 1, rawIndex));

          const multiplierRow = currentConfig[ball.colorType];
          const mult = multiplierRow[slotIndex] ?? 0.2;
          const winAmount = ball.bet * mult;

          setHighlightedSlot({ color: ball.colorType, index: slotIndex });
          setTimeout(() => setHighlightedSlot(null), 1000);

          plinkoAudio.playBucketLand(mult);

          // Recent drops log
          setRecentDrops((prev) => [
            { id: Date.now(), color: ball.colorType, mult, amount: winAmount },
            ...prev.slice(0, 9),
          ]);

          // Celebration for big wins (≥5x)
          if (mult >= 5) {
            confetti({
              particleCount: 75,
              spread: 65,
              origin: { y: 0.65 },
            });
          }

          setWinToast({
            mult,
            amount: winAmount,
            color: ball.colorType,
          });
          setTimeout(() => setWinToast(null), 2400);

          // Credit win to wallet (if > 0)
          if (user && winAmount > 0) {
            api.updateWalletBalance(
              user.uid,
              winAmount,
              'win',
              `Plinko ${ball.colorType.toUpperCase()} ${mult}x Win`
            ).then(() => {
              refreshUser();
            });
          }
        }

        // Draw Ball
        if (!ball.settled) {
          ctx.save();
          let ballColor = '#facc15';
          let shadowColor = 'rgba(250, 204, 21, 0.6)';

          if (ball.colorType === 'green') {
            ballColor = '#22c55e';
            shadowColor = 'rgba(34, 197, 94, 0.7)';
          } else if (ball.colorType === 'red') {
            ballColor = '#ef4444';
            shadowColor = 'rgba(239, 68, 68, 0.7)';
          }

          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = 8;
          ctx.fillStyle = ballColor;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fill();

          // Ball highlight reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.beginPath();
          ctx.arc(ball.x - 1, ball.y - 1, ball.radius * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Filter out finished balls
      ballsRef.current = ballsRef.current.filter((b) => !b.settled);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [user, pinCount, currentConfig]);

  return (
    <div className="fixed inset-0 h-[100dvh] w-full max-w-md mx-auto overflow-hidden bg-gradient-to-b from-[#005a70] via-[#006e88] to-[#004e63] text-white flex flex-col justify-between font-sans select-none p-2 z-40">
      
      {/* 1. TOP BAR: [Pins: 12/14/16 dropdown] on Left, [History/Reset] on Right */}
      <div className="w-full flex items-center justify-between relative z-40 px-1 shrink-0">
        
        {/* Left: Pins Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPinsDropdown(!showPinsDropdown)}
            className="h-7 px-3 rounded-xl bg-[#004b5c] hover:bg-[#003e4c] border border-[#008ba8]/60 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <span>Pins: {pinCount}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-teal-300 transition-transform ${showPinsDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown 12, 14, 16 (Exact matching screenshot 1) */}
          {showPinsDropdown && (
            <div className="absolute top-9 left-0 z-50 w-28 bg-[#003845] border border-[#007b99] rounded-xl p-1.5 shadow-2xl space-y-1 backdrop-blur-md">
              {[12, 14, 16].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPinCount(p);
                    setShowPinsDropdown(false);
                  }}
                  className={`w-full py-1 rounded-lg text-center font-extrabold text-xs transition ${
                    pinCount === p
                      ? 'bg-[#007b99] text-white shadow-inner'
                      : 'bg-[#004b5c] text-teal-100 hover:bg-[#005e73]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: History / Reset Top Pill */}
        <div className="flex items-center gap-1.5">
          <div className="h-7 px-2.5 rounded-xl bg-[#004b5c]/80 border border-[#008ba8]/50 flex items-center gap-1 text-teal-200">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="hover:text-white flex items-center gap-0.5 text-[11px] font-bold"
              title="Recent Rounds"
            >
              <History className="w-3.5 h-3.5" />
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
          </div>
        </div>

      </div>

      {/* 2. MAIN PEGBOARD & MULTIPLIERS */}
      <div className="w-full flex-1 flex flex-col justify-start items-center relative pt-0 pb-0.5 min-h-0 overflow-hidden">
        
        {/* Plinko Canvas (Large & positioned directly under top bar) */}
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          className="w-full max-w-[390px] h-auto max-h-[50vh] block relative z-10"
        />

        {/* 3 Color Multiplier Rows (GREEN, YELLOW, RED) */}
        <div
          className="space-y-0.5 px-0.5 relative z-20 mt-0.5 shrink-0"
          style={{ width: `${dims.slots * dims.pinGap}px`, maxWidth: '99%' }}
        >
          {/* Row 1: GREEN */}
          <div
            className="w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${dims.slots}, minmax(0, 1fr))`,
              gap: '1.5px',
            }}
          >
            {currentConfig.green.map((val, idx) => {
              const isHit = highlightedSlot?.color === 'green' && highlightedSlot.index === idx;
              return (
                <div
                  key={`g-${idx}`}
                  className={`rounded-[4px] text-center font-black leading-tight transition-all flex items-center justify-center font-mono ${
                    pinCount === 16 ? 'text-[7px] py-0.5' : pinCount === 12 ? 'text-[9.5px] py-1' : 'text-[8.5px] py-0.5'
                  } ${
                    isHit
                      ? 'bg-white text-black scale-125 z-30 shadow-[0_0_12px_rgba(255,255,255,0.95)] ring-2 ring-[#22c55e]'
                      : 'bg-[#5cb85c] text-black border border-[#4cae4c]/80 shadow-xs'
                  }`}
                >
                  <span className="truncate">{val}</span>
                </div>
              );
            })}
          </div>

          {/* Row 2: YELLOW */}
          <div
            className="w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${dims.slots}, minmax(0, 1fr))`,
              gap: '1.5px',
            }}
          >
            {currentConfig.yellow.map((val, idx) => {
              const isHit = highlightedSlot?.color === 'yellow' && highlightedSlot.index === idx;
              return (
                <div
                  key={`y-${idx}`}
                  className={`rounded-[4px] text-center font-black leading-tight transition-all flex items-center justify-center font-mono ${
                    pinCount === 16 ? 'text-[7px] py-0.5' : pinCount === 12 ? 'text-[9.5px] py-1' : 'text-[8.5px] py-0.5'
                  } ${
                    isHit
                      ? 'bg-white text-black scale-125 z-30 shadow-[0_0_12px_rgba(255,255,255,0.95)] ring-2 ring-[#eab308]'
                      : 'bg-[#f0ad4e] text-black border border-[#eea236]/80 shadow-xs'
                  }`}
                >
                  <span className="truncate">{val}</span>
                </div>
              );
            })}
          </div>

          {/* Row 3: RED */}
          <div
            className="w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${dims.slots}, minmax(0, 1fr))`,
              gap: '1.5px',
            }}
          >
            {currentConfig.red.map((val, idx) => {
              const isHit = highlightedSlot?.color === 'red' && highlightedSlot.index === idx;
              return (
                <div
                  key={`r-${idx}`}
                  className={`rounded-[4px] text-center font-black leading-tight transition-all flex items-center justify-center font-mono ${
                    pinCount === 16 ? 'text-[7px] py-0.5' : pinCount === 12 ? 'text-[9.5px] py-1' : 'text-[8.5px] py-0.5'
                  } ${
                    isHit
                      ? 'bg-white text-black scale-125 z-30 shadow-[0_0_12px_rgba(255,255,255,0.95)] ring-2 ring-[#ef4444]'
                      : 'bg-[#d9534f] text-white border border-[#d43f3a]/80 shadow-xs'
                  }`}
                >
                  <span className="truncate">{val}</span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Float Win Toast Banner */}
        {winToast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-bounce">
            <div className="bg-[#002f3b]/95 border-2 border-amber-400 px-3 py-1.5 rounded-2xl text-center shadow-2xl backdrop-blur-md">
              <div className="text-[9px] uppercase font-black text-amber-300">
                {winToast.color.toUpperCase()} BALL HIT
              </div>
              <div className="text-sm font-black text-white">
                {winToast.mult}x · ₹{winToast.amount.toFixed(2)}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 3. BOTTOM CONTROL CARD (Compact, Fits perfectly on all mobile viewports without scrolling) */}
      <div className="w-full max-w-[390px] mx-auto bg-[#004859]/90 border border-[#006e88] rounded-2xl p-2 shadow-2xl space-y-1.5 backdrop-blur-sm z-30 shrink-0">
        
        {/* Row 1: [Auto Button] [GREEN] [YELLOW] [RED] */}
        <div className="grid grid-cols-4 gap-1.5 items-center">
          
          {/* Blue Circular Auto-Play Button */}
          <button
            type="button"
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center transition active:scale-95 shadow-[0_4px_12px_rgba(2,132,199,0.5)] border ${
              isAutoPlay
                ? 'bg-rose-600 text-white border-rose-300 animate-spin'
                : 'bg-gradient-to-b from-[#0284c7] to-[#0369a1] text-white border-sky-300'
            }`}
            title={isAutoPlay ? 'Stop Auto Drop' : 'Auto Drop Balls'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* GREEN Button */}
          <button
            type="button"
            onClick={() => handleDropBall('green')}
            className="h-9 rounded-xl bg-gradient-to-b from-[#4ade80] to-[#15803d] hover:brightness-110 active:scale-95 text-white font-black text-[11px] uppercase tracking-wider shadow-[0_3px_10px_rgba(22,163,74,0.45)] border border-green-300 flex items-center justify-center"
          >
            GREEN
          </button>

          {/* YELLOW Button */}
          <button
            type="button"
            onClick={() => handleDropBall('yellow')}
            className="h-9 rounded-xl bg-gradient-to-b from-[#fde047] to-[#ca8a04] hover:brightness-110 active:scale-95 text-black font-black text-[11px] uppercase tracking-wider shadow-[0_3px_10px_rgba(202,138,4,0.45)] border border-yellow-200 flex items-center justify-center"
          >
            YELLOW
          </button>

          {/* RED Button */}
          <button
            type="button"
            onClick={() => handleDropBall('red')}
            className="h-9 rounded-xl bg-gradient-to-b from-[#f87171] to-[#b91c1c] hover:brightness-110 active:scale-95 text-white font-black text-[11px] uppercase tracking-wider shadow-[0_3px_10px_rgba(220,38,38,0.45)] border border-red-300 flex items-center justify-center"
          >
            RED
          </button>
        </div>

        {/* Row 2: [Bet INR (with -, coins stack, +)] */}
        <div className="bg-[#003845] border border-[#006e88] rounded-xl px-2.5 py-1 flex items-center justify-between shadow-inner relative">
          
          <div>
            <div className="text-[9px] font-extrabold uppercase text-teal-300">
              Bet INR
            </div>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(0.1, parseFloat(e.target.value) || 0))}
              className="w-16 bg-transparent font-black text-sm text-white font-mono outline-none"
            />
          </div>

          {/* Stepper Buttons [-] [Coins] [+] */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBetAmount((prev) => Math.max(0.2, prev > 10 ? prev - 10 : prev / 2))}
              className="w-7 h-7 rounded-full bg-[#004e63] hover:bg-[#005e78] border border-[#007b99] text-white flex items-center justify-center active:scale-95 shadow"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Chips Preset Modal Toggle */}
            <button
              type="button"
              onClick={() => setShowChipsPreset(!showChipsPreset)}
              className="w-7 h-7 rounded-full bg-[#004e63] hover:bg-[#005e78] border border-[#007b99] text-teal-200 flex items-center justify-center active:scale-95 shadow"
              title="Quick Bet Presets"
            >
              <Coins className="w-3.5 h-3.5 text-teal-300" />
            </button>

            <button
              type="button"
              onClick={() => setBetAmount((prev) => prev + 10)}
              className="w-7 h-7 rounded-full bg-[#004e63] hover:bg-[#005e78] border border-[#007b99] text-white flex items-center justify-center active:scale-95 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Preset Floating Tray */}
          {showChipsPreset && (
            <div className="absolute -top-11 left-0 right-0 bg-[#002f3b] border border-teal-500/50 rounded-xl p-1 flex items-center justify-around shadow-2xl z-40 animate-in fade-in">
              {[0.20, 1, 5, 10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setBetAmount(val);
                    setShowChipsPreset(false);
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#004859] hover:bg-amber-500 hover:text-black text-white font-bold text-[9px] transition"
                >
                  ₹{val}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Row 3 (Bottom Navigation / Info Bar): [PLINKO ˅] [(?)] [0.00 INR] [≡] */}
        <div className="flex items-center justify-between gap-1">
          
          {/* Left: PLINKO ˅ Dropdown Pill (Click to Go Back or switch game) */}
          <button
            type="button"
            onClick={onBack}
            className="h-6 px-2.5 bg-[#003845] hover:bg-[#002f3b] border border-[#006e88] rounded-lg flex items-center gap-1 text-[11px] font-black text-white active:scale-95 transition shadow-sm"
          >
            <span>PLINKO</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {/* Center: (?) Orange Help Button */}
          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#f59e0b] to-[#ea580c] hover:brightness-110 active:scale-95 text-black flex items-center justify-center shadow-md font-black text-xs border border-amber-300/50"
            title="How to Play"
          >
            <HelpCircle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          </button>

          {/* Right: Balance INR & Menu */}
          <div className="flex items-center gap-1">
            <div
              onClick={onNavigateDeposit}
              className="text-[11px] font-black font-mono tracking-wide text-white flex items-center gap-1 bg-[#003845] px-2 py-0.5 rounded-lg border border-[#006e88] cursor-pointer active:scale-95 shadow-inner"
            >
              <span>{(user?.walletBalance ?? 0).toFixed(2)}</span>
              <span className="text-[#38bdf8] text-[9px]">INR</span>
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-6 h-6 rounded-lg bg-[#003845] hover:bg-[#002f3b] border border-[#006e88] text-teal-200 hover:text-white flex items-center justify-center active:scale-95"
              title="Sound Toggle"
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>

            <button
              onClick={onBack}
              className="w-6 h-6 rounded-lg bg-[#003845] hover:bg-[#002f3b] border border-[#006e88] text-teal-200 hover:text-white flex items-center justify-center active:scale-95"
              title="Exit Game"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#003845] border border-teal-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-teal-600/40 pb-3">
              <h3 className="font-black text-base text-amber-300 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>Plinko Rules (12 / 14 / 16 Pins)</span>
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-7 h-7 rounded-lg bg-[#002833] text-zinc-300 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-teal-100 space-y-2.5 leading-relaxed bg-[#002833] p-3.5 rounded-2xl border border-teal-600/30">
              <p>
                1. <strong>Ball Price:</strong> The amount in <em>Bet INR</em> is deducted from your balance for every ball you drop.
              </p>
              <p>
                2. <strong>Pins Count:</strong> Switch between <strong>12 Pins</strong>, <strong>14 Pins</strong>, and <strong>16 Pins</strong> at the top left to adjust the game grid and multiplier payouts.
              </p>
              <p>
                3. <strong>Color Modes:</strong>
                <br />• <strong>GREEN:</strong> Low risk, high consistency.
                <br />• <strong>YELLOW:</strong> Medium risk, high multipliers.
                <br />• <strong>RED:</strong> High risk, extreme jackpot multipliers (up to 555x).
              </p>
              <p>
                4. <strong>Settlement Example:</strong> If your balance is ₹200 and you drop a ₹100 ball that lands in <strong>0.20x</strong>, your account is credited ₹20, leaving a net balance of <strong>₹120</strong>.
              </p>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold text-xs shadow-md"
            >
              Start Playing
            </button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#003845] border border-teal-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-teal-600/40 pb-3">
              <h3 className="font-black text-sm text-teal-200 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-300" />
                <span>Recent Drops History</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 rounded-lg bg-[#002833] text-zinc-300 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {recentDrops.length === 0 ? (
                <div className="text-center py-6 text-xs text-teal-300">
                  No balls dropped yet in this session.
                </div>
              ) : (
                recentDrops.map((drop, i) => (
                  <div
                    key={drop.id || i}
                    className="flex items-center justify-between bg-[#002833] p-2.5 rounded-xl border border-teal-600/20 text-xs"
                  >
                    <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded ${
                      drop.color === 'green' ? 'bg-green-600 text-white' :
                      drop.color === 'yellow' ? 'bg-yellow-500 text-black' : 'bg-red-600 text-white'
                    }`}>
                      {drop.color}
                    </span>
                    <span className="font-bold font-mono text-amber-300">
                      {drop.mult}x
                    </span>
                    <span className="font-black font-mono text-emerald-400">
                      +₹{drop.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#004e63] text-white font-bold text-xs shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
