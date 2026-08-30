"use client";

import type { ReactNode } from "react";

// Shared felt-table presentation: oblong oval felt, gold trim ring, seats
// positioned around the ellipse, and a center slot for board + pot.
export function computeSeatPositions(
  seatCount: number,
  heroIndex: number,
  landscape = false,
): Record<number, { top: string; left: string; transform: string }> {
  const positions: Record<number, { top: string; left: string; transform: string }> = {};
  // Landscape: wider / slightly flatter ring so seats use the horizontal room.
  const cx = 50;
  const cy = landscape ? 48 : 45;
  const rx = landscape ? 44 : 38;
  const ry = landscape ? 34 : 28;

  for (let i = 0; i < seatCount; i++) {
    // Hero sits at bottom-center; others spread counter-clockwise.
    const anchor = heroIndex >= 0 && heroIndex < seatCount ? heroIndex : 0;
    const angleOffset = ((i - anchor) / seatCount) * 2 * Math.PI;
    const angle = Math.PI / 2 + angleOffset;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    positions[i] = {
      top: `${y}%`,
      left: `${x}%`,
      transform: "translate(-50%, -50%)",
    };
  }
  return positions;
}

type PokerTableOvalProps = {
  /** Number of physical seats to place around the felt. */
  seatCount: number;
  /** Viewer's seat index (bottom-center). Pass -1/null for spectator view. */
  heroIndex: number;
  /** Renders the seat UI for a given seat index (0..seatCount-1). */
  renderSeat: (seatIndex: number) => ReactNode;
  /** Center of the felt: community cards, pot, idle messages… */
  center?: ReactNode;
  /** Optional banner above center (showdown text, turn prompts…). */
  banner?: ReactNode;
  /** Wide/short chrome — fills height, uses a flatter oval. */
  landscape?: boolean;
};

export default function PokerTableOval({
  seatCount,
  heroIndex,
  renderSeat,
  center,
  banner,
  landscape = false,
}: PokerTableOvalProps) {
  const positions = computeSeatPositions(
    Math.max(seatCount, 2),
    heroIndex,
    landscape,
  );

  return (
    <div
      className={
        landscape
          ? "relative w-full h-full min-h-0"
          : "relative w-full h-full min-h-[340px] sm:min-h-[420px]"
      }
    >
      {/* Felt — landscape sizes by height so the oval stays usable on short phones */}
      <div
        className={
          landscape
            ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[82%] max-h-full w-auto max-w-[94%] aspect-[2/1] rounded-[50%] bg-felt shadow-[0_0_0_3px_#8B6914,0_0_0_7px_#5C4A0F,0_0_0_9px_#3d2b1f,0_0_30px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(0,0,0,0.3)] overflow-hidden pointer-events-none"
            : "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[86%] sm:w-[72%] aspect-[16/9] rounded-[50%] bg-felt shadow-[0_0_0_3px_#8B6914,0_0_0_7px_#5C4A0F,0_0_0_9px_#3d2b1f,0_0_30px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(0,0,0,0.3)] overflow-hidden pointer-events-none"
        }
      >
        <div className="absolute inset-0 felt-texture pointer-events-none" />
        <div className="absolute inset-5 rounded-[50%] border border-amber-800/15 pointer-events-none" />
      </div>

      {/* Center: board + pot */}
      {center && (
        <div
          className={
            landscape
              ? "absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1.5 w-full px-2 max-w-md"
              : "absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 w-full px-2 max-w-xs sm:max-w-sm"
          }
        >
          {center}
        </div>
      )}

      {/* Banner (winners, prompts…) */}
      {banner && (
        <div
          className={
            landscape
              ? "absolute left-1/2 top-[10%] -translate-x-1/2 -translate-y-1/2 z-40 text-center pointer-events-none w-full px-2"
              : "absolute left-1/2 top-[14%] -translate-x-1/2 -translate-y-1/2 z-40 text-center pointer-events-none w-full px-2"
          }
        >
          {banner}
        </div>
      )}

      {/* Seats around the oval */}
      {Array.from({ length: seatCount }, (_, i) => (
        <div
          key={`oval-seat-${i}`}
          className="absolute z-30"
          style={positions[i]}
        >
          {renderSeat(i)}
        </div>
      ))}
    </div>
  );
}
