"use client";

import { useEffect, useRef, useState } from "react";
import type { TableState } from "@/lib/poker/types";
import { formatMoney } from "@/lib/poker/types";

type PokerPotDisplayProps = {
  table: TableState | null;
};

export default function PokerPotDisplay({ table }: PokerPotDisplayProps) {
  const [pulsing, setPulsing] = useState(false);
  const prevPotRef = useRef(0);

  useEffect(() => {
    if (!table) return;
    if (table.pot !== prevPotRef.current && prevPotRef.current > 0) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 350);
      return () => clearTimeout(t);
    }
    prevPotRef.current = table.pot;
  }, [table, table?.pot]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`relative ${pulsing ? "animate-pot-pulse" : ""}`}>
        <div className="w-24 h-24 rounded-full bg-gradient-to-b from-amber-700 to-amber-900 border-2 border-amber-500/50 shadow-lg flex items-center justify-center">
          <span className="text-white font-bold text-2xl drop-shadow-md">
            {table ? formatMoney(table.pot) : "$0"}
          </span>
        </div>
      </div>
      {table && (
        <div className="text-sm font-mono text-zinc-400 text-center">
          {table.street.charAt(0).toUpperCase() + table.street.slice(1)} · {formatMoney(table.smallBlind)}/{formatMoney(table.bigBlind)}
        </div>
      )}
    </div>
  );
}
