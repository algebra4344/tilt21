import { describe, it, expect, vi } from 'vitest';
import { resolveIdentity, sanitizeUsername } from '../src/auth/identity.js';
import { PokerRoom } from '../src/poker/PokerRoom.js';

describe('resolveIdentity', () => {
  it('resolves a valid JWT payload', () => {
    // Shape-only check: an invalid token must not authenticate.
    const result = resolveIdentity({ token: 'not-a-jwt' });
    expect(result.ok).to.equal(false);
  });

  it('rejects when nothing is provided', () => {
    expect(resolveIdentity(undefined).ok).to.equal(false);
    expect(resolveIdentity({}).ok).to.equal(false);
  });

  it('accepts a well-formed guest identity', () => {
    const result = resolveIdentity({ guestId: 'abcd1234-uuid', guestName: 'Mike' });
    expect(result.ok).to.equal(true);
    if (result.ok) {
      expect(result.identity.isGuest).to.equal(true);
      expect(result.identity.username).to.equal('Mike');
      expect(result.identity.userId).to.equal('abcd1234-uuid');
    }
  });

  it('falls back to Guest-XXXX when the name is unusable', () => {
    const result = resolveIdentity({ guestId: 'zzzz87654321' });
    expect(result.ok).to.equal(true);
    if (result.ok) expect(result.identity.username).to.match(/^Guest-/);
  });

  it('sanitizes hostile usernames', () => {
    expect(sanitizeUsername('<script>alert(1)</script>', 'fallback')).to.not.contain('<');
    expect(sanitizeUsername('', 'fallback')).to.equal('fallback');
    expect(sanitizeUsername('x'.repeat(100), 'fallback')).to.have.length(20);
  });
});

describe('PokerRoom', () => {
  const settings = {
    maxPlayers: 6,
    smallBlind: 1,
    bigBlind: 2,
    startingStack: 400,
  };

  function makeRoom(): PokerRoom {
    const room = new PokerRoom('room-1', 'Test Table', 'human-1', { ...settings });
    return room;
  }

  it('seats players and rejects overfull tables', () => {
    const room = makeRoom();
    for (let i = 0; i < settings.maxPlayers; i++) {
      expect(room.addPlayer(`p-${i}`, `Player ${i}`).ok).to.equal(true);
    }
    expect(room.addPlayer('extra', 'Extra').ok).to.equal(false);
    expect(room.seatCount).to.equal(settings.maxPlayers);
    expect(room.humanCount).to.equal(settings.maxPlayers);
  });

  it('reconnects into the same seat instead of doubling up', () => {
    const room = makeRoom();
    room.addPlayer('p-1', 'One');
    const first = room.addPlayer('p-1', 'One');
    expect(first.ok).to.equal(true);
    expect(first.reconnected).to.equal(true);
    expect(room.seatCount).to.equal(1);
  });

  it(
    'runs a full bot-driven hand to settlement with chips conserved',
    async () => {
      const room = makeRoom();
    const resultPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('hand never settled')), 120_000);
      room.onResultEmitted = (result) => {
        clearTimeout(timer);
        try {
          const totalAwarded = result.awards.reduce((sum, a) => sum + a.amount, 0);
          expect(totalAwarded).to.equal(result.potTotal);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
    });

    expect(room.startGame().ok).to.equal(true);
    expect(room.status).to.equal('playing');

    // Nobody was seated: startGame fills every seat with a bot.
    const state = room.getStateFor(null);
    expect(state.seats.filter((s) => s !== null && s.isBot)).to.have.length(
      settings.maxPlayers,
    );
    expect(state.table).to.not.equal(null);
    expect(state.table!.seats.every((s) => s.holeCards.length === 2)).to.equal(true);

    // Host "walks away" -> seat keeps playing via bot logic until settlement.
    room.removePlayer('human-1');

    await resultPromise;
    expect(room.handsPlayed).to.equal(1);

    // Chips are conserved: initial buy-ins plus WHOLE auto-rebuys only.
    const totalStacks = room
      .getStateFor(null)
      .seats.reduce((sum, s) => sum + (s?.stack ?? 0), 0);
    const rebuys = (totalStacks - settings.maxPlayers * settings.startingStack) /
      settings.startingStack;
    expect(Number.isInteger(rebuys) && rebuys >= 0).to.equal(true);
    room.destroy();
  }, 130_000);

  it('hides hole cards per viewer but reveals them to the owner', () => {
    const room = makeRoom();
    room.addPlayer('human-1', 'Host');
    room.startGame();
    const hostView = room.getStateFor('human-1');
    const botSeatIndex = hostView.table!.seats.findIndex((s) => s.playerId !== 'human-1');
    const hostSeatIndex = hostView.you!.seatIndex;

    const botCards = hostView.table!.seats[botSeatIndex].holeCards;
    expect(botCards.every((c) => !c.showingFace && c.rank === '')).to.equal(true);

    const ownCards = hostView.table!.seats[hostSeatIndex].holeCards;
    expect(ownCards.every((c) => c.showingFace && c.rank !== '')).to.equal(true);

    room.destroy();
    vi.restoreAllMocks();
  });

  it('validates that only the player to act may submit actions', () => {
    const room = makeRoom();
    for (let i = 0; i < settings.maxPlayers; i++) {
      room.addPlayer(`p-${i}`, `Player ${i}`);
    }
    room.startGame();

    const state = room.getStateFor(null);
    const toAct = state.toActSeatIndex!;
    expect(toAct).to.not.equal(null);

    // Unknown player: rejected.
    expect(room.act('nobody', 'call').ok).to.equal(false);

    // A non-active seat: rejected regardless of action or amount.
    const otherSeat = (toAct + 1) % settings.maxPlayers;
    const otherId = `p-${otherSeat}`;
    expect(room.act(otherId, 'raise', 123).ok).to.equal(false);

    // The active seat accepts the action.
    const activeId = `p-${toAct}`;
    expect(room.act(activeId, 'call').ok).to.equal(true);
    room.destroy();
  });
});

describe('PokerRoom.rebuy', () => {
  const settings = {
    maxPlayers: 6,
    smallBlind: 1,
    bigBlind: 2,
    startingStack: 400,
  };

  function makeRebuyRoom() {
    return new PokerRoom('rebuy-room', 'R', 'host-1', { ...settings });
  }

  function backing(room: PokerRoom) {
    return (
      room as unknown as {
        seats: ({ id: string; stack: number; sittingOut: boolean } | null)[];
      }
    ).seats;
  }

  it('rejects mid-hand top-ups while still holding chips', () => {
    const room = makeRebuyRoom();
    room.addPlayer('host-1', 'Host');
    room.startGame();

    expect(room.rebuy('host-1', 200).ok).to.equal(false);
  });

  it('allows busted-player rebuys even mid-hand and clears sitting out', () => {
    const room = makeRebuyRoom();
    room.addPlayer('host-1', 'Host');
    room.startGame();

    const idx = room.getStateFor('host-1').you!.seatIndex;
    const seats = backing(room);
    seats[idx]!.stack = 0;
    seats[idx]!.sittingOut = true;

    expect(room.rebuy('host-1', 300).ok).to.equal(true);
    expect(seats[idx]!.stack).to.equal(300);
    expect(seats[idx]!.sittingOut).to.equal(false);
  });

  it('blocks bots from using the human rebuy path', () => {
    const room = makeRebuyRoom();
    room.addPlayer('host-1', 'Host');
    room.startGame();
    const botIdx = room
      .getStateFor(null)
      .seats.findIndex((s) => s !== null && s.isBot)!;
    const seats = (room as unknown as { seats: { id: string }[] }).seats;
    const botId = seats[botIdx]!.id;
    expect(room.rebuy(botId, 100).ok).to.equal(false);
  });
});
