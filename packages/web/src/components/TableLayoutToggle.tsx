"use client";

import { useTableLayout, type TableLayoutMode } from "@/hooks/useTableLayout";

const LABELS: Record<TableLayoutMode, string> = {
  auto: "Auto layout",
  landscape: "Landscape",
  portrait: "Portrait",
};

const ICONS: Record<TableLayoutMode, string> = {
  auto: "⟳",
  landscape: "▭",
  portrait: "▯",
};

type Props = {
  className?: string;
};

/** Cycles Auto → Landscape → Portrait for virtual table games. */
export default function TableLayoutToggle({ className = "" }: Props) {
  const { mode, cycleMode, isLandscape } = useTableLayout();

  return (
    <button
      type="button"
      onClick={cycleMode}
      title={`${LABELS[mode]}${mode === "auto" ? (isLandscape ? " (wide)" : " (tall)") : ""} — tap to change`}
      aria-label={`Table layout: ${LABELS[mode]}. Tap to change.`}
      className={`w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 transition-colors flex items-center justify-center text-base font-bold ${className}`}
    >
      <span className="leading-none" aria-hidden>
        {ICONS[mode]}
      </span>
    </button>
  );
}
