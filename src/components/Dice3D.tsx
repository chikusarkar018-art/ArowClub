import React, { useEffect, useRef } from 'react';
import { PlayerColor } from '../types.js';

interface Dice3DProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  playerColor: PlayerColor;
  onRoll: () => void;
  disabled?: boolean;
}

// Exact 3D rotation mapping to bring each target face to the front (+Z camera axis)
const ROTATION_MAP: Record<number, { x: number; y: number; z: number }> = {
  1: { x: 0, y: 0, z: 0 },       // Face 1 (Front: rotateY 0)
  2: { x: -90, y: 0, z: 0 },     // Face 2 (Top: rotateX +90 -> parent rotateX -90)
  3: { x: 0, y: -90, z: 0 },     // Face 3 (Right: rotateY +90 -> parent rotateY -90)
  4: { x: 0, y: 90, z: 0 },      // Face 4 (Left: rotateY -90 -> parent rotateY +90)
  5: { x: 90, y: 0, z: 0 },      // Face 5 (Bottom: rotateX -90 -> parent rotateX +90)
  6: { x: 0, y: 180, z: 0 }      // Face 6 (Back: rotateY 180 -> parent rotateY 180)
};

// Calculate next angle to smoothly spin in forward direction by minSpins * 360° and land EXACTLY on targetMod
const calculateNextAngle = (current: number, targetMod: number, minSpins = 3) => {
  const targetNorm = ((targetMod % 360) + 360) % 360;
  const currentNorm = ((current % 360) + 360) % 360;
  let forwardDistance = targetNorm - currentNorm;
  if (forwardDistance <= 0) forwardDistance += 360;
  return current + (minSpins * 360) + forwardDistance;
};

export const Dice3D: React.FC<Dice3DProps> = ({
  value,
  isRolling,
  canRoll,
  playerColor,
  onRoll,
  disabled
}) => {
  const diceRef = useRef<HTMLDivElement | null>(null);
  const totalXRef = useRef(0);
  const totalYRef = useRef(0);
  const totalZRef = useRef(0);
  const isSpinningRef = useRef(false);

  // Set visual transform without spinning
  const setExactFace = (val?: number | null) => {
    const v = val && val >= 1 && val <= 6 ? val : 1;
    const config = ROTATION_MAP[v] || ROTATION_MAP[1];
    totalXRef.current = config.x;
    totalYRef.current = config.y;
    totalZRef.current = config.z;
    if (diceRef.current) {
      diceRef.current.style.transition = 'none';
      diceRef.current.style.transform = `rotateX(${config.x}deg) rotateY(${config.y}deg) rotateZ(${config.z}deg)`;
    }
  };

  const startImmediateSpin = (targetVal?: number | null) => {
    const val = targetVal && targetVal >= 1 && targetVal <= 6 ? targetVal : 1;
    const targetConfig = ROTATION_MAP[val] || ROTATION_MAP[1];

    // Spin at least 3 full 360° loops on X and Y, and land PRECISELY on target
    const nextX = calculateNextAngle(totalXRef.current, targetConfig.x, 3);
    const nextY = calculateNextAngle(totalYRef.current, targetConfig.y, 3);
    const nextZ = calculateNextAngle(totalZRef.current, 0, 2);

    totalXRef.current = nextX;
    totalYRef.current = nextY;
    totalZRef.current = nextZ;

    if (diceRef.current) {
      diceRef.current.style.transition = 'transform 0.65s cubic-bezier(0.2, 0.85, 0.35, 1.15)';
      diceRef.current.style.transform = `rotateX(${nextX}deg) rotateY(${nextY}deg) rotateZ(${nextZ}deg)`;
    }

    isSpinningRef.current = true;
    setTimeout(() => {
      isSpinningRef.current = false;
      // Lock precise angle after spin completes
      if (diceRef.current) {
        diceRef.current.style.transition = 'none';
        diceRef.current.style.transform = `rotateX(${nextX}deg) rotateY(${nextY}deg) rotateZ(${nextZ}deg)`;
      }
    }, 650);
  };

  useEffect(() => {
    if (isRolling) {
      startImmediateSpin(value);
    } else if (value && !isSpinningRef.current) {
      setExactFace(value);
    }
  }, [isRolling, value]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canRoll || disabled || isSpinningRef.current || isRolling) return;
    onRoll();
  };

  return (
    <div
      id={`ludo-dice-3d-${playerColor}`}
      onClick={handleClick}
      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-[#fcedeb] to-[#edd0d0] border-2 flex items-center justify-center select-none transition-all active:scale-95 ${
        canRoll && !disabled && !isRolling
          ? 'cursor-pointer border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)] scale-105 animate-pulse'
          : 'cursor-default border-[#dfa6a6] opacity-90'
      }`}
    >
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center" style={{ perspective: '800px' }}>
        <div
          ref={diceRef}
          className="relative w-[36px] h-[36px]"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
          }}
        >
          {/* Face 1: 1 Big Red Pip (Center) */}
          <div
            className="absolute inset-0 rounded-xl bg-white border border-[#cbd5e1] p-1 grid grid-cols-3 grid-rows-3 shadow-md select-none"
            style={{
              transform: 'rotateY(0deg) translateZ(18px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#ef4444] self-center justify-self-center shadow-sm" style={{ gridArea: '2 / 2' }} />
          </div>

          {/* Face 6: 6 Dark Pips (2x3 grid) */}
          <div
            className="absolute inset-0 rounded-xl bg-white border border-[#cbd5e1] p-1 grid grid-cols-3 grid-rows-3 shadow-md select-none"
            style={{
              transform: 'rotateY(180deg) translateZ(18px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '1 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '1 / 3' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '2 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '2 / 3' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '3 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '3 / 3' }} />
          </div>

          {/* Face 3: 3 Diagonal Dark Pips */}
          <div
            className="absolute inset-0 rounded-xl bg-white border border-[#cbd5e1] p-1 grid grid-cols-3 grid-rows-3 shadow-md select-none"
            style={{
              transform: 'rotateY(90deg) translateZ(18px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '1 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '2 / 2' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '3 / 3' }} />
          </div>

          {/* Face 4: 4 Corner Dark Pips */}
          <div
            className="absolute inset-0 rounded-xl bg-white border border-[#cbd5e1] p-1 grid grid-cols-3 grid-rows-3 shadow-md select-none"
            style={{
              transform: 'rotateY(-90deg) translateZ(18px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '1 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '1 / 3' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '3 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '3 / 3' }} />
          </div>

          {/* Face 2: 2 Diagonal Dark Pips */}
          <div
            className="absolute inset-0 rounded-xl bg-white border border-[#cbd5e1] p-1 grid grid-cols-3 grid-rows-3 shadow-md select-none"
            style={{
              transform: 'rotateX(90deg) translateZ(18px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '1 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '3 / 3' }} />
          </div>

          {/* Face 5: 4 Corner Dark Pips + 1 Red Center Pip */}
          <div
            className="absolute inset-0 rounded-xl bg-white border border-[#cbd5e1] p-1 grid grid-cols-3 grid-rows-3 shadow-md select-none"
            style={{
              transform: 'rotateX(-90deg) translateZ(18px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '1 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '1 / 3' }} />
            <div className="w-2 h-2 rounded-full bg-[#ef4444] self-center justify-self-center shadow-xs" style={{ gridArea: '2 / 2' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '3 / 1' }} />
            <div className="w-2 h-2 rounded-full bg-[#1e293b] self-center justify-self-center" style={{ gridArea: '3 / 3' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

