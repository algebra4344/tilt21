"use client";

import CardComponent from "./CardComponent";
import type { HandInfo, PlayerState } from "@/stores/gameStore";

type PlayerPositionProps = {
  player: PlayerState | null;
  isActive: boolean;
  isLocal: boolean;
  seatIndex: number;
};

function winnerOf(player: PlayerState, hand: HandInfo): string | null {
  if (!player.handWinner || !hand.id) return null;
  const w = player.handWinner[hand.id];
  if (w === "0") return "win";
  if (w === "2") return "push";
  if (w === "1") return "lose";
  return null;
}

export default function PlayerPosition({
  player,
  isActive,
  isLocal,
  seatIndex,
}: PlayerPositionProps) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center bg-zinc-800/50">
          <span className="text-zinc-500 text-xs">Empty</span>
        </div>
        <span className="text-zinc-500 text-xs">Seat {seatIndex + 1}</span>
      </div>
    );
  }

  const hands = player.hands ?? [];
  const mainHand = hands[0];
  const betAmount = mainHand?.bet ?? player.bet ?? 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Player info */}
      <div
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          isActive
            ? "bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/50 animate-pulse"
            : "bg-zinc-800/80 text-zinc-300"
        }`}
      >
        {player.username}
        {isLocal && " (You)"}
      </div>

      {/* Chip count */}
      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span className="text-yellow-400">●</span>
        <span>{player.balance?.toLocaleString()}</span>
      </div>

      {/* Bet amount */}
      {betAmount > 0 && (
        <div className="px-2 py-0.5 rounded bg-amber-600/20 text-amber-300 text-xs font-medium">
          Bet: {betAmount.toLocaleString()}
        </div>
      )}

      {/* Hands (split hands each get their own row) */}
      <div className="flex flex-col gap-1">
        {hands.length === 0 && (
          <div className="w-12 h-16 rounded-lg border border-zinc-700 bg-zinc-800/50" />
        )}

        {hands.map((hand) => {
          const winner = winnerOf(player, hand);
          return (
            <div key={hand.id ?? hand.handIndex} className="flex flex-col items-center gap-0.5">
              {hand.cards.length > 0 ? (
                <div className="flex items-end pointer-events-none">
                  {hand.cards.map((card, i) => (
                    <CardComponent key={card.id} card={card} index={i} small />
                  ))}
                </div>
              ) : (
                <div className="w-12 h-16 rounded-lg border border-zinc-700 bg-zinc-800/50" />
              )}

              {hand.cardTotal > 0 && (
                <div
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    hand.busted
                      ? "bg-red-500/30 text-red-400"
                      : hand.blackjack
                        ? "bg-yellow-500/30 text-yellow-300"
                        : "bg-zinc-700/50 text-zinc-200"
                  }`}
                >
                  {hand.busted ? "BUST" : hand.blackjack ? "BJ" : hand.cardTotal}
                </div>
              )}

              {winner && (
                <div
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    winner === "win"
                      ? "bg-green-500/30 text-green-400"
                      : winner === "push"
                        ? "bg-zinc-500/30 text-zinc-400"
                        : "bg-red-500/30 text-red-400"
                  }`}
                >
                  {winner === "win" ? "WIN" : winner === "push" ? "PUSH" : "LOSE"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}