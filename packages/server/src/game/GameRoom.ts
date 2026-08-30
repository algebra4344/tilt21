import {
  Game,
  GameStep,
  Move,
  PlayerStrategy,
  type GameSettings,
  type Hand,
} from '@tilt21/core';
import { db } from '../db/index.js';
import { handResults, users } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { GameState, PlayerState, RoomState } from '../types.js';

export type SeatInfo = {
  userId: string;
  seatPosition: number;
  username: string;
};

export type GameRoomOptions = {
  id: string;
  name: string;
  hostUserId: string;
  deckCount: number;
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: string;
};

export class GameRoom {
  readonly id: string;
  readonly name: string;
  hostUserId: string;
  readonly deckCount: number;
  readonly minBet: number;
  readonly maxBet: number;
  readonly maxPlayers: number;
  readonly isPrivate: boolean;

  private seats: Map<number, SeatInfo> = new Map();
  private bets: Map<string, number> = new Map();
  private chips: Map<string, number> = new Map();
  private game: Game | null = null;
  private _currentStep: GameStep = GameStep.Start;
  private playerUserIds: string[] = [];
  private pendingLeaves: Set<string> = new Set();
  private guestUserIds: Set<string> = new Set();
  private _status: 'waiting' | 'playing' | 'closed';

  constructor(opts: GameRoomOptions) {
    this.id = opts.id;
    this.name = opts.name;
    this.hostUserId = opts.hostUserId;
    this.deckCount = opts.deckCount;
    this.minBet = opts.minBet;
    this.maxBet = opts.maxBet;
    this.maxPlayers = opts.maxPlayers;
    this.isPrivate = opts.isPrivate;
    this._status = opts.status as 'waiting' | 'playing' | 'closed';
  }

  get status() {
    return this._status;
  }

  get playerCount() {
    return this.seats.size;
  }

  get currentGame() {
    return this.game;
  }

  get currentStep() {
    return this._currentStep;
  }

  join(userId: string, seatPosition: number, username: string): boolean {
    if (this.seats.size >= this.maxPlayers) return false;
    if (this.seats.has(seatPosition)) return false;

    for (const seat of this.seats.values()) {
      if (seat.userId === userId) return false;
    }

    this.seats.set(seatPosition, { userId, seatPosition, username });
    return true;
  }

  autoJoin(userId: string, username: string): boolean {
    if (this.seats.size >= this.maxPlayers) return false;

    for (const seat of this.seats.values()) {
      if (seat.userId === userId) return false;
    }

    let seatPosition = 0;
    while (this.seats.has(seatPosition)) {
      seatPosition += 1;
    }

    this.seats.set(seatPosition, { userId, seatPosition, username });
    return true;
  }

  async setChipsFromDb(userId: string): Promise<void> {
    if (this.guestUserIds.has(userId)) {
      this.setStartingChips(userId);
      return;
    }
    const [row] = await db
      .select({ chips: users.chips })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    this.chips.set(userId, row?.chips ?? 10000);
  }

  markGuest(userId: string): void {
    this.guestUserIds.add(userId);
  }

  setStartingChips(userId: string, amount = 10000): void {
    if (!this.chips.has(userId)) {
      this.chips.set(userId, amount);
    }
  }

  getChips(userId: string): number {
    return this.chips.get(userId) ?? 10000;
  }

  leave(userId: string): boolean {
    for (const [pos, seat] of this.seats) {
      if (seat.userId === userId) {
        if (this._status === 'playing' && this.game) {
          // Mid-hand: keep the seat until the hand settles so results and
          // payouts are attributed correctly, and let the core auto-play
          // the abandoned hand as an NPC.
          this.pendingLeaves.add(userId);
          this.markAsNPC(userId);
        } else {
          this.seats.delete(pos);
          this.bets.delete(userId);
        }

        if (userId === this.hostUserId) {
          const remaining = this.seats.values().next().value;
          if (remaining) {
            this.hostUserId = remaining.userId;
          }
        }
        return true;
      }
    }
    return false;
  }

  private markAsNPC(userId: string): void {
    if (!this.game) return;
    const idx = this.playerUserIds.indexOf(userId);
    if (idx < 0) return;
    const player = this.game.players[idx];
    if (!player) return;
    player.strategy = PlayerStrategy.BasicStrategy;
  }

  /**
   * Drives the game forward while the focused player is an NPC (e.g. after a
   * disconnect mid-hand). Returns true if any step was taken.
   */
  autoPlayIfNeeded(): boolean {
    if (!this.game || this._status !== 'playing') return false;

    let advanced = false;
    while (
      this._currentStep === GameStep.WaitingForPlayInput &&
      !this.game.focusedPlayer.isUser
    ) {
      const player = this.game.focusedPlayer;
      const move = player.getNPCInput(this.game, this.game.focusedHand);
      try {
        this._currentStep = this.game.step(move);
        advanced = true;
      } catch {
        break;
      }
    }
    return advanced;
  }

  private processPendingLeaves(): void {
    for (const userId of this.pendingLeaves) {
      for (const [pos, seat] of this.seats) {
        if (seat.userId === userId) {
          this.seats.delete(pos);
          this.bets.delete(userId);
          break;
        }
      }
    }
    this.pendingLeaves.clear();
  }

  placeBet(userId: string, amount: number): boolean {
    if (this._status !== 'waiting') return false;
    if (amount < this.minBet || amount > this.maxBet) return false;
    if (!this.hasPlayer(userId)) return false;
    if (amount > this.getChips(userId)) return false;

    this.bets.set(userId, amount);
    return true;
  }

  hasPlayer(userId: string): boolean {
    for (const seat of this.seats.values()) {
      if (seat.userId === userId) return true;
    }
    return false;
  }

  getSeatForUser(userId: string): SeatInfo | undefined {
    for (const seat of this.seats.values()) {
      if (seat.userId === userId) return seat;
    }
    return undefined;
  }

  startHand(): void {
    if (this.seats.size === 0) return;
    if (this._status === 'playing' && this.game) return;

    this._status = 'playing';

    const settings: Partial<GameSettings> = {
      deckCount: this.deckCount,
      minimumBet: this.minBet,
      maximumBet: this.maxBet,
      playerCount: this.seats.size,
      disableEvents: false,
      autoDeclineInsurance: true,
      checkDeviations: false,
      mode: 0,
      debug: false,
      playerBankroll: 100000,
      playerTablePosition: 1,
      playerStrategyOverride: Object.fromEntries(
        Array.from(this.seats.keys()).map((seatPosition) => [
          seatPosition + 1,
          PlayerStrategy.UserInput,
        ]),
      ),
    };

    this.game = new Game(settings);

    // The core deals turns in descending seat order (rightmost seat first),
    // so `game.players[i]` corresponds to the i-th highest occupied seat.
    this.playerUserIds = Array.from(this.seats.values())
      .sort((a, b) => b.seatPosition - a.seatPosition)
      .map((seat) => seat.userId);

    const firstBet =
      this.playerUserIds.length > 0
        ? (this.bets.get(this.playerUserIds[0]) ?? this.minBet)
        : this.minBet;
    this.game.betAmount = firstBet;

    this._currentStep = this.game.step();

    for (let i = 0; i < this.playerUserIds.length; i++) {
      const player = this.game.players[i];
      if (!player) continue;
      const bet = this.bets.get(this.playerUserIds[i]) ?? this.minBet;
      player.hands.forEach((hand: Hand) => {
        hand.betAmount = bet;
      });
    }
  }

  playerAction(
    userId: string,
    action: string,
  ): { success: boolean; step?: GameStep } {
    if (this._status !== 'playing' || !this.game) return { success: false };

    const isInsuranceAction =
      action === 'insurance' || action === 'no-insurance';
    if (isInsuranceAction) {
      if (this._currentStep !== GameStep.WaitingForInsuranceInput) {
        return { success: false };
      }
    } else if (this._currentStep !== GameStep.WaitingForPlayInput) {
      return { success: false };
    }

    const focusedIdx = this.game.state.focusedPlayerIndex;
    if (this.playerUserIds[focusedIdx] !== userId) {
      return { success: false };
    }

    const actionMap: Record<string, Move> = {
      hit: Move.Hit,
      stand: Move.Stand,
      double: Move.Double,
      split: Move.Split,
      surrender: Move.Surrender,
      insurance: Move.AskInsurance,
      'no-insurance': Move.NoInsurance,
    };

    const move = actionMap[action];
    if (move === undefined) return { success: false };

    try {
      this._currentStep = this.game.step(move);
      return { success: true, step: this._currentStep };
    } catch {
      return { success: false };
    }
  }

  advanceGame(): GameStep {
    if (!this.game) return GameStep.Start;

    try {
      this._currentStep = this.game.step();
      return this._currentStep;
    } catch {
      this._status = 'waiting';
      return GameStep.Start;
    }
  }

  async endHand(): Promise<
    { userId: string; result: string; payout: number }[]
  > {
    if (!this.game) return [];

    const runningCount = this.game.shoe.hiLoRunningCount;
    const trueCount = this.game.shoe.hiLoTrueCount;

    const results: { userId: string; result: string; payout: number }[] = [];
    const writes: Promise<unknown>[] = [];

    for (let i = 0; i < this.playerUserIds.length; i++) {
      const userId = this.playerUserIds[i];
      const player = this.game.players[i];
      if (!player) continue;

      const bet = this.bets.get(userId) ?? this.minBet;
      let netProfit = 0;
      let handsWon = 0;
      let handsLost = 0;

      player.eachHand((hand: Hand, handIdx: number) => {
        const winner = player.handWinner.get(hand.id);
        let resultStr = 'lose';
        let payout = 0;

        if (winner === 0) {
          resultStr = hand.blackjack ? 'blackjack' : 'win';
          payout = hand.blackjack ? bet * 1.5 : bet;
          handsWon += 1;
        } else if (winner === 2) {
          resultStr = 'push';
          payout = 0;
        } else if (winner === 1) {
          const isSurrender = (hand as Hand & { surrender?: boolean })
            .surrender;
          if (isSurrender) {
            resultStr = 'surrender';
            payout = -bet / 2;
          } else {
            resultStr = 'lose';
            payout = -bet;
            handsLost += 1;
          }
        }

        netProfit += payout;
        results.push({ userId, result: resultStr, payout });

        if (!this.guestUserIds.has(userId)) {
          writes.push(
            db
              .insert(handResults)
              .values({
                roomId: this.id,
                userId,
                handIndex: handIdx,
                bet,
                result: resultStr,
                payout,
                runningCount,
                trueCount,
              })
              .catch(() => {}),
          );
        }
      });

      const newChips = this.getChips(userId) + netProfit;
      this.chips.set(userId, newChips);

      if (!this.guestUserIds.has(userId)) {
        writes.push(
          db
            .update(users)
            .set({
              chips: newChips,
              gamesPlayed: sql`${users.gamesPlayed} + 1`,
              handsWon: sql`${users.handsWon} + ${handsWon}`,
              handsLost: sql`${users.handsLost} + ${handsLost}`,
              gamesWon: sql`${users.gamesWon} + ${netProfit > 0 ? 1 : 0}`,
            })
            .where(eq(users.id, userId))
            .catch(() => {}),
        );
      }
    }

    try {
      await Promise.all(writes);
    } catch (err) {
      console.error('[GameRoom] failed to persist hand results:', err);
    }

    this.processPendingLeaves();
    this._status = 'waiting';
    return results;
  }

  getState(): RoomState {
    const players = Array.from(this.seats.values()).map((seat) => ({
      userId: seat.userId,
      username: seat.username,
      seatPosition: seat.seatPosition,
      chips: this.getChips(seat.userId),
      bet: this.bets.get(seat.userId) ?? null,
    }));

    const game = this.game;
    let gameState: GameState | null = null;
    if (game && this._status === 'playing') {
      const visibleDealerCards = game.dealer.cards
        .filter((c) => c.showingFace)
        .map((c) => c.attributes());

      const hiddenCardCount = game.dealer.cards.filter(
        (c) => !c.showingFace,
      ).length;

      let dealerTotal: number | null = null;
      if (
        hiddenCardCount === 0 ||
        this.currentStep === GameStep.WaitingForNewGameInput
      ) {
        dealerTotal = game.dealer.cardTotal;
      }

      const playerStates: PlayerState[] = this.playerUserIds.map(
        (userId, i) => {
          const seat = this.seats.get(
            this.getSeatForUser(userId)?.seatPosition ?? 0,
          );
          const player = game.players[i];

          return {
            userId,
            username: seat?.username ?? '',
            seatPosition: seat?.seatPosition ?? i,
            balance: this.getChips(userId),
            hands: player
              ? player.hands.map((h, hIdx) => ({
                  id: h.id,
                  handIndex: hIdx,
                  bet: h.betAmount,
                  cards: h.cards.map((c) => c.attributes()),
                  cardTotal: h.cardTotal,
                  blackjack: h.blackjack,
                  busted: h.busted,
                }))
              : [],
            handWinner: player
              ? Object.fromEntries(
                  Array.from(player.handWinner.entries()).map(([k, v]) => [
                    k,
                    String(v),
                  ]),
                )
              : {},
          };
        },
      );

      let focusedPlayerId: string | null = null;
      if (this.currentStep === GameStep.WaitingForPlayInput) {
        const focusedIdx = game.state.focusedPlayerIndex;
        focusedPlayerId =
          this.playerUserIds[focusedIdx] ??
          this.playerUserIds[game.state.focusedHandIndex] ??
          null;
      }

      gameState = {
        step: this.currentStep,
        dealerHand: visibleDealerCards,
        dealerTotal,
        players: playerStates,
        focusedPlayerId,
        focusedHandIndex: game.state.focusedHandIndex,
        shoeCount: game.shoe.cards.length,
      };
    }

    return {
      roomId: this.id,
      name: this.name,
      hostUserId: this.hostUserId,
      deckCount: this.deckCount,
      minBet: this.minBet,
      maxBet: this.maxBet,
      maxPlayers: this.maxPlayers,
      isPrivate: this.isPrivate,
      status: this._status,
      players,
      gameState,
    };
  }
}
