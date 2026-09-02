// server/gameManager.ts
import { Chess } from 'chess.js';
import { chooseBestMove, getRandomBotProfile, BotProfile } from './botEngine.js';
import { db } from './db.js';

export interface ChessPlayer {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'master';
}

export interface ChessMoveRecord {
  from: string;
  to: string;
  san: string;
  piece: string;
  color: 'w' | 'b';
  captured?: string;
  promotion?: string;
  timestamp: number;
}

export interface ChessMatch {
  id: string;
  roomCode?: string;
  whitePlayer: ChessPlayer;
  blackPlayer: ChessPlayer;
  entryAmount: number;
  totalPool: number;
  fen: string;
  turn: 'w' | 'b';
  history: string[];
  moves: ChessMoveRecord[];
  status: 'waiting' | 'active' | 'finished';
  winner?: 'w' | 'b' | 'draw';
  finishReason?: string;
  timers: {
    w: number; // remaining seconds
    b: number; // remaining seconds
    lastMoveTime: number;
  };
  settlement?: {
    totalPool: number;
    platformFee: number;
    winnerPayout: number;
    winnerId?: string;
    refundPerPlayer?: number;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class GameManager {
  private matches: Map<string, ChessMatch> = new Map();
  private roomCodes: Map<string, string> = new Map(); // roomCode -> matchId
  private chessInstances: Map<string, Chess> = new Map();

  constructor() {
    // Periodic timer tick to manage clock timeouts
    setInterval(() => {
      this.checkTimeouts();
    }, 1000);
  }

  // Generate a clean 6-digit numeric Room Code
  private generateRoomCode(): string {
    let code = '';
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.roomCodes.has(code));
    return code;
  }

  // Create a Room Code for 2-Player Realtime Multiplayer
  createRoom(
    userId: string,
    entryAmount: number,
    preferredColor: 'w' | 'b' | 'random' = 'random'
  ): { success: boolean; match?: ChessMatch; roomCode?: string; error?: string } {
    const user = db.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (entryAmount > 0 && user.walletBalance < entryAmount) {
      return { success: false, error: 'Insufficient wallet balance. Please deposit funds.' };
    }

    // Deduct entry stake from host wallet
    if (entryAmount > 0) {
      const prevBal = user.walletBalance;
      user.walletBalance = Number((user.walletBalance - entryAmount).toFixed(2));
      user.totalBet = Number(((user.totalBet || 0) + entryAmount).toFixed(2));

      db.transactions.unshift({
        id: `TX-CHESS-HOST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        uid: user.uid,
        type: 'bet',
        amount: entryAmount,
        previousBalance: prevBal,
        newBalance: user.walletBalance,
        reference: `Chess Room Stake ₹${entryAmount}`,
        createdBy: 'user',
        note: `Chess Room Stake Entry: ₹${entryAmount}`,
        createdAt: new Date().toISOString(),
      } as any);

      db.saveToDisk();
    }

    const roomCode = this.generateRoomCode();
    const matchId = `CHESS-ROOM-${roomCode}-${Date.now()}`;
    const chess = new Chess();

    const assignedColor: 'w' | 'b' =
      preferredColor === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : preferredColor;

    const hostPlayer: ChessPlayer = {
      id: user.uid,
      name: user.username || `Player_${user.uid}`,
      avatar: user.avatarUrl || '/avatars/default_avatar.jpg',
      rating: 1500 + Math.floor((user.vipLevel || 0) * 120),
      isBot: false,
    };

    const emptyPlayer: ChessPlayer = {
      id: 'waiting',
      name: 'Waiting for opponent...',
      avatar: '/avatars/default_avatar.jpg',
      rating: 1500,
      isBot: false,
    };

    const match: ChessMatch = {
      id: matchId,
      roomCode,
      whitePlayer: assignedColor === 'w' ? hostPlayer : emptyPlayer,
      blackPlayer: assignedColor === 'b' ? hostPlayer : emptyPlayer,
      entryAmount,
      totalPool: entryAmount * 2,
      fen: chess.fen(),
      turn: 'w',
      history: [],
      moves: [],
      status: 'waiting',
      timers: {
        w: 300,
        b: 300,
        lastMoveTime: Date.now(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.matches.set(matchId, match);
    this.roomCodes.set(roomCode, matchId);
    this.chessInstances.set(matchId, chess);

    return { success: true, match, roomCode };
  }

  // Join an existing room via 6-digit Room Code
  joinRoom(
    userId: string,
    roomCode: string
  ): { success: boolean; match?: ChessMatch; error?: string } {
    const cleanCode = roomCode.trim();
    const matchId = this.roomCodes.get(cleanCode);
    if (!matchId) {
      return { success: false, error: 'Invalid Room Code. Please check and re-enter.' };
    }

    const match = this.matches.get(matchId);
    if (!match || match.status !== 'waiting') {
      return { success: false, error: 'Room is no longer accepting players or game already started.' };
    }

    if (match.whitePlayer.id === userId || match.blackPlayer.id === userId) {
      return { success: false, error: 'You are already the host of this room.' };
    }

    const user = db.users.get(userId);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    if (match.entryAmount > 0 && user.walletBalance < match.entryAmount) {
      return {
        success: false,
        error: `Insufficient balance. This table requires ₹${match.entryAmount} stake.`,
      };
    }

    // Deduct entry stake from joining player
    if (match.entryAmount > 0) {
      const prevBal = user.walletBalance;
      user.walletBalance = Number((user.walletBalance - match.entryAmount).toFixed(2));
      user.totalBet = Number(((user.totalBet || 0) + match.entryAmount).toFixed(2));

      db.transactions.unshift({
        id: `TX-CHESS-JOIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        uid: user.uid,
        type: 'bet',
        amount: match.entryAmount,
        previousBalance: prevBal,
        newBalance: user.walletBalance,
        reference: `Chess Room Stake ₹${match.entryAmount} (Code: ${cleanCode})`,
        createdBy: 'user',
        note: `Chess Room Join Stake: ₹${match.entryAmount}`,
        createdAt: new Date().toISOString(),
      } as any);

      db.saveToDisk();
    }

    const joinPlayer: ChessPlayer = {
      id: user.uid,
      name: user.username || `Player_${user.uid}`,
      avatar: user.avatarUrl || '/avatars/default_avatar.jpg',
      rating: 1500 + Math.floor((user.vipLevel || 0) * 120),
      isBot: false,
    };

    if (match.whitePlayer.id === 'waiting') {
      match.whitePlayer = joinPlayer;
    } else {
      match.blackPlayer = joinPlayer;
    }

    match.status = 'active';
    match.timers.lastMoveTime = Date.now();
    match.updatedAt = new Date().toISOString();

    return { success: true, match };
  }

  // Cancel waiting room and refund host 100%
  cancelRoom(matchId: string, userId: string): { success: boolean; error?: string } {
    const match = this.matches.get(matchId);
    if (!match) return { success: false, error: 'Match not found' };

    if (match.status !== 'waiting') {
      return { success: false, error: 'Game is already active and cannot be cancelled.' };
    }

    const isHost = match.whitePlayer.id === userId || match.blackPlayer.id === userId;
    if (!isHost) return { success: false, error: 'Only host can cancel this room.' };

    if (match.entryAmount > 0) {
      this.updateUserCoins(userId, match.entryAmount, 'refund', `Chess Room #${match.roomCode} Cancel Refund`);
    }

    if (match.roomCode) {
      this.roomCodes.delete(match.roomCode);
    }
    this.matches.delete(matchId);
    this.chessInstances.delete(matchId);

    return { success: true };
  }

  // Create a new match vs Bot or Player
  createMatch(
    userId: string,
    entryAmount: number,
    botDifficulty: 'easy' | 'medium' | 'hard' | 'master' = 'medium',
    preferredColor: 'w' | 'b' | 'random' = 'random'
  ): { success: boolean; match?: ChessMatch; error?: string } {
    const user = db.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (entryAmount > 0 && user.walletBalance < entryAmount) {
      return { success: false, error: 'Insufficient wallet balance to join this table. Please recharge.' };
    }

    // Deduct entry amount from user wallet
    if (entryAmount > 0) {
      const prevBal = user.walletBalance;
      user.walletBalance = Number((user.walletBalance - entryAmount).toFixed(2));
      user.totalBet = Number(((user.totalBet || 0) + entryAmount).toFixed(2));

      db.transactions.unshift({
        id: `TX-CHESS-ENTRY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        uid: user.uid,
        type: 'bet',
        amount: entryAmount,
        previousBalance: prevBal,
        newBalance: user.walletBalance,
        reference: `Chess Match Entry Stake ₹${entryAmount}`,
        createdBy: 'user',
        note: `Chess Room Stake Entry: ₹${entryAmount}`,
        createdAt: new Date().toISOString(),
      } as any);

      db.saveToDisk();
    }

    const botProfile = getRandomBotProfile(botDifficulty);
    const assignedUserColor: 'w' | 'b' =
      preferredColor === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : preferredColor;

    const userPlayer: ChessPlayer = {
      id: user.uid,
      name: user.username || `Player_${user.uid}`,
      avatar: user.avatarUrl || '/avatars/default_avatar.jpg',
      rating: 1500 + Math.floor((user.vipLevel || 0) * 120),
      isBot: false,
    };

    const botPlayer: ChessPlayer = {
      id: botProfile.id,
      name: botProfile.name,
      avatar: botProfile.avatar,
      rating: botProfile.rating,
      isBot: true,
      botDifficulty,
    };

    const matchId = `CHESS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const chess = new Chess();

    const match: ChessMatch = {
      id: matchId,
      whitePlayer: assignedUserColor === 'w' ? userPlayer : botPlayer,
      blackPlayer: assignedUserColor === 'b' ? userPlayer : botPlayer,
      entryAmount,
      totalPool: entryAmount * 2,
      fen: chess.fen(),
      turn: 'w',
      history: [],
      moves: [],
      status: 'active',
      timers: {
        w: 300, // 5 minutes per player
        b: 300,
        lastMoveTime: Date.now(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.matches.set(matchId, match);
    this.chessInstances.set(matchId, chess);

    // If bot plays White, trigger bot's opening move automatically with slight natural delay
    if (match.whitePlayer.isBot) {
      setTimeout(() => {
        this.executeBotMove(matchId);
      }, 1000);
    }

    return { success: true, match };
  }

  // Make human move
  makeMove(
    matchId: string,
    userId: string,
    from: string,
    to: string,
    promotion: string = 'q'
  ): { success: boolean; match?: ChessMatch; move?: any; error?: string } {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'active') {
      return { success: false, error: 'Match not found or already finished' };
    }

    const isWhite = match.whitePlayer.id === userId;
    const isBlack = match.blackPlayer.id === userId;

    if (!isWhite && !isBlack) {
      return { success: false, error: 'You are not a participant in this match' };
    }

    const expectedColor = isWhite ? 'w' : 'b';
    if (match.turn !== expectedColor) {
      return { success: false, error: "Not your turn" };
    }

    const chess = this.chessInstances.get(matchId);
    if (!chess) {
      return { success: false, error: 'Game state error' };
    }

    try {
      // Execute move on chess engine
      const moveResult = chess.move({
        from: from as any,
        to: to as any,
        promotion: promotion as any,
      });

      if (!moveResult) {
        return { success: false, error: 'Illegal chess move' };
      }

      // Update clocks
      const now = Date.now();
      const elapsedSec = Math.floor((now - match.timers.lastMoveTime) / 1000);
      if (match.turn === 'w') {
        match.timers.w = Math.max(0, match.timers.w - elapsedSec);
      } else {
        match.timers.b = Math.max(0, match.timers.b - elapsedSec);
      }
      match.timers.lastMoveTime = now;

      // Append move record
      const moveRecord: ChessMoveRecord = {
        from: moveResult.from,
        to: moveResult.to,
        san: moveResult.san,
        piece: moveResult.piece,
        color: moveResult.color,
        captured: moveResult.captured,
        promotion: moveResult.promotion,
        timestamp: now,
      };

      match.moves.push(moveRecord);
      match.history.push(moveResult.san);
      match.fen = chess.fen();
      match.turn = chess.turn();
      match.updatedAt = new Date().toISOString();

      // Check game terminal conditions
      if (chess.isGameOver()) {
        let winnerColor: 'w' | 'b' | 'draw' = 'draw';
        let reason = 'Game finished';

        if (chess.isCheckmate()) {
          winnerColor = chess.turn() === 'w' ? 'b' : 'w';
          reason = `Checkmate! ${winnerColor === 'w' ? 'White' : 'Black'} won!`;
        } else if (chess.isDraw()) {
          if (chess.isStalemate()) reason = 'Draw by Stalemate';
          else if (chess.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
          else if (chess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
          else reason = 'Draw by 50-move rule';
        }

        this.endMatch(matchId, winnerColor, reason);
      } else {
        // Trigger bot move if opponent is bot
        const nextPlayer = match.turn === 'w' ? match.whitePlayer : match.blackPlayer;
        if (nextPlayer.isBot) {
          const thinkDelay = 600 + Math.floor(Math.random() * 900);
          setTimeout(() => {
            this.executeBotMove(matchId);
          }, thinkDelay);
        }
      }

      return { success: true, match, move: moveRecord };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid move' };
    }
  }

  // Execute bot move
  executeBotMove(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'active') return;

    const botPlayer = match.turn === 'w' ? match.whitePlayer : match.blackPlayer;
    if (!botPlayer.isBot) return;

    const chess = this.chessInstances.get(matchId);
    if (!chess) return;

    const maxDepth = botPlayer.botDifficulty === 'master' ? 4 : botPlayer.botDifficulty === 'hard' ? 3 : botPlayer.botDifficulty === 'easy' ? 1 : 2;
    const best = chooseBestMove(chess, maxDepth);
    if (!best) {
      if (chess.isGameOver()) {
        const winner = chess.turn() === 'w' ? 'b' : 'w';
        this.endMatch(matchId, winner, 'Checkmate / Stalemate');
      }
      return;
    }

    try {
      const moveResult = chess.move({
        from: best.from as any,
        to: best.to as any,
        promotion: (best.promotion || 'q') as any,
      });

      if (moveResult) {
        const now = Date.now();
        const elapsedSec = Math.floor((now - match.timers.lastMoveTime) / 1000);
        if (match.turn === 'w') {
          match.timers.w = Math.max(0, match.timers.w - elapsedSec);
        } else {
          match.timers.b = Math.max(0, match.timers.b - elapsedSec);
        }
        match.timers.lastMoveTime = now;

        const moveRecord: ChessMoveRecord = {
          from: moveResult.from,
          to: moveResult.to,
          san: moveResult.san,
          piece: moveResult.piece,
          color: moveResult.color,
          captured: moveResult.captured,
          promotion: moveResult.promotion,
          timestamp: now,
        };

        match.moves.push(moveRecord);
        match.history.push(moveResult.san);
        match.fen = chess.fen();
        match.turn = chess.turn();
        match.updatedAt = new Date().toISOString();

        if (chess.isGameOver()) {
          let winnerColor: 'w' | 'b' | 'draw' = 'draw';
          let reason = 'Game finished';

          if (chess.isCheckmate()) {
            winnerColor = chess.turn() === 'w' ? 'b' : 'w';
            reason = `Checkmate! ${winnerColor === 'w' ? 'White' : 'Black'} won!`;
          } else if (chess.isDraw()) {
            reason = 'Draw game';
          }
          this.endMatch(matchId, winnerColor, reason);
        }
      }
    } catch (e) {
      console.error('Bot move execution error:', e);
    }
  }

  // Resign match
  resignMatch(matchId: string, userId: string): { success: boolean; match?: ChessMatch; error?: string } {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'active') {
      return { success: false, error: 'Match is not active' };
    }

    const isWhite = match.whitePlayer.id === userId;
    const isBlack = match.blackPlayer.id === userId;

    if (!isWhite && !isBlack) {
      return { success: false, error: 'Not authorized for this match' };
    }

    const winnerColor: 'w' | 'b' = isWhite ? 'b' : 'w';
    this.endMatch(matchId, winnerColor, `${isWhite ? 'White' : 'Black'} Resigned`);
    return { success: true, match };
  }

  // Periodic Clock Timeout checker
  private checkTimeouts() {
    const now = Date.now();
    for (const [matchId, match] of this.matches.entries()) {
      if (match.status !== 'active') continue;

      const elapsed = Math.floor((now - match.timers.lastMoveTime) / 1000);
      if (match.turn === 'w') {
        const remaining = Math.max(0, match.timers.w - elapsed);
        if (remaining <= 0) {
          this.endMatch(matchId, 'b', 'White Timed Out');
        }
      } else {
        const remaining = Math.max(0, match.timers.b - elapsed);
        if (remaining <= 0) {
          this.endMatch(matchId, 'w', 'Black Timed Out');
        }
      }
    }
  }

  // End match & Settle Platform Commission
  endMatch(matchId: string, winnerColor: 'w' | 'b' | 'draw', reason: string) {
    const match = this.matches.get(matchId);
    if (!match || match.status === 'finished') return;

    match.status = 'finished';
    match.winner = winnerColor;
    match.finishReason = reason;
    const totalPool = match.entryAmount * 2;

    if (winnerColor === 'draw') {
      // 100% Refund on Draw
      if (!match.whitePlayer.isBot && match.entryAmount > 0) {
        this.updateUserCoins(match.whitePlayer.id, match.entryAmount, 'refund', `Chess Match #${matchId} Draw Refund`);
      }
      if (!match.blackPlayer.isBot && match.entryAmount > 0) {
        this.updateUserCoins(match.blackPlayer.id, match.entryAmount, 'refund', `Chess Match #${matchId} Draw Refund`);
      }
      match.settlement = {
        totalPool,
        platformFee: 0,
        winnerPayout: 0,
        refundPerPlayer: match.entryAmount,
        reason,
      };
    } else {
      const winner = winnerColor === 'w' ? match.whitePlayer : match.blackPlayer;
      const loser = winnerColor === 'w' ? match.blackPlayer : match.whitePlayer;
      
      const platformFee = Math.round(totalPool * 0.10); // 10% Platform Cut
      const winnerPayout = totalPool - platformFee;     // 90% Net Pool to Winner

      if (!winner.isBot && winnerPayout > 0) {
        this.updateUserCoins(winner.id, winnerPayout, 'win', `Chess Victory Pool #${matchId} (10% platform cut applied)`);
        const winUser = db.users.get(winner.id);
        if (winUser) {
          const profit = Math.max(0, Number((winnerPayout - match.entryAmount).toFixed(2)));
          if (profit > 0) {
            winUser.completedTurnover = Number(((winUser.completedTurnover || 0) + profit).toFixed(2));
            winUser.currentTurnover = Number(((winUser.currentTurnover || 0) + profit).toFixed(2));
            winUser.remainingTurnover = Math.max(0, Number(((winUser.remainingTurnover ?? (winUser.requiredTurnover || 0)) - profit).toFixed(2)));
          }
        }
      }
      if (!loser.isBot && match.entryAmount > 0) {
        const loserUser = db.users.get(loser.id);
        if (loserUser) {
          const loss = match.entryAmount;
          loserUser.totalLoss = Number(((loserUser.totalLoss || 0) + loss).toFixed(2));
          loserUser.completedTurnover = Number(((loserUser.completedTurnover || 0) + loss).toFixed(2));
          loserUser.currentTurnover = Number(((loserUser.currentTurnover || 0) + loss).toFixed(2));
          loserUser.remainingTurnover = Math.max(0, Number(((loserUser.remainingTurnover ?? (loserUser.requiredTurnover || 0)) - loss).toFixed(2)));
        }
      }

      this.recordPlatformProfit(platformFee, matchId);
      match.settlement = {
        totalPool,
        platformFee,
        winnerPayout,
        winnerId: winner.id,
        reason,
      };
    }

    match.updatedAt = new Date().toISOString();
    db.saveToDisk();
  }

  private updateUserCoins(userId: string, amount: number, type: 'win' | 'refund', noteText: string) {
    const user = db.users.get(userId);
    if (!user) return;

    const prevBal = user.walletBalance;
    user.walletBalance = Number((user.walletBalance + amount).toFixed(2));
    if (type === 'win') {
      user.totalWin = Number(((user.totalWin || 0) + amount).toFixed(2));
      user.vipExp = Math.floor(user.vipExp + amount / 10);
    }

    db.transactions.unshift({
      id: `TX-CHESS-${type.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uid: user.uid,
      type: type === 'win' ? 'win' : 'refund',
      amount,
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: noteText,
      createdBy: 'system',
      note: noteText,
      createdAt: new Date().toISOString(),
    } as any);

    db.saveToDisk();
  }

  private recordPlatformProfit(feeAmount: number, matchId: string) {
    if (feeAmount <= 0) return;
    // Log platform revenue
    db.activityLogs.unshift({
      id: `LOG-CHESS-FEE-${Date.now()}`,
      adminId: 'system',
      adminUsername: 'Platform Commission Engine',
      action: 'Chess Commission Settlement',
      target: `Match #${matchId}`,
      details: `Platform collected 10% commission ₹${feeAmount} from Chess match`,
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    } as any);
  }

  getMatch(matchId: string): ChessMatch | undefined {
    return this.matches.get(matchId);
  }

  getUserMatches(userId: string): ChessMatch[] {
    return Array.from(this.matches.values())
      .filter(m => m.whitePlayer.id === userId || m.blackPlayer.id === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const gameManager = new GameManager();
