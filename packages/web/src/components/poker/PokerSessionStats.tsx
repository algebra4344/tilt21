"use client";

import type { SessionStats } from "@/lib/poker/types";
import { useClientMounted } from "@/hooks/useClientMounted";

type PokerSessionStatsProps = {
  stats: SessionStats;
  handsPlayed: number;
  handsPerSession: number;
  handNumber: number;
};

export default function PokerSessionStats({
  stats,
  handsPlayed,
  handsPerSession,
  handNumber,
}: PokerSessionStatsProps) {
  const mounted = useClientMounted();

  if (!mounted) {
    return (
    <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900/80 rounded-xl border border-zinc-800 px-3 py-1.5">
        <span className="text-zinc-500">Pots</span>
        <span>
          <span className="text-green-400">0</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">0</span>
        </span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-500">Streak</span>
        <span className="font-bold text-zinc-400">—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900/80 rounded-xl border border-zinc-800 px-3 py-1.5">
      <span className="text-zinc-500">Pots won</span>
      <span>
        <span className="text-green-400 font-bold">{stats.handsWon}</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-400">{stats.handsTotal}</span>
      </span>

      <span className="text-zinc-700">·</span>

      <span className="text-zinc-500">Streak</span>
      <span
        className={`font-bold ${
          stats.currentStreak >= 5
            ? "text-green-400"
            : stats.currentStreak >= 3
              ? "text-amber-400"
              : "text-zinc-400"
        }`}
      >
        {stats.currentStreak > 0 ? `${stats.currentStreak}` : "---"}
      </span>

      {handsPerSession > 0 && handsPlayed > 0 && (
        <>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">Hand</span>
          <span className="text-zinc-300">{handNumber}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">{handsPerSession}</span>
        </>
      )}
    </div>
  );
}
