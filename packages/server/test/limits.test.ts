import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkCreateAllowed,
  trackRoom,
  releaseRoom,
  GLOBAL_ROOM_CAP,
} from '../src/poker/roomLimits.js';
import { HomeRoom } from '../src/poker/HomeRoom.js';
import { PokerRoom } from '../src/poker/PokerRoom.js';

describe('roomLimits', () => {
  beforeEach(() => {
    // Fresh module state per test would need reset support; use unique IPs
    // and clean up tracked rooms at the end of each test instead.
  });

  function cleanupRooms(ip: string) {
    // Can't enumerate by IP (private map); tests release what they track.
    void ip;
  }

  it('allows up to 3 active rooms per IP, then blocks', () => {
    const ip = '10.0.0.1';
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      expect(checkCreateAllowed(ip).ok).to.equal(true);
      const id = `room-${i}`;
      trackRoom(id, ip);
      ids.push(id);
    }
    expect(checkCreateAllowed(ip).ok).to.equal(false);

    // Release one -> creation allowed again.
    releaseRoom(ids[0]);
    expect(checkCreateAllowed(ip).ok).to.equal(true);

    const id = 'room-3';
    trackRoom(id, ip);
    for (const r of [ids[1], ids[2], id]) releaseRoom(r);
    expect(checkCreateAllowed(ip).ok).to.equal(true); // fully released
  });

  it('releaseRoom is idempotent and does not affect other IPs', () => {
    trackRoom('a-ip-a', '11.0.0.1');
    trackRoom('a-ip-b', '11.0.0.2');
    releaseRoom('a-ip-a');
    releaseRoom('a-ip-a'); // double release: safe
    expect(checkCreateAllowed('11.0.0.1').ok).to.equal(true);
    expect(checkCreateAllowed('11.0.0.2').ok).to.equal(true);
    releaseRoom('a-ip-b');
  });

  it('enforces the global cap', () => {
    // Fill to the cap using distinct IPs.
    let created = 0;
    for (let i = 0; created < GLOBAL_ROOM_CAP; i++) {
      const ip = `global-${i}`;
      if (!checkCreateAllowed(ip).ok) break;
      const id = `g-${i}`;
      trackRoom(id, ip);
      created++;
    }
    expect(created).to.equal(GLOBAL_ROOM_CAP);
    expect(checkCreateAllowed('fresh-ip').ok).to.equal(false);

    // Free one slot -> allowed again.
    releaseRoom('g-0');
    expect(checkCreateAllowed('fresh-ip').ok).to.equal(true);
    releaseRoom('fresh-slot');
  });
});

describe('HomeRoom.kick', () => {
  function makeRoom() {
    return new HomeRoom('kick-home', 'K', 'host-1', {
      maxPlayers: 6,
      smallBlind: 1,
      bigBlind: 2,
      startingStack: 500,
    });
  }

  it('is host-only and cannot target the host themselves', () => {
    const room = makeRoom();
    room.addPlayer('host-1', 'Host');
    room.addPlayer('p2', 'Two');

    expect(
      room.kick('p2', room.getStateFor('host-1').youSeatIndex!).ok,
    ).to.equal(false);

    // Host kicking their own seat is rejected with guidance.
    const selfIdx = room.getStateFor('host-1').youSeatIndex!;
    const self = room.kick('host-1', selfIdx);
    expect(self.ok).to.equal(false);
    expect(self.error).to.match(/Leave/);
  });

  it('frees a lobby seat immediately', () => {
    const room = makeRoom();
    room.addPlayer('host-1', 'Host');
    room.addPlayer('p2', 'Two');
    const p2Idx = room.getStateFor('p2').youSeatIndex!;

    const result = room.kick('host-1', p2Idx);
    expect(result.ok).to.equal(true);
    expect(result.kickedName).to.equal('Two');
    expect(room.getStateFor(null).seats[p2Idx]).to.equal(null);
    expect(room.hasPlayer('p2')).to.equal(false);
  });
});

describe('PokerRoom.kick', () => {
  function makeRoom() {
    return new PokerRoom('kick-poker', 'K', 'host-1', {
      maxPlayers: 6,
      smallBlind: 1,
      bigBlind: 2,
      startingStack: 400,
    });
  }

  it('kicks filler bots (deferred mid-hand, like any leave)', () => {
    const room = makeRoom();
    room.addPlayer('host-1', 'Host');
    room.startGame();

    const botSeat = room.getStateFor(null).seats.findIndex((s) => s !== null && s.isBot)!;
    const result = room.kick('host-1', botSeat);
    expect(result.ok).to.equal(true);
    expect(result.isBot).to.equal(true);

    // Hand is live -> removal deferred to settlement, seat marked gone.
    const seat = room.getStateFor(null).seats.find(
      (s) => s !== null && s.isBot && !s.connected,
    );
    expect(seat).to.not.equal(undefined);
  });

  it('defers mid-hand kicks until settlement but marks them gone', () => {
    const room = makeRoom();
    room.addPlayer('host-1', 'Host');
    room.addPlayer('p2', 'Two');
    room.startGame();

    const p2Idx = room.getStateFor('p2').you!.seatIndex;
    const result = room.kick('host-1', p2Idx);
    expect(result.ok).to.equal(true);

    // Seat still occupied mid-hand (chips must settle), marked disconnected.
    const seat = room.getStateFor(null).seats[p2Idx];
    expect(seat).to.not.equal(null);
    expect(seat!.connected).to.equal(false);
  });

  it('rejects non-host kickers', () => {
    const room = makeRoom();
    room.addPlayer('host-1', 'Host');
    room.addPlayer('p2', 'Two');
    room.startGame();

    const hostIdx = room.getStateFor('host-1').you!.seatIndex;
    expect(room.kick('p2', hostIdx).ok).to.equal(false);
  });

  it('host migration still works through voluntary leave', () => {
    const room = makeRoom();
    room.addPlayer('host-1', 'Host');
    room.addPlayer('p2', 'Two');

    room.removePlayer('host-1');
    const p2Seat = room.getStateFor('p2').you!.seatIndex;
    expect(room.getStateFor(null).hostSeatIndex).to.equal(p2Seat);
  });
});
