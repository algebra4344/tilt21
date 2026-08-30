  // ── Blackjack ────────────────────────────────────────────────────────────
  export enum Move {
    AskInsurance,
    Double,
    Hit,
    NoInsurance,
    Split,
    Stand,
    Surrender,
  }

  export enum GameStep {
    PlayHandsLeft,
    PlayHandsRight,
    Start,
    WaitingForInsuranceInput,
    WaitingForNewGameInput,
    WaitingForPlayInput,
  }

  export enum GameMode {
    Default,
    Pairs,
    Uncommon,
    Deviations,
  }

  export enum BlackjackPayout {
    ThreeToTwo,
    SixToFive,
  }

  export enum PlayerStrategy {
    UserInput,
    BasicStrategy,
    BasicStrategyI18,
    BasicStrategyI18Fab4,
    Dealer,
  }

  export enum HandWinner {
    Player,
    Dealer,
    Push,
  }

  export type TableRules = {
    allowDoubleAfterSplit: boolean;
    allowLateSurrender: boolean;
    allowResplitAces: boolean;
    blackjackPayout: BlackjackPayout;
    deckCount: number;
    hitSoft17: boolean;
    maxHandsAllowed: number;
    maximumBet: number;
    minimumBet: number;
    playerCount: number;
    penetration: number;
  };

  export type GameSettings = {
    autoDeclineInsurance: boolean;
    disableEvents: boolean;
    checkDeviations: boolean;
    mode: GameMode;
    debug: boolean;
    playerBankroll: number;
    playerTablePosition: number;
    playerStrategyOverride: Record<number, number>;
  } & TableRules;

  export type CardAttributes = {
    id: string;
    suit: string;
    rank: string;
    showingFace: boolean;
  };

  export class Card {
    id: string;
    suit: number;
    rank: number;
    value: number;
    showingFace: boolean;
    flip(): void;
    attributes(): CardAttributes;
  }

  export class Hand {
    id: string;
    betAmount: number;
    cards: Card[];
    cardTotal: number;
    cardHighTotal: number;
    cardLowTotal: number;
    blackjack: boolean;
    busted: boolean;
    allowSplit: boolean;
    allowSurrender: boolean;
    allowDouble: boolean;
    firstMove: boolean;
    finished: boolean;
    hasPairs: boolean;
    hasAces: boolean;
    fromSplit: boolean;
    fromAceSplit: boolean;
    acesCount: number;
    splitCount: number;
    serialize(opts?: { showHidden?: boolean }): string;
    attributes(): HandAttributes;
  }

  export type HandAttributes = {
    id: string;
    cards: CardAttributes[];
    hasPairs: boolean;
    cardTotal: number;
    blackjack: boolean;
    firstMove: boolean;
  };

  export class Player {
    id: string;
    balance: number;
    hands: Hand[];
    handsCount: number;
    handWinner: Map<string, HandWinner>;
    strategy: number;
    addHand(betAmount?: number, cards?: Card[]): Hand;
    getHand(index: number): Hand;
    eachHand(callback: (hand: Hand, index: number) => void): void;
    takeCard(card: Card, opts?: { hand?: Hand; prepend?: boolean }): void;
    removeCards(): void;
    attributes(): PlayerAttributes;
    getNPCInput(game: Game, hand: Hand): Move;
    get isUser(): boolean;
    get isNPC(): boolean;
    get firstHand(): Hand;
    get cardTotal(): number;
  }

  export type PlayerAttributes = {
    id: string;
    balance: number;
    hands: HandAttributes[];
    handWinner: Record<string, string>;
  };

  export class Dealer extends Player {
    cards: Card[];
    upcard: Card;
    holeCard: Card;
    isHard: boolean;
  }

  export class Shoe {
    cards: Card[];
    hiLoRunningCount: number;
    hiLoTrueCount: number;
    needsReset: boolean;
    get cardCount(): number;
    get maxCards(): number;
    get penetration(): number;
    get decksRemaining(): number;
    drawCard(opts?: { showingFace?: boolean }): Card;
    resetCards(): void;
    serialize(): string;
  }

  export default class Game {
    constructor(settings?: Partial<GameSettings>);
    state: {
      step: GameStep;
      focusedHandIndex: number;
      focusedPlayerIndex: number;
      playCorrection: string;
      sessionMovesTotal: number;
      sessionMovesCorrect: number;
    };
    players: Player[];
    player: Player;
    dealer: Dealer;
    shoe: Shoe;
    betAmount: number;
    gameId: string;
    focusedHand: Hand;
    focusedPlayer: Player;
    settings: GameSettings;
    step(input?: Move): GameStep;
    updateSettings(settings: Partial<GameSettings>): GameSettings;
  }
  export { Game };

  export const gameSettings: GameSettings;

  // ── Poker ────────────────────────────────────────────────────────────────
  export type PokerAction = 'fold' | 'call' | 'raise';
  export type PokerSuit = 'h' | 'd' | 'c' | 's';
  export type Street = 'preflop' | 'flop' | 'turn' | 'river';
  export type PokerContext = 'open' | 'vs-raise' | 'vs-3bet';
  export type PokerPhase =
    | 'idle'
    | 'dealing'
    | 'betting'
    | 'human'
    | 'showdown'
    | 'summary';
  export type BotDifficulty = 'beginner' | 'intermediate';
  export type Position =
    | 'BTN'
    | 'SB'
    | 'BB'
    | 'UTG'
    | 'UTG+1'
    | 'UTG+2'
    | 'MP'
    | 'HJ'
    | 'CO';

  export interface PokerCard {
    id: string;
    suit: PokerSuit;
    rank: string;
    showingFace: boolean;
  }

  export interface SeatState {
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
  }

  export interface TableState {
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
  }

  export interface BotTurn {
    seatIndex: number;
    action: PokerAction;
    amount: number;
  }

  export interface EvalResult {
    score: number;
    cat: number;
    tie: number[];
  }

  export interface EquityInfo {
    seatIndex: number;
    pct: number;
  }

  export interface HandInfo {
    street: Street;
    position: Position;
    hand: string;
    context: string;
    toCall: number;
    raiseAmount: number;
    minRaise: number;
    equity: number | null;
    bigBlind: number;
    pot: number;
    heroStack: number;
    currentBet: number;
  }

  export interface SessionStats {
    handsTotal: number;
    handsCorrect: number;
    handsWon: number;
    currentStreak: number;
    bestStreak: number;
    netProfit: number;
  }

  export interface PokerSettings {
    playerCount: 6 | 9;
    bigBlind: number;
    smallBlind: number;
    stackSize: number;
    handsPerSession: number;
    botSpeedMs: number;
    botDifficulty: 'beginner' | 'intermediate';
    showOpponentCards: boolean;
    showOpponentEquity: boolean;
  }

  export interface HandResult {
    winnerIndex: number;
    amount: number;
    viaShowdown: boolean;
    handName: string | null;
    humanWon: boolean;
  }

  export interface SeatDescriptor {
    name: string;
    playerId?: string | null;
    stack: number;
  }

  export const POSITIONS_6: Position[];
  export const POSITIONS_9: Position[];
  export const CATEGORY_NAMES: string[];
  export const STREET_ORDER: Street[];
  export const formatMoney: (amount: number) => string;

  export function getPositions(count: number): Position[];
  export function roleOf(seatIndex: number, dealerIndex: number, playerCount: number): Position;
  export function createDeck(): PokerCard[];
  export function handString(cards: PokerCard[]): string;
  export function classifyContext(currentBet: number, bigBlind: number): PokerContext;
  export function getRaiseSize(
    bigBlind: number,
    currentBet: number,
    context: string,
    street: Street,
    pot: number,
  ): number;
  export function firstToAct(street: Street, dealerIndex: number, playerCount: number): number;
  export function buildTableFromSeats(
    dealerIndex: number,
    seats: SeatDescriptor[],
    smallBlind: number,
    bigBlind: number,
    deck: PokerCard[],
  ): TableState;
  export function buildInitialTable(
    dealerIndex: number,
    humanSeatIndex: number,
    smallBlind: number,
    bigBlind: number,
    stackSize: number,
    deck: PokerCard[],
    playerCount: number,
    previousStacks?: number[],
  ): TableState;
  export function nextToAct(state: TableState): number;
  export function applyAction(
    state: TableState,
    seatIndex: number,
    action: PokerAction,
    amount: number,
  ): TableState;
  export function getCallAmount(state: TableState, seatIndex: number): number;
  export function getRaiseCommitted(
    state: TableState,
    seatIndex: number,
    target: number,
  ): number;
  export function advanceStreet(
    state: TableState,
    deck: PokerCard[],
  ): { state: TableState; dealt: PokerCard[] };
  export function botDecision(
    position: Position,
    hand: string,
    context: string,
    currentBet: number,
    bigBlind: number,
    seatBet: number,
    difficulty?: 'beginner' | 'intermediate',
  ): { action: PokerAction; amount: number };
  export function postFlopBotDecision(state: TableState, seatIndex: number): BotTurn;
  export function evaluateHand(cards: PokerCard[]): EvalResult;
  export function calculateEquity(
    activeSeats: { seatIndex: number; holeCards: PokerCard[] }[],
    board: PokerCard[],
    remainingDeck: PokerCard[],
  ): EquityInfo[];
  export function hasFlushDraw(cards: PokerCard[]): boolean;
  export function hasStraightDraw(cards: PokerCard[]): boolean;
  export function awardPots(state: TableState): { awards: Map<number, number> };
  export function awardByRanking(
    state: TableState,
    places: number[][],
  ): { awards: Map<number, number> };
