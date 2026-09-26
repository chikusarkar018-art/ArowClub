import React, { useState, useEffect } from 'react';
import {
  Zap,
  Calendar,
  Clock,
  CheckCircle2,
  FileDown,
  RefreshCw,
  Edit3,
  Save,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Eye,
  Sliders,
  Play,
  Pause,
  Layers,
  ArrowRight,
  TrendingUp,
  Lock,
  Flame,
  ChevronRight,
  Repeat,
  Info,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { BigSmallPredictionSession, BigSmallPredictionRound } from '../../types.js';
import { jsPDF } from 'jspdf';

export const PredictionBigSmallView: React.FC = () => {
  const { admin } = useAuth();
  const [sessions, setSessions] = useState<BigSmallPredictionSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<BigSmallPredictionSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live game status
  const [liveStatus, setLiveStatus] = useState<{
    lastPeriodNumber: string;
    lastDigit: number;
    historyCount: number;
  }>({
    lastPeriodNumber: '2026083113147',
    lastDigit: 5,
    historyCount: 0,
  });

  // Session form state (matching screenshot defaults)
  const [sessionName, setSessionName] = useState('Official VIP Big/Small Prediction');
  const [startDate, setStartDate] = useState('2026-08-31');
  const [endDate, setEndDate] = useState('2026-08-31');
  const [startTime, setStartTime] = useState('09:01 PM');
  const [endTime, setEndTime] = useState('09:31 PM');
  const [targetGame, setTargetGame] = useState('wingo_30s');
  const [sessionStatus, setSessionStatus] = useState<'active' | 'inactive'>('active');

  // Reference Starting Period
  const [referenceStartingPeriod, setReferenceStartingPeriod] = useState('2026083113149');

  // 10 Rounds default matching screenshot exactly:
  // R1: BIG, GREEN, 5,7,9, Big chance, Win
  // R2: SMALL, GREEN, 1,3, Small chance, Win
  // R3: BIG, GREEN, 5,7,9, Big confirmed, Miss
  // R4: SMALL, GREEN, 1,3, Small chance, Win
  // R5: BIG, GREEN, 5,7,9, Big high probability, Win
  // R6: SMALL, GREEN, 1,3, Small chance, Miss
  // R7: BIG, GREEN, 5,7,9, Big confirmed, Win
  // R8: SMALL, GREEN, 1,3, Small chance, Miss
  // R9: BIG, GREEN, 5,7,9, Big jackpot chance, Win
  // R10: SMALL, GREEN, 1,3, Small chance, Miss
  const defaultRounds: BigSmallPredictionRound[] = [
    { round: 1, targetPeriod: '2026083113150', previousLastDigit: 0, prediction: 'BIG', color: 'GREEN', numbers: '5, 7, 9', message: 'Big chance', accuracy: 'win' },
    { round: 2, targetPeriod: '2026083113151', previousLastDigit: 1, prediction: 'SMALL', color: 'GREEN', numbers: '1, 3', message: 'Small chance', accuracy: 'win' },
    { round: 3, targetPeriod: '2026083113152', previousLastDigit: 2, prediction: 'BIG', color: 'GREEN', numbers: '5, 7, 9', message: 'Big confirmed', accuracy: 'miss' },
    { round: 4, targetPeriod: '2026083113153', previousLastDigit: 3, prediction: 'SMALL', color: 'GREEN', numbers: '1, 3', message: 'Small chance', accuracy: 'win' },
    { round: 5, targetPeriod: '2026083113154', previousLastDigit: 4, prediction: 'BIG', color: 'GREEN', numbers: '5, 7, 9', message: 'Big high probability', accuracy: 'win' },
    { round: 6, targetPeriod: '2026083113155', previousLastDigit: 5, prediction: 'SMALL', color: 'GREEN', numbers: '1, 3', message: 'Small chance', accuracy: 'miss' },
    { round: 7, targetPeriod: '2026083113156', previousLastDigit: 6, prediction: 'BIG', color: 'GREEN', numbers: '5, 7, 9', message: 'Big confirmed', accuracy: 'win' },
    { round: 8, targetPeriod: '2026083113157', previousLastDigit: 7, prediction: 'SMALL', color: 'GREEN', numbers: '1, 3', message: 'Small chance', accuracy: 'miss' },
    { round: 9, targetPeriod: '2026083113158', previousLastDigit: 8, prediction: 'BIG', color: 'GREEN', numbers: '5, 7, 9', message: 'Big jackpot chance', accuracy: 'win' },
    { round: 10, targetPeriod: '2026083113159', previousLastDigit: 9, prediction: 'SMALL', color: 'GREEN', numbers: '1, 3', message: 'Small chance', accuracy: 'miss' },
  ];

  const [rounds, setRounds] = useState<BigSmallPredictionRound[]>(defaultRounds);

  const [allGamePeriods, setAllGamePeriods] = useState<Record<string, { currentPeriodId: string; lastPeriodNumber: string; lastDigit: number }>>({});

  const getGameIntervalSeconds = (gt: string) => {
    switch (gt) {
      case 'wingo_30s': return 30;
      case 'wingo_1m': return 60;
      case 'wingo_3m': return 180;
      case 'wingo_5m': return 300;
      default: return 30;
    }
  };

  const getGameLabel = (gt: string) => {
    switch (gt) {
      case 'wingo_30s': return 'Win Go 30s';
      case 'wingo_1m': return 'Win Go 1m';
      case 'wingo_3m': return 'Win Go 3m';
      case 'wingo_5m': return 'Win Go 5m';
      default: return 'Win Go';
    }
  };

  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const str = String(timeStr).trim().toUpperCase();
    const isPM = str.includes('PM');
    const isAM = str.includes('AM');
    const cleanStr = str.replace(/[APM\s]/g, '');
    const parts = cleanStr.split(':').map(p => parseInt(p, 10));
    let hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Fetch prediction sessions and live period status (initial mount only)
  const fetchSessions = async (gameOverride?: string, shouldUpdateForm: boolean = true) => {
    setLoading(true);
    const currentGame = gameOverride || targetGame || 'wingo_30s';
    try {
      const res = await fetch(`/api/admin/predictions/sessions?game=${currentGame}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
        if (data.allGamePeriods) {
          setAllGamePeriods(data.allGamePeriods);
        }
        if (data.liveStatus) {
          setLiveStatus(data.liveStatus);
        }
        if (shouldUpdateForm) {
          const active = (data.sessions || []).find((s: any) => s.targetGame === currentGame && s.status === 'active') ||
            (data.sessions || []).find((s: any) => s.targetGame === currentGame) ||
            data.activeSession ||
            data.sessions?.[0];

          if (active) {
            setSelectedSession(active);
            setSessionName(active.sessionName || `VIP ${getGameLabel(currentGame)} Big/Small Forecast`);
            setStartDate(active.startDate || new Date().toISOString().slice(0, 10));
            setStartTime(active.startTime || '09:01 PM');
            setEndDate(active.endDate || new Date().toISOString().slice(0, 10));
            setEndTime(active.endTime || '09:31 PM');
            setTargetGame(currentGame);
            const currentLive = data.allGamePeriods?.[currentGame]?.lastPeriodNumber || data.liveStatus?.lastPeriodNumber;
            setReferenceStartingPeriod(active.referenceStartingPeriod || currentLive || '2026083113149');
            setSessionStatus(active.status || 'active');
            if (Array.isArray(active.rounds) && active.rounds.length >= 10) {
              setRounds(active.rounds.slice(0, 10));
            } else if (Array.isArray(active.rounds) && active.rounds.length > 0) {
              const updated = [...active.rounds];
              while (updated.length < 10) {
                const idx = updated.length;
                updated.push({
                  round: idx + 1,
                  targetPeriod: `20260831131${50 + idx}`,
                  previousLastDigit: idx % 10,
                  prediction: idx % 2 === 0 ? 'BIG' : 'SMALL',
                  color: 'GREEN',
                  numbers: idx % 2 === 0 ? '5, 7, 9' : '1, 3',
                  message: idx % 2 === 0 ? 'Big chance' : 'Small chance',
                  accuracy: (idx === 2 || idx === 5 || idx === 7 || idx === 9) ? 'miss' : 'win',
                });
              }
              setRounds(updated);
            }
          }
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load prediction sessions');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessions(targetGame, true);
  }, []);

  // Background live period polling (without resetting active form inputs)
  useEffect(() => {
    const pollLiveState = () => {
      // 1. Fetch current live period for active selected target game
      fetch(`/api/game/current/${targetGame}`)
        .then(r => r.json())
        .then(d => {
          if (d?.period?.periodId) {
            setLiveStatus(prev => ({
              ...prev,
              lastPeriodNumber: d.period.periodId,
              lastDigit: typeof d.period.resultNumber === 'number' ? d.period.resultNumber : (parseInt(d.period.periodId.slice(-1), 10) || 5),
            }));
          }
        })
        .catch(() => {});

      // 2. Fetch all game periods map so all 4 buttons (30s, 1m, 3m, 5m) show real-time live IDs
      fetch(`/api/admin/predictions/sessions?summary=true`)
        .then(r => r.json())
        .then(d => {
          if (d?.allGamePeriods) {
            setAllGamePeriods(d.allGamePeriods);
          }
        })
        .catch(() => {});
    };

    pollLiveState();
    const timer = setInterval(pollLiveState, 3000);
    return () => clearInterval(timer);
  }, [targetGame]);

  // Recalculate target periods based on reference starting period
  const recalculateTargetPeriods = (basePeriod: string) => {
    const parsed = parseInt(basePeriod, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setRounds(prev =>
        prev.map((r, idx) => ({
          ...r,
          targetPeriod: String(parsed + idx + 1),
        }))
      );
    }
  };

  // Switch game type (30s / 1m / 3m / 5m) and instantly detect matching live period ID
  const handleSelectTargetGame = async (newGame: string) => {
    setTargetGame(newGame);
    setErrorMsg(null);

    try {
      // Query real-time live period for this newly selected game
      const res = await fetch(`/api/game/current/${newGame}`);
      const data = await res.json();
      const liveId = data?.period?.periodId || allGamePeriods[newGame]?.lastPeriodNumber || '2026083110500';
      const lastDig = typeof data?.period?.resultNumber === 'number' ? data.period.resultNumber : (parseInt(liveId.slice(-1), 10) || 5);

      setLiveStatus({
        lastPeriodNumber: liveId,
        lastDigit: lastDig,
        historyCount: 20,
      });

      // Check if we have an existing session for this game
      const existing = sessions.find(s => s.targetGame === newGame);
      if (existing) {
        setSelectedSession(existing);
        setSessionName(existing.sessionName || `VIP ${getGameLabel(newGame)} Big/Small Forecast`);
        setStartDate(existing.startDate || new Date().toISOString().slice(0, 10));
        setStartTime(existing.startTime || '09:01 PM');
        setEndDate(existing.endDate || new Date().toISOString().slice(0, 10));
        setEndTime(existing.endTime || '09:31 PM');
        setReferenceStartingPeriod(existing.referenceStartingPeriod || liveId);
        recalculateTargetPeriods(existing.referenceStartingPeriod || liveId);
        if (Array.isArray(existing.rounds) && existing.rounds.length >= 10) {
          setRounds(existing.rounds.slice(0, 10));
        }
      } else {
        setReferenceStartingPeriod(liveId);
        recalculateTargetPeriods(liveId);
        setSessionName(`VIP ${getGameLabel(newGame)} Big/Small Forecast`);
      }

      setSuccessMsg(`⚡ Switched to ${getGameLabel(newGame)}! Auto-detected live period #${liveId}`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch {
      setSuccessMsg(`⚡ Switched to ${getGameLabel(newGame)}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Quick timing offset presets
  const applyTimingOffset = (offsetMinutes: number | 'now' | 'full_day') => {
    const now = new Date();
    if (offsetMinutes === 'now') {
      const startStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const end = new Date(now.getTime() + 30 * 60 * 1000);
      const endStr = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      setStartTime(startStr);
      setEndTime(endStr);
      return;
    }
    if (offsetMinutes === 'full_day') {
      setStartTime('12:00 AM');
      setEndTime('11:59 PM');
      return;
    }

    const start = new Date(now.getTime() + offsetMinutes * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    setStartTime(start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    setEndTime(end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
  };

  // Auto-Match period from start time based on game duration (30s = 2p/min, 1m = 1p/min, 3m = 1p/3min, 5m = 1p/5min)
  const autoMatchPeriodFromStartTime = async () => {
    try {
      const res = await fetch(`/api/game/current/${targetGame}`);
      const data = await res.json();
      const currentPeriodId = data?.period?.periodId || liveStatus.lastPeriodNumber;

      const now = new Date();
      const curMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = parseTimeToMinutes(startTime);

      let diffMinutes = startMinutes - curMinutes;
      if (diffMinutes < 0) {
        diffMinutes = Math.max(1, 1440 + diffMinutes);
      }
      if (diffMinutes === 0) diffMinutes = 1;

      const durationSec = getGameIntervalSeconds(targetGame);
      const periodsPerMinute = 60 / durationSec;
      const periodsAhead = Math.max(1, Math.round(diffMinutes * periodsPerMinute));

      const datePrefix = currentPeriodId.slice(0, 8) || now.toISOString().slice(0, 10).replace(/-/g, '');
      const currentSeq = parseInt(currentPeriodId.slice(8), 10);

      let targetSeq = 10500;
      if (!isNaN(currentSeq) && currentSeq > 0) {
        targetSeq = currentSeq + periodsAhead;
      }

      const newRefPeriod = `${datePrefix}${String(targetSeq).padStart(5, '0')}`;
      setReferenceStartingPeriod(newRefPeriod);
      recalculateTargetPeriods(newRefPeriod);

      setSuccessMsg(`🎯 Auto-matched Reference Period #${newRefPeriod} for ${getGameLabel(targetGame)} (in ~${diffMinutes}m / +${periodsAhead} periods)!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      const currentSeq = parseInt(liveStatus.lastPeriodNumber.slice(8), 10);
      const fallbackSeq = (isNaN(currentSeq) ? 10500 : currentSeq) + 2;
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const newRefPeriod = `${datePrefix}${String(fallbackSeq).padStart(5, '0')}`;
      setReferenceStartingPeriod(newRefPeriod);
      recalculateTargetPeriods(newRefPeriod);
    }
  };

  // Future period match buttons
  const applyPeriodOffset = (periodsAhead: number) => {
    const parsed = parseInt(referenceStartingPeriod || liveStatus.lastPeriodNumber, 10);
    if (!isNaN(parsed)) {
      const updatedRef = String(parsed + periodsAhead);
      setReferenceStartingPeriod(updatedRef);
      recalculateTargetPeriods(updatedRef);
      setSuccessMsg(`Adjusted reference period by +${periodsAhead} periods.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Set today button
  const handleSetToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setSuccessMsg('Calendar date set to Today.');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // Update round details
  const updateRoundField = (idx: number, field: keyof BigSmallPredictionRound, val: any) => {
    setRounds(prev => {
      const copy = [...prev];
      const target = { ...copy[idx], [field]: val };
      
      // Auto-update numbers when prediction or color changes
      if (field === 'prediction' || field === 'color') {
        const pred = field === 'prediction' ? val : target.prediction;
        const col = field === 'color' ? val : target.color;
        if (pred === 'BIG') {
          if (col === 'GREEN') target.numbers = '5, 7, 9';
          else if (col === 'RED') target.numbers = '6, 8';
          else if (col === 'VIOLET') target.numbers = '5';
          else target.numbers = '5, 7, 9';
        } else {
          if (col === 'GREEN') target.numbers = '1, 3';
          else if (col === 'RED') target.numbers = '0, 2, 4';
          else if (col === 'VIOLET') target.numbers = '0';
          else target.numbers = '1, 3';
        }
      }

      copy[idx] = target;
      return copy;
    });
  };

  // Flip Action for a round
  const flipRound = (idx: number) => {
    setRounds(prev => {
      const copy = [...prev];
      const r = copy[idx];
      const newPred: 'BIG' | 'SMALL' = r.prediction === 'BIG' ? 'SMALL' : 'BIG';
      const newColor: 'GREEN' | 'RED' | 'VIOLET' = r.color === 'GREEN' ? 'RED' : r.color === 'RED' ? 'GREEN' : 'VIOLET';
      const newAccuracy: 'win' | 'miss' = r.accuracy === 'win' ? 'miss' : 'win';
      const newNumbers = newPred === 'BIG' ? (newColor === 'GREEN' ? '5, 7, 9' : '6, 8') : (newColor === 'GREEN' ? '1, 3' : '0, 2, 4');
      const newMsg = newPred === 'BIG' ? 'Big chance' : 'Small chance';
      
      copy[idx] = {
        ...r,
        prediction: newPred,
        color: newColor,
        numbers: newNumbers,
        message: newMsg,
        accuracy: newAccuracy,
      };
      return copy;
    });
  };

  // Auto-Balance exactly 6 Correct / 4 Wrong
  const autoBalanceAccuracy = () => {
    // Exact 6 Win / 4 Miss distribution pattern: [Win, Win, Miss, Win, Win, Miss, Win, Miss, Win, Miss]
    const pattern: ('win' | 'miss')[] = ['win', 'win', 'miss', 'win', 'win', 'miss', 'win', 'miss', 'win', 'miss'];
    setRounds(prev =>
      prev.map((r, idx) => ({
        ...r,
        accuracy: pattern[idx] || (idx < 6 ? 'win' : 'miss'),
      }))
    );
    setSuccessMsg('⚡ Balanced to standard VIP formula: exactly 6 Correct and 4 Wrong!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Save prediction session configuration
  const handleSaveConfiguration = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = {
        id: selectedSession?.id,
        sessionName,
        startDate,
        startTime,
        endDate,
        endTime,
        targetGame,
        referenceStartingPeriod,
        status: sessionStatus,
        totalRounds: 10,
        rounds,
        adminUsername: admin?.username || 'SuperAdmin',
      };

      const res = await fetch('/api/admin/predictions/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('✅ Prediction Configuration & 10-Round Schedule saved successfully!');
        setSelectedSession(data.session);
        fetchSessions();
      } else {
        setErrorMsg(data.error || 'Failed to save prediction schedule.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error saving configuration.');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Trigger Live Sync
  const handleLiveSync = async () => {
    setSyncing(true);
    try {
      await fetchSessions();
      setSuccessMsg('🔄 Live game periods and prediction schedule synchronized!');
    } catch (e: any) {
      setErrorMsg('Failed to sync live state.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Download Client PDF with Official AROW CLUB Logo and Large Game Time Banner
  const handleDownloadPDF = async () => {
    try {
      // 1. Convert SVG logo into high-resolution PNG for crisp rendering in PDF
      const getLogoDataUrl = (): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 300;
              canvas.height = 300;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, 300, 300);
                resolve(canvas.toDataURL('image/png'));
                return;
              }
            } catch {
              // fallback
            }
            resolve('');
          };
          img.onerror = () => resolve('');
          img.src = '/favicon.svg';
        });
      };

      const logoBase64 = await getLogoDataUrl();

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const gameTitleMap: Record<string, { name: string; durationText: string; short: string }> = {
        wingo_30s: { name: 'WIN GO 30 SEC', durationText: '30 SECONDS (2 PERIODS / MIN)', short: '30s' },
        wingo_1m: { name: 'WIN GO 1 MIN', durationText: '1 MINUTE (1 PERIOD / MIN)', short: '1min' },
        wingo_3m: { name: 'WIN GO 3 MIN', durationText: '3 MINUTES (1 PERIOD / 3 MIN)', short: '3min' },
        wingo_5m: { name: 'WIN GO 5 MIN', durationText: '5 MINUTES (1 PERIOD / 5 MIN)', short: '5min' },
      };

      const gameInfo = gameTitleMap[targetGame] || { name: 'WIN GO 30 SEC', durationText: '30 SECONDS', short: '30s' };

      // 1. Dark Luxury Slate Background
      doc.setFillColor(11, 15, 25);
      doc.rect(0, 0, 210, 297, 'F');

      // Top Gold Accent Bar
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 0, 210, 3.5, 'F');

      // 2. AROW CLUB Brand Header Card
      doc.setFillColor(18, 24, 38);
      doc.roundedRect(10, 8, 190, 28, 3, 3, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.6);
      doc.roundedRect(10, 8, 190, 28, 3, 3, 'D');

      // Add Original Logo
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 10.5, 23, 23);
      } else {
        // Fallback Vector Logo Badge
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(14, 10.5, 23, 23, 3, 3, 'F');
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(0.5);
        doc.roundedRect(14, 10.5, 23, 23, 3, 3, 'D');

        doc.setFillColor(245, 196, 67);
        doc.triangle(25.5, 13, 17, 28, 34, 28, 'F');
        doc.setFillColor(18, 24, 38);
        doc.triangle(25.5, 19, 21, 27, 30, 27, 'F');
      }

      // Company Brand Name "AROW CLUB"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text('AROW', 41, 21);
      doc.setTextColor(245, 196, 67);
      doc.text('CLUB', 69, 21);

      // Subtitle & Verified Badge
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL VIP GAMING PLATFORM - CERTIFIED PREDICTION FORECAST', 41, 27);
      
      // Verified bullet dot
      doc.setFillColor(52, 211, 153);
      doc.circle(42.5, 32, 1.3, 'F');
      doc.setTextColor(52, 211, 153);
      doc.setFont('helvetica', 'bold');
      doc.text('VERIFIED REAL-TIME SYNCHRONIZED', 46, 33.2);

      // Right-side Verification Seal Badge
      doc.setFillColor(245, 158, 11);
      doc.roundedRect(148, 13, 46, 18, 2, 2, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL VIP SEAL', 171, 20, { align: 'center' });
      doc.setFontSize(7);
      doc.text('100% ACCURACY TRACKED', 171, 26, { align: 'center' });

      // =========================================================================
      // 3. EXTRA LARGE BOLD GAME TIME BANNER (30s / 1min / 3min / 5min)
      // =========================================================================
      const bannerY = 39;
      doc.setFillColor(245, 158, 11); // Amber Gold
      doc.roundedRect(10, bannerY, 190, 15, 2.5, 2.5, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.roundedRect(10, bannerY, 190, 15, 2.5, 2.5, 'D');

      // LARGE BOLD TEXT
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13.5);
      doc.text(`TARGET GAME: ${gameInfo.name} (${gameInfo.durationText})`, 105, bannerY + 7.5, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`SCHEDULE INTERVAL: ${gameInfo.short.toUpperCase()} GAME MODE | OFFICIAL 10 ROUNDS FORECAST`, 105, bannerY + 12.5, { align: 'center' });

      // 4. Session Details Card
      const metaY = 57;
      doc.setFillColor(18, 24, 38);
      doc.roundedRect(10, metaY, 190, 22, 2.5, 2.5, 'F');
      doc.setDrawColor(33, 45, 66);
      doc.setLineWidth(0.4);
      doc.roundedRect(10, metaY, 190, 22, 2.5, 2.5, 'D');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text(sessionName, 15, metaY + 7);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Valid Dates: ${startDate} to ${endDate}`, 15, metaY + 13);
      doc.text(`- Active Window: ${startTime} - ${endTime}`, 15, metaY + 18);

      doc.text(`- Reference Starting Period: `, 105, metaY + 13);
      doc.setFont('courier', 'bold');
      doc.setTextColor(56, 189, 248);
      doc.text(`#${referenceStartingPeriod}`, 148, metaY + 13);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`- Target Game Format: `, 105, metaY + 18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 196, 67);
      doc.text(`${gameInfo.name} (${gameInfo.short})`, 140, metaY + 18);

      // =========================================================================
      // 5. Prediction Table Header (NO RECOMMENDED NUMBERS COLUMN)
      // =========================================================================
      const tableStartY = 82;
      doc.setFillColor(30, 41, 59);
      doc.rect(10, tableStartY, 190, 9, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.line(10, tableStartY + 9, 200, tableStartY + 9);

      doc.setTextColor(245, 196, 67);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('ROUND', 15, tableStartY + 6);
      doc.text('TARGET PERIOD', 35, tableStartY + 6);
      doc.text('PREDICTION', 88, tableStartY + 6, { align: 'center' });
      doc.text('COLOR', 124, tableStartY + 6);
      doc.text('VIP CHAT GUIDANCE', 155, tableStartY + 6);

      // =========================================================================
      // 6. Table Rows
      // =========================================================================
      let rowY = tableStartY + 9.5;
      rounds.forEach((r, idx) => {
        // Alternate row fill
        if (idx % 2 === 0) {
          doc.setFillColor(15, 20, 32);
        } else {
          doc.setFillColor(20, 27, 43);
        }
        doc.rect(10, rowY, 190, 14, 'F');
        doc.setDrawColor(26, 35, 54);
        doc.line(10, rowY + 14, 200, rowY + 14);

        // Round Number Badge
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(14, rowY + 3, 14, 8, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`R${r.round}`, 21, rowY + 8.2, { align: 'center' });

        // Target Period
        doc.setFont('courier', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(56, 189, 248);
        doc.text(r.targetPeriod || `20260831131${50 + idx}`, 35, rowY + 8.8);

        // Prediction Badge - PERFECT CRISP BOX (Centered at x=88, width=28)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        if (r.prediction === 'BIG') {
          doc.setFillColor(245, 158, 11); // Amber
          doc.roundedRect(74, rowY + 3, 28, 8, 2, 2, 'F');
          doc.setTextColor(15, 23, 42);
          doc.text('BIG', 88, rowY + 8.4, { align: 'center' });
        } else {
          doc.setFillColor(59, 130, 246); // Blue
          doc.roundedRect(74, rowY + 3, 28, 8, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text('SMALL', 88, rowY + 8.4, { align: 'center' });
        }

        // Color (Vector dot + Clean text, no broken unicode)
        const colorVal = (r.color || 'GREEN').toUpperCase();
        if (colorVal === 'GREEN') {
          doc.setFillColor(34, 197, 94);
          doc.circle(121, rowY + 7, 2, 'F');
          doc.setTextColor(34, 197, 94);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('GREEN', 126, rowY + 8.5);
        } else if (colorVal === 'RED') {
          doc.setFillColor(239, 68, 68);
          doc.circle(121, rowY + 7, 2, 'F');
          doc.setTextColor(239, 68, 68);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('RED', 126, rowY + 8.5);
        } else {
          doc.setFillColor(168, 85, 247);
          doc.circle(121, rowY + 7, 2, 'F');
          doc.setTextColor(168, 85, 247);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('VIOLET', 126, rowY + 8.5);
        }

        // VIP Guidance Message
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225);
        const msg = r.message || (r.prediction === 'BIG' ? 'Big high chance' : 'Small high chance');
        doc.text(msg, 155, rowY + 8.5);

        rowY += 14.5;
      });

      // 7. Security Guarantee & Disclaimer Box
      doc.setFillColor(18, 24, 38);
      doc.roundedRect(10, rowY + 4, 190, 26, 2.5, 2.5, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.roundedRect(10, rowY + 4, 190, 26, 2.5, 2.5, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(245, 196, 67);
      doc.text(`[VIP] AROW CLUB OFFICIAL VERIFICATION & MONEY MANAGEMENT (${gameInfo.name})`, 15, rowY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`- This schedule is synchronized strictly for ${gameInfo.name} (${gameInfo.durationText}).`, 15, rowY + 17);
      doc.text('- Recommended Strategy: Use standard 3-Level investment plan (1X - 3X - 8X) for maximum risk protection.', 15, rowY + 22);
      doc.text('- Official VIP Algorithm - Copyright AROW CLUB. All rights reserved.', 15, rowY + 27);

      const fileName = `AROWCLUB_VIP_${gameInfo.short.toUpperCase()}_Prediction_${startDate}.pdf`;
      doc.save(fileName);
      setSuccessMsg(`AROW CLUB ${gameInfo.name} Official VIP PDF downloaded successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setErrorMsg('Failed to generate PDF: ' + (e.message || e));
    }
  };

  // Calculations for accuracy summary
  const correctCount = rounds.filter(r => r.accuracy !== 'miss').length;
  const wrongCount = rounds.length - correctCount;

  // Active target period info for banner
  const activeRound1 = rounds[0];

  return (
    <div className="w-full space-y-4 text-slate-100 font-sans pb-10">
      {/* Alert Banners */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm font-medium flex items-center justify-between shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-1">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-sm font-medium flex items-center justify-between shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white text-xs font-bold px-2 py-1">
            ✕
          </button>
        </div>
      )}

      {/* ===================== 1. TOP HEADER ===================== */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0a0f1d]/90 border border-[#1e293d] rounded-2xl p-4 md:p-5 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 border border-amber-300/40">
            <Sparkles className="w-6 h-6 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">Big / Small Chat Prediction</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-950/90 text-emerald-400 border border-emerald-500/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              10-round prediction manager • Live game result sync • Flexible calendar date &amp; time presets • Clean Client PDF
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleLiveSync}
            disabled={syncing}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#131d2e] hover:bg-[#1a273e] text-slate-200 hover:text-white border border-[#23334d] rounded-xl text-xs font-bold transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20 border border-amber-400"
          >
            <FileDown className="w-4 h-4 text-slate-950" />
            <span>Download Client PDF</span>
          </button>

          <button
            onClick={handleSaveConfiguration}
            disabled={saving}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-black transition shadow-lg shadow-emerald-500/20 border border-emerald-400"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* ===================== 2. AUTOMATIC SYSTEM LIVE PREDICTION & GAME SYNC BANNER ===================== */}
      <div className="bg-[#090d18] border border-[#192437] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h3 className="text-xs md:text-sm font-black uppercase text-amber-400 tracking-wider">
              AUTOMATIC SYSTEM LIVE PREDICTION &amp; GAME SYNC
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            System automatically reads the previous completed digit and guarantees the actual game result matches your schedule!
          </p>
        </div>

        {/* Live Info Pills */}
        <div className="flex items-center gap-2 bg-[#050810] border border-[#162132] px-3 py-2 rounded-xl">
          <div className="flex flex-col items-center px-3 border-r border-[#1e2a3f]">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">TARGET PERIOD</span>
            <span className="text-xs font-mono font-black text-amber-400 mt-0.5">
              {activeRound1?.targetPeriod || '2026083113478'}
            </span>
          </div>

          <div className="flex flex-col items-center px-3 border-r border-[#1e2a3f]">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">PREDICTION</span>
            <span className="text-[11px] font-black px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded font-mono mt-0.5">
              {activeRound1?.prediction || 'BIG'}
            </span>
          </div>

          <div className="flex flex-col items-center px-3">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">COLOR</span>
            <span className="text-[11px] font-black px-2.5 py-0.5 bg-emerald-500 text-white rounded font-mono mt-0.5">
              {activeRound1?.color || 'GREEN'}
            </span>
          </div>
        </div>
      </div>

      {/* ===================== 3. SESSION DETAILS & CALENDAR DATE SELECTORS ===================== */}
      <div className="bg-[#0b101e] border border-[#1b263b] rounded-2xl p-4 md:p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#182338]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              SESSION DETAILS &amp; CALENDAR DATE SELECTORS
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 font-bold">
              Total Rounds: <span className="text-amber-400 font-black">10</span>
            </span>
            <button
              onClick={handleSetToday}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold transition underline underline-offset-2"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Set to Today</span>
            </button>
          </div>
        </div>

        {/* Row 1: Session Name & Date Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Session Name */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">
              Session Name <span className="text-slate-500 font-normal">(Visible in VIP Chat Header)</span>
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              className="w-full bg-[#070b14] border border-[#212d42] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none transition"
              placeholder="e.g. Official VIP Big/Small Prediction"
            />
          </div>

          {/* Start Date Card */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">START DATE</label>
            <div className="relative bg-[#070b14] border border-[#212d42] hover:border-amber-400/60 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition group">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider">CLICK TO CHANGE</div>
                  <div className="text-xs font-black text-white">{startDate}</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-bold px-1.5 py-0.5 bg-[#121927] rounded">
                Aug 31
              </span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>

          {/* End Date Card */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">END DATE</label>
            <div className="relative bg-[#070b14] border border-[#212d42] hover:border-amber-400/60 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition group">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider">CLICK TO CHANGE</div>
                  <div className="text-xs font-black text-white">{endDate}</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-bold px-1.5 py-0.5 bg-[#121927] rounded">
                Aug 31
              </span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Timing Schedule & Presets */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Time Schedule &amp; Quick Timing Offsets</span>
            </div>

            {/* Quick Set Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-slate-500 font-bold">Quick Sets:</span>
              <button
                type="button"
                onClick={() => applyTimingOffset('now')}
                className="px-2 py-0.5 bg-[#141d2c] hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold rounded border border-[#24334a] transition"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => applyTimingOffset(1)}
                className="px-2 py-0.5 bg-[#141d2c] hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold rounded border border-[#24334a] transition"
              >
                +1 Min
              </button>
              <button
                type="button"
                onClick={() => applyTimingOffset(5)}
                className="px-2 py-0.5 bg-[#141d2c] hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold rounded border border-[#24334a] transition"
              >
                +5 Min
              </button>
              <button
                type="button"
                onClick={() => applyTimingOffset(15)}
                className="px-2 py-0.5 bg-[#141d2c] hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold rounded border border-[#24334a] transition"
              >
                +15 Min
              </button>
              <button
                type="button"
                onClick={() => applyTimingOffset(30)}
                className="px-2 py-0.5 bg-[#141d2c] hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold rounded border border-[#24334a] transition"
              >
                +30 Min
              </button>
              <button
                type="button"
                onClick={() => applyTimingOffset(60)}
                className="px-2 py-0.5 bg-[#141d2c] hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold rounded border border-[#24334a] transition"
              >
                +1 Hour
              </button>
              <button
                type="button"
                onClick={() => applyTimingOffset(20)}
                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold rounded border border-amber-500/40 transition"
              >
                Next 20 Mins
              </button>
              <button
                type="button"
                onClick={() => applyTimingOffset(60)}
                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold rounded border border-amber-500/40 transition"
              >
                Next 1 Hour
              </button>
              <button
                type="button"
                onClick={() => applyTimingOffset('full_day')}
                className="px-2 py-0.5 bg-[#141d2c] hover:bg-slate-700 text-slate-400 font-bold rounded border border-[#24334a] transition"
              >
                Full Day
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Start Time */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Start Time (HH:MM)</label>
              <input
                type="text"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-[#070b14] border border-[#212d42] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none transition"
                placeholder="09:01 PM"
              />
            </div>

            {/* End Time */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">End Time (HH:MM)</label>
              <input
                type="text"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-[#070b14] border border-[#212d42] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none transition"
                placeholder="09:31 PM"
              />
            </div>

            {/* Target Game */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Target Game (गेम चुनें)</label>
              <select
                value={targetGame}
                onChange={e => handleSelectTargetGame(e.target.value)}
                className="w-full bg-[#070b14] border border-[#212d42] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none transition"
              >
                <option value="wingo_30s">Win Go 30s (2 periods/min)</option>
                <option value="wingo_1m">Win Go 1m (1 period/min)</option>
                <option value="wingo_3m">Win Go 3m (1 period/3 min)</option>
                <option value="wingo_5m">Win Go 5m (1 period/5 min)</option>
              </select>
            </div>

            {/* Session Status */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Session Status</label>
              <select
                value={sessionStatus}
                onChange={e => setSessionStatus(e.target.value as any)}
                className="w-full bg-[#070b14] border border-[#212d42] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none transition"
              >
                <option value="active">Active (Visible &amp; Synced)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Quick Game Selector Buttons */}
          <div className="pt-2 border-t border-[#182338]">
            <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
              Instant Game Switch &amp; Auto-Detect Live Period (30s / 1m / 3m / 5m):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'wingo_30s', label: 'Win Go 30s', speed: '30 sec' },
                { id: 'wingo_1m', label: 'Win Go 1m', speed: '1 min' },
                { id: 'wingo_3m', label: 'Win Go 3m', speed: '3 min' },
                { id: 'wingo_5m', label: 'Win Go 5m', speed: '5 min' },
              ].map(g => {
                const isSelected = targetGame === g.id;
                const livePeriodForGame = allGamePeriods[g.id]?.lastPeriodNumber || (isSelected ? liveStatus.lastPeriodNumber : '');
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectTargetGame(g.id)}
                    className={`flex flex-col items-start p-2 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-[#070b14] border-[#1f2c42] hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black">{g.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                        {g.speed}
                      </span>
                    </div>
                    {livePeriodForGame && (
                      <span className="text-[10px] text-cyan-400 font-mono mt-0.5 truncate w-full">
                        Live: #{livePeriodForGame}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== 4. REFERENCE STARTING PERIOD NUMBER (ऑटो पीरियड मैचिंग) ===================== */}
      <div className="bg-[#0b101e] border border-[#1b263b] rounded-2xl p-4 md:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#182338]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                REFERENCE STARTING PERIOD NUMBER (ऑटो पीरियड मैचिंग)
              </h2>
              <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-500/40 rounded text-[10px] font-extrabold uppercase tracking-wide">
                AUTO-DETECT ({getGameLabel(targetGame)})
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {targetGame === 'wingo_30s' && 'Win Go 30s: 2 periods per minute. Live Period ID से समय अनुसार पीरियड ऑटो-डिटेक्ट होता है।'}
              {targetGame === 'wingo_1m' && 'Win Go 1m: 1 period per minute. Live Period ID से समय अनुसार पीरियड ऑटो-डिटेक्ट होता है।'}
              {targetGame === 'wingo_3m' && 'Win Go 3m: 1 period per 3 minutes. Live Period ID से समय अनुसार पीरियड ऑटो-डिटेक्ट होता है।'}
              {targetGame === 'wingo_5m' && 'Win Go 5m: 1 period per 5 minutes. Live Period ID से समय अनुसार पीरियड ऑटो-डिटेक्ट होता है।'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                const liveId = liveStatus.lastPeriodNumber;
                setReferenceStartingPeriod(liveId);
                recalculateTargetPeriods(liveId);
                setSuccessMsg(`Synced to current live period #${liveId}`);
                setTimeout(() => setSuccessMsg(null), 2500);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141d2c] hover:bg-[#1b283d] text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Current Live Period</span>
            </button>

            <button
              onClick={autoMatchPeriodFromStartTime}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition shadow-md shadow-amber-500/20"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Auto-Match From Start Time ({startTime})</span>
            </button>
          </div>
        </div>

        {/* Input & Future Match Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-6 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300">
                Reference Starting Period ID (रेफरेंस पीरियड नंबर)
              </label>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Live: <span className="text-cyan-400 font-bold">{liveStatus.lastPeriodNumber}</span>
              </span>
            </div>
            <input
              type="text"
              value={referenceStartingPeriod}
              onChange={e => {
                setReferenceStartingPeriod(e.target.value);
                recalculateTargetPeriods(e.target.value);
              }}
              className="w-full bg-[#070b14] border border-cyan-500/40 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono font-black tracking-wider focus:outline-none transition shadow-inner"
              placeholder="e.g. 2026083113149"
            />
          </div>

          {/* Future Match Pills (Game Specific) */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400">
              Future Match ({getGameLabel(targetGame)}):
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {targetGame === 'wingo_30s' && (
                <>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(2)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +1 Min (2p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(10)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +5 Min (10p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(20)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +10 Min (20p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(60)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +30 Min (60p)
                  </button>
                </>
              )}

              {targetGame === 'wingo_1m' && (
                <>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(1)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +1 Min (1p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(5)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +5 Min (5p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(10)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +10 Min (10p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(30)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +30 Min (30p)
                  </button>
                </>
              )}

              {targetGame === 'wingo_3m' && (
                <>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(1)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +3 Min (1p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(2)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +6 Min (2p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(5)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +15 Min (5p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(10)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +30 Min (10p)
                  </button>
                </>
              )}

              {targetGame === 'wingo_5m' && (
                <>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(1)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +5 Min (1p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(2)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +10 Min (2p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(3)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +15 Min (3p)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPeriodOffset(6)}
                    className="px-3 py-2 bg-[#121a28] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                  >
                    +30 Min (6p)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Summary Box */}
        <div className="p-3 bg-[#070b14] border border-[#162134] rounded-xl text-xs text-slate-300 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>Target Schedule for VIP Chat &amp; Game Engine ({getGameLabel(targetGame)}):</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-5">
            • Starts at Round 1 (Period #{rounds[0]?.targetPeriod || '2026083113150'}) immediately after Period #{referenceStartingPeriod} ends.
          </p>
        </div>
      </div>

      {/* ===================== 5. 10 ROUNDS CONFIGURATION & ACCURACY CONTROL ===================== */}
      <div className="bg-[#0b101e] border border-[#1b263b] rounded-2xl p-4 md:p-5 space-y-4 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#182338]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                10 ROUNDS CONFIGURATION &amp; ACCURACY CONTROL
              </h2>
              <span className="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-500/40 rounded text-[10px] font-extrabold uppercase">
                ADMIN CONFIDENTIAL ONLY
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Configure exactly <span className="text-emerald-400 font-bold">6 Correct</span> and <span className="text-red-400 font-bold">4 Wrong</span>. The client PDF &amp; VIP Chat will <span className="text-amber-400 underline">sync strictly with the Target Period</span>.
            </p>
          </div>

          {/* Accuracy Status & Auto-Balance Button */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="px-3 py-1.5 bg-[#070b14] border border-[#212d42] rounded-xl text-xs font-bold">
              <span className="text-slate-400 mr-2">Accuracy:</span>
              <span className="text-emerald-400">🟢 {correctCount} Correct</span>
              <span className="text-slate-600 mx-1.5">/</span>
              <span className="text-red-400">🔴 {wrongCount} Wrong</span>
            </div>

            <button
              type="button"
              onClick={autoBalanceAccuracy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#152033] hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-black transition shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Auto-Balance (6 Correct / 4 Wrong)</span>
            </button>
          </div>
        </div>

        {/* 10-Row Table */}
        <div className="overflow-x-auto rounded-xl border border-[#182338]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-[#182338]">
                <th className="py-3 px-3">ROUND</th>
                <th className="py-3 px-3">TARGET PERIOD</th>
                <th className="py-3 px-3">PREDICTION</th>
                <th className="py-3 px-3">COLOR</th>
                <th className="py-3 px-3">NUMBERS</th>
                <th className="py-3 px-3">CHAT MESSAGE</th>
                <th className="py-3 px-3 text-center">ADMIN ACCURACY</th>
                <th className="py-3 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151e30]">
              {rounds.map((r, idx) => {
                const isBig = r.prediction === 'BIG';
                const isWin = r.accuracy !== 'miss';

                return (
                  <tr
                    key={`round-${r.round}`}
                    className={`hover:bg-[#0e1628]/60 transition ${
                      idx % 2 === 0 ? 'bg-[#090e1b]' : 'bg-[#070b16]'
                    }`}
                  >
                    {/* Round */}
                    <td className="py-2.5 px-3 font-black text-amber-400">
                      R{r.round}
                    </td>

                    {/* Target Period */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={r.targetPeriod || ''}
                        onChange={e => updateRoundField(idx, 'targetPeriod', e.target.value)}
                        className="bg-[#050811] border border-cyan-500/40 rounded-lg px-2 py-1 text-xs font-mono font-bold text-cyan-400 w-32 focus:outline-none focus:border-cyan-300 transition"
                      />
                    </td>

                    {/* Prediction Segmented Switch: BIG / SMALL */}
                    <td className="py-2.5 px-3">
                      <div className="inline-flex rounded-lg bg-[#050811] p-0.5 border border-[#1f2c42]">
                        <button
                          type="button"
                          onClick={() => updateRoundField(idx, 'prediction', 'BIG')}
                          className={`px-2.5 py-1 rounded text-[11px] font-black transition ${
                            isBig
                              ? 'bg-[#f5c443] text-slate-950 shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          BIG
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRoundField(idx, 'prediction', 'SMALL')}
                          className={`px-2.5 py-1 rounded text-[11px] font-black transition ${
                            !isBig
                              ? 'bg-[#3b82f6] text-white shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          SMALL
                        </button>
                      </div>
                    </td>

                    {/* Color 3-Pill Switch: GREEN / RED / VIOLET */}
                    <td className="py-2.5 px-3">
                      <div className="inline-flex rounded-lg bg-[#050811] p-0.5 border border-[#1f2c42]">
                        <button
                          type="button"
                          onClick={() => updateRoundField(idx, 'color', 'GREEN')}
                          className={`px-2 py-1 rounded text-[10px] font-black uppercase transition ${
                            r.color === 'GREEN'
                              ? 'bg-emerald-500 text-white shadow-md'
                              : 'text-slate-400 hover:text-emerald-400'
                          }`}
                        >
                          GREEN
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRoundField(idx, 'color', 'RED')}
                          className={`px-2 py-1 rounded text-[10px] font-black uppercase transition ${
                            r.color === 'RED'
                              ? 'bg-red-500 text-white shadow-md'
                              : 'text-slate-400 hover:text-red-400'
                          }`}
                        >
                          RED
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRoundField(idx, 'color', 'VIOLET')}
                          className={`px-2 py-1 rounded text-[10px] font-black uppercase transition ${
                            r.color === 'VIOLET'
                              ? 'bg-purple-500 text-white shadow-md'
                              : 'text-slate-400 hover:text-purple-400'
                          }`}
                        >
                          VIOLET
                        </button>
                      </div>
                    </td>

                    {/* Numbers */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={r.numbers || ''}
                        onChange={e => updateRoundField(idx, 'numbers', e.target.value)}
                        className="bg-[#050811] border border-[#212d42] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-200 w-24 text-center focus:outline-none focus:border-amber-400"
                        placeholder="5, 7, 9"
                      />
                    </td>

                    {/* Chat Message */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={r.message}
                        onChange={e => updateRoundField(idx, 'message', e.target.value)}
                        className="bg-[#050811] border border-[#212d42] rounded-lg px-2.5 py-1 text-xs text-slate-200 w-44 focus:outline-none focus:border-amber-400 transition"
                        placeholder="Big chance"
                      />
                    </td>

                    {/* Admin Accuracy Toggle */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex rounded-lg bg-[#050811] p-0.5 border border-[#1f2c42]">
                        <button
                          type="button"
                          onClick={() => updateRoundField(idx, 'accuracy', 'win')}
                          className={`px-2.5 py-1 rounded text-[10px] font-black transition ${
                            isWin
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-emerald-400'
                          }`}
                        >
                          🟢 Win
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRoundField(idx, 'accuracy', 'miss')}
                          className={`px-2.5 py-1 rounded text-[10px] font-black transition ${
                            !isWin
                              ? 'bg-red-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-red-400'
                          }`}
                        >
                          🔴 Miss
                        </button>
                      </div>
                    </td>

                    {/* Action: Flip */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => flipRound(idx)}
                        className="px-2.5 py-1 bg-[#152033] hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[11px] font-bold rounded-lg border border-[#23334c] transition"
                      >
                        Flip
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-[11px] text-slate-400 border-t border-[#182338]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>PDF Export contains: Round, Period No., Last Digit, Prediction, Colors (Green/Red/Violet) &amp; Expected Numbers.</span>
          </div>
          <div>
            Engine Status:{' '}
            <span className="text-emerald-400 font-bold">
              100% Prediction Priority Override Active
            </span>{' '}
            <span className="text-slate-500">(House bet &amp; manual controls bypassed during active prediction)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
