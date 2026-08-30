import {
  advanceStreet,
  applyAction,
  awardPots,
  botDecision,
  buildTableFromSeats,
  CATEGORY_NAMES,
  classifyContext,
  createDeck,
  evaluateHand,
  getCallAmount,
  getRaiseCommitted,
  handString,
  nextToAct,
  postFlopBotDecision,
} from '@tilt21/core';
import type { PokerAction, PokerCard, TableState } from '@tilt21/core';

export type PokerRoomSettings = {
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  /** Listed in the public table browser so link-less players can join. */
  isPublic: boolean;
};

export type PublicRoomSummary = {
  id: string;
  name: string;
  status: 'lobby' | 'playing';
  smallBlind: number;
  bigBlind: number;
  humans: number;
  seats: number;
  handsPlayed: number;
};

export type PokerPlayer = {
  id: string;
  name: string;
  isBot: boolean;
  stack: number;
  connected: boolean;
  /** Busted players sit out until they explicitly rebuy. Bots ignore this. */
  sittingOut: boolean;
};

export type PokerSeat = (PokerPlayer & { seatIndex: number }) | null;

export type PokerActionLogEntry = {
  name: string;
  action: string;
  amount: number;
  street: string;
};

export type HandAward = {
  seatIndex: number;
  playerId: string | null;
  name: string;
  amount: number;
  handName?: string;
};

export type LastHandResult = {
  awards: HandAward[];
  potTotal: number;
  viaShowdown: boolean;
};

export type PokerSeatView =
  (Omit<PokerPlayer, 'id'> & { seatIndex: number }) | null;

export type PokerRoomStatePayload = {
  roomId: string;
  name: string;
  hostSeatIndex: number | null;
  status: 'lobby' | 'playing';
  settings: PokerRoomSettings;
  seats: PokerSeatView[];
  handsPlayed: number;
  table: TableState | null;
  you: { seatIndex: number; stack: number } | null;
  /** Viewer is queued for the next hand (table was full mid-hand). */
  youPending: boolean;
  toActSeatIndex: number | null;
  actionLog: PokerActionLogEntry[];
  lastResult: LastHandResult | null;
};

const BOT_NAMES = [
  'Rex',
  'Mona',
  'Vic',
  'Ivy',
  'Otto',
  'Pia',
  'Gus',
  'Nell',
  'Bo',
];
const BOT_THINK_MS = 700;
const HOLE_DEAL_MS = 1000;
const STREET_PAUSE_MS = 900;
const RESULT_PAUSE_MS = 5000;
const TURN_TIMEOUT_MS = 45_000;

const hiddenCard = (seed: string): PokerCard => ({
  id: `hidden-${seed}`,
  suit: 's',
  rank: '',
  showingFace: false,
});

export class PokerRoom {
  readonly id: string;
  name: string;
  hostPlayerId: string | null;
  readonly settings: PokerRoomSettings;

  private seats: PokerSeat[] = [];
  private table: TableState | null = null;
  private deck: PokerCard[] = [];
  /** Humans queued for a seat while a hand blocks the bot-swap rule. */
  private pendingJoins: Map<string, { name: string; at: number }> = new Map();
  /** Public per-hand action feed; reset each deal, included in state. */
  private actionLog: PokerActionLogEntry[] = [];
  private dealerIndex = -1;
  private revealAll = false;
  private _handsPlayed = 0;
  private _status: 'lobby' | 'playing' = 'lobby';
  private pendingRemovals: Set<string> = new Set();
  private lastResult: LastHandResult | null = null;

  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private streetTimer: ReturnType<typeof setTimeout> | null = null;
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private handTimer: ReturnType<typeof setTimeout> | null = null;

  // Set by the socket layer so state fan-out can reach every viewer.
  onStateChanged: (() => void) | null = null;
  onResultEmitted: ((result: LastHandResult) => void) | null = null;

  constructor(
    id: string,
    name: string,
    hostPlayerId: string | null,
    settings: PokerRoomSettings,
  ) {
    this.id = id;
    this.name = name;
    this.hostPlayerId = hostPlayerId;
    this.settings = settings;
    this.seats = Array.from({ length: settings.maxPlayers }, () => null);
  }

  get status() {
    return this._status;
  }

  get handsPlayed() {
    return this._handsPlayed;
  }

  get humanCount() {
    return this.seats.filter((s) => s !== null && !s.isBot).length;
  }

  /** Summary for the public table browser (only called when isPublic). */
  publicView(): PublicRoomSummary {
    return {
      id: this.id,
      name: this.name,
      status: this._status,
      smallBlind: this.settings.smallBlind,
      bigBlind: this.settings.bigBlind,
      humans: this.humanCount,
      seats: this.seats.length,
      handsPlayed: this._handsPlayed,
    };
  }

  /** Any live human socket attached to a seat? */
  anyConnected(): boolean {
    return this.seats.some((s) => s !== null && !s.isBot && s.connected);
  }

  get seatCount() {
    return this.seats.filter((s) => s !== null).length;
  }

  private clearTimers(): void {
    for (const timer of [
      this.botTimer,
      this.streetTimer,
      this.turnTimer,
      this.handTimer,
    ]) {
      if (timer) clearTimeout(timer);
    }
    this.botTimer = null;
    this.streetTimer = null;
    this.turnTimer = null;
    this.handTimer = null;
  }

  private findSeatByPlayer(playerId: string): number {
    return this.seats.findIndex((s) => s !== null && s.id === playerId);
  }

  private firstEmptySeat(): number {
    return this.seats.findIndex((s) => s === null);
  }

  private firstBotSeat(): number {
    return this.seats.findIndex((s) => s !== null && s.isBot);
  }

  addPlayer(
    playerId: string,
    username: string,
  ): { ok: boolean; error?: string; reconnected?: boolean; pending?: boolean } {
    const existing = this.findSeatByPlayer(playerId);
    if (existing !== -1) {
      const seat = this.seats[existing];
      if (!seat) return { ok: false, error: 'Seat not found' };
      const wasAway = !seat.connected;
      seat.connected = true;
      seat.name = username;
      this.pendingRemovals.delete(playerId);
      if (wasAway) this.notifyChanged();
      return { ok: true, reconnected: true };
    }

    // Already queued — just refresh the requested name.
    const queued = this.pendingJoins.get(playerId);
    if (queued) {
      queued.name = username;
      return { ok: true, pending: true };
    }

    const empty = this.firstEmptySeat();
    if (empty !== -1) {
      this.seats[empty] = {
        seatIndex: empty,
        id: playerId,
        name: username,
        isBot: false,
        stack: this.settings.startingStack,
        connected: true,
        sittingOut: false,
      };
      this.notifyChanged();
      return { ok: true };
    }

    // Table is full: a joining human can take over a bot's seat, but only
    // between hands so nobody inherits half-played cards.
    const botSeat = this.firstBotSeat();
    if (botSeat !== -1) {
      // Between hands the swap is instant; mid-hand the joiner queues for the
      // next deal instead of inheriting half-played cards.
      if (!this.canSwapSeats()) {
        this.pendingJoins.set(playerId, { name: username, at: Date.now() });
        this.notifyChanged();
        return { ok: true, pending: true };
      }
      const bot = this.seats[botSeat];
      if (!bot) return { ok: false, error: 'Bot seat not found' };
      const stack = bot.stack;
      this.seats[botSeat] = {
        seatIndex: botSeat,
        id: playerId,
        name: username,
        isBot: false,
        stack: stack > 0 ? stack : this.settings.startingStack,
        connected: true,
        sittingOut: false,
      };
      this.notifyChanged();
      return { ok: true };
    }

    return { ok: false, error: 'Table is full' };
  }

  /** Seat queued joiners into empty/bot seats. Called between hands. */
  private seatPendingJoins(): void {
    if (this.pendingJoins.size === 0) return;
    const now = Date.now();
    for (const [pid, entry] of [...this.pendingJoins]) {
      // Stale queue entries (tab closed before seating) self-clean.
      if (now - entry.at > 5 * 60_000) {
        this.pendingJoins.delete(pid);
        continue;
      }
      let idx = this.firstEmptySeat();
      let stack = this.settings.startingStack;
      if (idx === -1) {
        const botSeat = this.firstBotSeat();
        if (botSeat === -1) continue; // table full of humans — keep waiting
        const bot = this.seats[botSeat];
        if (!bot) continue;
        idx = botSeat;
        if (bot.stack > 0) stack = bot.stack;
      }
      this.seats[idx] = {
        seatIndex: idx,
        id: pid,
        name: entry.name,
        isBot: false,
        stack,
        connected: true,
        sittingOut: false,
      };
      this.pendingJoins.delete(pid);
    }
  }

  private canSwapSeats(): boolean {
    return (
      this._status === 'lobby' ||
      (this.table !== null && this.table.handComplete)
    );
  }

  removePlayer(playerId: string): void {
    // Queued-but-unseated players have no chips to settle — just dequeue.
    if (this.pendingJoins.delete(playerId)) {
      this.notifyChanged();
      return;
    }

    const idx = this.findSeatByPlayer(playerId);
    if (idx === -1) return;

    const seat = this.seats[idx];
    if (!seat) return;
    seat.connected = false;

    if (this._status === 'lobby' || !this.table || this.table.handComplete) {
      this.freeSeat(idx);
    } else {
      // Mid-hand: the seat keeps its chips until the hand settles, played by
      // bot logic in the meantime.
      this.pendingRemovals.add(playerId);
    }
    this.migrateHostIfNeeded();
    this.notifyChanged();

    // If it was suddenly the abandoned seat's turn, kick the loop.
    if (this._status === 'playing' && this.table && !this.table.handComplete) {
      this.advance();
    }
  }

  // Host removes a player (or a filler bot) from a seat.
  kick(
    actorId: string,
    seatIndex: number,
  ): { ok: boolean; kickedName?: string; isBot?: boolean; error?: string } {
    if (actorId !== this.hostPlayerId) {
      return { ok: false, error: 'Only the host can remove players' };
    }
    if (
      seatIndex < 0 ||
      seatIndex >= this.seats.length ||
      !this.seats[seatIndex]
    ) {
      return { ok: false, error: 'Empty seat' };
    }
    const target = this.seats[seatIndex];
    if (!target) return { ok: false, error: 'Empty seat' };
    if (target.id === actorId) {
      return { ok: false, error: 'Use Leave to remove yourself' };
    }

    const result = { ok: true, kickedName: target.name, isBot: target.isBot };
    this.removePlayer(target.id);
    return result;
  }

  private freeSeat(idx: number): void {
    const seat = this.seats[idx];
    if (seat) this.pendingRemovals.delete(seat.id);
    this.seats[idx] = null;
  }

  private migrateHostIfNeeded(): void {
    if (this.hostPlayerId && this.findSeatByPlayer(this.hostPlayerId) !== -1)
      return;
    const human = this.seats.find((s) => s !== null && !s.isBot);
    this.hostPlayerId = human ? human.id : null;
  }

  hasPlayer(playerId: string): boolean {
    return this.findSeatByPlayer(playerId) !== -1;
  }

  // Host action: fill every open seat with a bot and deal the first hand.
  startGame(): { ok: boolean; error?: string } {
    if (this._status === 'playing' && this.table && !this.table.handComplete) {
      return { ok: false, error: 'Hand already in progress' };
    }
    if (this.hostPlayerId === null) {
      return { ok: false, error: 'No host present' };
    }
    // Queued joiners claim real seats before bots fill the rest.
    this.seatPendingJoins();
    for (let i = 0; i < this.seats.length; i++) {
      if (this.seats[i] === null) {
        this.seats[i] = {
          seatIndex: i,
          id: `bot-${this.id}-${i}`,
          name: BOT_NAMES[i % BOT_NAMES.length],
          isBot: true,
          stack: this.settings.startingStack,
          connected: true,
          sittingOut: false,
        };
      }
    }
    this._status = 'playing';
    this.deal();
    return { ok: true };
  }

  private notifyChanged(): void {
    this.onStateChanged?.();
  }

  private deal(): void {
    this.clearTimers();
    const n = this.seats.length;
    let attempts = 0;
    do {
      this.dealerIndex = (this.dealerIndex + 1) % n;
      attempts++;
    } while (this.seats[this.dealerIndex] === null && attempts <= n);

    this.deck = createDeck();
    const descriptors = this.seats.map((s) => ({
      name: s ? s.name : '',
      playerId: s ? s.id : null,
      stack: s && !s.sittingOut ? s.stack : 0,
    }));
    this.table = buildTableFromSeats(
      this.dealerIndex,
      descriptors,
      this.settings.smallBlind,
      this.settings.bigBlind,
      this.deck,
    );
    this.revealAll = false;
    this.lastResult = null;
    this.actionLog = [];
    this.notifyChanged();
    this.streetTimer = setTimeout(() => this.advance(), HOLE_DEAL_MS);
  }

  act(
    playerId: string,
    action: PokerAction,
    amount?: number,
  ): { ok: boolean; error?: string } {
    if (this._status !== 'playing' || !this.table)
      return { ok: false, error: 'Not playing' };
    if (this.table.handComplete)
      return { ok: false, error: 'Hand is complete' };

    const seatIdx = nextToAct(this.table);
    if (seatIdx === -1) return { ok: false, error: 'No action expected' };

    const player = this.seats[seatIdx];
    if (!player || player.id !== playerId)
      return { ok: false, error: 'Not your turn' };
    if (player.isBot) return { ok: false, error: 'Not your turn' };

    this.applyTurn(seatIdx, action, amount);
    return { ok: true };
  }

  // Explicit rebuy: busted (or between-hand) players buy back in. Mid-hand
  // top-ups for players still holding cards are rejected.
  rebuy(playerId: string, rawAmount: number): { ok: boolean; error?: string } {
    const idx = this.findSeatByPlayer(playerId);
    if (idx === -1) return { ok: false, error: 'Not seated' };
    const player = this.seats[idx];
    if (!player) return { ok: false, error: 'Seat not found' };
    if (player.isBot) return { ok: false, error: 'Bots refill automatically' };

    const amount = Math.floor(rawAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) {
      return { ok: false, error: 'Invalid rebuy amount' };
    }
    const midHand =
      this._status === 'playing' &&
      this.table !== null &&
      !this.table.handComplete;
    if (midHand && player.stack > 0) {
      return { ok: false, error: 'Finish the hand first' };
    }

    player.stack += amount;
    player.sittingOut = false;
    this.notifyChanged();
    return { ok: true };
  }

  private applyTurn(
    seatIdx: number,
    action: PokerAction,
    amount?: number,
  ): void {
    const table = this.table;
    if (!table) return;
    let committed = 0;
    if (action === 'call') {
      committed = getCallAmount(table, seatIdx);
    } else if (action === 'raise') {
      const fallbackTarget =
        table.currentBet > 0
          ? table.currentBet * 2
          : Math.max(table.bigBlind * 2, table.minRaise);
      committed = getRaiseCommitted(table, seatIdx, amount ?? fallbackTarget);
    }
    this.table = applyAction(table, seatIdx, action, committed);
    {
      const committedNow =
        this.table.streetBets[seatIdx] - table.streetBets[seatIdx];
      const amount =
        action === 'fold'
          ? 0
          : action === 'call'
            ? Math.min(committedNow, table.currentBet)
            : this.table.currentBet;
      this.actionLog.push({
        name: table.seats[seatIdx]?.name ?? '?',
        action,
        amount,
        street: table.street,
      });
      if (this.actionLog.length > 120)
        this.actionLog.splice(0, this.actionLog.length - 120);
    }
    this.notifyChanged();
    this.advance();
  }

  private advance(): void {
    this.clearTimers();
    if (this._status !== 'playing' || !this.table) return;
    if (this.table.handComplete) {
      this.settle();
      return;
    }

    const nextSeat = nextToAct(this.table);
    if (nextSeat === -1) {
      // Betting round closed: run out the next street, or go to showdown
      // when the river betting is done.
      if (this.table.street === 'river') {
        this.settle();
        return;
      }
      this.nextStreet();
      return;
    }

    const player = this.seats[nextSeat];
    if (!player) {
      // Shouldn't happen (empty seats are folded/dealt out), skip defensively.
      this.table = applyAction(this.table, nextSeat, 'fold', 0);
      this.advance();
      return;
    }

    if (player.isBot || !player.connected) {
      this.botTimer = setTimeout(() => this.actAsBot(nextSeat), BOT_THINK_MS);
      return;
    }

    // Waiting on a connected human: arm the AFK safety net so an idle or
    // refreshed tab can't stall the whole table.
    this.turnTimer = setTimeout(() => {
      const table = this.table;
      if (!table) return;
      const toCall = getCallAmount(table, nextSeat);
      this.applyTurn(nextSeat, toCall > 0 ? 'fold' : 'call', 0);
    }, TURN_TIMEOUT_MS);
  }

  private actAsBot(seatIdx: number): void {
    if (this._status !== 'playing' || !this.table) return;
    const table = this.table;
    const player = this.seats[seatIdx];
    if (!player) return;

    let turn: { action: PokerAction; amount: number };
    if (table.street === 'preflop') {
      turn = botDecision(
        table.seats[seatIdx].position,
        handString(table.seats[seatIdx].holeCards),
        classifyContext(table.currentBet, table.bigBlind),
        table.currentBet,
        table.bigBlind,
        table.streetBets[seatIdx],
        'intermediate',
      );
    } else {
      turn = postFlopBotDecision(table, seatIdx);
    }
    this.applyTurn(seatIdx, turn.action, turn.amount);
  }

  private nextStreet(): void {
    if (!this.table) return;
    const { state } = advanceStreet(this.table, this.deck);
    this.table = state;
    this.actionLog.push({
      name: '',
      action: `--- ${state.street.toUpperCase()} ---`,
      amount: 0,
      street: state.street,
    });
    this.notifyChanged();
    this.streetTimer = setTimeout(() => this.advance(), STREET_PAUSE_MS);
  }

  private settle(): void {
    const table = this.table;
    if (!table) return;
    const { awards } = awardPots(table);

    // Showdown reveal: everyone's cards become public in the result payload.
    this.revealAll = true;

    const handNames = new Map<number, string>();
    const contenders = table.seats.filter((s) => !s.folded);
    if (contenders.length > 1 && table.board.length === 5) {
      for (const seat of contenders) {
        const ev = evaluateHand([...seat.holeCards, ...table.board]);
        handNames.set(seat.seatIndex, CATEGORY_NAMES[ev.cat]);
      }
    }

    const result: HandAward[] = [];
    let potTotal = 0;
    for (const seat of table.seats) {
      const amount = awards.get(seat.seatIndex) ?? 0;
      potTotal += seat.totalCommitted;
      const player = this.seats[seat.seatIndex];
      if (player) {
        // The table state holds the authoritative post-hand stack (blinds and
        // bets deducted); awards are layered on top of it.
        player.stack = seat.stack + amount;
      }
      result.push({
        seatIndex: seat.seatIndex,
        playerId: seat.playerId ?? null,
        name: seat.name,
        amount,
        handName: handNames.get(seat.seatIndex),
      });
    }

    // Busted bots quietly refill so the table stays playable. Busted humans
    // sit out at zero until they explicitly rebuy — losing your stack has to
    // mean something.
    for (const player of this.seats) {
      if (!player) continue;
      if (player.stack <= 0) {
        if (player.isBot) {
          player.stack = this.settings.startingStack;
        } else {
          player.sittingOut = true;
        }
      }
    }

    // Free seats whose humans left mid-hand.
    for (const playerId of this.pendingRemovals) {
      const idx = this.findSeatByPlayer(playerId);
      const seat = idx !== -1 ? this.seats[idx] : null;
      if (seat && !seat.connected) {
        this.seats[idx] = null;
      }
    }
    this.pendingRemovals.clear();

    // Queued joiners get the freed seats before the next deal.
    this.seatPendingJoins();

    this.migrateHostIfNeeded();

    this.lastResult = {
      awards: result,
      potTotal,
      viaShowdown: contenders.length > 1,
    };
    this._handsPlayed += 1;
    this.notifyChanged();
    this.onResultEmitted?.(this.lastResult);

    if (this.humanCount === 0) {
      this._status = 'lobby';
      this.table = null;
      this.notifyChanged();
      return;
    }

    this.handTimer = setTimeout(() => {
      this.deal();
    }, RESULT_PAUSE_MS);
  }

  destroy(): void {
    this.clearTimers();
    this.onStateChanged = null;
    this.onResultEmitted = null;
  }

  getStateFor(viewerId: string | null): PokerRoomStatePayload {
    const viewerSeat = viewerId !== null ? this.findSeatByPlayer(viewerId) : -1;
    const personalized: TableState | null = this.table
      ? {
          ...this.table,
          board: this.table.board.map((c) => ({ ...c })),
          seats: this.table.seats.map((seat) => {
            const reveal = this.revealAll || seat.playerId === viewerId;
            return {
              ...seat,
              holeCards: reveal
                ? seat.holeCards.map((c) => ({ ...c, showingFace: true }))
                : [
                    hiddenCard(`${seat.seatIndex}-a`),
                    hiddenCard(`${seat.seatIndex}-b`),
                  ],
            };
          }),
        }
      : null;

    const hostSeatIndex = this.hostPlayerId
      ? this.findSeatByPlayer(this.hostPlayerId)
      : -1;

    return {
      roomId: this.id,
      name: this.name,
      hostSeatIndex: hostSeatIndex !== -1 ? hostSeatIndex : null,
      status: this._status,
      settings: this.settings,
      seats: this.seats.map((s): PokerSeatView =>
        s
          ? {
              seatIndex: s.seatIndex,
              name: s.name,
              isBot: s.isBot,
              stack: s.stack,
              connected: s.connected,
              sittingOut: s.sittingOut,
            }
          : null,
      ),
      handsPlayed: this._handsPlayed,
      actionLog: this.actionLog,
      table: personalized,
      you:
        viewerSeat !== -1 && this.seats[viewerSeat]
          ? { seatIndex: viewerSeat, stack: this.seats[viewerSeat]?.stack ?? 0 }
          : null,
      youPending:
        viewerSeat === -1 &&
        viewerId !== null &&
        this.pendingJoins.has(viewerId),
      toActSeatIndex:
        this.table && !this.table.handComplete ? nextToAct(this.table) : null,
      lastResult: this.lastResult,
    };
  }
}
