import type {
  BotTurn,
  EquityInfo,
  PokerAction,
  PokerCard,
  PokerContext,
  Position,
  SeatState,
  Street,
  TableState,
} from "./types";
import { OPEN_RANGES, VS_3BET_RANGES, VS_RAISE_RANGES } from "./preflop-charts";

export const POSITIONS_6: Position[] = ["BTN", "SB", "BB", "UTG", "MP", "CO"];
export const POSITIONS_9: Position[] = ["BTN", "SB", "BB", "UTG", "UTG+1", "UTG+2", "MP", "HJ", "CO"];

export function getPositions(count: number): Position[] {
  return count === 9 ? POSITIONS_9 : POSITIONS_6;
}

const PLAYER_NAMES = ["Alex", "Jordan", "Sam", "You", "Casey", "Morgan", "Taylor", "Riley", "Quinn"];

const RANK_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const RANKS = RANK_ORDER;
const SUITS = ["h", "d", "c", "s"] as const;
const SUIT_IDX: Record<string, number> = { h: 0, d: 1, c: 2, s: 3 };

export const CATEGORY_NAMES = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
  "Royal flush",
];

export const STREET_ORDER: Street[] = ["preflop", "flop", "turn", "river"];

export function roleOf(seatIndex: number, dealerIndex: number, playerCount: number): Position {
  const positions = getPositions(playerCount);
  return positions[(seatIndex - dealerIndex + playerCount) % playerCount];
}

export function createDeck(): PokerCard[] {
  const cards: PokerCard[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      cards.push({ id: `${rank}${suit}`, suit, rank, showingFace: false });
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function handString(cards: PokerCard[]): string {
  const [a, b] = cards
    .map((c) => c.rank)
    .sort((x, y) => RANK_ORDER.indexOf(x) - RANK_ORDER.indexOf(y));
  if (a === b) return a + a;
  return b + a + (cards[0].suit === cards[1].suit ? "s" : "o");
}

export function classifyContext(currentBet: number, bigBlind: number): PokerContext {
  if (currentBet <= bigBlind) return "open";
  if (currentBet <= bigBlind * 3) return "vs-raise";
  return "vs-3bet";
}

const roundToBb = (n: number, bigBlind: number) =>
  Math.max(bigBlind, Math.round(n / bigBlind) * bigBlind);

export function getRaiseSize(
  bigBlind: number,
  currentBet: number,
  context: PokerContext,
  street: Street,
  pot: number,
): number {
  if (street === "preflop") {
    if (context === "open") return bigBlind * 3;
    if (context === "vs-raise") return roundToBb(Math.max(bigBlind * 3, currentBet * 3), bigBlind);
    return roundToBb(currentBet * 2.2, bigBlind);
  }
  if (currentBet <= 0) return roundToBb(Math.max(pot * 0.6, bigBlind * 2), bigBlind);
  return roundToBb(Math.max(currentBet * 2.5, bigBlind * 2), bigBlind);
}

export function firstToAct(street: Street, dealerIndex: number, playerCount: number): number {
  return street === "preflop" ? (dealerIndex + 3) % playerCount : (dealerIndex + 1) % playerCount;
}

export type SeatDescriptor = {
  name: string;
  playerId?: string | null;
  stack: number;
};

// Deals hole cards and posts blinds for arbitrary named seats. Seats with
// stack <= 0 are dealt out of the hand (folded, no chips committed).
export function buildTableFromSeats(
  dealerIndex: number,
  seatDescriptors: SeatDescriptor[],
  smallBlind: number,
  bigBlind: number,
  deck: PokerCard[],
): TableState {
  const playerCount = seatDescriptors.length;
  const streetBets = new Array(playerCount).fill(0) as number[];
  const seats: SeatState[] = seatDescriptors.map((descriptor, i) => {
    const hasChips = descriptor.stack > 0;
    const rawStack = Math.max(0, descriptor.stack);
    const cards = [deck.pop()!, deck.pop()!];
    const position = roleOf(i, dealerIndex, playerCount);
    const blind = position === "SB" ? smallBlind : position === "BB" ? bigBlind : 0;
    const actualBlind = Math.min(blind, rawStack);
    const stack = rawStack - actualBlind;
    streetBets[i] = hasChips ? actualBlind : 0;
    return {
      seatIndex: i,
      position,
      name: descriptor.name,
      playerId: descriptor.playerId ?? null,
      holeCards: cards,
      stack,
      totalCommitted: hasChips ? actualBlind : 0,
      folded: !hasChips,
      isHuman: false,
      isDealer: position === "BTN",
      isActive: false,
    };
  });
  const activeCount = seats.filter((s) => !s.folded).length;
  const pot = seats.reduce((sum, s) => s.totalCommitted + sum, 0);
  return {
    seats,
    board: [],
    street: "preflop",
    pot,
    currentBet: bigBlind,
    minRaise: bigBlind * 2,
    streetBets,
    acted: new Array(playerCount).fill(false),
    dealerIndex,
    activePlayerIndex: firstToAct("preflop", dealerIndex, playerCount) - 1,
    bigBlind,
    smallBlind,
    handComplete: activeCount <= 1,
    winnerIndex: activeCount <= 1 ? seats.find((s) => !s.folded)?.seatIndex ?? null : null,
  };
}

export function buildInitialTable(
  dealerIndex: number,
  humanSeatIndex: number,
  smallBlind: number,
  bigBlind: number,
  stackSize: number,
  deck: PokerCard[],
  playerCount: number,
  previousStacks?: number[],
): TableState {
  const defaultStack = stackSize * bigBlind;
  const descriptors: SeatDescriptor[] = Array.from({ length: playerCount }, (_, i) => {
    const prevStack = previousStacks?.[i];
    const hasChips = prevStack === undefined || prevStack > 0;
    return {
      name: i === humanSeatIndex ? "You" : PLAYER_NAMES[i],
      playerId: null,
      stack: hasChips ? (prevStack ?? defaultStack) : 0,
    };
  });
  const table = buildTableFromSeats(dealerIndex, descriptors, smallBlind, bigBlind, deck);
  const seats = table.seats.map((s) => ({
    ...s,
    isHuman: s.seatIndex === humanSeatIndex,
  }));
  if (seats[humanSeatIndex]) {
    seats[humanSeatIndex].holeCards.forEach((c) => (c.showingFace = true));
  }
  return { ...table, seats };
}

export function nextToAct(state: TableState): number {
  const n = state.seats.length;
  for (let offset = 1; offset <= n; offset++) {
    const idx = (state.activePlayerIndex + offset) % n;
    const seat = state.seats[idx];
    if (seat.folded || seat.stack <= 0) continue;
    if (!state.acted[idx] || state.streetBets[idx] < state.currentBet) return idx;
  }
  return -1;
}

export function applyAction(
  state: TableState,
  seatIndex: number,
  action: PokerAction,
  amount: number,
): TableState {
  const seats = state.seats.map((s) => ({ ...s, isActive: s.seatIndex === seatIndex }));
  const seat = seats[seatIndex];
  const streetBets = [...state.streetBets];
  const acted = [...state.acted];
  acted[seatIndex] = true;
  const prevCurrentBet = state.currentBet;
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;
  if (action === "fold") {
    seat.folded = true;
  } else {
    const committed = Math.min(Math.max(0, amount), seat.stack);
    streetBets[seatIndex] += committed;
    seat.totalCommitted += committed;
    seat.stack -= committed;
    const target = streetBets[seatIndex];
    // Only a full legal raise (target >= min raise) moves currentBet and reopens betting.
    // A short all-in raise (less than a full raise) does not reopen action to prior actors.
    if (committed > 0 && target > currentBet && target >= minRaise) {
      const increment = target - prevCurrentBet;
      currentBet = target;
      minRaise = target + increment;
    }
  }
  const remaining = seats.filter((s) => !s.folded);
  const handComplete = remaining.length === 1;
  const winnerIndex = handComplete ? remaining[0].seatIndex : null;
  return {
    ...state,
    seats,
    streetBets,
    acted,
    currentBet,
    minRaise,
    activePlayerIndex: seatIndex,
    pot: seats.reduce((sum, s) => s.totalCommitted + sum, 0),
    handComplete,
    winnerIndex,
  };
}

export function getCallAmount(state: TableState, seatIndex: number): number {
  return Math.max(0, state.currentBet - state.streetBets[seatIndex]);
}

// Returns the chips to commit so that the seat's street bet lands on `target`,
// clamped between the legal minimum and the seat's remaining stack (all-in).
export function getRaiseCommitted(state: TableState, seatIndex: number, target: number): number {
  const seat = state.seats[seatIndex];
  const minTarget = state.minRaise > 0 ? state.minRaise : state.bigBlind;
  const clamped = Math.min(Math.max(target, minTarget), state.streetBets[seatIndex] + seat.stack);
  return Math.max(0, clamped - state.streetBets[seatIndex]);
}

// Closes the current street and deals the next one. Mutates `deck` by popping
// cards (one burn + 3 for flop, one burn + 1 for turn/river) exactly like the
// trainer loop did, and returns the newly dealt board cards so callers can
// animate their reveal.
export function advanceStreet(
  state: TableState,
  deck: PokerCard[],
): { state: TableState; dealt: PokerCard[] } {
  if (state.street === "river") {
    return { state, dealt: [] };
  }
  const nextStreet: Street =
    state.street === "preflop" ? "flop" : state.street === "flop" ? "turn" : "river";
  deck.pop(); // burn
  const count = nextStreet === "flop" ? 3 : 1;
  const dealt: PokerCard[] = [];
  for (let i = 0; i < count; i++) {
    const card = deck.pop();
    if (!card) break;
    card.showingFace = true;
    dealt.push(card);
  }
  const n = state.seats.length;
  const next: TableState = {
    ...state,
    street: nextStreet,
    board: [...state.board, ...dealt],
    streetBets: new Array(n).fill(0),
    acted: new Array(n).fill(false),
    currentBet: 0,
    minRaise: 0,
    activePlayerIndex: firstToAct(nextStreet, state.dealerIndex, n) - 1,
  };
  return { state: next, dealt };
}

export function botDecision(
  position: Position,
  hand: string,
  context: PokerContext,
  currentBet: number,
  bigBlind: number,
  seatBet: number,
  difficulty: "beginner" | "intermediate" = "intermediate",
): { action: PokerAction; amount: number } {
  const isBeginner = difficulty === "beginner";
  if (context === "open") {
    // Can check for free if already matched (BB option, or limped to us)
    const canCheck = seatBet >= currentBet;
    const action = OPEN_RANGES[position][hand] ?? (canCheck ? "call" : "fold");
    // Beginner: sometimes raise with junk, sometimes limp
    if (isBeginner && Math.random() < 0.30) {
      if (Math.random() < 0.5) return { action: "raise", amount: Math.max(1, bigBlind * 3 - seatBet) };
      return { action: "call", amount: Math.max(0, bigBlind - seatBet) };
    }
    if (action === "raise") return { action: "raise", amount: Math.max(1, bigBlind * 3 - seatBet) };
    // Chart says call (or we can check for free): check/limp
    if (action === "call" || canCheck) return { action: "call", amount: Math.max(0, bigBlind - seatBet) };
    // Intermediate: sometimes limp with marginal hands
    if (!isBeginner && Math.random() < 0.08) {
      return { action: "call", amount: Math.max(0, bigBlind - seatBet) };
    }
    return { action: "fold", amount: 0 };
  }
  if (context === "vs-raise") {
    const action = VS_RAISE_RANGES[position][hand] ?? "fold";
    // Beginner: much looser calling
    if (isBeginner && Math.random() < 0.30) {
      if (Math.random() < 0.3) return { action: "raise", amount: roundToBb(Math.max(bigBlind * 3, currentBet * 3), bigBlind) - seatBet };
      return { action: "call", amount: Math.max(0, currentBet - seatBet) };
    }
    if (action === "raise")
      return {
        action: "raise",
        amount: roundToBb(Math.max(bigBlind * 3, currentBet * 3), bigBlind) - seatBet,
      };
    if (action === "call") return { action: "call", amount: Math.max(0, currentBet - seatBet) };
    // Intermediate: sometimes call with marginal hands
    if (!isBeginner && Math.random() < 0.12) {
      return { action: "call", amount: Math.max(0, currentBet - seatBet) };
    }
    return { action: "fold", amount: 0 };
  }
  const action = VS_3BET_RANGES[hand] ?? "fold";
  if (action === "raise")
    return { action: "raise", amount: roundToBb(currentBet * 2.2, bigBlind) - seatBet };
  if (action === "call") return { action: "call", amount: Math.max(0, currentBet - seatBet) };
  return { action: "fold", amount: 0 };
}

export type EvalResult = { score: number; cat: number; tie: number[] };

const MULTIPLIERS = [28561, 2197, 169, 13, 1];

function makeResult(cat: number, tie: number[]): EvalResult {
  let score = cat * 371293;
  for (let i = 0; i < 5; i++) score += (tie[i] ?? 0) * MULTIPLIERS[i];
  return { score, cat, tie };
}

function evaluate5(cards: PokerCard[]): EvalResult {
  const ranks = cards.map((c) => RANK_ORDER.indexOf(c.rank)).sort((a, b) => a - b);
  const suits = cards.map((c) => SUIT_IDX[c.suit]);
  const counts = new Array(13).fill(0);
  for (const r of ranks) counts[r]++;
  const flush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let straightTop = -1;
  if (uniq.length === 5) {
    if (uniq[4] - uniq[0] === 4) straightTop = uniq[4];
    else if (uniq[4] === 12 && uniq[3] === 3) straightTop = 3;
  }
  const quads = counts.findIndex((c) => c === 4);
  const trips: number[] = [];
  const pairs: number[] = [];
  for (let r = 12; r >= 0; r--) {
    if (counts[r] === 3) trips.push(r);
    else if (counts[r] === 2) pairs.push(r);
  }
  const high = [...ranks].reverse();
  if (flush && straightTop >= 0) return makeResult(straightTop === 12 ? 9 : 8, [straightTop]);
  if (quads >= 0) return makeResult(7, [quads, high.find((r) => r !== quads)!]);
  if (trips.length > 0 && pairs.length > 0) return makeResult(6, [trips[0], pairs[0]]);
  if (flush) return makeResult(5, high);
  if (straightTop >= 0) return makeResult(4, [straightTop]);
  if (trips.length > 0) {
    const kickers = high.filter((r) => r !== trips[0]).slice(0, 2);
    return makeResult(3, [trips[0], ...kickers]);
  }
  if (pairs.length >= 2) {
    const k = high.find((r) => r !== pairs[0] && r !== pairs[1]);
    return makeResult(2, [pairs[0], pairs[1], k!]);
  }
  if (pairs.length === 1) {
    const kickers = high.filter((r) => r !== pairs[0]).slice(0, 3);
    return makeResult(1, [pairs[0], ...kickers]);
  }
  return makeResult(0, high);
}

export function evaluateHand(cards: PokerCard[]): EvalResult {
  let best: EvalResult | null = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const res = evaluate5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || res.score > best.score) best = res;
          }
  return best!;
}

export function calculateEquity(
  activeSeats: { seatIndex: number; holeCards: PokerCard[] }[],
  board: PokerCard[],
  remainingDeck: PokerCard[],
): EquityInfo[] {
  const players = activeSeats.length;
  if (players === 0) return [];
  if (players === 1) return [{ seatIndex: activeSeats[0].seatIndex, pct: 100 }];
  const need = 5 - board.length;
  const deck = remainingDeck;
  const wins = new Array(players).fill(0);
  const ties = new Array(players).fill(0);
  let iterations = 0;

  const evalBoard = (fullBoard: PokerCard[]) => {
    const scores = activeSeats.map((s) => evaluateHand([...s.holeCards, ...fullBoard]).score);
    const max = Math.max(...scores);
    const winnerCount = scores.filter((s) => s === max).length;
    for (let i = 0; i < players; i++) {
      if (scores[i] === max) {
        if (winnerCount === 1) wins[i]++;
        else ties[i]++;
      }
    }
    iterations++;
  };

  if (need <= 2) {
    const n = deck.length;
    if (need === 0) evalBoard(board);
    else if (need === 1) for (let i = 0; i < n; i++) evalBoard([...board, deck[i]]);
    else
      for (let i = 0; i < n - 1; i++)
        for (let j = i + 1; j < n; j++) evalBoard([...board, deck[i], deck[j]]);
  } else {
    const iterationsCount = players <= 2 ? 3000 : 1000;
    for (let it = 0; it < iterationsCount; it++) {
      const shuffled = shuffle([...deck]);
      evalBoard([...board, ...shuffled.slice(0, need)]);
    }
  }

  return activeSeats.map((seat, i) => ({
    seatIndex: seat.seatIndex,
    pct: iterations > 0 ? ((wins[i] + ties[i] * 0.5) / iterations) * 100 : 0,
  }));
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function hasFlushDraw(cards: PokerCard[]): boolean {
  const counts = new Array(4).fill(0);
  for (const c of cards) counts[SUIT_IDX[c.suit]]++;
  return counts.some((c) => c === 4);
}

export function hasStraightDraw(cards: PokerCard[]): boolean {
  const uniq = [...new Set(cards.map((c) => RANK_ORDER.indexOf(c.rank)))].sort((a, b) => a - b);
  for (let i = 0; i <= uniq.length - 4; i++) {
    if (uniq[i + 3] - uniq[i] === 3) return true;
  }
  return (
    uniq.includes(12) && uniq.includes(0) && uniq.includes(1) && uniq.includes(2)
  );
}

const check = (seatIndex: number): BotTurn => ({ seatIndex, action: "call", amount: 0 });

const betTo = (state: TableState, seatIndex: number, target: number): BotTurn => ({
  seatIndex,
  action: "raise",
  amount: Math.max(0, target - state.streetBets[seatIndex]),
});

export function postFlopBotDecision(state: TableState, seatIndex: number): BotTurn {
  const seat = state.seats[seatIndex];
  const cards = [...seat.holeCards, ...state.board];
  const res = evaluateHand(cards);
  const cat = res.cat;
  const toCall = state.currentBet - state.streetBets[seatIndex];
  const pot = state.pot;
  const bb = state.bigBlind;
  const r = Math.random();

  if (toCall <= 0) {
    if (cat >= 4) return betTo(state, seatIndex, roundToBb(Math.max(pot * 0.7, bb), bb));
    if (cat === 3) return betTo(state, seatIndex, roundToBb(Math.max(pot * 0.6, bb), bb));
    if (cat === 2)
      return r < 0.75 ? betTo(state, seatIndex, roundToBb(Math.max(pot * 0.5, bb), bb)) : check(seatIndex);
    if (cat === 1) {
      const pairRank = res.tie[0];
      const boardTop = state.board.length > 0 ? Math.max(...state.board.map((c) => RANK_ORDER.indexOf(c.rank))) : -1;
      if (pairRank >= boardTop)
        return r < 0.55
          ? betTo(state, seatIndex, roundToBb(Math.max(pot * 0.45, bb), bb))
          : check(seatIndex);
      return r < 0.25 ? betTo(state, seatIndex, roundToBb(Math.max(pot * 0.4, bb), bb)) : check(seatIndex);
    }
    const draw = hasFlushDraw(cards) || hasStraightDraw(cards);
    if (draw) return r < 0.45 ? betTo(state, seatIndex, roundToBb(Math.max(pot * 0.45, bb), bb)) : check(seatIndex);
    return r < 0.2 ? betTo(state, seatIndex, roundToBb(Math.max(pot * 0.35, bb), bb)) : check(seatIndex);
  }

  const raiseAmount = Math.max(
    0,
    roundToBb(Math.max(state.currentBet * 2.5, bb), bb) - state.streetBets[seatIndex],
  );
  if (cat >= 3) return r < 0.5 ? { seatIndex, action: "raise", amount: raiseAmount } : callAction(state, seatIndex);
  if (cat === 2) return r < 0.25 ? { seatIndex, action: "raise", amount: raiseAmount } : callAction(state, seatIndex);
  if (cat === 1) {
    const pairRank = res.tie[0];
    const boardTop = state.board.length > 0 ? Math.max(...state.board.map((c) => RANK_ORDER.indexOf(c.rank))) : -1;
    if (pairRank >= boardTop) return r < 0.3 ? foldAction(seatIndex) : callAction(state, seatIndex);
    return r < 0.6 ? foldAction(seatIndex) : callAction(state, seatIndex);
  }
  const draw = hasFlushDraw(cards) || hasStraightDraw(cards);
  if (draw) return r < 0.45 ? foldAction(seatIndex) : callAction(state, seatIndex);
  return r < 0.9 ? foldAction(seatIndex) : callAction(state, seatIndex);
}

const callAction = (state: TableState, seatIndex: number): BotTurn => ({
  seatIndex,
  action: "call",
  amount: Math.max(0, state.currentBet - state.streetBets[seatIndex]),
});

const foldAction = (seatIndex: number): BotTurn => ({ seatIndex, action: "fold", amount: 0 });

export function awardPots(state: TableState): { awards: Map<number, number> } {
  return {
    awards: awardSlices(state, (contenders) => {
      const scores = contenders.map((s) => evaluateHand([...s.holeCards, ...state.board]).score);
      const best = Math.max(...scores);
      return contenders.filter((_, i) => scores[i] === best);
    }),
  };
}

// Home-game variant: identical commit-level slicing (so side pots stay correct
// when someone is all-in for less), but the winner at each level comes from the
// host's declared placements instead of a hand evaluation — at a physical table
// the showdown speaks for itself.
//
// `places` is ordered finish positions: places[0] = champion(s) (one seat, or
// several for a chopped pot), places[1] = runner-up(s), etc. Each commit level
// is won by the earliest placement group that has a contender at that level,
// split evenly within the group (odd chips to the earlier-tapped seat).
export function awardByRanking(
  state: TableState,
  places: number[][],
): { awards: Map<number, number> } {
  const placeOf = new Map<number, number>();
  places.forEach((group, placeIndex) => {
    for (const seatIndex of group) {
      if (!placeOf.has(seatIndex)) placeOf.set(seatIndex, placeIndex);
    }
  });

  return {
    awards: awardSlices(state, (contenders) => {
      let bestPlace = Infinity;
      for (const contender of contenders) {
        const p = placeOf.get(contender.seatIndex);
        if (p !== undefined && p < bestPlace) bestPlace = p;
      }
      if (bestPlace === Infinity) return contenders; // nobody placed: split evenly

      const group = new Set(places[bestPlace]);
      const winners = contenders.filter((s) => group.has(s.seatIndex));
      // Stable order so odd chips land on the earlier-tapped seat.
      winners.sort(
        (a, b) =>
          places[bestPlace].indexOf(a.seatIndex) - places[bestPlace].indexOf(b.seatIndex),
      );
      return winners;
    }),
  };
}

// Shared pot math: slices the pot into commit levels, refunds uncalled bets,
// and lets the caller decide who wins each level's slice.
function awardSlices(
  state: TableState,
  pickWinners: (contenders: SeatState[]) => SeatState[],
): Map<number, number> {
  const awards = new Map<number, number>();
  const all = state.seats;
  const levels = [...new Set(all.map((s) => s.totalCommitted))].sort((a, b) => a - b);
  let prev = 0;
  for (const level of levels) {
    if (level <= prev) continue;
    const contributed = all.filter((s) => s.totalCommitted >= level);
    const contenders = all.filter((s) => !s.folded && s.totalCommitted >= level);
    const slice = (level - prev) * contributed.length;
    if (contenders.length === 0) {
      const share = Math.floor(slice / contributed.length);
      contributed.forEach((s, i) => {
        const extra = i === 0 ? slice - share * contributed.length : 0;
        awards.set(s.seatIndex, (awards.get(s.seatIndex) ?? 0) + share + extra);
      });
      prev = level;
      continue;
    }
    if (contenders.length === 1) {
      awards.set(contenders[0].seatIndex, (awards.get(contenders[0].seatIndex) ?? 0) + slice);
      prev = level;
      continue;
    }
    const winners = pickWinners(contenders);
    const share = Math.floor(slice / winners.length);
    winners.forEach((w, i) => {
      const extra = i === 0 ? slice - share * winners.length : 0;
      awards.set(w.seatIndex, (awards.get(w.seatIndex) ?? 0) + share + extra);
    });
    prev = level;
  }
  return awards;
}
