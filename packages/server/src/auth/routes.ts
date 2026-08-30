import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './crypto.js';
import { signToken, authMiddleware, type AuthRequest } from './middleware.js';
import { authRateLimiter } from './rateLimit.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

router.post('/register', authRateLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { username, password } = parsed.data;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ username, passwordHash })
    .returning();

  const token = signToken(user.id, user.username);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      chips: user.chips,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      handsWon: user.handsWon,
      handsLost: user.handsLost,
    },
  });
});

router.post('/login', authRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const { username, password } = parsed.data;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const user = result[0];
  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = signToken(user.id, user.username);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      chips: user.chips,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      handsWon: user.handsWon,
      handsLost: user.handsLost,
    },
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, req.userId))
    .limit(1);

  const user = result[0];
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    chips: user.chips,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    handsWon: user.handsWon,
    handsLost: user.handsLost,
  });
});

export default router;
