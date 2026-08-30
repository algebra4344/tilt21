"use client";

import { useEffect, useState } from "react";
import { useHomeStore } from "@/stores/homeStore";
import { formatMoney } from "@/lib/poker/types";

const STAKES = [
  { label: "Low", sb: 1, bb: 2, buyIn: 200 },
  { label: "Medium", sb: 5, bb: 10, buyIn: 1000 },
  { label: "High", sb: 25, bb: 50, buyIn: 5000 },
];

export default function HomeCreateTable() {
  const createTable = useHomeStore((s) => s.createTable);
  const guestName = useHomeStore((s) => s.guestName);
  const setGuestName = useHomeStore((s) => s.setGuestName);

  // Pull the localStorage name after mount so SSR markup stays deterministic.
  useEffect(() => {
    useHomeStore.getState().hydrateGuest();
  }, []);

  const [editingName, setEditingName] = useState(false);
  const [tableName, setTableName] = useState("");
  const [stakeIdx, setStakeIdx] = useState(0);
  const stake = STAKES[stakeIdx];
  const [maxPlayers, setMaxPlayers] = useState(8);


  return (
    <div className="w-full max-w-md mx-auto bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Game night</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Real cards on the table. We keep the chips. Share the link and everyone plays
          from their phone.
        </p>
      </div>

      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Your name</span>
        {editingName ? (
          <input
            autoFocus
            value={guestName}
            maxLength={20}
            onChange={(e) => setGuestName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            {guestName || "Pick a name"}{" "}
            <span className="text-zinc-500 text-xs ml-1">edit</span>
          </button>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wider text-zinc-500">
          Table name (optional)
        </span>
        <input
          value={tableName}
          placeholder="Friday Night Poker"
          maxLength={60}
          onChange={(e) => setTableName(e.target.value)}
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
                  ? "bg-sky-600/20 border-sky-400/60"
                  : "bg-zinc-800/60 border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <span
                className={`block font-bold text-base ${
                  stakeIdx === i ? "text-sky-300" : "text-zinc-300"
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

      <p className="text-sm text-zinc-400 font-mono">
        Everyone starts with {formatMoney(stake.buyIn)}
      </p>

      <button
        onClick={() =>
          createTable({
            name: tableName.trim() || undefined,
            maxPlayers,
            smallBlind: stake.sb,
            bigBlind: stake.bb,
            defaultBuyIn: stake.buyIn,
          })
        }
        className="w-full py-3.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold text-lg shadow-lg shadow-emerald-900/40 transition-all active:translate-y-0.5"
      >
        Open the table
      </button>
    </div>
  );
}
