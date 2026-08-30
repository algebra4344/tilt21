import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { sanitizeUsername } from '../auth/identity.js';
import { handleChatMessage } from '../chat/handler.js';
import type { SocketData } from '../types.js';
import { pokerManager } from './manager.js';
import { clientIp, checkCreateAllowed } from './roomLimits.js';
import type { PokerAction } from '@tilt21/core';

const ACTION_SET = new Set<PokerAction>(['fold', 'call', 'raise']);

const settingsSchema = z.object({
  maxPlayers: z.coerce.number().int().min(2).max(9).default(6),
  smallBlind: z.coerce.number().int().min(1).max(10_000).default(1),
  bigBlind: z.coerce.number().int().min(2).max(20_000).default(2),
  startingStack: z.coerce.number().int().min(50).max(1_000_000).default(400),
  isPublic: z.boolean().default(true),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  settings: settingsSchema.partial().optional(),
});

const actionSchema = z.object({
  action: z.enum(['fold', 'call', 'raise']),
  amount: z.coerce.number().min(0).max(1_000_000).optional(),
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

export function initializePokerHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on('poker:create', (payload?: unknown) => {
      const gated = gateRoomCreation(socket, data);
      if (!gated.ok) {
        socket.emit('error', { message: gated.message });
        return;
      }

      // Clients may send settings flat or nested under `settings` — normalize.
      const raw = (payload ?? {}) as Record<string, unknown>;
      const nested = (raw.settings ?? {}) as Record<string, unknown>;
      const parsed = createSchema.safeParse({
        name: typeof raw.name === 'string' ? raw.name : undefined,
        settings: {
          maxPlayers: raw.maxPlayers ?? nested.maxPlayers,
          smallBlind: raw.smallBlind ?? nested.smallBlind,
          bigBlind: raw.bigBlind ?? nested.bigBlind,
          startingStack: raw.startingStack ?? nested.startingStack,
          isPublic: raw.isPublic ?? nested.isPublic,
        },
      });
      if (!parsed.success) {
        socket.emit('error', {
          message: parsed.error.issues[0]?.message ?? 'Invalid room settings',
        });
        return;
      }

      const partial = parsed.data.settings ?? {};
      const merged = settingsSchema.parse({
        maxPlayers: partial.maxPlayers,
        smallBlind: partial.smallBlind,
        bigBlind: partial.bigBlind,
        startingStack: partial.startingStack,
        isPublic: partial.isPublic,
      });

      const created = pokerManager.create(
        parsed.data.name ?? `${data.username}'s table`,
        data.userId,
        merged,
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

      data.currentPokerRoomId = room.id;
      socket.join(room.id);
      pokerManager.registerSocket(room.id, socket);

      socket.emit('poker:created', { roomId: room.id });
      io.to(room.id).emit('chat:message', {
        type: 'system',
        text: `${data.username} opened the table`,
        timestamp: Date.now(),
      });
      pokerManager.broadcastState(room.id);
    });

    socket.on('poker:join', (payload: { roomId?: string; name?: string }) => {
      const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';
      const room = pokerManager.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Poker room not found' });
        return;
      }

      if (data.currentPokerRoomId && data.currentPokerRoomId !== roomId) {
        leavePokerRoom(io, socket, data);
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

      data.currentPokerRoomId = roomId;
      socket.join(roomId);
      pokerManager.registerSocket(roomId, socket);

      io.to(roomId).emit('chat:message', {
        type: 'system',
        text: result.reconnected
          ? `${joinName} reconnected`
          : `${joinName} joined the table`,
        timestamp: Date.now(),
      });
      pokerManager.broadcastState(roomId);
    });

    // Preview a room without sitting down — powers the "confirm your seat"
    // interstitial on invite links. One-shot emit, no room registration.
    socket.on('poker:preview', (payload: { roomId?: string }) => {
      const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';
      const room = pokerManager.get(roomId);
      if (!room) {
        socket.emit('poker:preview-state', { found: false, state: null });
        return;
      }
      socket.emit('poker:preview-state', {
        found: true,
        state: room.getStateFor(data.userId),
      });
    });

    socket.on('poker:get-state', () => {
      const room = data.currentPokerRoomId
        ? pokerManager.get(data.currentPokerRoomId)
        : undefined;
      if (!room) return;
      socket.emit('poker:state', room.getStateFor(data.userId));
    });

    socket.on('poker:start', () => {
      const room = data.currentPokerRoomId
        ? pokerManager.get(data.currentPokerRoomId)
        : undefined;
      if (!room) return;
      if (room.hostPlayerId !== data.userId) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }
      const result = room.startGame();
      if (!result.ok) {
        socket.emit('error', { message: result.error ?? 'Could not start' });
        return;
      }
      io.to(room.id).emit('chat:message', {
        type: 'system',
        text: 'Game started — blinds are live',
        timestamp: Date.now(),
      });
    });

    socket.on('poker:action', (payload?: unknown) => {
      const room = data.currentPokerRoomId
        ? pokerManager.get(data.currentPokerRoomId)
        : undefined;
      if (!room) return;

      const parsed = actionSchema.safeParse(payload);
      if (!parsed.success || !ACTION_SET.has(parsed.data.action)) {
        socket.emit('error', { message: 'Invalid action' });
        return;
      }

      const result = room.act(
        data.userId,
        parsed.data.action,
        parsed.data.amount,
      );
      if (!result.ok) {
        socket.emit('error', { message: result.error ?? 'Invalid action' });
      }
    });

    socket.on('poker:kick', (payload?: unknown) => {
      const room = data.currentPokerRoomId
        ? pokerManager.get(data.currentPokerRoomId)
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

    socket.on('poker:rebuy', (payload?: unknown) => {
      const room = data.currentPokerRoomId
        ? pokerManager.get(data.currentPokerRoomId)
        : undefined;
      if (!room) return;
      const parsed = z
        .object({ amount: z.coerce.number().min(1).max(1_000_000) })
        .safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid rebuy' });
        return;
      }
      const result = room.rebuy(data.userId, parsed.data.amount);
      if (!result.ok) {
        socket.emit('error', { message: result.error ?? 'Rebuy failed' });
      }
    });

    socket.on('poker:leave', () => {
      leavePokerRoom(io, socket, data);
    });

    socket.on('chat:message', (payload: { text?: string }) => {
      if (!data.currentPokerRoomId) return;
      if (typeof payload?.text !== 'string') return;
      handleChatMessage(
        io,
        data.currentPokerRoomId,
        data.username,
        payload.text,
      );
    });

    socket.on('disconnect', () => {
      if (!data.currentPokerRoomId) return;
      const roomId = data.currentPokerRoomId;
      const room = pokerManager.get(roomId);
      pokerManager.unregisterSocket(roomId, socket);
      if (!room) return;
      room.removePlayer(data.userId);
      io.to(roomId).emit('chat:message', {
        type: 'system',
        text: `${data.username} disconnected`,
        timestamp: Date.now(),
      });
      pokerManager.broadcastState(roomId);
      pokerManager.cleanup();
    });
  });
}

export function leavePokerRoom(
  io: Server,
  socket: Socket,
  data: SocketData,
): void {
  if (!data.currentPokerRoomId) return;
  const roomId = data.currentPokerRoomId;
  const room = pokerManager.get(roomId);

  pokerManager.unregisterSocket(roomId, socket);
  socket.leave(roomId);
  data.currentPokerRoomId = null;

  if (!room) return;
  room.removePlayer(data.userId);

  io.to(roomId).emit('chat:message', {
    type: 'system',
    text: `${data.username} left the table`,
    timestamp: Date.now(),
  });
  pokerManager.broadcastState(roomId);
  pokerManager.cleanup();
}
