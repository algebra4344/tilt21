import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { getGuestIdentity, getLocalPlayerId, setGuestName as persistGuestName } from "@/lib/guest";
import { useAuthStore } from "./authStore";

export type PlayerCard = {
  id: string;
  suit: string;
  rank: string;
  showingFace: boolean;
};

export type HandInfo = {
  id: string;
  handIndex: number;
  bet: number;
  cards: PlayerCard[];
  cardTotal: number;
  blackjack: boolean;
  busted: boolean;
};

export type PlayerState = {
  userId: string;
  username: string;
  seatPosition: number;
  balance: number;
  bet?: number | null;
  hands: HandInfo[];
  handWinner: Record<string, string>;
};

export type GamePhase = "waiting" | "playing" | "betting" | "results";

export type ChatMessage = {
  type: "user" | "system";
  username?: string;
  text: string;
  timestamp: number;
};

export type CreateRoomOptions = {
  name?: string;
  deckCount?: number;
  minBet?: number;
  maxBet?: number;
  maxPlayers?: number;
  isPrivate?: boolean;
};

type GameState = {
  guestName: string;
  roomId: string | null;
  joinToken: string | null;
  roomName: string;
  hostUserId: string;
  players: PlayerState[];
  phase: GamePhase;
  dealerCards: PlayerCard[];
  dealerTotal: number | null;
  focusedPlayerId: string | null;
  allowedActions: string[];
  messages: ChatMessage[];
  error: string | null;
  resultOverlay: {
    userId: string;
    result: string;
    payout: number;
  } | null;
  handHistory: {
    round: number;
    entries: { username: string; result: string; payout: number }[];
  }[];

  createRoom: (opts?: CreateRoomOptions) => void;
  joinRoom: (roomId: string, token?: string, name?: string) => void;
  leaveRoom: () => void;
  placeBet: (amount: number) => void;
  playerAction: (action: string) => void;
  startGame: () => void;
  sendChat: (text: string) => void;
  clearResult: () => void;
  clearError: () => void;
  hydrateGuest: () => void;
  setGuestName: (name: string) => void;
};

function derivePhase(state: {
  gameState?: {
    step: number;
    focusedPlayerId: string | null;
  } | null;
}): GamePhase {
  if (!state.gameState) return "waiting";
  const step = state.gameState.step;
  if (step === 7) return "results";
  if (step === 6 || step === 4) return "playing";
  if (step === 5 || step === 3 || step === 1) return "playing";
  return "betting";
}

function attachRoomListeners() {
  const socket = getSocket();

  socket.off("room:created");
  socket.off("room:state");
  socket.off("chat:message");
  socket.off("game:state");
  socket.off("game:result");
  socket.off("error");

  socket.on("room:created", (data: unknown) => {
    const d = data as { roomId: string; joinToken?: string };
    useGameStore.setState({
      roomId: d.roomId,
      joinToken: d.joinToken ?? null,
    });
    const query = d.joinToken ? `?token=${encodeURIComponent(d.joinToken)}` : "";
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/game/${d.roomId}${query}`);
    }
    socket.emit("room:join", { roomId: d.roomId, token: d.joinToken });
    socket.emit("room:state");
  });

  socket.on("room:state", (state: Record<string, unknown>) => {
    const s = state as {
      roomId: string;
      name: string;
      hostUserId: string;
      players: PlayerState[];
      gameState?: {
        step: number;
        dealerHand: PlayerCard[];
        dealerTotal: number | null;
        players: PlayerState[];
        focusedPlayerId: string | null;
      } | null;
    };

    const gs = s.gameState;
    const rawPlayers = gs?.players ?? s.players;
    const normalizedPlayers = rawPlayers.map((p) => ({
      ...p,
      balance: p.balance ?? (p as { chips?: number }).chips ?? 0,
      hands: p.hands ?? [],
      handWinner: p.handWinner ?? {},
    }));
    useGameStore.setState({
      roomName: s.name,
      hostUserId: s.hostUserId,
      players: normalizedPlayers,
      dealerCards: gs?.dealerHand ?? [],
      dealerTotal: gs?.dealerTotal ?? null,
      focusedPlayerId: gs?.focusedPlayerId ?? null,
      phase: derivePhase(s),
    });
  });

  socket.on("chat:message", (msg: ChatMessage) => {
    useGameStore.setState((state) => ({
      messages: [...state.messages.slice(-199), msg],
    }));
  });

  socket.on("game:state", (data: Record<string, unknown>) => {
    const d = data as { type: string; focusedPlayerId?: string; allowedActions?: string[] };
    if (d.type === "waiting-for-action") {
      useGameStore.setState({
        phase: "playing",
        focusedPlayerId: d.focusedPlayerId ?? null,
        allowedActions: d.allowedActions ?? [],
      });
    } else if (d.type === "waiting-for-insurance") {
      useGameStore.setState({ phase: "playing" });
    }
  });

  socket.on("game:result", (data: Record<string, unknown>) => {
    const d = data as {
      results?: { userId: string; result: string; payout: number }[];
    };
    useGameStore.setState({ phase: "results" });

    const myId = getLocalPlayerId(useAuthStore.getState().user?.id);
    const myResults = d.results?.filter((r) => r.userId === myId) ?? [];
    if (myResults.length > 0) {
      const combined = myResults.reduce(
        (acc, r) => ({
          result: acc.result === "lose" || r.result === "lose" ? "lose" : acc.result === "win" || r.result === "win" ? "win" : "push",
          payout: acc.payout + r.payout,
        }),
        { result: "push", payout: 0 },
      );
      useGameStore.setState({
        resultOverlay: {
          userId: myId,
          result: combined.result === "blackjack" ? "win" : combined.result,
          payout: combined.payout,
        },
      });
    }

    setTimeout(() => {
      useGameStore.setState({ resultOverlay: null });
    }, 3000);

    const state = useGameStore.getState();
    const nameOf = (uid: string) =>
      state.players.find((p) => p.userId === uid)?.username ?? uid.slice(0, 6);
    const entry = {
      round: state.handHistory.length + 1,
      entries: (d.results ?? []).map((r) => ({
        username: nameOf(r.userId),
        result: r.result,
        payout: r.payout,
      })),
    };
    useGameStore.setState({ handHistory: [entry, ...state.handHistory].slice(0, 10) });
  });

  socket.on("error", (data: Record<string, unknown>) => {
    const d = data as { message?: string };
    useGameStore.setState({ error: d.message ?? "Server error" });
    setTimeout(() => useGameStore.setState({ error: null }), 4000);
  });

  return socket;
}

export const useGameStore = create<GameState>((set) => ({
  guestName: "",
  roomId: null,
  joinToken: null,
  roomName: "",
  hostUserId: "",
  players: [],
  handHistory: [],
  phase: "waiting",
  dealerCards: [],
  dealerTotal: null,
  focusedPlayerId: null,
  allowedActions: [],
  messages: [],
  error: null,
  resultOverlay: null,

  createRoom: (opts) => {
    const socket = attachRoomListeners();
    set({
      roomId: null,
      joinToken: null,
      messages: [],
      resultOverlay: null,
      error: null,
      handHistory: [],
    });
    socket.emit("room:create", opts ?? {});
  },

  joinRoom: (roomId, token, name) => {
    const socket = attachRoomListeners();

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
      resultOverlay: null,
      error: null,
      handHistory: [],
    });

    socket.emit("room:join", { roomId, token, name: desired || undefined });
    socket.emit("room:state");
  },

  leaveRoom: () => {
    const socket = getSocket();
    socket.emit("room:leave");
    socket.off("room:created");
    socket.off("room:state");
    socket.off("chat:message");
    socket.off("game:state");
    socket.off("game:result");
    socket.off("error");
    set({
      roomId: null,
      joinToken: null,
      roomName: "",
      hostUserId: "",
      players: [],
      handHistory: [],
      phase: "waiting",
      dealerCards: [],
      dealerTotal: null,
      focusedPlayerId: null,
      allowedActions: [],
      messages: [],
      error: null,
      resultOverlay: null,
    });
  },

  placeBet: (amount) => {
    getSocket().emit("game:bet", { amount });
  },

  playerAction: (action) => {
    getSocket().emit("game:action", { action });
  },

  startGame: () => {
    getSocket().emit("game:start");
  },

  sendChat: (text) => {
    getSocket().emit("chat:message", { text });
  },

  clearResult: () => set({ resultOverlay: null }),
  clearError: () => set({ error: null }),
  hydrateGuest: () => set({ guestName: getGuestIdentity().guestName }),
  setGuestName: (name) => {
    persistGuestName(name);
    set({ guestName: getGuestIdentity().guestName });
  },
}));
