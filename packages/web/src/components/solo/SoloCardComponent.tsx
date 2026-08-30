"use client";

import type { SoloCard } from "@/hooks/useSoloGame";

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

type SoloCardComponentProps = {
  card: SoloCard;
  index?: number;
  small?: boolean;
  delay?: number;
  popValue?: number | null;
};

export default function SoloCardComponent({
  card,
  index = 0,
  small = false,
  delay = 0,
  popValue,
}: SoloCardComponentProps) {
  const isHidden = !card.showingFace;
  const suit = SUIT_SYMBOLS[card.suit] || "?";
  const color = SUIT_COLORS[card.suit] || "text-zinc-900";
  const rank = card.rank === "T" ? "10" : card.rank;

  // Mobile-first: phones get compact cards so a 10-card hand fits 320-430px;
  // sm+ restores original desktop dimensions (80x112 / 56x80).
  const size = small
    ? "w-11 h-16 sm:w-14 sm:h-20"
    : "w-14 h-20 sm:w-20 sm:h-28";
  const suitSize = small ? "text-base sm:text-lg" : "text-xl sm:text-2xl";
  const rankSize = small ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm";

  return (
    <div
      className={`card-wrapper ${
        index > 0
          ? small
            ? "-ml-4 sm:-ml-5"
            : "-ml-7 sm:-ml-[30px]"
          : ""
      }`}
      style={{
        zIndex: index,
        animationDelay: `${delay + index * 80}ms`,
      }}
    >
      {popValue !== undefined && popValue !== null && (
        <div className="card-pop absolute -top-6 left-1/2 z-20 pointer-events-none">
          <span
            className={`px-1.5 py-0.5 rounded-md text-xs font-mono font-bold bg-zinc-900/90 border border-zinc-700 shadow-lg ${
              popValue > 0
                ? "text-green-300"
                : popValue < 0
                  ? "text-red-300"
                  : "text-zinc-300"
            }`}
          >
            {popValue > 0 ? `+${popValue}` : popValue}
          </span>
        </div>
      )}
      <div
        className={`${size} relative perspective-500 select-none`}
        style={{ animationDelay: `${delay + index * 80}ms` }}
      >
        <div
          className={`card-inner ${isHidden ? "card-flipped" : ""}`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front face */}
          <div
            className={`card-face ${size} absolute inset-0 rounded-lg bg-white shadow-lg border border-zinc-200 flex flex-col items-center justify-between p-1`}
            style={{ backfaceVisibility: "hidden" }}
          >
            <span
              className={`${rankSize} font-bold ${color} leading-none self-start ml-0.5`}
            >
              {rank}
            </span>
            <span className={`${suitSize} ${color} leading-none`}>{suit}</span>
            <span
              className={`${rankSize} font-bold ${color} leading-none self-end mr-0.5 rotate-180`}
            >
              {rank}
            </span>
          </div>
          {/* Back face */}
          <div
            className={`card-face card-back ${size} absolute inset-0 rounded-lg shadow-lg border border-zinc-700`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
              <div className="w-[70%] h-[70%] rounded border-2 border-blue-400/40 flex items-center justify-center">
                <span className="text-blue-300/50 text-lg">♠</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
