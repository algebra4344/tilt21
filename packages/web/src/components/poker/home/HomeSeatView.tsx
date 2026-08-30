"use client";

import type { HomePlayerView } from "@/stores/homeTypes";
import { formatMoney } from "@/lib/poker/types";
import { identityColor } from "@/lib/guest";

type Props = {
  seat: NonNullable<HomePlayerView>;
  isYou: boolean;
  isHost: boolean;
  isDealer: boolean;
  isToAct: boolean;
  streetBet: number;
  folded: boolean;
  winner: boolean;
};

export default function HomeSeatView({
  seat,
  isYou,
  isHost,
  isDealer,
  isToAct,
  streetBet,
  folded,
  winner,
}: Props) {
  const dimmed = seat.fullyOut || seat.sittingOut || folded;
  const initial = seat.name.slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex flex-col items-center gap-1 w-32 transition-all ${
        winner ? "scale-110" : ""
      } ${dimmed ? "opacity-40" : ""}`}
    >
      <div
        className={`flex flex-col items-center gap-0.5 bg-black/60 backdrop-blur-sm border rounded-xl px-3 py-2 min-w-[120px] ${
          winner
            ? "border-green-400 shadow-[0_0_16px_rgba(74,222,128,0.5)]"
            : isToAct && !dimmed
              ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
              : "border-white/10"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ${
              isYou ? "ring-amber-400" : "ring-zinc-700"
            }`}
            style={{ backgroundColor: identityColor(seat.name) }}
          >
            {initial}
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm font-semibold text-zinc-200 truncate max-w-[70px]">
              {seat.name}
              {isHost && " 👑"}
            </span>
            <span className="text-sm font-mono font-bold text-yellow-400">
              {formatMoney(seat.stack)}
            </span>
          </div>
        </div>
        <div className="flex gap-1 text-[10px] font-mono text-zinc-400">
          {isDealer && (
            <span className="px-1.5 rounded bg-white text-zinc-900 font-bold">D</span>
          )}
          {seat.sittingOut && <span>sitting out</span>}
          {seat.fullyOut && <span>cashed out</span>}
          {!seat.fullyOut && !seat.sittingOut && seat.cashedOut > 0 && (
            <span>cashed {formatMoney(seat.cashedOut)}</span>
          )}
        </div>
      </div>

      {streetBet > 0 && !folded ? (
        <span className="text-sm font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 rounded-full px-3 py-0.5 shadow">
          {formatMoney(streetBet)}
        </span>
      ) : folded ? (
        <span className="text-xs uppercase tracking-wider text-zinc-600">folded</span>
      ) : (
        <span className="h-[22px]" />
      )}
    </div>
  );
}
