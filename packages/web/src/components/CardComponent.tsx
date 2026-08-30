"use client";

import type { PlayerCard } from "@/stores/gameStore";

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

type CardComponentProps = {
  card: PlayerCard;
  index?: number;
  total?: number;
  small?: boolean;
};

export default function CardComponent({
  card,
  index = 0,
  small = false,
}: CardComponentProps) {
  const isHidden = !card.showingFace;
  const suit = SUIT_SYMBOLS[card.suit] || "?";
  const color = SUIT_COLORS[card.suit] || "text-zinc-900";
  const rank = card.rank === "T" ? "10" : card.rank;

  const size = small ? "w-12 h-16 text-xs" : "w-16 h-22 text-sm";
  const suitSize = small ? "text-base" : "text-xl";
  const rankSize = small ? "text-xs" : "text-sm";

  return (
    <div
      className="card-wrapper pointer-events-none select-none"
      style={{
        marginLeft: index > 0 ? (small ? "-18px" : "-24px") : "0",
        zIndex: index,
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div
        className={`${size} relative perspective-500 select-none`}
        style={{ animationDelay: `${index * 80}ms` }}
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
            <span className={`${rankSize} font-bold ${color} leading-none self-start ml-0.5`}>
              {rank}
            </span>
            <span className={`${suitSize} ${color} leading-none`}>{suit}</span>
            <span className={`${rankSize} font-bold ${color} leading-none self-end mr-0.5 rotate-180`}>
              {rank}
            </span>
          </div>
          {/* Back face */}
          <div
            className={`card-face card-back ${size} absolute inset-0 rounded-lg shadow-lg border border-zinc-700`}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
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
