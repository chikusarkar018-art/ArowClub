import React from 'react';

// High-definition Vector Graphic Poster for Roulette
export const RouletteGamePoster: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#1c0e08] via-[#2a1309] to-[#0d0503] flex items-center justify-center select-none">
      {/* Background Lighting & Casino Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(245,196,67,0.25)_0%,_transparent_75%)]" />

      {/* SVG 3D Roulette Wheel Artwork */}
      <svg
        viewBox="0 0 200 200"
        className="w-[92%] h-[92%] drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="rouletteRim" cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="#451e0e" />
            <stop offset="85%" stopColor="#250e05" />
            <stop offset="98%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#7a5518" />
          </radialGradient>
          <radialGradient id="goldCone" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff2a8" />
            <stop offset="35%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#a16207" />
            <stop offset="100%" stopColor="#451a03" />
          </radialGradient>
          <radialGradient id="ballGlow" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e4e4e7" />
            <stop offset="100%" stopColor="#71717a" />
          </radialGradient>
          <linearGradient id="goldText" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>
        </defs>

        {/* Outer Mahogany & Brass Ring */}
        <circle cx="100" cy="100" r="92" fill="url(#rouletteRim)" stroke="#f5c443" strokeWidth="3" />
        <circle cx="100" cy="100" r="78" fill="#140703" stroke="#b45309" strokeWidth="2" />

        {/* Number Pockets Segments */}
        {[
          { color: '#059669', text: '0' },
          { color: '#dc2626', text: '32' },
          { color: '#18181b', text: '15' },
          { color: '#dc2626', text: '19' },
          { color: '#18181b', text: '4' },
          { color: '#dc2626', text: '21' },
          { color: '#18181b', text: '2' },
          { color: '#dc2626', text: '25' },
          { color: '#18181b', text: '17' },
          { color: '#dc2626', text: '34' },
          { color: '#18181b', text: '6' },
          { color: '#dc2626', text: '27' },
          { color: '#18181b', text: '13' },
          { color: '#dc2626', text: '36' },
          { color: '#18181b', text: '11' },
          { color: '#dc2626', text: '30' },
          { color: '#18181b', text: '8' },
          { color: '#dc2626', text: '23' },
        ].map((slot, i) => {
          const angle = (i * 360) / 18;
          const rad = (angle * Math.PI) / 180;
          const nextRad = (((angle + 20) % 360) * Math.PI) / 180;
          const x1 = 100 + 76 * Math.cos(rad);
          const y1 = 100 + 76 * Math.sin(rad);
          const x2 = 100 + 76 * Math.cos(nextRad);
          const y2 = 100 + 76 * Math.sin(nextRad);
          const x3 = 100 + 44 * Math.cos(nextRad);
          const y3 = 100 + 44 * Math.sin(nextRad);
          const x4 = 100 + 44 * Math.cos(rad);
          const y4 = 100 + 44 * Math.sin(rad);

          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} A 76 76 0 0 1 ${x2} ${y2} L ${x3} ${y3} A 44 44 0 0 0 ${x4} ${y4} Z`}
                fill={slot.color}
                stroke="#eab308"
                strokeWidth="0.8"
              />
            </g>
          );
        })}

        {/* Inner Brass Centerpiece */}
        <circle cx="100" cy="100" r="44" fill="url(#goldCone)" stroke="#713f12" strokeWidth="1.5" />
        
        {/* Turret Crown Spikes */}
        <path
          d="M 100 70 L 105 95 L 130 100 L 105 105 L 100 130 L 95 105 L 70 100 L 95 95 Z"
          fill="#fef08a"
          opacity="0.85"
        />
        <circle cx="100" cy="100" r="16" fill="#facc15" stroke="#854d0e" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="7" fill="#ffffff" opacity="0.6" />

        {/* 3D Ivory White Ball on Track */}
        <circle
          cx="162"
          cy="74"
          r="6.5"
          fill="url(#ballGlow)"
          stroke="#52525b"
          strokeWidth="0.5"
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
        />

        {/* Casino Gold Chips in Foreground Bottom Left */}
        <g transform="translate(18, 140) scale(0.65)">
          {/* Chip 1 */}
          <ellipse cx="20" cy="35" rx="18" ry="10" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3,2" />
          <ellipse cx="20" cy="32" rx="14" ry="7" fill="#b91c1c" />
          
          {/* Chip 2 */}
          <ellipse cx="28" cy="24" rx="18" ry="10" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3,2" />
          <ellipse cx="28" cy="21" rx="14" ry="7" fill="#1d4ed8" />

          {/* Chip 3 */}
          <ellipse cx="36" cy="12" rx="18" ry="10" fill="#eab308" stroke="#000000" strokeWidth="1.5" strokeDasharray="3,2" />
          <ellipse cx="36" cy="9" rx="14" ry="7" fill="#ca8a04" />
        </g>
      </svg>

      {/* Realistic Glass Shine & Edge Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
      <div className="absolute bottom-1.5 inset-x-0 text-center pointer-events-none">
        <span className="text-[11px] font-black tracking-widest text-[#facc15] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
          ROULETTE
        </span>
      </div>
    </div>
  );
};

// High-definition Vector Graphic Poster for Plinko
export const PlinkoGamePoster: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#0f0926] via-[#1a0f3d] to-[#080514] flex items-center justify-center select-none">
      {/* Background Neon Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(168,85,247,0.35)_0%,_transparent_75%)]" />

      {/* SVG Plinko Pyramid Pegboard Artwork */}
      <svg
        viewBox="0 0 200 200"
        className="w-[94%] h-[94%] drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="neonWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <radialGradient id="goldBall" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fef08a" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#92400e" />
          </radialGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Angled Glowing Wall Rails */}
        <line x1="82" y1="18" x2="16" y2="155" stroke="url(#neonWall)" strokeWidth="4" strokeLinecap="round" filter="url(#neonGlow)" />
        <line x1="118" y1="18" x2="184" y2="155" stroke="url(#neonWall)" strokeWidth="4" strokeLinecap="round" filter="url(#neonGlow)" />

        {/* Top Drop Chute Funnel */}
        <circle cx="100" cy="18" r="7" fill="#facc15" stroke="#ffffff" strokeWidth="1.5" />

        {/* Pyramid of Pegs */}
        {[
          // Row 1 (3 pegs)
          { x: 84, y: 38 }, { x: 100, y: 38 }, { x: 116, y: 38 },
          // Row 2 (4 pegs)
          { x: 76, y: 56 }, { x: 92, y: 56 }, { x: 108, y: 56 }, { x: 124, y: 56 },
          // Row 3 (5 pegs)
          { x: 68, y: 74 }, { x: 84, y: 74 }, { x: 100, y: 74 }, { x: 116, y: 74 }, { x: 132, y: 74 },
          // Row 4 (6 pegs)
          { x: 60, y: 92 }, { x: 76, y: 92 }, { x: 92, y: 92 }, { x: 108, y: 92 }, { x: 124, y: 92 }, { x: 140, y: 92 },
          // Row 5 (7 pegs)
          { x: 52, y: 110 }, { x: 68, y: 110 }, { x: 84, y: 110 }, { x: 100, y: 110 }, { x: 116, y: 110 }, { x: 132, y: 110 }, { x: 148, y: 110 },
          // Row 6 (8 pegs)
          { x: 44, y: 128 }, { x: 60, y: 128 }, { x: 76, y: 128 }, { x: 92, y: 128 }, { x: 108, y: 128 }, { x: 124, y: 128 }, { x: 140, y: 128 }, { x: 156, y: 128 },
          // Row 7 (9 pegs)
          { x: 36, y: 146 }, { x: 52, y: 146 }, { x: 68, y: 146 }, { x: 84, y: 146 }, { x: 100, y: 146 }, { x: 116, y: 146 }, { x: 132, y: 146 }, { x: 148, y: 146 }, { x: 164, y: 146 },
        ].map((peg, idx) => (
          <circle
            key={idx}
            cx={peg.x}
            cy={peg.y}
            r="3"
            fill="#ffffff"
            stroke="#a855f7"
            strokeWidth="0.8"
            filter="drop-shadow(0 0 3px #c084fc)"
          />
        ))}

        {/* Falling Golden Balls with Trails */}
        {/* Ball 1 - High speed drop */}
        <path d="M 100 24 Q 102 46 116 66" stroke="#facc15" strokeWidth="2" strokeDasharray="2,3" opacity="0.6" fill="none" />
        <circle cx="116" cy="66" r="5.5" fill="url(#goldBall)" filter="url(#neonGlow)" />

        {/* Ball 2 - Near Jackpot Bucket */}
        <path d="M 116 70 Q 128 100 100 138" stroke="#facc15" strokeWidth="2" strokeDasharray="2,3" opacity="0.6" fill="none" />
        <circle cx="100" cy="138" r="6" fill="url(#goldBall)" filter="url(#neonGlow)" />

        {/* Bottom Multiplier Bucket Slots */}
        {[
          { label: '0.2x', x: 22, color: '#2563eb' },
          { label: '1x', x: 54, color: '#dc2626' },
          { label: '50x', x: 86, color: '#0284c7', isJackpot: true },
          { label: '1x', x: 118, color: '#dc2626' },
          { label: '0.2x', x: 150, color: '#2563eb' },
        ].map((bucket, i) => (
          <g key={i}>
            <rect
              x={bucket.x}
              y="162"
              width="28"
              height="16"
              rx="4"
              fill={bucket.color}
              stroke={bucket.isJackpot ? '#38bdf8' : '#ffffff'}
              strokeWidth={bucket.isJackpot ? '1.5' : '0.8'}
              filter={bucket.isJackpot ? 'drop-shadow(0 0 6px #38bdf8)' : ''}
            />
            <text
              x={bucket.x + 14}
              y="173"
              fill="#ffffff"
              fontSize="7.5"
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="sans-serif"
            >
              {bucket.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Dark Overlay & Title */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
      <div className="absolute bottom-1.5 inset-x-0 text-center pointer-events-none">
        <span className="text-[11px] font-black tracking-widest text-[#e879f9] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
          PLINKO
        </span>
      </div>
    </div>
  );
};

// High-definition Live Dealer Poster for 7 Up 7 Down
import dealerImg from '../../assets/images/seven_up_down_dealer_1787630046539.jpg';
import teenPattiDealerImg from '../../assets/images/teen_patti_dealer_idle_1787668229835.jpg';

export const SevenUpDownGamePoster: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0c13] flex items-center justify-center select-none group">
      {/* Real Live Dealer Girl Image */}
      <img
        src={dealerImg}
        alt="7 Up 7 Down Live Dealer"
        className="w-full h-full object-cover object-top transition duration-500 group-hover:scale-105 filter brightness-95"
      />

      {/* Luxury Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />

      {/* Floating 7 Up Down Badge with 3 boxes */}
      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-amber-400/40 text-[9px] font-black text-amber-300 font-mono flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        LIVE 12X
      </div>

      {/* Bottom Title Bar with A-6, [7], 8-K */}
      <div className="absolute bottom-1.5 inset-x-0 text-center pointer-events-none px-2">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <span className="px-1.5 py-0.5 bg-blue-900/80 border border-blue-400 text-[8px] font-black rounded text-blue-200 font-mono">
            A-6
          </span>
          <span className="px-1.5 py-0.5 bg-red-900/90 border border-red-500 text-[8px] font-black rounded text-amber-300 font-mono">
            7
          </span>
          <span className="px-1.5 py-0.5 bg-blue-900/80 border border-blue-400 text-[8px] font-black rounded text-blue-200 font-mono">
            8-K
          </span>
        </div>
        <span className="text-[11px] font-black tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
          7 UP 7 DOWN
        </span>
      </div>
    </div>
  );
};

// High-definition Vector Graphic Poster for Ludo Supreme / Ludo King (Image 1)
export const LudoGamePoster: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#0e3b8a] via-[#092a6b] to-[#041338] flex items-center justify-center select-none group">
      {/* Background Lighting & Cosmic Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(56,189,248,0.35)_0%,_transparent_75%)]" />

      {/* SVG 3D Artwork for Ludo King */}
      <svg
        viewBox="0 0 200 200"
        className="w-[94%] h-[94%] drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gold Crown Gradient */}
          <linearGradient id="ludoCrownGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fde047" />
            <stop offset="65%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>

          {/* 3D Blue Token */}
          <radialGradient id="ludoBluePawn" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="40%" stopColor="#2563eb" />
            <stop offset="85%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#172554" />
          </radialGradient>

          {/* 3D Yellow Token */}
          <radialGradient id="ludoYellowPawn" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="85%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#713f12" />
          </radialGradient>

          {/* 3D Red Token */}
          <radialGradient id="ludoRedPawn" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="40%" stopColor="#dc2626" />
            <stop offset="85%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* 3D Green Token */}
          <radialGradient id="ludoGreenPawn" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="40%" stopColor="#16a34a" />
            <stop offset="85%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#052e16" />
          </radialGradient>

          {/* 3D Dice Shadow */}
          <filter id="diceShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#000000" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* --- Top Crown & LUDO KING Typography (Matching Image 1) --- */}
        {/* Royal Gold Crown with Red Gems on top-left */}
        <g transform="translate(42, 28) rotate(-15)">
          <path
            d="M -16 6 L -20 -10 L -9 -3 L 0 -14 L 9 -3 L 20 -10 L 16 6 Z"
            fill="url(#ludoCrownGrad)"
            stroke="#ffffff"
            strokeWidth="1"
          />
          {/* Base Rim */}
          <ellipse cx="0" cy="6" rx="16" ry="3.5" fill="url(#ludoCrownGrad)" stroke="#854d0e" strokeWidth="0.8" />
          {/* Ruby Gems */}
          <circle cx="-10" cy="6" r="1.8" fill="#dc2626" />
          <circle cx="0" cy="6" r="2.2" fill="#2563eb" />
          <circle cx="10" cy="6" r="1.8" fill="#dc2626" />
          <circle cx="0" cy="-14" r="1.5" fill="#fef08a" />
        </g>

        {/* "KING" text & small crown on top right */}
        <g transform="translate(162, 28)">
          <path d="M -6 0 L -8 -6 L -3 -3 L 0 -8 L 3 -3 L 8 -6 L 6 0 Z" fill="url(#ludoCrownGrad)" />
          <text x="0" y="9" fill="#facc15" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
            KING
          </text>
        </g>

        {/* LUDO Bubble Letters: L (Blue), U (Red), D (Green), O (Yellow) */}
        <g transform="translate(100, 52)">
          {/* L */}
          <circle cx="-45" cy="0" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" filter="drop-shadow(0 3px 5px rgba(0,0,0,0.5))" />
          <text x="-45" y="5" fill="#2563eb" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">L</text>

          {/* U */}
          <circle cx="-15" cy="0" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" filter="drop-shadow(0 3px 5px rgba(0,0,0,0.5))" />
          <text x="-15" y="5" fill="#dc2626" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">U</text>

          {/* D */}
          <circle cx="15" cy="0" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" filter="drop-shadow(0 3px 5px rgba(0,0,0,0.5))" />
          <text x="15" y="5" fill="#16a34a" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">D</text>

          {/* O */}
          <circle cx="45" cy="0" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" filter="drop-shadow(0 3px 5px rgba(0,0,0,0.5))" />
          <text x="45" y="5" fill="#eab308" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">O</text>
        </g>

        {/* --- Perspective Ludo Board (Center) --- */}
        <g transform="translate(100, 118)">
          {/* Board Floor Plate */}
          <polygon
            points="-65,-22 65,-22 80,32 -80,32"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="1.5"
            filter="drop-shadow(0 8px 12px rgba(0,0,0,0.8))"
          />

          {/* 4 Colored Homes (Isometric Perspective) */}
          {/* Red (Top Left) */}
          <polygon points="-63,-20 -5,-20 -7,5 -75,5" fill="#dc2626" />
          {/* Green (Top Right) */}
          <polygon points="5,-20 63,-20 75,5 7,5" fill="#16a34a" />
          {/* Blue (Bottom Left) */}
          <polygon points="-75,5 -7,5 -10,30 -78,30" fill="#1d4ed8" />
          {/* Yellow (Bottom Right) */}
          <polygon points="7,5 75,5 78,30 10,30" fill="#eab308" />

          {/* White center tracks */}
          <polygon points="-12,-20 12,-20 16,30 -16,30" fill="#ffffff" opacity="0.9" />
          <polygon points="-78,2 78,2 80,8 -80,8" fill="#ffffff" opacity="0.9" />
        </g>

        {/* --- Center 3D Rolling Dice with 6 Dots --- */}
        <g transform="translate(100, 105)" filter="url(#diceShadow)">
          {/* Top Face */}
          <polygon points="0,-16 16,-8 0,0 -16,-8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          {/* Left Face */}
          <polygon points="-16,-8 0,0 0,18 -16,10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
          {/* Right Face */}
          <polygon points="16,-8 0,0 0,18 16,10" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />

          {/* Dots on Right Face (6 Dots) */}
          <circle cx="5" cy="3" r="1.4" fill="#18181b" />
          <circle cx="11" cy="0" r="1.4" fill="#18181b" />
          <circle cx="5" cy="8" r="1.4" fill="#18181b" />
          <circle cx="11" cy="5" r="1.4" fill="#18181b" />
          <circle cx="5" cy="13" r="1.4" fill="#18181b" />
          <circle cx="11" cy="10" r="1.4" fill="#18181b" />

          {/* Dots on Left Face (4 Dots) */}
          <circle cx="-5" cy="3" r="1.4" fill="#18181b" />
          <circle cx="-11" cy="0" r="1.4" fill="#18181b" />
          <circle cx="-5" cy="11" r="1.4" fill="#18181b" />
          <circle cx="-11" cy="8" r="1.4" fill="#18181b" />

          {/* Dot on Top Face (1 Big Red Dot) */}
          <ellipse cx="0" cy="-8" rx="2.5" ry="1.5" fill="#dc2626" />
        </g>

        {/* --- 4 Glossy 3D Gotis / Pawns (Matching Image 1) --- */}
        {/* 1. Large Blue Pawn (Foreground Left) */}
        <g transform="translate(32, 138) scale(0.95)">
          <ellipse cx="0" cy="22" rx="16" ry="6" fill="#030712" opacity="0.6" />
          {/* Cone Body */}
          <path d="M -15 20 C -12 8 -6 -6 0 -12 C 6 -6 12 8 15 20 Z" fill="url(#ludoBluePawn)" stroke="#bfdbfe" strokeWidth="0.8" />
          {/* Base Rim */}
          <ellipse cx="0" cy="20" rx="15" ry="4.5" fill="url(#ludoBluePawn)" stroke="#60a5fa" strokeWidth="0.8" />
          {/* Ball Head */}
          <circle cx="0" cy="-14" r="11" fill="url(#ludoBluePawn)" stroke="#93c5fd" strokeWidth="1" />
          <ellipse cx="-3.5" cy="-18" rx="4" ry="2.5" fill="#ffffff" opacity="0.7" transform="rotate(-20 -3.5 -18)" />
        </g>

        {/* 2. Red Pawn (Mid-ground Left) */}
        <g transform="translate(56, 102) scale(0.68)">
          <ellipse cx="0" cy="22" rx="15" ry="5" fill="#030712" opacity="0.5" />
          <path d="M -14 20 C -11 8 -5 -6 0 -12 C 5 -6 11 8 14 20 Z" fill="url(#ludoRedPawn)" stroke="#fecaca" strokeWidth="0.8" />
          <ellipse cx="0" cy="20" rx="14" ry="4" fill="url(#ludoRedPawn)" stroke="#f87171" strokeWidth="0.8" />
          <circle cx="0" cy="-14" r="10" fill="url(#ludoRedPawn)" stroke="#fca5a5" strokeWidth="1" />
          <ellipse cx="-3" cy="-18" rx="3.5" ry="2" fill="#ffffff" opacity="0.7" />
        </g>

        {/* 3. Green Pawn (Mid-ground Right) */}
        <g transform="translate(146, 102) scale(0.68)">
          <ellipse cx="0" cy="22" rx="15" ry="5" fill="#030712" opacity="0.5" />
          <path d="M -14 20 C -11 8 -5 -6 0 -12 C 5 -6 11 8 14 20 Z" fill="url(#ludoGreenPawn)" stroke="#bbf7d0" strokeWidth="0.8" />
          <ellipse cx="0" cy="20" rx="14" ry="4" fill="url(#ludoGreenPawn)" stroke="#4ade80" strokeWidth="0.8" />
          <circle cx="0" cy="-14" r="10" fill="url(#ludoGreenPawn)" stroke="#86efac" strokeWidth="1" />
          <ellipse cx="-3" cy="-18" rx="3.5" ry="2" fill="#ffffff" opacity="0.7" />
        </g>

        {/* 4. Large Yellow Pawn (Foreground Right) */}
        <g transform="translate(168, 138) scale(0.95)">
          <ellipse cx="0" cy="22" rx="16" ry="6" fill="#030712" opacity="0.6" />
          <path d="M -15 20 C -12 8 -6 -6 0 -12 C 6 -6 12 8 15 20 Z" fill="url(#ludoYellowPawn)" stroke="#fef9c3" strokeWidth="0.8" />
          <ellipse cx="0" cy="20" rx="15" ry="4.5" fill="url(#ludoYellowPawn)" stroke="#fde047" strokeWidth="0.8" />
          <circle cx="0" cy="-14" r="11" fill="url(#ludoYellowPawn)" stroke="#fef08a" strokeWidth="1" />
          <ellipse cx="-3.5" cy="-18" rx="4" ry="2.5" fill="#ffffff" opacity="0.8" transform="rotate(-20 -3.5 -18)" />
        </g>
      </svg>

      {/* Luxury Gradient Overlay & Title */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />
      <div className="absolute bottom-1.5 inset-x-0 text-center pointer-events-none px-2">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span className="px-1.5 py-0.2 bg-blue-600/90 border border-blue-400 text-[8px] font-black rounded text-white font-mono">
            MULTIPLAYER
          </span>
          <span className="px-1.5 py-0.2 bg-amber-500/90 border border-amber-300 text-[8px] font-black rounded text-black font-mono">
            LIVE 4P
          </span>
        </div>
        <span className="text-[11px] font-black tracking-wider text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
          LUDO SUPREME
        </span>
      </div>
    </div>
  );
};

// High-definition Vector Graphic Poster for Chess Grandmaster (Image 2)
export const ChessGamePoster: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#0c0d12] via-[#141722] to-[#050608] flex items-center justify-center select-none group">
      {/* Background Studio Lighting Spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,_rgba(255,255,255,0.22)_0%,_transparent_70%)]" />

      {/* SVG 3D Chess Masterpiece (Image 2 Setup) */}
      <svg
        viewBox="0 0 200 200"
        className="w-[94%] h-[94%] drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* White Piece 3D Ivory Gradient */}
          <linearGradient id="posterWhitePiece" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fdfbf7" />
            <stop offset="70%" stopColor="#e5ded2" />
            <stop offset="100%" stopColor="#b8aa96" />
          </linearGradient>

          {/* Black Piece 3D Obsidian Gradient */}
          <linearGradient id="posterBlackPiece" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#474c59" />
            <stop offset="25%" stopColor="#22252e" />
            <stop offset="70%" stopColor="#101116" />
            <stop offset="100%" stopColor="#050608" />
          </linearGradient>

          <filter id="chessFloorShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.85" />
          </filter>
        </defs>

        {/* --- 3D Chequered Chessboard Floor in Perspective --- */}
        <polygon
          points="20,110 180,110 200,195 0,195"
          fill="#1e2330"
          filter="url(#chessFloorShadow)"
        />

        {/* Chessboard Black & White Tiles */}
        <polygon points="20,110 60,110 50,148 0,148" fill="#e2e8f0" />
        <polygon points="60,110 100,110 95,148 50,148" fill="#181a22" />
        <polygon points="100,110 140,110 145,148 95,148" fill="#e2e8f0" />
        <polygon points="140,110 180,110 200,148 145,148" fill="#181a22" />

        <polygon points="0,148 50,148 40,195 0,195" fill="#181a22" />
        <polygon points="50,148 95,148 90,195 40,195" fill="#e2e8f0" />
        <polygon points="95,148 145,148 150,195 90,195" fill="#181a22" />
        <polygon points="145,148 200,148 200,195 150,195" fill="#e2e8f0" />

        {/* --- PIECE 1: Background Left White Bishop --- */}
        <g transform="translate(54, 88) scale(0.68)">
          <ellipse cx="0" cy="38" rx="16" ry="6" fill="#000000" opacity="0.4" />
          {/* Pedestal */}
          <path d="M -15 36 C -12 32 12 32 15 36 L 12 42 L -12 42 Z" fill="url(#posterWhitePiece)" stroke="#786650" strokeWidth="0.8" />
          {/* Stem */}
          <path d="M -9 33 C -10 20 -8 8 0 0 C 8 8 10 20 9 33 Z" fill="url(#posterWhitePiece)" stroke="#786650" strokeWidth="0.8" />
          {/* Collar */}
          <ellipse cx="0" cy="0" rx="11" ry="3" fill="url(#posterWhitePiece)" stroke="#786650" strokeWidth="0.8" />
          {/* Mitre */}
          <path d="M -10 0 C -12 -12 0 -24 0 -24 C 0 -24 12 -12 10 0 Z" fill="url(#posterWhitePiece)" stroke="#786650" strokeWidth="0.8" />
          {/* Teardrop Ball Finial */}
          <circle cx="0" cy="-27" r="3.5" fill="url(#posterWhitePiece)" stroke="#786650" strokeWidth="0.8" />
        </g>

        {/* --- PIECE 2: Background Right White Knight (Horse with Mane) --- */}
        <g transform="translate(158, 92) scale(0.68)">
          <ellipse cx="0" cy="38" rx="16" ry="6" fill="#000000" opacity="0.4" />
          <path d="M -15 36 C -12 32 12 32 15 36 L 12 42 L -12 42 Z" fill="url(#posterWhitePiece)" stroke="#786650" strokeWidth="0.8" />
          {/* Horse Silhouette */}
          <path
            d="M -12 34 C -14 20 -22 10 -22 0 C -22 -14 -12 -28 0 -30 C 4 -36 10 -38 12 -34 C 15 -34 24 -24 24 -14 C 24 -2 15 6 14 14 C 12 24 14 30 12 34 Z"
            fill="url(#posterWhitePiece)"
            stroke="#786650"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Mane ridges */}
          <path d="M -18 -8 C -22 -2 -22 6 -18 14 M -20 8 C -24 14 -22 22 -16 28" stroke="#786650" strokeWidth="1" strokeLinecap="round" />
          {/* Eye */}
          <circle cx="12" cy="-18" r="2.2" fill="#2d251d" />
        </g>

        {/* --- PIECE 3: Center Fallen Glossy Obsidian Black King (Horizontal on Floor) --- */}
        <g transform="translate(108, 138) rotate(78) scale(0.85)">
          <ellipse cx="0" cy="42" rx="20" ry="7" fill="#000000" opacity="0.6" />
          {/* Pedestal */}
          <path d="M -18 38 C -14 33 14 33 18 38 L 15 45 L -15 45 Z" fill="url(#posterBlackPiece)" stroke="#94a3b8" strokeWidth="1" />
          {/* Trunk */}
          <path d="M -12 35 C -14 18 -12 0 -14 -14 L 14 -14 C 12 0 14 18 12 35 Z" fill="url(#posterBlackPiece)" stroke="#94a3b8" strokeWidth="1" />
          {/* Crown */}
          <path d="M -14 -14 C -16 -32 0 -38 0 -38 C 0 -38 16 -32 14 -14 Z" fill="url(#posterBlackPiece)" stroke="#94a3b8" strokeWidth="1" />
          {/* Cross */}
          <rect x="-2.5" y="-52" width="5" height="15" fill="url(#posterBlackPiece)" stroke="#cbd5e1" strokeWidth="1" rx="1" />
          <rect x="-7" y="-48" width="14" height="4.5" fill="url(#posterBlackPiece)" stroke="#cbd5e1" strokeWidth="1" rx="1" />
          {/* High Specular Gloss Reflection */}
          <path d="M -6 30 C -8 15 -8 2 -6 -10" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
        </g>

        {/* --- PIECE 4: Center Foreground Tall White King (Royalty with Cross) --- */}
        <g transform="translate(108, 126) scale(1.05)">
          <ellipse cx="0" cy="44" rx="22" ry="7" fill="#000000" opacity="0.55" />
          {/* Base Tier */}
          <path
            d="M -22 38 C -16 32 16 32 22 38 L 18 45 C 12 46 -12 46 -18 45 Z"
            fill="url(#posterWhitePiece)"
            stroke="#5c4d3c"
            strokeWidth="1.2"
          />
          {/* Waist Column */}
          <path
            d="M -15 36 C -18 16 -12 -5 -16 -22 L 16 -22 C 12 -5 18 16 15 36 Z"
            fill="url(#posterWhitePiece)"
            stroke="#5c4d3c"
            strokeWidth="1.2"
          />
          {/* Specular Highlight Streak */}
          <path d="M -8 30 C -10 12 -8 -4 -10 -18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
          {/* Collar */}
          <ellipse cx="0" cy="-22" rx="17" ry="4" fill="url(#posterWhitePiece)" stroke="#5c4d3c" strokeWidth="1.2" />

          {/* King Crown Dome */}
          <path
            d="M -16 -24 C -18 -42 0 -48 0 -48 C 0 -48 18 -42 16 -24 Z"
            fill="url(#posterWhitePiece)"
            stroke="#5c4d3c"
            strokeWidth="1.2"
          />
          {/* King Cross Finial */}
          <rect x="-3" y="-62" width="6" height="15" fill="url(#posterWhitePiece)" stroke="#5c4d3c" strokeWidth="1.2" rx="1" />
          <rect x="-8" y="-57" width="16" height="5" fill="url(#posterWhitePiece)" stroke="#5c4d3c" strokeWidth="1.2" rx="1" />
          <circle cx="0" cy="-62" r="2" fill="#ffffff" />
        </g>

        {/* --- PIECE 5: Left Foreground Glossy Black Pawn --- */}
        <g transform="translate(30, 152) scale(0.85)">
          <ellipse cx="0" cy="22" rx="16" ry="6" fill="#000000" opacity="0.6" />
          <path d="M -15 20 C -10 6 -4 -4 0 -6 C 4 -4 10 6 15 20 Z" fill="url(#posterBlackPiece)" stroke="#94a3b8" strokeWidth="1" />
          <ellipse cx="0" cy="-6" rx="10" ry="2.5" fill="url(#posterBlackPiece)" stroke="#94a3b8" strokeWidth="1" />
          <circle cx="0" cy="-20" r="11" fill="url(#posterBlackPiece)" stroke="#94a3b8" strokeWidth="1" />
          {/* Sphere Specular Reflection */}
          <ellipse cx="-3" cy="-24" rx="4" ry="2.5" fill="#ffffff" opacity="0.6" transform="rotate(-20 -3 -24)" />
        </g>
      </svg>

      {/* Luxury Vignette & Title */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/25 pointer-events-none" />
      <div className="absolute bottom-1.5 inset-x-0 text-center pointer-events-none px-2">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-400/40 text-[8px] font-black rounded text-amber-300 font-mono">
            PVP & BOT
          </span>
          <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-400/40 text-[8px] font-black rounded text-emerald-300 font-mono">
            90% WIN
          </span>
        </div>
        <span className="text-[11px] font-black tracking-wider text-[#f5c443] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
          CHESS MASTER
        </span>
      </div>
    </div>
  );
};

// High-definition Live Dealer Poster for Teen Patti
export const TeenPattiGamePoster: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#090b14] flex items-center justify-center select-none group">
      {/* Real Live Dealer Girl Image */}
      <img
        src={teenPattiDealerImg}
        alt="Live Dealer Teen Patti"
        className="w-full h-full object-cover object-center transition duration-500 group-hover:scale-105 filter brightness-95"
      />

      {/* Luxury Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/30 pointer-events-none" />

      {/* Floating Live Badge */}
      <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-red-500/50 text-[9px] font-black text-red-300 font-mono flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
        LIVE DEALER
      </div>

      {/* Bottom Title Bar with Player A vs Player B Cards */}
      <div className="absolute bottom-1.5 inset-x-0 text-center pointer-events-none px-2">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span className="px-1.5 py-0.2 bg-blue-600/90 border border-blue-400 text-[8px] font-black rounded text-white font-mono">
            Player A
          </span>
          <span className="text-[8px] font-black text-amber-400">VS</span>
          <span className="px-1.5 py-0.2 bg-red-600/90 border border-red-400 text-[8px] font-black rounded text-white font-mono">
            Player B
          </span>
        </div>
        <span className="text-[11px] font-black tracking-wider text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
          TEEN PATTI
        </span>
      </div>
    </div>
  );
};




