"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import Lobby from "@/components/Lobby";

export default function LobbyPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <Lobby />
    </div>
  );
}
