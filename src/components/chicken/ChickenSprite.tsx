import React from 'react';

interface ChickenSpriteProps {
  state: 'idle' | 'hopping' | 'crashed' | 'won';
  className?: string;
  size?: number;
}

export const ChickenSprite: React.FC<ChickenSpriteProps> = ({
  state,
  className = '',
  size = 84,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      {state === 'crashed' && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
          <div className="absolute animate-feather-top text-2xl drop-shadow-md">🪶</div>
          <div className="absolute animate-feather-tl text-2xl drop-shadow-md">🪶</div>
          <div className="absolute animate-feather-tr text-3xl drop-shadow-lg">🪶</div>
          <div className="absolute animate-feather-left text-xl drop-shadow-md">🪶</div>
          <div className="absolute animate-feather-right text-2xl drop-shadow-md">🪶</div>
          <div className="absolute animate-feather-bl text-xl drop-shadow-md">🪶</div>
          <div className="absolute animate-feather-br text-2xl drop-shadow-md">🪶</div>

          <div className="absolute animate-feather-top text-3xl drop-shadow-xl" style={{ animationDelay: '0.05s' }}>🍗</div>
          <div className="absolute -top-6 -right-6 animate-ping text-3xl opacity-90">💥</div>
          <div className="absolute -bottom-4 -left-4 animate-pulse text-2xl opacity-80">💨</div>

          <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 animate-bounce">
            <span className="text-yellow-400 font-bold text-base drop-shadow animate-spin">⭐</span>
            <span className="text-amber-300 font-bold text-lg drop-shadow">💫</span>
            <span className="text-yellow-400 font-bold text-sm drop-shadow">✨</span>
          </div>
        </div>
      )}

      {state === 'hopping' && (
        <>
          <div className="absolute -top-2 -left-2 opacity-80 text-xs animate-pulse">🪶</div>
          <div className="absolute bottom-0 -left-1 opacity-70 text-[10px]">💨</div>
        </>
      )}

      {state === 'won' && (
        <>
          <div className="absolute -top-3 -right-2 animate-bounce text-yellow-300 text-sm">✨</div>
          <div className="absolute -top-4 -left-2 animate-ping text-amber-400 text-xs">⭐</div>
          <div className="absolute -top-6 left-1 text-emerald-400 font-black text-xs">👑</div>
        </>
      )}

      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full drop-shadow-md transition-transform duration-200 ${
          state === 'idle'
            ? 'animate-[bounce_2.5s_infinite]'
            : state === 'hopping'
            ? 'scale-110 -translate-y-1.5'
            : state === 'crashed'
            ? 'rotate-12 scale-95 translate-y-1'
            : 'scale-110 animate-[pulse_1s_infinite]'
        }`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="48" cy="90" rx="26" ry="6" fill="rgba(0,0,0,0.35)" />

        {state !== 'crashed' ? (
          <g>
            <path d="M36 78 L34 88 M34 88 L26 89 M34 88 L34 92 M34 88 L40 90" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M58 78 L60 88 M60 88 L54 90 M60 88 L60 92 M60 88 L68 89" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : (
          <g>
            <path d="M34 76 L22 86 M22 86 L14 84 M22 86 L22 92" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
            <path d="M62 76 L76 86 M76 86 L84 84 M76 86 L76 92" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
          </g>
        )}

        <path d="M18 54 C10 46, 12 36, 24 40 C14 30, 24 22, 34 32" fill={state === 'crashed' ? '#E5E7EB' : '#F3F4F6'} stroke="#18181B" strokeWidth="3.5" strokeLinejoin="round" />

        <path d="M32 30 C46 22, 70 28, 76 46 C82 62, 78 78, 56 82 C34 84, 18 72, 22 52 C24 42, 26 34, 32 30 Z" fill={state === 'crashed' ? '#E5E7EB' : '#FFFFFF'} stroke="#18181B" strokeWidth="3.8" />

        <path d="M30 52 C36 48, 48 50, 52 60 C46 68, 34 68, 28 60 Z" fill={state === 'crashed' ? '#D1D5DB' : '#F3F4F6'} stroke="#18181B" strokeWidth="2.5" />

        {/* Comb / Crest on Top */}
        <path d="M48 24 C44 14, 52 10, 56 16 C60 8, 70 12, 68 22 Z" fill={state === 'crashed' ? '#991B1B' : '#EF4444'} stroke="#18181B" strokeWidth="3" />

        {/* Wattle under beak */}
        <path d="M74 56 C74 63, 79 64, 80 58 Z" fill="#DC2626" stroke="#18181B" strokeWidth="2" />

        {/* Eyes: Money eyes ($) when won, X eyes when crashed, cartoon round eyes when idle/hopping */}
        {state === 'won' ? (
          <g>
            <circle cx="56" cy="38" r="11" fill="#FEF08A" stroke="#18181B" strokeWidth="3" />
            <text x="56" y="44" fontSize="14" fontWeight="900" fill="#15803D" textAnchor="middle" fontFamily="sans-serif">$</text>
            <circle cx="76" cy="39" r="10" fill="#FEF08A" stroke="#18181B" strokeWidth="3" />
            <text x="76" y="45" fontSize="13" fontWeight="900" fill="#15803D" textAnchor="middle" fontFamily="sans-serif">$</text>
          </g>
        ) : state === 'crashed' ? (
          <g>
            <circle cx="56" cy="38" r="12" fill="#FEE2E2" stroke="#DC2626" strokeWidth="3.5" />
            <path d="M49 31 L63 45" stroke="#991B1B" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M63 31 L49 45" stroke="#991B1B" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M50 32 L62 44" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M62 32 L50 44" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />

            <circle cx="77" cy="39" r="11" fill="#FEE2E2" stroke="#DC2626" strokeWidth="3.5" />
            <path d="M71 33 L83 45" stroke="#991B1B" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M83 33 L71 45" stroke="#991B1B" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M72 34 L82 44" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M82 34 L72 44" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {/* Cute Cartoon Eyes matching screenshot 1 */}
            <circle cx="56" cy="38" r="11" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
            <circle cx="58" cy="38" r="5.5" fill="#18181B" />
            <circle cx="59.5" cy="36" r="2.2" fill="#FFFFFF" />

            <circle cx="76" cy="39" r="10" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
            <circle cx="78" cy="39" r="5" fill="#18181B" />
            <circle cx="79.5" cy="37" r="1.8" fill="#FFFFFF" />
          </g>
        )}

        {state === 'crashed' ? (
          <g>
            <path d="M76 46 L94 48 L76 54 Z" fill="#F59E0B" stroke="#18181B" strokeWidth="2.5" />
            <path d="M80 52 C84 56, 88 56, 86 52 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="1.5" />
          </g>
        ) : (
          <path d="M76 46 L94 49 L76 56 Z" fill="#F59E0B" stroke="#18181B" strokeWidth="2.8" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
};
