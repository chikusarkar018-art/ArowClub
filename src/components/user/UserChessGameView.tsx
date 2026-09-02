import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess, Square, Move } from 'chess.js';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { chessAudio } from '../../utils/chessAudio.js';
import { ChessMatch, ChessPlayer } from '../../../server/gameManager.js';
import { ChessPiece } from './ChessPiece.js';
import {
  ChevronLeft, Volume2, VolumeX, Shield, Crown, RefreshCw,
  Trophy, Zap, ArrowRight, User, HelpCircle, Copy, Check,
  Clock, RotateCcw, Swords, Flag, Sparkles, KeyRound, Plus, Play, Share2
} from 'lucide-react';

interface UserChessGameViewProps {
  onBack: () => void;
  onNavigateDeposit: () => void;
}

const BOT_OPTIONS = [
  { id: 'master', name: 'Grandmaster Magnus', rating: 2882, title: 'GM', flag: '🇳🇴', diff: 'master', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', desc: 'World Champion AI depth 4' },
  { id: 'hard', name: 'Pragg Prodigy', rating: 2750, title: 'GM', flag: '🇮🇳', diff: 'hard', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', desc: 'Fierce tactical depth 3' },
  { id: 'medium', name: 'Club Master Rahul', rating: 1950, title: 'CM', flag: '🇮🇳', diff: 'medium', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', desc: 'Balanced club standard' },
  { id: 'easy', name: 'Casual Gamer Alex', rating: 1400, title: '', flag: '🇬🇧', diff: 'easy', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', desc: 'Friendly beginner bot' },
];

const STAKE_PRESETS = [0, 10, 50, 100, 200, 500, 1000];

export const UserChessGameView: React.FC<UserChessGameViewProps> = ({ onBack, onNavigateDeposit }) => {
  const { user, refreshUser, showToast } = useAuth();

  // Navigation / View state: 'lobby' | 'waiting_room' | 'game' | 'history'
  const [viewState, setViewState] = useState<'lobby' | 'waiting_room' | 'game' | 'history'>('lobby');
  const [lobbyTab, setLobbyTab] = useState<'multiplayer' | 'bot'>('multiplayer');

  // Match Config in Lobby
  const [selectedStake, setSelectedStake] = useState<number>(100);
  const [customStakeInput, setCustomStakeInput] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'master'>('medium');
  const [preferredColor, setPreferredColor] = useState<'w' | 'b' | 'random'>('random');
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  // Room Code Multiplayer State
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isCancellingRoom, setIsCancellingRoom] = useState(false);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  // Active Match State
  const [activeMatch, setActiveMatch] = useState<ChessMatch | null>(null);
  const [chessInstance, setChessInstance] = useState<Chess>(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState<{ from: Square; to: Square } | null>(null);
  const [showResignModal, setShowResignModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [matchHistory, setMatchHistory] = useState<ChessMatch[]>([]);

  // Timers
  const [whiteTimer, setWhiteTimer] = useState(300);
  const [blackTimer, setBlackTimer] = useState(300);
  const pollIntervalRef = useRef<any>(null);

  // Computed stake amount (Preset or Custom)
  const currentStake = useMemo(() => {
    if (customStakeInput && !isNaN(Number(customStakeInput)) && Number(customStakeInput) > 0) {
      return Number(customStakeInput);
    }
    return selectedStake;
  }, [selectedStake, customStakeInput]);

  // Commission Calculations
  const totalPool = currentStake * 2;
  const platformCommission = Math.round(totalPool * 0.10); // 10% Platform Cut
  const netWinnerPrize = totalPool - platformCommission; // 90% Net Prize

  // Fetch match history
  const loadHistory = async () => {
    try {
      const res: any = await api.getChessHistory();
      if (res?.matches) {
        setMatchHistory(res.matches);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Determine user player color
  const userColor = useMemo<'w' | 'b'>(() => {
    if (!activeMatch || !user) return 'w';
    return activeMatch.whitePlayer.id === user.uid ? 'w' : 'b';
  }, [activeMatch, user]);

  const opponentPlayer = useMemo<ChessPlayer | null>(() => {
    if (!activeMatch || !user) return null;
    return activeMatch.whitePlayer.id === user.uid ? activeMatch.blackPlayer : activeMatch.whitePlayer;
  }, [activeMatch, user]);

  const myPlayer = useMemo<ChessPlayer | null>(() => {
    if (!activeMatch || !user) return null;
    return activeMatch.whitePlayer.id === user.uid ? activeMatch.whitePlayer : activeMatch.blackPlayer;
  }, [activeMatch, user]);

  // Sync timers from match state
  useEffect(() => {
    if (activeMatch?.timers) {
      setWhiteTimer(activeMatch.timers.w);
      setBlackTimer(activeMatch.timers.b);
    }
  }, [activeMatch?.timers]);

  // Live timer tick
  useEffect(() => {
    if (viewState !== 'game' || !activeMatch || activeMatch.status !== 'active') return;

    const timer = setInterval(() => {
      if (activeMatch.turn === 'w') {
        setWhiteTimer(prev => {
          const next = Math.max(0, prev - 1);
          if (next <= 10 && next > 0) chessAudio.playClockTick();
          return next;
        });
      } else {
        setBlackTimer(prev => {
          const next = Math.max(0, prev - 1);
          if (next <= 10 && next > 0) chessAudio.playClockTick();
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [viewState, activeMatch?.turn, activeMatch?.status]);

  // Polling match state for real-time multiplayer moves or waiting room updates
  useEffect(() => {
    if (!activeMatch?.id) return;
    if (viewState !== 'game' && viewState !== 'waiting_room') return;

    const pollMatch = async () => {
      try {
        const res: any = await api.getChessMatch(activeMatch.id);
        if (res?.match) {
          const m: ChessMatch = res.match;

          // If in waiting room and match becomes active (opponent joined)
          if (viewState === 'waiting_room' && m.status === 'active') {
            setActiveMatch(m);
            const chess = new Chess(m.fen);
            setChessInstance(chess);
            setIsFlipped(m.blackPlayer.id === user?.uid);
            setViewState('game');
            chessAudio.playStartSound();
            refreshUser();
            showToast('Opponent Joined! Match Started!', 'success');
            return;
          }

          // Check if new move happened
          if (m.fen !== activeMatch.fen) {
            const nextChess = new Chess(m.fen);
            setChessInstance(nextChess);
            if (m.moves.length > 0) {
              const lm = m.moves[m.moves.length - 1];
              setLastMove({ from: lm.from, to: lm.to });
              if (lm.captured) {
                chessAudio.playCaptureSound();
              } else {
                chessAudio.playMoveSound();
              }
              if (nextChess.inCheck()) {
                chessAudio.playCheckSound();
              }
            }
          }

          setActiveMatch(m);

          // If game finished, trigger audio & refresh
          if (m.status === 'finished' && activeMatch.status === 'active') {
            refreshUser();
            loadHistory();
            if (m.winner === 'draw') {
              chessAudio.playDrawSound();
              showToast('Match Drawn! 100% Stake Refunded.', 'info');
            } else if (
              (m.winner === 'w' && m.whitePlayer.id === user?.uid) ||
              (m.winner === 'b' && m.blackPlayer.id === user?.uid)
            ) {
              chessAudio.playVictorySound();
              confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
              showToast(`🏆 Checkmate Victory! ₹${m.settlement?.winnerPayout || 0} Credited!`, 'success');
            } else {
              chessAudio.playDefeatSound();
              showToast('Checkmate! Defeat.', 'error');
            }
          }
        }
      } catch {
        // ignore
      }
    };

    pollIntervalRef.current = setInterval(pollMatch, 800);
    return () => clearInterval(pollIntervalRef.current);
  }, [viewState, activeMatch?.id, activeMatch?.fen, activeMatch?.status, user?.uid]);

  // Create Room Code Multiplayer Match
  const handleCreateRoom = async () => {
    if (currentStake > 0 && (user?.walletBalance || 0) < currentStake) {
      showToast('Insufficient wallet balance. Please recharge wallet.', 'error');
      onNavigateDeposit();
      return;
    }

    setIsCreatingMatch(true);
    try {
      const res: any = await api.createChessRoom(currentStake, preferredColor);
      if (res?.success && res.match && res.roomCode) {
        setActiveMatch(res.match);
        setActiveRoomCode(res.roomCode);
        setViewState('waiting_room');
        chessAudio.playStartSound();
        refreshUser();
        showToast(`Room #${res.roomCode} Created! Share with opponent to join.`, 'success');
      } else {
        showToast(res?.error || 'Failed to create match room', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error while creating room', 'error');
    } finally {
      setIsCreatingMatch(false);
    }
  };

  // Join Room via 6-digit Code
  const handleJoinRoom = async () => {
    if (!inputRoomCode || inputRoomCode.trim().length < 6) {
      showToast('Please enter a valid 6-digit Room Code', 'error');
      return;
    }

    setIsJoiningRoom(true);
    try {
      const res: any = await api.joinChessRoom(inputRoomCode.trim());
      if (res?.success && res.match) {
        const newMatch: ChessMatch = res.match;
        setActiveMatch(newMatch);
        setChessInstance(new Chess(newMatch.fen));
        setIsFlipped(newMatch.blackPlayer.id === user?.uid);
        setViewState('game');
        chessAudio.playStartSound();
        refreshUser();
        showToast('Joined Room successfully! Match Started.', 'success');
      } else {
        showToast(res?.error || 'Failed to join room', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error connecting to room', 'error');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Cancel Room
  const handleCancelRoom = async () => {
    if (!activeMatch?.id) return;
    setIsCancellingRoom(true);
    try {
      const res: any = await api.cancelChessRoom(activeMatch.id);
      if (res?.success) {
        setActiveMatch(null);
        setActiveRoomCode(null);
        setViewState('lobby');
        refreshUser();
        showToast('Room cancelled. Entry stake refunded 100%.', 'info');
      } else {
        showToast(res?.error || 'Failed to cancel room', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error cancelling room', 'error');
    } finally {
      setIsCancellingRoom(false);
    }
  };

  // Copy Room Code to clipboard
  const handleCopyRoomCode = () => {
    if (!activeRoomCode) return;
    navigator.clipboard.writeText(activeRoomCode);
    setHasCopiedCode(true);
    showToast(`Room Code ${activeRoomCode} copied!`, 'success');
    setTimeout(() => setHasCopiedCode(false), 2000);
  };

  // Start Match vs Bot
  const handleStartBotMatch = async () => {
    if (currentStake > 0 && (user?.walletBalance || 0) < currentStake) {
      showToast('Insufficient wallet balance. Please recharge wallet.', 'error');
      onNavigateDeposit();
      return;
    }

    setIsCreatingMatch(true);
    try {
      const res: any = await api.createChessMatch(currentStake, selectedDifficulty, preferredColor);
      if (res?.success && res.match) {
        const newMatch: ChessMatch = res.match;
        setActiveMatch(newMatch);
        setChessInstance(new Chess(newMatch.fen));
        setIsFlipped(newMatch.blackPlayer.id === user?.uid);
        setViewState('game');
        chessAudio.playStartSound();
        refreshUser();
        showToast('Game Started! Good Luck!', 'success');
      } else {
        showToast(res?.error || 'Failed to start match', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error starting match', 'error');
    } finally {
      setIsCreatingMatch(false);
    }
  };

  // Check if King is currently in Check
  const kingInCheckSquare = useMemo<Square | null>(() => {
    if (!chessInstance.inCheck()) return null;
    const currentTurn = chessInstance.turn();
    const board = chessInstance.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === currentTurn) {
          const file = String.fromCharCode(97 + c);
          const rank = 8 - r;
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [chessInstance]);

  // Calculate captured pieces and material score
  const materialAdvantage = useMemo(() => {
    const defaultCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const board = chessInstance.board();
    const whitePresent: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const blackPresent: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k') {
          if (piece.color === 'w') whitePresent[piece.type] = (whitePresent[piece.type] || 0) + 1;
          if (piece.color === 'b') blackPresent[piece.type] = (blackPresent[piece.type] || 0) + 1;
        }
      }
    }

    const whiteCaptured: string[] = [];
    const blackCaptured: string[] = [];

    const pieceWeights: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let whiteScore = 0;
    let blackScore = 0;

    Object.keys(defaultCounts).forEach((t) => {
      const wCapCount = Math.max(0, defaultCounts[t] - whitePresent[t]);
      const bCapCount = Math.max(0, defaultCounts[t] - blackPresent[t]);
      for (let i = 0; i < wCapCount; i++) whiteCaptured.push(t);
      for (let i = 0; i < bCapCount; i++) blackCaptured.push(t);

      whiteScore += whitePresent[t] * pieceWeights[t];
      blackScore += blackPresent[t] * pieceWeights[t];
    });

    const myCaptures = userColor === 'w' ? blackCaptured : whiteCaptured;
    const oppCaptures = userColor === 'w' ? whiteCaptured : blackCaptured;
    const myAdvantage = userColor === 'w' ? whiteScore - blackScore : blackScore - whiteScore;

    return { myCaptures, oppCaptures, myAdvantage };
  }, [chessInstance, userColor]);

  // Click on a chessboard square
  const handleSquareClick = (square: Square) => {
    if (!activeMatch || activeMatch.status !== 'active') return;
    if (activeMatch.turn !== userColor) return;

    // If square is already selected, unselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // Check if target is a legal destination
    const move = possibleMoves.find((m) => m.to === square);
    if (move && selectedSquare) {
      // Check for pawn promotion
      const piece = chessInstance.get(selectedSquare);
      if (piece && piece.type === 'p' && ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'))) {
        setShowPromotionModal({ from: selectedSquare, to: square });
        return;
      }

      executeMove(selectedSquare, square);
      return;
    }

    // Selecting a piece
    const piece = chessInstance.get(square);
    if (piece && piece.color === userColor) {
      setSelectedSquare(square);
      const moves = chessInstance.moves({ square, verbose: true });
      setPossibleMoves(moves);
      chessAudio.playSelectSound();
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  // Execute Move
  const executeMove = async (from: Square, to: Square, promotion: string = 'q') => {
    if (!activeMatch) return;
    setShowPromotionModal(null);
    setSelectedSquare(null);
    setPossibleMoves([]);

    try {
      const res: any = await api.makeChessMove(activeMatch.id, from, to, promotion);
      if (res?.success && res.match) {
        const m: ChessMatch = res.match;
        const nextChess = new Chess(m.fen);
        setChessInstance(nextChess);
        setLastMove({ from, to });
        setActiveMatch(m);

        if (res.move?.captured) {
          chessAudio.playCaptureSound();
        } else {
          chessAudio.playMoveSound();
        }

        if (nextChess.inCheck()) {
          chessAudio.playCheckSound();
        }

        if (m.status === 'finished') {
          refreshUser();
          loadHistory();
          if (m.winner === 'draw') {
            chessAudio.playDrawSound();
          } else if (
            (m.winner === 'w' && m.whitePlayer.id === user?.uid) ||
            (m.winner === 'b' && m.blackPlayer.id === user?.uid)
          ) {
            chessAudio.playVictorySound();
            confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
          } else {
            chessAudio.playDefeatSound();
          }
        }
      } else {
        showToast(res?.error || 'Invalid move execution', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to send move', 'error');
    }
  };

  // Resign active match
  const handleResign = async () => {
    if (!activeMatch) return;
    setShowResignModal(false);
    try {
      const res: any = await api.resignChessMatch(activeMatch.id);
      if (res?.success && res.match) {
        setActiveMatch(res.match);
        chessAudio.playDefeatSound();
        refreshUser();
        loadHistory();
        showToast('You resigned the match', 'info');
      }
    } catch {
      showToast('Failed to resign', 'error');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleAudio = () => {
    const next = !isMuted;
    setIsMuted(next);
    chessAudio.setMuted(next);
  };

  // Render 8x8 Board Squares with 100% UNIFORM HIGH-CONTRAST SVG PIECES
  const renderBoardSquares = () => {
    const rows = isFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    return rows.map((rankIdx) => (
      <div key={`rank-${rankIdx}`} className="flex w-full">
        {cols.map((fileIdx) => {
          const fileLetter = String.fromCharCode(97 + fileIdx);
          const rankNum = rankIdx + 1;
          const square = `${fileLetter}${rankNum}` as Square;
          const piece = chessInstance.get(square);

          const isDarkTile = (fileIdx + rankIdx) % 2 === 0;
          const isSelected = selectedSquare === square;
          const isTargetMove = possibleMoves.some((m) => m.to === square);
          const isTargetCapture = possibleMoves.some((m) => m.to === square && m.captured);
          const isLastMoveFrom = lastMove?.from === square;
          const isLastMoveTo = lastMove?.to === square;
          const isKingCheck = kingInCheckSquare === square;

          // High contrast luxury colors
          let tileBg = isDarkTile ? 'bg-[#b58863]' : 'bg-[#f0d9b5]';
          if (isSelected) {
            tileBg = 'bg-[#f6e05e] ring-2 ring-yellow-400 ring-inset';
          } else if (isLastMoveFrom || isLastMoveTo) {
            tileBg = isDarkTile ? 'bg-[#cdd26a]' : 'bg-[#e2e695]';
          } else if (isKingCheck) {
            tileBg = 'bg-red-500/85 animate-pulse';
          }

          return (
            <button
              key={square}
              id={`chess-sq-${square}`}
              onClick={() => handleSquareClick(square)}
              className={`relative flex-1 aspect-square flex items-center justify-center transition-all select-none p-0 cursor-pointer ${tileBg}`}
            >
              {/* Coordinates Markers on Edges */}
              {(isFlipped ? fileIdx === 7 : fileIdx === 0) && (
                <span className={`absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-black font-mono select-none pointer-events-none ${isDarkTile ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>
                  {rankNum}
                </span>
              )}
              {(isFlipped ? rankIdx === 7 : rankIdx === 0) && (
                <span className={`absolute bottom-0.5 right-1 text-[8px] sm:text-[9px] font-black font-mono select-none pointer-events-none ${isDarkTile ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>
                  {fileLetter}
                </span>
              )}

              {/* Target Move Indicators */}
              {isTargetMove && !isTargetCapture && (
                <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-black/30 pointer-events-none z-10" />
              )}
              {isTargetCapture && (
                <div className="absolute inset-1 rounded-full border-4 border-red-500/70 pointer-events-none z-10 animate-pulse" />
              )}

              {/* Uniform High-Visibility Vector Chess Piece */}
              {piece && (
                <div
                  className={`w-full h-full p-1 flex items-center justify-center transition-transform transform duration-150 z-20 ${
                    isSelected ? 'scale-110 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]' : 'hover:scale-105'
                  }`}
                >
                  <ChessPiece
                    type={piece.type}
                    color={piece.color}
                    className="w-full h-full max-w-[90%] max-h-[90%] drop-shadow-md"
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07090e] text-white flex flex-col font-sans select-none pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-40 px-3 sm:px-4 py-3 bg-[#0d1017]/98 border-b border-[#f5c443]/20 shadow-lg flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            id="chess-back-btn"
            onClick={onBack}
            className="p-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-[#f5c443]" />
              <h1 className="text-base font-black tracking-wide text-[#f5c443] uppercase">Chess Master Pro</h1>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">10% Platform Cut • 90% Net Winner Prize</p>
          </div>
        </div>

        {/* User Balance & Audio Toggle */}
        <div className="flex items-center gap-2">
          <button
            id="chess-audio-toggle"
            onClick={toggleAudio}
            className="p-2 rounded-xl bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#f5c443]" />}
          </button>

          <div
            onClick={onNavigateDeposit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1b170c] to-[#120f08] border border-[#f5c443]/40 cursor-pointer hover:border-[#f5c443] transition"
          >
            <span className="text-xs text-[#f5c443] font-bold">₹</span>
            <span className="text-sm font-black text-white font-mono">{(user?.walletBalance || 0).toFixed(2)}</span>
            <span className="text-[10px] bg-[#f5c443] text-black font-black px-1 rounded ml-1">+</span>
          </div>
        </div>
      </header>

      {/* VIEW 1: LOBBY & MATCH SETUP */}
      {viewState === 'lobby' && (
        <div className="max-w-md mx-auto w-full px-4 pt-4 flex flex-col gap-4">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-[#10121a] p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setLobbyTab('multiplayer')}
              className={`py-2.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition ${
                lobbyTab === 'multiplayer'
                  ? 'bg-gradient-to-r from-[#f5c443] to-[#d99b26] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Room Code PvP
            </button>
            <button
              onClick={() => setLobbyTab('bot')}
              className={`py-2.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition ${
                lobbyTab === 'bot'
                  ? 'bg-gradient-to-r from-[#f5c443] to-[#d99b26] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4" />
              Play vs AI Bot
            </button>
          </div>

          {/* Stake & Commission Calculator Card */}
          <div className="bg-[#12151e] border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#f5c443]" />
                Base Match Stake (₹)
              </span>
              <span className="text-xs text-amber-400 font-mono font-bold">
                Selected: ₹{currentStake}
              </span>
            </div>

            {/* Stake Presets */}
            <div className="grid grid-cols-4 gap-2">
              {STAKE_PRESETS.map((amt) => {
                const isSelected = !customStakeInput && selectedStake === amt;
                return (
                  <button
                    key={amt}
                    id={`chess-stake-${amt}`}
                    onClick={() => {
                      setCustomStakeInput('');
                      setSelectedStake(amt);
                    }}
                    className={`py-2.5 px-2 rounded-xl text-center font-bold text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#f5c443] to-[#d99b26] text-black border-2 border-yellow-200 shadow-md font-black scale-102'
                        : 'bg-zinc-800/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {amt === 0 ? 'FREE' : `₹${amt}`}
                  </button>
                );
              })}
            </div>

            {/* Custom Stake Input */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#f5c443] font-bold font-mono">₹</span>
                <input
                  type="number"
                  placeholder="Or enter custom stake (e.g. 250)"
                  value={customStakeInput}
                  onChange={(e) => setCustomStakeInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#090b10] border border-zinc-700 focus:border-[#f5c443] rounded-xl text-xs text-white font-mono placeholder:text-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Transparent Commission Breakdown */}
            <div className="bg-[#0a0c12] border border-zinc-850 rounded-xl p-2.5 flex flex-col gap-1 text-[11px] font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Both Players Stake:</span>
                <span className="text-zinc-200">2 × ₹{currentStake} = <strong>₹{totalPool}</strong></span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Platform Commission (10%):</span>
                <span className="text-amber-400 font-bold">-₹{platformCommission}</span>
              </div>
              <div className="border-t border-zinc-800 pt-1 flex justify-between font-bold">
                <span className="text-emerald-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-emerald-400" />
                  Winner Net Payout:
                </span>
                <span className="text-emerald-400 text-xs font-black">₹{netWinnerPrize}</span>
              </div>
              <p className="text-[9px] text-zinc-500 mt-0.5">*Stalemate / Draw par dono players ko 100% (₹{currentStake}) refund milega.</p>
            </div>
          </div>

          {/* Color Preference */}
          <div className="bg-[#12151e] border border-zinc-800 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">Play As:</span>
            <div className="flex items-center gap-2">
              {[
                { id: 'random', label: 'Random 🎲' },
                { id: 'w', label: 'White ♔' },
                { id: 'b', label: 'Black ♚' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPreferredColor(c.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                    preferredColor === c.id
                      ? 'bg-[#f5c443] text-black font-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: MULTIPLAYER ROOM CODE MODE */}
          {lobbyTab === 'multiplayer' && (
            <div className="flex flex-col gap-3">
              {/* Host: Create New Room */}
              <div className="bg-gradient-to-br from-[#1b150c] to-[#0f0d08] border border-[#f5c443]/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#f5c443]/20 border border-[#f5c443]/40 flex items-center justify-center text-[#f5c443]">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Create Room Code (Host Table)</h3>
                    <p className="text-[10px] text-zinc-400">Generate a unique 6-digit code for your friend</p>
                  </div>
                </div>

                <button
                  id="chess-create-room-btn"
                  disabled={isCreatingMatch}
                  onClick={handleCreateRoom}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f5c443] via-[#e5b32f] to-[#cb8c1b] hover:brightness-110 active:scale-98 font-black text-black text-sm tracking-wider uppercase shadow-[0_4px_20px_rgba(245,196,67,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isCreatingMatch ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Create Room (Stake ₹{currentStake})
                    </>
                  )}
                </button>
              </div>

              {/* Guest: Join Existing Room Code */}
              <div className="bg-[#12151e] border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Join with Room Code</h3>
                    <p className="text-[10px] text-zinc-400">Enter code shared by host to play face-to-face</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-Digit Code"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-4 py-3 bg-[#090b10] border border-zinc-750 focus:border-[#f5c443] rounded-xl text-center text-lg font-black tracking-widest font-mono text-white placeholder:text-zinc-600 focus:outline-none uppercase"
                  />
                  <button
                    disabled={isJoiningRoom || inputRoomCode.length < 6}
                    onClick={handleJoinRoom}
                    className={`px-5 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 transition ${
                      inputRoomCode.length === 6
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md active:scale-95 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {isJoiningRoom ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOT ENGINE MODE */}
          {lobbyTab === 'bot' && (
            <div className="bg-[#12151e] border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#f5c443]" />
                  Select Opponent Bot
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {BOT_OPTIONS.map((bot) => {
                  const isSelected = selectedDifficulty === bot.diff;
                  return (
                    <button
                      key={bot.id}
                      id={`chess-bot-${bot.diff}`}
                      onClick={() => setSelectedDifficulty(bot.diff as any)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#201a0f] border-[#f5c443] shadow-[0_0_15px_rgba(245,196,67,0.15)]'
                          : 'bg-zinc-850/60 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={bot.avatar}
                          alt={bot.name}
                          className="w-10 h-10 rounded-full object-cover border border-[#f5c443]/40"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white">{bot.name}</span>
                            {bot.title && (
                              <span className="px-1.5 py-0.2 bg-red-600/80 border border-red-400 text-[8px] font-black text-white rounded">
                                {bot.title}
                              </span>
                            )}
                            <span className="text-xs">{bot.flag}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Rating: <strong className="text-amber-400">{bot.rating}</strong> • {bot.desc}
                          </span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-[#f5c443] bg-[#f5c443] text-black' : 'border-zinc-700'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                id="chess-start-bot-btn"
                disabled={isCreatingMatch}
                onClick={handleStartBotMatch}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f5c443] via-[#e5b32f] to-[#cb8c1b] hover:brightness-110 active:scale-98 font-black text-black text-sm tracking-wider uppercase shadow-[0_4px_20px_rgba(245,196,67,0.3)] flex items-center justify-center gap-2 transition cursor-pointer mt-1"
              >
                {isCreatingMatch ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Swords className="w-5 h-5" />
                    Play vs AI (Stake ₹{currentStake})
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Rules & History Footer Actions */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setShowRulesModal(true)}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Rules & Commission
            </button>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-emerald-400" />
              Match History ({matchHistory.length})
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: WAITING ROOM FOR OPPONENT */}
      {viewState === 'waiting_room' && activeMatch && (
        <div className="max-w-md mx-auto w-full px-4 pt-6 flex flex-col items-center gap-6 text-center">
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#f5c443]/20 to-amber-900/20 border-2 border-[#f5c443] flex items-center justify-center shadow-[0_0_30px_rgba(245,196,67,0.3)]">
            <KeyRound className="w-10 h-10 text-[#f5c443] animate-pulse" />
            <span className="absolute inset-0 rounded-full border border-[#f5c443] animate-ping opacity-30" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Waiting for Opponent to Join</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Share the 6-digit room code with your friend. As soon as they enter the code, match starts live!
            </p>
          </div>

          {/* Big Room Code Display */}
          <div className="w-full bg-[#12151e] border-2 border-[#f5c443]/60 rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-3">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Your Room Code</span>
            <div className="text-4xl font-black font-mono tracking-widest text-[#f5c443] py-2 px-6 bg-[#07090e] border border-zinc-800 rounded-2xl shadow-inner">
              {activeRoomCode}
            </div>

            <div className="flex items-center gap-2 w-full mt-2">
              <button
                onClick={handleCopyRoomCode}
                className="flex-1 py-3 bg-[#f5c443] text-black font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 hover:brightness-105 transition cursor-pointer shadow-md"
              >
                {hasCopiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {hasCopiedCode ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>

          {/* Table Details */}
          <div className="w-full bg-[#0d1017] border border-zinc-850 rounded-2xl p-3.5 flex justify-around text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[10px]">Base Stake</span>
              <span className="text-white font-bold text-sm">₹{activeMatch.entryAmount}</span>
            </div>
            <div className="border-r border-zinc-800" />
            <div>
              <span className="text-zinc-500 block text-[10px]">Winner Prize</span>
              <span className="text-emerald-400 font-black text-sm">₹{netWinnerPrize}</span>
            </div>
            <div className="border-r border-zinc-800" />
            <div>
              <span className="text-zinc-500 block text-[10px]">Clock</span>
              <span className="text-amber-400 font-bold text-sm">5 Mins</span>
            </div>
          </div>

          {/* Cancel Room Button */}
          <button
            disabled={isCancellingRoom}
            onClick={handleCancelRoom}
            className="py-2.5 px-6 rounded-xl bg-red-950/40 border border-red-500/40 hover:bg-red-900/40 text-red-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {isCancellingRoom ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            Cancel Room (100% Refund)
          </button>
        </div>
      )}

      {/* VIEW 3: ACTIVE GAME SCREEN */}
      {viewState === 'game' && activeMatch && (
        <div className="max-w-md mx-auto w-full px-3 pt-2 flex flex-col gap-2">
          {/* Top Opponent Player Card */}
          <div className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
            activeMatch.turn !== userColor
              ? 'bg-[#1e1709] border-[#f5c443] shadow-[0_0_12px_rgba(245,196,67,0.2)]'
              : 'bg-[#10131b] border-zinc-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={opponentPlayer?.avatar || '/avatars/default_avatar.jpg'}
                  alt={opponentPlayer?.name}
                  className="w-10 h-10 rounded-full object-cover border border-amber-400/50"
                />
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {userColor === 'w' ? '♚' : '♔'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{opponentPlayer?.name}</span>
                  {opponentPlayer?.isBot && (
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-[#f5c443] border border-[#f5c443]/40 rounded text-[8px] font-black font-mono">
                      BOT
                    </span>
                  )}
                </div>
                {/* Captured pieces */}
                <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                  {materialAdvantage.oppCaptures.map((p, idx) => (
                    <div key={idx} className="w-3.5 h-3.5">
                      <ChessPiece type={p} color={userColor} className="w-full h-full" />
                    </div>
                  ))}
                  {materialAdvantage.myAdvantage < 0 && (
                    <span className="text-[9px] font-bold text-amber-400 ml-1 font-mono">
                      +{Math.abs(materialAdvantage.myAdvantage)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-sm flex items-center gap-1.5 ${
              (userColor === 'w' ? blackTimer : whiteTimer) <= 30
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                : 'bg-zinc-900 border-zinc-700 text-zinc-200'
            }`}>
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {formatTime(userColor === 'w' ? blackTimer : whiteTimer)}
            </div>
          </div>

          {/* 8x8 Chessboard Container */}
          <div className="relative w-full aspect-square bg-[#301b0d] p-1.5 rounded-2xl shadow-2xl border-4 border-[#522e17] overflow-hidden">
            <div className="w-full h-full flex flex-col border border-[#241308] rounded-lg overflow-hidden shadow-inner">
              {renderBoardSquares()}
            </div>
          </div>

          {/* Bottom User Player Card */}
          <div className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
            activeMatch.turn === userColor
              ? 'bg-[#1e1709] border-[#f5c443] shadow-[0_0_12px_rgba(245,196,67,0.2)]'
              : 'bg-[#10131b] border-zinc-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={myPlayer?.avatar || '/avatars/default_avatar.jpg'}
                  alt={myPlayer?.name}
                  className="w-10 h-10 rounded-full object-cover border border-amber-400/50"
                />
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {userColor === 'w' ? '♔' : '♚'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{myPlayer?.name} (You)</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[8px] font-black font-mono">
                    YOU
                  </span>
                </div>
                {/* Captured pieces */}
                <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                  {materialAdvantage.myCaptures.map((p, idx) => (
                    <div key={idx} className="w-3.5 h-3.5">
                      <ChessPiece type={p} color={userColor === 'w' ? 'b' : 'w'} className="w-full h-full" />
                    </div>
                  ))}
                  {materialAdvantage.myAdvantage > 0 && (
                    <span className="text-[9px] font-bold text-amber-400 ml-1 font-mono">
                      +{materialAdvantage.myAdvantage}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-sm flex items-center gap-1.5 ${
              (userColor === 'w' ? whiteTimer : blackTimer) <= 30
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                : 'bg-zinc-900 border-zinc-700 text-zinc-200'
            }`}>
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {formatTime(userColor === 'w' ? whiteTimer : blackTimer)}
            </div>
          </div>

          {/* Game Controls / Actions */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <button
              onClick={() => setIsFlipped(prev => !prev)}
              className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              Flip Board
            </button>

            <button
              onClick={() => setShowResignModal(true)}
              className="flex-1 py-2 rounded-xl bg-red-950/40 border border-red-500/40 hover:bg-red-900/40 text-red-300 text-xs font-bold flex items-center justify-center gap-1 transition"
            >
              <Flag className="w-3.5 h-3.5" />
              Resign
            </button>

            <button
              onClick={() => setViewState('lobby')}
              className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-1 transition"
            >
              Lobby
            </button>
          </div>

          {/* Move History Strip */}
          {activeMatch.history && activeMatch.history.length > 0 && (
            <div className="bg-[#0f1118] border border-zinc-800/80 rounded-xl p-2 max-h-16 overflow-y-auto">
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-mono text-zinc-400">
                {activeMatch.history.map((san, idx) => (
                  <span key={idx} className={idx % 2 === 0 ? 'text-zinc-200' : 'text-[#f5c443]'}>
                    {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}{san}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: MATCH FINISHED SUMMARY */}
      {activeMatch && activeMatch.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#141722] border border-[#f5c443]/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col gap-4">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 ${
              activeMatch.winner === 'draw'
                ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                : (activeMatch.winner === 'w' && activeMatch.whitePlayer.id === user?.uid) ||
                  (activeMatch.winner === 'b' && activeMatch.blackPlayer.id === user?.uid)
                ? 'bg-[#f5c443]/20 border-[#f5c443] text-[#f5c443]'
                : 'bg-red-500/20 border-red-400 text-red-300'
            }`}>
              {activeMatch.winner === 'draw' ? (
                <Shield className="w-8 h-8" />
              ) : (activeMatch.winner === 'w' && activeMatch.whitePlayer.id === user?.uid) ||
                (activeMatch.winner === 'b' && activeMatch.blackPlayer.id === user?.uid) ? (
                <Trophy className="w-8 h-8" />
              ) : (
                <Flag className="w-8 h-8" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                {activeMatch.winner === 'draw'
                  ? 'Match Drawn'
                  : (activeMatch.winner === 'w' && activeMatch.whitePlayer.id === user?.uid) ||
                    (activeMatch.winner === 'b' && activeMatch.blackPlayer.id === user?.uid)
                  ? 'Checkmate Victory!'
                  : 'Defeat'}
              </h3>
              <p className="text-xs text-zinc-300 mt-1">{activeMatch.finishReason || 'Game completed'}</p>
            </div>

            {/* Financial Settlement Breakdown */}
            <div className="bg-[#0b0d14] border border-zinc-800 rounded-2xl p-3 text-left flex flex-col gap-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Both Players Stake:</span>
                <span className="text-white font-bold">2 × ₹{activeMatch.entryAmount} = ₹{activeMatch.settlement?.totalPool || (activeMatch.entryAmount * 2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Platform Commission (10%):</span>
                <span className="text-amber-400 font-bold">₹{activeMatch.settlement?.platformFee || 0}</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 flex justify-between text-sm font-bold">
                <span>{activeMatch.winner === 'draw' ? 'Refunded to Wallet:' : 'Net Prize Credited:'}</span>
                <span className="text-emerald-400 font-black">
                  ₹{activeMatch.winner === 'draw'
                    ? (activeMatch.settlement?.refundPerPlayer || activeMatch.entryAmount)
                    : (activeMatch.settlement?.winnerPayout || 0)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setActiveMatch(null);
                  setActiveRoomCode(null);
                  setViewState('lobby');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f5c443] to-[#d99b26] font-bold text-black text-sm tracking-wide shadow-lg hover:brightness-105 transition"
              >
                Play Another Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PAWN PROMOTION SELECTOR */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141722] border border-[#f5c443]/40 rounded-2xl p-5 max-w-xs w-full text-center">
            <h4 className="text-sm font-bold text-white mb-3">Choose Promotion Piece</h4>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'q', label: 'Queen' },
                { type: 'r', label: 'Rook' },
                { type: 'b', label: 'Bishop' },
                { type: 'n', label: 'Knight' },
              ].map((p) => (
                <button
                  key={p.type}
                  onClick={() => executeMove(showPromotionModal.from, showPromotionModal.to, p.type)}
                  className="py-3 px-1 bg-zinc-800 border border-zinc-700 hover:bg-[#f5c443]/20 hover:border-[#f5c443] rounded-xl flex items-center justify-center transition"
                >
                  <div className="w-10 h-10">
                    <ChessPiece type={p.type} color={userColor} className="w-full h-full" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESIGN CONFIRM */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141722] border border-red-500/40 rounded-2xl p-5 max-w-xs w-full text-center flex flex-col gap-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <Flag className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Resign Match?</h4>
            <p className="text-xs text-zinc-400">Surrendering gives opponent the win. Stake will be settled immediately.</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowResignModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResign}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition"
              >
                Confirm Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RULES & COMMISSION MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12151e] border border-[#f5c443]/40 rounded-3xl p-5 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#f5c443]" />
                <h3 className="text-base font-black text-white">Rules & Commission Policy</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-zinc-300">
              <div className="bg-[#0a0c12] p-3 rounded-xl border border-zinc-800">
                <h4 className="font-bold text-[#f5c443] mb-1">🎮 Room Code Multiplayer (आमने-सामने)</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Host "Create Room" par click karke 6-digit code generate karta hai. Doosra player "Join with Room Code" me jakar code enter karta hai. Dono players turant real-time live table par connect hokar match khelte hain.
                </p>
              </div>

              <div className="bg-[#0a0c12] p-3 rounded-xl border border-zinc-800">
                <h4 className="font-bold text-emerald-400 mb-1">💰 Stake & 10% Platform Commission</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Dono players ka Base Stake pool me jama hota hai. For example ₹100 each = ₹200 total pool. Usme se 10% (₹20) platform commission deduct hokar winning player ko <strong>₹180 net prize</strong> wallet me credit hota hai.
                </p>
              </div>

              <div className="bg-[#0a0c12] p-3 rounded-xl border border-zinc-800">
                <h4 className="font-bold text-blue-400 mb-1">🤝 Draw & Stalemate (100% Refund)</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Stalemate, 3-fold repetition ya draw hone par dono players ka 100% stake bina kisi deduction ke wapas wallet me refund ho jata hai.
                </p>
              </div>

              <div className="bg-[#0a0c12] p-3 rounded-xl border border-zinc-800">
                <h4 className="font-bold text-amber-400 mb-1">⏱️ 5-Minute Blitz Clocks</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Har player ke paas 5 minutes ka countdown clock hota hai. Move chalne par clock opponent ko switch hota hai. Time out hone par opponent win घोषित hota hai.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 bg-[#f5c443] text-black font-black text-xs uppercase rounded-xl transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: MATCH HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#12151e] border border-zinc-800 rounded-3xl p-5 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Your Chess Match History</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {matchHistory.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-400" />
                <p>No matches played yet. Start your first match!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {matchHistory.map((m) => {
                  const isWon = (m.winner === 'w' && m.whitePlayer.id === user?.uid) || (m.winner === 'b' && m.blackPlayer.id === user?.uid);
                  const isDraw = m.winner === 'draw';
                  const opp = m.whitePlayer.id === user?.uid ? m.blackPlayer : m.whitePlayer;

                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-[#0a0c12] border border-zinc-800/80 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isWon ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : isDraw ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}>
                          {isWon ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">vs {opp?.name}</span>
                            {m.roomCode && (
                              <span className="px-1 py-0.2 bg-amber-500/20 text-amber-400 rounded text-[8px] font-mono">
                                #{m.roomCode}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Stake: ₹{m.entryAmount} • {m.finishReason || (isWon ? 'Won' : isDraw ? 'Draw' : 'Lost')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-xs font-black block ${
                          isWon ? 'text-emerald-400' : isDraw ? 'text-blue-400' : 'text-zinc-500'
                        }`}>
                          {isWon ? `+₹${m.settlement?.winnerPayout || 0}` : isDraw ? `Refund ₹${m.entryAmount}` : `-₹${m.entryAmount}`}
                        </span>
                        <span className="text-[9px] text-zinc-600">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 bg-zinc-800 text-zinc-200 font-bold text-xs uppercase rounded-xl transition mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
