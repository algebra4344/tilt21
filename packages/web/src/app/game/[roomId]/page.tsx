"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useClientMounted } from "@/hooks/useClientMounted";
import GameBoard from "@/components/GameBoard";
import Chat from "@/components/Chat";
import BjHandHistory from "@/components/BjHandHistory";
import { useTableLayout } from "@/hooks/useTableLayout";

export default function GameRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const hydrateGuest = useGameStore((s) => s.hydrateGuest);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const joinToken = searchParams.get("token") ?? undefined;
  const { isLandscape } = useTableLayout();
  const mounted = useClientMounted();
  const joinRequested = useRef(false);

  useEffect(() => {
    hydrateGuest();
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser, hydrateGuest]);

  useEffect(() => {
    let active = true;

    params.then(({ roomId: id }) => {
      if (active && mounted && !joinRequested.current) {
        joinRequested.current = true;
        joinRoom(id, joinToken);
      }
    });

    return () => {
      active = false;
      leaveRoom();
    };
  }, [mounted, params, joinRoom, leaveRoom, joinToken]);

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-h-0">
          <GameBoard />
        </div>
        {!isLandscape && (
          <div className="w-72 shrink-0 p-2 hidden md:flex flex-col gap-2 min-h-0 overflow-y-auto">
            <BjHandHistory />
            <Chat />
          </div>
        )}
      </div>
    </div>
  );
}
