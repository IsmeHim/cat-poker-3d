import { Card, Rank, Suit } from './types';
// @ts-ignore
import pokerSolver from 'pokersolver';

const { Hand } = pokerSolver;

export const SUITS: Suit[] = ['h', 'd', 'c', 's'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function stringToCard(str: string): Card {
  return {
    rank: str[0] as Rank,
    suit: str[1].toLowerCase() as Suit,
  };
}

export interface SolvedHand {
  playerId: string;
  hand: any;
}

export function evaluateHands(
  playersWithCards: { playerId: string; cards: Card[] }[],
  communityCards: Card[]
): { winners: string[]; handName: string; allEvaluations: { playerId: string; handName: string }[] } {
  const communityStrings = communityCards.map(cardToString);

  const solvedHands: SolvedHand[] = playersWithCards.map((p) => {
    const handStrings = [...communityStrings, ...p.cards.map(cardToString)];
    return {
      playerId: p.playerId,
      hand: Hand.solve(handStrings),
    };
  });

  const handsList = solvedHands.map((s) => s.hand);
  const winningHands = Hand.winners(handsList);

  const winnerIds: string[] = [];
  for (const wh of winningHands) {
    const match = solvedHands.find((s) => s.hand === wh);
    if (match) {
      winnerIds.push(match.playerId);
    }
  }

  const allEvaluations = solvedHands.map((s) => ({
    playerId: s.playerId,
    handName: s.hand.descr || 'High Card',
  }));

  const mainWinnerHandName = winningHands[0]?.descr || 'Winning Hand';

  return {
    winners: winnerIds,
    handName: mainWinnerHandName,
    allEvaluations,
  };
}

/**
 * Evaluates a player's current best hand in real time (e.g. Pair of Kings, Flush)
 */
export function evaluatePlayerHand(holeCards: Card[], communityCards: Card[]): string {
  if (!holeCards || holeCards.length < 2) return '';
  const cards = [...holeCards, ...communityCards].map(cardToString);
  if (cards.length < 2) return '';
  try {
    const solved = Hand.solve(cards);
    return solved?.descr || '';
  } catch (err) {
    return '';
  }
}
