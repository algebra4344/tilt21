"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Game,
  GameStep,
  Move,
  GameMode,
  BlackjackPayout,
  HandWinner,
} from "@tilt21/core";
import type { GameSettings } from "@tilt21/core";

export type SoloCard = {
  id: string;
  suit: string;
  rank: string;
  showingFace: boolean;
};

export type SoloHand = {
  cards: SoloCard[];
  cardTotal: number;
  blackjack: boolean;
  busted: boolean;
  allowDouble: boolean;
  allowSplit: boolean;
  allowSurrender: boolean;
  betAmount: number;
};

export type SoloPlayerState = {
  balance: number;
  hands: SoloHand[];
  handWinner: Record<string, string>;
};

export type SoloNpcHand = {
  cards: SoloCard[];
  cardTotal: number;
  betAmount: number;
  position: "left" | "right";
  seatIndex: number;
};

export type SoloGameStep =
  | "idle"
  | "dealing"
  | "insurance"
  | "playing"
  | "dealer"
  | "results"
  | "shuffling";

export type PracticeMode = "default" | "pairs" | "uncommon" | "deviations";

export type SeatPosition = "first_base" | "third_base";

export type PracticeSettings = {
  mode: PracticeMode;
  deckCount: number;
  hitSoft17: boolean;
  allowLateSurrender: boolean;
  allowDoubleAfterSplit: boolean;
  allowResplitAces: boolean;
  penetration: number;
  blackjackPayout: "3:2" | "6:5";
  checkDeviations: boolean;
  unitSize: number;
  betSpreadUnits: Record<number, number>;
  hideSuggestedBet: boolean;
  activeCountVerification: boolean;
  tableSize: number;
  seatPosition: SeatPosition;
  tableMin: number;
  tableMax: number;
  hideDecksRemainingText: boolean;
};

export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  mode: "default",
  deckCount: 2,
  hitSoft17: true,
  allowLateSurrender: false,
  allowDoubleAfterSplit: true,
  allowResplitAces: false,
  penetration: 0.75,
  blackjackPayout: "3:2",
  checkDeviations: false,
  unitSize: 1000,
  betSpreadUnits: { 1: 1, 2: 2, 3: 4, 4: 8, 5: 10 },
  hideSuggestedBet: true,
  activeCountVerification: false,
  tableSize: 1,
  seatPosition: "third_base",
  tableMin: 1000,
  tableMax: 50000,
  hideDecksRemainingText: false,
};

export type CorrectionInfo = {
  message: string;
  isCorrect: boolean;
  timestamp: number;
};

export type SessionStats = {
  handsPlayed: number;
  handsWon: number;
  handsLost: number;
  handsPushed: number;
  movesTotal: number;
  movesCorrect: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  bankroll: number;
  profit: number;
};

/** Cross-session training record, persisted to localStorage. */
export type AllTimeStats = {
  handsTrained: number;
  movesCorrect: number;
  movesTotal: number;
  bestStreak: number;
  lastPlayed: number;
};

const ALLTIME_KEY = "bj-practice-alltime";
const EMPTY_ALLTIME: AllTimeStats = {
  handsTrained: 0,
  movesCorrect: 0,
  movesTotal: 0,
  bestStreak: 0,
  lastPlayed: 0,
};

function loadAllTime(): AllTimeStats {
  if (typeof window === "undefined") return EMPTY_ALLTIME;
  try {
    const raw = window.localStorage.getItem(ALLTIME_KEY);
    if (!raw) return EMPTY_ALLTIME;
    const parsed = JSON.parse(raw) as Partial<AllTimeStats>;
    return { ...EMPTY_ALLTIME, ...parsed };
  } catch {
    return EMPTY_ALLTIME;
  }
}

function persistAllTime(stats: AllTimeStats): void {
  try {
    window.localStorage.setItem(ALLTIME_KEY, JSON.stringify(stats));
  } catch {
    // Storage unavailable (private mode) — all-time just won't survive.
  }
}

type CoreCard = { attributes(): SoloCard };

type CoreHand = {
  cards: CoreCard[];
  cardTotal: number;
  blackjack: boolean;
  busted: boolean;
  allowDouble: boolean;
  allowSplit: boolean;
  allowSurrender: boolean;
  betAmount: number;
};

type CorePlayer = {
  balance: number;
  hands: CoreHand[];
  handWinner: Map<string, HandWinner>;
  eachHand(callback: (hand: CoreHand) => void): void;
};

const GAME_MODE_MAP: Record<PracticeMode, GameMode> = {
  default: GameMode.Default,
  pairs: GameMode.Pairs,
  uncommon: GameMode.Uncommon,
  deviations: GameMode.Deviations,
};

const MOVE_MAP: Record<string, Move> = {
  hit: Move.Hit,
  stand: Move.Stand,
  double: Move.Double,
  split: Move.Split,
  surrender: Move.Surrender,
  insurance: Move.AskInsurance,
  "no-insurance": Move.NoInsurance,
};

const STARTING_BANKROLL = 100000;

function hiLoValue(rank: string): number {
  if (rank === "A" || rank === "K" || rank === "Q" || rank === "J" || rank === "T") {
    return -1;
  }
  const n = Number(rank);
  if (n >= 2 && n <= 6) return 1;
  return 0;
}

function getAllowedActions(game: Game): string[] {
  const hand = game.focusedHand;
  if (!hand) return ["hit", "stand"];
  const actions = ["hit", "stand"];
  if (hand.allowDouble) actions.push("double");
  if (hand.allowSplit) actions.push("split");
  if (hand.allowSurrender) actions.push("surrender");
  return actions;
}

export function useSoloGame(initialSettings?: Partial<PracticeSettings>) {
  const initialSettingsValue: PracticeSettings = {
    ...DEFAULT_PRACTICE_SETTINGS,
    ...initialSettings,
  };
  const [settings, setSettings] = useState<PracticeSettings>(initialSettingsValue);
  const settingsRef = useRef<PracticeSettings>(initialSettingsValue);
  const gameRef = useRef<Game | null>(null);

  const [gameStep, setGameStep] = useState<SoloGameStep>("idle");
  const [dealerCards, setDealerCards] = useState<SoloCard[]>([]);
  const [dealerTotal, setDealerTotal] = useState<number | null>(null);
  const [playerState, setPlayerState] = useState<SoloPlayerState | null>(null);
  const [focusedHandIndex, setFocusedHandIndex] = useState(0);
  const [correction, setCorrection] = useState<CorrectionInfo | null>(null);
  const [runningCount, setRunningCount] = useState(0);
  const [trueCount, setTrueCount] = useState(0);
  const [penetration, setPenetration] = useState(0);
  const [cardsRemaining, setCardsRemaining] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    handsPlayed: 0,
    handsWon: 0,
    handsLost: 0,
    handsPushed: 0,
    movesTotal: 0,
    movesCorrect: 0,
    accuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    bankroll: STARTING_BANKROLL,
    profit: 0,
  });
  const [allowedActions, setAllowedActions] = useState<string[]>([]);
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats>(loadAllTime);
  // Deltas vs the engine's cumulative counters feed the all-time record.
  const prevSessionMovesRef = useRef(0);
  const prevSessionCorrectRef = useRef(0);
  const streakRef = useRef(0);
  const [waitingForInsurance, setWaitingForInsurance] = useState(false);
  const [needsNewGame, setNeedsNewGame] = useState(false);
  const [currentBet, setCurrentBet] = useState(1000);
  const [suggestedBetRevealed, setSuggestedBetRevealed] = useState(false);
  const [decksRemaining, setDecksRemaining] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [cardPops, setCardPops] = useState<Record<string, number>>({});
  const [npcHands, setNpcHands] = useState<SoloNpcHand[]>([]);
  const [countPromptActive, setCountPromptActive] = useState(false);
  const [countPromptFeedback, setCountPromptFeedback] = useState<
    "correct" | "wrong" | null
  >(null);
  const prevCardIdsRef = useRef<Set<string>>(new Set());
  const prevCardShownRef = useRef<Map<string, boolean>>(new Map());
  const popTsRef = useRef<Map<string, number>>(new Map());
  const freshDealRef = useRef(true);

  const syncUIState = useCallback((game: Game) => {
    const dCards = game.dealer.cards.map((c: CoreCard) => c.attributes());
    setDealerCards(dCards);

    const player = game.player as CorePlayer | undefined;
    if (player) {
      const hands = player.hands.map((h: CoreHand) => ({
        cards: h.cards.map((c: CoreCard) => c.attributes()),
        cardTotal: h.cardTotal,
        blackjack: h.blackjack,
        busted: h.busted,
        allowDouble: h.allowDouble,
        allowSplit: h.allowSplit,
        allowSurrender: h.allowSurrender,
        betAmount: h.betAmount,
      }));
      const handWinner: Record<string, string> = {};
      player.handWinner.forEach((winner, handId) => {
        handWinner[handId] = String(winner);
      });
      setPlayerState({ balance: player.balance, hands, handWinner });
    }

    setRunningCount(game.shoe.hiLoRunningCount);
    setTrueCount(game.shoe.hiLoTrueCount);
    setPenetration(game.shoe.penetration);
    setCardsRemaining(game.shoe.cardCount);
    setDecksRemaining(game.shoe.decksRemaining);
    setTotalCards(game.shoe.maxCards);
    setFocusedHandIndex(game.state.focusedHandIndex);

    // Sync NPC hands from all players except the human.
    const npcData: SoloNpcHand[] = [];
    let rightIdx = 0;
    for (const npc of (game as unknown as { playersRight?: CorePlayer[] }).playersRight ?? []) {
      npc.eachHand((hand: CoreHand) => {
        npcData.push({
          cards: hand.cards.map((c: CoreCard) => c.attributes()),
          cardTotal: hand.cardTotal,
          betAmount: hand.betAmount,
          position: "right",
          seatIndex: rightIdx,
        });
      });
      rightIdx++;
    }
    let leftIdx = 0;
    for (const npc of (game as unknown as { playersLeft?: CorePlayer[] }).playersLeft ?? []) {
      npc.eachHand((hand: CoreHand) => {
        npcData.push({
          cards: hand.cards.map((c: CoreCard) => c.attributes()),
          cardTotal: hand.cardTotal,
          betAmount: hand.betAmount,
          position: "left",
          seatIndex: leftIdx,
        });
      });
      leftIdx++;
    }
    setNpcHands(npcData);

    // Track newly revealed cards to show +1/-1/0 popups.
    const allCards: { id: string; showingFace: boolean; rank: string }[] = [];
    game.dealer.cards.forEach((c: CoreCard) => {
      const attrs = c.attributes();
      allCards.push({ id: attrs.id, showingFace: attrs.showingFace, rank: attrs.rank });
    });
    (game.player as CorePlayer | undefined)?.hands.forEach((h: CoreHand) => {
      h.cards.forEach((c: CoreCard) => {
        const attrs = c.attributes();
        allCards.push({ id: attrs.id, showingFace: attrs.showingFace, rank: attrs.rank });
      });
    });

    const nowIds = new Set<string>();
    const nextShown = new Map<string, boolean>();
    const newPops: Record<string, number> = {};
    const now = Date.now();

    for (const card of allCards) {
      nowIds.add(card.id);
      const prevShown = prevCardShownRef.current.get(card.id);
      nextShown.set(card.id, card.showingFace);

      const isNew = !prevCardIdsRef.current.has(card.id);
      const justFlipped = prevShown === false && card.showingFace;

      if (card.showingFace && (isNew || justFlipped)) {
        newPops[card.id] = hiLoValue(card.rank);
        popTsRef.current.set(card.id, now);
      }
    }

    prevCardIdsRef.current = nowIds;
    prevCardShownRef.current = nextShown;

    setCardPops((prev) => {
      const next = { ...prev };
      // Drop pops for cards that left the table.
      for (const id of Object.keys(next)) {
        if (!nowIds.has(id)) {
          delete next[id];
        }
      }
      return { ...next, ...newPops };
    });
  }, []);

  const recordHandResult = useCallback((game: Game) => {
    // All-time deltas first: the engine counters are cumulative per Game.
    const dTotal =
      game.state.sessionMovesTotal - prevSessionMovesRef.current;
    const dCorrect =
      game.state.sessionMovesCorrect - prevSessionCorrectRef.current;
    prevSessionMovesRef.current = game.state.sessionMovesTotal;
    prevSessionCorrectRef.current = game.state.sessionMovesCorrect;

    let won = false;
    let pushed = false;
    (game.player as CorePlayer | undefined)?.handWinner.forEach((winner) => {
      if (winner === HandWinner.Player) won = true;
      if (winner === HandWinner.Push) pushed = true;
    });
    streakRef.current = won
      ? streakRef.current + 1
      : pushed
        ? streakRef.current
        : 0;

    setAllTimeStats((prev) => ({
      handsTrained: prev.handsTrained + 1,
      movesTotal: prev.movesTotal + Math.max(0, dTotal),
      movesCorrect: prev.movesCorrect + Math.max(0, dCorrect),
      bestStreak: Math.max(prev.bestStreak, streakRef.current),
      lastPlayed: Date.now(),
    }));

    setSessionStats((prev) => {
      const s = { ...prev };
      s.handsPlayed++;
      s.bankroll = game.player.balance;
      s.profit = game.player.balance - STARTING_BANKROLL;

      s.movesTotal = game.state.sessionMovesTotal;
      s.movesCorrect = game.state.sessionMovesCorrect;
      s.accuracy =
        s.movesTotal > 0
          ? Math.round((s.movesCorrect / s.movesTotal) * 100)
          : 0;

      if (won) {
        s.handsWon++;
        s.currentStreak++;
        s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
      } else if (pushed) {
        // push doesn't break streak
      } else {
        s.handsLost++;
        s.currentStreak = 0;
      }
      return s;
    });
  }, []);

  const driveGame = useCallback(
    (game: Game, initialStep: GameStep) => {
      let step = initialStep;
      let safety = 0;

      while (safety++ < 50) {
        switch (step) {
          case GameStep.Start:
            step = game.step();
            continue;

          case GameStep.PlayHandsRight:
          case GameStep.PlayHandsLeft:
            step = game.step();
            continue;

          case GameStep.WaitingForPlayInput:
            syncUIState(game);
            setGameStep("playing");
            setWaitingForInsurance(false);
            setAllowedActions(getAllowedActions(game));
            setNeedsNewGame(false);

            // Active count verification: prompt after a fresh deal only.
            if (freshDealRef.current) {
              freshDealRef.current = false;
              if (settingsRef.current.activeCountVerification) {
                setCountPromptActive(true);
                setCountPromptFeedback(null);
              }
            }
            return;

          case GameStep.WaitingForInsuranceInput:
            syncUIState(game);
            setGameStep("insurance");
            setWaitingForInsurance(true);
            setAllowedActions(["insurance", "no-insurance"]);
            setNeedsNewGame(false);
            return;

          case GameStep.WaitingForNewGameInput:
            syncUIState(game);
            setDealerTotal(game.dealer.cardTotal);
            setGameStep("results");
            setAllowedActions([]);
            setWaitingForInsurance(false);
            recordHandResult(game);
            setNeedsNewGame(true);
            return;

          default:
            syncUIState(game);
            setGameStep("idle");
            return;
        }
      }
    },
    [syncUIState, recordHandResult]
  );

  const startNewGame = useCallback(
    (newSettings?: PracticeSettings) => {
      const s = newSettings || settingsRef.current;
      if (newSettings) settingsRef.current = s;

      const mode = GAME_MODE_MAP[s.mode];

      // Compute playerTablePosition from seat position.
      const playerTablePosition =
        s.seatPosition === "first_base" ? s.tableSize : 1;

      const gameSettings: Partial<GameSettings> = {
        playerCount: s.tableSize,
        playerTablePosition,
        mode,
        checkDeviations: s.checkDeviations || mode === GameMode.Deviations,
        deckCount: s.deckCount,
        hitSoft17: s.hitSoft17,
        allowLateSurrender: s.allowLateSurrender,
        allowDoubleAfterSplit: s.allowDoubleAfterSplit,
        allowResplitAces: s.allowResplitAces,
        penetration: s.penetration,
        blackjackPayout:
          s.blackjackPayout === "3:2"
            ? BlackjackPayout.ThreeToTwo
            : BlackjackPayout.SixToFive,
        autoDeclineInsurance: true,
        disableEvents: false,
        debug: false,
        playerBankroll: 100000,
        minimumBet: s.tableMin,
        maximumBet: s.tableMax,
        maxHandsAllowed: 4,
      };

      const game = new Game(gameSettings);
      gameRef.current = game;
      // New Game instance → cumulative counters restart from zero.
      prevSessionMovesRef.current = 0;
      prevSessionCorrectRef.current = 0;
      streakRef.current = 0;
      game.betAmount = Math.min(currentBet, game.player.balance);
      setSuggestedBetRevealed(false);
      setCountPromptActive(false);
      setCountPromptFeedback(null);
      setCardPops({});
      prevCardIdsRef.current = new Set();
      prevCardShownRef.current = new Map();
      popTsRef.current = new Map();
      freshDealRef.current = true;

      setGameStep("idle");
      setDealerCards([]);
      setDealerTotal(null);
      setPlayerState(null);
      setFocusedHandIndex(0);
      setCorrection(null);
      setAllowedActions([]);
      setWaitingForInsurance(false);
      setNeedsNewGame(false);
      setNpcHands([]);
      setSessionStats({
        handsPlayed: 0,
        handsWon: 0,
        handsLost: 0,
        handsPushed: 0,
        movesTotal: 0,
        movesCorrect: 0,
        accuracy: 0,
        currentStreak: 0,
        bestStreak: 0,
        bankroll: STARTING_BANKROLL,
        profit: 0,
      });

      try {
        const step = game.step();
        driveGame(game, step);
      } catch (err) {
        console.error("[solo] startNewGame error:", err);
      }
    },
    [driveGame, currentBet]
  );

  const dealNextHand = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;

    setNeedsNewGame(false);
    setCorrection(null);
    setDealerTotal(null);
    setSuggestedBetRevealed(false);
    setCountPromptActive(false);
    setCountPromptFeedback(null);
    freshDealRef.current = true;

    try {
      if (game.state.step === GameStep.WaitingForNewGameInput) {
        game.step(Move.Hit);
      }
      game.betAmount = Math.min(currentBet, game.player.balance);
      const step = game.step();
      driveGame(game, step);
    } catch (err) {
      console.error("[solo] dealNextHand error:", err);
    }
  }, [driveGame, currentBet]);

  const submitCountGuess = useCallback(
    (value: number): boolean => {
      const game = gameRef.current;
      if (!game || !countPromptActive) return false;

      const actual = game.shoe.hiLoTrueCount;
      const correct = Math.abs(value - actual) <= 0.15;
      setCountPromptFeedback(correct ? "correct" : "wrong");

      // Brief pause so the user sees feedback before actions unlock.
      window.setTimeout(
        () => {
          setCountPromptActive(false);
          setCountPromptFeedback(null);
        },
        correct ? 900 : 2000
      );

      return correct;
    },
    [countPromptActive]
  );

  const playerAction = useCallback(
    (action: string) => {
      const game = gameRef.current;
      if (!game) return;

      const move = MOVE_MAP[action];
      if (move === undefined) return;

      try {
        const prevCorrection = game.state.playCorrection;
        const step = game.step(move);

        const newCorrection = game.state.playCorrection;
        if (newCorrection && newCorrection !== prevCorrection) {
          setCorrection({
            message: newCorrection,
            isCorrect: false,
            timestamp: Date.now(),
          });
        } else if (!newCorrection) {
          setCorrection({
            message: "",
            isCorrect: true,
            timestamp: Date.now(),
          });
        }

        setSessionStats((prev) => ({
          ...prev,
          movesTotal: game.state.sessionMovesTotal,
          movesCorrect: game.state.sessionMovesCorrect,
          accuracy:
            game.state.sessionMovesTotal > 0
              ? Math.round(
                  (game.state.sessionMovesCorrect /
                    game.state.sessionMovesTotal) *
                    100
                )
              : 0,
        }));

        driveGame(game, step);
      } catch (err) {
        console.error("[solo] playerAction error:", err);
      }
    },
    [driveGame]
  );

  const updateSettings = useCallback((newSettings: Partial<PracticeSettings>) => {
    settingsRef.current = { ...settingsRef.current, ...newSettings };
    setSettings(settingsRef.current);
  }, []);

  const getSuggestedUnits = useCallback((tc: number): number => {
    const spread = settingsRef.current.betSpreadUnits;
    const flooredTc = Math.floor(tc);
    if (flooredTc <= 1) return spread[1] ?? 1;
    if (flooredTc >= 5) return spread[5] ?? spread[4] ?? spread[1] ?? 1;
    return spread[flooredTc] ?? spread[1] ?? 1;
  }, []);

  const getSuggestedBet = useCallback(
    (tc: number): number => {
      return getSuggestedUnits(tc) * settingsRef.current.unitSize;
    },
    [getSuggestedUnits]
  );

  const setBet = useCallback(
    (amount: number) => {
      const game = gameRef.current;
      const minBet = settingsRef.current.tableMin;
      const maxBet = Math.min(
        settingsRef.current.tableMax,
        game ? game.player.balance : settingsRef.current.tableMax
      );
      const clamped = Math.max(
        minBet,
        Math.min(maxBet, Math.round(amount))
      );
      setCurrentBet(clamped);
      if (game) game.betAmount = clamped;
    },
    []
  );

  const revealSuggestedBet = useCallback(() => {
    setSuggestedBetRevealed(true);
  }, []);

  useEffect(() => {
    return () => {
      gameRef.current = null;
    };
  }, []);

  // Persist whenever it changes; lastPlayed>0 guards against clobbering the
  // stored record with the empty initial state before hydration.
  useEffect(() => {
    if (allTimeStats.lastPlayed > 0) persistAllTime(allTimeStats);
  }, [allTimeStats]);

  const resetStats = () => {
    setSessionStats({
      handsPlayed: 0,
      handsWon: 0,
      handsLost: 0,
      handsPushed: 0,
      movesTotal: 0,
      movesCorrect: 0,
      accuracy: 0,
      currentStreak: 0,
      bestStreak: 0,
      bankroll: STARTING_BANKROLL,
      profit: 0,
    });
  };

  return {
    gameStep,
    dealerCards,
    dealerTotal,
    playerState,
    focusedHandIndex,
    correction,
    runningCount,
    trueCount,
    penetration,
    cardsRemaining,
    sessionStats,
    allowedActions,
    waitingForInsurance,
    needsNewGame,
    settings,
    currentBet,
    suggestedBetRevealed,
    decksRemaining,
    totalCards,
    cardPops,
    npcHands,
    countPromptActive,
    countPromptFeedback,
    allTimeStats,

    startNewGame,
    dealNextHand,
    playerAction,
    updateSettings,
    resetStats,
    setBet,
    getSuggestedBet,
    getSuggestedUnits,
    revealSuggestedBet,
    submitCountGuess,
  };
}
