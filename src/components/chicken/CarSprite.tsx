import React from 'react';

interface CarSpriteProps {
  type: number;
  direction?: 'down' | 'up';
  width?: number;
  height?: number;
}

export const CarSprite: React.FC<CarSpriteProps> = ({
  type,
  direction = 'down',
  width = 56,
  height = 90
}) => {
  const carConfigs = [
    { name: 'Taxi', body: '#F59E0B', roof: '#FBBF24', glass: '#1E293B', isTaxi: true },
    { name: 'Red Sedan', body: '#DC2626', roof: '#EF4444', glass: '#0F172A', isTaxi: false },
    { name: 'Blue SUV', body: '#2563EB', roof: '#3B82F6', glass: '#0F172A', isTaxi: false },
    { name: 'Green Hatch', body: '#059669', roof: '#10B981', glass: '#0F172A', isTaxi: false },
    { name: 'Police Cruiser', body: '#18181B', roof: '#FAFAFA', glass: '#09090B', isPolice: true }
  ];

  const cfg = carConfigs[type % carConfigs.length];

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: direction === 'up' ? 'rotate(180deg)' : 'none'
      }}
      className="relative flex items-center justify-center drop-shadow-[0_8px_10px_rgba(0,0,0,0.5)] select-none pointer-events-none"
    >
      <svg viewBox="0 0 60 100" width="100%" height="100%" fill="none">
        <rect x="2" y="14" width="7" height="16" rx="2" fill="#09090b" stroke="#27272a" />
        <rect x="51" y="14" width="7" height="16" rx="2" fill="#09090b" stroke="#27272a" />
        <rect x="2" y="68" width="7" height="16" rx="2" fill="#09090b" stroke="#27272a" />
        <rect x="51" y="68" width="7" height="16" rx="2" fill="#09090b" stroke="#27272a" />

        <rect x="7" y="6" width="46" height="88" rx="10" fill={cfg.body} stroke="#18181b" strokeWidth="2.5" />
        
        <path d="M12 8 L48 8" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
        <path d="M12 92 L48 92" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />

        <rect x="13" y="12" width="34" height="20" rx="4" fill={cfg.body} />

        <path d="M13 32 L16 46 L44 46 L47 32 Z" fill={cfg.glass} stroke="#18181b" strokeWidth="1.5" />
        <path d="M18 36 L24 43" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />

        <rect x="15" y="46" width="30" height="24" rx="3" fill={cfg.roof} stroke="#18181b" strokeWidth="1.5" />

        <path d="M16 70 L14 80 L46 80 L44 70 Z" fill={cfg.glass} stroke="#18181b" strokeWidth="1.5" />

        <circle cx="14" cy="9" r="3.5" fill="#FEF08A" stroke="#18181B" strokeWidth="1" />
        <circle cx="46" cy="9" r="3.5" fill="#FEF08A" stroke="#18181B" strokeWidth="1" />

        <rect x="10" y="90" width="8" height="3" rx="1" fill="#EF4444" />
        <rect x="42" y="90" width="8" height="3" rx="1" fill="#EF4444" />

        {cfg.isTaxi && (
          <g>
            <rect x="23" y="52" width="14" height="6" rx="1.5" fill="#FEF08A" stroke="#18181B" strokeWidth="1" />
            <text x="30" y="57" fontSize="4.5" fontWeight="900" fill="#18181B" textAnchor="middle">TAXI</text>
          </g>
        )}
        {cfg.isPolice && (
          <g>
            <rect x="22" y="53" width="7.5" height="5" fill="#3B82F6" stroke="#000" strokeWidth="0.8" />
            <rect x="30.5" y="53" width="7.5" height="5" fill="#EF4444" stroke="#000" strokeWidth="0.8" />
          </g>
        )}
      </svg>
    </div>
  );
};
