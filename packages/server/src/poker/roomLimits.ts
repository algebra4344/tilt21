// Invisible anti-spam limits for social table creation. No auth, no friction
// for legit users — just caps so scripted abuse can't exhaust the memory-only
// room store.

const MAX_ACTIVE_ROOMS_PER_IP = 3;
export const GLOBAL_ROOM_CAP = 200;

// roomId -> creator IP, so releases find the right counter.
const roomIps = new Map<string, string>();
const ipCounts = new Map<string, number>();

export function clientIp(socket: {
  handshake: { headers: Record<string, unknown>; address?: string };
}): string {
  const fwd = socket.handshake.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return socket.handshake.address ?? 'unknown';
}

export type CreateGateResult =
  { ok: true } | { ok: false; reason: 'ip-cap' | 'global-cap' };

function activeRooms(): number {
  let n = 0;
  for (const count of ipCounts.values()) n += count;
  // ipCounts should mirror roomIps; belt-and-suspenders against drift.
  if (n < roomIps.size) n = roomIps.size;
  return n;
}

export function checkCreateAllowed(ip: string): CreateGateResult {
  if (activeRooms() >= GLOBAL_ROOM_CAP)
    return { ok: false, reason: 'global-cap' };
  if ((ipCounts.get(ip) ?? 0) >= MAX_ACTIVE_ROOMS_PER_IP) {
    return { ok: false, reason: 'ip-cap' };
  }
  return { ok: true };
}

/** Records a newly created room against its creator's IP. */
export function trackRoom(roomId: string, ip: string): void {
  if (roomIps.has(roomId)) return;
  roomIps.set(roomId, ip);
  ipCounts.set(ip, (ipCounts.get(ip) ?? 0) + 1);
}

/** Releases a room (called when managers delete it). Idempotent. */
export function releaseRoom(roomId: string): void {
  const ip = roomIps.get(roomId);
  if (ip === undefined) return;
  roomIps.delete(roomId);
  const next = (ipCounts.get(ip) ?? 1) - 1;
  if (next <= 0) ipCounts.delete(ip);
  else ipCounts.set(ip, next);
}
