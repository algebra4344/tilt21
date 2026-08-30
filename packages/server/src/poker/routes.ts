import { Router } from 'express';
import { pokerManager } from './manager.js';

const router = Router();

// Public table browser: rooms with at least one live human. Memory-only,
// so the list is always live — no stale DB rows like the blackjack lobby.
router.get('/rooms', (_req, res) => {
  res.json(pokerManager.listPublicRooms());
});

export default router;
