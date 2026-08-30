// Client-side mirror of the server's HomeRoomStatePayload.
import type { TableState } from "@/lib/poker/types";

export type HomePlayerView = {
  seatIndex: number;
  name: string;
  stack: number;
  boughtIn: number;
  cashedOut: number;
  sittingOut: boolean;
  fullyOut: boolean;
} | null;

export type HomeAwardView = { seatIndex: number; name: string; amount: number };

export type HomeLastAwardView = {
  places: number[][];
  awards: HomeAwardView[];
};

export type HomeSettlementView = {
  nets: { seatIndex: number; name: string; net: number }[];
  transfers: { from: string; to: string; amount: number }[];
  chipsOnTable: number;
};

export type HomeSettingsView = {
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  defaultBuyIn: number;
};

export type HomeRoomStatePayload = {
  roomId: string;
  name: string;
  hostSeatIndex: number | null;
  status: "lobby" | "playing" | "ended";
  settings: HomeSettingsView;
  seats: HomePlayerView[];
  handsPlayed: number;
  actionLog: { name: string; action: string; amount: number; street: string }[];
  table: TableState | null;
  youSeatIndex: number | null;
  toActSeatIndex: number | null;
  bettingClosed: boolean;
  lastAward: HomeLastAwardView | null;
  settlement: HomeSettlementView | null;
};
