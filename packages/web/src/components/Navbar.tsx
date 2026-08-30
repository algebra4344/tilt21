"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const authError = useAuthStore((s) => s.error);
  const authLoading = useAuthStore((s) => s.loading);
  const authPanelOpen = useAuthStore((s) => s.authPanelOpen);
  const setAuthPanelOpen = useAuthStore((s) => s.setAuthPanelOpen);

  useEffect(() => {
    if (token && !user) fetchUser();
  }, [token, user, fetchUser]);

  const showAuth = authPanelOpen;
  const setShowAuth = setAuthPanelOpen;
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) await login(username, password);
      else await register(username, password);
      setShowAuth(false);
    } catch {
      // error set in store
    }
  };

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-sm relative z-20">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-xl">♠</span>
        <span className="text-lg font-bold text-zinc-100">Cards</span>
      </Link>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="text-sm text-zinc-400 hidden sm:inline">
              {user.username}
            </span>
            <span className="text-sm font-mono text-amber-400 hidden sm:inline">
              ● {user.chips.toLocaleString()}
            </span>
            <button
              onClick={logout}
              className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowAuth(!showAuth)}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
          >
            Login
          </button>
        )}
      </div>

      {/* Auth dropdown */}
      {showAuth && !user && (
        <div className="absolute right-4 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl z-50">
          <div className="flex mb-3 rounded-lg bg-zinc-800/50 p-0.5">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isLogin ? "bg-zinc-700 text-zinc-100" : "text-zinc-500"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !isLogin ? "bg-zinc-700 text-zinc-100" : "text-zinc-500"
              }`}
            >
              Register
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 text-zinc-100 text-sm border border-zinc-700 focus:border-amber-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLogin ? undefined : 6}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 text-zinc-100 text-sm border border-zinc-700 focus:border-amber-500 focus:outline-none"
            />
            {authError && (
              <p className="text-red-400 text-xs">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-white text-sm font-semibold transition-colors"
            >
              {authLoading ? "..." : isLogin ? "Login" : "Create Account"}
            </button>
            <p className="text-zinc-600 text-[10px] text-center">
              Multiplayer blackjack only — poker games are always free
            </p>
          </form>
        </div>
      )}
    </nav>
  );
}
