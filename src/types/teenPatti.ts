export interface PlayingCard {
  rank: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  suit: 'spades' | 'hearts' | 'clubs' | 'diamonds';
  symbol: string;
  value: number; // 2 - 14 (A=14)
  color: 'red' | 'black';
}

export type DemoRoundState = 
  | 'BETTING_OPEN'
  | 'BETTING_CLOSED'
  | 'DEALING'
  | 'RESULT'
  | 'SETTLEMENT'
  | 'NEW_ROUND';

export type DemoBetSelection = 
  | 'A_BACK'
  | 'A_LAY'
  | 'A_PLUS'
  | 'B_BACK'
  | 'B_LAY'
  | 'B_PLUS';

export type DemoBetStatus = 'PENDING' | 'WON' | 'LOST' | 'CANCELLED';

export interface DemoBet {
  id: string;
  roundId: string;
  roundNumber: number;
  userId: string;
  selection: DemoBetSelection;
  selectionLabel: string;
  stake: number;
  odds: number;
  status: DemoBetStatus;
  result?: 'WON' | 'LOST' | 'CANCELLED';
  winAmount?: number;
  netReturn?: number;
  createdAt: string;
  settledAt?: string;
}

export interface HandEvaluation {
  type: 'TRIO' | 'PURE_SEQUENCE' | 'SEQUENCE' | 'COLOR' | 'PAIR' | 'HIGH_CARD';
  title: string;
  score: number;
  highCards: number[];
}

export interface DemoRound {
  id: string;
  roundNumber: number;
  state: DemoRoundState;
  countdown: number;
  cardsA: PlayingCard[];
  cardsB: PlayingCard[];
  cardsRevealedA: boolean[];
  cardsRevealedB: boolean[];
  winner: 'A' | 'B' | 'TIE' | null;
  handA?: HandEvaluation;
  handB?: HandEvaluation;
  settled: boolean;
  timestamp: string;
}

export interface RecentResultRecord {
  roundId: string;
  winner: 'A' | 'B' | 'TIE';
  handA?: string;
  handB?: string;
}
