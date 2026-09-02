import { PlayingCard, HandEvaluation } from '../types/teenPatti.js';

export const SUITS: { suit: 'spades' | 'hearts' | 'clubs' | 'diamonds'; symbol: string; color: 'red' | 'black' }[] = [
  { suit: 'spades', symbol: '♠', color: 'black' },
  { suit: 'hearts', symbol: '♥', color: 'red' },
  { suit: 'clubs', symbol: '♣', color: 'black' },
  { suit: 'diamonds', symbol: '♦', color: 'red' },
];

export const RANKS: { rank: string; value: number }[] = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
  { rank: 'A', value: 14 },
];

export function generateDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  SUITS.forEach((s) => {
    RANKS.forEach((r) => {
      deck.push({
        rank: r.rank,
        suit: s.suit,
        symbol: s.symbol,
        value: r.value,
        color: s.color,
      });
    });
  });
  return deck;
}

export function shuffleDeck(deck: PlayingCard[]): PlayingCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealTeenPattiCards(): { cardsA: PlayingCard[]; cardsB: PlayingCard[] } {
  const deck = shuffleDeck(generateDeck());
  const cardsA = [deck[0], deck[2], deck[4]];
  const cardsB = [deck[1], deck[3], deck[5]];
  return { cardsA, cardsB };
}

/**
 * Evaluate 3-Card Teen Patti Hand according to international hierarchy:
 * 1. TRIO / TRAIL (3 of a kind)
 * 2. PURE SEQUENCE (Straight Flush) - AKQ > A23 > KQJ ... > 432
 * 3. SEQUENCE (Straight) - AKQ > A23 > KQJ ... > 432
 * 4. COLOR (Flush)
 * 5. PAIR
 * 6. HIGH CARD
 */
export function evaluateTeenPattiHand(cards: PlayingCard[]): HandEvaluation {
  if (cards.length < 3) {
    return {
      type: 'HIGH_CARD',
      title: 'High Card',
      score: 0,
      highCards: [0, 0, 0],
    };
  }

  // Sort descending by value (A=14, K=13, ..., 2=2)
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const v0 = sorted[0].value;
  const v1 = sorted[1].value;
  const v2 = sorted[2].value;

  const sameSuit = sorted[0].suit === sorted[1].suit && sorted[1].suit === sorted[2].suit;

  // Check Trio / Trail (e.g. AAA, KKK)
  if (v0 === v1 && v1 === v2) {
    const rankName = sorted[0].rank === 'A' ? 'Aces' : `${sorted[0].rank}s`;
    return {
      type: 'TRIO',
      title: `Trio of ${rankName}`,
      score: 6000000 + v0 * 10000,
      highCards: [v0, v1, v2],
    };
  }

  // Check Sequence / Straight
  // In Teen Patti, AKQ is highest, A23 is 2nd highest, then KQJ, QJ10, ... 432
  let isSequence = false;
  let sequenceScoreWeight = 0;

  if (v0 === 14 && v1 === 13 && v2 === 12) {
    // AKQ
    isSequence = true;
    sequenceScoreWeight = 15;
  } else if (v0 === 14 && v1 === 3 && v2 === 2) {
    // A23 (Ace acts as low card after 2)
    isSequence = true;
    sequenceScoreWeight = 14;
  } else if (v0 - v1 === 1 && v1 - v2 === 1) {
    // Normal straight, e.g. KQJ (13), QJ10 (12), ... 432 (4)
    isSequence = true;
    sequenceScoreWeight = v0;
  }

  // Pure Sequence (Straight Flush)
  if (isSequence && sameSuit) {
    const topCardName = sequenceScoreWeight === 15 ? 'A-K-Q' : sequenceScoreWeight === 14 ? 'A-2-3' : `${sorted[0].rank}-High`;
    return {
      type: 'PURE_SEQUENCE',
      title: `Pure Sequence (${topCardName})`,
      score: 5000000 + sequenceScoreWeight * 10000,
      highCards: [v0, v1, v2],
    };
  }

  // Normal Sequence (Straight)
  if (isSequence) {
    const topCardName = sequenceScoreWeight === 15 ? 'A-K-Q' : sequenceScoreWeight === 14 ? 'A-2-3' : `${sorted[0].rank}-High`;
    return {
      type: 'SEQUENCE',
      title: `Sequence (${topCardName})`,
      score: 4000000 + sequenceScoreWeight * 10000,
      highCards: [v0, v1, v2],
    };
  }

  // Color / Flush
  if (sameSuit) {
    return {
      type: 'COLOR',
      title: `Color / Flush (${sorted[0].rank}-High)`,
      score: 3000000 + v0 * 10000 + v1 * 100 + v2,
      highCards: [v0, v1, v2],
    };
  }

  // Pair
  if (v0 === v1 || v1 === v2 || v0 === v2) {
    let pairVal = 0;
    let kicker = 0;
    if (v0 === v1) {
      pairVal = v0;
      kicker = v2;
    } else if (v1 === v2) {
      pairVal = v1;
      kicker = v0;
    } else {
      pairVal = v0;
      kicker = v1;
    }
    const pairRankName = RANKS.find((r) => r.value === pairVal)?.rank || '';
    const pairTitle = pairRankName === 'A' ? 'Aces' : `${pairRankName}s`;
    return {
      type: 'PAIR',
      title: `Pair of ${pairTitle}`,
      score: 2000000 + pairVal * 10000 + kicker * 100,
      highCards: [pairVal, pairVal, kicker],
    };
  }

  // High Card
  return {
    type: 'HIGH_CARD',
    title: `High Card ${sorted[0].rank}`,
    score: 1000000 + v0 * 10000 + v1 * 100 + v2,
    highCards: [v0, v1, v2],
  };
}

export function compareHands(
  cardsA: PlayingCard[],
  cardsB: PlayingCard[]
): {
  winner: 'A' | 'B' | 'TIE';
  handA: HandEvaluation;
  handB: HandEvaluation;
} {
  const handA = evaluateTeenPattiHand(cardsA);
  const handB = evaluateTeenPattiHand(cardsB);

  if (handA.score > handB.score) {
    return { winner: 'A', handA, handB };
  } else if (handB.score > handA.score) {
    return { winner: 'B', handA, handB };
  } else {
    return { winner: 'TIE', handA, handB };
  }
}

/**
 * Check if player hand qualifies for A-plus or B-plus side bet
 * (Pair, Color, Sequence, Pure Sequence, Trio)
 */
export function hasPlusBonus(hand: HandEvaluation): boolean {
  return ['PAIR', 'COLOR', 'SEQUENCE', 'PURE_SEQUENCE', 'TRIO'].includes(hand.type);
}
