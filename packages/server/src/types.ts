import type { GameStep } from '@tilt21/core';

export type SocketData = {
  userId: string;
  username: string;
  isGuest: boolean;
  currentRoomId: string | null;
  currentPokerRoomId: string | null;
  currentHomeRoomId: string | null;
  lastRoomCreatedAt?: number;
};

export type RoomPlayer = {
  userId: string;
  username: string;
  seatPosition: number;
  chips: number;
  bet: number | null;
};

export type HandInfo = {
  id: string;
  handIndex: number;
  bet: number;
  cards: { id: string; suit: string; rank: string; showingFace: boolean }[];
  cardTotal: number;
  blackjack: boolean;
  busted: boolean;
};

export type PlayerState = {
  userId: string;
  username: string;
  seatPosition: number;
  balance: number;
  hands: HandInfo[];
  handWinner: Record<string, string>;
};

export type RoomState = {
  roomId: string;
  name: string;
  hostUserId: string;
  deckCount: number;
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: 'waiting' | 'playing' | 'closed';
  players: RoomPlayer[];
  gameState: GameState | null;
};

export type GameState = {
  step: GameStep;
  dealerHand: {
    id: string;
    suit: string;
    rank: string;
    showingFace: boolean;
  }[];
  dealerTotal: number | null;
  players: PlayerState[];
  focusedPlayerId: string | null;
  focusedHandIndex: number;
  shoeCount: number;
};

export type GameEvent =
  | { type: 'hand-started'; roomId: string }
  | {
      type: 'hand-result';
      roomId: string;
      userId: string;
      result: string;
      payout: number;
    }
  | { type: 'game-state'; roomId: string; state: GameState };
