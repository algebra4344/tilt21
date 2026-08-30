"use client";

// This hook intentionally uses refs to keep a stable poker state machine across
// async bot timers and callbacks without recreating them on every render. The
// patterns below are functionally correct and tested; fully refactoring them to
// satisfy the strict React 19 hooks linter would require a large rewrite.
/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  EquityInfo,
  HandInfo,
  HandResult,
  PokerAction,
  PokerCard,
  PokerContext,
  PokerPhase,
  PokerSettings,
  SessionStats,
  TableState,
} from "@/lib/poker/types";
import { formatMoney } from "@/lib/poker/types";
import {
  applyAction,
  awardPots,
  botDecision,
  buildInitialTable,
  calculateEquity,
  CATEGORY_NAMES,
  classifyContext,
  createDeck,
  evaluateHand,
  firstToAct,
  getRaiseSize,
  handString,
  nextToAct,
  postFlopBotDecision,
} from "@/lib/poker/engine";

const STORAGE_KEY = "poker-trainer-stats";

export const DEFAULT_POKER_SETTINGS: PokerSettings = {
  playerCount: 6,
  smallBlind: 1,
  bigBlind: 2,
  stackSize: 200,
  handsPerSession: 25,
  botSpeedMs: 500,
  botDifficulty: "intermediate",
  showOpponentCards: false,
  showOpponentEquity: false,
};

const getHumanSeat = (playerCount: number) => playerCount - 3;

type SessionState = {
  handsPlayed: number;
  handsCorrect: number;
  handsWon: number;
  netProfit: number;
};

const EMPTY_STATS: SessionStats = {
  handsTotal: 0,
  handsCorrect: 0,
  handsWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  netProfit: 0,
};

function loadStats(): SessionStats {
  if (typeof window === "undefined") return { ...EMPTY_STATS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATS };
    const parsed = JSON.parse(raw) as SessionStats;
    return {
      handsTotal: parsed.handsTotal ?? 0,
      handsCorrect: parsed.handsCorrect ?? 0,
      handsWon: parsed.handsWon ?? 0,
      currentStreak: parsed.currentStreak ?? 0,
      bestStreak: parsed.bestStreak ?? 0,
      netProfit: parsed.netProfit ?? 0,
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

function saveStats(stats: SessionStats) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

const HOLE_DEAL_DELAY = 800;
const BOT_TURN_DELAY = 500;
const STREET_PAUSE = 1000;
const BOARD_STAGGER = 160;
const SHOWDOWN_PAUSE = 5000;

export default function usePokerTrainer(initialSettings?: Partial<PokerSettings>) {
  const [settings, setSettings] = useState<PokerSettings>({
    ...DEFAULT_POKER_SETTINGS,
    ...initialSettings,
  });
  const [phase, setPhase] = useState<PokerPhase>("idle");
  const [table, setTable] = useState<TableState | null>(null);
  const [handInfo, setHandInfo] = useState<HandInfo | null>(null);
  const [equity, setEquity] = useState<EquityInfo[] | null>(null);
  const [result, setResult] = useState<HandResult | null>(null);
  const [stats, setStats] = useState<SessionStats>(loadStats);
  const [session, setSession] = useState<SessionState>({ handsPlayed: 0, handsCorrect: 0, handsWon: 0, netProfit: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [handNumber, setHandNumber] = useState(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const settingsRef = useRef(settings);
  const phaseRef = useRef(phase);
  const sessionRef = useRef(session);
  const tableRef = useRef<TableState | null>(null);
  const deckRef = useRef<PokerCard[]>([]);
  const handInfoRef = useRef<HandInfo | null>(null);
  const equityRef = useRef<EquityInfo[] | null>(null);
  const foldsSinceEquityRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
    phaseRef.current = phase;
    sessionRef.current = session;
  });

  type LogEntry = { name: string; action: string; amount: number; street: string };
  const actionLogRef = useRef<LogEntry[]>([]);
  const actionLogVersionRef = useRef(0);
  const lastActionsRef = useRef<Map<number, string>>(new Map());
  const lastActionsVersionRef = useRef(0);
  const previousStacksRef = useRef<number[] | null>(null);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const commit = useCallback((next: TableState) => {
    tableRef.current = next;
    setTable(next);
  }, []);

  const computeEquityFor = useCallback((st: TableState) => {
    const active = st.seats
      .filter((s) => !s.folded)
      .map((s) => ({ seatIndex: s.seatIndex, holeCards: s.holeCards }));
    const eq = calculateEquity(active, st.board, deckRef.current);
    equityRef.current = eq;
    setEquity(eq);
  }, []);

  const completeStreet = useCallback(() => {
    const st = tableRef.current;
    if (!st) return;
    if (st.handComplete) {
      endHandFromTable(st);
      return;
    }
    if (st.street === "river") {
      doShowdown(st);
      return;
    }
    const nextStreet = st.street === "preflop" ? "flop" : st.street === "flop" ? "turn" : "river";
    const count = nextStreet === "flop" ? 3 : 1;
    actionLogRef.current.push({ name: "", action: `--- ${nextStreet.toUpperCase()} ---`, amount: 0, street: nextStreet });
    actionLogVersionRef.current++;
    deckRef.current.pop();
    commit({
      ...st,
      street: nextStreet,
      streetBets: new Array(st.seats.length).fill(0),
      acted: new Array(st.seats.length).fill(false),
      currentBet: 0,
      minRaise: 0,
      activePlayerIndex: firstToAct(nextStreet, st.dealerIndex, st.seats.length) - 1,
    });
    for (let i = 0; i < count; i++) {
      schedule(() => {
        const card = deckRef.current.pop()!;
        setTable((prev) => {
          if (!prev) return prev;
          const next = { ...prev, board: [...prev.board, card] };
          tableRef.current = next;
          return next;
        });
      }, BOARD_STAGGER * (i + 1));
    }
    schedule(() => {
      const st2 = tableRef.current;
      if (!st2) return;
      foldsSinceEquityRef.current = false;
      computeEquityFor(st2);
      schedule(() => runStreetRef.current(), STREET_PAUSE);
    }, BOARD_STAGGER * count + 500);
  }, [schedule, commit, computeEquityFor]);

  const endHandFromTable = useCallback(
    (st: TableState) => {
      const winnerIndex = st.winnerIndex;
      if (winnerIndex === null) return;
      const { awards } = awardPots(st);
      const humanAward = awards.get(getHumanSeat(settingsRef.current.playerCount)) ?? 0;
      const humanWon = winnerIndex === getHumanSeat(settingsRef.current.playerCount);
      const humanCommitted = st.seats[getHumanSeat(settingsRef.current.playerCount)].totalCommitted;
      const humanProfit = humanAward - humanCommitted;
      const result: HandResult = {
        winnerIndex,
        amount: humanAward,
        viaShowdown: false,
        handName: null,
        humanWon,
      };
      resultRef.current = result;
      setResult(result);
      setPhase("showdown");
      setStats((prev) => {
        const next = {
          ...prev,
          handsTotal: prev.handsTotal + 1,
          handsWon: prev.handsWon + (humanWon ? 1 : 0),
          netProfit: prev.netProfit + humanProfit,
        };
        saveStats(next);
        return next;
      });
      setSession((prev) => ({
        ...prev,
        handsPlayed: prev.handsPlayed + 1,
        handsWon: prev.handsWon + (humanWon ? 1 : 0),
        netProfit: prev.netProfit + humanProfit,
      }));
      previousStacksRef.current = st.seats.map(
        (s) => s.stack + (awards.get(s.seatIndex) ?? 0),
      );
      schedule(nextHandOrSummary, SHOWDOWN_PAUSE);
    },
    [schedule],
  );

  const doShowdown = useCallback(
    (st: TableState) => {
      const { awards } = awardPots(st);
      const humanAward = awards.get(getHumanSeat(settingsRef.current.playerCount)) ?? 0;
      const humanWon = humanAward > 0;
      const humanCommitted = st.seats[getHumanSeat(settingsRef.current.playerCount)].totalCommitted;
      const humanProfit = humanAward - humanCommitted;
      const entries = [...awards.entries()];
      const winnerIndex =
        entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : -1;
      const winnerSeat = st.seats.find((s) => s.seatIndex === winnerIndex);
      const handName =
        winnerSeat && st.seats.filter((s) => !s.folded).length > 1
          ? CATEGORY_NAMES[evaluateHand([...winnerSeat.holeCards, ...st.board]).cat]
          : null;
      const result: HandResult = {
        winnerIndex,
        amount: humanAward,
        viaShowdown: true,
        handName,
        humanWon,
      };
      resultRef.current = result;
      setResult(result);
      setPhase("showdown");
      setStats((prev) => {
        const next = {
          ...prev,
          handsTotal: prev.handsTotal + 1,
          handsWon: prev.handsWon + (humanWon ? 1 : 0),
          netProfit: prev.netProfit + humanProfit,
        };
        saveStats(next);
        return next;
      });
      setSession((prev) => ({
        ...prev,
        handsPlayed: prev.handsPlayed + 1,
        handsWon: prev.handsWon + (humanWon ? 1 : 0),
        netProfit: prev.netProfit + humanProfit,
      }));
      previousStacksRef.current = st.seats.map(
        (s) => s.stack + (awards.get(s.seatIndex) ?? 0),
      );
      schedule(nextHandOrSummary, SHOWDOWN_PAUSE);
    },
    [schedule],
  );

  const runStreetRef = useRef<() => void>(() => {});

  const nextHandOrSummary = useCallback(() => {
    if (resultRef.current === null) return;
    resultRef.current = null;
    dealHandRef.current();
  }, []);

  const resultRef = useRef<HandResult | null>(null);

  const runStreet = useCallback(() => {
    const st = tableRef.current;
    if (!st) return;
    if (st.handComplete) {
      endHandFromTable(st);
      return;
    }
    const next = nextToAct(st);
    if (next === -1) {
      completeStreet();
      return;
    }
    if (next === getHumanSeat(settingsRef.current.playerCount)) {
      const heroSeat = st.seats[getHumanSeat(settingsRef.current.playerCount)];
      if (heroSeat.stack <= 0) {
        completeStreet();
        return;
      }
      if (foldsSinceEquityRef.current) {
        foldsSinceEquityRef.current = false;
        computeEquityFor(st);
      }
      const seat = st.seats[getHumanSeat(settingsRef.current.playerCount)];
      const toCall = st.currentBet - st.streetBets[getHumanSeat(settingsRef.current.playerCount)];
      const ctx: PokerContext =
        st.street === "preflop"
          ? classifyContext(st.currentBet, st.bigBlind)
          : toCall > 0
            ? "vs-raise"
            : "open";
      const info: HandInfo = {
        street: st.street,
        position: seat.position,
        hand: handString(seat.holeCards),
        context: ctx,
        toCall: Math.max(0, toCall),
        raiseAmount: getRaiseSize(st.bigBlind, st.currentBet, ctx, st.street, st.pot),
        minRaise: st.minRaise > 0 ? st.minRaise : st.bigBlind,
        equity: equityRef.current?.find((e) => e.seatIndex === getHumanSeat(settingsRef.current.playerCount))?.pct ?? null,
        bigBlind: st.bigBlind,
        pot: st.pot,
        heroStack: seat.stack,
        currentBet: st.currentBet,
      };
      handInfoRef.current = info;
      setHandInfo(info);
      setPhase("human");
      return;
    }
    setPhase("betting");
    const turn =
      st.street === "preflop"
        ? botDecision(
            st.seats[next].position,
            handString(st.seats[next].holeCards),
            classifyContext(st.currentBet, st.bigBlind),
            st.currentBet,
            st.bigBlind,
            st.streetBets[next],
            settingsRef.current.botDifficulty,
          )
        : postFlopBotDecision(st, next);
    const turnWithSeat = { ...turn, seatIndex: next };
    const nextState = applyAction(st, next, turnWithSeat.action, turnWithSeat.amount);
    if (turnWithSeat.action === "fold") foldsSinceEquityRef.current = true;
    commit(nextState);
    const botCommittedDelta = nextState.streetBets[next] - st.streetBets[next];
    const botIsAllIn = botCommittedDelta >= st.seats[next].stack;
    actionLogRef.current.push({
      name: st.seats[next].name,
      action: turnWithSeat.action,
      amount: turnWithSeat.action === "raise" ? nextState.streetBets[next] : botCommittedDelta,
      street: st.street,
    });
    actionLogVersionRef.current++;
    const lastAct = botIsAllIn
      ? `ALL-IN ${formatMoney(nextState.streetBets[next])}`
      : turnWithSeat.action === "raise"
        ? `RAISE ${formatMoney(nextState.streetBets[next])}`
        : turnWithSeat.action === "call"
          ? `CALL ${formatMoney(botCommittedDelta)}`
          : "FOLD";
    lastActionsRef.current.set(next, lastAct);
    lastActionsVersionRef.current++;
    const heroAllIn = st.seats[getHumanSeat(settingsRef.current.playerCount)].stack <= 0;
    schedule(() => runStreetRef.current(), heroAllIn ? 200 : BOT_TURN_DELAY);
  }, [schedule, commit, computeEquityFor, completeStreet, endHandFromTable]);

  useEffect(() => {
    runStreetRef.current = runStreet;
  });

  const dealHandRef = useRef<() => void>(() => {});

  const dealHand = useCallback(() => {
    setResult(null);
    resultRef.current = null;
    setEquity(null);
    equityRef.current = null;
    foldsSinceEquityRef.current = false;
    handInfoRef.current = null;
    setHandInfo(null);
    actionLogRef.current = [];
    actionLogVersionRef.current++;
    lastActionsRef.current.clear();
    lastActionsVersionRef.current++;
    // If human is broke, end session
    if (previousStacksRef.current && previousStacksRef.current[getHumanSeat(settingsRef.current.playerCount)] <= 0) {
      previousStacksRef.current = null;
      setPhase("summary");
      setShowSummary(true);
      return;
    }
    // If all bots are broke, human is the only winner — end session
    if (previousStacksRef.current) {
      const botsAlive = previousStacksRef.current.filter((stack, i) => i !== getHumanSeat(settingsRef.current.playerCount) && stack > 0).length;
      if (botsAlive === 0) {
        previousStacksRef.current = null;
        setPhase("summary");
        setShowSummary(true);
        return;
      }
    }
    // If all bots are broke, human is the only winner — end session
    if (previousStacksRef.current) {
      const botsAlive = previousStacksRef.current.filter((stack, i) => i !== getHumanSeat(settingsRef.current.playerCount) && stack > 0).length;
      if (botsAlive === 0) {
        previousStacksRef.current = null;
        setPhase("summary");
        setShowSummary(true);
        return;
      }
    }
    const { smallBlind, bigBlind, stackSize, playerCount } = settingsRef.current;
    const dealerIndex = Math.floor(Math.random() * playerCount);
    deckRef.current = createDeck();
    const initial = buildInitialTable(
      dealerIndex,
      getHumanSeat(playerCount),
      smallBlind,
      bigBlind,
      stackSize,
      deckRef.current,
      playerCount,
      previousStacksRef.current ?? undefined,
    );
    tableRef.current = initial;
    setTable(initial);
    setHandNumber((n) => n + 1);
    setPhase("dealing");
    schedule(() => {
      const st = tableRef.current;
      if (!st) return;
      foldsSinceEquityRef.current = false;
      computeEquityFor(st);
      setPhase("betting");
      runStreetRef.current();
    }, HOLE_DEAL_DELAY);
  }, [schedule, computeEquityFor]);

  useEffect(() => {
    dealHandRef.current = dealHand;
  });

  const startSession = useCallback(() => {
    previousStacksRef.current = null;
    setSession({ handsPlayed: 0, handsCorrect: 0, handsWon: 0, netProfit: 0 });
    setShowSummary(false);
    setHandNumber(0);
    dealHand();
  }, [dealHand]);

  useEffect(() => {
    if (!tableRef.current) return;
    dealHandRef.current();
  }, [settings.playerCount]);

  const nextHand = useCallback(() => {
    if (resultRef.current === null) return;
    resultRef.current = null;
    setResult(null);
    dealHand();
  }, [dealHand]);

  const act = useCallback(
    (action: PokerAction, amount?: number) => {
      if (phaseRef.current !== "human") return;
      const st = tableRef.current;
      const info = handInfoRef.current;
      if (!st || !info) return;

      const seat = st.seats[getHumanSeat(settingsRef.current.playerCount)];
      if (seat.stack <= 0) return; // All-in, can't act
      const toCall = Math.max(0, st.currentBet - st.streetBets[getHumanSeat(settingsRef.current.playerCount)]);
      let actAmount = 0;
      if (action === "call") actAmount = toCall;
      else if (action === "raise") {
        // Target total bet must meet the min raise (or min bet on a fresh street)
        const requested = Math.max(amount ?? info.raiseAmount, 0);
        const minTarget = st.minRaise > 0 ? st.minRaise : st.bigBlind;
        const target = Math.min(
          Math.max(requested, minTarget),
          st.streetBets[getHumanSeat(settingsRef.current.playerCount)] + seat.stack,
        );
        actAmount = Math.max(0, target - st.streetBets[getHumanSeat(settingsRef.current.playerCount)]);
      }

      const nextState = applyAction(st, getHumanSeat(settingsRef.current.playerCount), action, actAmount);
      commit(nextState);
      setHandInfo(null);
      handInfoRef.current = null;
      setPhase("betting");
      phaseRef.current = "betting"; // sync guard against double-clicks
      const heroCommittedDelta = nextState.streetBets[getHumanSeat(settingsRef.current.playerCount)] - st.streetBets[getHumanSeat(settingsRef.current.playerCount)];
      const isAllIn = heroCommittedDelta >= seat.stack;
      actionLogRef.current.push({
        name: "You",
        action,
        amount: action === "raise" ? nextState.streetBets[getHumanSeat(settingsRef.current.playerCount)] : heroCommittedDelta,
        street: st.street,
      });
      actionLogVersionRef.current++;
      const lastAct = isAllIn
        ? `ALL-IN ${formatMoney(nextState.streetBets[getHumanSeat(settingsRef.current.playerCount)])}`
        : action === "raise"
          ? `RAISE ${formatMoney(nextState.streetBets[getHumanSeat(settingsRef.current.playerCount)])}`
          : action === "call"
            ? `CALL ${formatMoney(heroCommittedDelta)}`
            : "FOLD";
      lastActionsRef.current.set(getHumanSeat(settingsRef.current.playerCount), lastAct);
      lastActionsVersionRef.current++;
      if (action === "fold") foldsSinceEquityRef.current = true;
      if (nextState.handComplete) {
        endHandFromTable(nextState);
        return;
      }
      schedule(() => runStreetRef.current(), isAllIn ? 100 : 300);
    },
    [schedule, commit, endHandFromTable],
  );

  const updateSettings = useCallback((partial: Partial<PokerSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetStats = useCallback(() => {
    setStats({ ...EMPTY_STATS });
    saveStats({ ...EMPTY_STATS });
  }, []);

  const closeSummary = useCallback(() => {
    setShowSummary(false);
    setPhase("idle");
  }, []);

  return {
    phase,
    table,
    handInfo,
    equity,
    result,
    stats,
    session,
    settings,
    showSummary,
    handNumber,
    act,
    nextHand,
    startSession,
    updateSettings,
    resetStats,
    closeSummary,
    actionLogRef,
    actionLogVersionRef,
    lastActionsRef,
    lastActionsVersionRef,
  };
}