import { describe, it, expect } from 'vitest';
import { HomeRoom } from '../src/poker/HomeRoom.js';

const settings = {
  maxPlayers: 6,
  smallBlind: 5,
  bigBlind: 10,
  defaultBuyIn: 1000,
};

function makeRoom(): { room: HomeRoom; a: string; b: string; c: string } {
  const room = new HomeRoom('home-1', 'Test Night', 'host-1', { ...settings });
  return { room, a: 'host-1', b: 'guest-b-1', c: 'guest-c-1' };
}

function seatStacks(room: HomeRoom): number[] {
  return room.getStateFor(null).seats.map((s) => s?.stack ?? -1);
}

function seatIndexByName(room: HomeRoom, name: string): number {
  return room.getStateFor(null).seats.findIndex((s) => s?.name === name);
}

describe('HomeRoom', () => {
  it('seats guests with an automatic first buy-in', () => {
    const { room, a, b } = makeRoom();
    expect(room.addPlayer(a, 'Alice').ok).to.equal(true);
    expect(room.addPlayer(b, 'Bob').ok).to.equal(true);
    const state = room.getStateFor(null);
    expect(state.seats.filter(Boolean)).to.have.length(2);
    for (const seat of state.seats) {
      if (!seat) continue;
      expect(seat.stack).to.equal(settings.defaultBuyIn);
      expect(seat.boughtIn).to.equal(settings.defaultBuyIn);
    }
    // Rejoin reclaims the same seat.
    const again = room.addPlayer(a, 'Alice');
    expect(again.reconnected).to.equal(true);
    expect(room.getStateFor(null).seats.filter(Boolean)).to.have.length(2);
  });

  it('enforces host-only dealing and minimum player counts', () => {
    const { room, a, b } = makeRoom();
    room.addPlayer(a, 'Alice');
    expect(room.startHand(b as string).ok).to.equal(false); // not host
    expect(room.startHand(a).ok).to.equal(false); // only one player
    room.addPlayer(b, 'Bob');
    expect(room.startHand(a).ok).to.equal(true);
    expect(room.status).to.equal('playing');
    expect(room.handsPlayed).to.equal(1);
  });

  it('posts blinds and accepts out-of-turn actions with stack clamping', () => {
    const { room, a, b, c } = makeRoom();
    room.addPlayer(a, 'Alice');
    room.addPlayer(b, 'Bob');
    room.addPlayer(c, 'Cara');
    room.startHand(a);

    const state = room.getStateFor(null);
    expect(state.table!.pot).to.equal(settings.smallBlind + settings.bigBlind);

    // Soft turn order: actions don't need to follow seat order. Host acts for
    // the SB seat regardless of whose turn it "really" is.
    const sbSeat = state.table!.seats.findIndex((s) => s.position === 'SB');
    const result = room.act(a, sbSeat, 'raise', settings.bigBlind * 3);
    expect(result.ok).to.equal(true);
    const fresh = room.getStateFor(null).table!;
    expect(fresh.streetBets[sbSeat]).to.be.at.least(settings.bigBlind * 2);
    expect(fresh.currentBet).to.be.at.least(settings.bigBlind * 2);

    // A raise beyond the stack clamps to all-in (C acting on their own seat).
    const cIdx = seatIndexByName(room, 'Cara');
    const richSeat = fresh.seats[cIdx];
    expect(richSeat.stack).to.be.greaterThan(0);
    expect(room.act(c, cIdx, 'raise', 999_999).ok).to.equal(true);
    const clamped = room.getStateFor(null).table!.seats[cIdx];
    expect(clamped.stack).to.equal(0);

  });

  it('lets the host pace streets and shows the full board by the river', () => {
    const { room, a, b } = makeRoom();
    room.addPlayer(a, 'Alice');
    room.addPlayer(b, 'Bob');
    room.startHand(a);

    // Everyone calls to close preflop betting.
    let guard = 0;
    while (!room.getStateFor(null).bettingClosed && guard++ < 20) {
      const st = room.getStateFor(null)!;
      const idx = st.toActSeatIndex ?? -1;
      if (idx === -1) break;
      room.act(a, idx, 'call');
    }
    expect(room.getStateFor(null).bettingClosed).to.equal(true);

    const streets: number[][] = [];
    for (const _ of [0, 1, 2]) {
      const r = room.nextStreet(a);
      expect(r.ok).to.equal(true);
      streets.push(room.getStateFor(null).table!.board.map((c) => c.id));
    }
    expect(streets[0]).to.have.length(3);
    expect(streets[1]).to.have.length(4);
    expect(streets[2]).to.have.length(5);
    expect(room.nextStreet(a).ok).to.equal(false); // river is terminal
  });

  it('awards the pot to the declared winner and updates stacks', () => {
    const { room, a, b } = makeRoom();
    room.addPlayer(a, 'Alice');
    room.addPlayer(b, 'Bob');
    room.startHand(a);

    const before = seatStacks(room);

    // Fold everyone except Alice, then award her the pot.
    const aliceIdx = room.getStateFor(a).youSeatIndex!;
    const bobIdx = seatIndexByName(room, 'Bob');
    if (bobIdx !== aliceIdx) room.act(b, bobIdx, 'fold');
    expect(room.getStateFor(null).table!.handComplete).to.equal(true);

    const result = room.award(a, [[aliceIdx]]);
    expect(result.ok).to.equal(true);

    const after = seatStacks(room);
    // Chips are conserved no matter how uncalled-bet refunds shake out.
    expect(after.reduce((x, y) => x + y, 0)).to.equal(before.reduce((x, y) => x + y, 0));
    // The winner never loses chips by winning.
    expect(after[aliceIdx]).to.be.at.least(before[aliceIdx]);
  });

  it("rejects non-host awards and folded-seat winners", () => {
    const { room, a, b } = makeRoom();
    room.addPlayer(a, 'Alice');
    room.addPlayer(b, 'Bob');
    room.startHand(a);

    expect(room.award(b, [[room.getStateFor(b).youSeatIndex!]]).ok).to.equal(false);

    const bobIdx = room.getStateFor(b).youSeatIndex!;
    room.act(b, bobIdx, 'fold');
    const aliceIdx = room.getStateFor(a).youSeatIndex!;
    expect(room.award(a, [[bobIdx]]).ok).to.equal(false); // folded seat can't win
    expect(room.award(a, [[aliceIdx]]).ok).to.equal(true);
  });

  it('tracks buy-ins and cash-outs and settles the night correctly', () => {
    const { room, a, b } = makeRoom();
    room.addPlayer(a, 'Alice');
    room.addPlayer(b, 'Bob');

    room.buyIn(a, undefined, 500); // extra self buy-in
    const aliceIdx = seatIndexByName(room, 'Alice');
    expect(room.getStateFor(null).seats[aliceIdx]!.boughtIn).to.equal(1500);

    // Play a hand so chips move.
    room.startHand(a);
    const loserIdx = seatIndexByName(room, 'Bob');
    room.act(b, loserIdx, 'fold');
    const winnerIdx = seatIndexByName(room, 'Alice');
    room.award(a, [[winnerIdx]]);

    // Alice cashes out everything she has.
    const aliceStack = room.getStateFor(null).seats[winnerIdx]!.stack;
    room.cashOut(a, undefined, aliceStack);
    expect(room.getStateFor(null).seats[winnerIdx]!.stack).to.equal(0);
    expect(room.getStateFor(null).seats[winnerIdx]!.fullyOut).to.equal(true);

    expect(room.endNight(b).ok).to.equal(false); // non-host
    expect(room.endNight(a).ok).to.equal(true);

    const settlement = room.getStateFor(null).settlement!;
    const netSum = settlement.nets.reduce((sum, n) => sum + n.net, 0);
    // Chips on table + cashed out == total bought in -> nets always cancel.
    expect(netSum).to.equal(0);

    const transferSum = settlement.transfers.reduce((sum, t) => sum + t.amount, 0);
    const positiveNets = settlement.nets.filter((n) => n.net > 0);
    expect(transferSum).to.equal(positiveNets.reduce((sum, n) => sum + n.net, 0));

    // Regression: building transfers must not mutate the reported nets.
    for (const net of settlement.nets) {
      const seat = room.getStateFor(null).seats[net.seatIndex]!;
      expect(net.net).to.equal(seat.stack + seat.cashedOut - seat.boughtIn);
    }
    expect(room.status).to.equal('ended');
  });

  it('ends the night mid-hand by voiding and refunding, then blocks actions', () => {
    const { room, a, b } = makeRoom();
    room.addPlayer(a, 'Alice');
    room.addPlayer(b, 'Bob');

    // Ending a live hand voids it: every committed chip returns to stacks.
    room.startHand(a);
    const stacksBefore = room.getStateFor(null).seats.map((s) => s?.stack ?? 0);
    expect(room.endNight(a).ok).to.equal(true);
    const stacksAfter = room.getStateFor(null).seats.map((s) => s?.stack ?? 0);
    expect(stacksAfter).to.deep.equal(stacksBefore); // blinds refunded, nothing lost

    expect(room.act(a, 0, 'call').ok).to.equal(false);
    expect(room.buyIn(a, undefined, 100).ok).to.equal(false);

    room.removePlayer(a);
    room.removePlayer(b);
    expect(room.humanCount).to.equal(0);
  });
});
