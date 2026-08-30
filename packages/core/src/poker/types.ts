export type Position = "BTN" | "SB" | "BB" | "UTG" | "UTG+1" | "UTG+2" | "MP" | "HJ" | "CO";

export type PokerAction = "fold" | "call" | "raise";

export type PokerCard = {
  id: string;
  suit: "h" | "d" | "c" | "s";
  rank: string;
  showingFace: boolean;
};

export type PokerContext = "open" | "vs-raise" | "vs-3bet";

export type Street = "preflop" | "flop" | "turn" | "river";

export type SeatState = {
  seatIndex: number;
  position: Position;
  name: string;
  holeCards: PokerCard[];
  stack: number;
  totalCommitted: number;
  folded: boolean;
  isHuman: boolean;
  isDealer: boolean;
  isActive: boolean;
  playerId?: string | null;
};

export type TableState = {
  seats: SeatState[];
  board: PokerCard[];
  street: Street;
  pot: number;
  currentBet: number;
  minRaise: number;
  streetBets: number[];
  acted: boolean[];
  dealerIndex: number;
  activePlayerIndex: number;
  bigBlind: number;
  smallBlind: number;
  handComplete: boolean;
  winnerIndex: number | null;
};

export type BotTurn = {
  seatIndex: number;
  action: PokerAction;
  amount: number;
};

export type EquityInfo = {
  seatIndex: number;
  pct: number;
};

export type HandInfo = {
  street: Street;
  position: Position;
  hand: string;
  context: PokerContext;
  toCall: number;
  raiseAmount: number;
  minRaise: number;
  equity: number | null;
  bigBlind: number;
  pot: number;
  heroStack: number;
  currentBet: number;
};

export type SessionStats = {
  handsTotal: number;
  handsCorrect: number;
  handsWon: number;
  currentStreak: number;
  bestStreak: number;
  netProfit: number;
};

export const formatMoney = (amount: number) => `$${amount}`;

export type PokerPhase = "idle" | "dealing" | "betting" | "human" | "showdown" | "summary";

export type BotDifficulty = "beginner" | "intermediate";

export type PokerSettings = {
  playerCount: 6 | 9;
  bigBlind: number;
  smallBlind: number;
  stackSize: number;
  handsPerSession: number;
  botSpeedMs: number;
  botDifficulty: BotDifficulty;
  showOpponentCards: boolean;
  showOpponentEquity: boolean;
};

export type HandResult = {
  winnerIndex: number;
  amount: number;
  viaShowdown: boolean;
  handName: string | null;
  humanWon: boolean;
};
