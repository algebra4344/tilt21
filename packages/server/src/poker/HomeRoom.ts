import {
  advanceStreet,
  applyAction,
  awardByRanking,
  buildTableFromSeats,
  createDeck,
  getCallAmount,
  getRaiseCommitted,
  nextToAct,
} from '@tilt21/core';
import type { PokerAction, PokerCard, TableState } from '@tilt21/core';

export type HomeRoomSettings = {
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  defaultBuyIn: number;
};

const hiddenCard = (seed: string): PokerCard => ({
  id: `hidden-${seed}`,
  suit: 's',
  rank: '',
  showingFace: false,
});

export type HomePlayer = {
  id: string;
  name: string;
  stack: number;
  boughtIn: number;
  cashedOut: number;
  sittingOut: boolean;
  fullyOut: boolean;
  connected: boolean;
};

export type HomeSeatView =
  (Omit<HomePlayer, 'id'> & { seatIndex: number }) | null;

export type HomeActionLogEntry = {
  name: string;
  action: string;
  amount: number;
  street: string;
};

export type AwardView = {
  seatIndex: number;
  name: string;
  amount: number;
};

export type LastAwardView = {
  places: number[][];
  awards: AwardView[];
};

export type SettlementView = {
  nets: { seatIndex: number; name: string; net: number }[];
  transfers: { from: string; to: string; amount: number }[];
  chipsOnTable: number;
};

export type HomeRoomStatePayload = {
  roomId: string;
  name: string;
  hostSeatIndex: number | null;
  status: 'lobby' | 'playing' | 'ended';
  settings: HomeRoomSettings;
  seats: HomeSeatView[];
  handsPlayed: number;
  actionLog: HomeActionLogEntry[];
  table: TableState | null;
  youSeatIndex: number | null;
  toActSeatIndex: number | null;
  bettingClosed: boolean;
  lastAward: LastAwardView | null;
  settlement: SettlementView | null;
};

type HomeSeat = (HomePlayer & { seatIndex: number }) | null;

export class HomeRoom {
  readonly id: string;
  name: string;
  hostPlayerId: string | null;
  readonly settings: HomeRoomSettings;

  private seats: HomeSeat[] = [];
  private table: TableState | null = null;
  private deck: ReturnType<typeof createDeck> = [];
  /** Public per-hand action feed; reset each deal. */
  private actionLog: HomeActionLogEntry[] = [];
  private dealerIndex = -1;
  private _handsPlayed = 0;
  private _status: 'lobby' | 'playing' | 'ended' = 'lobby';
  private lastAward: LastAwardView | null = null;
  private settlement: SettlementView | null = null;

  onStateChanged: (() => void) | null = null;

  constructor(
    id: string,
    name: string,
    hostPlayerId: string | null,
    settings: HomeRoomSettings,
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
    return this.seats.filter((s) => s !== null).length;
  }

  /** Any live human socket attached to a seat? */
  anyConnected(): boolean {
    return this.seats.some((s) => s !== null && s.connected);
  }

  private findSeatByPlayer(playerId: string): number {
    return this.seats.findIndex((s) => s !== null && s.id === playerId);
  }

  private notify(): void {
    this.onStateChanged?.();
  }

  private makeSeat(
    seatIndex: number,
    id: string,
    name: string,
    initialBuyIn: number,
  ): HomeSeat {
    return {
      seatIndex,
      id,
      name,
      stack: initialBuyIn,
      boughtIn: initialBuyIn,
      cashedOut: 0,
      sittingOut: false,
      fullyOut: false,
      connected: true,
    };
  }

  addPlayer(
    playerId: string,
    username: string,
  ): { ok: boolean; error?: string; reconnected?: boolean } {
    const existing = this.findSeatByPlayer(playerId);
    if (existing !== -1) {
      const seat = this.seats[existing];
      if (!seat) return { ok: false, error: 'Seat not found' };
      seat.name = username;
      seat.connected = true;
      this.notify();
      return { ok: true, reconnected: true };
    }
    if (this._status === 'ended')
      return { ok: false, error: 'This game has ended' };

    const empty = this.seats.findIndex((s) => s === null);
    if (empty === -1) return { ok: false, error: 'Table is full' };

    // Zero-friction join: an automatic first buy-in lands you straight in the game.
    this.seats[empty] = this.makeSeat(
      empty,
      playerId,
      username,
      this.settings.defaultBuyIn,
    );
    this.notify();
    return { ok: true };
  }

  removePlayer(playerId: string): void {
    const idx = this.findSeatByPlayer(playerId);
    if (idx === -1) return;
    const seat = this.seats[idx];
    if (seat) seat.connected = false;

    const midHand =
      this._status === 'playing' &&
      this.table !== null &&
      !this.table.handComplete;

    if (!midHand) {
      this.seats[idx] = null;
    }
    // Mid-hand the seat stays visible until the hand is awarded; the host can
    // fold it on the player's behalf. Nothing auto-plays in home games.

    if (this.hostPlayerId === playerId) {
      const nextHost = this.seats.find((s) => s !== null);
      this.hostPlayerId = nextHost ? nextHost.id : null;
    }
    this.notify();
  }

  // Host removes a player from a seat.
  kick(
    actorId: string,
    seatIndex: number,
  ): { ok: boolean; kickedName?: string; error?: string } {
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

    const result = { ok: true as const, kickedName: target.name };
    this.removePlayer(target.id);
    return result;
  }

  hasPlayer(playerId: string): boolean {
    return this.findSeatByPlayer(playerId) !== -1;
  }

  private eligibleSeats(): (HomePlayer & { seatIndex: number })[] {
    return this.seats.filter(
      (s): s is HomePlayer & { seatIndex: number } =>
        s !== null && !s.fullyOut && !s.sittingOut && s.stack > 0,
    );
  }

  startHand(actorId: string): { ok: boolean; error?: string } {
    if (this._status === 'ended') return { ok: false, error: 'Game has ended' };
    if (actorId !== this.hostPlayerId)
      return { ok: false, error: 'Only the host can deal' };
    if (this.table && !this.table.handComplete && this._status === 'playing') {
      return { ok: false, error: 'Finish the current hand first' };
    }

    // Compact seating: eligible players move to the front so the hand's table
    // is sized exactly to the live field. Positions and blinds then always map
    // onto real players — empty/sitting-out seats trail behind, dealt out.
    const active = this.eligibleSeats();
    if (active.length < 2) {
      return { ok: false, error: 'Need at least 2 players with chips to deal' };
    }
    const inactive = this.seats.filter(
      (s): s is HomePlayer & { seatIndex: number } =>
        s !== null && !active.some((a) => a.id === s.id),
    );
    const ordered = [...active, ...inactive];
    ordered.forEach((p, i) => {
      p.seatIndex = i;
    });
    this.seats = [
      ...ordered,
      ...Array.from(
        { length: this.settings.maxPlayers - ordered.length },
        () => null,
      ),
    ];
    this.dealerIndex = -1;

    let attempts = 0;
    do {
      this.dealerIndex = (this.dealerIndex + 1) % active.length;
      attempts++;
    } while (attempts <= active.length);

    this.deck = createDeck();
    const descriptors = this.seats.slice(0, active.length).map((s) => ({
      name: s ? s.name : '',
      playerId: s ? s.id : null,
      stack: s ? s.stack : 0,
    }));
    this.table = buildTableFromSeats(
      this.dealerIndex,
      descriptors,
      this.settings.smallBlind,
      this.settings.bigBlind,
      this.deck,
    );
    this.lastAward = null;
    this.actionLog = [];
    this._status = 'playing';
    this._handsPlayed += 1;
    this.notify();
    return { ok: true };
  }

  act(
    actorId: string,
    seatIndex: number,
    action: PokerAction,
    amount?: number,
  ): { ok: boolean; error?: string } {
    if (this._status !== 'playing' || !this.table)
      return { ok: false, error: 'No hand running' };
    if (this.table.handComplete)
      return { ok: false, error: 'Hand is over — declare a winner' };

    const player = this.seats[seatIndex];
    if (!player) return { ok: false, error: 'Empty seat' };
    if (actorId !== player.id && actorId !== this.hostPlayerId) {
      return { ok: false, error: 'You can only act for yourself' };
    }
    const seat = this.table.seats[seatIndex];
    if (!seat) return { ok: false, error: 'You are not in this hand' };
    if (player.fullyOut || player.sittingOut)
      return { ok: false, error: 'Seat is sitting out' };
    if (seat.folded) return { ok: false, error: 'Already folded' };
    if (seat.stack <= 0) return { ok: false, error: 'Seat is all-in' };

    let committed = 0;
    if (action === 'call') {
      committed = getCallAmount(this.table, seatIndex);
    } else if (action === 'raise') {
      const fallbackTarget =
        this.table.currentBet > 0
          ? this.table.currentBet * 2
          : Math.max(this.settings.bigBlind * 2, this.table.minRaise);
      committed = getRaiseCommitted(
        this.table,
        seatIndex,
        amount ?? fallbackTarget,
      );
    }

    const prevTable = this.table;
    this.table = applyAction(this.table, seatIndex, action, committed);
    {
      const committedNow =
        this.table.streetBets[seatIndex] - prevTable.streetBets[seatIndex];
      const amount =
        action === 'fold'
          ? 0
          : action === 'call'
            ? Math.min(committedNow, this.table.currentBet)
            : this.table.currentBet;
      this.actionLog.push({
        name: player.name,
        action,
        amount,
        street: this.table.street,
      });
      if (this.actionLog.length > 120)
        this.actionLog.splice(0, this.actionLog.length - 120);
    }
    this.notify();
    return { ok: true };
  }

  nextStreet(actorId: string): { ok: boolean; dealt: number; error?: string } {
    if (this._status !== 'playing' || !this.table) {
      return { ok: false, dealt: 0, error: 'No hand running' };
    }
    if (actorId !== this.hostPlayerId) {
      return { ok: false, dealt: 0, error: 'Only the host deals streets' };
    }
    if (this.table.handComplete) {
      return { ok: false, dealt: 0, error: 'Hand is over — declare a winner' };
    }
    if (this.table.street === 'river') {
      return {
        ok: false,
        dealt: 0,
        error: 'Board is complete — declare a winner',
      };
    }

    const { state: nextState, dealt } = advanceStreet(this.table, this.deck);
    this.table = nextState;
    this.actionLog.push({
      name: '',
      action: `--- ${nextState.street.toUpperCase()} ---`,
      amount: 0,
      street: nextState.street,
    });
    this.notify();
    return { ok: true, dealt: dealt.length };
  }

  award(actorId: string, places: number[][]): { ok: boolean; error?: string } {
    if (this._status !== 'playing' || !this.table) {
      return { ok: false, error: 'No hand running' };
    }
    if (actorId !== this.hostPlayerId) {
      return { ok: false, error: 'Only the host declares winners' };
    }

    const flat = places.flat();
    if (flat.length === 0)
      return { ok: false, error: 'Pick at least one winner' };
    for (const seatIndex of flat) {
      const seat = this.table.seats[seatIndex];
      if (!seat || seat.folded) {
        return {
          ok: false,
          error: 'Winners must be players still in the hand',
        };
      }
    }

    const { awards } = awardByRanking(this.table, places);
    const awardViews: AwardView[] = [];
    for (const seat of this.table.seats) {
      const amount = awards.get(seat.seatIndex) ?? 0;
      const player = this.seats[seat.seatIndex];
      if (player) {
        // The engine's table holds post-bet stacks; layer the award on top.
        player.stack = seat.stack + amount;
      }
      if (amount > 0) {
        awardViews.push({ seatIndex: seat.seatIndex, name: seat.name, amount });
      }
    }
    this.lastAward = { places, awards: awardViews };
    if (!this.table) return { ok: false, error: 'No active hand' };

    for (const a of awardViews) {
      this.actionLog.push({
        name: a.name,
        action: 'wins',
        amount: a.amount,
        street: this.table.street,
      });
    }
    // Mark the hand complete so the host can deal again even after a
    // checked-down river (fold-wins already set this via applyAction).
    this.table = { ...this.table, handComplete: true };
    this.notify();
    return { ok: true };
  }

  private resolveTarget(
    actorId: string,
    seatIndex: number | undefined,
  ):
    | { ok: true; player: HomePlayer; seatIndex: number }
    | { ok: false; error: string } {
    const idx =
      seatIndex !== undefined ? seatIndex : this.findSeatByPlayer(actorId);
    if (idx === -1) return { ok: false, error: 'Not seated' };
    const player = this.seats[idx];
    if (!player) return { ok: false, error: 'Empty seat' };
    const allowed = player.id === actorId || actorId === this.hostPlayerId;
    if (!allowed)
      return { ok: false, error: 'Only the host can do that for others' };
    return { ok: true, player, seatIndex: idx };
  }

  buyIn(
    actorId: string,
    seatIndex: number | undefined,
    rawAmount: number,
  ): { ok: boolean; error?: string } {
    const target = this.resolveTarget(actorId, seatIndex);
    if (!target.ok) return target;
    const amount = Math.floor(rawAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) {
      return { ok: false, error: 'Invalid buy-in amount' };
    }
    if (this._status === 'ended') return { ok: false, error: 'Game has ended' };
    target.player.stack += amount;
    target.player.boughtIn += amount;
    target.player.sittingOut = false;
    target.player.fullyOut = false;
    this.notify();
    return { ok: true };
  }

  cashOut(
    actorId: string,
    seatIndex: number | undefined,
    rawAmount: number,
  ): { ok: boolean; error?: string } {
    const target = this.resolveTarget(actorId, seatIndex);
    if (!target.ok) return target;
    const amount = Math.min(Math.floor(rawAmount), target.player.stack);
    if (!Number.isFinite(amount) || amount < 1) {
      return { ok: false, error: 'Invalid cash-out amount' };
    }
    target.player.stack -= amount;
    target.player.cashedOut += amount;
    if (target.player.stack === 0) target.player.fullyOut = true;
    this.notify();
    return { ok: true };
  }

  setSittingOut(
    actorId: string,
    seatIndex: number | undefined,
    sittingOut: boolean,
  ): { ok: boolean; error?: string } {
    const target = this.resolveTarget(actorId, seatIndex);
    if (!target.ok) return target;
    if (
      sittingOut &&
      this._status === 'playing' &&
      this.table &&
      !this.table.handComplete
    ) {
      const seat = this.table.seats[target.seatIndex];
      if (seat && !seat.folded) {
        return { ok: false, error: 'Finish your hand before sitting out' };
      }
    }
    target.player.sittingOut = sittingOut;
    this.notify();
    return { ok: true };
  }

  endNight(actorId: string): { ok: boolean; error?: string } {
    if (actorId !== this.hostPlayerId)
      return { ok: false, error: 'Only the host ends the night' };
    if (this._status === 'ended') return { ok: false, error: 'Already ended' };
    if (this._status === 'playing' && this.table && !this.table.handComplete) {
      // Night's over mid-hand: void it — refund every committed chip back to
      // the player stacks so nobody's money disappears, then settle.
      for (const seat of this.table.seats) {
        const player = this.seats[seat.seatIndex];
        if (player && seat.totalCommitted > 0) {
          // Room stacks are never deducted during betting — the table's
          // post-bet stack holds the deduction. Restore like award() does.
          player.stack = seat.stack + seat.totalCommitted;
        }
      }
      this.table = { ...this.table, handComplete: true };
    }

    const seated = this.seats.filter(
      (s): s is HomePlayer & { seatIndex: number } => s !== null,
    );
    const nets = seated.map((p) => ({
      seatIndex: p.seatIndex,
      name: p.name,
      net: p.stack + p.cashedOut - p.boughtIn,
    }));

    const debtors = nets
      .filter((n) => n.net < 0)
      .sort((a, b) => a.net - b.net)
      .map((n) => ({ ...n }));
    const creditors = nets
      .filter((n) => n.net > 0)
      .sort((a, b) => b.net - a.net)
      .map((n) => ({ ...n }));
    const transfers: SettlementView['transfers'] = [];
    let ci = 0;
    for (const debtor of debtors) {
      let remaining = -debtor.net;
      while (remaining > 0 && ci < creditors.length) {
        const credit = creditors[ci];
        const pay = Math.min(remaining, credit.net);
        if (pay > 0) {
          transfers.push({ from: debtor.name, to: credit.name, amount: pay });
          credit.net -= pay;
          remaining -= pay;
        }
        if (credit.net <= 0) ci++;
      }
    }

    this.settlement = {
      nets: nets.map((n) => ({ ...n })),
      transfers,
      chipsOnTable: seated.reduce((sum, p) => sum + p.stack, 0),
    };
    this._status = 'ended';
    this.notify();
    return { ok: true };
  }

  destroy(): void {
    this.onStateChanged = null;
  }

  getStateFor(viewerId: string | null): HomeRoomStatePayload {
    const viewerSeat = viewerId !== null ? this.findSeatByPlayer(viewerId) : -1;
    const bettingClosed =
      this.table !== null &&
      !this.table.handComplete &&
      nextToAct(this.table) === -1;

    const personalized: TableState | null = this.table
      ? {
          ...this.table,
          board: this.table.board.map((c) => ({ ...c })),
          seats: this.table.seats.map((seat) => {
            const reveal = seat.playerId === viewerId;
            return {
              ...seat,
              playerId: reveal ? seat.playerId : null,
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
      seats: this.seats.map((s) =>
        s
          ? {
              seatIndex: s.seatIndex,
              name: s.name,
              stack: s.stack,
              boughtIn: s.boughtIn,
              cashedOut: s.cashedOut,
              sittingOut: s.sittingOut,
              fullyOut: s.fullyOut,
              connected: s.connected,
            }
          : null,
      ),
      handsPlayed: this._handsPlayed,
      actionLog: this.actionLog,
      table: personalized,
      youSeatIndex: viewerSeat !== -1 ? viewerSeat : null,
      toActSeatIndex:
        this.table && !this.table.handComplete ? nextToAct(this.table) : null,
      bettingClosed,
      lastAward: this.lastAward,
      settlement: this.settlement,
    };
  }
}
