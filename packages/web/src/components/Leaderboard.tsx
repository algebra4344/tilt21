"use client";

import { useState, useEffect } from "react";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/api";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading leaderboard...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Leaderboard</h1>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/80 text-zinc-400 text-left">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 font-medium text-right">Chips</th>
              <th className="px-4 py-3 font-medium text-right">Games</th>
              <th className="px-4 py-3 font-medium text-right">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const winRate =
                entry.gamesPlayed > 0
                  ? ((entry.gamesWon / entry.gamesPlayed) * 100).toFixed(1)
                  : "0.0";

              return (
                <tr
                  key={entry.id}
                  className={`border-t border-zinc-800/50 ${
                    i < 3 ? "bg-amber-900/10" : "hover:bg-zinc-800/30"
                  }`}
                >
                  <td className="px-4 py-3 text-zinc-500">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-100">
                    {entry.username}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-400 font-medium">
                    {entry.chips.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {entry.gamesPlayed}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">{winRate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
