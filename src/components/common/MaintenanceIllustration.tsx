import React from 'react';

interface MaintenanceIllustrationProps {
  className?: string;
}

export const MaintenanceIllustration: React.FC<MaintenanceIllustrationProps> = ({ className = "w-full h-full" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full max-h-full object-contain"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f3f6fc" />
            <stop offset="100%" stopColor="#e2e8f5" />
          </linearGradient>
          <linearGradient id="deskGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="rocketGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff4d4f" />
            <stop offset="100%" stopColor="#b71c1c" />
          </linearGradient>
          <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc107" />
            <stop offset="50%" stopColor="#ff9800" />
            <stop offset="100%" stopColor="#ff5722" />
          </linearGradient>
          <linearGradient id="laptopGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e2029" />
            <stop offset="100%" stopColor="#0d0e15" />
          </linearGradient>
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Clean Rounded Background Plate */}
        <rect x="15" y="15" width="470" height="470" rx="32" fill="#ffffff" />

        {/* Browser Window Behind */}
        <g filter="url(#softShadow)">
          <rect x="135" y="145" width="230" height="155" rx="14" fill="#ffffff" stroke="#cdd5e8" strokeWidth="2" />
          {/* Browser Header */}
          <path d="M 135 159 A 14 14 0 0 1 149 145 L 351 145 A 14 14 0 0 1 365 159 L 365 168 L 135 168 Z" fill="#4d7cf6" />
          <circle cx="150" cy="156" r="3.5" fill="#ff5f56" />
          <circle cx="160" cy="156" r="3.5" fill="#ffbd2e" />
          <circle cx="170" cy="156" r="3.5" fill="#27c93f" />

          {/* Browser Inner Layout Blocks */}
          <rect x="152" y="180" width="105" height="6" rx="3" fill="#e2e8f0" />
          <rect x="152" y="193" width="75" height="5" rx="2.5" fill="#cbd5e1" />
          
          {/* Animated loading grid tiles */}
          <g className="animate-pulse">
            <rect x="270" y="180" width="20" height="16" rx="3" fill="#fde68a" />
            <rect x="296" y="180" width="20" height="16" rx="3" fill="#fed7aa" />
            <rect x="270" y="202" width="20" height="16" rx="3" fill="#fed7aa" />
            <rect x="296" y="202" width="20" height="16" rx="3" fill="#fde68a" />
          </g>

          <rect x="152" y="215" width="100" height="10" rx="5" fill="#fef08a" stroke="#eab308" strokeWidth="1" strokeDasharray="3 2" />
          <rect x="152" y="235" width="195" height="12" rx="6" fill="#fef9c3" stroke="#fde047" strokeWidth="1" />
        </g>

        {/* Stopwatch / Timer at Top Right */}
        <g transform="translate(365, 145)" filter="url(#softShadow)">
          {/* Stopwatch Top Knob / Ring */}
          <path d="M 0 -38 L 0 -48" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
          <path d="M -12 -48 L 12 -48" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="-56" r="8" fill="none" stroke="#1f2937" strokeWidth="3" />
          
          {/* Stopwatch Dial */}
          <circle cx="0" cy="0" r="38" fill="#fef9ea" stroke="#1f2937" strokeWidth="3" />
          {/* Dial tick marks */}
          <line x1="0" y1="-32" x2="0" y2="-26" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="0" y1="32" x2="0" y2="26" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="-32" y1="0" x2="-26" y2="0" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="0" x2="26" y2="0" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
          
          <line x1="-22" y1="-22" x2="-18" y2="-18" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="-22" x2="18" y2="-18" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="-22" y1="22" x2="-18" y2="18" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="22" x2="18" y2="18" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />

          {/* Clock Center */}
          <circle cx="0" cy="0" r="3.5" fill="#1f2937" />

          {/* Clock Animated Hands */}
          <line x1="0" y1="0" x2="16" y2="-14" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="12s"
              repeatCount="indefinite"
            />
          </line>
          <line x1="0" y1="0" x2="-12" y2="8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="4s"
              repeatCount="indefinite"
            />
          </line>
        </g>

        {/* Rocket Taking Off */}
        <g transform="translate(345, 235)">
          {/* Flame animation */}
          <g className="animate-pulse">
            <path d="M 0 12 Q -5 22 0 28 Q 5 22 0 12 Z" fill="url(#flameGrad)" />
            <path d="M 0 14 Q -2 20 0 24 Q 2 20 0 14 Z" fill="#ffffff" opacity="0.8" />
          </g>
          {/* Rocket Body */}
          <path d="M 0 -18 C -9 -8 -9 8 -9 12 L 9 12 C 9 8 9 -8 0 -18 Z" fill="url(#rocketGrad)" />
          {/* Rocket Fins */}
          <path d="M -9 8 L -15 14 L -9 12 Z" fill="#991b1b" />
          <path d="M 9 8 L 15 14 L 9 12 Z" fill="#991b1b" />
          {/* Rocket Window */}
          <circle cx="0" cy="-2" r="3.5" fill="#ffffff" stroke="#1f2937" strokeWidth="1" />
        </g>

        {/* Botanical Leaves on the Right */}
        <g transform="translate(385, 275)">
          {/* Stem */}
          <path d="M 0 60 Q 5 30 0 0" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M 0 45 C 18 42 22 28 20 22 C 10 24 2 34 0 45 Z" fill="#22c55e" />
          <path d="M 0 30 C -18 28 -22 14 -20 8 C -10 10 -2 20 0 30 Z" fill="#3b82f6" />
          <path d="M 0 15 C 18 12 20 0 16 -6 C 8 -4 2 5 0 15 Z" fill="#eab308" />
          <path d="M 0 0 C 0 -18 10 -24 16 -24 C 16 -12 8 0 0 0 Z" fill="#15803d" />
        </g>

        {/* Blue Tech Grid Platform at Base */}
        <g transform="translate(180, 315)">
          <path d="M -40 0 L 220 0 L 230 45 L -50 45 Z" fill="url(#deskGrad)" />
          {/* Perspective grid lines */}
          <line x1="-15" y1="0" x2="-22" y2="45" stroke="#1e40af" strokeWidth="1.5" />
          <line x1="20" y1="0" x2="16" y2="45" stroke="#1e40af" strokeWidth="1.5" />
          <line x1="55" y1="0" x2="55" y2="45" stroke="#1e40af" strokeWidth="1.5" />
          <line x1="90" y1="0" x2="94" y2="45" stroke="#1e40af" strokeWidth="1.5" />
          <line x1="125" y1="0" x2="133" y2="45" stroke="#1e40af" strokeWidth="1.5" />
          <line x1="160" y1="0" x2="172" y2="45" stroke="#1e40af" strokeWidth="1.5" />
          <line x1="195" y1="0" x2="211" y2="45" stroke="#1e40af" strokeWidth="1.5" />

          <line x1="-43" y1="15" x2="223" y2="15" stroke="#1e40af" strokeWidth="1.5" />
          <line x1="-47" y1="30" x2="227" y2="30" stroke="#1e40af" strokeWidth="1.5" />
        </g>

        {/* Developer Person Illustration */}
        <g transform="translate(145, 200)">
          {/* Shadow below person */}
          <ellipse cx="0" cy="165" rx="80" ry="12" fill="#000000" opacity="0.1" />

          {/* Crossed Legs (Beige Pants) */}
          <g>
            <path d="M -75 140 C -70 115 -40 110 -25 118 L -35 155 C -60 155 -72 150 -75 140 Z" fill="#fde68a" stroke="#1f2937" strokeWidth="2.5" />
            <path d="M 75 140 C 70 115 40 110 25 118 L 35 155 C 60 155 72 150 75 140 Z" fill="#fde68a" stroke="#1f2937" strokeWidth="2.5" />
            <path d="M -45 135 C -20 150 20 150 45 135 L 55 160 C 20 170 -20 170 -55 160 Z" fill="#fef08a" stroke="#1f2937" strokeWidth="2.5" />

            {/* Orange / Black Shoes */}
            <path d="M -20 155 L -20 175 L -10 185 L 0 175 L -8 155 Z" fill="#f97316" stroke="#1f2937" strokeWidth="2.5" />
            <path d="M -15 165 L -15 178" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
            <path d="M 20 155 L 20 175 L 10 185 L 0 175 L 8 155 Z" fill="#f97316" stroke="#1f2937" strokeWidth="2.5" />
            <path d="M 15 165 L 15 178" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Torso & Green Sweater */}
          <path d="M -45 95 C -45 65 -25 55 0 55 C 25 55 45 65 45 95 L 40 130 C 20 135 -20 135 -40 130 Z" fill="#10b981" stroke="#1f2937" strokeWidth="2.5" />

          {/* Sweater V-Neck / Collar */}
          <path d="M -10 57 L 0 70 L 10 57 Z" fill="#047857" />

          {/* Head & Neck */}
          <rect x="-7" y="38" width="14" height="20" fill="#e0a97a" stroke="#1f2937" strokeWidth="2" />
          
          {/* Head */}
          <ellipse cx="0" cy="25" rx="19" ry="21" fill="#f2c199" stroke="#1f2937" strokeWidth="2.5" />

          {/* Black Hair */}
          <path d="M -19 22 C -19 5 -10 -2 0 -2 C 10 -2 19 5 19 22 C 15 10 7 12 0 10 C -7 12 -15 10 -19 22 Z" fill="#111827" />

          {/* Headset & Mic */}
          <path d="M -21 22 C -21 -4 21 -4 21 22" fill="none" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="-24" y="16" width="6" height="14" rx="3" fill="#111827" />
          <rect x="18" y="16" width="6" height="14" rx="3" fill="#111827" />
          <path d="M -21 28 Q -15 38 -4 34" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
          <circle cx="-3" cy="34" r="2.5" fill="#f97316" />

          {/* Glasses */}
          <rect x="-14" y="19" width="11" height="8" rx="2" fill="none" stroke="#111827" strokeWidth="2" />
          <rect x="3" y="19" width="11" height="8" rx="2" fill="none" stroke="#111827" strokeWidth="2" />
          <line x1="-3" y1="23" x2="3" y2="23" stroke="#111827" strokeWidth="2" />

          {/* Eyes & Smile */}
          <circle cx="-8.5" cy="23" r="1.5" fill="#111827" />
          <circle cx="8.5" cy="23" r="1.5" fill="#111827" />
          <path d="M -4 32 Q 0 35 4 32" fill="none" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" />

          {/* Arms & Hands Typing */}
          <path d="M -40 80 C -52 105 -35 125 -15 120" fill="none" stroke="#10b981" strokeWidth="16" strokeLinecap="round" />
          <path d="M 40 80 C 52 105 35 125 15 120" fill="none" stroke="#10b981" strokeWidth="16" strokeLinecap="round" />

          {/* Laptop (Black/Dark Sleek Screen & Keyboard) */}
          <g transform="translate(0, 105)">
            {/* Screen Lid */}
            <rect x="-42" y="-20" width="84" height="48" rx="4" fill="url(#laptopGrad)" stroke="#111827" strokeWidth="2" />
            {/* Glowing Logo on Laptop Lid */}
            <circle cx="0" cy="4" r="5" fill="#38bdf8" />
            {/* Laptop Base */}
            <path d="M -48 28 L 48 28 L 40 34 L -40 34 Z" fill="#1f2937" stroke="#111827" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
    </div>
  );
};
