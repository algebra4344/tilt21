"use client";

import type { AllTimeStats, SessionStats } from "@/hooks/useSoloGame";

type SessionStatsProps = {
  stats: SessionStats;
  allTime?: AllTimeStats;
  onReset?: () => void;
};

// Accuracy front and center: the one number a trainer exists for.
// Big color-coded badge on the left; the rest of the session compactly right.
export default function SessionStatsDisplay({ stats, allTime, onReset }: SessionStatsProps) {
  const accColor =
    stats.movesTotal === 0
      ? "text-zinc-500"
      : stats.accuracy >= 70
        ? "text-green-400"
        : stats.accuracy >= 50
          ? "text-amber-400"
          : "text-red-400";

  const showAllTime =
    allTime !== undefined &&
    (allTime.handsTrained > 0 || allTime.movesTotal > 0);
  const allTimeAcc =
    allTime && allTime.movesTotal > 0
      ? Math.round((allTime.movesCorrect / allTime.movesTotal) * 100)
      : null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Accuracy — the hero stat */}
      <div className="flex items-center gap-2 bg-zinc-900/80 rounded-xl border border-zinc-800 px-3 py-1.5">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Correct</span>
        <span className={`text-lg font-black font-mono tabular-nums leading-none ${accColor}`}>
          {stats.movesTotal > 0 ? `${stats.accuracy}%` : "—"}
        </span>
        <span className="text-xs font-mono text-zinc-500">
          {stats.movesCorrect}/{stats.movesTotal}
        </span>
        {onReset && stats.movesTotal > 0 && (
          <button
            onClick={onReset}
            title="Reset session stats"
            className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 text-[11px] leading-none transition-colors"
          >
            ↺
          </button>
        )}
      </div>

      {/* Secondary stats */}
      <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900/80 rounded-xl border border-zinc-800 px-3 py-1.5">
        <span>
          <span className="text-zinc-500">Hands </span>
          <span className="text-green-400">{stats.handsWon}</span>
          <span className="text-zinc-600">-</span>
          <span className="text-red-400">{stats.handsLost}</span>
          <span className="text-zinc-600">-</span>
          <span className="text-zinc-400">{stats.handsPushed}</span>
        </span>
        <span className="text-zinc-700">·</span>
        <span
          className={`font-bold ${
            stats.currentStreak >= 5
              ? "text-green-400"
              : stats.currentStreak >= 3
                ? "text-amber-400"
                : "text-zinc-400"
          }`}
        >
          {stats.currentStreak > 0 ? stats.currentStreak : "—"}
        </span>
        <span className="text-zinc-700">·</span>
        <span
          className={`font-bold ${
            stats.profit > 0 ? "text-green-400" : stats.profit < 0 ? "text-red-400" : "text-zinc-300"
          }`}
        >
          {stats.bankroll.toLocaleString()}
        </span>
        <span
          className={`text-[10px] ${
            stats.profit > 0 ? "text-green-500" : stats.profit < 0 ? "text-red-500" : "text-zinc-500"
          }`}
        >
          {stats.profit > 0 ? "+" : ""}
          {stats.profit.toLocaleString()}
        </span>
      </div>

      {/* All-time record — survives refreshes, the reason to come back */}
      {showAllTime && allTime && (
        <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900/80 rounded-xl border border-zinc-800 px-3 py-1.5">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
            All-time
          </span>
          {allTimeAcc !== null && (
            <>
              <span
                className={`font-bold ${
                  allTimeAcc >= 70
                    ? "text-green-400"
                    : allTimeAcc >= 50
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                {allTimeAcc}%
              </span>
              <span className="text-zinc-700">·</span>
            </>
          )}
          <span className="text-zinc-400">{allTime.handsTrained.toLocaleString()} hands</span>
          {allTime.bestStreak > 0 && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400">
                best <span className="text-green-400">{allTime.bestStreak}</span>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
