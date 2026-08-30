const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchJSON<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

export type User = {
  id: string;
  username: string;
  chips: number;
  gamesPlayed: number;
  gamesWon: number;
  handsWon: number;
  handsLost: number;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type RoomListItem = {
  id: string;
  name: string;
  hostUserId: string;
  deckCount: number;
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: string;
  playerCount: number;
};

export type RoomDetail = RoomListItem & {
  players: { userId: string; username: string; seatPosition: number; chips: number }[];
  gameState: unknown;
  joinToken?: string;
};

export type LeaderboardEntry = {
  id: string;
  username: string;
  chips: number;
  gamesPlayed: number;
  gamesWon: number;
  handsWon: number;
  handsLost: number;
};

export function register(
  username: string,
  password: string
): Promise<AuthResponse> {
  return fetchJSON("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  return fetchJSON("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getMe(): Promise<User> {
  return fetchJSON("/api/auth/me");
}

export function getRooms(): Promise<RoomListItem[]> {
  return fetchJSON("/api/rooms");
}

export function createRoom(settings: {
  name: string;
  deckCount?: number;
  minBet?: number;
  maxBet?: number;
  maxPlayers?: number;
  isPrivate?: boolean;
}): Promise<RoomDetail> {
  return fetchJSON("/api/rooms", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

export function getRoom(id: string): Promise<RoomDetail> {
  return fetchJSON(`/api/rooms/${id}`);
}

export function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetchJSON("/api/stats/leaderboard");
}
