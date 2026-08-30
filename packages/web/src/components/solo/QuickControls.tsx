"use client";

import type { PracticeSettings, PracticeMode } from "@/hooks/useSoloGame";

const MODE_OPTIONS: { value: PracticeMode; label: string }[] = [
  { value: "default", label: "Standard" },
  { value: "pairs", label: "Pairs" },
  { value: "uncommon", label: "Uncommon" },
  { value: "deviations", label: "Deviations" },
];

type QuickControlsProps = {
  settings: PracticeSettings;
  onApply: (settings: PracticeSettings) => void;
};

export default function QuickControls({ settings, onApply }: QuickControlsProps) {
  const update = <K extends keyof PracticeSettings>(key: K, value: PracticeSettings[K]) => {
    onApply({ ...settings, [key]: value });
  };

  return (
    <div className="w-full max-w-4xl flex items-center justify-between gap-3 mb-2 px-1 flex-nowrap overflow-x-auto [&>*]:shrink-0">
      {/* Game mode pills */}
      <div className="flex items-center gap-1">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("mode", opt.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              settings.mode === opt.value
                ? "bg-amber-600/30 border border-amber-500/50 text-amber-200"
                : "bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-zinc-700" />

      {/* Deck count */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Decks</span>
        <select
          value={settings.deckCount}
          onChange={(e) => update("deckCount", Number(e.target.value))}
          className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1 text-xs text-zinc-200 cursor-pointer"
        >
          {[1, 2, 4, 6, 8].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-zinc-700" />

      {/* Player count */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Players</span>
        <select
          value={settings.tableSize}
          onChange={(e) => update("tableSize", Number(e.target.value))}
          className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1 text-xs text-zinc-200 cursor-pointer"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-zinc-700" />

      {/* Seat position (only when >1 player) */}
      {settings.tableSize > 1 && (
        <>
          <div className="flex items-center gap-1">
            {(["third_base", "first_base"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => update("seatPosition", pos)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  settings.seatPosition === pos
                    ? "bg-amber-600/30 border border-amber-500/50 text-amber-200"
                    : "bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {pos === "first_base" ? "1st Base" : "3rd Base"}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-zinc-700" />
        </>
      )}

      {/* Active count verification */}
      <button
        onClick={() => update("activeCountVerification", !settings.activeCountVerification)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
          settings.activeCountVerification
            ? "bg-amber-600/30 border border-amber-500/50 text-amber-200"
            : "bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${settings.activeCountVerification ? "bg-green-400" : "bg-zinc-600"}`} />
        Count Check
      </button>
    </div>
  );
}
