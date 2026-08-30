"use client";

import type { PokerCard } from "@/lib/poker/types";

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "text-zinc-900",
  h: "text-red-500",
  d: "text-red-500",
  c: "text-zinc-900",
};

type PokerCardComponentProps = {
  card: PokerCard;
  small?: boolean;
};

export default function PokerCardComponent({ card, small = false }: PokerCardComponentProps) {
  const isHidden = !card.showingFace;
  const suit = SUIT_SYMBOLS[card.suit] || "?";
  const color = SUIT_COLORS[card.suit] || "text-zinc-900";
  const rank = card.rank === "T" ? "10" : card.rank;

  // Mobile-first sizing: phones get compact cards so a 5-card river fits a
  // 320–430px screen; sm/md restore the original desktop dimensions.
  const size = small
    ? "w-12 h-16 sm:w-16 sm:h-22"
    : "w-[52px] h-[70px] sm:w-20 sm:h-[104px] md:w-24 md:h-32";
  const suitSize = small ? "text-base sm:text-lg" : "text-xl sm:text-2xl md:text-3xl";
  const rankSize = small ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm md:text-base";

  if (isHidden) {
    return (
      <div className={`${size} rounded-lg shadow-lg border border-zinc-700 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center select-none`}>
        <div className="w-[70%] h-[70%] rounded border-2 border-blue-400/40 flex items-center justify-center">
          <span className="text-blue-300/50 text-lg">♠</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${size} relative select-none`}>
      <div
        className={`${size} absolute inset-0 rounded-lg bg-white shadow-lg border border-zinc-200 flex flex-col items-center justify-between p-1`}
      >
        <span className={`${rankSize} font-bold ${color} leading-none self-start ml-0.5`}>
          {rank}
        </span>
        <span className={`${suitSize} ${color} leading-none`}>{suit}</span>
        <span className={`${rankSize} font-bold ${color} leading-none self-end mr-0.5 rotate-180`}>
          {rank}
        </span>
      </div>
    </div>
  );
}
