import React from 'react';

export interface CasinoChipProps {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'mini';
  count?: number;
  className?: string;
  isUser?: boolean;
  style?: React.CSSProperties;
}

// Authentic Casino Token styling matching casino poker chips (Image 2 style)
export const CasinoChip: React.FC<CasinoChipProps> = ({
  value,
  size = 'md',
  count,
  className = '',
  isUser = true,
  style = {},
}) => {
  const getChipColors = (val: number) => {
    switch (val) {
      case 10:
        return {
          base: 'bg-[#dc2626]', // Red chip (like in image 2)
          notch: 'border-white',
          inner: 'bg-[#fef2f2] text-red-950 border-red-300',
          accent: '#b91c1c',
        };
      case 50:
        return {
          base: 'bg-[#18181b]', // Black chip (like in image 2)
          notch: 'border-white',
          inner: 'bg-[#f4f4f5] text-zinc-950 border-zinc-400',
          accent: '#09090b',
        };
      case 100:
        return {
          base: 'bg-[#2563eb]', // Blue chip
          notch: 'border-white',
          inner: 'bg-[#eff6ff] text-blue-950 border-blue-300',
          accent: '#1d4ed8',
        };
      case 500:
        return {
          base: 'bg-[#059669]', // Green chip
          notch: 'border-white',
          inner: 'bg-[#ecfdf5] text-emerald-950 border-emerald-300',
          accent: '#047857',
        };
      case 1000:
        return {
          base: 'bg-[#7c3aed]', // Purple chip
          notch: 'border-amber-300',
          inner: 'bg-[#f5f3ff] text-purple-950 border-purple-300',
          accent: '#6d28d9',
        };
      case 5000:
        return {
          base: 'bg-[#eab308]', // Gold chip
          notch: 'border-black',
          inner: 'bg-[#fffbeb] text-amber-950 border-amber-400',
          accent: '#ca8a04',
        };
      default:
        return {
          base: 'bg-[#dc2626]',
          notch: 'border-white',
          inner: 'bg-white text-black border-zinc-300',
          accent: '#b91c1c',
        };
    }
  };

  const colors = getChipColors(value);

  const sizeClasses = {
    mini: 'w-4 h-4 text-[7px]',
    sm: 'w-5 h-5 text-[8px]',
    md: 'w-8 h-8 text-[10px]',
    lg: 'w-10 h-10 text-xs',
  }[size];

  const formatChipLabel = (val: number) => {
    if (val >= 1000) return `${val / 1000}k`;
    return `${val}`;
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full select-none shadow-[0_2px_5px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)] ${colors.base} ${sizeClasses} ${className} transition-transform ${
        isUser ? 'ring-1 ring-amber-300/80' : ''
      }`}
      style={{
        backgroundImage: `repeating-conic-gradient(from 0deg, transparent 0deg 20deg, rgba(255,255,255,0.85) 20deg 40deg)`,
        ...style,
      }}
    >
      {/* Outer Striped Notches Overlay */}
      <div className={`absolute inset-[1.5px] rounded-full ${colors.base} flex items-center justify-center`}>
        {/* Inner Core Circle */}
        <div
          className={`w-[72%] h-[72%] rounded-full ${colors.inner} border flex items-center justify-center font-black leading-none shadow-inner`}
        >
          <span>{formatChipLabel(value)}</span>
        </div>
      </div>

      {/* Optional Stack Count Badge */}
      {count && count > 1 && (
        <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black font-black text-[7.5px] px-1 rounded-full border border-black shadow">
          {count}
        </span>
      )}
    </div>
  );
};
