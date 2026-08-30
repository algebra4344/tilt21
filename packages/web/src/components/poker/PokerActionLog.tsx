"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/poker/types";

type LogEntry = { name: string; action: string; amount: number; street: string };

type PokerActionLogProps = {
  actionLogRef: React.MutableRefObject<LogEntry[]>;
  actionLogVersionRef: React.MutableRefObject<number>;
};

export default function PokerActionLog({ actionLogRef, actionLogVersionRef }: PokerActionLogProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [, setVersion] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => {
      setVersion(actionLogVersionRef.current);
      setEntries(actionLogRef.current);
    };
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, [actionLogRef, actionLogVersionRef]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="w-64 flex flex-col bg-zinc-900/90 border border-zinc-700/50 rounded-xl overflow-hidden shadow-lg">
      <div className="px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/50">
        <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Hand History</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-[140px] max-h-[320px]">
        {entries.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-zinc-600 italic">Waiting for actions...</span>
          </div>
        )}
        {entries.map((e, i) => {
          const isSeparator = e.name === "";
          if (isSeparator) {
            return (
              <div key={i} className="flex items-center gap-2 py-1.5 mt-1">
                <div className="flex-1 h-px bg-zinc-700/50" />
                <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider whitespace-nowrap">
                  {e.action.replace(/--- /, "").replace(/ ---/, "")}
                </span>
                <div className="flex-1 h-px bg-zinc-700/50" />
              </div>
            );
          }
          const isHuman = e.name === "You";
          const nameColor = isHuman ? "text-amber-300" : "text-zinc-300";
          let actionText = "";
          let actionColor = "text-zinc-400";
          if (e.action === "fold") {
            actionText = "folds";
            actionColor = "text-zinc-500";
          } else if (e.action === "call") {
            actionText = `calls ${formatMoney(e.amount)}`;
            actionColor = "text-green-400";
          } else if (e.action === "raise") {
            actionText = `raises to ${formatMoney(e.amount)}`;
            actionColor = "text-amber-400";
          }
          return (
            <div key={i} className="flex items-baseline gap-1.5 text-sm leading-relaxed">
              <span className={`font-semibold ${nameColor} shrink-0`}>{e.name}</span>
              <span className={actionColor}>{actionText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
