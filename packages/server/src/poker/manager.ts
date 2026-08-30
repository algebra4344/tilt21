import { randomUUID } from 'crypto';
import type { Socket } from 'socket.io';
import { PokerRoom } from './PokerRoom.js';
import type { PokerRoomSettings, PublicRoomSummary } from './PokerRoom.js';
import { checkCreateAllowed, releaseRoom, trackRoom } from './roomLimits.js';

// Poker rooms are intentionally memory-only: guests have no DB rows, rooms are
// invite-link only, and a restart ending games is already true for blackjack.
type Registry = Map<string, Socket>;

const SWEEP_INTERVAL_MS = 60_000;
const ZOMBIE_GRACE_MS = 3 * 60_000;

class PokerManager {
  private rooms: Map<string, PokerRoom> = new Map();
  private socketsByRoom: Map<string, Registry> = new Map();
  private lastActivity: Map<string, number> = new Map();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  create(
    name: string,
    hostPlayerId: string,
    settings: PokerRoomSettings,
    ip: string,
  ):
    | { ok: true; room: PokerRoom }
    | { ok: false; reason: 'ip-cap' | 'global-cap' } {
    const gate = checkCreateAllowed(ip);
    if (!gate.ok) return { ok: false, reason: gate.reason };

    const room = new PokerRoom(randomUUID(), name, hostPlayerId, settings);
    trackRoom(room.id, ip);
    room.onStateChanged = () => this.broadcastState(room.id);
    room.onResultEmitted = () => {
      // Result payload rides along inside the next personalized state push.
      this.broadcastState(room.id);
    };
    this.rooms.set(room.id, room);
    return { ok: true, room };
  }

  get(roomId: string): PokerRoom | undefined {
    return this.rooms.get(roomId);
  }

  /** Public tables with at least one live human — the joinable lobby list. */
  listPublicRooms(): PublicRoomSummary[] {
    const out: PublicRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (!room.settings.isPublic) continue;
      if (!room.anyConnected()) continue;
      out.push(room.publicView());
    }
    return out;
  }

  registerSocket(roomId: string, socket: Socket): void {
    let registry = this.socketsByRoom.get(roomId);
    if (!registry) {
      registry = new Map();
      this.socketsByRoom.set(roomId, registry);
    }
    registry.set(socket.id, socket);
  }

  unregisterSocket(roomId: string, socket: Socket): void {
    this.socketsByRoom.get(roomId)?.delete(socket.id);
  }

  broadcastState(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const registry = this.socketsByRoom.get(roomId);
    if (!registry) return;
    for (const socket of registry.values()) {
      socket.emit('poker:state', room.getStateFor(socket.data.userId ?? null));
    }
  }

  // Zombie cleanup: rooms whose humans all dropped never fire clean
  // disconnects; sweep them so they can't pile up against the per-IP cap.
  startSweep(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms) {
        const idleFor = now - (this.lastActivity.get(roomId) ?? now);
        const grace = room.anyConnected() ? 10 * 60_000 : ZOMBIE_GRACE_MS;
        if (idleFor > grace) {
          room.destroy();
          this.rooms.delete(roomId);
          this.socketsByRoom.delete(roomId);
          this.lastActivity.delete(roomId);
          releaseRoom(roomId);
        }
      }
    }, SWEEP_INTERVAL_MS);
  }

  // Rooms with no humans left have no reason to exist.
  cleanup(): void {
    for (const [roomId, room] of this.rooms) {
      if (room.humanCount === 0) {
        room.destroy();
        this.rooms.delete(roomId);
        this.socketsByRoom.delete(roomId);
        releaseRoom(roomId);
      }
    }
  }

  stats(): { rooms: number; players: number } {
    let players = 0;
    for (const room of this.rooms.values()) players += room.humanCount;
    return { rooms: this.rooms.size, players };
  }
}

export const pokerManager = new PokerManager();
pokerManager.startSweep();
