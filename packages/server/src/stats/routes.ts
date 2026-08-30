import { Router } from 'express';
import { db } from '../db/index.js';
import { users, handResults } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.get('/leaderboard', async (_req, res) => {
  const leaderboard = await db
    .select({
      id: users.id,
      username: users.username,
      chips: users.chips,
      gamesPlayed: users.gamesPlayed,
      gamesWon: users.gamesWon,
      handsWon: users.handsWon,
      handsLost: users.handsLost,
    })
    .from(users)
    .orderBy(desc(users.chips))
    .limit(50);

  res.json(leaderboard);
});

router.get('/:userId', async (req, res) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, req.params.userId))
    .limit(1);

  const user = result[0];
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const recentHands = await db
    .select()
    .from(handResults)
    .where(eq(handResults.userId, req.params.userId))
    .orderBy(desc(handResults.createdAt))
    .limit(20);

  res.json({
    id: user.id,
    username: user.username,
    chips: user.chips,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    handsWon: user.handsWon,
    handsLost: user.handsLost,
    recentHands,
  });
});

export default router;
