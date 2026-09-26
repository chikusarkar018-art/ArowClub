import React from 'react';
import { BALL_ASSETS } from '../../constants/assets.js';

interface BallViewProps {
  number: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

export const BallView: React.FC<BallViewProps> = ({
  number,
  size = 'md',
  className = '',
  animate = false,
}) => {
  const assetUrl = BALL_ASSETS[number];

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${sizeClasses[size]} ${className} ${
        animate ? 'animate-bounce' : ''
      }`}
    >
      {assetUrl ? (
        <img
          src={assetUrl}
          alt={`Ball ${number}`}
          className="w-full h-full object-contain filter drop-shadow-md"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-inner ${
            number === 0
              ? 'bg-gradient-to-tr from-red-600 to-purple-600'
              : number === 5
              ? 'bg-gradient-to-tr from-green-600 to-purple-600'
              : [1, 3, 7, 9].includes(number)
              ? 'bg-green-600'
              : 'bg-red-600'
          }`}
        >
          {number}
        </div>
      )}
    </div>
  );
};
