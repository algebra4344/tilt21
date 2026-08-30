"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";

type CreateRoomModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
  const createRoom = useGameStore((s) => s.createRoom);
  const [name, setName] = useState(
    () => `Table ${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [deckCount, setDeckCount] = useState(2);
  const [minBet, setMinBet] = useState(100);
  const [maxBet, setMaxBet] = useState(10000);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Room name is required");
      return;
    }
    setError("");
    createRoom({
      name: name.trim(),
      deckCount,
      minBet,
      maxBet,
      maxPlayers,
      isPrivate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-100">Create Room</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 text-zinc-100 text-sm border border-zinc-700 focus:border-amber-500 focus:outline-none"
              placeholder="My Blackjack Table"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Deck Count</label>
              <input
                type="range"
                min={1}
                max={8}
                value={deckCount}
                onChange={(e) => setDeckCount(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-sm text-zinc-300 text-center block">{deckCount} deck{deckCount > 1 ? "s" : ""}</span>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Max Players</label>
              <input
                type="range"
                min={2}
                max={8}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-sm text-zinc-300 text-center block">{maxPlayers}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Min Bet</label>
              <input
                type="number"
                value={minBet}
                onChange={(e) => setMinBet(Number(e.target.value))}
                min={10}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 text-zinc-100 text-sm border border-zinc-700 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Max Bet</label>
              <input
                type="number"
                value={maxBet}
                onChange={(e) => setMaxBet(Number(e.target.value))}
                min={minBet}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 text-zinc-100 text-sm border border-zinc-700 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 accent-amber-500"
            />
            <span className="text-sm text-zinc-400">Private room (invite only)</span>
          </label>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
          >
            Create & share link
          </button>
        </form>
      </div>
    </div>
  );
}
