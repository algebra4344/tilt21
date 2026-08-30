import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { getGuestIdentity, setGuestName as persistGuestName } from "@/lib/guest";
import { fetchJSON } from "@/lib/api";
import type { PokerRoomStatePayload } from "./pokerTypes";

export type ChatMessage = {
  type: "user" | "system";
  username?: string;
  text: string;
  timestamp: number;
};

export type CreateTableOptions = {
  name?: string;
  maxPlayers?: number;
  smallBlind?: number;
  bigBlind?: number;
  startingStack?: number;
  isPublic?: boolean;
};

export type PublicPokerRoom = {
  id: string;
  name: string;
  status: "lobby" | "playing";
  smallBlind: number;
  bigBlind: number;
  humans: number;
  seats: number;
  handsPlayed: number;
};

type PokerState = {
  guestName: string;
  roomId: string | null;
  roomName: string;
  hostSeatIndex: number | null;
  status: "lobby" | "playing";
  seats: PokerRoomStatePayload["seats"];
  settings: PokerRoomStatePayload["settings"] | null;
  handsPlayed: number;
  actionLog: PokerRoomStatePayload["actionLog"];
  table: PokerRoomStatePayload["table"];
  youSeatIndex: number | null;
  youPending: boolean;
  toActSeatIndex: number | null;
  lastResult: PokerRoomStatePayload["lastResult"];
  preview: { found: boolean; state: PokerRoomStatePayload | null } | null;
  messages: ChatMessage[];
  error: string | null;
  publicRooms: PublicPokerRoom[];

  fetchPublicRooms: () => Promise<void>;

  createTable: (opts?: CreateTableOptions) => void;
  previewTable: (roomId: string) => void;
  joinTable: (roomId: string, name?: string) => void;
  leaveTable: () => void;
  startGame: () => void;
  act: (action: "fold" | "call" | "raise", amount?: number) => void;
  kickSeat: (seatIndex: number) => void;
  rebuy: (amount: number) => void;
  sendChat: (text: string) => void;
  refreshState: () => void;
  hydrateGuest: () => void;
  setGuestName: (name: string) => void;
  clearError: () => void;
};

function attachListeners() {
  const socket = getSocket();

  socket.off("poker:created");
  socket.off("poker:state");
  socket.off("poker:preview-state");
  socket.off("chat:message");
  socket.off("error");

  socket.on("poker:created", (data: unknown) => {
    const d = data as { roomId: string };
    usePokerStore.setState({ roomId: d.roomId });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/poker/online?id=${d.roomId}`);
    }
  });

  socket.on("poker:state", (payload: unknown) => {
    const s = payload as PokerRoomStatePayload;
    usePokerStore.setState({
      roomId: s.roomId,
      roomName: s.name,
      hostSeatIndex: s.hostSeatIndex,
      status: s.status,
      seats: s.seats,
      settings: s.settings,
      handsPlayed: s.handsPlayed,
      actionLog: s.actionLog,
      table: s.table,
      youSeatIndex: s.you?.seatIndex ?? null,
      youPending: s.youPending ?? false,
      toActSeatIndex: s.toActSeatIndex,
      lastResult: s.lastResult,
    });
  });

  socket.on("poker:preview-state", (payload: unknown) => {
    const d = payload as { found: boolean; state: PokerRoomStatePayload | null };
    usePokerStore.setState({ preview: d });
  });

  socket.on("chat:message", (msg: ChatMessage) => {
    usePokerStore.setState((state) => ({
      messages: [...state.messages.slice(-99), msg],
    }));
  });

  socket.on("error", (data: unknown) => {
    const d = data as { message?: string };
    usePokerStore.setState({ error: d.message ?? "Server error" });
    setTimeout(() => usePokerStore.getState().clearError(), 4000);
  });

  return socket;
}

export const usePokerStore = create<PokerState>((set) => ({
  // Empty at module load so SSR and the first client render match; filled
  // after mount by hydrateGuest() (localStorage is client-only).
  guestName: "",

  roomId: null,
  roomName: "",
  hostSeatIndex: null,
  status: "lobby",
  seats: [],
  settings: null,
  handsPlayed: 0,
  actionLog: [],
  table: null,
  youSeatIndex: null,
  youPending: false,
  toActSeatIndex: null,
  lastResult: null,
  preview: null,
  messages: [],
  error: null,
  publicRooms: [],

  fetchPublicRooms: async () => {
    try {
      const rooms = await fetchJSON<PublicPokerRoom[]>("/api/poker/rooms");
      usePokerStore.setState({ publicRooms: Array.isArray(rooms) ? rooms : [] });
    } catch {
      // Server unreachable — leave the previous list as-is.
    }
  },

  previewTable: (roomId) => {
    const socket = getSocket();
    set({ preview: null });
    socket.emit("poker:preview", { roomId });
  },

  createTable: (opts) => {
    const socket = attachListeners();
    set({
      roomId: null,
      messages: [],
      error: null,
      table: null,
      lastResult: null,
      status: "lobby",
    });
    socket.emit("poker:create", opts ?? {});
  },

  joinTable: (roomId, name) => {
    const socket = attachListeners();

    const desired = name?.trim();
    if (desired) {
      persistGuestName(desired);
      set({ guestName: getGuestIdentity().guestName });
      const auth = socket.auth as { guestName?: string } | undefined;
      if (auth?.guestName !== desired) {
        socket.auth = {
          ...auth,
          guestId: getGuestIdentity().guestId,
          guestName: desired,
        };
        socket.disconnect();
        socket.connect();
      }
    }

    set({
      roomId,
      messages: [],
      error: null,
      table: null,
      lastResult: null,
      preview: null,
      actionLog: [],
    });
    socket.emit("poker:join", { roomId, name: desired || undefined });
    socket.emit("poker:get-state");
  },

  leaveTable: () => {
    const socket = getSocket();
    socket.emit("poker:leave");
    socket.off("poker:created");
    socket.off("poker:state");
    socket.off("chat:message");
    socket.off("error");
    set({
      roomId: null,
      roomName: "",
      hostSeatIndex: null,
      status: "lobby",
      seats: [],
      settings: null,
      handsPlayed: 0,
      table: null,
      youSeatIndex: null,
      youPending: false,
      toActSeatIndex: null,
      lastResult: null,
      messages: [],
    });
  },

  startGame: () => getSocket().emit("poker:start"),
  kickSeat: (seatIndex) => getSocket().emit("poker:kick", { seatIndex }),
  rebuy: (amount) => getSocket().emit("poker:rebuy", { amount }),

  act: (action, amount) => getSocket().emit("poker:action", { action, amount }),

  sendChat: (text) => getSocket().emit("chat:message", { text }),

  refreshState: () => getSocket().emit("poker:get-state"),

  hydrateGuest: () => set({ guestName: getGuestIdentity().guestName }),

  setGuestName: (name) => {
    persistGuestName(name);
    set({ guestName: getGuestIdentity().guestName });
  },

  clearError: () => set({ error: null }),
}));
