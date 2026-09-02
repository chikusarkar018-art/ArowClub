export type GameStatus = 'idle' | 'playing' | 'crashed' | 'cashed_out' | 'won_finish';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'hardcore';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  lanesCount: number;
  crashChancePerStep: number;
  multipliers: number[];
  baseCarSpeed: number;
}

export interface LaneState {
  index: number;
  multiplier: number;
  isPassed: boolean;
  isCrashed: boolean;
  hasBarrier: boolean;
  carDirection: 'down';
  carType: number;
  carSpeed: number;
}

export interface RoundHistoryItem {
  id: string;
  timestamp: number;
  bet: number;
  difficulty: Difficulty;
  multiplier: number;
  profit: number;
  status: 'won' | 'lost';
  stepReached: number;
  totalLanes: number;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    lanesCount: 22,
    crashChancePerStep: 0.04,
    baseCarSpeed: 0.38,
    multipliers: [
      1.03, 1.07, 1.12, 1.17, 1.23, 1.30, 1.38, 1.48, 1.60, 1.74, 1.91,
      2.12, 2.38, 2.70, 3.10, 3.60, 4.25, 5.10, 6.25, 7.80, 10.00, 15.00
    ]
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    lanesCount: 18,
    crashChancePerStep: 0.08,
    baseCarSpeed: 0.48,
    multipliers: [
      1.08, 1.18, 1.31, 1.47, 1.67, 1.92, 2.25, 2.68, 3.25, 4.02,
      5.10, 6.65, 8.90, 12.30, 17.80, 27.50, 45.00, 80.00
    ]
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    lanesCount: 14,
    crashChancePerStep: 0.14,
    baseCarSpeed: 0.58,
    multipliers: [
      1.18, 1.42, 1.75, 2.22, 2.90, 3.90, 5.45, 7.95, 12.20, 19.80,
      34.00, 62.00, 120.00, 250.00
    ]
  },
  hardcore: {
    id: 'hardcore',
    label: 'Hardcore',
    lanesCount: 10,
    crashChancePerStep: 0.22,
    baseCarSpeed: 0.72,
    multipliers: [
      1.35, 1.92, 2.85, 4.45, 7.35, 13.00, 24.50, 52.00, 125.00, 350.00
    ]
  }
};
