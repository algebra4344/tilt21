import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { gameRooms, gameRoomPlayers, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  authMiddleware,
  optionalAuthMiddleware,
  type AuthRequest,
} from '../auth/middleware.js';
import { generateJoinToken, verifyJoinToken } from '../auth/joinToken.js';
import { roomManager } from '../game/manager.js';

const router = Router();

router.get('/rooms', async (_req, res) => {
  const live = roomManager
    .getAllRooms()
    .filter((room) => !room.isPrivate && room.playerCount > 0)
    .map((room) => ({
      id: room.id,
      name: room.name,
      hostUserId: room.hostUserId,
      deckCount: room.deckCount,
      minBet: room.minBet,
      maxBet: room.maxBet,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      status: room.status,
      playerCount: room.playerCount,
    }));

  res.json(live);
});

router.post('/rooms', authMiddleware, async (req: AuthRequest, res) => {
  const createSchema = z.object({
    name: z.string().min(1).max(100),
    deckCount: z.number().int().min(1).max(8).optional(),
    minBet: z.number().int().min(10).optional(),
    maxBet: z.number().int().max(1000000).optional(),
    maxPlayers: z.number().int().min(2).max(8).optional(),
    isPrivate: z.boolean().optional(),
  });

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const [room] = await db
    .insert(gameRooms)
    .values({
      name: parsed.data.name,
      hostUserId: req.userId,
      deckCount: parsed.data.deckCount ?? 2,
      minBet: parsed.data.minBet ?? 100,
      maxBet: parsed.data.maxBet ?? 10000,
      maxPlayers: parsed.data.maxPlayers ?? 6,
      isPrivate: parsed.data.isPrivate ?? false,
    })
    .returning();

  await db.insert(gameRoomPlayers).values({
    roomId: room.id,
    userId: req.userId,
    seatPosition: 0,
  });

  roomManager.createRoom(room);

  res.status(201).json({
    ...room,
    joinToken: room.isPrivate ? generateJoinToken(room.id) : undefined,
  });
});

router.get(
  '/rooms/:id',
  optionalAuthMiddleware,
  async (req: AuthRequest, res) => {
    const roomId =
      typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const result = await db
      .select()
      .from(gameRooms)
      .where(eq(gameRooms.id, roomId))
      .limit(1);

    const room = result[0];
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.isPrivate) {
      const isHost = req.userId === room.hostUserId;
      const token = req.query.token;
      const tokenValid = verifyJoinToken(room.id, token);
      if (!isHost && !tokenValid) {
        res.status(403).json({ error: 'Private room' });
        return;
      }
    }

    const players = await db
      .select({
        userId: gameRoomPlayers.userId,
        seatPosition: gameRoomPlayers.seatPosition,
        username: users.username,
        chips: users.chips,
      })
      .from(gameRoomPlayers)
      .innerJoin(users, eq(gameRoomPlayers.userId, users.id))
      .where(eq(gameRoomPlayers.roomId, room.id));

    const gameRoom = roomManager.getRoom(room.id);
    const gameState = gameRoom?.getState() ?? null;

    res.json({
      ...room,
      joinToken: room.isPrivate ? generateJoinToken(room.id) : undefined,
      players: players.map((p) => ({
        ...p,
        username: p.username,
        chips: p.chips,
      })),
      gameState,
    });
  },
);

export default router;
