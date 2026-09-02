import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  ArrowLeft, Volume2, VolumeX, HelpCircle,
  Crown, Play, BookOpen, X, History, AlertTriangle, Trophy, TrendingUp, Music, ShieldAlert
} from 'lucide-react';
import { PlayerColor, LudoToken, LudoPlayer, LudoGameState } from '../../types.js';
import { Dice3D } from '../Dice3D.js';
import { ludoAudio } from '../../utils/ludoAudio.js';

export interface LudoHistoryRecord {
  id: string;
  roomId: string;
  entryFee: number;
  rank: number; // 1, 2, 3, 4, or 0 (quit)
  prizeWon: number;
  netProfit: number;
  status: 'won' | 'lost' | 'quit';
  winnerName: string;
  winnerColor: string;
  date: string;
}

interface UserLudoGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
}

// 52-step standard Ludo Path starting from Red Start (Step 0) clockwise on a 15x15 grid
const BASE_PATH: { x: number; y: number }[] = [
  { x: 6, y: 13 }, // 0: Red Start (Star ★)
  { x: 6, y: 12 }, // 1
  { x: 6, y: 11 }, // 2
  { x: 6, y: 10 }, // 3
  { x: 6, y: 9 },  // 4
  { x: 5, y: 8 },  // 5
  { x: 4, y: 8 },  // 6
  { x: 3, y: 8 },  // 7
  { x: 2, y: 8 },  // 8: Star ★
  { x: 1, y: 8 },  // 9
  { x: 0, y: 8 },  // 10
  { x: 0, y: 7 },  // 11: Green enter
  { x: 0, y: 6 },  // 12
  { x: 1, y: 6 },  // 13: Green Start (Star ★)
  { x: 2, y: 6 },  // 14
  { x: 3, y: 6 },  // 15
  { x: 4, y: 6 },  // 16
  { x: 5, y: 6 },  // 17
  { x: 6, y: 5 },  // 18
  { x: 6, y: 4 },  // 19
  { x: 6, y: 3 },  // 20
  { x: 6, y: 2 },  // 21: Star ★
  { x: 6, y: 1 },  // 22
  { x: 6, y: 0 },  // 23
  { x: 7, y: 0 },  // 24: Yellow enter
  { x: 8, y: 0 },  // 25
  { x: 8, y: 1 },  // 26: Yellow Start (Star ★)
  { x: 8, y: 2 },  // 27
  { x: 8, y: 3 },  // 28
  { x: 8, y: 4 },  // 29
  { x: 8, y: 5 },  // 30
  { x: 9, y: 6 },  // 31
  { x: 10, y: 6 }, // 32
  { x: 11, y: 6 }, // 33
  { x: 12, y: 6 }, // 34: Star ★
  { x: 13, y: 6 }, // 35
  { x: 14, y: 6 }, // 36
  { x: 14, y: 7 }, // 37: Blue enter
  { x: 14, y: 8 }, // 38
  { x: 13, y: 8 }, // 39: Blue Start (Star ★)
  { x: 12, y: 8 }, // 40
  { x: 11, y: 8 }, // 41
  { x: 10, y: 8 }, // 42
  { x: 9, y: 8 },  // 43
  { x: 8, y: 9 },  // 44
  { x: 8, y: 10 }, // 45
  { x: 8, y: 11 }, // 46
  { x: 8, y: 12 }, // 47: Star ★
  { x: 8, y: 13 }, // 48
  { x: 8, y: 14 }, // 49
  { x: 7, y: 14 }, // 50: Red enter
  { x: 6, y: 14 }, // 51: Final main path square before Red Home
];

// Color start offsets relative to BASE_PATH
const COLOR_START_OFFSET: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Home stretch coordinates (Steps 51 to 56)
const HOME_STRETCH: Record<PlayerColor, { x: number; y: number }[]> = {
  red: [
    { x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }, { x: 7, y: 8 }
  ],
  green: [
    { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }
  ],
  yellow: [
    { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }
  ],
  blue: [
    { x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }, { x: 8, y: 7 }
  ],
};

// Yard 4 Token positions on 15x15 grid - centered perfectly inside white circles
const YARDS: Record<PlayerColor, { x: number; y: number }[]> = {
  red: [{ x: 1.5, y: 11.2 }, { x: 3.5, y: 11.2 }, { x: 1.5, y: 13.0 }, { x: 3.5, y: 13.0 }],
  green: [{ x: 1.5, y: 2.2 }, { x: 3.5, y: 2.2 }, { x: 1.5, y: 4.0 }, { x: 3.5, y: 4.0 }],
  yellow: [{ x: 10.5, y: 2.2 }, { x: 12.5, y: 2.2 }, { x: 10.5, y: 4.0 }, { x: 12.5, y: 4.0 }],
  blue: [{ x: 10.5, y: 11.2 }, { x: 12.5, y: 11.2 }, { x: 10.5, y: 13.0 }, { x: 12.5, y: 13.0 }],
};

// 8 Official Star Safe Coordinates
const SAFE_STAR_COORDS = [
  { x: 6, y: 13 }, // Red start star
  { x: 2, y: 8 },  // Red track star
  { x: 1, y: 6 },  // Green start star
  { x: 6, y: 2 },  // Green track star
  { x: 8, y: 1 },  // Yellow start star
  { x: 12, y: 6 }, // Yellow track star
  { x: 13, y: 8 }, // Blue start star
  { x: 8, y: 12 }, // Blue track star
];

const isCoordSafe = (x: number, y: number) => {
  return SAFE_STAR_COORDS.some((s) => s.x === x && s.y === y);
};

const ENTRY_FEES = [10, 20, 50, 100, 200, 500, 1000];

// Authentic King Ludo Pawn / Goti Marker Token Component
const KingLudoPawn: React.FC<{
  color: PlayerColor;
  isMovable: boolean;
  onClick?: () => void;
}> = ({ color, isMovable, onClick }) => {
  const colorMap = {
    red: {
      body: '#e74c3c',
      dark: '#991b1b',
      border: '#c0392b',
      ring: '#fca5a5',
      glow: 'shadow-[0_0_12px_rgba(239,68,68,0.95)]',
    },
    green: {
      body: '#27ae60',
      dark: '#14532d',
      border: '#1e8449',
      ring: '#86efac',
      glow: 'shadow-[0_0_12px_rgba(34,197,94,0.95)]',
    },
    yellow: {
      body: '#f1c40f',
      dark: '#713f12',
      border: '#b7950b',
      ring: '#fde047',
      glow: 'shadow-[0_0_12px_rgba(234,179,8,0.95)]',
    },
    blue: {
      body: '#2980b9',
      dark: '#1e3a8a',
      border: '#1f618d',
      ring: '#93c5fd',
      glow: 'shadow-[0_0_12px_rgba(59,130,246,0.95)]',
    },
  };

  const c = colorMap[color];

  return (
    <div
      onClick={isMovable ? onClick : undefined}
      className={`relative w-full h-full flex items-center justify-center select-none ${
        isMovable ? 'cursor-pointer z-40' : 'pointer-events-none'
      }`}
    >
      {/* Stable Center Alignment Anchor */}
      <div
        className={`relative flex flex-col items-center justify-center transition-transform ${
          isMovable ? 'scale-110' : 'scale-100'
        }`}
      >
        {/* Pulsing ring indicator for active movable turn */}
        {isMovable && (
          <div
            className={`absolute -inset-1 rounded-full border-2 border-white animate-ping opacity-75 ${c.glow}`}
          />
        )}

        {/* Outer Circular Ground Shadow Socket */}
        <div className="absolute -bottom-0.5 w-4 h-1.5 bg-black/40 rounded-full blur-[0.8px]" />

        {/* Ludo King Teardrop Pin Body */}
        <svg
          viewBox="0 0 32 40"
          className={`w-4.5 h-5.5 sm:w-5 sm:h-6 filter drop-shadow-md transition-all ${
            isMovable ? 'brightness-110 drop-shadow-[0_0_8px_white]' : ''
          }`}
        >
          <defs>
            {/* 3D Radial Gradient for Head Sphere */}
            <radialGradient id={`grad-${color}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="25%" stopColor={c.body} />
              <stop offset="100%" stopColor={c.dark} />
            </radialGradient>
            <filter id={`shadow-${color}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.2" stdDeviation="0.8" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Base bottom ring */}
          <ellipse cx="16" cy="36" rx="7.5" ry="2.8" fill={c.dark} opacity="0.9" />
          <ellipse cx="16" cy="35" rx="6.5" ry="2" fill={c.body} stroke="#ffffff" strokeWidth="0.8" />

          {/* Pin Teardrop Shape */}
          <path
            d="M 16 36 C 10 30, 4 22, 4 14 A 12 12 0 1 1 28 14 C 28 22, 22 30, 16 36 Z"
            fill={`url(#grad-${color})`}
            stroke={c.border}
            strokeWidth="1.2"
            filter={`url(#shadow-${color})`}
          />

          {/* White Teardrop Eye / Center Core from Ludo King */}
          <ellipse cx="16" cy="13" rx="4.2" ry="4.8" fill="#ffffff" opacity="0.95" />
          <ellipse cx="16" cy="13" rx="2.2" ry="2.8" fill={c.body} opacity="0.9" />
          {/* Shimmer Highlight Dot */}
          <circle cx="14" cy="11" r="1.1" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
};

// Helper storage functions for Ludo Game History
const loadLudoHistory = (uid: string): LudoHistoryRecord[] => {
  try {
    const raw = localStorage.getItem(`ludo_history_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveLudoHistoryRecord = (uid: string, record: LudoHistoryRecord): LudoHistoryRecord[] => {
  try {
    const existing = loadLudoHistory(uid);
    const updated = [record, ...existing.filter((x) => x.id !== record.id && x.roomId !== record.roomId)].slice(0, 100);
    localStorage.setItem(`ludo_history_${uid}`, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

export const UserLudoGameView: React.FC<UserLudoGameViewProps> = ({
  onBack,
  onNavigateDeposit,
}) => {
  const { user, refreshUser, showToast } = useAuth();

  const [isMuted, setIsMuted] = useState(false);
  const [isBgmActive, setIsBgmActive] = useState(false);
  const [ludoActiveStatus, setLudoActiveStatus] = useState<{ isActive: boolean; maintenanceNotice: string }>({
    isActive: true,
    maintenanceNotice: '',
  });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [selectedFee, setSelectedFee] = useState<number>(100);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'won' | 'lost' | 'quit'>('all');
  const [ludoHistory, setLudoHistory] = useState<LudoHistoryRecord[]>(() => {
    return user?.uid ? loadLudoHistory(user.uid) : [];
  });

  // Fetch Ludo Active / Inactive status from Admin
  const checkLudoStatus = async () => {
    try {
      const res = await api.getLudoStatus();
      if (res) {
        setLudoActiveStatus({
          isActive: res.isActive !== false,
          maintenanceNotice: res.maintenanceNotice || 'लूडो गेम में नया अपडेट और मेंटेनेंस कार्य प्रगति पर है। कृपया कुछ समय बाद पुनः प्रयास करें।',
        });
      }
    } catch {
      // ignore
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkLudoStatus();
    const interval = setInterval(checkLudoStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup BGM when leaving component
  useEffect(() => {
    return () => {
      ludoAudio.stopBGM();
    };
  }, []);

  // Handle Mute
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    ludoAudio.setMuted(next);
  };

  // Handle BGM Toggle
  const handleToggleBGM = () => {
    if (isMuted) {
      showToast('Please unmute sound first to play background music', 'info');
      return;
    }
    const playing = ludoAudio.toggleBGM();
    setIsBgmActive(playing);
    if (playing) {
      showToast('🎵 Ambient Background Music Started', 'info');
    } else {
      showToast('Background Music Paused', 'info');
    }
  };

  // Sync history when user changes or history modal is opened
  useEffect(() => {
    if (user?.uid) {
      setLudoHistory(loadLudoHistory(user.uid));
    }
  }, [user?.uid, showHistoryModal]);

  // Active game state
  const [gameState, setGameState] = useState<LudoGameState | null>(null);
  const [activeDiceValues, setActiveDiceValues] = useState<Record<PlayerColor, number | null>>({
    red: null,
    green: null,
    yellow: null,
    blue: null,
  });
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [isMovingPiece, setIsMovingPiece] = useState(false);
  const [movableTokens, setMovableTokens] = useState<string[]>([]);
  const [, setGameLog] = useState<string[]>([]);
  const [finishedRanks, setFinishedRanks] = useState<LudoPlayer[]>([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(60); // 60 Seconds strict turn timer
  const [showHomeCelebration, setShowHomeCelebration] = useState(false);
  const [homeCelebrationMsg, setHomeCelebrationMsg] = useState('');

  // Safe Exit Navigation Handler with Warning for Active Match
  const handleHeaderBack = () => {
    if (gameState && gameState.status === 'in_progress') {
      setShowQuitConfirm(true);
    } else if (gameState) {
      setGameState(null); // Back to lobby if match finished
    } else {
      onBack(); // Back to previous page
    }
  };

  // Forfeit Match and record loss
  const handleConfirmQuit = () => {
    if (!gameState || !user) return;
    const record: LudoHistoryRecord = {
      id: `LUDO-${Date.now()}`,
      roomId: gameState.roomId,
      entryFee: selectedFee,
      rank: 0,
      prizeWon: 0,
      netProfit: -selectedFee,
      status: 'quit',
      winnerName: 'Game Forfeited',
      winnerColor: 'red',
      date: new Date().toISOString(),
    };
    const updated = saveLudoHistoryRecord(user.uid, record);
    setLudoHistory(updated);
    showToast(`Game Quit! Entry amount ₹${selectedFee} forfeited.`, 'error');
    setShowQuitConfirm(false);
    setGameState(null);
  };

  // Sound generator
  const playSound = (freq = 440, type: OscillatorType = 'sine', duration = 0.15) => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // ignore
    }
  };

  // Turn timer countdown (Strict 60 Seconds - paused during roll or goti movement)
  useEffect(() => {
    if (!gameState || gameState.status !== 'in_progress' || isMovingPiece || isDiceRolling) return;
    setTurnTimeLeft(60);

    const interval = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.currentTurnColor, gameState?.status, isMovingPiece, isDiceRolling]);

  // Handle timeout lifeline when timer hits 0
  useEffect(() => {
    if (turnTimeLeft === 0 && gameState && gameState.status === 'in_progress' && !isMovingPiece && !isDiceRolling) {
      handleTimeoutLifeline();
    }
  }, [turnTimeLeft]);

  // Continuous Bot Auto-Play Watcher (Sequential & Wait for full movement completion)
  useEffect(() => {
    if (!gameState || gameState.status !== 'in_progress' || isDiceRolling || isMovingPiece) return;
    const curPlayer = gameState.players.find((p) => p.color === gameState.currentTurnColor);
    if (curPlayer?.isBot && gameState.canRoll) {
      const timer = setTimeout(() => {
        handleRollDice(curPlayer.color);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState?.currentTurnColor, gameState?.canRoll, isDiceRolling, isMovingPiece, gameState?.status]);

  const handleTimeoutLifeline = () => {
    if (!gameState || gameState.status !== 'in_progress' || isMovingPiece || isDiceRolling) return;
    const curPlayer = gameState.players.find((p) => p.color === gameState.currentTurnColor);
    if (!curPlayer) return;

    const newLifelines = (curPlayer.lifelines || 3) - 1;
    if (newLifelines <= 0) {
      showToast(`${curPlayer.name} ran out of lifelines & is eliminated!`, 'error');
      eliminatePlayer(curPlayer.color);
    } else {
      showToast(`${curPlayer.name} lost 1 lifeline ❤️ (${newLifelines} left)`, 'info');
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((p) =>
                p.color === curPlayer.color ? { ...p, lifelines: newLifelines } : p
              ),
            }
          : null
      );
      passTurn();
    }
  };

  const eliminatePlayer = (color: PlayerColor) => {
    if (!gameState) return;
    const p = gameState.players.find((pl) => pl.color === color);
    if (p && !finishedRanks.some((r) => r.color === color)) {
      setFinishedRanks((prev) => [...prev, { ...p, isEliminated: true }]);
    }
    passTurn();
  };

  // Start new 4-Player Cash Battle
  const handleStartGame = async () => {
    if (ludoActiveStatus.isActive === false) {
      showToast(ludoActiveStatus.maintenanceNotice || 'लूडो गेम वर्तमान में मेंटेनेंस मोड पर है।', 'error');
      return;
    }

    if (!user) return;
    if ((user.walletBalance || 0) < selectedFee) {
      showToast('Insufficient wallet balance. Please recharge.', 'error');
      onNavigateDeposit();
      return;
    }

    try {
      // Deduct entry fee
      await api.placeBet({
        gameType: 'wingo_30s',
        periodId: `LUDO-${Date.now()}`,
        betType: 'number',
        selection: '0',
        amount: selectedFee,
      });
      await refreshUser();
    } catch (e: any) {
      showToast(e?.message || 'Could not join room', 'error');
      return;
    }

    const playersList: LudoPlayer[] = [
      {
        id: user.uid,
        name: 'You',
        avatar: user.avatarUrl || '/avatars/default_avatar.jpg',
        color: 'red',
        tokens: [
          { id: 'red_0', color: 'red', tokenIndex: 0, step: -1, isHome: false },
          { id: 'red_1', color: 'red', tokenIndex: 1, step: -1, isHome: false },
          { id: 'red_2', color: 'red', tokenIndex: 2, step: -1, isHome: false },
          { id: 'red_3', color: 'red', tokenIndex: 3, step: -1, isHome: false },
        ],
        isBot: false,
        score: 0,
        lastDiceValue: null,
        hasRolledSix: false,
        lifelines: 3,
        isEliminated: false,
      },
      {
        id: 'bot_green',
        name: 'Computer 2',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
        color: 'green',
        tokens: [
          { id: 'green_0', color: 'green', tokenIndex: 0, step: -1, isHome: false },
          { id: 'green_1', color: 'green', tokenIndex: 1, step: -1, isHome: false },
          { id: 'green_2', color: 'green', tokenIndex: 2, step: -1, isHome: false },
          { id: 'green_3', color: 'green', tokenIndex: 3, step: -1, isHome: false },
        ],
        isBot: true,
        score: 0,
        lastDiceValue: null,
        hasRolledSix: false,
        lifelines: 3,
        isEliminated: false,
      },
      {
        id: 'bot_yellow',
        name: 'Computer 3',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        color: 'yellow',
        tokens: [
          { id: 'yellow_0', color: 'yellow', tokenIndex: 0, step: -1, isHome: false },
          { id: 'yellow_1', color: 'yellow', tokenIndex: 1, step: -1, isHome: false },
          { id: 'yellow_2', color: 'yellow', tokenIndex: 2, step: -1, isHome: false },
          { id: 'yellow_3', color: 'yellow', tokenIndex: 3, step: -1, isHome: false },
        ],
        isBot: true,
        score: 0,
        lastDiceValue: null,
        hasRolledSix: false,
        lifelines: 3,
        isEliminated: false,
      },
      {
        id: 'bot_blue',
        name: 'Computer 4',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
        color: 'blue',
        tokens: [
          { id: 'blue_0', color: 'blue', tokenIndex: 0, step: -1, isHome: false },
          { id: 'blue_1', color: 'blue', tokenIndex: 1, step: -1, isHome: false },
          { id: 'blue_2', color: 'blue', tokenIndex: 2, step: -1, isHome: false },
          { id: 'blue_3', color: 'blue', tokenIndex: 3, step: -1, isHome: false },
        ],
        isBot: true,
        score: 0,
        lastDiceValue: null,
        hasRolledSix: false,
        lifelines: 3,
        isEliminated: false,
      },
    ];

    setGameState({
      roomId: `LUDO-${Math.floor(100000 + Math.random() * 900000)}`,
      players: playersList,
      currentTurnColor: 'red',
      diceValue: null,
      isRolling: false,
      canRoll: true,
      consecutiveSixes: 0,
      status: 'in_progress',
      winner: null,
      entryAmount: selectedFee,
    });
    setFinishedRanks([]);
    setTurnTimeLeft(60);
    setActiveDiceValues({ red: 1, green: 1, yellow: 1, blue: 1 });
    setGameLog([`Match Started! Net Prize Pool: ₹${(selectedFee * 4 * 0.9).toFixed(0)}`]);
  };

  // Roll Dice with 3D animation - Instant 0ms Rotation Trigger!
  const handleRollDice = (playerColor: PlayerColor) => {
    if (!gameState || !gameState.canRoll || isDiceRolling || isMovingPiece || gameState.status !== 'in_progress') return;
    if (gameState.currentTurnColor !== playerColor) return;

    // Immediately disable canRoll to strictly prevent double clicking
    setGameState((prev) => (prev ? { ...prev, canRoll: false } : null));

    // Roll random 1..6 immediately
    const roll = Math.floor(Math.random() * 6) + 1;

    // Trigger value, dice tumbling sound, and 3D rotation INSTANTLY on click (0ms delay!)
    setActiveDiceValues((prev) => ({ ...prev, [playerColor]: roll }));
    setIsDiceRolling(true);
    ludoAudio.playDiceRotationSound();

    // After rotation lands cleanly (700ms), finalize and process result
    setTimeout(() => {
      setIsDiceRolling(false);
      processRollResult(playerColor, roll);
    }, 720);
  };

  // Process roll
  const processRollResult = (playerColor: PlayerColor, roll: number) => {
    if (!gameState) return;
    const currentPlayer = gameState.players.find((p) => p.color === playerColor);
    if (!currentPlayer) return;

    // Check consecutive 6s
    let newConsecutive = roll === 6 ? gameState.consecutiveSixes + 1 : 0;
    if (newConsecutive === 3) {
      showToast('3 consecutive sixes! Turn passed / लगातार 3 बार 6 आने पर टर्न आगे बढ़ी।', 'info');
      setTimeout(() => passTurn(), 1200);
      return;
    }

    if (roll === 6) {
      ludoAudio.playSixRollSound();
      ludoAudio.triggerVibrate('six');
      if (playerColor === 'red') {
        showToast('🎉 SIX! 6 आया - गोटी बाहर निकालें या चलें + दोबारा डाइस घुमाने का चांस!', 'success');
      } else {
        showToast(`🎲 ${currentPlayer.name} rolled a 6! Extra roll granted.`, 'info');
      }
    }

    // Check valid movable tokens: Tokens in yard (step === -1) CAN ONLY EXIT ON 6!
    const validTokens = currentPlayer.tokens.filter((t) => {
      if (t.isHome) return false;
      if (t.step === -1) return roll === 6; // STRICT: Only 6 can exit yard!
      return t.step + roll <= 56;
    });

    if (validTokens.length === 0) {
      // No moves available - display rolled number for 1.2s then cleanly pass turn (or re-roll if 6)
      setTimeout(() => {
        passTurn(roll === 6);
      }, 1200);
    } else if (currentPlayer.isBot) {
      // Bot choice: pause so rolled number is visible, then start movement
      setTimeout(() => {
        const yardToken = validTokens.find((t) => t.step === -1);
        const choice = yardToken && roll === 6 ? yardToken : validTokens[0];
        handleStepByStepMove(choice.id, roll);
      }, 700);
    } else {
      // User must choose and click their token to move!
      setMovableTokens(validTokens.map((t) => t.id));
    }
  };

  // Step-by-step sequential movement (एक-एक करके चलेगा और पूरा खत्म होने पर ही नेक्स्ट टर्न आएगी)
  const handleStepByStepMove = async (tokenId: string, totalSteps: number) => {
    if (!gameState) return;
    const curPlayer = gameState.players.find((p) => p.color === gameState.currentTurnColor);
    if (!curPlayer) return;

    const token = curPlayer.tokens.find((t) => t.id === tokenId);
    if (!token) return;

    // Strictly lock any other action during movement
    setIsMovingPiece(true);
    setMovableTokens([]);
    setGameState((prev) => (prev ? { ...prev, canRoll: false } : null));

    let currentStep = token.step;

    // If exiting yard on 6: step from -1 to 0 directly
    if (currentStep === -1) {
      ludoAudio.playTokenStepSound(1);
      await updateSingleTokenStep(curPlayer.color, tokenId, 0, false);
      ludoAudio.playTokenStopSound();
      ludoAudio.triggerVibrate('stop');
      await new Promise((r) => setTimeout(r, 500));
      setIsMovingPiece(false);
      passTurn(true); // Extra turn for 6
      return;
    }

    // Sequential step-by-step movement - EXACTLY totalSteps
    for (let s = 1; s <= totalSteps; s++) {
      currentStep += 1;
      const isFinish = currentStep === 56;
      ludoAudio.playTokenStepSound(s);
      await updateSingleTokenStep(curPlayer.color, tokenId, currentStep, isFinish);
      await new Promise((r) => setTimeout(r, 220));
    }

    // Token has reached destination cell -> Trigger Stop sound and Stop vibration
    ludoAudio.playTokenStopSound();
    ludoAudio.triggerVibrate('stop');

    // Check opponent capture on landing square!
    let gotCapture = false;
    if (currentStep < 51) {
      const landingPos = getBoardCoordinates(currentStep, curPlayer.color);
      if (!isCoordSafe(landingPos.x, landingPos.y)) {
        for (const opponent of gameState.players) {
          if (opponent.color === curPlayer.color) continue;
          for (const oppToken of opponent.tokens) {
            if (oppToken.step >= 0 && oppToken.step < 51 && !oppToken.isHome) {
              const oppPos = getBoardCoordinates(oppToken.step, opponent.color);
              if (oppPos.x === landingPos.x && oppPos.y === landingPos.y) {
                // CAPTURE! Play authentic Snake Hiss sound effect & double vibration!
                gotCapture = true;
                ludoAudio.playSnakeHissSound();
                ludoAudio.triggerVibrate('cut');
                showToast(`🐍 ${curPlayer.name} captured ${opponent.name}'s goti! (गोटी काटी)`, 'success');
                await animateReverseCapture(opponent.color, oppToken.id, oppToken.step);
              }
            }
          }
        }
      }
    }

    // Check if player won
    const latestPlayer = gameState.players.find((p) => p.color === curPlayer.color);
    const hasWon = latestPlayer?.tokens.every((t) => t.isHome || (t.id === tokenId && currentStep === 56));

    if (currentStep === 56) {
      // Trigger vibration and show Congratulations alert when goti is home (लाल हो गई)
      ludoAudio.triggerVibrate('win');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([200, 100, 200, 100, 400]);
        } catch {
          // ignore
        }
      }
      setHomeCelebrationMsg(`🎉 CONGRATULATIONS! ${curPlayer.name}'s token reached HOME (गोटी लाल हो गई)! 🎉`);
      setShowHomeCelebration(true);
      setTimeout(() => {
        setShowHomeCelebration(false);
      }, 3500);
    }

    if (hasWon) {
      ludoAudio.triggerVibrate('win');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([300, 100, 300, 100, 500, 100, 500]);
        } catch {
          // ignore
        }
      }
      setIsMovingPiece(false);
      handlePlayerFinish(curPlayer);
      return;
    }

    // Extra turn if rolled 6, reached Home, or captured opponent
    const getsExtraTurn = totalSteps === 6 || currentStep === 56 || gotCapture;

    // Generous pause AFTER movement & capture is 100% complete before passing turn!
    await new Promise((r) => setTimeout(r, 600));
    setIsMovingPiece(false);
    passTurn(getsExtraTurn);
  };

  // Helper to update token step in state
  const updateSingleTokenStep = (
    playerColor: PlayerColor,
    tokenId: string,
    step: number,
    isHome: boolean
  ) => {
    return new Promise<void>((resolve) => {
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map((p) => {
            if (p.color === playerColor) {
              return {
                ...p,
                tokens: p.tokens.map((t) => (t.id === tokenId ? { ...t, step, isHome: isHome || t.isHome } : t)),
              };
            }
            return p;
          }),
        };
      });
      resolve();
    });
  };

  // Animate capture in reverse step-by-step back to yard (रिवर्स डायरेक्शन)
  const animateReverseCapture = async (oppColor: PlayerColor, tokenId: string, startStep: number) => {
    for (let s = startStep; s >= 0; s--) {
      playSound(400 - s * 5, 'sine', 0.05);
      await updateSingleTokenStep(oppColor, tokenId, s, false);
      await new Promise((r) => setTimeout(r, 60));
    }
    // Return to yard (-1)
    await updateSingleTokenStep(oppColor, tokenId, -1, false);
  };

  // Pass Turn
  const passTurn = (extraTurn = false) => {
    if (!gameState || gameState.status !== 'in_progress') return;

    const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
    let nextColor = gameState.currentTurnColor;

    if (!extraTurn) {
      const curIdx = colors.indexOf(gameState.currentTurnColor);
      let found = false;
      for (let i = 1; i <= 4; i++) {
        const candidate = colors[(curIdx + i) % 4];
        const pl = gameState.players.find((p) => p.color === candidate);
        const isDone = pl?.isEliminated || finishedRanks.some((r) => r.color === candidate);
        if (!isDone) {
          nextColor = candidate;
          found = true;
          break;
        }
      }
      if (!found) {
        // All other players finished or eliminated
        nextColor = gameState.currentTurnColor;
      }
    }

    setGameState((prev) =>
      prev
        ? {
            ...prev,
            currentTurnColor: nextColor,
            canRoll: true,
            consecutiveSixes: extraTurn ? prev.consecutiveSixes : 0,
          }
        : null
    );
    setMovableTokens([]);
    setTurnTimeLeft(60); // Reset to 60s for next turn
  };

  // Handle Player Finish & Cash Prize Settlement
  const handlePlayerFinish = async (finishingPlayer: LudoPlayer) => {
    if (!gameState) return;

    const updatedRanks = [...finishedRanks, finishingPlayer];
    setFinishedRanks(updatedRanks);

    // If Red (User) is 1st Rank -> 50% of ₹360 (₹180 for ₹100 entry)
    const totalCollection = selectedFee * 4;
    const platformFee = totalCollection * 0.1; // 10% Platform tax
    const netPrizePool = totalCollection - platformFee; // ₹360

    const rankPrizes = [
      netPrizePool * 0.5,  // 1st: 50%
      netPrizePool * 0.3,  // 2nd: 30%
      netPrizePool * 0.15, // 3rd: 15%
      netPrizePool * 0.05, // 4th: 5%
    ];

    const myRankIdx = updatedRanks.findIndex((p) => p.color === 'red');
    const myRank = myRankIdx !== -1 ? myRankIdx + 1 : 4;
    const myPrize = myRankIdx !== -1 ? (rankPrizes[myRankIdx] || 0) : 0;

    if (myRankIdx !== -1) {
      if (myPrize > 0) {
        try {
          // Credit winning to wallet
          await api.placeBet({
            gameType: 'wingo_30s',
            periodId: `LUDO-WIN-${Date.now()}`,
            betType: 'number',
            selection: '0',
            amount: -myPrize, // negative = credit win
          });
          await refreshUser();
        } catch {
          // ignore
        }
      }
    }

    if (user?.uid) {
      const record: LudoHistoryRecord = {
        id: `LUDO-${Date.now()}`,
        roomId: gameState.roomId,
        entryFee: selectedFee,
        rank: myRank,
        prizeWon: myPrize,
        netProfit: myPrize - selectedFee,
        status: myPrize >= selectedFee ? 'won' : 'lost',
        winnerName: finishingPlayer.name,
        winnerColor: finishingPlayer.color,
        date: new Date().toISOString(),
      };
      const updated = saveLudoHistoryRecord(user.uid, record);
      setLudoHistory(updated);
    }

    setGameState((prev) =>
      prev
        ? {
            ...prev,
            status: 'finished',
            winner: finishingPlayer,
          }
        : null
    );
  };

  // Calculate token exact board coordinates (x, y on 15x15 grid)
  const getBoardCoordinates = (step: number, color: PlayerColor) => {
    if (step === -1) return { x: 0, y: 0 };
    if (step >= 51) {
      const homeIdx = Math.min(step - 51, 5);
      return HOME_STRETCH[color][homeIdx] || { x: 7, y: 7 };
    }
    const offset = COLOR_START_OFFSET[color];
    const pathIdx = (step + offset) % 52;
    return BASE_PATH[pathIdx] || { x: 0, y: 0 };
  };

  const getTokenCoordinates = (token: LudoToken, color: PlayerColor) => {
    if (token.step === -1) {
      return YARDS[color][token.tokenIndex] || { x: 0, y: 0 };
    }
    return getBoardCoordinates(token.step, color);
  };

  // Helper to render Hearts Lifeline for a player
  const renderPlayerHearts = (playerColor: PlayerColor) => {
    const pl = gameState?.players.find((p) => p.color === playerColor);
    const lifelines = pl?.lifelines ?? 3;

    return (
      <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 shadow-sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className={`text-xs transition-opacity duration-300 ${
              i < lifelines ? 'opacity-100 scale-100' : 'opacity-20 grayscale scale-90'
            }`}
          >
            ❤️
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a1628] bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:16px_16px] text-white flex flex-col max-w-md mx-auto relative pb-8 select-none">
      {/* Top Navbar */}
      <div className="sticky top-0 z-40 bg-[#0c1a30]/95 backdrop-blur-md border-b border-[#2563eb]/30 px-4 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={handleHeaderBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 transition active:scale-95"
            title="Back / Exit"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-black text-sm tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              LUDO BATTLE CASH
            </h1>
            <p className="text-[10px] text-blue-200 font-semibold">4-Player Tournament • 60s Turn</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ludo History Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition flex items-center gap-1"
            title="Match History"
          >
            <History className="w-4 h-4" />
            <span className="text-[10px] font-black hidden sm:inline">History</span>
          </button>

          {/* Ambient BGM Music Button */}
          <button
            onClick={handleToggleBGM}
            className={`p-2 rounded-xl border transition flex items-center gap-1 cursor-pointer ${
              isBgmActive
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                : 'bg-white/10 text-zinc-300 hover:text-white border-transparent'
            }`}
            title={isBgmActive ? 'Pause Background Music' : 'Play Background Music (बैकग्राउंड म्यूजिक)'}
          >
            <Music className={`w-4 h-4 ${isBgmActive ? 'text-rose-400 animate-pulse' : 'text-zinc-300'}`} />
          </button>

          {/* Sound FX Button */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="p-2 rounded-xl bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>

      {!gameState ? (
        /* LOBBY / ENTRY SELECTION */
        <div className="flex-1 px-4 py-5 flex flex-col space-y-4">
          {/* Admin Maintenance Banner if Inactive */}
          {ludoActiveStatus.isActive === false && (
            <div className="bg-rose-500/15 border-2 border-rose-500/40 rounded-2xl p-4 shadow-xl text-center space-y-2 animate-pulse">
              <div className="flex items-center justify-center gap-2 text-rose-400 font-black text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>लूडो गेम मेंटेनेंस मोड (Under Maintenance)</span>
              </div>
              <p className="text-xs text-rose-200 font-medium leading-relaxed">
                {ludoActiveStatus.maintenanceNotice || 'लूडो गेम में नया अपडेट और मेंटेनेंस कार्य प्रगति पर है। कृपया कुछ समय बाद पुनः प्रयास करें।'}
              </p>
              <div className="inline-block px-3 py-1 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded-full border border-rose-500/30">
                ⚠️ अभी मैच शुरू नहीं किए जा सकते
              </div>
            </div>
          )}

          {/* Banner Card */}
          <div className="relative rounded-2xl overflow-hidden border border-blue-500/30 shadow-2xl p-4 bg-gradient-to-br from-[#13274c] via-[#0f2142] to-[#0a1628]">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md inline-block mb-2">
              4 PLAYERS • 10% PLATFORM FEE
            </span>
            <h2 className="text-xl font-black text-white tracking-wide mb-1">
              Real Cash Ludo Classic
            </h2>
            <p className="text-xs text-blue-200 leading-relaxed max-w-[240px]">
              Roll 6 to open tokens. 8 Safe Stars (★). 4 Ranks Prize Distribution!
            </p>

            <div className="absolute right-3 -bottom-1 w-24 h-24 opacity-95 pointer-events-none">
              <img
                src="/assets/ludo_poster.jpg"
                alt="Ludo Poster"
                className="w-full h-full object-cover rounded-xl shadow-lg border border-amber-400/40"
              />
            </div>
          </div>

          {/* Quick Ludo Match History Summary Banner */}
          <div className="bg-[#0b1b36] border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Match Record</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {ludoHistory.filter((m) => m.status === 'won').length} Won
                  </span>
                </h4>
                <p className="text-[10px] text-zinc-400">
                  {ludoHistory.length} Matches Played • Net:{' '}
                  <span
                    className={
                      ludoHistory.reduce((acc, m) => acc + m.netProfit, 0) >= 0
                        ? 'text-emerald-400 font-bold'
                        : 'text-rose-400 font-bold'
                    }
                  >
                    ₹{ludoHistory.reduce((acc, m) => acc + m.netProfit, 0).toFixed(0)}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 font-bold text-xs border border-white/10 active:scale-95 transition"
            >
              View History
            </button>
          </div>

          {/* Entry Fee Selection */}
          <div className="bg-[#0e2246] border border-blue-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Select Match Entry
              </span>
              <span className="text-xs font-black text-amber-300">
                Prize Pool: ₹{(selectedFee * 4 * 0.9).toFixed(0)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {ENTRY_FEES.map((fee) => (
                <button
                  key={fee}
                  onClick={() => setSelectedFee(fee)}
                  className={`py-2.5 rounded-xl text-xs font-black transition border ${
                    selectedFee === fee
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-amber-300 shadow-lg scale-105'
                      : 'bg-white/5 text-blue-200 border-white/5 hover:bg-white/10'
                  }`}
                >
                  ₹{fee}
                </button>
              ))}
            </div>

            {/* Prize Breakdown Table preview */}
            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 space-y-1 text-[11px]">
              <div className="flex justify-between text-zinc-400 font-semibold border-b border-white/10 pb-1">
                <span>Rank</span>
                <span>Share</span>
                <span>Prize</span>
              </div>
              <div className="flex justify-between text-amber-300 font-bold">
                <span>🥇 1st Rank</span>
                <span>50%</span>
                <span>₹{(selectedFee * 4 * 0.9 * 0.5).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-zinc-300 font-medium">
                <span>🥈 2nd Rank</span>
                <span>30%</span>
                <span>₹{(selectedFee * 4 * 0.9 * 0.3).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 font-medium">
                <span>🥉 3rd Rank</span>
                <span>15%</span>
                <span>₹{(selectedFee * 4 * 0.9 * 0.15).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>4️⃣ 4th Rank</span>
                <span>5%</span>
                <span>₹{(selectedFee * 4 * 0.9 * 0.05).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Play Button */}
          {ludoActiveStatus.isActive === false ? (
            <button
              disabled
              className="w-full py-4 rounded-2xl bg-zinc-700 text-zinc-400 font-black text-base uppercase tracking-wider opacity-60 cursor-not-allowed flex items-center justify-center gap-2 border border-zinc-600"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>GAME UNDER MAINTENANCE (गेम बंद है)</span>
            </button>
          ) : (
            <button
              onClick={handleStartGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-base uppercase tracking-wider shadow-[0_4px_25px_rgba(251,191,36,0.4)] hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START MATCH • ₹{selectedFee}</span>
            </button>
          )}
        </div>
      ) : (
        /* LIVE GAME SCREEN MATCHING SCREENSHOT EXACTLY */
        <div className="flex-1 px-3 py-2 flex flex-col justify-between space-y-2">
          {/* Top Corner Dice & Player Panels (Green & Yellow) */}
          <div className="flex items-start justify-between gap-4 px-1">
            {/* Top-Left: Green (Computer 2) */}
            <div className="flex flex-col items-center gap-1 relative">
              {/* Hand Pointer Indicator if Green Turn */}
              {gameState.currentTurnColor === 'green' && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-500/90 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-white/40 animate-bounce z-40 whitespace-nowrap">
                  <span>👇</span>
                  <span>Comp 2 Turn</span>
                </div>
              )}

              <div className={`flex items-center gap-2 bg-[#0c1f3d] p-1.5 rounded-2xl border-2 transition-all ${
                gameState.currentTurnColor === 'green' ? 'border-green-400 ring-2 ring-green-400 shadow-[0_0_15px_rgba(34,197,94,0.6)] scale-105' : 'border-green-500/60 shadow-md'
              }`}>
                {/* Profile Box */}
                <div className="flex items-center gap-1.5 pr-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-sm overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80"
                      alt="Computer 2"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white leading-none">Comp 2</span>
                    <span className="text-[8px] text-emerald-400 font-bold">Green</span>
                  </div>
                </div>

                {/* 3D Dice */}
                <div className="relative">
                  <Dice3D
                    value={activeDiceValues.green}
                    isRolling={isDiceRolling && gameState.currentTurnColor === 'green'}
                    canRoll={false}
                    playerColor="green"
                    onRoll={() => {}}
                  />
                  {activeDiceValues.green && !isDiceRolling && gameState.currentTurnColor === 'green' && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-md animate-scale">
                      {activeDiceValues.green}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Players: Hearts placed BELOW their dice box */}
              {renderPlayerHearts('green')}
            </div>

            {/* Top-Right: Yellow (Computer 3) */}
            <div className="flex flex-col items-center gap-1 relative">
              {/* Hand Pointer Indicator if Yellow Turn */}
              {gameState.currentTurnColor === 'yellow' && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-yellow-500/90 text-black font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-black/30 animate-bounce z-40 whitespace-nowrap">
                  <span>👇</span>
                  <span>Comp 3 Turn</span>
                </div>
              )}

              <div className={`flex items-center gap-2 bg-[#0c1f3d] p-1.5 rounded-2xl border-2 transition-all ${
                gameState.currentTurnColor === 'yellow' ? 'border-yellow-400 ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.6)] scale-105' : 'border-yellow-500/60 shadow-md'
              }`}>
                {/* 3D Dice */}
                <div className="relative">
                  <Dice3D
                    value={activeDiceValues.yellow}
                    isRolling={isDiceRolling && gameState.currentTurnColor === 'yellow'}
                    canRoll={false}
                    playerColor="yellow"
                    onRoll={() => {}}
                  />
                  {activeDiceValues.yellow && !isDiceRolling && gameState.currentTurnColor === 'yellow' && (
                    <div className="absolute -bottom-1 -left-1 bg-yellow-400 text-black font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center border border-black/40 shadow-md animate-scale">
                      {activeDiceValues.yellow}
                    </div>
                  )}
                </div>

                {/* Profile Box */}
                <div className="flex items-center gap-1.5 pl-1">
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-white leading-none">Comp 3</span>
                    <span className="text-[8px] text-yellow-400 font-bold">Yellow</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-yellow-500 border-2 border-white flex items-center justify-center shadow-sm overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                      alt="Computer 3"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Top Players: Hearts placed BELOW their dice box */}
              {renderPlayerHearts('yellow')}
            </div>
          </div>

          {/* Center 15x15 Authentic Ludo Board */}
          <div className="relative aspect-square w-full max-w-[370px] mx-auto bg-[#faf8f5] rounded-xl border-4 border-[#1b2838] shadow-2xl overflow-hidden grid grid-cols-15 grid-rows-15">
            {/* 1. Green Yard Top-Left (6x6) */}
            <div className="col-span-6 row-span-6 bg-[#27ae60] p-2 flex flex-col items-center justify-between border-b-2 border-r-2 border-black">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">Computer 2</span>
              <div className="w-full h-4/5 bg-white rounded-xl border-2 border-black/30 grid grid-cols-2 grid-rows-2 p-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full h-full rounded-full border-2 border-[#27ae60] bg-[#27ae60]/20 flex items-center justify-center shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#27ae60]/40" />
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Top-Middle Track (3x6) - Yellow Home Path */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 bg-white border-b-2 border-r-2 border-l-2 border-black">
              {Array.from({ length: 18 }).map((_, i) => {
                const col = i % 3;
                const row = Math.floor(i / 3);
                const isYellowHomeColumn = col === 1 && row > 0;
                const isGreenTrackStar = col === 0 && row === 2; // Green track star ★
                const isYellowStartStar = col === 2 && row === 1; // Yellow start cell near Yellow yard (House colored Star!)
                const isYellowEntranceArrow = col === 1 && row === 0; // Yellow arrow ↓

                return (
                  <div
                    key={i}
                    className={`border border-zinc-400 flex items-center justify-center font-black transition-colors ${
                      isYellowHomeColumn
                        ? 'bg-[#f1c40f]'
                        : isYellowStartStar
                        ? 'bg-[#fef9c3] text-[#ca8a04] text-base font-black' // Yellow colored star!
                        : isGreenTrackStar
                        ? 'bg-[#dcfce7] text-[#16a34a] text-base font-black'
                        : isYellowEntranceArrow
                        ? 'bg-white text-yellow-500 text-sm font-bold'
                        : 'bg-white'
                    }`}
                  >
                    {(isYellowStartStar || isGreenTrackStar) && '★'}
                    {isYellowEntranceArrow && '↓'}
                  </div>
                );
              })}
            </div>

            {/* 3. Yellow Yard Top-Right (6x6) */}
            <div className="col-span-6 row-span-6 bg-[#f1c40f] p-2 flex flex-col items-center justify-between border-b-2 border-l-2 border-black">
              <span className="text-[10px] font-black text-zinc-900 uppercase tracking-wider">Computer 3</span>
              <div className="w-full h-4/5 bg-white rounded-xl border-2 border-black/30 grid grid-cols-2 grid-rows-2 p-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full h-full rounded-full border-2 border-[#f1c40f] bg-[#f1c40f]/20 flex items-center justify-center shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#f1c40f]/40" />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Middle-Left Track (6x3) - Green Home Path */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 bg-white border-b-2 border-t-2 border-black">
              {Array.from({ length: 18 }).map((_, i) => {
                const col = i % 6;
                const row = Math.floor(i / 6);
                const isGreenHomeColumn = row === 1 && col > 0;
                const isGreenStartStar = col === 1 && row === 0; // Green start cell near Green yard (House colored Star!)
                const isRedTrackStar = col === 2 && row === 2; // Red track star ★
                const isGreenEntranceArrow = col === 0 && row === 1; // Green arrow →

                return (
                  <div
                    key={i}
                    className={`border border-zinc-400 flex items-center justify-center font-black transition-colors ${
                      isGreenHomeColumn
                        ? 'bg-[#27ae60]'
                        : isGreenStartStar
                        ? 'bg-[#dcfce7] text-[#16a34a] text-base font-black' // Green colored star!
                        : isRedTrackStar
                        ? 'bg-[#fee2e2] text-[#dc2626] text-base font-black'
                        : isGreenEntranceArrow
                        ? 'bg-white text-emerald-600 text-sm font-bold'
                        : 'bg-white'
                    }`}
                  >
                    {(isGreenStartStar || isRedTrackStar) && '★'}
                    {isGreenEntranceArrow && '→'}
                  </div>
                );
              })}
            </div>

            {/* 5. Center Home Triangles (3x3) */}
            <div className="col-span-3 row-span-3 relative bg-white border-2 border-black overflow-hidden">
              {/* Top Triangle (Yellow) */}
              <div
                className="absolute inset-0 bg-[#f1c40f]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }}
              />
              {/* Right Triangle (Blue) */}
              <div
                className="absolute inset-0 bg-[#2980b9]"
                style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }}
              />
              {/* Bottom Triangle (Red) */}
              <div
                className="absolute inset-0 bg-[#e74c3c]"
                style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)' }}
              />
              {/* Left Triangle (Green) */}
              <div
                className="absolute inset-0 bg-[#27ae60]"
                style={{ clipPath: 'polygon(0 0, 0 100%, 50% 50%)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Crown className="w-5 h-5 text-white drop-shadow-md" />
              </div>
            </div>

            {/* 6. Middle-Right Track (6x3) - Blue Home Path */}
            <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 bg-white border-b-2 border-t-2 border-black">
              {Array.from({ length: 18 }).map((_, i) => {
                const col = i % 6;
                const row = Math.floor(i / 6);
                const isBlueHomeColumn = row === 1 && col < 5;
                const isYellowTrackStar = col === 3 && row === 0; // Yellow track star ★
                const isBlueStartStar = col === 4 && row === 2; // Blue start cell near Blue yard (House colored Star!)
                const isBlueEntranceArrow = col === 5 && row === 1; // Blue arrow ←

                return (
                  <div
                    key={i}
                    className={`border border-zinc-400 flex items-center justify-center font-black transition-colors ${
                      isBlueHomeColumn
                        ? 'bg-[#2980b9]'
                        : isBlueStartStar
                        ? 'bg-[#dbeafe] text-[#2563eb] text-base font-black' // Blue colored star!
                        : isYellowTrackStar
                        ? 'bg-[#fef9c3] text-[#ca8a04] text-base font-black'
                        : isBlueEntranceArrow
                        ? 'bg-white text-sky-500 text-sm font-bold'
                        : 'bg-white'
                    }`}
                  >
                    {(isBlueStartStar || isYellowTrackStar) && '★'}
                    {isBlueEntranceArrow && '←'}
                  </div>
                );
              })}
            </div>

            {/* 7. Red Yard Bottom-Left (6x6) */}
            <div className="col-span-6 row-span-6 bg-[#e74c3c] p-2 flex flex-col items-center justify-between border-t-2 border-r-2 border-black">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">You</span>
              <div className="w-full h-4/5 bg-white rounded-xl border-2 border-black/30 grid grid-cols-2 grid-rows-2 p-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full h-full rounded-full border-2 border-[#e74c3c] bg-[#e74c3c]/20 flex items-center justify-center shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#e74c3c]/40" />
                  </div>
                ))}
              </div>
            </div>

            {/* 8. Bottom-Middle Track (3x6) - Red Home Path */}
            <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 bg-white border-t-2 border-r-2 border-l-2 border-black">
              {Array.from({ length: 18 }).map((_, i) => {
                const col = i % 3;
                const row = Math.floor(i / 3);
                const isRedHomeColumn = col === 1 && row < 5;
                const isRedStartStar = col === 0 && row === 4; // Red start cell near Red yard (House colored Star!)
                const isBlueTrackStar = col === 2 && row === 3; // Blue track star ★
                const isRedBottomArrow = col === 1 && row === 5; // Red arrow ↑

                return (
                  <div
                    key={i}
                    className={`border border-zinc-400 flex items-center justify-center font-black transition-colors ${
                      isRedHomeColumn
                        ? 'bg-[#e74c3c]'
                        : isRedStartStar
                        ? 'bg-[#fee2e2] text-[#dc2626] text-base font-black' // Red colored star!
                        : isBlueTrackStar
                        ? 'bg-[#dbeafe] text-[#2563eb] text-base font-black'
                        : isRedBottomArrow
                        ? 'bg-white text-red-600 text-sm font-bold'
                        : 'bg-white'
                    }`}
                  >
                    {(isRedStartStar || isBlueTrackStar) && '★'}
                    {isRedBottomArrow && '↑'}
                  </div>
                );
              })}
            </div>

            {/* 9. Blue Yard Bottom-Right (6x6) */}
            <div className="col-span-6 row-span-6 bg-[#2980b9] p-2 flex flex-col items-center justify-between border-t-2 border-l-2 border-black">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">Computer 4</span>
              <div className="w-full h-4/5 bg-white rounded-xl border-2 border-black/30 grid grid-cols-2 grid-rows-2 p-2 gap-2 shadow-inner">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full h-full rounded-full border-2 border-[#2980b9] bg-[#2980b9]/20 flex items-center justify-center shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#2980b9]/40" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tokens Render Layer on 15x15 Matrix - Fixed stable position */}
            {gameState.players.map((player) =>
              player.tokens.map((token) => {
                const pos = getTokenCoordinates(token, player.color);
                const isMovable = movableTokens.includes(token.id);

                return (
                  <div
                    key={token.id}
                    style={{
                      left: `${(pos.x / 15) * 100}%`,
                      top: `${(pos.y / 15) * 100}%`,
                      width: `${(1 / 15) * 100}%`,
                      height: `${(1 / 15) * 100}%`,
                    }}
                    className={`absolute z-30 flex items-center justify-center ${
                      isMovable ? 'pointer-events-auto cursor-pointer z-40' : 'pointer-events-none cursor-default'
                    }`}
                  >
                    <KingLudoPawn
                      color={player.color}
                      isMovable={isMovable}
                      onClick={() => {
                        if (!isMovable) return;
                        handleStepByStepMove(token.id, activeDiceValues[player.color] || 1);
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Corner Dice & Player Panels (Red & Blue) */}
          <div className="flex items-end justify-between gap-4 px-1">
            {/* Bottom-Left: Red (You) */}
            <div className="flex flex-col items-center gap-1 relative">
              {/* Bottom Players: Hearts placed ABOVE their dice box */}
              {renderPlayerHearts('red')}

              {/* Hand Pointer Indicator if Red (You) Turn */}
              {gameState.currentTurnColor === 'red' && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300 animate-bounce z-40 whitespace-nowrap">
                  {movableTokens.length > 0 ? (
                    <>
                      <span>👆</span>
                      <span className="text-amber-200">Tap your goti to move ({activeDiceValues.red})!</span>
                    </>
                  ) : isDiceRolling ? (
                    <>
                      <span>🎲</span>
                      <span>Rolling dice...</span>
                    </>
                  ) : (
                    <>
                      <span>👇</span>
                      <span>Your Turn! Roll Dice</span>
                    </>
                  )}
                </div>
              )}

              <div className={`flex items-center gap-2 bg-[#0c1f3d] p-1.5 rounded-2xl border-2 transition-all ${
                gameState.currentTurnColor === 'red' ? 'border-red-500 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] scale-105' : 'border-red-500/60 shadow-lg'
              }`}>
                {/* Profile Box */}
                <div className="flex items-center gap-1.5 pr-1">
                  <div className="w-7 h-7 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-sm overflow-hidden">
                    <img
                      src={user?.avatarUrl || '/avatars/default_avatar.jpg'}
                      alt="You"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white leading-none">You</span>
                    <span className="text-[8px] text-red-400 font-bold">Red</span>
                  </div>
                </div>

                {/* 3D Rolling Dice */}
                <div className="relative">
                  <Dice3D
                    value={activeDiceValues.red}
                    isRolling={isDiceRolling && gameState.currentTurnColor === 'red'}
                    canRoll={gameState.currentTurnColor === 'red' && gameState.canRoll && !isDiceRolling && !isMovingPiece && movableTokens.length === 0}
                    playerColor="red"
                    onRoll={() => handleRollDice('red')}
                  />
                  {activeDiceValues.red && !isDiceRolling && gameState.currentTurnColor === 'red' && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-md animate-scale">
                      {activeDiceValues.red}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom-Right: Blue (Computer 4) */}
            <div className="flex flex-col items-center gap-1 relative">
              {/* Bottom Players: Hearts placed ABOVE their dice box */}
              {renderPlayerHearts('blue')}

              {/* Hand Pointer Indicator if Blue Turn */}
              {gameState.currentTurnColor === 'blue' && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-blue-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-white/40 animate-bounce z-40 whitespace-nowrap">
                  <span>👇</span>
                  <span>Comp 4 Turn</span>
                </div>
              )}

              <div className={`flex items-center gap-2 bg-[#0c1f3d] p-1.5 rounded-2xl border-2 transition-all ${
                gameState.currentTurnColor === 'blue' ? 'border-blue-400 ring-2 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-105' : 'border-blue-500/60 shadow-md'
              }`}>
                {/* 3D Rolling Dice */}
                <div className="relative">
                  <Dice3D
                    value={activeDiceValues.blue}
                    isRolling={isDiceRolling && gameState.currentTurnColor === 'blue'}
                    canRoll={false}
                    playerColor="blue"
                    onRoll={() => {}}
                  />
                  {activeDiceValues.blue && !isDiceRolling && gameState.currentTurnColor === 'blue' && (
                    <div className="absolute -bottom-1 -left-1 bg-blue-500 text-white font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-md animate-scale">
                      {activeDiceValues.blue}
                    </div>
                  )}
                </div>

                {/* Profile Box */}
                <div className="flex items-center gap-1.5 pl-1">
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-white leading-none">Comp 4</span>
                    <span className="text-[8px] text-blue-400 font-bold">Blue</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-sm overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80"
                      alt="Computer 4"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Status & 60-Second Turn Timer Bar */}
          <div className="bg-[#0b1c38]/90 border border-blue-500/30 rounded-xl px-3 py-2 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span
                className={`font-black uppercase tracking-wider ${
                  gameState.currentTurnColor === 'red' ? 'text-amber-300 animate-pulse' : 'text-zinc-300'
                }`}
              >
                {gameState.currentTurnColor === 'red' ? '🎯 YOUR TURN' : `${gameState.currentTurnColor.toUpperCase()}'S TURN`}
              </span>
            </div>

            {/* 60s Timer Badge */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-medium">Turn Timer:</span>
              <div
                className={`px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 ${
                  turnTimeLeft <= 10
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-ping'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span>⏳</span>
                <span>{turnTimeLeft}s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MATCH WINNER / SETTLEMENT MODAL */}
      {gameState?.status === 'finished' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1d3a] border-2 border-amber-400/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 mx-auto flex items-center justify-center shadow-lg">
              <Crown className="w-9 h-9 text-slate-900" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Match Concluded!</h2>
              <p className="text-xs text-amber-300 font-bold mt-0.5">
                Winner: {gameState.winner?.name} ({gameState.winner?.color})
              </p>
            </div>

            {/* Prize Settlement Breakdown Table */}
            <div className="bg-black/40 rounded-2xl p-3 border border-white/10 space-y-2 text-xs text-left">
              <div className="flex justify-between text-zinc-400 font-bold border-b border-white/10 pb-1.5">
                <span>Rank & Player</span>
                <span>Prize Credited</span>
              </div>
              <div className="flex justify-between items-center text-amber-300 font-black">
                <span>🥇 1st Rank (50%)</span>
                <span>₹{(selectedFee * 4 * 0.9 * 0.5).toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300 font-semibold">
                <span>🥈 2nd Rank (30%)</span>
                <span>₹{(selectedFee * 4 * 0.9 * 0.3).toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>🥉 3rd Rank (15%)</span>
                <span>₹{(selectedFee * 4 * 0.9 * 0.15).toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                <span>4️⃣ 4th Rank (5%)</span>
                <span>₹{(selectedFee * 4 * 0.9 * 0.05).toFixed(0)}</span>
              </div>
            </div>

            <button
              onClick={() => setGameState(null)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-sm uppercase tracking-wider shadow-lg hover:brightness-110"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* HOW TO PLAY & CASH MATCH RULES MODAL (Exact match to Screenshots 2 & 3) */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1626] border border-blue-500/30 rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0369a1]/30 border border-[#0284c7]/40 flex items-center justify-center text-sky-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">
                    How to Play & Cash Match Rules
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    Official rules, movement, captures & prizes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable 6 Official Rule Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
              {/* Card 1: Roll 6 */}
              <div className="bg-[#112138] border border-white/5 rounded-2xl p-3 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black">
                    🎲
                  </span>
                  1. Unlocking Tokens ONLY with 6 (सिर्फ 6 से गोटी बाहर निकलेगी)
                </h4>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  घर (Yard) के अंदर मौजूद गोटी <strong className="text-amber-400">सिर्फ 6 (Six)</strong> आने पर ही बाहर निकल सकती है (1 या किसी अन्य नंबर से बाहर नहीं निकलेगी)। साथ ही मैच में कहीं भी <strong className="text-amber-400">6 आने पर आपको दोबारा डाइस घुमाने (Extra Roll)</strong> का चांस मिलता है! (लगातार अधिकतम 3 बार 6 मान्य)।
                </p>
              </div>

              {/* Card 2: 8 Safe Cells */}
              <div className="bg-[#112138] border border-white/5 rounded-2xl p-3 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">
                    ★
                  </span>
                  2. Safe Cells & Home Path
                </h4>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Cells marked with a <strong className="text-amber-400">Star (★)</strong> and starting positions with house colors are <strong className="text-emerald-400">Safe Zones</strong> where tokens cannot be captured. Your single-color home column is strictly safe.
                </p>
              </div>

              {/* Card 3: Opponent Capture */}
              <div className="bg-[#112138] border border-white/5 rounded-2xl p-3 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-black">
                    ⚔️
                  </span>
                  3. Opponent Token Capture
                </h4>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Landing on a non-safe cell occupied by an opponent's token captures it, sending it back to their yard in reverse! Capturing an opponent grants you an immediate <strong className="text-amber-400">Bonus Roll</strong>!
                </p>
              </div>

              {/* Card 4: Finishing */}
              <div className="bg-[#112138] border border-white/5 rounded-2xl p-3 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-black">
                    🎯
                  </span>
                  4. Finishing Tokens
                </h4>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Tokens need an exact dice roll to reach the center Home triangle. When a token reaches Home, you receive a bonus roll. The first player to bring all 4 tokens home wins 1st Place!
                </p>
              </div>

              {/* Card 5: Cash Prize Distribution */}
              <div className="bg-[#112138] border border-white/5 rounded-2xl p-3 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center text-[10px] font-black">
                    🏆
                  </span>
                  5. Cash Prize Distribution
                </h4>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  4 players contribute the entry amount to form the Total Pool. After 10% platform fee deduction, 100% of the Prize Pool (₹360 for ₹100 entry) is distributed: 1st (50%), 2nd (30%), 3rd (15%), 4th (5%).
                </p>
              </div>

              {/* Card 6: 60-Second Timer & 3 Lifelines */}
              <div className="bg-[#112138] border border-white/5 rounded-2xl p-3 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-black">
                    👑
                  </span>
                  6. 60-Second Timer & 3 Lifelines
                </h4>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Every player has a <strong className="text-amber-400">60-second timer (60s)</strong> to roll and make their move. Each player starts with <strong className="text-red-400">3 Lifelines (❤️❤️❤️)</strong>. If a player exceeds 60 seconds, 1 lifeline is lost. If all 3 lifelines are exhausted, the player is eliminated.
                </p>
              </div>
            </div>

            {/* Bottom Bright Blue Got It Button */}
            <div className="pt-2">
              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-full py-3 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-sm uppercase tracking-wider shadow-lg active:scale-98 transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONGRATULATIONS HOME CELEBRATION TOAST / OVERLAY */}
      {showHomeCelebration && (
        <div className="fixed inset-x-4 top-16 z-50 flex items-center justify-center animate-bounce">
          <div className="bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 p-[2px] rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.7)] max-w-sm w-full">
            <div className="bg-[#0b1626]/95 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-500 to-amber-400 flex items-center justify-center text-xl shrink-0 shadow-lg animate-pulse">
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <span>🎉 CONGRATULATIONS!</span>
                  <span className="text-xs">✨</span>
                </div>
                <div className="text-xs font-bold text-white leading-tight break-words">
                  {homeCelebrationMsg}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUIT MATCH WARNING MODAL (Penalty Notification) */}
      {showQuitConfirm && gameState && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#101c33] border-2 border-red-500/80 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500/60 mx-auto flex items-center justify-center text-red-400">
              <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">
                Quit Match Warning / खेल छोड़ने की चेतावनी
              </h3>
              <p className="text-xs text-rose-300 font-semibold leading-relaxed">
                यदि आप अभी गेम कट या एग्जिट करते हैं, तो आपका लगाया हुआ{' '}
                <span className="text-amber-300 font-black text-sm">₹{selectedFee}</span> कट जाएगा
                और वापस नहीं मिलेगा!
              </p>
            </div>

            {/* Match Penalty Detail */}
            <div className="bg-black/40 rounded-2xl p-3.5 border border-red-500/30 text-xs space-y-2 text-left">
              <div className="flex justify-between items-center text-zinc-300">
                <span>Tournament Room:</span>
                <span className="font-mono text-zinc-100 font-bold">{gameState.roomId}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Entry Amount:</span>
                <span className="font-bold text-amber-400">₹{selectedFee}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300 font-semibold border-t border-white/10 pt-1.5">
                <span>Forfeit Loss:</span>
                <span className="font-black text-red-400">-₹{selectedFee} (Non-refundable)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition"
              >
                Stay in Game
              </button>
              <button
                onClick={handleConfirmQuit}
                className="flex-1 py-3 rounded-2xl bg-red-600/30 border border-red-500/50 text-red-300 hover:bg-red-600 hover:text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition"
              >
                Quit (Lose ₹{selectedFee})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LUDO MATCH HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1626] border border-blue-500/30 rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">
                    Ludo Match History
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    Total: {ludoHistory.length} Matches • Won: {ludoHistory.filter((m) => m.status === 'won').length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-4 gap-1.5 pt-3 pb-2">
              {(['all', 'won', 'lost', 'quit'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistoryFilter(tab)}
                  className={`py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${
                    historyFilter === tab
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'won' ? 'Won' : tab === 'lost' ? 'Lost' : 'Quit'}
                </button>
              ))}
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1 text-xs">
              {ludoHistory
                .filter((record) => {
                  if (historyFilter === 'all') return true;
                  return record.status === historyFilter;
                })
                .map((record) => (
                  <div
                    key={record.id}
                    className="bg-[#112138] border border-white/5 rounded-2xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                            record.status === 'won'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : record.status === 'quit'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {record.rank === 1
                            ? '🥇'
                            : record.rank === 2
                            ? '🥈'
                            : record.rank === 3
                            ? '🥉'
                            : record.rank === 4
                            ? '4️⃣'
                            : '❌'}
                        </span>
                        <div>
                          <div className="font-bold text-white text-xs">
                            {record.rank > 0 ? `Rank ${record.rank}` : 'Forfeited / Quit'}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {record.roomId}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-black text-xs ${
                            record.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {record.netProfit >= 0 ? `+₹${record.netProfit.toFixed(0)}` : `-₹${Math.abs(record.netProfit).toFixed(0)}`}
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          {new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/30 rounded-xl p-2 flex justify-between text-[10px] text-zinc-300 border border-white/5">
                      <span>Entry: <strong className="text-white">₹{record.entryFee}</strong></span>
                      <span>Prize Won: <strong className="text-amber-300">₹{record.prizeWon.toFixed(0)}</strong></span>
                      <span>Winner: <strong className="text-zinc-200">{record.winnerName}</strong></span>
                    </div>
                  </div>
                ))}

              {ludoHistory.filter((record) => {
                if (historyFilter === 'all') return true;
                return record.status === historyFilter;
              }).length === 0 && (
                <div className="py-8 text-center text-zinc-500 text-xs space-y-1">
                  <p className="font-bold">No matches found in this category.</p>
                  <p className="text-[10px]">Start a match to build your Ludo record!</p>
                </div>
              )}
            </div>

            {/* Bottom Close Button */}
            <div className="pt-2">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition active:scale-98"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
