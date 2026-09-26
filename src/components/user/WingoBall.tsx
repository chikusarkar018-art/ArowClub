import React, { useState } from 'react';
import { BALL_ASSETS } from '../../constants/assets.js';

interface WingoBallProps {
  number: number;
  size?: number | string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const WingoBall: React.FC<WingoBallProps> = ({
  number,
  size = 40,
  className = '',
  onClick,
  disabled = false,
}) => {
  const num = Math.max(0, Math.min(9, Math.floor(number)));
  const imgUrl = BALL_ASSETS[num] || BALL_ASSETS[0];
  const [loadError, setLoadError] = useState(false);

  const styleObj: React.CSSProperties =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  // Fallback colors if network ever blocks external assets
  const is0 = num === 0;
  const is5 = num === 5;
  const isGreen = [1, 3, 7, 9].includes(num);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      style={styleObj}
      className={`relative shrink-0 aspect-square rounded-full transition-transform focus:outline-none select-none flex items-center justify-center p-0 bg-transparent ${
        onClick && !disabled ? 'active:scale-95 hover:scale-105 cursor-pointer' : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {!loadError ? (
        <img
          src={imgUrl}
          alt={`Ball ${num}`}
          onError={() => setLoadError(true)}
          className="w-full h-full object-contain pointer-events-none drop-shadow-sm select-none block"
          loading="eager"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-black text-white text-xs shadow-sm"
          style={{
            background: is0
              ? 'linear-gradient(to top right, #9333ea 50%, #ef4444 50%)'
              : is5
              ? 'linear-gradient(to top right, #9333ea 50%, #16a34a 50%)'
              : isGreen
              ? '#16a34a'
              : '#ef4444',
          }}
        >
          {num}
        </div>
      )}
    </button>
  );
};
