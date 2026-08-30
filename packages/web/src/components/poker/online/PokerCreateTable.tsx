"use client";

import { useEffect, useState } from "react";
import { usePokerStore } from "@/stores/pokerStore";
import type { PublicPokerRoom } from "@/stores/pokerStore";
import { formatMoney } from "@/lib/poker/types";

const STAKES = [
  { label: "Low", sb: 1, bb: 2, buyIn: 200 },
  { label: "Medium", sb: 5, bb: 10, buyIn: 1000 },
  { label: "High", sb: 25, bb: 50, buyIn: 5000 },
];

export default function PokerCreateTable() {
  const createTable = usePokerStore((s) => s.createTable);
  const joinTable = usePokerStore((s) => s.joinTable);
  const guest = usePokerStore((s) => s.guestName);
  const error = usePokerStore((s) => s.error);
  const publicRooms = usePokerStore((s) => s.publicRooms);
  const fetchPublicRooms = usePokerStore((s) => s.fetchPublicRooms);

  // Pull the localStorage name after mount so SSR markup stays deterministic.
  useEffect(() => {
    usePokerStore.getState().hydrateGuest();
    fetchPublicRooms();
    const t = setInterval(fetchPublicRooms, 15_000);
    return () => clearInterval(t);
  }, [fetchPublicRooms]);

  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [stakeIdx, setStakeIdx] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const stake = STAKES[stakeIdx];

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {publicRooms.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-zinc-300">
            Live tables{" "}
            <span className="text-zinc-500 font-normal">({publicRooms.length})</span>
          </h2>
          <div className="space-y-2">
            {publicRooms.map((r: PublicPokerRoom) => (
              <button
                key={r.id}
                onClick={() => joinTable(r.id)}
                data-room-id={r.id}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700 hover:border-emerald-500/60 transition-colors text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-200">
                    {r.name}
                  </span>
                  <span className="block text-[11px] text-zinc-500 font-mono">
                    {formatMoney(r.smallBlind)}/{formatMoney(r.bigBlind)} ·{" "}
                    {r.humans}/{r.seats} humans ·{" "}
                    {r.status === "playing" ? `${r.handsPlayed} hands` : "starting"}
                  </span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0">
                  Join
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Start a table</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Share the link or QR — empty seats are dealt by bots.
        </p>
      </div>

      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Your name</span>
        {editingName ? (
          <input
            autoFocus
            value={guest}
            maxLength={20}
            onChange={(e) => usePokerStore.getState().setGuestName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            {guest || "Pick a name"} <span className="text-zinc-500 text-xs ml-1">edit</span>
          </button>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Table name (optional)</span>
        <input
          value={name}
          placeholder="Friday Night Game"
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Stakes picker */}
      <div className="space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Stakes</span>
        <div className="grid grid-cols-3 gap-2">
          {STAKES.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setStakeIdx(i)}
              className={`py-4 rounded-xl border transition-all active:scale-95 ${
                stakeIdx === i
                  ? "bg-emerald-600/20 border-emerald-400/60"
                  : "bg-zinc-800/60 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <span
                className={`block font-bold text-base ${
                  stakeIdx === i ? "text-emerald-300" : "text-zinc-300"
                }`}
              >
                {s.label}
              </span>
              <span className="block text-zinc-500 text-[11px] mt-0.5 font-mono">
                {formatMoney(s.sb)}/{formatMoney(s.bb)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Seats</span>
        <select
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="w-full px-2 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-emerald-500 focus:outline-none"
        >
          {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>
              {n} players
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-400 font-mono">
        <span>Everyone starts with</span>
        <span className="font-bold text-zinc-200">{formatMoney(stake.buyIn)}</span>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          data-testid="public-toggle"
          onClick={() => setIsPublic((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            isPublic ? "bg-emerald-600" : "bg-zinc-700"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              isPublic ? "translate-x-5" : ""
            }`}
          />
        </button>
        <span className="text-sm text-zinc-400">
          Anyone can join
          <span className="block text-[11px] text-zinc-600">
            Off = invite link only
          </span>
        </span>
      </label>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={() =>
          createTable({
            name: name.trim() || undefined,
            maxPlayers,
            smallBlind: stake.sb,
            bigBlind: stake.bb,
            startingStack: stake.buyIn,
            isPublic,
          })
        }
        className="w-full py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold shadow-lg shadow-emerald-900/40 transition-all active:translate-y-0.5"
      >
        Create table
      </button>
      </div>
    </div>
  );
}
