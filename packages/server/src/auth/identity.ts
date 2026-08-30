import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware.js';

export type Identity = {
  userId: string;
  username: string;
  isGuest: boolean;
};

const USERNAME_MAX = 20;

export function sanitizeUsername(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .trim()
    .slice(0, USERNAME_MAX);
  return cleaned.length > 0 ? cleaned : fallback;
}

// Resolves the connecting client's identity from the handshake auth payload.
// Registered users present a JWT (blackjack multiplayer flow); poker guests
// present {guestId, guestName} minted once and stored in localStorage.
export function resolveIdentity(
  auth: Record<string, unknown> | undefined,
): { ok: true; identity: Identity } | { ok: false; reason: string } {
  const token = auth?.token;
  if (typeof token === 'string' && token.length > 0) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
      };
      return {
        ok: true,
        identity: {
          userId: payload.userId,
          username: sanitizeUsername(payload.username, 'Player'),
          isGuest: false,
        },
      };
    } catch {
      return { ok: false, reason: 'Invalid token' };
    }
  }

  const guestId = auth?.guestId;
  if (
    typeof guestId === 'string' &&
    guestId.length >= 8 &&
    guestId.length <= 64
  ) {
    const shortId = guestId.slice(0, 4).toUpperCase();
    return {
      ok: true,
      identity: {
        userId: guestId,
        username: sanitizeUsername(auth?.guestName, `Guest-${shortId}`),
        isGuest: true,
      },
    };
  }

  return { ok: false, reason: 'Authentication required' };
}
