"use client";

import { useState } from "react";
import Link from "next/link";

type JoinInterstitialProps = {
  kind: "home" | "online";
  title: string;
  seatedCount: number | null;
  capacity: number | null;
  status?: "lobby" | "playing" | "ended" | null;
  defaultName: string;
  onSit: (name: string) => void;
  notFound?: boolean;
};

export default function JoinInterstitial({
  kind,
  title,
  seatedCount,
  capacity,
  status,
  defaultName,
  onSit,
  notFound,
}: JoinInterstitialProps) {
  const [name, setName] = useState(defaultName);
  const [joining, setJoining] = useState(false);

  if (notFound) {
    return (
      <div className="w-full max-w-md mx-auto bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
        <h2 className="text-xl font-bold text-zinc-100">Table not found</h2>
        <p className="text-sm text-zinc-500">
          That game may have ended, or the link is wrong.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition-colors"
        >
          Back to the lobby
        </Link>
      </div>
    );
  }

  const canSit =
    !joining &&
    name.trim().length > 0 &&
    (capacity === null || seatedCount === null || seatedCount < capacity) &&
    status !== "ended";

  return (
    <div className="w-full max-w-md mx-auto bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-zinc-100 truncate">
          {title || (kind === "home" ? "Game night" : "Poker table")}
        </h2>
        {seatedCount !== null && capacity !== null && (
          <p className="text-xs text-zinc-500 font-mono">
            {seatedCount}/{capacity} seated
            {status === "playing" ? " · hand in progress" : ""}
            {status === "ended" ? " · night over" : ""}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-xs uppercase tracking-wider text-zinc-500">
          You&apos;ll play as
        </label>
        <div className="flex items-center gap-2">
          <input
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                setJoining(true);
                onSit(name.trim());
              }
            }}
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-base font-semibold focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <p className="text-[11px] text-zinc-600">
          Saved on this device — next time we&apos;ll remember you.
        </p>
      </div>

      <button
        disabled={!canSit}
        onClick={() => {
          setJoining(true);
          onSit(name.trim());
        }}
        className="w-full py-4 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg shadow-lg shadow-emerald-900/40 transition-all active:translate-y-0.5"
      >
        {status === "ended"
          ? "Night is over"
          : seatedCount !== null && capacity !== null && seatedCount >= capacity
            ? "Table is full"
            : joining
              ? "Sitting down…"
              : "Take my seat"}
      </button>
    </div>
  );
}
