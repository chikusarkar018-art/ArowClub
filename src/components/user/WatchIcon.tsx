import React from 'react';

interface WatchIconProps {
  active?: boolean;
  className?: string;
}

export const WatchIcon: React.FC<WatchIconProps> = ({ active = false, className = 'w-7 h-7' }) => {
  const pfx = active ? 'act' : 'inact';

  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft Outer Yellow Glow */}
        <radialGradient id={`${pfx}Glow`} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#FFD600" stopOpacity={active ? 0.9 : 0.8} />
          <stop offset="85%" stopColor="#FFAB00" stopOpacity={active ? 0.45 : 0.4} />
          <stop offset="100%" stopColor="#FF9100" stopOpacity={0} />
        </radialGradient>

        {/* Outer Ring Gold Gradient */}
        <radialGradient id={`${pfx}OuterGold`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="50%" stopColor="#FFD54F" />
          <stop offset="80%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#FFA000" />
        </radialGradient>

        {/* Bezel Step Rim Gradient */}
        <linearGradient id={`${pfx}BezelRim`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="50%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>

        {/* Bottom Gloss White Arc Gradient (for Active state) */}
        <linearGradient id={`${pfx}BottomWhite`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#ECEFF1" />
        </linearGradient>

        {/* Vibrant Warm Yellow Dial Face */}
        <radialGradient id={`${pfx}DialFace`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFEB3B" />
          <stop offset="55%" stopColor="#FFD600" />
          <stop offset="90%" stopColor="#FFC400" />
          <stop offset="100%" stopColor="#FFA000" />
        </radialGradient>

        {/* Center Pivot Outer Gradient */}
        <linearGradient id={`${pfx}PivotOuter`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>

      {/* 1. Ambient Glow Halo */}
      <circle cx="100" cy="100" r="96" fill={`url(#${pfx}Glow)`} />

      {/* 2. Outer Bezel Circle */}
      <circle cx="100" cy="100" r="82" fill={`url(#${pfx}OuterGold)`} />

      {/* 3. Inactive Bezel Rim OR Active Bottom White Arc */}
      {!active ? (
        <circle cx="100" cy="100" r="70" fill={`url(#${pfx}BezelRim)`} />
      ) : (
        <path
          d="M 22,100 A 78,78 0 0,0 178,100 L 166,100 A 66,66 0 0,1 34,100 Z"
          fill={`url(#${pfx}BottomWhite)`}
        />
      )}

      {/* 4. Main Dial Face */}
      <circle cx="100" cy="100" r="62" fill={`url(#${pfx}DialFace)`} />

      {/* 5. 12, 3, 6, 9 Triangular Hour Markers (pointing inward) */}
      <polygon points="94,40 106,40 100,50" fill={active ? '#FFFFFF' : '#FFF59D'} />
      <polygon points="94,160 106,160 100,150" fill={active ? '#FFFFFF' : '#FFF59D'} />
      <polygon points="40,94 40,106 50,100" fill={active ? '#FFFFFF' : '#FFF59D'} />
      <polygon points="160,94 160,106 150,100" fill={active ? '#FFFFFF' : '#FFF59D'} />

      {/* 6. Clock Hands */}
      {/* Hour hand (10:15 / top-left) */}
      <line x1="100" y1="100" x2="74" y2="74" stroke="#1A1A1D" strokeWidth="10" strokeLinecap="round" />
      {/* Minute hand (2:00 / top-right) */}
      <line x1="100" y1="100" x2="132" y2="68" stroke="#1A1A1D" strokeWidth="9" strokeLinecap="round" />
      {/* Second hand (6:00 / straight down) */}
      <line x1="100" y1="96" x2="100" y2="148" stroke="#1A1A1D" strokeWidth="3.5" strokeLinecap="round" />

      {/* 7. Center Pivot Hub */}
      {active ? (
        <>
          <circle cx="100" cy="100" r="12" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="1" />
          <circle cx="100" cy="100" r="7.5" fill="#FFFFFF" stroke="#CCCCCC" strokeWidth="0.8" />
        </>
      ) : (
        <>
          <circle cx="100" cy="100" r="12" fill={`url(#${pfx}PivotOuter)`} stroke="#FF8F00" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="7.5" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.8" />
        </>
      )}
    </svg>
  );
};
