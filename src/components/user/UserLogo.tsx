import React from 'react';

interface UserLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const UserLogo: React.FC<UserLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
  layout = 'horizontal',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-sm tracking-wider',
    md: 'text-lg tracking-wider',
    lg: 'text-2xl tracking-wider',
    xl: 'text-4xl tracking-widest',
  };

  // SVG representation of Image 3's 3D Gold "A" with Silver Arrow Swoosh
  const renderEmblem = () => (
    <div className={`relative ${iconDimensions[size]} shrink-0 drop-shadow-[0_4px_12px_rgba(235,178,40,0.45)]`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* 3D Gold Gradients */}
          <linearGradient id="goldTop" x1="50" y1="20" x2="150" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff3b0" />
            <stop offset="25%" stopColor="#e5a823" />
            <stop offset="65%" stopColor="#d48b0c" />
            <stop offset="100%" stopColor="#7a4e05" />
          </linearGradient>

          <linearGradient id="goldBevelLeft" x1="30" y1="40" x2="100" y2="170" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffd875" />
            <stop offset="50%" stopColor="#f5b318" />
            <stop offset="100%" stopColor="#875806" />
          </linearGradient>

          <linearGradient id="goldBevelRight" x1="170" y1="40" x2="100" y2="170" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e69d10" />
            <stop offset="50%" stopColor="#b87405" />
            <stop offset="100%" stopColor="#4f2f01" />
          </linearGradient>

          {/* 3D Chrome / Silver Gradients for Swoosh Arrow */}
          <linearGradient id="silverSwoosh" x1="20" y1="120" x2="180" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a3b1c6" />
            <stop offset="30%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#cfd8e3" />
            <stop offset="80%" stopColor="#7b8a9e" />
            <stop offset="100%" stopColor="#f8f9fa" />
          </linearGradient>

          <linearGradient id="silverShadow" x1="30" y1="130" x2="150" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3d4856" />
            <stop offset="50%" stopColor="#697787" />
            <stop offset="100%" stopColor="#1e242d" />
          </linearGradient>
        </defs>

        {/* Outer Bevel A Background */}
        <path
          d="M100 20 L158 148 L142 165 L108 165 L100 144 L92 165 L58 165 L42 148 Z"
          fill="url(#goldBevelRight)"
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
        />

        {/* Left Leg of 3D Gold A */}
        <path
          d="M100 24 L52 146 L44 162 L66 162 L80 128 L100 78 Z"
          fill="url(#goldBevelLeft)"
        />

        {/* Right Leg of 3D Gold A */}
        <path
          d="M100 24 L100 78 L120 128 L134 162 L156 162 L148 146 Z"
          fill="url(#goldTop)"
        />

        {/* Top Facet of A */}
        <polygon
          points="100,24 86,58 114,58"
          fill="#fff5c0"
        />

        {/* Inner Cutout Triangle */}
        <polygon
          points="100,82 86,122 114,122"
          fill="#121622"
        />

        {/* Aerodynamic Silver Swoosh Lower Shadow Edge */}
        <path
          d="M34 136 C 45 152, 90 135, 140 82 L168 56 L154 52 C 110 94, 60 142, 34 136 Z"
          fill="url(#silverShadow)"
        />

        {/* Aerodynamic Silver Swoosh Arrow Curved Blade */}
        <path
          d="M32 130 C 42 82, 102 68, 166 42 L164 54 C 110 84, 52 108, 32 130 Z"
          fill="url(#silverSwoosh)"
        />

        {/* Silver Arrowhead Tip */}
        <path
          d="M166 42 L180 34 L168 58 L160 52 Z"
          fill="url(#silverSwoosh)"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center justify-center select-none text-center ${className}`}>
        {renderEmblem()}
        
        {/* AROWCLUB Metallic 3D Typography */}
        <div className={`font-black flex items-center mt-2 ${textSizes[size]}`}>
          {/* Silver AROW */}
          <span className="bg-gradient-to-b from-[#ffffff] via-[#dce3ec] to-[#8896a6] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase tracking-tight">
            AROW
          </span>
          {/* Gold CLUB */}
          <span className="bg-gradient-to-b from-[#fff2a8] via-[#e5a823] to-[#996404] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase tracking-tight ml-0.5">
            CLUB
          </span>
        </div>

        {showSubtitle && (
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#e5a823]/80 font-bold mt-0.5">
            Official Gaming
          </span>
        )}
      </div>
    );
  }

  // Horizontal Header Layout
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {renderEmblem()}

      <div className="flex flex-col">
        <div className={`font-black flex items-center tracking-tight leading-none ${textSizes[size]}`}>
          {/* Silver AROW */}
          <span className="bg-gradient-to-b from-[#ffffff] via-[#dce3ec] to-[#94a3b8] bg-clip-text text-transparent font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            AROW
          </span>
          {/* Gold CLUB */}
          <span className="bg-gradient-to-b from-[#fff2a8] via-[#e5a823] to-[#a16b09] bg-clip-text text-transparent font-extrabold ml-0.5 drop-shadow-[0_2px_4px_rgba(235,178,40,0.4)]">
            CLUB
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#e5a823]/80 font-semibold mt-0.5">
            Official Platform
          </span>
        )}
      </div>
    </div>
  );
};
