"use client";

import DiscardTray from "./DiscardTray";

type CountDisplayProps = {
  runningCount: number;
  trueCount: number;
  penetration: number;
  cardsRemaining: number;
  decksRemaining: number;
  totalCards: number;
  deckCount: number;
  hideDecksRemainingText: boolean;
};

export default function CountDisplay({
  runningCount,
  trueCount,
  cardsRemaining,
  totalCards,
  deckCount,
  hideDecksRemainingText,
}: CountDisplayProps) {
  const rcColor =
    runningCount > 0
      ? "text-green-400"
      : runningCount < 0
        ? "text-red-400"
        : "text-zinc-300";

  const tcColor =
    trueCount >= 2
      ? "text-green-400"
      : trueCount <= -2
        ? "text-red-400"
        : "text-zinc-300";

  const tcLabel =
    trueCount >= 4
      ? "STRONG"
      : trueCount >= 2
        ? "GOOD"
        : trueCount >= 0
          ? "NEUTRAL"
          : trueCount >= -2
            ? "POOR"
            : "BAD";

  const rcDisplay = `${runningCount > 0 ? "+" : ""}${runningCount}`;
  const tcDisplay = `${trueCount > 0 ? "+" : ""}${trueCount.toFixed(1)}`;

  const tcAction =
    trueCount >= 4
      ? "↑↑ Raise bets"
      : trueCount >= 2
        ? "↑ Raise bets"
        : trueCount >= 0
          ? "— Base bet"
          : trueCount >= -2
            ? "↓ Min bet"
            : "↓↓ Min bet";

  return (
    <div className="flex flex-col gap-1.5 px-4 py-2.5 bg-zinc-950/70 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl select-none">
      {/* Row 1: Running Count */}
      <div className="flex items-center justify-between gap-6">
        <div className="relative group pointer-events-auto cursor-help">
          <span className="text-xs text-zinc-400 font-medium border-b border-dotted border-zinc-600">
            Running Count
          </span>
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full w-56 px-2.5 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-[10px] text-zinc-300 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
            Sum of all visible card values.
            <br />+1 for low cards (2–6), −1 for high (10–A), 0 for 7–9.
          </span>
        </div>
        <span className={`text-2xl font-bold font-mono leading-none ${rcColor}`}>
          {rcDisplay}
        </span>
      </div>

      {/* Row 2: True Count + label + tray */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative group pointer-events-auto cursor-help">
          <span className="text-xs text-zinc-400 font-medium border-b border-dotted border-zinc-600">
            True Count
          </span>
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full w-60 px-2.5 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-[10px] text-zinc-300 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
            Running Count ÷ Decks Remaining.
            <br />Measures how rich the deck is in high cards.
            <br /><span className="text-green-400">Higher = more favorable for you → bet more.</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold font-mono leading-none ${tcColor}`}>
            {tcDisplay}
          </span>
          <span
            className={`text-xs font-bold tracking-wider ${
              trueCount >= 2
                ? "text-green-500"
                : trueCount <= -2
                  ? "text-red-500"
                  : "text-zinc-500"
            }`}
          >
            {tcLabel}
          </span>
        </div>
        <DiscardTray
          totalCards={totalCards}
          cardsRemaining={cardsRemaining}
          deckCount={deckCount}
          hideDecksText={hideDecksRemainingText}
        />
      </div>

      {/* Row 3: Action hint */}
      <div className="text-[10px] text-zinc-500 text-center border-t border-white/5 pt-1">
        {tcAction}
      </div>
    </div>
  );
}
