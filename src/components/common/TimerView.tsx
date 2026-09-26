import React from 'react';
import { WatchIcon } from '../user/WatchIcon.js';

interface TimerViewProps {
  remainingSeconds: number;
  isLocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TimerView: React.FC<TimerViewProps> = ({
  remainingSeconds,
  isLocked,
  size = 'md',
  showLabel = true,
}) => {
  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60);
  const seconds = Math.max(0, remainingSeconds) % 60;

  const formattedMin = String(minutes).padStart(2, '0');
  const formattedSec = String(seconds).padStart(2, '0');

  const minDigits = formattedMin.split('');
  const secDigits = formattedSec.split('');

  return (
    <div className="flex flex-col items-center justify-center">
      {showLabel && (
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-1 uppercase tracking-wider">
          <WatchIcon active={!isLocked} className="w-4 h-4" />
          <span>{isLocked ? 'Betting Locked' : 'Time Remaining'}</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        {/* Minutes */}
        <div className="flex gap-0.5">
          {minDigits.map((d, i) => (
            <div
              key={`m-${i}`}
              className={`font-mono font-bold rounded flex items-center justify-center text-white shadow-md border ${
                isLocked
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  : 'bg-zinc-900 border-amber-500/30 text-amber-400'
              } ${
                size === 'sm'
                  ? 'w-5 h-7 text-sm'
                  : size === 'lg'
                  ? 'w-9 h-12 text-2xl'
                  : 'w-7 h-9 text-lg'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        <span className={`font-mono font-bold ${isLocked ? 'text-zinc-500' : 'text-amber-400'} px-0.5`}>
          :
        </span>

        {/* Seconds */}
        <div className="flex gap-0.5">
          {secDigits.map((d, i) => (
            <div
              key={`s-${i}`}
              className={`font-mono font-bold rounded flex items-center justify-center text-white shadow-md border ${
                isLocked
                  ? 'bg-red-950/80 border-red-800 text-red-400 animate-pulse'
                  : 'bg-zinc-900 border-amber-500/30 text-amber-400'
              } ${
                size === 'sm'
                  ? 'w-5 h-7 text-sm'
                  : size === 'lg'
                  ? 'w-9 h-12 text-2xl'
                  : 'w-7 h-9 text-lg'
              }`}
            >
              {d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
