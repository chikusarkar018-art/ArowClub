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

      {/* Top Stopwatch Pusher & Crown Ring */}
      <rect x="91" y="8" width="18" height="12" rx="3" fill={active ? '#FFD54F' : '#CFD8DC'} stroke={active ? '#FFA000' : '#90A4AE'} strokeWidth="1.5" />
      <path d="M 82,14 C 82,2 118,2 118,14" fill="none" stroke={active ? '#FFD54F' : '#CFD8DC'} strokeWidth="3" strokeLinecap="round" />

      {/* 1. Ambient Glow Halo */}
      <circle cx="100" cy="106" r="90" fill={`url(#${pfx}Glow)`} />

      {/* 2. Outer Bezel Circle */}
      <circle cx="100" cy="106" r="78" fill={`url(#${pfx}OuterGold)`} />

      {/* 3. Inactive Bezel Rim OR Active Bottom White Arc */}
      {!active ? (
        <circle cx="100" cy="106" r="66" fill={`url(#${pfx}BezelRim)`} />
      ) : (
        <path
          d="M 28,106 A 72,72 0 0,0 172,106 L 162,106 A 62,62 0 0,1 38,106 Z"
          fill={`url(#${pfx}BottomWhite)`}
        />
      )}

      {/* 4. Main Dial Face */}
      <circle cx="100" cy="106" r="58" fill={`url(#${pfx}DialFace)`} />

      {/* 5. 12, 3, 6, 9 Triangular Hour Markers */}
      <polygon points="95,52 105,52 100,61" fill={active ? '#FFFFFF' : '#FFF59D'} />
      <polygon points="95,160 105,160 100,151" fill={active ? '#FFFFFF' : '#FFF59D'} />
      <polygon points="46,101 46,111 55,106" fill={active ? '#FFFFFF' : '#FFF59D'} />
      <polygon points="154,101 154,111 145,106" fill={active ? '#FFFFFF' : '#FFF59D'} />

      {/* 6. Clock Hands */}
      {/* Hour hand */}
      <line x1="100" y1="106" x2="76" y2="82" stroke="#1A1A1D" strokeWidth="8" strokeLinecap="round" />
      {/* Minute hand */}
      <line x1="100" y1="106" x2="130" y2="76" stroke="#1A1A1D" strokeWidth="7" strokeLinecap="round" />
      {/* Second hand */}
      <line x1="100" y1="102" x2="100" y2="150" stroke="#E53935" strokeWidth="3" strokeLinecap="round" />

      {/* 7. Center Pivot Hub */}
      {active ? (
        <>
          <circle cx="100" cy="106" r="10" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="1" />
          <circle cx="100" cy="106" r="6" fill="#1A1A1D" />
        </>
      ) : (
        <>
          <circle cx="100" cy="106" r="10" fill={`url(#${pfx}PivotOuter)`} stroke="#FF8F00" strokeWidth="1.2" />
          <circle cx="100" cy="106" r="6" fill="#1A1A1D" />
        </>
      )}
    </svg>
  );
};
