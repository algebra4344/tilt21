"use client";

type CompactCountStripProps = {
  runningCount: number;
  trueCount: number;
  decksRemaining: number;
};

// Phone-sized count readout: one slim line pinned to the felt's top-left
// corner (dealer cards are centered, so the corner stays clear). Replaces
// the full centered panel, which would cover the player's cards on a
// short felt.
export default function CompactCountStrip({
  runningCount,
  trueCount,
  decksRemaining,
}: CompactCountStripProps) {
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
  const rcDisplay = `${runningCount > 0 ? "+" : ""}${runningCount}`;
  const tcDisplay = `${trueCount > 0 ? "+" : ""}${trueCount.toFixed(1)}`;

  return (
    <div className="absolute top-2 left-2 z-30 pointer-events-none flex items-center gap-2 rounded-lg bg-zinc-950/85 backdrop-blur-sm border border-white/10 px-2.5 py-1.5 text-[11px] font-mono shadow-lg select-none">
      <span className="text-zinc-400">
        RC <span className={`font-bold ${rcColor}`}>{rcDisplay}</span>
      </span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-400">
        TC <span className={`font-bold ${tcColor}`}>{tcDisplay}</span>
      </span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-400">
        {decksRemaining > 0 ? decksRemaining.toFixed(1) : "—"}d
      </span>
    </div>
  );
}
