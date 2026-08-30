"use client";

import { useState } from "react";
import type { BotDifficulty, PokerSettings } from "@/lib/poker/types";

type PokerSettingsPanelProps = {
  settings: PokerSettings;
  onUpdate: (partial: Partial<PokerSettings>) => void;
  onResetStats: () => void;
  onLeave?: () => void;
};

const HAND_PRESETS = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "∞", value: 0 },
];
const SPEED_PRESETS = [
  { label: "Fast", value: 250 },
  { label: "Normal", value: 500 },
  { label: "Slow", value: 900 },
];
const TABLE_SIZE_PRESETS = [
  { label: "6-Max", value: 6 as const },
  { label: "9-Max", value: 9 as const },
];
const DIFFICULTY_PRESETS: { label: string; value: BotDifficulty }[] = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
];

export default function PokerSettingsPanel({
  settings,
  onUpdate,
  onResetStats,
  onLeave,
}: PokerSettingsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors flex items-center justify-center text-lg"
        title="Settings"
      >
        ⚙
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-30 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                Deal Speed
              </label>
              <div className="flex gap-1.5">
                {SPEED_PRESETS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => onUpdate({ botSpeedMs: s.value })}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      settings.botSpeedMs === s.value
                        ? "bg-amber-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                Table Size
              </label>
              <div className="flex gap-1.5">
                {TABLE_SIZE_PRESETS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => onUpdate({ playerCount: t.value })}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      settings.playerCount === t.value
                        ? "bg-amber-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                Opponents
              </label>
              <div className="flex gap-1.5">
                {DIFFICULTY_PRESETS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => onUpdate({ botDifficulty: d.value })}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      settings.botDifficulty === d.value
                        ? "bg-amber-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                Session Length
              </label>
              <div className="flex gap-1.5">
                {HAND_PRESETS.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => onUpdate({ handsPerSession: h.value })}
                    className={`flex-1 py-2 rounded-lg text-sm font-mono transition-colors ${
                      settings.handsPerSession === h.value
                        ? "bg-amber-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                Learning Tools
              </label>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Show opponent cards</span>
                  <button
                    onClick={() => onUpdate({ showOpponentCards: !settings.showOpponentCards })}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.showOpponentCards ? "bg-amber-600" : "bg-zinc-700"
                    }`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${
                      settings.showOpponentCards ? "translate-x-5" : ""
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Show opponent equity %</span>
                  <button
                    onClick={() => onUpdate({ showOpponentEquity: !settings.showOpponentEquity })}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.showOpponentEquity ? "bg-amber-600" : "bg-zinc-700"
                    }`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${
                      settings.showOpponentEquity ? "translate-x-5" : ""
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  onResetStats();
                  setOpen(false);
                }}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-red-900/40 hover:text-red-300 text-zinc-400 text-sm transition-colors"
              >
                Reset stats
              </button>
              {onLeave && (
                <button
                  onClick={() => {
                    onLeave();
                    setOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm transition-colors"
                >
                  Leave table
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}