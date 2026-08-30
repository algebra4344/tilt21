import type { Server } from 'socket.io';

const MAX_MESSAGE_LENGTH = 200;
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX = 10;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function handleChatMessage(
  io: Server,
  roomId: string,
  username: string,
  text: string,
): void {
  if (typeof text !== 'string' || text.trim().length === 0) return;

  const sanitized = text.trim().slice(0, MAX_MESSAGE_LENGTH);

  const now = Date.now();
  const record = rateLimitMap.get(username);
  if (record) {
    if (now > record.resetAt) {
      rateLimitMap.set(username, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      });
    } else if (record.count >= RATE_LIMIT_MAX) {
      return;
    } else {
      record.count++;
    }
  } else {
    rateLimitMap.set(username, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
  }

  io.to(roomId).emit('chat:message', {
    type: 'user',
    username,
    text: sanitized,
    timestamp: now,
  });
}

export function sendSystemMessage(
  io: Server,
  roomId: string,
  text: string,
): void {
  io.to(roomId).emit('chat:message', {
    type: 'system',
    text,
    timestamp: Date.now(),
  });
}
