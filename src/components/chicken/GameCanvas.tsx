import React, { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { DifficultyConfig, GameStatus, LaneState } from '../../types/chickenGame';
import { ChickenSprite } from './ChickenSprite';
import { CarSprite } from './CarSprite';

export interface GameCanvasHandle {
  evaluateHop: (targetLaneIndex: number) => {
    crashed: boolean;
    collidedCar?: MovingCar;
  };
}

interface GameCanvasProps {
  currentStep: number;
  config: DifficultyConfig;
  gameStatus: GameStatus;
  currentMultiplier: number;
  betAmount: number;
  onLaneClick?: (laneIndex: number) => void;
  winAmount?: number;
  currencySymbol?: string;
  isDesktop?: boolean;
}

export interface MovingCar {
  id: number;
  laneIndex: number;
  carIndexInLane: number;
  y: number; // percentage from -35 to 140
  baseSpeed: number;
  type: number;
  isStopped: boolean;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({
  currentStep,
  config,
  gameStatus,
  currentMultiplier,
  betAmount,
  onLaneClick,
  winAmount,
  currencySymbol = '₹',
  isDesktop = false,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Lane dimensions
  const laneWidth = isDesktop ? 130 : 110;
  const startWidth = isDesktop ? 160 : 130;
  const finishWidth = isDesktop ? 170 : 140;

  // Barrier stop positions
  const BARRIER_STOP_Y_LEAD = 14;
  const BARRIER_STOP_Y_FOLLOWER = -18;

  // Compute lanes state
  const lanes: LaneState[] = useMemo(() => {
    return config.multipliers.map((mult, idx) => {
      const isCrashedLane = gameStatus === 'crashed' && currentStep === idx + 1;
      const isPassed =
        gameStatus === 'crashed' ? idx < currentStep - 1 : idx < currentStep;
      const hasBarrier = isPassed;

      return {
        index: idx,
        multiplier: mult,
        isPassed,
        isCrashed: isCrashedLane,
        hasBarrier,
        carDirection: 'down',
        carType: idx % 5,
        carSpeed: config.baseCarSpeed * (1 + idx * 0.04),
      };
    });
  }, [config, currentStep, gameStatus]);

  const [cars, setCars] = useState<MovingCar[]>([]);
  const carsRef = useRef<MovingCar[]>([]);

  // Initialize cars per lane
  useEffect(() => {
    const initialCars: MovingCar[] = [];
    let carId = 1;

    for (let laneIdx = 0; laneIdx < config.lanesCount; laneIdx++) {
      const laneMult = config.multipliers[laneIdx] || 1;
      const laneSpeedFactor = 1 + Math.min(2.0, Math.log2(laneMult) * 0.12 + laneIdx * 0.02);
      const baseSpd = config.baseCarSpeed * laneSpeedFactor;
      const type = laneIdx % 5;
      
      // Stagger cars across lanes for dynamic traffic flow
      const y1 = ((laneIdx * 43) % 90) - 25;

      initialCars.push({
        id: carId++,
        laneIndex: laneIdx,
        carIndexInLane: 0,
        y: y1,
        baseSpeed: baseSpd,
        type,
        isStopped: false,
      });

      const hasSecondCar = config.id === 'hardcore' || config.id === 'hard' || (config.id === 'medium' && laneIdx % 2 === 0);
      if (hasSecondCar) {
        let y2 = y1 + 55;
        if (y2 > 120) y2 -= 145;
        initialCars.push({
          id: carId++,
          laneIndex: laneIdx,
          carIndexInLane: 1,
          y: y2,
          baseSpeed: baseSpd * 1.04,
          type: (type + 2) % 5,
          isStopped: false,
        });
      }
    }
    setCars(initialCars);
    carsRef.current = initialCars;
  }, [config.id, config.lanesCount, config.baseCarSpeed, config.multipliers]);

  const multiplierSpeedScale = useMemo(() => {
    return Math.max(1, 1 + currentStep * 0.14 + (Math.max(1, currentMultiplier) - 1) * 0.08);
  }, [currentStep, currentMultiplier]);

  // Traffic simulation loop using requestAnimationFrame
  useEffect(() => {
    let animFrame: number;

    const updateTraffic = () => {
      setCars((prevCars) => {
        const nextCars = prevCars.map((car) => {
          const isCrashedLane = gameStatus === 'crashed' && currentStep === car.laneIndex + 1;
          const isLaneConquered =
            gameStatus === 'crashed'
              ? car.laneIndex < currentStep - 1
              : car.laneIndex < currentStep;

          let newY = car.y;
          let isStopped = false;

          if (isCrashedLane) {
            // Smashed right on chicken impact position
            newY = 50;
            isStopped = true;
          } else if (isLaneConquered) {
            // Stopped at construction barrier
            const stopTarget =
              car.carIndexInLane === 0 ? BARRIER_STOP_Y_LEAD : BARRIER_STOP_Y_FOLLOWER;

            if (newY > stopTarget + 2) {
              newY = stopTarget;
              isStopped = true;
            } else if (newY < stopTarget) {
              newY += car.baseSpeed * 0.8;
              if (newY >= stopTarget) {
                newY = stopTarget;
              }
              isStopped = newY >= stopTarget;
            } else {
              newY = stopTarget;
              isStopped = true;
            }
          } else {
            // Active lane: car continuously moves downward!
            const speedBoost =
              multiplierSpeedScale *
              (config.id === 'hardcore'
                ? 1.45
                : config.id === 'hard'
                ? 1.25
                : config.id === 'medium'
                ? 1.1
                : 0.95);
            newY += car.baseSpeed * speedBoost * 1.15;
            if (newY > 135) {
              newY = -35;
            }
            isStopped = false;
          }

          return { ...car, y: newY, isStopped };
        });

        carsRef.current = nextCars;
        return nextCars;
      });

      animFrame = requestAnimationFrame(updateTraffic);
    };

    animFrame = requestAnimationFrame(updateTraffic);
    return () => cancelAnimationFrame(animFrame);
  }, [currentStep, currentMultiplier, gameStatus, multiplierSpeedScale, config.id]);

  // Imperative handle for real-time car collision detection
  useImperativeHandle(ref, () => ({
    evaluateHop: (targetLaneIndex: number) => {
      const currentCars = carsRef.current;
      const targetCars = currentCars.filter((c) => c.laneIndex === targetLaneIndex);

      let collidedCar: MovingCar | undefined = undefined;

      for (const car of targetCars) {
        // Physical collision zone:
        // Chicken is at y = 50% (height 26%), Car is centered at car.y (height 28%)
        // If car.y is between 18% and 82%, they directly intersect or graze!
        if (car.y >= 18 && car.y <= 82) {
          collidedCar = car;
          break;
        }

        // Fast entry check:
        // If oncoming car is just above the crossing zone (y: 0 to 20) and will strike during the 200ms hop:
        const speedBoost =
          multiplierSpeedScale *
          (config.id === 'hardcore'
            ? 1.45
            : config.id === 'hard'
            ? 1.25
            : config.id === 'medium'
            ? 1.1
            : 0.95);
        const estHopTravel = car.baseSpeed * speedBoost * 1.15 * 14; // ~14 frames (220ms)
        if (car.y < 18 && car.y + estHopTravel >= 20) {
          collidedCar = car;
          break;
        }
      }

      return {
        crashed: !!collidedCar,
        collidedCar,
      };
    },
  }), [multiplierSpeedScale, config.id]);

  // Auto-scroll road canvas horizontally to keep chicken in comfortable view
  useEffect(() => {
    if (!containerRef.current) return;
    const clientW = containerRef.current.clientWidth;
    const chickenPos =
      currentStep === 0 ? 60 : startWidth + (currentStep - 1) * laneWidth + laneWidth / 2;

    const targetScroll = Math.max(0, chickenPos - clientW / 2);
    containerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  }, [currentStep, laneWidth, startWidth]);

  // Chicken animation state
  const chickenState = useMemo(() => {
    if (gameStatus === 'crashed') return 'crashed';
    if (gameStatus === 'won_finish' || (gameStatus === 'cashed_out' && currentStep > 0)) return 'won';
    if (gameStatus === 'playing' && currentStep > 0) return 'hopping';
    return 'idle';
  }, [gameStatus, currentStep]);

  // Chicken horizontal position
  const chickenX = useMemo(() => {
    if (currentStep === 0) return (startWidth - (isDesktop ? 86 : 74)) / 2 + (isDesktop ? 18 : 12);
    if (currentStep > config.lanesCount) return startWidth + config.lanesCount * laneWidth + 30;
    return startWidth + (currentStep - 1) * laneWidth + (laneWidth - (isDesktop ? 86 : 76)) / 2;
  }, [currentStep, config.lanesCount, laneWidth, startWidth, isDesktop]);

  const totalBoardWidth = startWidth + config.lanesCount * laneWidth + finishWidth;
  const currentWinTotal = +(betAmount * currentMultiplier).toFixed(2);

  return (
    <div
      id="chicken-road-arena"
      className={`relative w-full h-[260px] xs:h-[300px] sm:h-[360px] md:h-[420px] bg-[#53565e] select-none rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-[#3b3d45] ${
        gameStatus === 'crashed' ? 'animate-screen-shake ring-4 ring-red-500/80' : ''
      }`}
    >
      {/* Red flash overlay on crash */}
      {gameStatus === 'crashed' && (
        <div className="absolute inset-0 bg-red-600/35 z-40 pointer-events-none animate-pulse" />
      )}

      {/* Floating Top WIN Banner matching Image 2 */}
      {(gameStatus === 'cashed_out' || (gameStatus === 'playing' && currentStep > 0)) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
          {/* Small Top Yellow "WIN!" Badge */}
          <div className="bg-[#f5c443] text-zinc-950 text-[10px] sm:text-xs font-black uppercase px-3 py-0.5 rounded-full shadow-md leading-tight -mb-1.5 z-10">
            WIN!
          </div>
          {/* Main Dark Emerald Pill with Win Total */}
          <div className="bg-[#1f3f2f]/95 border border-[#34d399]/40 text-[#34d399] px-4 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xl">
            <span className="font-mono font-black text-sm sm:text-base text-white">
              {currentWinTotal.toFixed(2)}
            </span>
            <span className="w-4 h-4 rounded-full bg-[#f5c443] text-zinc-950 text-[10px] font-black flex items-center justify-center">
              {currencySymbol}
            </span>
          </div>
        </div>
      )}

      {/* Main Horizontal Arena View */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-none flex items-stretch relative touch-pan-x"
      >
        <div
          className="relative h-full flex"
          style={{ width: `${totalBoardWidth}px`, minWidth: '100%' }}
        >
          {/* 1. START SIDEWALK & GRASS WITH STREET LAMP (Lane 0) */}
          <div
            className="h-full relative flex shrink-0 z-10 select-none shadow-[inset_-5px_0_15px_rgba(0,0,0,0.3)]"
            style={{ width: `${startWidth}px` }}
          >
            {/* Green Lawn & Trees on left */}
            <div className="w-10 sm:w-12 h-full bg-[#5da632] border-r-2 border-[#437d21] flex flex-col justify-around items-center relative overflow-hidden shrink-0">
              <div className="w-16 h-18 rounded-full bg-[#70c23e] -left-6 absolute top-2 border-2 border-[#437d21]" />
              <div className="w-18 h-22 rounded-full bg-[#52952a] -left-7 absolute top-28 border-2 border-[#437d21]" />
              <div className="w-16 h-18 rounded-full bg-[#70c23e] -left-6 absolute bottom-4 border-2 border-[#437d21]" />
            </div>

            {/* Sidewalk with Light Pole & Tiles */}
            <div className="flex-1 h-full bg-[#9aa0a6] border-r-4 border-[#7b8188] relative flex flex-col justify-between overflow-hidden">
              {/* Sidewalk Tile Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#82888f_2px,transparent_2px),linear-gradient(to_right,#82888f_2px,transparent_2px)] [background-size:38px_38px] opacity-60" />

              {/* Authentic Street Lamp matching screenshot 1 */}
              <div className="absolute top-2 left-3 z-20 pointer-events-none flex flex-col items-center">
                {/* Lamp Pole Base */}
                <div className="w-7 h-7 rounded-full bg-[#5c6168] border-2 border-[#43474d] flex items-center justify-center shadow-md">
                  <div className="w-4 h-4 rounded-full bg-[#7c828b]" />
                </div>
                {/* Light Beam Arc */}
                <div className="w-16 h-16 rounded-full bg-yellow-300/25 blur-sm -mt-2 -ml-2 pointer-events-none" />
              </div>

              {/* Fire Hydrant matching screenshot 2 */}
              <div className="absolute bottom-4 right-3 z-20 pointer-events-none flex flex-col items-center">
                <div className="w-4 h-7 bg-[#dc2626] rounded-t-md border border-[#991b1b] shadow flex flex-col items-center justify-between p-0.5">
                  <div className="w-2.5 h-1.5 bg-[#ef4444] rounded-full" />
                  <div className="w-3.5 h-1 bg-[#991b1b]" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. THE HIGHWAY ROAD TRACK */}
          <div className="h-full flex relative bg-[#53565e] shadow-[inset_0_0_30px_rgba(0,0,0,0.4)]">
            {lanes.map((lane, idx) => {
              const isNextStep = gameStatus === 'playing' && currentStep === idx;
              const isChickenHere = gameStatus === 'playing' && currentStep === idx + 1;
              const isPassed = lane.isPassed;
              const isCrashed = lane.isCrashed;

              return (
                <div
                  key={idx}
                  onClick={() => isNextStep && onLaneClick && onLaneClick(idx)}
                  className={`h-full relative border-r-2 sm:border-r-3 border-dashed border-white/60 flex flex-col justify-between items-center py-4 shrink-0 transition-colors ${
                    isNextStep
                      ? 'cursor-pointer bg-emerald-500/10 ring-2 ring-inset ring-emerald-400/50'
                      : isChickenHere
                      ? 'bg-amber-500/10'
                      : ''
                  }`}
                  style={{ width: `${laneWidth}px` }}
                >
                  {/* Top Lane Road Divider */}
                  <div className="z-20 opacity-0 h-4" />

                  {/* Sewer Manhole Drain / Golden Chicken Coin Cover */}
                  <div className="z-20 relative flex flex-col items-center justify-center my-auto">
                    {/* VIP Barrier & Velvet Ropes on Conquered Lanes (Image 2) */}
                    {lane.hasBarrier && (
                      <div className="absolute -top-16 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                        {/* Yellow/Black Striped Construction Barrier */}
                        <div className="w-[84px] sm:w-[94px] h-[26px] bg-[#f59e0b] rounded-md border-2 border-zinc-950 shadow-xl overflow-hidden relative flex flex-col justify-between p-0.5">
                          <div className="w-full h-3 bg-[repeating-linear-gradient(45deg,#000,#000_6px,#f59e0b_6px,#f59e0b_12px)] border-b border-zinc-900" />
                          <div className="flex items-center justify-between px-1 text-[7px] font-black text-zinc-950 font-mono">
                            <span>VIP</span>
                            <span>PASSED</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MANHOLE DISC:
                        - If PASSED: Golden coin manhole with roasted chicken 🍗 (Image 2)
                        - If CRASHED: Red broken explosion
                        - If UNCONQUERED: Authentic Dark Metallic Sewer Grate with multiplier text (Image 1) */}
                    {isPassed ? (
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#d97706] border-4 border-[#b45309] shadow-[0_0_24px_rgba(245,158,11,0.6)] flex flex-col items-center justify-center animate-pulse">
                        <span className="text-2xl sm:text-3xl drop-shadow">🍗</span>
                        <span className="text-[9px] font-black font-mono text-zinc-950 -mt-1">
                          {lane.multiplier.toFixed(2)}x
                        </span>
                      </div>
                    ) : isCrashed ? (
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-red-950 border-4 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.9)] flex flex-col items-center justify-center animate-bounce">
                        <span className="text-2xl sm:text-3xl">💥</span>
                        <span className="text-[8px] font-black text-red-200 uppercase font-mono">
                          CRASHED
                        </span>
                      </div>
                    ) : (
                      /* Sewer Manhole Grate with Multiplier matching Image 1 */
                      <div
                        className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#3d4047] border-4 border-[#2b2d32] shadow-xl flex flex-col items-center justify-center transition-transform relative overflow-hidden ${
                          isNextStep ? 'ring-4 ring-emerald-400/60 scale-105 bg-[#444852]' : ''
                        }`}
                      >
                        {/* Sewer Grate Inner Ring & Slots */}
                        <div className="absolute inset-1.5 rounded-full border-2 border-dashed border-[#24262b]/70 opacity-60 pointer-events-none" />
                        <span
                          className={`z-10 font-mono font-black text-xs sm:text-sm tracking-tight ${
                            isNextStep ? 'text-emerald-300' : 'text-zinc-300'
                          }`}
                        >
                          {lane.multiplier.toFixed(2)}x
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="z-20 opacity-0 h-4" />
                </div>
              );
            })}

            {/* Moving Vehicles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {cars.map((car) => (
                <div
                  key={car.id}
                  className="absolute transition-transform duration-75"
                  style={{
                    left: `${car.laneIndex * laneWidth + (laneWidth - (isDesktop ? 62 : 56)) / 2}px`,
                    top: `${car.y}%`,
                    transform: 'translateY(-50%)',
                    willChange: 'top',
                  }}
                >
                  <CarSprite
                    type={car.type}
                    direction="down"
                    width={isDesktop ? 62 : 56}
                    height={isDesktop ? 96 : 88}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. FINISH LINE VIP VAULT */}
          <div
            className="h-full bg-gradient-to-b from-[#2e2613] via-[#1f190c] to-[#120f08] border-l-4 border-amber-400 flex flex-col justify-between p-3 relative shrink-0 z-15 shadow-[inset_10px_0_25px_rgba(0,0,0,0.6)]"
            style={{ width: `${finishWidth}px` }}
          >
            <div className="text-amber-400 font-black text-xs text-center uppercase tracking-wider flex items-center justify-center gap-1">
              <span>👑</span>
              <span>FINISH</span>
              <span>👑</span>
            </div>

            <div className="my-auto flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400/80 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse">
                🏆
              </div>
              <div className="text-center">
                <div className="text-[10px] text-amber-300 font-black uppercase">MAX WIN</div>
                <div className="text-xs font-mono font-black text-amber-400">
                  {config.multipliers[config.multipliers.length - 1].toFixed(2)}x
                </div>
              </div>
            </div>

            <div className="text-[9px] text-emerald-400 text-center font-mono font-bold">
              0% TAX WIN
            </div>
          </div>

          {/* 4. HERO CHICKEN CHARACTER */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-200 ease-out z-30 pointer-events-none"
            style={{
              left: `${chickenX}px`,
              transform: 'translate(0, -50%)',
              willChange: 'left',
            }}
          >
            <ChickenSprite state={chickenState} size={isDesktop ? 86 : 76} />
          </div>
        </div>
      </div>
    </div>
  );
});

GameCanvas.displayName = 'GameCanvas';
