"use client";

import { useState } from "react";
import { useHomeStore } from "@/stores/homeStore";
import { formatMoney } from "@/lib/poker/types";

export default function HomeSettlementModal() {
  const settlement = useHomeStore((s) => s.settlement);
  const [copied, setCopied] = useState(false);

  if (!settlement) return null;

  const summary = [
    "Game night results",
    ...settlement.nets.map(
      (n) => `${n.name}: ${n.net >= 0 ? "+" : ""}${formatMoney(n.net)}`,
    ),
    "",
    "Settle up:",
    ...(settlement.transfers.length > 0
      ? settlement.transfers.map((t) => `${t.from} pays ${t.to} ${formatMoney(t.amount)}`)
      : ["All square"]),
  ].join("\n");

  const sorted = [...settlement.nets].sort((a, b) => b.net - a.net);
  const maxAbs = Math.max(...sorted.map((n) => Math.abs(n.net)), 1);

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-center">Settle up</h2>

        <div className="space-y-2">
          {sorted.map((n) => {
            const pct = (Math.abs(n.net) / maxAbs) * 100;
            return (
              <div key={n.seatIndex} className="flex items-center gap-3">
                <span className="w-20 text-sm text-zinc-300 truncate">{n.name}</span>
                <div className="flex-1 h-5 rounded bg-zinc-800 overflow-hidden relative">
                  <div
                    className={`absolute top-0 bottom-0 ${n.net >= 0 ? "bg-emerald-500/70 left-1/2" : "bg-red-500/70 right-1/2"}`}
                    style={{ width: `${pct / 2}%` }}
                  />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600" />
                </div>
                <span
                  className={`w-24 text-right font-mono font-bold ${
                    n.net > 0 ? "text-emerald-400" : n.net < 0 ? "text-red-400" : "text-zinc-500"
                  }`}
                >
                  {n.net >= 0 ? "+" : ""}
                  {formatMoney(n.net)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-500">Transfers</span>
          {settlement.transfers.length === 0 ? (
            <p className="text-sm text-zinc-400">All square</p>
          ) : (
            settlement.transfers.map((t, i) => (
              <p key={i} className="text-sm text-zinc-200">
                <span className="font-semibold">{t.from}</span> pays{" "}
                <span className="font-semibold">{t.to}</span>{" "}
                <span className="font-mono">{formatMoney(t.amount)}</span>
              </p>
            ))
          )}
        </div>

        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(summary);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // clipboard unavailable
            }
          }}
          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors"
        >
          {copied ? "Copied!" : "Copy summary for the group chat"}
        </button>
      </div>
    </div>
  );
}
