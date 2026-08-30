"use client";

import { useEffect, useRef } from "react";
import { formatMoney } from "@/lib/poker/types";

export type ActionLogEntry = {
  name: string;
  action: string;
  amount: number;
  street: string;
};

type Props = {
  entries: ActionLogEntry[];
  /** Fixed height container; panel scrolls to newest entry. */
  height?: string;
  /** "light" uses chipless theme vars (default dark zinc). */
  tone?: "dark" | "light";
};

// Multiplayer action feed — same look as the trainer's Hand History panel,
// driven by server state instead of refs.
export default function PokerActionLogView({ entries, height = "min-h-[140px] max-h-[260px]", tone = "dark" }: Props) {
  const light = tone === "light";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className={`w-full flex flex-col rounded-xl overflow-hidden shadow-lg ${light ? "ch-card" : "bg-zinc-900/90 border border-zinc-700/50"}`}>
      <div className={`px-3 py-2 border-b ${light ? "border-[var(--ch-border)] bg-[var(--ch-surface-2)]" : "border-zinc-700/50 bg-zinc-800/50"}`}>
        <span className={`text-xs uppercase tracking-widest font-semibold ${light ? "ch-muted" : "text-zinc-400"}`}>
          Hand History
        </span>
      </div>
      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-3 py-2 space-y-1 ${height}`}>
        {entries.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <span className={`text-sm italic ${light ? "ch-muted" : "text-zinc-600"}`}>Waiting for actions…</span>
          </div>
        )}
        {entries.map((e, i) => {
          if (e.name === "") {
            return (
              <div key={i} className="flex items-center gap-2 py-1.5 mt-1">
                <div className={`flex-1 h-px ${light ? "bg-[var(--ch-border)]" : "bg-zinc-700/50"}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${light ? "ch-gold" : "text-amber-400/80"}`}>
                  {e.action.replace(/--- /g, "").replace(/ ---/g, "")}
                </span>
                <div className={`flex-1 h-px ${light ? "bg-[var(--ch-border)]" : "bg-zinc-700/50"}`} />
              </div>
            );
          }
          const isWin = e.action === "wins pot";
          let verb = "";
          let color = light ? "" : "text-zinc-300";
          if (isWin) { verb = "wins"; color = light ? "ch-accent" : "text-green-400"; }
          else if (e.action === "fold") { verb = "folds"; color = light ? "ch-muted" : "text-zinc-500"; }
          else if (e.action === "call") { verb = "calls"; }
          else if (e.action === "raise") { verb = "raises to"; }

          const amountText =
            e.amount > 0 ? `${formatMoney(e.amount)}` : "";

          return (
            <div key={i} className="text-sm leading-snug">
              <span className={`font-semibold ${light ? "" : "text-zinc-200"}`}>{e.name}</span>{" "}
              <span className={color}>
                {verb}
                {amountText && (
                  <span className="font-mono font-bold"> {amountText}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
