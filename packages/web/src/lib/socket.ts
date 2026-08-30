import { io, Socket } from "socket.io-client";
import { getGuestIdentity } from "@/lib/guest";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "http://localhost:3001";

let socket: Socket | null = null;
let authRetried = false;

function hasValidAuth(s: Socket | null): boolean {
  if (!s) return false;
  const auth = (s as unknown as { auth?: Record<string, unknown> }).auth;
  if (!auth) return false;
  // JWT user
  if (typeof auth.token === "string" && auth.token.length > 0) return true;
  // Guest user
  if (
    typeof auth.guestId === "string" &&
    auth.guestId.length >= 8 &&
    typeof auth.guestName === "string" &&
    auth.guestName.length > 0
  )
    return true;
  return false;
}

export function getSocket(): Socket {
  // If the socket was created with stale/empty auth (e.g. before
  // localStorage was populated), tear it down and recreate.
  if (socket && !hasValidAuth(socket)) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  if (socket) return socket;

  // Authed users ride their JWT (blackjack multiplayer); everyone else joins
  // as an anonymous poker guest identified by a localStorage UUID.
  //
  // Generate the identity FIRST — getGuestIdentity() writes to localStorage on
  // its very first call, guaranteeing a stable UUID for every subsequent access.
  // The auth object is then built from the store values, which are always valid
  // on the client.
  const guestIdentity = getGuestIdentity();
  const token = localStorage.getItem("token");
  const auth = token
    ? { token }
    : { guestId: guestIdentity.guestId, guestName: guestIdentity.guestName };

  socket = io(SOCKET_URL, {
    auth,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  const s = socket;
  s.on("connect", () => {
    authRetried = false;
    console.log("[socket] connected", s.id);
  });

  s.on("disconnect", (reason) => {
    console.log("[socket] disconnected", reason);
  });

  s.on("connect_error", (err) => {
    console.error("[socket] connect error", err.message);

    // Self-heal: if the server rejects our auth (e.g. it was minted before a
    // deploy, or localStorage was cleared mid-session), refresh identity and
    // retry once. Guards against permanently bricked sessions.
    if (err.message === "Authentication required" && !authRetried) {
      authRetried = true;
      console.warn("[socket] refreshing guest identity and reconnecting…");
      const fresh = getGuestIdentity();
      s.auth = {
        ...(s.auth as Record<string, unknown> | undefined),
        guestId: fresh.guestId,
        guestName: fresh.guestName,
      };
      s.connect();
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function emitSocket(event: string, data?: unknown): void {
  socket?.emit(event, data);
}

export function onSocket(event: string, handler: (...args: unknown[]) => void): () => void {
  socket?.on(event, handler);
  return () => {
    socket?.off(event, handler);
  };
}
