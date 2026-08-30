import { create } from "zustand";
import type { User } from "@/lib/api";
import * as api from "@/lib/api";
import { getSocket, disconnectSocket } from "@/lib/socket";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  /** Navbar login/register dropdown visibility — shared so any page can pop it. */
  authPanelOpen: boolean;
  setAuthPanelOpen: (open: boolean) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  loading: false,
  error: null,
  authPanelOpen: false,
  setAuthPanelOpen: (open) => set({ authPanelOpen: open }),

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login(username, password);
      localStorage.setItem("token", res.token);
      set({ user: res.user, token: res.token, loading: false });
      getSocket();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.register(username, password);
      localStorage.setItem("token", res.token);
      set({ user: res.user, token: res.token, loading: false });
      getSocket();
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    disconnectSocket();
    set({ user: null, token: null });
  },

  fetchUser: async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    set({ loading: true });
    try {
      const user = await api.getMe();
      set({ user, token, loading: false });
      getSocket();
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null, loading: false });
    }
  },
}));
