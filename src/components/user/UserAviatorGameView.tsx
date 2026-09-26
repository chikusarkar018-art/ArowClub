import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  ArrowLeft, Volume2, VolumeX, HelpCircle, Shield,
  History, RotateCcw, ChevronDown, CheckCircle2, Clock,
  Flame, X, Info, Settings, Play, Award, Check, Music
} from 'lucide-react';
import { aviatorMusic } from '../../utils/aviatorMusic';

interface UserAviatorGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
}

interface BetState {
  placed: boolean;
  amount: number;
  cashedOut: boolean;
  cashOutMultiplier: number;
  cashOutAmount: number;
  isAuto: boolean;
  autoCashOutAt: number;
}

interface LivePlayerBet {
  id: string;
  avatar: string;
  username: string;
  amount: number;
  cashedOut: boolean;
  multiplier?: number;
  winAmount?: number;
  isUser?: boolean;
  panelNum?: number;
}

const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=60&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=60&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=60&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=60&auto=format&fit=crop&q=60',
];

const MOCK_NAMES = [
  'd***3', 'h***7', 'z***i', 'm***6', 'z***6', 'w***2', 'm***9',
  'a***4', 'j***t', 'z***8', 'x***5', 's***1', 'p***7', 'b***6',
  'x***p', 'w***9', 'k***2', 'r***0', 'v***4', 'q***8', 'c***1'
];

export const UserAviatorGameView: React.FC<UserAviatorGameViewProps> = ({
  onBack,
  onNavigateDeposit,
}) => {
  const { user, refreshUser, showToast } = useAuth();

  // Audio Context & Mute
  const [isMuted, setIsMuted] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineSubOscRef = useRef<OscillatorNode | null>(null);
  const engineLfoRef = useRef<OscillatorNode | null>(null);
  const engineFilterRef = useRef<BiquadFilterNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);

  // Sync Aviator background music with music and mute states
  useEffect(() => {
    if (isMuted || !musicEnabled) {
      aviatorMusic.setMuted(true);
    } else {
      aviatorMusic.setMuted(false);
      aviatorMusic.play();
    }
    return () => {
      aviatorMusic.stop();
    };
  }, [isMuted, musicEnabled]);

  const toggleSoundMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    aviatorMusic.setMuted(next || !musicEnabled);
  };

  const toggleMusicPlay = () => {
    const next = !musicEnabled;
    setMusicEnabled(next);
    if (!next) {
      aviatorMusic.setMuted(true);
    } else {
      setIsMuted(false);
      aviatorMusic.setMuted(false);
      aviatorMusic.play();
    }
  };

  // Game Status: 'waiting' | 'flying' | 'crashed'
  const [gameState, setGameState] = useState<'waiting' | 'flying' | 'crashed'>('waiting');
  const [countdown, setCountdown] = useState<number>(5.0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.00);
  const [crashMultiplier, setCrashMultiplier] = useState<number>(2.45);
  const [roundId, setRoundId] = useState<number>(28430868);

  // Win Cashout Toast/Banner matching Image 2
  const [cashoutBanner, setCashoutBanner] = useState<{
    multiplier: number;
    amount: number;
  } | null>(null);

  // History Multipliers
  const [history, setHistory] = useState<number[]>([
    2.52, 1.72, 3.09, 2.04, 2.04, 1.48, 3.09, 8.52, 1.20, 1.28, 1.84, 1.18, 1.24, 2.06, 19.98, 1.07, 2.68, 1.09
  ]);

  // Sidebar Tab: 'all' | 'my' | 'top'
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'top'>('all');
  const [liveBets, setLiveBets] = useState<LivePlayerBet[]>([]);
  const [myBetsHistory, setMyBetsHistory] = useState<any[]>([]);

  // Bet Panel 1 & Bet Panel 2 States (Defaults to unplaced/idle)
  const [bet1, setBet1] = useState<BetState>({
    placed: false,
    amount: 10,
    cashedOut: false,
    cashOutMultiplier: 0,
    cashOutAmount: 0,
    isAuto: false,
    autoCashOutAt: 2.00,
  });

  const [bet2, setBet2] = useState<BetState>({
    placed: false,
    amount: 10,
    cashedOut: false,
    cashOutMultiplier: 0,
    cashOutAmount: 0,
    isAuto: false,
    autoCashOutAt: 2.00,
  });

  // Next round queued bets
  const [queuedBet1, setQueuedBet1] = useState<boolean>(false);
  const [queuedBet2, setQueuedBet2] = useState<boolean>(false);

  // Modals
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // References for animation loop
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const crashTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothMultiplierRef = useRef<number>(1.00);
  const targetMultiplierRef = useRef<number>(1.00);

  // -------------------------------------------------------------
  // High-Fidelity Spribe Aviator Audio Synthesizer
  // Engine Sound, Propeller Harmonics, Cashout Bell & Crash Doppler
  // -------------------------------------------------------------
  const initAudio = () => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch {}
  };

  const playClickSound = () => {
    if (isMuted) return;
    initAudio();
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(960, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // ignore
    }
  };

  const playCashoutSound = () => {
    if (isMuted) return;
    initAudio();
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;

      // Authentic Aviator crystal cashout bell arpeggio (C6, E6, G6, C7)
      const freqs = [1046.50, 1318.51, 1567.98, 2093.00];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.20, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.45);
      });

      // Shimmering coin sound burst
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.15), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.25;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(now);
    } catch {
      // ignore
    }
  };

  const playCrashSound = () => {
    if (isMuted) return;
    initAudio();
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;

      // Authentic Aviator "Flew Away" pitch-dive whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.45);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

      // Jet air rush noise sweep
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.45), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.45);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(now);
    } catch {
      // ignore
    }
  };

  const startEngineSound = () => {
    if (isMuted) return;
    initAudio();
    try {
      stopEngineSound();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;

      // Main saw engine osc
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);

      // Sub harmonic rumble
      const subOsc = ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(65, now);

      // Propeller blade LFO chopper
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(28, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.015, now);
      lfo.connect(lfoGain);

      // Resonant Lowpass Filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.Q.setValueAtTime(3.0, now);

      // Master engine gain
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.045, now);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      lfoGain.connect(gain.gain);
      gain.connect(ctx.destination);

      osc.start(now);
      subOsc.start(now);
      lfo.start(now);

      engineOscRef.current = osc;
      engineSubOscRef.current = subOsc;
      engineLfoRef.current = lfo;
      engineFilterRef.current = filter;
      engineGainRef.current = gain;
    } catch {
      // ignore
    }
  };

  const updateEnginePitch = (mult: number) => {
    if (isMuted || !engineOscRef.current || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const freq = Math.min(780, 130 + Math.pow(Math.max(0, mult - 1.0), 0.72) * 85);
      engineOscRef.current.frequency.setTargetAtTime(freq, now, 0.05);

      if (engineSubOscRef.current) {
        engineSubOscRef.current.frequency.setTargetAtTime(freq * 0.5, now, 0.05);
      }
      if (engineFilterRef.current) {
        engineFilterRef.current.frequency.setTargetAtTime(Math.min(2600, 450 + Math.pow(Math.max(0, mult - 1.0), 0.8) * 180), now, 0.05);
      }
      if (engineLfoRef.current) {
        engineLfoRef.current.frequency.setTargetAtTime(Math.min(65, 28 + (mult - 1) * 3), now, 0.05);
      }
    } catch {
      // ignore
    }
  };

  const stopEngineSound = () => {
    try {
      if (engineOscRef.current) {
        engineOscRef.current.stop();
        engineOscRef.current.disconnect();
        engineOscRef.current = null;
      }
      if (engineSubOscRef.current) {
        engineSubOscRef.current.stop();
        engineSubOscRef.current.disconnect();
        engineSubOscRef.current = null;
      }
      if (engineLfoRef.current) {
        engineLfoRef.current.stop();
        engineLfoRef.current.disconnect();
        engineLfoRef.current = null;
      }
      if (engineFilterRef.current) {
        engineFilterRef.current.disconnect();
        engineFilterRef.current = null;
      }
      if (engineGainRef.current) {
        engineGainRef.current.disconnect();
        engineGainRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  // Complete cleanup on component unmount & tab visibility change so NO sound continues when user leaves or closes tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopEngineSound();
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          audioCtxRef.current.suspend().catch(() => {});
        }
      }
    };

    const handleBlur = () => {
      stopEngineSound();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handleBlur);
    window.addEventListener('beforeunload', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handleBlur);
      window.removeEventListener('beforeunload', handleBlur);
      stopEngineSound();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // Generate random crash point with 97% RTP distribution
  // -------------------------------------------------------------
  const generateCrashPoint = (): number => {
    const rand = Math.random();
    if (rand < 0.03) return 1.00;
    const mult = 0.97 / (1 - rand);
    return Math.max(1.01, parseFloat(mult.toFixed(2)));
  };

  // Generate live player bets
  const generateLiveBets = () => {
    const list: LivePlayerBet[] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const name = MOCK_NAMES[i % MOCK_NAMES.length];
      const avatar = MOCK_AVATARS[i % MOCK_AVATARS.length];
      const amounts = [100, 200, 500, 1000, 2000, 4200, 5800, 6400, 6900, 7000, 8000];
      const amt = amounts[Math.floor(Math.random() * amounts.length)];
      list.push({
        id: `bet-${i}`,
        avatar,
        username: name,
        amount: amt,
        cashedOut: false,
      });
    }
    return list;
  };

  // -------------------------------------------------------------
  // CONTINUOUS 24/7 SERVER-AUTHORITATIVE LIVE GAME LOOP SYNCHRONIZATION
  // -------------------------------------------------------------
  const prevPhaseRef = useRef<'waiting' | 'flying' | 'crashed'>('waiting');

  useEffect(() => {
    let isMounted = true;

    const syncAviatorState = async () => {
      try {
        const res = await api.getAviatorLiveState();
        if (!isMounted || !res || !res.success) return;

        const serverPhase = res.phase;
        const prevPhase = prevPhaseRef.current;

        setRoundId(res.roundId);
        if (Array.isArray(res.history) && res.history.length > 0) {
          setHistory(res.history);
        }

        if (serverPhase === 'waiting') {
          setGameState('waiting');
          setCountdown(res.countdown);
          setCurrentMultiplier(1.00);
          smoothMultiplierRef.current = 1.00;
          targetMultiplierRef.current = 1.00;
          stopEngineSound();

          // If transitioning from crashed to waiting, handle queued bets
          if (prevPhase !== 'waiting') {
            if (queuedBet1) {
              setBet1(prev => ({ ...prev, placed: true, cashedOut: false, cashOutMultiplier: 0, cashOutAmount: 0 }));
              setQueuedBet1(false);
            }
            if (queuedBet2) {
              setBet2(prev => ({ ...prev, placed: true, cashedOut: false, cashOutMultiplier: 0, cashOutAmount: 0 }));
              setQueuedBet2(false);
            }
            setLiveBets(generateLiveBets());
          }
        } else if (serverPhase === 'flying') {
          setGameState('flying');
          const mult = Math.max(1.00, res.currentMultiplier);
          targetMultiplierRef.current = mult;
          setCurrentMultiplier(mult);
          updateEnginePitch(mult);

          if (prevPhase !== 'flying') {
            startTimeRef.current = performance.now();
            smoothMultiplierRef.current = 1.00;
            startEngineSound();
          }

          // Auto cash out check
          if (bet1.placed && !bet1.cashedOut && bet1.isAuto && mult >= bet1.autoCashOutAt) {
            handleCashOut(1, mult);
          }
          if (bet2.placed && !bet2.cashedOut && bet2.isAuto && mult >= bet2.autoCashOutAt) {
            handleCashOut(2, mult);
          }

          // Multiplayer cashouts
          setLiveBets(prev =>
            prev.map(p => {
              if (!p.cashedOut && Math.random() < 0.04 && mult > 1.2) {
                return {
                  ...p,
                  cashedOut: true,
                  multiplier: mult,
                  winAmount: parseFloat((p.amount * mult).toFixed(2)),
                };
              }
              return p;
            })
          );
        } else if (serverPhase === 'crashed') {
          const finalMult = res.crashMultiplier || res.currentMultiplier || 1.00;
          targetMultiplierRef.current = finalMult;
          smoothMultiplierRef.current = finalMult;
          setCurrentMultiplier(finalMult);
          setGameState('crashed');
          setCountdown(res.countdown);

          if (prevPhase !== 'crashed') {
            stopEngineSound();
            playCrashSound();
            crashTimeRef.current = performance.now();

            // Settle losses for un-cashed bets
            const hadUncashedBet = (bet1.placed && !bet1.cashedOut) || (bet2.placed && !bet2.cashedOut);
            if (bet1.placed && !bet1.cashedOut) {
              setMyBetsHistory(prev => [
                {
                  id: `my-${Date.now()}-1`,
                  roundId: res.roundId || roundId,
                  amount: bet1.amount,
                  multiplier: finalMult,
                  winAmount: 0,
                  status: 'lost',
                  time: new Date().toLocaleTimeString(),
                },
                ...prev.filter(b => b.roundId !== (res.roundId || roundId) || b.panelNum !== 1),
              ]);
              setBet1(prev => ({ ...prev, placed: false }));
            }
            if (bet2.placed && !bet2.cashedOut) {
              setMyBetsHistory(prev => [
                {
                  id: `my-${Date.now()}-2`,
                  roundId: res.roundId || roundId,
                  amount: bet2.amount,
                  multiplier: finalMult,
                  winAmount: 0,
                  status: 'lost',
                  time: new Date().toLocaleTimeString(),
                },
                ...prev.filter(b => b.roundId !== (res.roundId || roundId) || b.panelNum !== 2),
              ]);
              setBet2(prev => ({ ...prev, placed: false }));
            }
            if (hadUncashedBet) {
              refreshUser();
            }
          }
        }

        prevPhaseRef.current = serverPhase;
      } catch {
        // Silently tolerate transient network glitches
      }
    };

    // Immediate initial sync
    syncAviatorState();

    // High frequency 200ms background polling keeps client perfectly synchronized with server 24/7
    const pollInterval = setInterval(syncAviatorState, 200);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      stopEngineSound();
    };
  }, [queuedBet1, queuedBet2, bet1, bet2]);

  // -------------------------------------------------------------
  // Place Bet / Queue Bet Action
  // -------------------------------------------------------------
  const handleToggleBet = async (panelNum: 1 | 2) => {
    playClickSound();
    if (!user) return;

    const betState = panelNum === 1 ? bet1 : bet2;
    const setBetState = panelNum === 1 ? setBet1 : setBet2;
    const isQueued = panelNum === 1 ? queuedBet1 : queuedBet2;
    const setQueued = panelNum === 1 ? setQueuedBet1 : setQueuedBet2;
    const userUid = user.uid || String(user.id).replace(/^u-/, '');

    // If bet is already placed or queued, cancel it via server API
    if ((gameState === 'waiting' && betState.placed) || isQueued) {
      const cancelRes = await api.cancelAviatorLiveBet(userUid, panelNum);
      if (cancelRes.success) {
        setBetState(prev => ({ ...prev, placed: false }));
        setQueued(false);
        await refreshUser();
        showToast('Bet cancelled and refunded', 'info');
      } else {
        showToast(cancelRes.message || 'Could not cancel bet', 'error');
      }
      return;
    }

    // Check deposit requirement (Minimum ₹100 deposit required to unlock real betting)
    const totalDeposit = Number(user.totalDeposit || 0);
    if (totalDeposit < 100) {
      window.dispatchEvent(new CustomEvent('open-deposit-required', {
        detail: { minRequired: 100, currentDeposit: totalDeposit }
      }));
      return;
    }

    // Check balance
    if (user.walletBalance < betState.amount) {
      showToast('Insufficient wallet balance! Please recharge.', 'error');
      onNavigateDeposit();
      return;
    }

    // Place bet on server live engine
    const res = await api.placeAviatorLiveBet(
      userUid,
      panelNum,
      betState.amount,
      betState.isAuto,
      betState.autoCashOutAt
    );

    if (!res.success) {
      showToast(res.message || 'Failed to place bet', 'error');
      return;
    }
    await refreshUser();

    if (!res.isQueued) {
      setBetState(prev => ({
        ...prev,
        placed: true,
        cashedOut: false,
        cashOutMultiplier: 0,
        cashOutAmount: 0,
      }));
      // Add to liveBets with isUser
      const myLiveBet: LivePlayerBet = {
        id: `user-bet-panel-${panelNum}-${Date.now()}`,
        avatar: (user as any).avatar || MOCK_AVATARS[0],
        username: user.username || `User_${userUid.slice(-4)}`,
        amount: betState.amount,
        cashedOut: false,
        isUser: true,
        panelNum,
      };
      setLiveBets(prev => [myLiveBet, ...prev.filter(b => !(b as any).isUser || (b as any).panelNum !== panelNum)]);
      setMyBetsHistory(prev => [
        {
          id: `my-${Date.now()}-${panelNum}`,
          roundId: res.targetRoundId || roundId,
          panelNum,
          amount: betState.amount,
          multiplier: 0,
          winAmount: 0,
          status: 'active',
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      showToast(`Bet of ₹${betState.amount.toFixed(2)} placed for Round #${res.targetRoundId}!`, 'success');
    } else {
      setQueued(true);
      setMyBetsHistory(prev => [
        {
          id: `my-${Date.now()}-${panelNum}`,
          roundId: res.targetRoundId || roundId,
          panelNum,
          amount: betState.amount,
          multiplier: 0,
          winAmount: 0,
          status: 'queued',
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      showToast(`Bet of ₹${betState.amount.toFixed(2)} queued for Round #${res.targetRoundId}!`, 'info');
    }
  };

  // -------------------------------------------------------------
  // Cash Out Action
  // -------------------------------------------------------------
  const handleCashOut = async (panelNum: 1 | 2, _multiplierToUse?: number) => {
    if (gameState !== 'flying') return;
    const betState = panelNum === 1 ? bet1 : bet2;
    const setBetState = panelNum === 1 ? setBet1 : setBet2;

    if (!betState.placed || betState.cashedOut) return;

    if (!user) return;

    const userUid = user.uid || String(user.id).replace(/^u-/, '');
    const res = await api.cashoutAviatorLiveBet(userUid, panelNum);
    if (!res.success) {
      return;
    }

    const mult = res.multiplier;
    const winAmt = res.winAmount;

    playCashoutSound();

    setBetState(prev => ({
      ...prev,
      cashedOut: true,
      cashOutMultiplier: mult,
      cashOutAmount: winAmt,
    }));

    // Update in liveBets
    setLiveBets(prev =>
      prev.map(b =>
        b.isUser && b.panelNum === panelNum
          ? { ...b, cashedOut: true, multiplier: mult, winAmount: winAmt }
          : b
      )
    );

    // Trigger Win Popup
    setCashoutBanner({
      multiplier: mult,
      amount: winAmt,
    });

    setTimeout(() => {
      setCashoutBanner(null);
    }, 4000);

    await refreshUser();

    setMyBetsHistory(prev => [
      {
        id: `my-${Date.now()}-${panelNum}`,
        roundId,
        panelNum,
        amount: betState.amount,
        multiplier: mult,
        winAmount: winAmt,
        status: 'won',
        time: new Date().toLocaleTimeString(),
      },
      ...prev.filter(b => b.roundId !== roundId || b.panelNum !== panelNum),
    ]);
  };

  // -------------------------------------------------------------
  // High-Fidelity Aviator Canvas Radar & Vector Aircraft Rendering
  // -------------------------------------------------------------
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const now = performance.now();

      ctx.clearRect(0, 0, width, height);

      // 1. Background: Obsidian canvas with slowly rotating sunburst rays & dynamic center glow
      const isMobile = width < 600;
      const planeScale = isMobile ? 0.78 : 1.02;

      // Base solid dark background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, width, height);

      // Multiplier Dynamic Glow Theme (Smooth color transition matching authentic Aviator)
      const getTheme = (m: number) => {
        if (m >= 50.0) {
          return {
            glowCenter: 'rgba(245, 158, 11, 0.42)',
            glowMid: 'rgba(217, 119, 6, 0.20)',
            glowOuter: 'rgba(40, 20, 5, 0.05)',
            curveStroke: '#f59e0b',
            curveGlow: '#fde047',
            fillTop: 'rgba(234, 179, 8, 0.88)',
            fillBottom: 'rgba(180, 83, 9, 0.35)',
            rayLight: 'rgba(255, 255, 255, 0.045)',
            rayDark: 'rgba(0, 0, 0, 0.45)',
          };
        }
        if (m >= 10.0) {
          return {
            glowCenter: 'rgba(219, 39, 119, 0.42)',
            glowMid: 'rgba(190, 24, 93, 0.22)',
            glowOuter: 'rgba(45, 10, 28, 0.05)',
            curveStroke: '#f5c443',
            curveGlow: '#fde047',
            fillTop: 'rgba(245, 196, 67, 0.88)',
            fillBottom: 'rgba(202, 138, 4, 0.35)',
            rayLight: 'rgba(255, 255, 255, 0.045)',
            rayDark: 'rgba(0, 0, 0, 0.45)',
          };
        }
        if (m >= 2.0) {
          // Purple/Violet (Screenshot 1 at 2.28x)
          return {
            glowCenter: 'rgba(139, 92, 246, 0.42)',
            glowMid: 'rgba(109, 40, 217, 0.24)',
            glowOuter: 'rgba(30, 10, 55, 0.05)',
            curveStroke: '#f5c443',
            curveGlow: '#fde047',
            fillTop: 'rgba(245, 196, 67, 0.88)',
            fillBottom: 'rgba(202, 138, 4, 0.35)',
            rayLight: 'rgba(255, 255, 255, 0.04)',
            rayDark: 'rgba(0, 0, 0, 0.45)',
          };
        }
        // Base 1.00x - 1.99x: Cyan / Deep Blue (Screenshot 2 at 1.07x)
        return {
          glowCenter: 'rgba(14, 165, 233, 0.38)',
          glowMid: 'rgba(3, 105, 161, 0.22)',
          glowOuter: 'rgba(10, 30, 50, 0.05)',
          curveStroke: '#f5c443',
          curveGlow: '#fde047',
          fillTop: 'rgba(245, 196, 67, 0.88)',
          fillBottom: 'rgba(202, 138, 4, 0.35)',
          rayLight: 'rgba(255, 255, 255, 0.04)',
          rayDark: 'rgba(0, 0, 0, 0.45)',
        };
      };

      const theme = getTheme(currentMultiplier);

      // Rotating background rays: ONLY rotates after the round starts and plane is flying!
      ctx.save();
      const originX = 28;
      const originY = height - 28;
      const flightElapsed = gameState === 'flying' ? (now - startTimeRef.current) : 0;
      const rayAngleOffset = gameState === 'flying' ? (flightElapsed * 0.0006) % (Math.PI * 2) : 0;
      const numRays = 36;
      const rayRadius = Math.max(width, height) * 2;

      for (let i = 0; i < numRays; i++) {
        const a1 = rayAngleOffset + (i * Math.PI * 2) / numRays;
        const a2 = rayAngleOffset + ((i + 0.5) * Math.PI * 2) / numRays;

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.arc(originX, originY, rayRadius, a1, a2, false);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? theme.rayLight : theme.rayDark;
        ctx.fill();
      }
      ctx.restore();

      // Dynamic Radial Center Glow matching multiplier color (Cyan -> Purple -> Magenta -> Gold)
      ctx.save();
      const glowCenterX = width * 0.52;
      const glowCenterY = height * 0.48;
      const glowRadius = Math.max(width, height) * 0.65;
      const centerGlow = ctx.createRadialGradient(
        glowCenterX, glowCenterY, 10,
        glowCenterX, glowCenterY, glowRadius
      );
      centerGlow.addColorStop(0, theme.glowCenter);
      centerGlow.addColorStop(0.45, theme.glowMid);
      centerGlow.addColorStop(0.85, theme.glowOuter);
      centerGlow.addColorStop(1, 'rgba(10, 13, 20, 0.95)');

      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 2. Coordinate Grid Axis & Indicator Dots (Cyan dots on Left Y-axis, White dots on Bottom X-axis)
      ctx.save();
      const axisX = 24;
      const axisY = height - 24;

      // Cyan dots on Left Vertical Axis
      const yDotCount = isMobile ? 5 : 7;
      for (let i = 1; i <= yDotCount; i++) {
        const dotY = axisY - (axisY / (yDotCount + 1)) * i;
        ctx.fillStyle = '#38bdf8'; // Electric Cyan
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(axisX, dotY, isMobile ? 1.8 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // White dots on Bottom Horizontal Axis
      const xDotCount = isMobile ? 6 : 8;
      for (let j = 1; j <= xDotCount; j++) {
        const dotX = axisX + ((width - axisX) / (xDotCount + 1)) * j;
        ctx.fillStyle = '#ffffff'; // Pure White
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(dotX, axisY, isMobile ? 1.8 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Flight Coordinates & Boundaries (GUARANTEED STRICTLY INSIDE CANVAS AT ALL TIMES)
      const startX = 26;
      const startY = height - 26;
      
      // Safe padding bounds so the plane NEVER touches or exceeds canvas edges during flight
      const maxX = width - (isMobile ? 68 : 88);
      const minY = isMobile ? 36 : 46;

      // Helper function to draw Golden Yellow Aviator Propeller Monoplane
      const drawPlane = (x: number, y: number, angle: number, propSpeedMultiplier: number = 1) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(planeScale, planeScale);
        ctx.rotate(angle);

        // Dynamic golden engine exhaust flare behind plane
        if (gameState === 'flying' || gameState === 'crashed') {
          ctx.save();
          ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
          ctx.beginPath();
          ctx.arc(-28, 2, 4 + Math.sin(now * 0.05) * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
          ctx.beginPath();
          ctx.arc(-32, 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Landing gear struts & wheels
        ctx.fillStyle = '#1e1b2e';
        ctx.fillRect(-6, 8, 3, 8);
        ctx.fillRect(8, 8, 3, 8);
        ctx.beginPath();
        ctx.arc(-4, 16, 3.5, 0, Math.PI * 2);
        ctx.arc(10, 16, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Golden Yellow Fuselage Body
        ctx.save();
        ctx.shadowColor = '#ca8a04';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#eab308'; // Rich Bright Yellow Base

        ctx.beginPath();
        ctx.moveTo(28, 0); // Nose tip
        ctx.bezierCurveTo(22, -8, 6, -10, -18, -8); // Top contour
        ctx.lineTo(-30, -18); // Tail fin top
        ctx.lineTo(-36, -18);
        ctx.lineTo(-30, -1); // Tail cone
        ctx.lineTo(-34, 8); // Sub fin
        ctx.lineTo(-28, 8);
        ctx.bezierCurveTo(-14, 6, 8, 8, 28, 0); // Belly
        ctx.closePath();
        ctx.fill();

        // Upper body bright golden highlight
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(24, -1);
        ctx.bezierCurveTo(15, -6, 0, -8, -18, -6);
        ctx.lineTo(-18, -1);
        ctx.closePath();
        ctx.fill();

        // Tail Signature "X" Aerodynamic Markings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-22, -7);
        ctx.lineTo(-15, 2);
        ctx.moveTo(-15, -7);
        ctx.lineTo(-22, 2);
        ctx.stroke();

        // Cockpit Windshield (Glossy crystal glass)
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, -4);
        ctx.bezierCurveTo(3, -9, -5, -9, -8, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Main Swept Wing (Golden Amber with bright gold trim accent)
        ctx.fillStyle = '#ca8a04';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(6, -2);
        ctx.lineTo(-6, -16);
        ctx.lineTo(-14, -16);
        ctx.lineTo(-6, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Golden Nose Spinner Cone
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(28, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Spinning Propeller Blades
        const propPhase = ((now * 0.05 * propSpeedMultiplier) % 100) / 100;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(30, -16 * Math.sin(propPhase * Math.PI * 2));
        ctx.lineTo(30, 16 * Math.sin(propPhase * Math.PI * 2));
        ctx.stroke();

        // Propeller Blur Ring
        ctx.fillStyle = 'rgba(254, 240, 138, 0.3)';
        ctx.beginPath();
        ctx.ellipse(30, 0, 2.5, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();
      };

      // 60 FPS smooth continuous multiplier advance (calibrated for calm, slower ascent)
      if (gameState === 'flying') {
        const target = targetMultiplierRef.current;
        if (smoothMultiplierRef.current < target) {
          const delta = target - smoothMultiplierRef.current;
          smoothMultiplierRef.current += Math.max(0.0008, delta * 0.12);
          if (smoothMultiplierRef.current > target) {
            smoothMultiplierRef.current = target;
          }
        } else {
          // Moderate, steady pace matching server 0.065 rate
          smoothMultiplierRef.current += 0.0011 * Math.max(1.0, smoothMultiplierRef.current);
        }
      } else if (gameState === 'waiting') {
        smoothMultiplierRef.current = 1.00;
      } else if (gameState === 'crashed') {
        smoothMultiplierRef.current = targetMultiplierRef.current;
      }

      const activeMult = gameState === 'flying' ? smoothMultiplierRef.current : currentMultiplier;

      if (gameState === 'waiting') {
        // Plane rests at starting point, engine idling with authentic gentle vibration
        const vibration = Math.sin(now * 0.02) * 1.2;
        drawPlane(startX + 8, startY - 4 + vibration, -0.12, 0.6);
      } else if (gameState === 'flying' || gameState === 'crashed') {
        // AUTHENTIC AVIATOR FLIGHT TRAJECTORY:
        // Pure, smooth ascending monotonic graph from bottom-left corner (startX, startY) to cruising zone.
        // The trajectory line itself has ZERO waves, dips, or crookedness.
        const targetX = width * 0.74;
        const targetY = height * 0.38;
        const multOffset = Math.max(0, activeMult - 1.0);

        // Smooth horizontal & vertical progress towards cruising position
        const progress = Math.min(1.0, multOffset / 1.5);
        const ease = 1 - Math.pow(1 - progress, 2.2);

        // Smooth end coordinates of the trajectory line (always rising monotonically)
        const lineX = startX + ease * (targetX - startX);
        const lineY = startY - ease * (startY - targetY);

        // Plane position: sits at line head with gentle subtle engine hover (plane may hover gently, but line remains rock-solid)
        const hover = Math.sin(now * 0.003) * (isMobile ? 3.5 : 5.0);
        const planeX = lineX;
        const planeY = Math.max(height * 0.16, lineY + hover);

        // Control point for pure smooth upward arc (starts horizontal at origin, smoothly ascends)
        const ctrlX = startX + (lineX - startX) * 0.52;
        const ctrlY = startY;

        // 3. Glowing Golden Yellow Area Fill below clean ascending trajectory
        ctx.save();
        const fillGrad = ctx.createLinearGradient(0, height * 0.22, 0, startY);
        fillGrad.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
        fillGrad.addColorStop(0.55, 'rgba(234, 179, 8, 0.18)');
        fillGrad.addColorStop(1, 'rgba(202, 138, 4, 0.01)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, lineX, lineY);
        ctx.lineTo(lineX, startY);
        ctx.closePath();
        ctx.fillStyle = fillGrad;
        ctx.fill();
        ctx.restore();

        // 4. Glowing Yellow Trajectory Line (सीधा और स्मूद ग्राफ, एक कोने से ऊपर तक बिना किसी टेढ़े-मेढ़ेपन के)
        ctx.save();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = isMobile ? 4.2 : 5.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, lineX, lineY);
        ctx.stroke();
        ctx.restore();

        // 5. Plane Rendering (Yellow Plane with authentic upward pitch along trajectory)
        if (gameState === 'flying') {
          // Angle tangent along the curve at line end (P2 - P1)
          const tangentAngle = Math.atan2(lineY - ctrlY, lineX - ctrlX);
          const planeAngle = Math.max(-0.48, Math.min(-0.08, tangentAngle));

          drawPlane(planeX, planeY, planeAngle, 2.5);
        } else if (gameState === 'crashed') {
          // INSTANT CRASH: Plane zips away immediately in a flash (< 0.16s)
          const crashElapsed = (now - crashTimeRef.current) / 1000;
          if (crashElapsed < 0.16) {
            const flyAwayX = planeX + crashElapsed * 4800;
            const flyAwayY = planeY - crashElapsed * 2600;
            drawPlane(flyAwayX, flyAwayY, -0.70, 4.0);
          }
        }
      }

      // 6. Live Center Multiplier (60 FPS crisp typography directly on canvas)
      if (gameState === 'flying') {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${isMobile ? 50 : 72}px "SF Pro Display", -apple-system, monospace, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 18;
        ctx.fillText(`${activeMult.toFixed(2)}x`, width / 2, height / 2);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, currentMultiplier]);

  const getPillColor = (mult: number) => {
    if (mult >= 10.0) return 'bg-[#c026d3] text-white border-pink-400';
    if (mult >= 2.0) return 'bg-[#7c3aed] text-white border-purple-400';
    return 'bg-[#2563eb] text-white border-blue-400';
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white flex flex-col font-sans select-none pb-16">
      
      {/* 1. TOP FIXED HEADER */}
      <header className="px-3 py-2 bg-[#121520] border-b border-white/10 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        
        {/* Left: Back & Aviator Logo with XTREME tag */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Stylized Red Aviator Logo */}
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black italic tracking-tighter text-[#e63946] drop-shadow-[0_0_10px_rgba(230,57,70,0.8)]">
              Aviator
            </span>
            <span className="text-[9px] font-black uppercase bg-[#f59e0b] text-[#0a0d14] px-1 py-0.2 rounded font-sans tracking-wide">
              XTREME
            </span>
          </div>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="w-6 h-6 rounded-full bg-amber-500/20 text-[#f5c443] border border-[#f5c443]/30 flex items-center justify-center text-xs font-bold hover:bg-amber-500/30 transition ml-1"
            title="How to play"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Balance & Controls */}
        <div className="flex items-center gap-2">
          <div
            onClick={onNavigateDeposit}
            className="flex items-center gap-1.5 bg-[#1a2030] border border-white/10 px-2.5 py-1 rounded-full cursor-pointer shadow-sm transition active:scale-95"
          >
            <span className="text-xs font-black text-emerald-400 font-mono">
              ₹{(user?.walletBalance ?? 0).toFixed(2)}
            </span>
          </div>

          <button
            onClick={onNavigateDeposit}
            className="flex items-center gap-1 px-3 py-1 bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0d14] font-black text-xs rounded-full shadow-[0_0_12px_rgba(34,197,94,0.4)] transition active:scale-95 uppercase tracking-wide"
          >
            <span>DEPOSIT</span>
          </button>

          <button
            onClick={toggleSoundMute}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition ${
              isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-zinc-300'
            }`}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleMusicPlay}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition ${
              musicEnabled && !isMuted ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm' : 'bg-white/10 text-zinc-500'
            }`}
            title={musicEnabled && !isMuted ? 'Mute Music' : 'Play Music'}
          >
            <Music className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowProvablyFair(true)}
            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400 hover:bg-white/20 transition"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. HISTORY MULTIPLIERS STRIP */}
      <div className="bg-[#0a0d14] border-b border-white/10 px-3 py-1.5 flex items-center justify-between overflow-x-auto no-scrollbar gap-1.5 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
          {history.map((m, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono shadow-sm border border-white/10 whitespace-nowrap ${getPillColor(
                m
              )}`}
            >
              {m.toFixed(2)}x
            </span>
          ))}
        </div>

        <button
          onClick={() => setShowHistoryModal(true)}
          className="shrink-0 p-1 text-zinc-400 hover:text-white transition flex items-center gap-0.5 text-[10px]"
        >
          <History className="w-3.5 h-3.5" />
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* 3. MAIN GAME CONTENT */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-2.5 grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* LEFT COLUMN: All Bets / My Bets / Top */}
        <div className="lg:col-span-4 bg-[#141824] border border-white/10 rounded-2xl p-2.5 flex flex-col h-80 lg:h-[550px] shadow-xl overflow-hidden order-2 lg:order-1">
          
          {/* Tabs: All Bets / My Bet */}
          <div className="grid grid-cols-2 bg-[#0d0f17] p-1 rounded-xl text-xs font-bold mb-2 border border-white/5">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-1 rounded-lg transition ${
                activeTab === 'all' ? 'bg-[#252e48] text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Bets
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`py-1 rounded-lg transition ${
                activeTab === 'my' ? 'bg-[#252e48] text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              My Bet
            </button>
          </div>

          {/* Subheader with Avatars + Bets count & Total Win (Matching Screenshot 1 & 2) */}
          <div className="bg-[#0f131d] border border-white/5 rounded-xl p-2 mb-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border border-[#0f131d]" />
                  <div className="w-4 h-4 rounded-full bg-blue-500 border border-[#0f131d]" />
                  <div className="w-4 h-4 rounded-full bg-purple-500 border border-[#0f131d]" />
                </div>
                <span className="text-zinc-300 font-mono text-[11px]">1166/1502 Bets</span>
              </div>
              <div className="text-[11px] font-mono text-emerald-400 font-black">
                492495.99 Total win
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 w-[78%]" />
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10px] text-zinc-400 font-bold px-2 py-1 border-b border-white/10">
            <span className="col-span-4">User</span>
            <span className="col-span-3 text-right">Bet(₹)</span>
            <span className="col-span-2 text-center">X</span>
            <span className="col-span-3 text-right">Cash out(₹)</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs divide-y divide-white/5">
            {activeTab === 'all' && (
              <>
                {liveBets.map((item) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-12 items-center px-2 py-1.5 rounded-lg transition ${
                      item.isUser
                        ? 'bg-amber-500/20 border border-amber-400/80 shadow-md text-white'
                        : item.cashedOut
                        ? 'bg-[#22c55e]/10 border border-[#22c55e]/30 text-white'
                        : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="col-span-4 flex items-center gap-1.5 truncate">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${item.isUser ? 'bg-amber-500 text-black' : 'bg-emerald-600/80'}`}>
                        {item.isUser ? '★' : item.username.charAt(0)}
                      </div>
                      <span className={`font-mono text-[11px] truncate ${item.isUser ? 'text-amber-300 font-black' : 'text-zinc-300'}`}>
                        {item.isUser ? `${item.username} (YOU)` : item.username}
                      </span>
                    </div>

                    <div className={`col-span-3 text-right font-mono text-[11px] font-bold ${item.isUser ? 'text-amber-300 font-black' : 'text-zinc-300'}`}>
                      ₹{item.amount.toFixed(2)}
                    </div>

                    <div className="col-span-2 text-center font-mono text-[10px] font-bold">
                      {item.cashedOut ? (
                        <span className="px-1.5 py-0.5 bg-[#2563eb] text-white rounded-md text-[9px] font-black">
                          {item.multiplier?.toFixed(2)}x
                        </span>
                      ) : item.isUser ? (
                        <span className="px-1 py-0.5 bg-amber-500/30 text-amber-300 rounded text-[8px] font-extrabold animate-pulse">
                          LIVE
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </div>

                    <div className="col-span-3 text-right font-mono text-[11px] font-bold">
                      {item.cashedOut ? (
                        <span className="text-[#22c55e] font-black">
                          +₹{item.winAmount?.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'my' && (
              <div className="py-2 space-y-1.5">
                {myBetsHistory.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    No bets placed yet in this session
                  </div>
                ) : (
                  myBetsHistory.map((b) => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                        b.status === 'won'
                          ? 'bg-[#1c2438] border-emerald-500/30'
                          : b.status === 'lost'
                          ? 'bg-[#1c2438] border-rose-500/30'
                          : 'bg-amber-950/30 border-amber-500/40 animate-pulse'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-mono">₹{b.amount.toFixed(2)}</span>
                          {b.panelNum && (
                            <span className="text-[9px] px-1 bg-white/10 rounded text-zinc-300">P{b.panelNum}</span>
                          )}
                          <span className="text-[10px] text-zinc-500 font-mono">#{b.roundId}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400">{b.time}</div>
                      </div>
                      <div className="text-right">
                        {b.status === 'won' ? (
                          <>
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold text-[10px] mr-1">
                              {b.multiplier.toFixed(2)}x
                            </span>
                            <span className="font-black text-emerald-400 font-mono">
                              +₹{b.winAmount.toFixed(2)}
                            </span>
                          </>
                        ) : b.status === 'lost' ? (
                          <>
                            <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded font-bold text-[10px] mr-1">
                              CRASHED
                            </span>
                            <span className="font-bold text-rose-400 font-mono">
                              -₹{b.amount.toFixed(2)}
                            </span>
                          </>
                        ) : b.status === 'queued' ? (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold text-[10px]">
                            QUEUED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500 text-black rounded font-black text-[10px] animate-pulse">
                            IN FLIGHT
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="pt-2 mt-auto border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>This game is Provably Fair</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Radar Flight Canvas & Dual Betting Controls */}
        <div className="lg:col-span-8 flex flex-col gap-3 order-1 lg:order-2">
          
          {/* FLIGHT STAGE / CANVAS RADAR */}
          <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl flex items-center justify-center">
            
            <canvas
              ref={canvasRef}
              width={720}
              height={400}
              className="w-full h-full object-cover"
            />

            {/* WINNING CASHOUT POPUP BANNER AT TOP */}
            {cashoutBanner && (
              <div className="absolute top-4 inset-x-4 flex justify-center z-30 pointer-events-auto animate-slideDown">
                <div className="flex items-center bg-[#0d2a1b]/95 border-2 border-emerald-500 rounded-full px-4 py-2 shadow-[0_0_25px_rgba(16,185,129,0.7)] gap-3">
                  <div className="text-left">
                    <div className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
                      You have cashed out!
                    </div>
                    <div className="text-lg font-black font-mono text-white leading-tight">
                      {cashoutBanner.multiplier.toFixed(2)}x
                    </div>
                  </div>

                  <div className="bg-[#22c55e] text-[#0d0f17] px-3.5 py-1.5 rounded-full font-black text-xs text-center shadow-md">
                    <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90 leading-tight">Win INR</div>
                    <div className="text-sm font-black font-mono">₹{cashoutBanner.amount.toFixed(2)}</div>
                  </div>

                  <button
                    onClick={() => setCashoutBanner(null)}
                    className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Crashed Banner: FLEW AWAY! */}
            {gameState === 'crashed' && (
              <div className="absolute inset-0 bg-rose-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center animate-fadeIn pointer-events-none">
                <div className="text-3xl sm:text-4xl font-black tracking-wider text-[#e63946] uppercase drop-shadow-[0_0_20px_rgba(230,57,70,0.8)]">
                  FLEW AWAY!
                </div>
                <div className="text-5xl sm:text-6xl font-black font-mono text-[#e63946] mt-1">
                  {currentMultiplier.toFixed(2)}x
                </div>
              </div>
            )}

            {/* Waiting / Countdown Banner (Authentic Spribe Aviator Style) */}
            {gameState === 'waiting' && (
              <div className="absolute inset-x-0 bottom-8 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
                <div className="bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 flex flex-col items-center shadow-2xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#e63946] animate-ping" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-200">
                      WAITING FOR NEXT ROUND
                    </span>
                    <span className="font-mono font-black text-[#f5c443] text-sm ml-1">
                      {countdown.toFixed(1)}s
                    </span>
                  </div>
                  <div className="w-56 h-1.5 bg-white/15 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#e63946] via-[#f59e0b] to-[#10b981] transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, ((3.0 - countdown) / 3.0) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Top Left inside Canvas: Round ID */}
            <div className="absolute top-2.5 left-3 text-[10px] font-mono text-zinc-400 flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
              <span>Round ID: {roundId}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Bottom Right inside Canvas: Live Players Pill (Matching Screenshot 1 & 2) */}
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs font-mono font-bold text-zinc-200 pointer-events-none">
              <div className="flex -space-x-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-black" />
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-black" />
                <div className="w-3.5 h-3.5 rounded-full bg-rose-400 border border-black" />
              </div>
              <span>1166</span>
            </div>
          </div>

          {/* DUAL BETTING PANELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* BET PANEL 1 */}
            <div className="bg-[#141824] border border-white/10 rounded-2xl p-3.5 space-y-3 shadow-xl">
              <div className="flex items-center justify-center">
                <div className="inline-flex bg-[#0d0f17] p-1 rounded-xl text-xs font-bold border border-white/5">
                  <button
                    onClick={() => setBet1(prev => ({ ...prev, isAuto: false }))}
                    className={`px-6 py-1 rounded-lg transition ${
                      !bet1.isAuto ? 'bg-[#242b40] text-white shadow' : 'text-zinc-400'
                    }`}
                  >
                    Bet
                  </button>
                  <button
                    onClick={() => setBet1(prev => ({ ...prev, isAuto: true }))}
                    className={`px-6 py-1 rounded-lg transition ${
                      bet1.isAuto ? 'bg-[#242b40] text-white shadow' : 'text-zinc-400'
                    }`}
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6 space-y-2">
                  <div className="flex items-center justify-between bg-[#0d0f17] border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setBet1(prev => ({ ...prev, amount: Math.max(10, prev.amount - 10) }))}
                      disabled={bet1.placed || queuedBet1}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white font-black text-sm flex items-center justify-center disabled:opacity-30 transition"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm text-white">
                      ₹{bet1.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setBet1(prev => ({ ...prev, amount: prev.amount + 10 }))}
                      disabled={bet1.placed || queuedBet1}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white font-black text-sm flex items-center justify-center disabled:opacity-30 transition"
                    >
                      +
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {[100, 200, 500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setBet1(prev => ({ ...prev, amount: amt }))}
                        disabled={bet1.placed || queuedBet1}
                        className={`py-1 rounded-lg text-[9px] font-bold font-mono transition ${
                          bet1.amount === amt
                            ? 'bg-[#f5c443] text-[#0d0f17] font-black'
                            : 'bg-[#1c2438] text-zinc-300 hover:bg-[#252f48] disabled:opacity-30'
                        }`}
                      >
                        ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Big Action Button */}
                <div className="col-span-6">
                  {gameState === 'flying' && bet1.placed && !bet1.cashedOut ? (
                    <button
                      onClick={() => handleCashOut(1)}
                      className="w-full h-20 rounded-2xl bg-gradient-to-r from-[#eab308] via-[#f59e0b] to-[#ea580c] hover:brightness-110 text-[#0d0f17] font-black flex flex-col items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse transition active:scale-95"
                    >
                      <span className="text-sm uppercase tracking-wider font-extrabold">CASH OUT</span>
                      <span className="text-lg font-mono font-black">
                        ₹{(bet1.amount * currentMultiplier).toFixed(2)}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleBet(1)}
                      className={`w-full h-20 rounded-2xl font-black flex flex-col items-center justify-center shadow-lg transition active:scale-95 ${
                        (gameState === 'waiting' && bet1.placed) || queuedBet1
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-[#22c55e] hover:bg-[#16a34a] text-white'
                      }`}
                    >
                      <span className="text-sm uppercase tracking-wider">
                        {(gameState === 'waiting' && bet1.placed) || queuedBet1 ? 'CANCEL' : 'BET'}
                      </span>
                      <span className="text-base font-mono font-black mt-0.5">
                        ₹{bet1.amount.toFixed(2)} INR
                      </span>
                      {queuedBet1 && (
                        <span className="text-[9px] text-amber-200 font-bold">QUEUED NEXT ROUND</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {bet1.isAuto && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold">Auto Cash Out</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      value={bet1.autoCashOutAt}
                      onChange={(e) =>
                        setBet1(prev => ({
                          ...prev,
                          autoCashOutAt: parseFloat(e.target.value) || 2.0,
                        }))
                      }
                      className="w-16 bg-[#0d0f17] border border-white/20 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs"
                    />
                    <span className="text-zinc-400 font-mono">x</span>
                  </div>
                </div>
              )}
            </div>

            {/* BET PANEL 2 */}
            <div className="bg-[#141824] border border-white/10 rounded-2xl p-3.5 space-y-3 shadow-xl">
              <div className="flex items-center justify-center">
                <div className="inline-flex bg-[#0d0f17] p-1 rounded-xl text-xs font-bold border border-white/5">
                  <button
                    onClick={() => setBet2(prev => ({ ...prev, isAuto: false }))}
                    className={`px-6 py-1 rounded-lg transition ${
                      !bet2.isAuto ? 'bg-[#242b40] text-white shadow' : 'text-zinc-400'
                    }`}
                  >
                    Bet
                  </button>
                  <button
                    onClick={() => setBet2(prev => ({ ...prev, isAuto: true }))}
                    className={`px-6 py-1 rounded-lg transition ${
                      bet2.isAuto ? 'bg-[#242b40] text-white shadow' : 'text-zinc-400'
                    }`}
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6 space-y-2">
                  <div className="flex items-center justify-between bg-[#0d0f17] border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setBet2(prev => ({ ...prev, amount: Math.max(10, prev.amount - 10) }))}
                      disabled={bet2.placed || queuedBet2}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white font-black text-sm flex items-center justify-center disabled:opacity-30 transition"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm text-white">
                      ₹{bet2.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setBet2(prev => ({ ...prev, amount: prev.amount + 10 }))}
                      disabled={bet2.placed || queuedBet2}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white font-black text-sm flex items-center justify-center disabled:opacity-30 transition"
                    >
                      +
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {[100, 200, 500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setBet2(prev => ({ ...prev, amount: amt }))}
                        disabled={bet2.placed || queuedBet2}
                        className={`py-1 rounded-lg text-[9px] font-bold font-mono transition ${
                          bet2.amount === amt
                            ? 'bg-[#f5c443] text-[#0d0f17] font-black'
                            : 'bg-[#1c2438] text-zinc-300 hover:bg-[#252f48] disabled:opacity-30'
                        }`}
                      >
                        ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Big Action Button */}
                <div className="col-span-6">
                  {gameState === 'flying' && bet2.placed && !bet2.cashedOut ? (
                    <button
                      onClick={() => handleCashOut(2)}
                      className="w-full h-20 rounded-2xl bg-gradient-to-r from-[#eab308] via-[#f59e0b] to-[#ea580c] hover:brightness-110 text-[#0d0f17] font-black flex flex-col items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse transition active:scale-95"
                    >
                      <span className="text-sm uppercase tracking-wider font-extrabold">CASH OUT</span>
                      <span className="text-lg font-mono font-black">
                        ₹{(bet2.amount * currentMultiplier).toFixed(2)}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleBet(2)}
                      className={`w-full h-20 rounded-2xl font-black flex flex-col items-center justify-center shadow-lg transition active:scale-95 ${
                        (gameState === 'waiting' && bet2.placed) || queuedBet2
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-[#22c55e] hover:bg-[#16a34a] text-white'
                      }`}
                    >
                      <span className="text-sm uppercase tracking-wider">
                        {(gameState === 'waiting' && bet2.placed) || queuedBet2 ? 'CANCEL' : 'BET'}
                      </span>
                      <span className="text-base font-mono font-black mt-0.5">
                        ₹{bet2.amount.toFixed(2)} INR
                      </span>
                      {queuedBet2 && (
                        <span className="text-[9px] text-amber-200 font-bold">QUEUED NEXT ROUND</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {bet2.isAuto && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold">Auto Cash Out</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      value={bet2.autoCashOutAt}
                      onChange={(e) =>
                        setBet2(prev => ({
                          ...prev,
                          autoCashOutAt: parseFloat(e.target.value) || 2.0,
                        }))
                      }
                      className="w-16 bg-[#0d0f17] border border-white/20 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs"
                    />
                    <span className="text-zinc-400 font-mono">x</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* MODAL: How to play */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-[#f5c443]/30 rounded-3xl max-w-sm w-full p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-black text-base text-[#e63946]">How to Play Aviator</h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="text-xs text-zinc-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#e63946] font-bold">1.</span>
                <span>Enter your bet amount and click <strong>BET</strong> before the yellow plane takes off.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e63946] font-bold">2.</span>
                <span>Watch the multiplier grow higher and higher as the plane flies up.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e63946] font-bold">3.</span>
                <span>Click <strong>CASH OUT</strong> before the plane flies away to claim your profit!</span>
              </li>
            </ul>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-3 bg-[#e63946] text-white font-black text-xs rounded-xl shadow-lg"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Provably Fair */}
      {showProvablyFair && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-emerald-500/40 rounded-3xl max-w-sm w-full p-5 space-y-3.5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>Provably Fair Verification</span>
              </div>
              <button
                onClick={() => setShowProvablyFair(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This game is 100% fair. The multiplier is generated through a cryptographic SHA-256 combination of server seed and client seeds.
            </p>

            <div className="p-2.5 bg-[#0d0f17] rounded-xl border border-white/10 font-mono text-[10px] text-zinc-400 break-all space-y-1">
              <div><strong>Server Seed Hash:</strong></div>
              <div className="text-emerald-400">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</div>
            </div>

            <button
              onClick={() => setShowProvablyFair(false)}
              className="w-full py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Multiplier History Details */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-white/20 rounded-3xl max-w-sm w-full p-5 space-y-3 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-black text-sm text-[#fce08b]">Previous Rounds Multipliers</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
              {history.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl text-center font-mono font-bold text-xs shadow ${getPillColor(m)}`}
                >
                  {m.toFixed(2)}x
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
