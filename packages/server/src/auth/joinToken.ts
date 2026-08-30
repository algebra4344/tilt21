import crypto from 'node:crypto';
import { JWT_SECRET } from './middleware.js';

const ALGORITHM = 'sha256';

export function generateJoinToken(roomId: string): string {
  return crypto.createHmac(ALGORITHM, JWT_SECRET).update(roomId).digest('hex');
}

export function verifyJoinToken(roomId: string, token: unknown): boolean {
  if (typeof token !== 'string') return false;
  const expected = generateJoinToken(roomId);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, 'utf-8'),
      Buffer.from(expected, 'utf-8'),
    );
  } catch {
    return false;
  }
}
