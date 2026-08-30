import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { getGuestIdentity, setGuestName as persistGuestName } from "@/lib/guest";
import type { HomeRoomStatePayload } from "./homeTypes";

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
  defaultBuyIn?: number;
};

type HomeState = {
  // Empty at module load so SSR and the first client render match; filled
  // after mount by hydrateGuest() (localStorage is client-only).
  guestName: string;
  roomId: string | null;
  roomName: string;
  hostSeatIndex: number | null;
  status: "lobby" | "playing" | "ended";
  seats: HomeRoomStatePayload["seats"];
  settings: HomeRoomStatePayload["settings"] | null;
  handsPlayed: number;
  actionLog: HomeRoomStatePayload["actionLog"];
  table: HomeRoomStatePayload["table"];
  youSeatIndex: number | null;
  toActSeatIndex: number | null;
  bettingClosed: boolean;
  lastAward: HomeRoomStatePayload["lastAward"];
  settlement: HomeRoomStatePayload["settlement"];
  preview: { found: boolean; state: HomeRoomStatePayload | null } | null;
  messages: ChatMessage[];
  error: string | null;

  createTable: (opts?: CreateTableOptions) => void;
  previewTable: (roomId: string) => void;
  joinTable: (roomId: string, name?: string) => void;
  leaveTable: () => void;
  startHand: () => void;
  act: (action: "fold" | "call" | "raise", amount?: number) => void;
  nextStreet: () => void;
  award: (places: number[][]) => void;
  buyIn: (amount: number, seatIndex?: number) => void;
  cashOut: (amount: number, seatIndex?: number) => void;
  setSittingOut: (sittingOut: boolean) => void;
  endNight: () => void;
  kickSeat: (seatIndex: number) => void;
  sendChat: (text: string) => void;
  hydrateGuest: () => void;
  setGuestName: (name: string) => void;
  clearError: () => void;
};

function attachListeners() {
  const socket = getSocket();

  socket.off("home:created");
  socket.off("home:state");
  socket.off("home:preview-state");
  socket.off("chat:message");
  socket.off("error");

  socket.on("home:created", (data: unknown) => {
    const d = data as { roomId: string };
    useHomeStore.setState({ roomId: d.roomId });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}?id=${d.roomId}`);
    }
  });

  socket.on("home:state", (payload: unknown) => {
    const s = payload as HomeRoomStatePayload;
    useHomeStore.setState({
      roomId: s.roomId,
      roomName: s.name,
      hostSeatIndex: s.hostSeatIndex,
      status: s.status,
      seats: s.seats,
      settings: s.settings,
      handsPlayed: s.handsPlayed,
      actionLog: s.actionLog,
      table: s.table,
      youSeatIndex: s.youSeatIndex,
      toActSeatIndex: s.toActSeatIndex,
      bettingClosed: s.bettingClosed,
      lastAward: s.lastAward,
      settlement: s.settlement,
    });
  });

  socket.on("home:preview-state", (payload: unknown) => {
    const d = payload as { found: boolean; state: HomeRoomStatePayload | null };
    useHomeStore.setState({ preview: d });
  });

  socket.on("chat:message", (msg: ChatMessage) => {
    useHomeStore.setState((state) => ({
      messages: [...state.messages.slice(-99), msg],
    }));
  });

  socket.on("error", (data: unknown) => {
    const d = data as { message?: string };
    useHomeStore.setState({ error: d.message ?? "Server error" });
    setTimeout(() => useHomeStore.getState().clearError(), 4000);
  });

  return socket;
}

export const useHomeStore = create<HomeState>((set) => ({
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
  toActSeatIndex: null,
  bettingClosed: false,
  lastAward: null,
  settlement: null,
  preview: null,
  messages: [],
  error: null,

  previewTable: (roomId) => {
    const socket = attachListeners();
    set({ preview: null });
    socket.emit("home:preview", { roomId });
  },

  createTable: (opts) => {
    const socket = attachListeners();
    set({
      roomId: null,
      messages: [],
      error: null,
      table: null,
      lastAward: null,
      settlement: null,
      status: "lobby",
    });
    socket.emit("home:create", opts ?? {});
  },

  joinTable: (roomId, name) => {
    const socket = attachListeners();

    // If the interstitial changed the name, refresh socket auth so the server
    // handshake carries it too. Emits are buffered across the reconnect.
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
      lastAward: null,
      settlement: null,
      preview: null,
    });
    socket.emit("home:join", { roomId, name: desired || undefined });
    socket.emit("home:get-state");
  },

  leaveTable: () => {
    const socket = getSocket();
    socket.emit("home:leave");
    socket.off("home:created");
    socket.off("home:state");
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
      toActSeatIndex: null,
      bettingClosed: false,
      lastAward: null,
      settlement: null,
      preview: null,
      messages: [],
    });
  },

  startHand: () => getSocket().emit("home:start-hand"),
  act: (action, amount) =>
    getSocket().emit("home:act", { action, amount }),
  nextStreet: () => getSocket().emit("home:next-street"),
  award: (places) => getSocket().emit("home:award", { places }),
  buyIn: (amount, seatIndex) => getSocket().emit("home:buy-in", { amount, seatIndex }),
  cashOut: (amount, seatIndex) => getSocket().emit("home:cash-out", { amount, seatIndex }),
  setSittingOut: (sittingOut) => getSocket().emit("home:sit-out", { sittingOut }),
  endNight: () => getSocket().emit("home:end-night"),
  kickSeat: (seatIndex) => getSocket().emit("home:kick", { seatIndex }),
  sendChat: (text) => getSocket().emit("chat:message", { text }),
  hydrateGuest: () => set({ guestName: getGuestIdentity().guestName }),

  setGuestName: (name) => {
    persistGuestName(name);
    set({ guestName: getGuestIdentity().guestName });
  },
  clearError: () => set({ error: null }),
}));
