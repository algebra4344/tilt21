"use client";

import type { PokerCard, Street } from "@/lib/poker/types";
import PokerCardComponent from "./PokerCardComponent";

const STREET_LABELS: Record<Street, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

type PokerBoardProps = {
  board: PokerCard[];
  street: Street;
};

export default function PokerBoard({ board, street }: PokerBoardProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs uppercase tracking-widest text-zinc-500">
        {STREET_LABELS[street]}
      </span>
      <div className="flex flex-wrap gap-1 sm:gap-1.5 min-h-[80px] sm:min-h-[112px] items-center justify-center">
        {board.length === 0 ? (
          <span className="text-sm text-zinc-600">No community cards yet</span>
        ) : (
          board.map((card, i) => (
            <div
              key={card.id}
              className="animate-deal-board"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <PokerCardComponent card={{ ...card, showingFace: true }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}