"use client";

import { useEffect, useRef } from "react";

export type HandEvent = {
  handNumber: number;
  result: "WIN" | "LOSE" | "PUSH";
  bet: number;
  profit: number;
  trueCount: number;
  tip: string;
};

function getTip(result: string, tc: number): string {
  const tcAbs = Math.abs(tc);
  if (result === "PUSH") return "Push — no edge either way.";
  if (tc >= 2) {
    return result === "WIN"
      ? `TC was +${tcAbs.toFixed(1)} → deck favored you. This is when you want to win big.`
      : `TC was +${tcAbs.toFixed(1)} but you lost → variance. The edge plays out over hundreds of hands.`;
  }
  if (tc <= -1) {
    return result === "WIN"
      ? `TC was ${tc.toFixed(1)} → house had the edge. You got lucky — in the long run this bet loses.`
      : `TC was ${tc.toFixed(1)} → house had the edge. Bet minimum when the count is negative.`;
  }
  return result === "WIN"
    ? `TC was near zero → no real edge. A win here is mostly luck.`
    : `TC was near zero → no real edge. Stick to basic strategy and wait for a positive count.`;
}

export function buildHandEvent(
  handNumber: number,
  handWinner: Record<string, string>,
  bet: number,
  trueCount: number,
): HandEvent {
  let rawResult = "LOSE";
  Object.values(handWinner).forEach((w) => {
    if (w === "0") rawResult = "WIN";
    else if (w === "2") rawResult = "PUSH";
  });

  const result = rawResult as "WIN" | "LOSE" | "PUSH";
  const won = rawResult === "WIN";
  const pushed = rawResult === "PUSH";
  const profit = won ? bet : pushed ? 0 : -bet;

  return {
    handNumber,
    result,
    bet,
    profit,
    trueCount,
    tip: getTip(result, trueCount),
  };
}

type HandHistoryToggleProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function HandHistoryToggle({ isOpen, onToggle }: HandHistoryToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`px-2 py-1.5 rounded-lg text-sm transition-colors ${
        isOpen
          ? "bg-amber-600/30 border border-amber-500/50 text-amber-200"
          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
      }`}
      title="Hand History"
    >
      History
    </button>
  );
}

type HandHistorySidebarProps = {
  events: HandEvent[];
  isOpen: boolean;
};

export function HandHistorySidebar({ events, isOpen }: HandHistorySidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(events.length);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (events.length > prevLenRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevLenRef.current = events.length;
  }, [events.length]);

  return (
    <div
      className={`flex-shrink-0 overflow-hidden transition-all duration-300 ${
        isOpen ? "w-60" : "w-0"
      }`}
    >
      <div className="w-60 h-[calc(100vh-180px)] bg-zinc-900/80 border-l border-zinc-700/50 flex flex-col">
        <div className="px-3 py-1.5 border-b border-zinc-700/50 shrink-0">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Hand History
          </h3>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
          {events.length === 0 && (
            <div className="text-[11px] text-zinc-600 text-center py-4">
              No hands played yet.
            </div>
          )}

          {[...events].reverse().map((ev) => (
            <div
              key={ev.handNumber}
              className="bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1.5"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">
                  Hand #{ev.handNumber}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    ev.result === "WIN"
                      ? "text-green-400"
                      : ev.result === "LOSE"
                        ? "text-red-400"
                        : "text-zinc-400"
                  }`}
                >
                  {ev.result}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-zinc-400">
                  Bet: <span className="text-zinc-200 font-mono">{ev.bet.toLocaleString()}</span>
                </span>
                <span
                  className={`font-mono font-medium ${
                    ev.profit > 0
                      ? "text-green-400"
                      : ev.profit < 0
                        ? "text-red-400"
                        : "text-zinc-400"
                  }`}
                >
                  {ev.profit > 0 ? "+" : ""}{ev.profit.toLocaleString()}
                </span>
              </div>

              <div className="text-[9px] text-zinc-500 mb-1">
                TC at bet:{" "}
                <span
                  className={`font-mono font-medium ${
                    ev.trueCount >= 2
                      ? "text-green-400"
                      : ev.trueCount <= -2
                        ? "text-red-400"
                        : "text-zinc-300"
                  }`}
                >
                  {ev.trueCount > 0 ? "+" : ""}{ev.trueCount.toFixed(1)}
                </span>
              </div>

              <div className="text-[9px] text-zinc-500 leading-relaxed border-t border-zinc-700/40 pt-1">
                {ev.tip}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
