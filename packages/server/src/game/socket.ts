import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { resolveIdentity, sanitizeUsername } from '../auth/identity.js';
import { generateJoinToken } from '../auth/joinToken.js';
import { roomManager } from './manager.js';
import { handleChatMessage } from '../chat/handler.js';
import type { SocketData } from '../types.js';
import { GameStep } from '@tilt21/core';
import type { GameRoom } from './GameRoom.js';
import { verifyJoinToken } from '../auth/joinToken.js';
import {
  checkCreateAllowed,
  clientIp,
  trackRoom,
} from '../poker/roomLimits.js';

const createSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  deckCount: z.coerce.number().int().min(1).max(8).optional(),
  minBet: z.coerce.number().int().min(10).optional(),
  maxBet: z.coerce.number().int().max(1_000_000).optional(),
  maxPlayers: z.coerce.number().int().min(2).max(8).optional(),
  isPrivate: z.boolean().optional(),
});

const CREATE_COOLDOWN_MS = 30_000;

export function initializeSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    const result = resolveIdentity(socket.handshake.auth);
    if (!result.ok) {
      next(new Error(result.reason));
      return;
    }
    const data = socket.data as SocketData;
    data.userId = result.identity.userId;
    data.username = result.identity.username;
    data.isGuest = result.identity.isGuest;
    data.currentRoomId = null;
    data.currentPokerRoomId = null;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;
    console.log(`Socket connected: ${data.username} (${data.userId})`);

    socket.on('room:create', (payload?: unknown) => {
      const now = Date.now();
      if (
        data.lastRoomCreatedAt !== undefined &&
        now - data.lastRoomCreatedAt < CREATE_COOLDOWN_MS
      ) {
        socket.emit('error', {
          message: 'Please wait a moment before creating another table.',
        });
        return;
      }

      const ip = clientIp(socket);
      const gate = checkCreateAllowed(ip);
      if (!gate.ok) {
        socket.emit('error', {
          message:
            gate.reason === 'global-cap'
              ? 'Server is full right now — try again later.'
              : 'Too many active tables. Close one before opening another.',
        });
        return;
      }

      const parsed = createSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        socket.emit('error', {
          message: parsed.error.issues[0]?.message ?? 'Invalid room settings',
        });
        return;
      }

      const opts = parsed.data;
      const roomId = randomUUID();
      const room = roomManager.createRoomInMemory({
        id: roomId,
        name: opts.name ?? `Table ${Math.floor(1000 + Math.random() * 9000)}`,
        hostUserId: data.userId,
        deckCount: opts.deckCount ?? 2,
        minBet: opts.minBet ?? 100,
        maxBet: opts.maxBet ?? 10000,
        maxPlayers: opts.maxPlayers ?? 6,
        isPrivate: opts.isPrivate ?? false,
        status: 'waiting',
      });

      if (data.isGuest) {
        room.markGuest(data.userId);
      }

      trackRoom(roomId, ip);
      data.lastRoomCreatedAt = now;

      socket.emit('room:created', {
        roomId,
        joinToken: room.isPrivate ? generateJoinToken(roomId) : undefined,
      });
    });

    socket.on(
      'room:join',
      async (payload: { roomId: string; token?: string; name?: string }) => {
        const { roomId, token } = payload;
        const joinName = sanitizeUsername(payload.name, data.username);

        if (data.currentRoomId) {
          socket.leave(data.currentRoomId);
          roomManager.leaveRoom(data.currentRoomId, data.userId);
          broadcastRoomState(io, data.currentRoomId);
        }

        const { room, success } = await roomManager.joinRoom(
          roomId,
          data.userId,
          joinName,
        );

        if (!success || !room) {
          socket.emit('error', { message: 'Failed to join room' });
          return;
        }

        if (
          room.isPrivate &&
          room.hostUserId !== data.userId &&
          !verifyJoinToken(roomId, token)
        ) {
          roomManager.leaveRoom(roomId, data.userId);
          socket.emit('error', { message: 'Private room' });
          return;
        }

        if (data.isGuest) {
          room.markGuest(data.userId);
          room.setStartingChips(data.userId);
        } else {
          await room.setChipsFromDb(data.userId);
        }

        data.currentRoomId = roomId;
        data.username = joinName;
        socket.join(roomId);

        io.to(roomId).emit('chat:message', {
          type: 'system',
          text: `${joinName} joined the room`,
          timestamp: Date.now(),
        });

        broadcastRoomState(io, roomId);
      },
    );

    socket.on('room:leave', () => {
      if (!data.currentRoomId) return;

      const roomId = data.currentRoomId;
      roomManager.leaveRoom(roomId, data.userId);
      socket.leave(roomId);
      data.currentRoomId = null;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      io.to(roomId).emit('chat:message', {
        type: 'system',
        text: `${data.username} left the room`,
        timestamp: Date.now(),
      });

      if (room.status === 'playing' && room.autoPlayIfNeeded()) {
        void handleGameStep(io, room);
      } else {
        broadcastRoomState(io, roomId);
      }
    });

    socket.on('room:state', () => {
      if (!data.currentRoomId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(data.currentRoomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.emit('room:state', room.getState());
    });

    socket.on('game:start', () => {
      if (!data.currentRoomId) return;

      const room = roomManager.getRoom(data.currentRoomId);
      if (!room) return;

      if (room.hostUserId !== data.userId) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }

      if (room.playerCount < 2) {
        socket.emit('error', {
          message: 'At least 2 players are required to start',
        });
        return;
      }

      room.startHand();
      void handleGameStep(io, room);
    });

    socket.on('game:bet', (payload: { amount: number }) => {
      if (!data.currentRoomId) return;

      const room = roomManager.getRoom(data.currentRoomId);
      if (!room) return;

      const placed = room.placeBet(data.userId, payload.amount);
      if (!placed) {
        socket.emit('error', { message: 'Failed to place bet' });
        return;
      }

      broadcastRoomState(io, data.currentRoomId);
    });

    socket.on('game:action', (payload: { action: string }) => {
      if (!data.currentRoomId) return;

      const room = roomManager.getRoom(data.currentRoomId);
      if (!room || room.status !== 'playing') return;

      const result = room.playerAction(data.userId, payload.action);
      if (!result.success) {
        socket.emit('error', { message: 'Invalid action' });
        return;
      }

      if (result.step !== undefined) {
        void handleGameStep(io, room);
      }
    });

    socket.on('chat:message', (payload: { text: string }) => {
      if (!data.currentRoomId) return;
      handleChatMessage(io, data.currentRoomId, data.username, payload.text);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${data.username}`);

      if (data.currentRoomId) {
        const roomId = data.currentRoomId;
        roomManager.leaveRoom(roomId, data.userId);

        const room = roomManager.getRoom(roomId);
        if (!room) return;

        io.to(roomId).emit('chat:message', {
          type: 'system',
          text: `${data.username} disconnected`,
          timestamp: Date.now(),
        });

        if (room.status === 'playing' && room.autoPlayIfNeeded()) {
          void handleGameStep(io, room);
        } else {
          broadcastRoomState(io, roomId);
        }
      }
    });
  });
}

function broadcastRoomState(io: Server, roomId: string): void {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit('room:state', room.getState());
}

async function handleGameStep(io: Server, room: GameRoom): Promise<void> {
  const roomId = room.id;

  if (room.autoPlayIfNeeded()) {
    await handleGameStep(io, room);
    return;
  }

  broadcastRoomState(io, roomId);

  const state = room.getState();
  const step = state.gameState?.step;

  if (step === GameStep.WaitingForPlayInput) {
    io.to(roomId).emit('game:state', {
      type: 'waiting-for-action',
      focusedPlayerId: state.gameState?.focusedPlayerId,
      allowedActions: getAllowedActions(room),
    });
  } else if (step === GameStep.WaitingForInsuranceInput) {
    io.to(roomId).emit('game:state', {
      type: 'waiting-for-insurance',
    });
  } else if (step === GameStep.WaitingForNewGameInput) {
    const results = await room.endHand();
    broadcastRoomState(io, roomId);

    roomManager.cleanup();

    io.to(roomId).emit('game:result', {
      results,
      state: room.getState(),
    });
  } else if (
    step === GameStep.PlayHandsRight ||
    step === GameStep.PlayHandsLeft
  ) {
    room.advanceGame();
    await handleGameStep(io, room);
  } else if (step === GameStep.Start) {
    setTimeout(() => {
      room.advanceGame();
      void handleGameStep(io, room);
    }, 500);
  }
}

function getAllowedActions(room: GameRoom): string[] {
  const game = room.currentGame;
  const currentStepVal = room.currentStep;

  if (currentStepVal !== GameStep.WaitingForPlayInput || !game) return [];

  const actions = ['hit', 'stand'];
  const hand = game.focusedHand;

  if (hand?.allowDouble) actions.push('double');
  if (hand?.allowSplit) actions.push('split');
  if (hand?.allowSurrender) actions.push('surrender');

  return actions;
}
