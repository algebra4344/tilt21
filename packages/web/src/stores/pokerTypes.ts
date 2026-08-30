// Client-side mirror of the server's PokerRoomStatePayload shape. Kept local
// so the web bundle doesn't depend on server internals.
import type { PokerCard, TableState } from "@/lib/poker/types";

export type PokerSeatView = {
  seatIndex: number;
  name: string;
  isBot: boolean;
  stack: number;
  connected: boolean;
  sittingOut?: boolean;
} | null;

export type HandAwardView = {
  seatIndex: number;
  playerId: string | null;
  name: string;
  amount: number;
  handName?: string;
};

export type LastHandResultView = {
  awards: HandAwardView[];
  potTotal: number;
  viaShowdown: boolean;
};

export type PokerRoomSettingsView = {
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
};

export type PokerRoomStatePayload = {
  roomId: string;
  name: string;
  hostSeatIndex: number | null;
  status: "lobby" | "playing";
  settings: PokerRoomSettingsView;
  seats: PokerSeatView[];
  handsPlayed: number;
  actionLog: { name: string; action: string; amount: number; street: string }[];
  table: TableState | null;
  you: { seatIndex: number; stack: number } | null;
  /** Viewer is queued for the next hand (table was full mid-hand). */
  youPending?: boolean;
  toActSeatIndex: number | null;
  lastResult: LastHandResultView | null;
};

export type { PokerCard };
