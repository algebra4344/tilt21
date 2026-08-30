import { randomUUID } from 'crypto';
import type { Socket } from 'socket.io';
import { HomeRoom } from './HomeRoom.js';
import type { HomeRoomSettings } from './HomeRoom.js';
import { checkCreateAllowed, releaseRoom, trackRoom } from './roomLimits.js';

// Same trade-off as poker rooms: memory-only, invite-link only, no DB rows —
// guests have no accounts and a restart ending a game night is acceptable v1.
type Registry = Map<string, Socket>;

const SWEEP_INTERVAL_MS = 60_000;
const ZOMBIE_GRACE_MS = 3 * 60_000;

class HomeManager {
  private rooms: Map<string, HomeRoom> = new Map();
  private socketsByRoom: Map<string, Registry> = new Map();
  private lastActivity: Map<string, number> = new Map();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  create(
    name: string,
    hostPlayerId: string,
    settings: HomeRoomSettings,
    ip: string,
  ):
    | { ok: true; room: HomeRoom }
    | { ok: false; reason: 'ip-cap' | 'global-cap' } {
    const gate = checkCreateAllowed(ip);
    if (!gate.ok) return { ok: false, reason: gate.reason };

    const room = new HomeRoom(randomUUID(), name, hostPlayerId, settings);
    trackRoom(room.id, ip);
    room.onStateChanged = () => this.broadcastState(room.id);
    this.rooms.set(room.id, room);
    return { ok: true, room };
  }

  get(roomId: string): HomeRoom | undefined {
    return this.rooms.get(roomId);
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
    this.lastActivity.set(roomId, Date.now());
    const registry = this.socketsByRoom.get(roomId);
    if (!registry) return;
    for (const socket of registry.values()) {
      socket.emit('home:state', room.getStateFor(socket.data.userId ?? null));
    }
  }

  // Zombie cleanup: rooms whose humans all dropped (crash, tab killed) never
  // fire clean disconnects. Sweep them so they can't pile up and hit the
  // per-IP room cap.
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
}

export const homeManager = new HomeManager();
homeManager.startSweep();
