import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Sparkles,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Radio,
  Layers,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Flame,
} from 'lucide-react';

interface PastPrediction {
  round: number;
  targetPeriod: string;
  prediction: 'BIG' | 'SMALL';
  color?: string;
  numbers?: string;
  message?: string;
  resultNumber?: number | null;
  resultColor?: string | null;
  resultBigSmall?: string | null;
  isCompleted?: boolean;
  isWin?: boolean | null;
}

interface PredictionData {
  success: boolean;
  active: boolean;
  sessionName?: string;
  targetPeriod?: string;
  lastPeriodNumber?: string;
  lastDigit?: number;
  prediction?: 'BIG' | 'SMALL';
  color?: 'GREEN' | 'RED' | 'VIOLET';
  numbers?: string;
  predictionTime?: string;
  sessionTime?: string;
  message?: string;
  round?: number;
  totalRounds?: number;
  accuracyStats?: {
    correct: number;
    wrong: number;
  };
  pastPredictions?: PastPrediction[];
}

interface Props {
  compact?: boolean;
  className?: string;
  gameType?: string;
}

export const UserPredictionChatCard: React.FC<Props> = ({ compact = false, className = '', gameType = 'wingo_30s' }) => {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchPrediction = async () => {
    try {
      const res = await fetch(`/api/user/prediction-chat?game=${gameType}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch {
      // Graceful silence
    }
  };

  useEffect(() => {
    fetchPrediction();
    const interval = setInterval(fetchPrediction, 2500);
    return () => clearInterval(interval);
  }, [gameType]);

  const getGameTitle = (gt?: string) => {
    switch (gt) {
      case 'wingo_30s': return 'Win Go 30s';
      case 'wingo_1m': return 'Win Go 1m';
      case 'wingo_3m': return 'Win Go 3m';
      case 'wingo_5m': return 'Win Go 5m';
      default: return 'Win Go';
    }
  };

  if (!data || !data.active) {
    return (
      <div
        className={`bg-gradient-to-r from-[#121420] to-[#181a29] border border-[#23273c] rounded-2xl p-4 text-center space-y-2 shadow-lg ${className}`}
      >
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
          <Clock className="w-4 h-4 text-[#f5c443]" />
          <span>VIP Live Prediction ({getGameTitle(gameType)})</span>
        </div>
        <p className="text-[11px] text-slate-400">
          {data?.message || `The VIP prediction session for ${getGameTitle(gameType)} is scheduled for ${data?.sessionTime || 'its designated time slot'}. Stay tuned!`}
        </p>
      </div>
    );
  }

  const isBig = data.prediction === 'BIG';
  const color = data.color || 'GREEN';

  if (compact) {
    return (
      <div
        className={`bg-gradient-to-r from-[#141624] via-[#1a1d2f] to-[#141624] border-2 border-[#f5c443]/40 rounded-2xl p-3 shadow-xl relative overflow-hidden flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute top-0 left-0" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-[#f5c443]">
                VIP FORECAST
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                #{data.targetPeriod || data.lastPeriodNumber?.slice(-6)}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium">
              Target: <strong className="text-white">{data.prediction}</strong> • <span className="text-emerald-400 font-bold">{color}</span> ({data.numbers || '5, 7, 9'})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-3.5 py-1.5 rounded-xl font-black text-xs tracking-wider shadow-md ${
              isBig
                ? 'bg-gradient-to-r from-[#f5c443] to-amber-500 text-black border border-[#f5c443]'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border border-blue-400'
            }`}
          >
            {data.prediction}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-b from-[#161828] via-[#10121f] to-[#0a0c16] border-2 border-[#f5c443]/50 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4 ${className}`}
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#f5c443]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f5c443] to-amber-500 flex items-center justify-center text-slate-950 shadow-md">
            <Zap className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-wide">
                {data.sessionName || 'Official VIP Big/Small Prediction'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>Real-Time Forecast Sync • Round R{data.round || 1} of {data.totalRounds || 10}</span>
            </span>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full bg-[#f5c443]/20 text-[#f5c443] border border-[#f5c443]/40 text-[10px] font-black uppercase tracking-wider">
          LIVE
        </span>
      </div>

      {/* Target Period & Last Result Details */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div className="bg-[#0b0d18]/90 border border-cyan-500/30 rounded-2xl p-3 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Target Period</span>
          </span>
          <div className="font-mono font-black text-sm text-cyan-300">
            #{data.targetPeriod || '2026083113150'}
          </div>
        </div>

        <div className="bg-[#0b0d18]/90 border border-[#212d42] rounded-2xl p-3 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span>Previous Digit</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#f5c443] to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow">
              {data.lastDigit ?? 5}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              #{data.lastPeriodNumber?.slice(-5)}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Prediction Display Box */}
      <div className="bg-gradient-to-r from-amber-500/15 via-[#f5c443]/20 to-amber-500/15 border-2 border-[#f5c443]/60 rounded-2xl p-4 text-center relative z-10 shadow-lg space-y-2">
        <div className="text-[10px] font-black uppercase text-[#f5c443] tracking-widest flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>RECOMMENDED VIP FORECAST</span>
        </div>

        {/* Prediction Main Word */}
        <div
          className={`text-4xl font-black tracking-wider py-0.5 ${
            isBig
              ? 'text-[#f5c443] drop-shadow-[0_0_16px_rgba(245,196,67,0.6)]'
              : 'text-blue-400 drop-shadow-[0_0_16px_rgba(96,165,250,0.6)]'
          }`}
        >
          {data.prediction}
        </div>

        {/* Color & Numbers Pill Display */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
              color === 'GREEN'
                ? 'bg-emerald-500 text-white'
                : color === 'RED'
                ? 'bg-red-500 text-white'
                : 'bg-purple-500 text-white'
            }`}
          >
            ● {color}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10 text-[11px] font-mono font-bold">
            Numbers: {data.numbers || (isBig ? '5, 7, 9' : '1, 3')}
          </span>
        </div>

        {/* Chat message */}
        <div className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 pt-1">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span>"{data.message || (isBig ? 'Big chance' : 'Small chance')}"</span>
        </div>
      </div>

      {/* Accuracy Stats summary */}
      {data.accuracyStats && (
        <div className="bg-[#0b0d18]/80 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between text-xs relative z-10">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Session Accuracy:</span>
          </span>
          <div className="flex items-center gap-2 text-[11px] font-black">
            <span className="text-emerald-400">🟢 {data.accuracyStats.correct} Correct</span>
            <span className="text-slate-600">/</span>
            <span className="text-red-400">🔴 {data.accuracyStats.wrong} Wrong</span>
          </div>
        </div>
      )}

      {/* Footer Timers & Schedule Info */}
      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 relative z-10 border-t border-white/5">
        <div>
          <span className="text-slate-500">Prediction Time:</span>{' '}
          <span className="text-slate-300 font-mono font-bold">
            {data.predictionTime || new Date().toLocaleTimeString()}
          </span>
        </div>
        <div className="text-right">
          <span className="text-slate-500">Session Schedule:</span>{' '}
          <span className="text-slate-300 font-mono font-bold">
            {data.sessionTime || '09:01 PM - 09:31 PM'}
          </span>
        </div>
      </div>
    </div>
  );
};
