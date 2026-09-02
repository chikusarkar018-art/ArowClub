// server/botEngine.ts
import { Chess, Square, Move } from 'chess.js';

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 325,
  b: 335,
  r: 505,
  q: 975,
  k: 20000,
};

const PAWN_PST_MG = [
    0,   0,   0,   0,   0,   0,   0,   0,
   98, 134,  61,  95,  68, 126,  34, -11,
   -6,   7,  26,  31,  65,  56,  25, -20,
  -14,  13,   6,  21,  23,  12,  17, -23,
  -27,  -2,  -5,  12,  17,   6,  10, -25,
  -26,  -4,  -4, -10,   3,   3,  33, -12,
  -35,  -1, -20, -23, -15,  24,  38, -22,
    0,   0,   0,   0,   0,   0,   0,   0,
];

const PAWN_PST_EG = [
    0,   0,   0,   0,   0,   0,   0,   0,
  178, 173, 158, 134, 147, 132, 165, 187,
   94, 100,  85,  67,  56,  53,  82,  84,
   32,  24,  13,   5,  -2,   4,  17,  17,
   13,   9,  -3,  -7,  -7,  -8,   3,  -1,
    4,   7,  -6,   1,   0,  -5,  -1,  -8,
   13,   8,   8,  10,  13,   0,   2,  -7,
    0,   0,   0,   0,   0,   0,   0,   0,
];

const KNIGHT_PST_MG = [
  -167, -89, -34, -49,  61, -97, -15, -107,
   -73, -41,  72,  36,  23,  62,   7,  -17,
   -47,  60,  37,  65,  84, 129,  73,   44,
    -9,  17,  19,  53,  37,  69,  18,   22,
   -13,   4,  16,  13,  28,  19,  21,   -8,
   -23,  -9,  12,  10,  19,  17,  25,  -16,
   -29, -53, -12,  -3,  -1,  18, -14,  -19,
  -105, -21, -58, -33, -17, -28, -19,  -23,
];

const KNIGHT_PST_EG = [
  -58, -38, -13, -28, -31, -27, -63, -99,
  -25,  -8, -25,  -2,  -9, -25, -24, -52,
  -24, -20,  10,   9,  -1,  -9, -19, -41,
  -17,   3,  22,  22,  22,  11,   8, -18,
  -18,  -6,  16,  25,  16,  17,   4, -18,
  -23,  -3,  -1,  15,  10,  -3, -20, -22,
  -42, -20, -10,  -5,  -2, -20, -23, -44,
  -29, -51, -23, -15, -22, -18, -50, -64,
];

function squareIndex(square: Square, color: 'w' | 'b'): number {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1], 10);
  const idx = rank * 8 + file;
  return color === 'w' ? idx : (7 - rank) * 8 + file;
}

export function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -200000 : 200000;
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) return 0;

  const board = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sq = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
      const val = PIECE_VALUES[p.type] || 0;
      const pst = p.type === 'p' ? PAWN_PST_MG[squareIndex(sq, p.color)] :
                  p.type === 'n' ? KNIGHT_PST_MG[squareIndex(sq, p.color)] : 0;
      const pieceVal = val + pst;
      score += p.color === 'w' ? pieceVal : -pieceVal;
    }
  }
  return chess.turn() === 'w' ? score : -score;
}

export function chooseBestMove(chess: Chess, maxDepth?: number): { from: string; to: string; promotion?: string } | null {
  const legalMoves = chess.moves({ verbose: true });
  if (!legalMoves || legalMoves.length === 0) return null;

  const pieceCount = chess.board().flat().filter(Boolean).length;
  const searchDepth = maxDepth || (pieceCount <= 12 ? 4 : 3);

  const res = alphaBeta(chess, searchDepth, -Infinity, Infinity);
  return res.bestMove
    ? { from: res.bestMove.from, to: res.bestMove.to, promotion: res.bestMove.promotion }
    : { from: legalMoves[0].from, to: legalMoves[0].to, promotion: legalMoves[0].promotion };
}

function alphaBeta(chess: Chess, depth: number, alpha: number, beta: number): { score: number; bestMove?: Move } {
  if (depth === 0) return { score: evaluateBoard(chess) };
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return { score: chess.inCheck() ? -200000 : 0 };

  moves.sort((a, b) => ((b.captured ? 100 : 0) - (a.captured ? 100 : 0)));
  let bestMove = moves[0];
  let maxScore = -Infinity;

  for (const m of moves) {
    chess.move(m);
    const r = alphaBeta(chess, depth - 1, -beta, -alpha);
    const score = -r.score;
    chess.undo();
    if (score > maxScore) { maxScore = score; bestMove = m; }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return { score: maxScore, bestMove };
}

export interface BotProfile {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  title?: string;
  country: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'master';
  depth: number;
}

const BOT_PROFILES: BotProfile[] = [
  { id: 'bot_carlsen', name: 'Grandmaster Magnus', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', rating: 2882, title: 'GM', country: '🇳🇴', difficulty: 'master', depth: 4 },
  { id: 'bot_anand', name: 'Vishy Anand Pro', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', rating: 2795, title: 'GM', country: '🇮🇳', difficulty: 'master', depth: 4 },
  { id: 'bot_pragg', name: 'Pragg Prodigy', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', rating: 2750, title: 'GM', country: '🇮🇳', difficulty: 'hard', depth: 3 },
  { id: 'bot_hikaru', name: 'Hikaru Speed', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', rating: 2800, title: 'GM', country: '🇺🇸', difficulty: 'hard', depth: 3 },
  { id: 'bot_gukesh', name: 'Gukesh Challenger', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', rating: 2760, title: 'GM', country: '🇮🇳', difficulty: 'hard', depth: 3 },
  { id: 'bot_club', name: 'Club Master Rahul', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', rating: 1950, title: 'CM', country: '🇮🇳', difficulty: 'medium', depth: 2 },
  { id: 'bot_casual', name: 'Casual Gamer Alex', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', rating: 1400, country: '🇬🇧', difficulty: 'easy', depth: 1 },
];

export function getRandomBotProfile(preferredDifficulty?: 'easy' | 'medium' | 'hard' | 'master'): BotProfile {
  if (preferredDifficulty) {
    const filtered = BOT_PROFILES.filter(b => b.difficulty === preferredDifficulty);
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }
  return BOT_PROFILES[Math.floor(Math.random() * BOT_PROFILES.length)];
}
