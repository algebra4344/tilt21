import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { handleChatMessage } from '../chat/handler.js';
import { sanitizeUsername } from '../auth/identity.js';
import type { SocketData } from '../types.js';
import { homeManager } from './homeManager.js';
import { clientIp, checkCreateAllowed } from './roomLimits.js';

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  maxPlayers: z.coerce.number().int().min(2).max(9).default(8),
  smallBlind: z.coerce.number().int().min(1).max(10_000).default(1),
  bigBlind: z.coerce.number().int().min(2).max(20_000).default(2),
  defaultBuyIn: z.coerce.number().int().min(10).max(1_000_000).default(200),
});

const actSchema = z.object({
  seatIndex: z.coerce.number().int().min(0).max(15).optional(),
  action: z.enum(['fold', 'call', 'raise']),
  amount: z.coerce.number().min(0).max(1_000_000).optional(),
});

const awardSchema = z.object({
  places: z
    .array(z.array(z.coerce.number().int().min(0).max(15)).min(1))
    .min(1)
    .max(9),
});

const amountActionSchema = z.object({
  seatIndex: z.coerce.number().int().min(0).max(15).optional(),
  amount: z.coerce.number(),
});

const sitOutSchema = z.object({
  seatIndex: z.coerce.number().int().min(0).max(15).optional(),
  sittingOut: z.boolean(),
});

const CREATE_COOLDOWN_MS = 30_000;

function gateRoomCreation(
  socket: Socket,
  data: SocketData,
): { ok: true; ip: string } | { ok: false; message: string } {
  const now = Date.now();
  if (
    data.lastRoomCreatedAt !== undefined &&
    now - data.lastRoomCreatedAt < CREATE_COOLDOWN_MS
  ) {
    return {
      ok: false,
      message: 'Please wait a moment before creating another table.',
    };
  }

  const ip = clientIp(socket);
  const gate = checkCreateAllowed(ip);
  if (!gate.ok) {
    return {
      ok: false,
      message:
        gate.reason === 'global-cap'
          ? 'Server is full right now — try again later.'
          : 'Too many active tables. Close one before opening another.',
    };
  }
  data.lastRoomCreatedAt = now;
  return { ok: true, ip };
}

export function initializeHomeHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on('home:create', (payload?: unknown) => {
      const gated = gateRoomCreation(socket, data);
      if (!gated.ok) {
        socket.emit('error', { message: gated.message });
        return;
      }

      // Clients may send settings flat or nested under `settings` — normalize.
      const raw = (payload ?? {}) as Record<string, unknown>;
      const nested = (raw.settings ?? {}) as Record<string, unknown>;
      const parsed = settingsSchema.safeParse({
        name: typeof raw.name === 'string' ? raw.name : undefined,
        maxPlayers: raw.maxPlayers ?? nested.maxPlayers,
        smallBlind: raw.smallBlind ?? nested.smallBlind,
        bigBlind: raw.bigBlind ?? nested.bigBlind,
        defaultBuyIn: raw.defaultBuyIn ?? nested.defaultBuyIn,
      });
      if (!parsed.success) {
        socket.emit('error', {
          message: parsed.error.issues[0]?.message ?? 'Invalid table settings',
        });
        return;
      }

      const created = homeManager.create(
        parsed.data.name ?? `${data.username}'s game night`,
        data.userId,
        {
          maxPlayers: parsed.data.maxPlayers,
          smallBlind: parsed.data.smallBlind,
          bigBlind: parsed.data.bigBlind,
          defaultBuyIn: parsed.data.defaultBuyIn,
        },
        gated.ip,
      );
      if (!created.ok) {
        socket.emit('error', {
          message:
            created.reason === 'global-cap'
              ? 'Server is full right now — try again later.'
              : 'Too many active tables. Close one before opening another.',
        });
        return;
      }
      const room = created.room;
      const seated = room.addPlayer(data.userId, data.username);
      if (!seated.ok) {
        socket.emit('error', { message: seated.error ?? 'Could not seat you' });
        return;
      }

      data.currentHomeRoomId = room.id;
      socket.join(room.id);
      homeManager.registerSocket(room.id, socket);

      socket.emit('home:created', { roomId: room.id });
      io.to(room.id).emit('chat:message', {
        type: 'system',
        text: `${data.username} opened the table`,
        timestamp: Date.now(),
      });
      homeManager.broadcastState(room.id);
    });

    socket.on('home:join', (payload: { roomId?: string; name?: string }) => {
      const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';
      const room = homeManager.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Table not found' });
        return;
      }

      if (data.currentHomeRoomId && data.currentHomeRoomId !== roomId) {
        leaveHomeRoom(io, socket, data);
      }

      // Optional per-join name override (from the confirm-your-seat screen).
      const joinName =
        typeof payload?.name === 'string' && payload.name.trim().length > 0
          ? sanitizeUsername(payload.name, data.username)
          : data.username;

      const result = room.addPlayer(data.userId, joinName);
      if (!result.ok) {
        socket.emit('error', { message: result.error ?? 'Could not join' });
        return;
      }

      data.currentHomeRoomId = roomId;
      socket.join(roomId);
      homeManager.registerSocket(roomId, socket);

      io.to(roomId).emit('chat:message', {
        type: 'system',
        text: result.reconnected
          ? `${joinName} is back`
          : `${joinName} sat down`,
        timestamp: Date.now(),
      });
      homeManager.broadcastState(roomId);
    });

    // Preview a table without sitting down — powers the "confirm your seat"
    // interstitial on invite links. One-shot emit, no room registration.
    socket.on('home:preview', (payload: { roomId?: string }) => {
      const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';
      const room = homeManager.get(roomId);
      if (!room) {
        socket.emit('home:preview-state', { found: false, state: null });
        return;
      }
      socket.emit('home:preview-state', {
        found: true,
        state: room.getStateFor(null),
      });
    });

    socket.on('home:get-state', () => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;
      socket.emit('home:state', room.getStateFor(data.userId));
    });

    socket.on('home:start-hand', () => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;
      const result = room.startHand(data.userId);
      if (!result.ok) {
        socket.emit('error', { message: result.error ?? 'Could not deal' });
        return;
      }
      io.to(room.id).emit('chat:message', {
        type: 'system',
        text: `Hand #${room.handsPlayed} — blinds are in`,
        timestamp: Date.now(),
      });
    });

    socket.on('home:act', (payload?: unknown) => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;

      const parsed = actSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid action' });
        return;
      }

      // seatIndex omitted -> the sender's own seat.
      let seatIndex = parsed.data.seatIndex;
      if (seatIndex === undefined) {
        seatIndex = room.getStateFor(data.userId).youSeatIndex ?? -1;
      }
      const result = room.act(
        data.userId,
        seatIndex,
        parsed.data.action,
        parsed.data.amount,
      );
      if (!result.ok) {
        socket.emit('error', { message: result.error ?? 'Invalid action' });
      }
    });

    socket.on('home:next-street', () => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;
      const result = room.nextStreet(data.userId);
      if (!result.ok) {
        socket.emit('error', {
          message: result.error ?? 'Could not deal street',
        });
      }
    });

    socket.on('home:award', (payload?: unknown) => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;

      const parsed = awardSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Pick at least one winner' });
        return;
      }
      const result = room.award(data.userId, parsed.data.places);
      if (!result.ok) {
        socket.emit('error', {
          message: result.error ?? 'Could not award pot',
        });
        return;
      }
      const winners = room
        .getStateFor(data.userId)
        .lastAward?.awards.map((a) => `${a.name} +${a.amount}`)
        .join(', ');
      io.to(room.id).emit('chat:message', {
        type: 'system',
        text: winners ? `Pot awarded — ${winners}` : 'Pot awarded',
        timestamp: Date.now(),
      });
    });

    socket.on('home:buy-in', (payload?: unknown) => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;
      const parsed = amountActionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid buy-in' });
        return;
      }
      const result = room.buyIn(
        data.userId,
        parsed.data.seatIndex,
        parsed.data.amount,
      );
      if (!result.ok) {
        socket.emit('error', { message: result.error ?? 'Buy-in failed' });
      }
    });

    socket.on('home:cash-out', (payload?: unknown) => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;
      const parsed = amountActionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid cash-out' });
        return;
      }
      const result = room.cashOut(
        data.userId,
        parsed.data.seatIndex,
        parsed.data.amount,
      );
      if (!result.ok) {
        socket.emit('error', { message: result.error ?? 'Cash-out failed' });
      }
    });

    socket.on('home:sit-out', (payload?: unknown) => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;
      const parsed = sitOutSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid request' });
        return;
      }
      const result = room.setSittingOut(
        data.userId,
        parsed.data.seatIndex,
        parsed.data.sittingOut,
      );
      if (!result.ok) {
        socket.emit('error', {
          message: result.error ?? 'Could not update seat',
        });
      }
    });

    socket.on('home:end-night', () => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;
      const result = room.endNight(data.userId);
      if (!result.ok) {
        socket.emit('error', {
          message: result.error ?? 'Could not end night',
        });
        return;
      }
      io.to(room.id).emit('chat:message', {
        type: 'system',
        text: 'Night over — time to settle up 💸',
        timestamp: Date.now(),
      });
    });

    socket.on('home:kick', (payload?: unknown) => {
      const room = data.currentHomeRoomId
        ? homeManager.get(data.currentHomeRoomId)
        : undefined;
      if (!room) return;
      const parsed = z
        .object({ seatIndex: z.coerce.number().int().min(0).max(15) })
        .safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid kick request' });
        return;
      }
      const result = room.kick(data.userId, parsed.data.seatIndex);
      if (!result.ok) {
        socket.emit('error', {
          message: result.error ?? 'Could not remove player',
        });
        return;
      }
      io.to(room.id).emit('chat:message', {
        type: 'system',
        text: `${result.kickedName} was removed by the host`,
        timestamp: Date.now(),
      });
    });

    socket.on('home:leave', () => {
      leaveHomeRoom(io, socket, data);
    });

    socket.on('chat:message', (payload: { text?: string }) => {
      if (!data.currentHomeRoomId) return;
      if (typeof payload?.text !== 'string') return;
      handleChatMessage(
        io,
        data.currentHomeRoomId,
        data.username,
        payload.text,
      );
    });

    socket.on('disconnect', () => {
      if (!data.currentHomeRoomId) return;
      const roomId = data.currentHomeRoomId;
      const room = homeManager.get(roomId);
      homeManager.unregisterSocket(roomId, socket);
      if (!room) return;
      room.removePlayer(data.userId);
      io.to(roomId).emit('chat:message', {
        type: 'system',
        text: `${data.username} left`,
        timestamp: Date.now(),
      });
      homeManager.broadcastState(roomId);
      homeManager.cleanup();
    });
  });
}

export function leaveHomeRoom(
  io: Server,
  socket: Socket,
  data: SocketData,
): void {
  if (!data.currentHomeRoomId) return;
  const roomId = data.currentHomeRoomId;
  const room = homeManager.get(roomId);

  homeManager.unregisterSocket(roomId, socket);
  socket.leave(roomId);
  data.currentHomeRoomId = null;

  if (!room) return;
  room.removePlayer(data.userId);

  io.to(roomId).emit('chat:message', {
    type: 'system',
    text: `${data.username} left the table`,
    timestamp: Date.now(),
  });
  homeManager.broadcastState(roomId);
  homeManager.cleanup();
}
