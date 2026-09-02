import React from 'react';

interface ChessPieceProps {
  type: string; // 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
  color: 'w' | 'b';
  className?: string;
}

/**
 * High-Definition 3D Realistic Vector Chess Pieces
 * Designed to strictly match realistic tournament chess pieces (Image 2):
 * - White: Royal Ivory / Pearl White with glossy highlights and subtle bevel shadows.
 * - Black: Obsidian / Metallic Black with crisp chrome rim-lighting and specular shine.
 */
export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, className = 'w-full h-full p-0.5' }) => {
  const isWhite = color === 'w';

  // Unique Gradient IDs per piece instance
  const gradId = `chessGrad_${color}_${type.toLowerCase()}`;
  const rimId = `chessRim_${color}_${type.toLowerCase()}`;
  const specId = `chessSpec_${color}_${type.toLowerCase()}`;

  // Shared gradients & definitions
  const defs = (
    <defs>
      {/* Primary 3D Body Gradient */}
      <linearGradient id={gradId} x1="0.2" y1="0" x2="0.8" y2="1">
        {isWhite ? (
          <>
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fdfbf7" />
            <stop offset="60%" stopColor="#ebe4d8" />
            <stop offset="90%" stopColor="#cfc2af" />
            <stop offset="100%" stopColor="#b3a38d" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#4a4f5d" />
            <stop offset="20%" stopColor="#2c303b" />
            <stop offset="60%" stopColor="#181a20" />
            <stop offset="85%" stopColor="#0d0e12" />
            <stop offset="100%" stopColor="#050608" />
          </>
        )}
      </linearGradient>

      {/* Gloss Specular Highlight Gradient */}
      <linearGradient id={specId} x1="0" y1="0" x2="1" y2="0">
        {isWhite ? (
          <>
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#64748b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0" />
          </>
        )}
      </linearGradient>

      {/* Rim / Outline Glow Filter */}
      <linearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
        {isWhite ? (
          <>
            <stop offset="0%" stopColor="#786650" />
            <stop offset="100%" stopColor="#4a3e2e" />
          </>
        ) : (
          <>
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </>
        )}
      </linearGradient>

      {/* Soft Drop Shadow */}
      <filter id={`shadow_${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor={isWhite ? '#1e1b18' : '#000000'} floodOpacity={isWhite ? '0.35' : '0.7'} />
      </filter>
    </defs>
  );

  const strokeColor = isWhite ? '#5c4d3c' : '#94a3b8';
  const strokeWidth = isWhite ? '1.2' : '1.3';

  switch (type.toLowerCase()) {
    // 1. KING (♚ / ♔) - Royal Imperial Crown with Cross Finial & Flared Pedestal
    case 'k':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {defs}
          <g filter={`url(#shadow_${gradId})`}>
            {/* Base Pedestal (Tiered) */}
            <path
              d="M20 90 C 20 86, 25 84, 30 84 L 70 84 C 75 84, 80 86, 80 90 L 82 93 C 82 96, 78 97, 72 97 L 28 97 C 22 97, 18 96, 18 93 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Base Highlight Ring */}
            <ellipse cx="50" cy="85" rx="28" ry="3.5" fill={`url(#${specId})`} opacity={0.6} />

            {/* Waist Column */}
            <path
              d="M32 84 C 36 68, 38 52, 33 42 L 67 42 C 62 52, 64 68, 68 84 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Column specular curve */}
            <path d="M40 80 C 42 66, 43 54, 40 45" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity={isWhite ? 0.7 : 0.4} />

            {/* Tiered Collar */}
            <ellipse cx="50" cy="42" rx="22" ry="4.5" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <ellipse cx="50" cy="40" rx="19" ry="3.5" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />

            {/* King Crown Dome */}
            <path
              d="M30 39 C 27 26, 32 18, 50 18 C 68 18, 73 26, 70 39 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Crown Ribs & Petals */}
            <path d="M50 18 L 50 39" stroke={strokeColor} strokeWidth="1" opacity={0.6} />
            <path d="M38 21 C 42 27, 43 33, 42 39" stroke={strokeColor} strokeWidth="1" opacity={0.6} />
            <path d="M62 21 C 58 27, 57 33, 58 39" stroke={strokeColor} strokeWidth="1" opacity={0.6} />

            {/* Royal Cross Finial on Top */}
            <rect x="47.5" y="6" width="5" height="13" rx="1" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <rect x="43" y="9.5" width="14" height="4.5" rx="1" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="50" cy="6" r="2" fill={isWhite ? '#ffffff' : '#e2e8f0'} />
          </g>
        </svg>
      );

    // 2. QUEEN (♛ / ♕) - Graceful Curvature, Flared Corona with Pearls
    case 'q':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {defs}
          <g filter={`url(#shadow_${gradId})`}>
            {/* Base Pedestal */}
            <path
              d="M22 90 C 22 86, 26 84, 31 84 L 69 84 C 74 84, 78 86, 78 90 L 80 93 C 80 96, 76 97, 70 97 L 30 97 C 24 97, 20 96, 20 93 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <ellipse cx="50" cy="85" rx="26" ry="3.5" fill={`url(#${specId})`} opacity={0.6} />

            {/* Tapered Stem Column */}
            <path
              d="M33 84 C 37 68, 39 52, 35 44 L 65 44 C 61 52, 63 68, 67 84 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <path d="M41 80 C 43 66, 44 54, 42 46" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity={isWhite ? 0.7 : 0.4} />

            {/* Collar */}
            <ellipse cx="50" cy="44" rx="20" ry="4" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />

            {/* Queen Corona Crown */}
            <path
              d="M28 25 L 34 44 L 66 44 L 72 25 L 61 34 L 50 18 L 39 34 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />

            {/* Pearl Finials */}
            <circle cx="28" cy="23" r="3" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="39" cy="32" r="2.5" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="50" cy="16" r="3.5" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="61" cy="32" r="2.5" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="72" cy="23" r="3" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
          </g>
        </svg>
      );

    // 3. BISHOP (♝ / ♗) - Slender Mitre with Teardrop Cut & Ball Finial
    case 'b':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {defs}
          <g filter={`url(#shadow_${gradId})`}>
            {/* Base Pedestal */}
            <path
              d="M24 90 C 24 86, 28 84, 33 84 L 67 84 C 72 84, 76 86, 76 90 L 78 93 C 78 96, 74 97, 68 97 L 32 97 C 26 97, 22 96, 22 93 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <ellipse cx="50" cy="85" rx="24" ry="3.2" fill={`url(#${specId})`} opacity={0.6} />

            {/* Stem */}
            <path
              d="M35 84 C 38 70, 40 56, 37 46 L 63 46 C 60 56, 62 70, 65 84 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />

            {/* Collar Ring */}
            <ellipse cx="50" cy="46" rx="18" ry="4" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />

            {/* Mitre Body */}
            <path
              d="M33 45 C 30 32, 38 18, 50 18 C 62 18, 70 32, 67 45 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />

            {/* Bishop Notch / Cut (Canonical) */}
            <path
              d="M48 24 L 59 33 L 53 35 L 45 28 Z"
              fill={isWhite ? '#5c4d3c' : '#050608'}
              stroke={strokeColor}
              strokeWidth="0.8"
            />

            {/* Ball Finial on Top */}
            <circle cx="50" cy="14" r="4" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="48.5" cy="12.5" r="1.2" fill="#ffffff" opacity={0.8} />
          </g>
        </svg>
      );

    // 4. KNIGHT (♞ / ♘) - Highly Sculpted Horse with Curved Neck, Mane Ridges, Alert Ears & Muzzle
    case 'n':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {defs}
          <g filter={`url(#shadow_${gradId})`}>
            {/* Base Pedestal */}
            <path
              d="M24 90 C 24 86, 28 84, 33 84 L 67 84 C 72 84, 76 86, 76 90 L 78 93 C 78 96, 74 97, 68 97 L 32 97 C 26 97, 22 96, 22 93 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <ellipse cx="50" cy="85" rx="24" ry="3.2" fill={`url(#${specId})`} opacity={0.6} />

            {/* Sculpted Horse Profile */}
            <path
              d="M 33 84 C 33 72 26 62 25 54 C 24 46 29 38 31 38 C 30 35 30 30 33 26 C 36 21 42 16 48 16 C 50 12 55 10 57 12 C 59 14 58 18 60 18 C 65 18 73 24 74 34 C 75 42 66 48 64 54 C 61 62 65 72 67 84 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />

            {/* Mane Serrations */}
            <path
              d="M 36 24 C 33 28 32 34 33 40 M 31 36 C 27 42 27 48 29 55 M 27 50 C 25 58 26 68 33 78"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Horse Ear */}
            <path
              d="M 52 14 L 56 8 L 59 14 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />

            {/* Horse Eye */}
            <circle cx="61" cy="27" r="2.5" fill={isWhite ? '#2e261d' : '#f8fafc'} stroke={strokeColor} strokeWidth="0.8" />
            <circle cx="60" cy="26" r="0.8" fill="#ffffff" />

            {/* Muzzle & Nostril */}
            <path d="M 72 37 C 70 38 67 38 65 37" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" />
            <ellipse cx="69" cy="33" rx="1.2" ry="1.8" fill={strokeColor} />
            
            {/* Jaw Contour Highlight */}
            <path d="M 56 46 C 60 44 63 39 63 34" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity={isWhite ? 0.7 : 0.35} />
          </g>
        </svg>
      );

    // 5. ROOK (♜ / ♖) - Solid Castle Battlement with 4 Crenellations & Arrow Slits
    case 'r':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {defs}
          <g filter={`url(#shadow_${gradId})`}>
            {/* Base Pedestal */}
            <path
              d="M24 90 C 24 86, 28 84, 33 84 L 67 84 C 72 84, 76 86, 76 90 L 78 93 C 78 96, 74 97, 68 97 L 32 97 C 26 97, 22 96, 22 93 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <ellipse cx="50" cy="85" rx="24" ry="3.2" fill={`url(#${specId})`} opacity={0.6} />

            {/* Sturdy Castle Tower Body */}
            <path
              d="M34 84 L 37 38 L 63 38 L 66 84 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Tower highlight line */}
            <line x1="42" y1="42" x2="40" y2="80" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity={isWhite ? 0.7 : 0.35} />

            {/* Mid Rim Collar */}
            <rect x="33" y="38" width="34" height="6" rx="1.5" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />

            {/* Castle Battlement with Crenellations / Embrasures */}
            <path
              d="M 30 38 L 30 20 L 37 20 L 37 26 L 45 26 L 45 20 L 55 20 L 55 26 L 63 26 L 63 20 L 70 20 L 70 38 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
          </g>
        </svg>
      );

    // 6. PAWN (♟ / ♙) - Spherical Ball Top, Collar Rim, Conical Trunk & Base
    case 'p':
    default:
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {defs}
          <g filter={`url(#shadow_${gradId})`}>
            {/* Base Pedestal */}
            <path
              d="M26 90 C 26 86, 30 84, 35 84 L 65 84 C 70 84, 74 86, 74 90 L 76 93 C 76 96, 72 97, 66 97 L 34 97 C 28 97, 24 96, 24 93 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <ellipse cx="50" cy="85" rx="21" ry="3" fill={`url(#${specId})`} opacity={0.6} />

            {/* Conical Trunk Body */}
            <path
              d="M37 84 C 40 68, 42 54, 40 48 L 60 48 C 58 54, 60 68, 63 84 Z"
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line x1="44" y1="52" x2="42" y2="80" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity={isWhite ? 0.7 : 0.35} />

            {/* Neck Collar Rim */}
            <ellipse cx="50" cy="48" rx="16" ry="3.5" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />

            {/* Perfect Spherical Head Ball */}
            <circle cx="50" cy="30" r="15" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={strokeWidth} />

            {/* 3D Sphere Light Reflection Specular */}
            <ellipse cx="46" cy="24" rx="5" ry="3" fill="#ffffff" opacity={isWhite ? 0.85 : 0.55} transform="rotate(-25 46 24)" />
          </g>
        </svg>
      );
  }
};
