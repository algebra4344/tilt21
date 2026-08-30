"use client";

import type { SeatState } from "@/lib/poker/types";
import { formatMoney } from "@/lib/poker/types";
import { identityColor } from "@/lib/guest";
import PokerCardComponent from "./PokerCardComponent";

type PokerPlayerSeatProps = {
  seat: SeatState;
  streetBet: number;
  reveal: boolean;
  active: boolean;
  winner: boolean;
  equity: number | null;
  lastAction?: string;
  flip?: boolean;
  hideHud?: boolean;
};

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-amber-500",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-orange-600",
  "bg-teal-600",
  "bg-indigo-600",
];

function Chip({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-xs font-extrabold shadow-lg ${cls}`}
    >
      {label}
    </span>
  );
}

export default function PokerPlayerSeat({
  seat,
  streetBet,
  reveal,
  active,
  winner,
  equity,
  lastAction,
  flip = false,
  hideHud = false,
}: PokerPlayerSeatProps) {
  const pct = equity !== null ? Math.round(equity) : null;
  const eqText =
    pct === null ? "" : pct >= 50 ? "text-green-300" : pct >= 25 ? "text-amber-300" : "text-red-300";
  const eqBar =
    pct === null ? "" : pct >= 50 ? "bg-green-400" : pct >= 25 ? "bg-amber-400" : "bg-red-400";

  const hud = hideHud ? null : (
    <div
      className={`flex flex-col items-center gap-0.5 bg-black/60 backdrop-blur-sm border rounded-lg px-2 py-1 min-w-[92px] sm:min-w-[110px] ${
        active
          ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
          : winner
            ? "border-green-500/60"
            : "border-white/10"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <div
          className={`w-6 h-6 text-xs sm:w-8 sm:h-8 sm:text-sm rounded-full flex items-center justify-center text-white font-bold ring-2 ${
            seat.isHuman ? "ring-amber-400" : "ring-zinc-700"
          } ${seat.playerId ? "" : AVATAR_COLORS[seat.seatIndex]}`}
          style={
            seat.playerId ? { backgroundColor: identityColor(seat.playerId) } : undefined
          }
        >
          {seat.isHuman ? "Y" : seat.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-col items-start leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-zinc-300 truncate max-w-[48px] sm:max-w-[64px]">
              {seat.name}
            </span>
            {pct !== null && !seat.folded && (
              <span className={`text-xs sm:text-sm font-mono font-bold ${eqText}`}>{pct}%</span>
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-mono text-zinc-400">
            <span className="text-yellow-400 text-[10px]">●</span> {formatMoney(seat.stack)}
          </span>
        </div>
      </div>
      {pct !== null && !seat.folded && (
        <div className="w-full h-1.5 rounded bg-zinc-700 overflow-hidden">
          <div className={`h-full ${eqBar}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );

  const chipsRow = (
    <div className="flex items-center gap-1.5">
      {seat.isDealer && <Chip label="D" cls="bg-white border-zinc-400 text-zinc-900" />}
      {seat.position === "SB" && <Chip label="SB" cls="bg-blue-500 border-blue-300 text-white" />}
      {seat.position === "BB" && <Chip label="BB" cls="bg-red-500 border-red-300 text-white" />}
      {!seat.isDealer && seat.position !== "SB" && seat.position !== "BB" && (
        <span className="w-6 sm:w-8" /> // keep spacing; hide jargon like UTG/MP/CO for casual players
      )}
    </div>
  );

  const badge = lastAction && (
    <span
      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
        lastAction === "FOLD"
          ? "bg-zinc-700/50 text-zinc-400"
          : lastAction.startsWith("CALL")
            ? "bg-green-500/15 text-green-400"
            : lastAction.startsWith("YOUR")
              ? "bg-amber-500/20 text-amber-300"
              : "bg-amber-500/15 text-amber-400"
      }`}
    >
      {lastAction}
    </span>
  );

  const holeCards = (
    <div className="flex gap-1">
      {seat.holeCards.map((card, i) => (
        <PokerCardComponent
          key={`${seat.seatIndex}-${i}`}
          card={reveal || seat.isHuman ? { ...card, showingFace: true } : card}
          small
        />
      ))}
    </div>
  );

  const betRow = seat.folded ? (
    <span className="text-xs uppercase tracking-wider text-zinc-600">folded</span>
  ) : (
    streetBet > 0 && (
      <span className="text-sm font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 rounded-full px-3 py-0.5 shadow">
        {formatMoney(streetBet)}
      </span>
    )
  );

  const stackBadge = hideHud && seat.stack > 0 ? (
    <span className="text-sm font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5">
      {formatMoney(seat.stack)}
    </span>
  ) : null;

  return (
    <div
      className={`flex flex-col items-center gap-1 w-24 sm:w-36 transition-all ${
        winner ? "scale-110" : ""
      } ${seat.folded ? "opacity-45" : ""}`}
    >
      {flip ? (
        <>
          {holeCards}
          {betRow}
          {badge}
          {chipsRow}
          {stackBadge}
          {hud}
        </>
      ) : (
        <>
          {hud}
          {chipsRow}
          {badge}
          {holeCards}
          {betRow}
        </>
      )}
    </div>
  );
}
