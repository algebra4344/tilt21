"use client";

import { useGameStore } from "@/stores/gameStore";

export default function BjHandHistory() {
  const handHistory = useGameStore((s) => s.handHistory);

  if (handHistory.length === 0) return null;

  return (
    <div className="w-full flex flex-col bg-zinc-900/90 border border-zinc-700/50 rounded-xl overflow-hidden shadow-lg">
      <div className="px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/50">
        <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
          Recent Hands
        </span>
      </div>
      <div className="overflow-y-auto px-3 py-2 space-y-2 max-h-[280px]">
        {handHistory.map((round) => (
          <div key={round.round} className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600">
              Hand #{round.round}
            </div>
            {round.entries.map((e, i) => (
              <div key={i} className="flex justify-between text-sm leading-snug">
                <span className="text-zinc-300 truncate">{e.username}</span>
                <span
                  className={`font-mono font-bold ${
                    e.payout > 0
                      ? "text-green-400"
                      : e.payout < 0
                        ? "text-red-400"
                        : "text-zinc-500"
                  }`}
                >
                  {e.result !== "push" && e.payout !== 0 ? (e.payout > 0 ? "+" : "") : ""}
                  {e.payout.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
