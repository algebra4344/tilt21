"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRooms, type RoomListItem } from "@/lib/api";
import { useGameStore } from "@/stores/gameStore";
import CreateRoomModal from "./CreateRoomModal";

export default function Lobby() {
  const router = useRouter();
  const guestName = useGameStore((s) => s.guestName);
  const setGuestName = useGameStore((s) => s.setGuestName);
  const hydrateGuest = useGameStore((s) => s.hydrateGuest);
  const createRoom = useGameStore((s) => s.createRoom);
  const roomId = useGameStore((s) => s.roomId);
  const joinToken = useGameStore((s) => s.joinToken);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    hydrateGuest();
  }, [hydrateGuest]);

  useEffect(() => {
    let active = true;

    const fetchRooms = async () => {
      if (!active) return;
      try {
        const data = await getRooms();
        if (active) setRooms(data);
      } catch (err) {
        console.error("Failed to load rooms:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (roomId) {
      const q = joinToken ? `?token=${encodeURIComponent(joinToken)}` : "";
      router.push(`/game/${roomId}${q}`);
    }
  }, [roomId, joinToken, router]);

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Blackjack</h1>
          <p className="text-sm text-zinc-500">No account — share a link and play.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={20}
            placeholder="Your name"
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm w-32"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
          >
            New table
          </button>
        </div>
      </div>

      <button
        onClick={() => createRoom()}
        className="w-full mb-4 py-4 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 font-bold transition-colors"
      >
        Quick start — open a table and share the link
      </button>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search open tables..."
          className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 text-zinc-100 text-sm border border-zinc-800 focus:border-amber-500 focus:outline-none placeholder-zinc-500"
        />
      </div>

      {loading ? (
        <div className="text-center text-zinc-400 py-12">Loading rooms...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-zinc-500 text-lg mb-2">No open tables</div>
          <div className="text-zinc-600 text-sm">Start one and send the link to a friend.</div>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-zinc-100 truncate">
                    {room.name}
                  </span>
                  {room.isPrivate && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-zinc-700 text-zinc-400">
                      Private
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      room.status === "waiting"
                        ? "bg-green-900/30 text-green-400"
                        : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {room.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>
                    {room.playerCount}/{room.maxPlayers} players
                  </span>
                  <span>{room.deckCount} deck{room.deckCount > 1 ? "s" : ""}</span>
                  <span>
                    Bet: {room.minBet.toLocaleString()} - {room.maxBet.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => router.push(`/game/${room.id}`)}
                disabled={room.playerCount >= room.maxPlayers || room.status !== "waiting"}
                className="ml-4 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold text-sm transition-colors shrink-0"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateRoomModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
